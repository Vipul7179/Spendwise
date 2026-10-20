import type { AppState } from '@/types/state';
import { INITIAL_STATE } from './initial-state';
import { evaluateThresholdAlerts, runRecurringExpenses } from './calculations';

export function restoreState(saved: Partial<AppState> | null): AppState {
  // Saved empty collections and false settings are intentional, not missing data.
  return {
    ...JSON.parse(JSON.stringify(INITIAL_STATE)),
    ...saved,
    cats: saved?.cats ?? INITIAL_STATE.cats.map(category => ({ ...category })),
    exps: saved?.exps ?? [], rec: saved?.rec ?? [], goals: saved?.goals ?? [],
    groups: saved?.groups ?? [], alerts: saved?.alerts ?? [], fired: saved?.fired ?? {},
  };
}

export function heroIsHidden(state: Pick<AppState, 'hide' | 'hh'>): boolean {
  return state.hh === undefined ? state.hide === true : state.hh === true;
}

export function toggleGlobalPrivacy(state: AppState): AppState {
  const next = { ...state, hide: state.hide !== true };
  delete next.hh;
  return next;
}

export function applyRecurringExpenses(state: AppState): AppState {
  const { createdExpenses, updatedRecurring } = runRecurringExpenses(state.rec, state.cats);
  if (!createdExpenses.length) return state;
  let next = { ...state, rec: updatedRecurring };
  for (const expense of createdExpenses) {
    const exps = [...next.exps, expense];
    const { alerts, newFired } = evaluateThresholdAlerts(expense.cat, expense.date, next.cats, exps, next.fired);
    next = { ...next, exps, fired: newFired, alerts: [...alerts.reverse(), ...next.alerts] };
  }
  return next;
}
