import { AppState, Category, Expense, RecurringExpense, SavingsGoal, Group, AlertItem } from '@/types/state';

export function mergeS(local: Partial<AppState> | null, cloud: Partial<AppState> | null): AppState {
  const L = local || {};
  const C = cloud || {};
  const M: AppState = JSON.parse(JSON.stringify(C));

  // Ensure collections exist
  M.cats = M.cats || [];
  M.exps = M.exps || [];
  M.rec = M.rec || [];
  M.goals = M.goals || [];
  M.groups = M.groups || [];
  M.alerts = M.alerts || [];
  M.fired = M.fired || {};

  // Map category IDs by matching lowercase name
  const catMap: Record<string, string> = {};
  (L.cats || []).forEach((localCat: Category) => {
    const existing = M.cats.find(
      (c) => c.name.toLowerCase().trim() === localCat.name.toLowerCase().trim()
    );
    if (existing) {
      catMap[localCat.id] = existing.id;
    } else {
      M.cats.push(localCat);
    }
  });

  const fixCat = (id: string) => catMap[id] || id;

  // Deduplicate array by 'id'
  const dedupeById = <T extends { id: string }>(target: T[], incoming: T[]): T[] => {
    const existingIds = new Set(target.map((x) => x.id));
    return target.concat(incoming.filter((x) => !existingIds.has(x.id)));
  };

  const remappedLocalExps: Expense[] = (L.exps || []).map((e) => ({
    ...e,
    cat: fixCat(e.cat),
  }));

  const remappedLocalRec: RecurringExpense[] = (L.rec || []).map((r) => ({
    ...r,
    cat: fixCat(r.cat),
  }));

  M.exps = dedupeById(M.exps, remappedLocalExps);
  M.rec = dedupeById(M.rec, remappedLocalRec);
  M.goals = dedupeById(M.goals, L.goals || []);
  M.groups = dedupeById(M.groups, L.groups || []);
  M.alerts = dedupeById(M.alerts, L.alerts || []);
  M.fired = { ...(L.fired || {}), ...(M.fired || {}) };

  // Copy non-empty scalar settings if missing in cloud
  const scalarKeys: (keyof AppState)[] = [
    'name',
    'phone',
    'email',
    'theme',
    'hide',
    'chan',
    'mailOn',
    'lastRep',
    'gid',
    'ct',
  ];

  scalarKeys.forEach((key) => {
    if (M[key] === undefined && L[key] !== undefined) {
      (M as any)[key] = L[key];
    }
  });

  return M;
}

