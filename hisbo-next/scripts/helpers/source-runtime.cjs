const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute only explicitly requested source modules against injected test services.
module.exports = function runtime(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      exports, console, setTimeout, clearTimeout, process, URL, ...globals,
      require(name) {
        if (name in mocks) return mocks[name];
        if (name.startsWith('@/') || name.startsWith('.')) {
          const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
          const file = [base, base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
          if (!file) throw Error(`Missing source import ${name}`);
          return load(file);
        }
        return require(name);
      },
    }, { filename: absolute });
    return exports;
  }
  return load;
};
