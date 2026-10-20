const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const postcss = require('postcss');

// Parse the reference as data. Never execute its bootstrap, DOM handlers or network requests.
const html = fs.readFileSync('../index.html', 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).find(source => source.includes('function gShares('));
const parsed = ts.createSourceFile('legacy.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function legacyFunctions(names, globals = {}) {
  const definitions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
    .map(node => node.getText(parsed));
  assert.equal(definitions.length, names.length);
  const context = vm.createContext({ ...globals });
  vm.runInContext(definitions.join('\n'), context);
  return context;
}
function nextModule(path, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => { throw Error(`Unexpected import ${name}`); }, ...globals });
  return exports;
}
const calculations = nextModule('src/lib/state/calculations.ts');
const normalize = value => JSON.parse(JSON.stringify(value));

test('recurring expenses preserve the legacy short-month date and monthly deduplication', () => {
  for (const today of ['2026-02-28T12:00:00', '2024-02-29T12:00:00']) {
    class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : [today])); }
      static now() { return new Date(today).getTime(); }
    }
    const current = nextModule('src/lib/state/calculations.ts', { Date: FixedDate });
    const state = { rec: [
      { id: 'end-month', day: 31, amt: 999, cat: 'bills', name: 'Rent' },
      { id: 'already-logged', day: 1, amt: 100, cat: 'bills', name: 'Paid', last: today.slice(0, 7) },
    ], exps: [] };
    const legacy = legacyFunctions(['runRec'], {
      S: state, Date: FixedDate, mk: value => value.slice(0, 7), NOW: () => today.slice(0, 10),
      addExp: expense => state.exps.push(expense),
    });
    const result = current.runRecurringExpenses(normalize(state.rec), []);
    legacy.runRec();
    assert.deepEqual(normalize(result.createdExpenses.map(({ date, amt, cat, note }) => ({ date, amt, cat, note }))), normalize(state.exps));
    assert.deepEqual(normalize(result.updatedRecurring), normalize(state.rec));
    assert.equal(current.runRecurringExpenses(result.updatedRecurring, []).createdExpenses.length, 0);
  }
});

test('group shares, pending dues and net balances match the legacy calculations', () => {
  const legacy = legacyFunctions(['gShares', 'gDues', 'gNet']);
  for (const amount of [1, 2, 100, 101, 99999]) {
    for (const payer of [0, 1, 2]) {
      for (const members of [[0, 1, 2], [0, 2], [1]]) {
        const expense = { id: 'expense', amt: amount, payer, with: members, paid: { 1: true }, date: '2026-10-01', desc: 'Dinner' };
        const group = { members: ['You', 'A', 'B'], exps: [expense] };
        assert.deepEqual(normalize(calculations.gShares(expense)), normalize(legacy.gShares(expense)));
        assert.deepEqual(normalize(calculations.gDues(group)), normalize(legacy.gDues(group)));
        assert.deepEqual(normalize(calculations.gNet(group)), normalize(legacy.gNet(group)));
        assert.equal(Object.values(calculations.gShares(expense)).reduce((a, b) => a + b, 0), amount);
      }
    }
  }
});

test('state merge preserves legacy category remapping, cloud precedence and local records', () => {
  const legacy = legacyFunctions(['mergeS']);
  const { mergeS } = nextModule('src/lib/state/merge.ts');
  const local = { cats: [{ id: 'guest-food', name: 'Food', limit: 500 }],
    exps: [{ id: 'guest-expense', cat: 'guest-food', amt: 100, date: '2026-10-01' }],
    rec: [{ id: 'rent', cat: 'guest-food', amt: 300, day: 1 }],
    goals: [{ id: 'goal', saved: 10 }], groups: [], alerts: [], fired: { local: 1 }, theme: 'dark', name: 'Guest' };
  const cloud = { cats: [{ id: 'cloud-food', name: 'FOOD', limit: 900 }],
    exps: [{ id: 'cloud-expense', cat: 'cloud-food', amt: 200, date: '2026-10-01' }],
    rec: [], goals: [], groups: [], alerts: [], fired: { cloud: 1 }, name: 'Account' };
  const before = JSON.stringify([local, cloud]);
  assert.deepEqual(normalize(mergeS(local, cloud)), normalize(legacy.mergeS(local, cloud)));
  assert.equal(JSON.stringify([local, cloud]), before, 'Merging does not mutate input data');
});

test('core layout rules match the read-only legacy stylesheet', () => {
  const legacy = postcss.parse(html.match(/<style>([\s\S]*?)<\/style>/i)[1]);
  const migrated = postcss.parse(fs.readFileSync('src/app/globals.css', 'utf8'));
  const values = (root, selector) => {
    const result = {};
    root.walkRules(selector, rule => rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; }));
    return result;
  };
  for (const selector of ['.row', '.grid', '.mut', 'h2', '.card', '.blog-shell']) {
    const original = values(legacy, selector);
    const next = values(migrated, selector);
    for (const [property, value] of Object.entries(original)) {
      if (property === 'transition') continue;
      const normalizeCss = text => text?.replace(/\s/g, '').replace(/(^|[^\d])0\./g, '$1.');
      assert.equal(normalizeCss(next[property]), normalizeCss(value), `${selector} ${property}`);
    }
  }
  assert.equal(values(migrated, 'input[type="number"]').appearance, 'textfield');
  let webkitRule;
  migrated.walkRules(rule => {
    if (rule.selector.includes('::-webkit-inner-spin-button')) webkitRule = rule;
  });
  assert.ok(webkitRule);
  assert.ok(webkitRule.nodes.some(node => node.prop === '-webkit-appearance' && node.value === 'none'));
});
