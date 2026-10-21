import type { AppState } from '@/types/state';
import { analyticsFeaturesEnabled, trackFeatureEvent, type ActionSource, type AnalyticsEvent, type Feature } from './analytics';

// Inspect only transitions committed by a user action, never bootstrap/cloud
// reads. No state values or record identifiers are put in an event payload.
export function trackSavedStateChanges(before: AppState, after: AppState, source?: ActionSource) {
  if (!analyticsFeaturesEnabled()) return;
  try {
    const emit = (event: AnalyticsEvent, feature: Feature) => trackFeatureEvent(event, feature, source);
    const expenses = new Map(before.exps.map(item => [item.id, item]));
    for (const item of after.exps) {
      const old = expenses.get(item.id);
      if (!old) emit('expense_created', 'expenses');
      else if (old !== item && (old.amt !== item.amt || old.cat !== item.cat || old.date !== item.date || old.note !== item.note)) emit('expense_updated', 'expenses');
      expenses.delete(item.id);
    }
    for (const _item of expenses.values()) emit('expense_deleted', 'expenses');
    const budgets = new Map(before.cats.map(item => [item.id, item]));
    for (const item of after.cats) {
      const old = budgets.get(item.id);
      if (!old && item.limit > 0) emit('budget_created', 'budgets');
      else if (old && old.limit !== item.limit) emit(old.limit <= 0 && item.limit > 0 ? 'budget_created' : item.limit <= 0 ? 'budget_deleted' : 'budget_updated', 'budgets');
      budgets.delete(item.id);
    }
    for (const item of budgets.values()) if (item.limit > 0) emit('budget_deleted', 'budgets');
    const goals = new Map(before.goals.map(item => [item.id, item]));
    for (const item of after.goals) {
      const old = goals.get(item.id);
      if (!old) emit('savings_goal_created', 'savings');
      else if (old.saved !== item.saved || old.target !== item.target || old.name !== item.name) {
        emit('savings_goal_updated', 'savings');
        if (old.saved < old.target && item.saved >= item.target) emit('savings_goal_completed', 'savings');
      }
      goals.delete(item.id);
    }
    for (const _item of goals.values()) emit('savings_goal_deleted', 'savings');
    const groups = new Map((before.groups || []).map(item => [item.id, item]));
    for (const group of after.groups || []) {
      const old = groups.get(group.id);
      if (!old) emit('group_created', 'groups');
      const split = new Map((old?.exps || []).map(item => [item.id, item]));
      for (const item of group.exps) {
        const previous = split.get(item.id);
        if (!previous) emit('split_expense_created', 'groups');
        else {
          for (const member of item.with) {
            if (member === item.payer) continue;
            if (item.paid?.[member] && !previous.paid?.[member]) emit('split_expense_settled', 'groups');
            if (!item.paid?.[member] && previous.paid?.[member]) emit('split_expense_reopened', 'groups');
          }
        }
        split.delete(item.id);
      }
      for (const _item of split.values()) emit('split_expense_deleted', 'groups');
      groups.delete(group.id);
    }
    for (const _item of groups.values()) emit('group_deleted', 'groups');
    const recurring = new Set(before.rec.map(item => item.id));
    for (const item of after.rec) {
      if (!recurring.delete(item.id)) emit('recurring_expense_created', 'automate');
    }
    for (const _item of recurring) emit('recurring_expense_deleted', 'automate');
    if (!before.name && after.name) emit('onboarding_completed', 'account');
    if (before.theme !== after.theme) emit('theme_changed', 'settings');
    if (before.hide !== after.hide || before.hh !== after.hh) emit('privacy_changed', 'settings');
    if (before.ct !== after.ct) emit('chart_changed', 'overview');
    if (before.email !== after.email || before.phone !== after.phone || before.mailOn !== after.mailOn || before.chan !== after.chan) emit('notification_settings_updated', 'alerts');
    if (before.alerts.length !== after.alerts.length || before.alerts.some((item, index) => item.read !== after.alerts[index]?.read)) emit('alerts_updated', 'alerts');
  } catch { /* Analytics failures cannot break a successful state transition. */ }
}
