'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppState, Category, Expense, RecurringExpense, SavingsGoal, Group, GroupExpense, AlertItem } from '@/types/state';
import { INITIAL_STATE } from '@/lib/state/initial-state';
import { mergeS } from '@/lib/state/merge';
import {
  uid,
  NOW,
  evaluateThresholdAlerts,
} from '@/lib/state/calculations';
import { createClient } from '@/lib/supabase/client';
import { serializeStateWrite, settleStateWrites } from '@/lib/state/sync';
import { applyRecurringExpenses, heroIsHidden, restoreState, toggleGlobalPrivacy } from '@/lib/state/transitions';

const STORAGE_KEY = 'spendwise_v1';
const GUEST_KEY = 'sw_guest';
const PENDING_USER_KEY = 'sw_pending_user';

export interface ToastInfo {
  id: number;
  msg: string;
  type: 'ok' | 'warn' | 'err';
}

interface AppContextType {
  state: AppState;
  user: any | null;
  isGuest: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  isAdmin: boolean;
  toastInfo: ToastInfo | null;
  dismissToast: () => void;
  showToast: (msg: string, type?: 'ok' | 'warn' | 'err') => void;
  burstConfetti: () => void;
  // Core Actions
  addExpense: (exp: { amt: number; cat: string; date: string; note?: string }) => void;
  deleteExpense: (id: string) => void;
  addCategory: (name: string, limit: number) => boolean;
  setCategoryLimit: (id: string, limit: number) => void;
  deleteCategory: (id: string) => void;
  addRecurring: (name: string, amt: number, cat: string, day: number) => void;
  deleteRecurring: (id: string) => void;
  addGoal: (name: string, target: number) => void;
  addSavings: (goalId: string, amt: number) => void;
  deleteGoal: (goalId: string) => void;
  addGroup: (name: string, members: string[]) => void;
  addSharedExpense: (groupId: string, exp: { desc: string; amt: number; payer: number; with: number[] }) => void;
  toggleGroupExpensePaid: (groupId: string, expenseId: string, memberIndex: number) => void;
  markAllGroupDuesSettled: (groupId: string, fromMember: number, toMember: number) => void;
  deleteGroup: (groupId: string) => void;
  deleteSharedExpense: (groupId: string, expenseId: string) => void;
  saveMemberPhone: (groupId: string, memberIndex: number, phone: string) => void;
  updateName: (name: string) => void;
  updateEmailSettings: (email: string, mailOn: boolean) => void;
  updatePhoneSettings: (phone: string, chan: 'wa' | 'sms') => void;
  toggleHide: () => void;
  toggleHeroHide: () => void;
  cycleTheme: () => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  markAlertsAsRead: () => void;
  setChartType: (ct: 'donut' | 'pie' | 'bar' | 'line') => void;
  setActiveGroup: (gid: string) => void;
  syncNow: () => Promise<boolean>;
  logout: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children, publicView = false }: { children: React.ReactNode; publicView?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [user, setUser] = useState<any | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toastInfo, setToastInfo] = useState<ToastInfo | null>(null);

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recurringToastRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<AppState | null>(null);
  const cloudReadyRef = useRef(false);
  const stateRef = useRef(state);
  const userRef = useRef(user);

  const showToast = useCallback((msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastInfo({ id: Date.now(), msg, type });
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setToastInfo(null);
    }, 4800);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToastInfo(null);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const notifyRecurringAlerts = useCallback((previous: AppState, next: AppState) => {
    if (next.alerts.length <= previous.alerts.length) return;
    const latest = next.alerts[0];
    if (recurringToastRef.current) clearTimeout(recurringToastRef.current);
    // Legacy checkAlerts delays the warning so entry feedback remains visible.
    recurringToastRef.current = setTimeout(() => {
      recurringToastRef.current = null;
      showToast(latest.msg, latest.msg.startsWith('Over budget') ? 'err' : 'warn');
    }, 2200);
  }, [showToast]);

  const burstConfetti = useCallback(() => {
    if (typeof window === 'undefined') return;
    const colors = ['#0f7a58', '#f5b301', '#2f8cff', '#e0529c', '#8a5cf6', '#ff6b5b', '#22b8cf', '#7ba11a'];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('span');
      el.className = 'cf';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = `${Math.random() * 0.4}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2600);
    }
  }, []);

  // Theme application helper
  const applyTheme = useCallback((theme?: 'auto' | 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }, []);

  // A failed write retains the local snapshot and pending owner for retry/reload.
  const pushToCloud = useCallback(async (stateToPush: AppState, userId: string): Promise<boolean> => {
    const snapshot = JSON.parse(JSON.stringify(stateToPush));
    const serialized = JSON.stringify(snapshot);
    setSyncStatus('syncing');
    try {
      await serializeStateWrite(async () => {
        const { error } = await createClient().from('user_data').upsert({
          user_id: userId, data: snapshot, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      });
      if (localStorage.getItem(STORAGE_KEY) === serialized && localStorage.getItem(PENDING_USER_KEY) === userId) {
        localStorage.removeItem(PENDING_USER_KEY);
      }
      if (JSON.stringify(pendingRef.current) === serialized) pendingRef.current = null;
      setSyncStatus(pendingRef.current ? 'syncing' : 'synced');
      setSyncError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Sync failed';
      setSyncStatus('error');
      setSyncError(message);
      return false;
    }
  }, []);

  const queueSync = useCallback((nextState: AppState) => {
    // Persist before scheduling the network write. Never remove data on failure.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      if (userRef.current && cloudReadyRef.current) localStorage.setItem(PENDING_USER_KEY, userRef.current.id);
    } catch {
      setSyncStatus('error');
      setSyncError('Could not save on this device. Keep this page open and retry sync.');
    }
    if (!userRef.current) return;
    pendingRef.current = nextState;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    if (!cloudReadyRef.current) return; // Do not overwrite cloud data after a failed read.
    const userId = userRef.current.id;
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      const pending = pendingRef.current;
      if (pending && userRef.current?.id === userId) void pushToCloud(pending, userId);
    }, 1500);
  }, [pushToCloud]);

  const readCloudState = useCallback(async (localState: AppState, userId: string) => {
    await settleStateWrites();
    const { data: row, error } = await createClient().from('user_data').select('data').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    // An unsynced full snapshot for this account must retain deletions and settings.
    if (localStorage.getItem(PENDING_USER_KEY) === userId) return localState;
    return row?.data && Object.keys(row.data).length ? mergeS(localState, row.data) : localState;
  }, []);

  useEffect(() => {
    let active = true;
    const initApp = async () => {
      setIsLoading(true);
      let localState = restoreState(null);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) localState = restoreState(JSON.parse(raw));
      } catch {
        showToast('Could not read saved data on this device.', 'warn');
      }
      const guest = localStorage.getItem(GUEST_KEY) === '1';
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active) return;
        userRef.current = session?.user || null;
        setUser(session?.user || null);
        setIsGuest(!session?.user && guest);
        cloudReadyRef.current = false;
        if (session?.user) {
          try {
            localState = await readCloudState(localState, session.user.id);
            if (!active) return;
            cloudReadyRef.current = true;
            const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
            if (!active) return;
            setIsAdmin(!!profile?.is_admin);
          } catch (error) {
            if (!active) return;
            setSyncStatus('error');
            setSyncError((error as { message?: string })?.message || 'Could not load cloud data. Retry sync.');
          }
        }
        if (!active) return;
        // Public Blog reads never run recurrence or initialize/write user data.
        if (!publicView && (guest || (session?.user && cloudReadyRef.current))) {
          const next = applyRecurringExpenses(localState);
          notifyRecurringAlerts(localState, next);
          localState = next;
        }
        stateRef.current = localState;
        setState(localState);
        applyTheme(localState.theme);
        if (!publicView && (session?.user || guest)) queueSync(localState);
      } catch (error) {
        if (!active) return;
        setIsGuest(guest);
        stateRef.current = localState;
        setState(localState);
        applyTheme(localState.theme);
        setSyncStatus('error');
        setSyncError((error as { message?: string })?.message || 'Could not check your session. Retry when connected.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void initApp();
    let unsubscribe = () => {};
    try {
      const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (event === 'SIGNED_IN' && session?.user) {
          userRef.current = session.user;
          setUser(session.user);
          setIsGuest(false);
        } else if (event === 'SIGNED_OUT') {
          if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
          userRef.current = null;
          cloudReadyRef.current = false;
          setUser(null);
          setIsAdmin(false);
          setIsGuest(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch { /* Bootstrap reports missing client configuration above. */ }
    return () => {
      active = false;
      unsubscribe();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (recurringToastRef.current) clearTimeout(recurringToastRef.current);
      // Same-document route changes may remount the provider. Flush before the
      // next provider reads cloud state; writes are serialized across remounts.
      if (pendingRef.current && userRef.current && cloudReadyRef.current) {
        void pushToCloud(pendingRef.current, userRef.current.id);
      }
    };
  }, [applyTheme, publicView, queueSync, readCloudState, showToast, pushToCloud, notifyRecurringAlerts]);

  const updateStateAndSync = useCallback((updater: (prev: AppState) => AppState) => {
    // Run transitions once, outside React's replayable state updater.
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    queueSync(next);
  }, [queueSync]);

  const addExpense = useCallback(
    (exp: { amt: number; cat: string; date: string; note?: string }) => {
      updateStateAndSync((prev) => {
        const newExp: Expense = {
          id: uid(),
          ts: Date.now(),
          amt: exp.amt,
          cat: exp.cat,
          date: exp.date,
          note: exp.note,
        };

        const { alerts: newAlerts, newFired } = evaluateThresholdAlerts(
          exp.cat,
          exp.date,
          prev.cats,
          [...prev.exps, newExp],
          prev.fired
        );

        if (newAlerts.length > 0) {
          const lastAlert = newAlerts[newAlerts.length - 1];
          showToast(lastAlert.msg, lastAlert.msg.startsWith('Over budget') ? 'err' : 'warn');
        }

        return {
          ...prev,
          exps: [...prev.exps, newExp],
          alerts: [...newAlerts, ...prev.alerts],
          fired: newFired,
        };
      });
    },
    [updateStateAndSync, showToast]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        exps: prev.exps.filter((e) => e.id !== id),
      }));
      showToast('Expense deleted.');
    },
    [updateStateAndSync, showToast]
  );

  const addCategory = useCallback(
    (name: string, limit: number): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const exists = stateRef.current.cats.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        showToast('A category with this name already exists.', 'err');
        return false;
      }

      updateStateAndSync((prev) => ({
        ...prev,
        cats: [...prev.cats, { id: uid(), name: trimmed, limit }],
      }));
      showToast(`Category "${trimmed}" added.`);
      return true;
    },
    [updateStateAndSync, showToast]
  );

  const setCategoryLimit = useCallback(
    (id: string, limit: number) => {
      updateStateAndSync((prev) => ({
        ...prev,
        cats: prev.cats.map((c) => (c.id === id ? { ...c, limit } : c)),
      }));
    },
    [updateStateAndSync]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        cats: prev.cats.filter((c) => c.id !== id),
        exps: prev.exps.filter((e) => e.cat !== id),
        rec: prev.rec.filter((r) => r.cat !== id),
      }));
      showToast('Category deleted.');
    },
    [updateStateAndSync, showToast]
  );

  const addRecurring = useCallback(
    (name: string, amt: number, cat: string, day: number) => {
      updateStateAndSync((prev) => {
        const item: RecurringExpense = {
          id: uid(),
          name,
          amt,
          cat,
          day,
          last: null,
        };
        const next = applyRecurringExpenses({ ...prev, rec: [...prev.rec, item] });
        notifyRecurringAlerts(prev, next);
        return next;
      });
      showToast('Recurring expense added.');
    },
    [updateStateAndSync, showToast, notifyRecurringAlerts]
  );

  const deleteRecurring = useCallback(
    (id: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        rec: prev.rec.filter((r) => r.id !== id),
      }));
      showToast('Recurring expense stopped.');
    },
    [updateStateAndSync, showToast]
  );

  const addGoal = useCallback(
    (name: string, target: number) => {
      updateStateAndSync((prev) => ({
        ...prev,
        goals: [...prev.goals, { id: uid(), name, target, saved: 0, ms: [] }],
      }));
      showToast(`Goal "${name}" created.`);
    },
    [updateStateAndSync, showToast]
  );

  const addSavings = useCallback(
    (goalId: string, amt: number) => {
      let hitMilestone = 0;
      updateStateAndSync((prev) => {
        const updatedGoals = prev.goals.map((g) => {
          if (g.id !== goalId) return g;
          const beforePct = (g.saved / g.target) * 100;
          const newSaved = g.saved + amt;
          const afterPct = (newSaved / g.target) * 100;
          const updatedMs = [...g.ms];

          const milestones = [25, 50, 75, 100];
          milestones.forEach((m) => {
            if (afterPct >= m && beforePct < m && !updatedMs.includes(m)) {
              updatedMs.push(m);
              hitMilestone = m;
            }
          });

          return { ...g, saved: newSaved, ms: updatedMs };
        });

        return { ...prev, goals: updatedGoals };
      });

      if (hitMilestone === 100) {
        showToast('Goal reached! Well done! 🎉');
        burstConfetti();
      } else if (hitMilestone > 0) {
        showToast(`Milestone reached: ${hitMilestone}% saved!`);
        burstConfetti();
      } else {
        showToast('Savings added.');
      }
    },
    [updateStateAndSync, showToast, burstConfetti]
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== goalId),
      }));
      showToast('Goal deleted.');
    },
    [updateStateAndSync, showToast]
  );

  const addGroup = useCallback(
    (name: string, members: string[]) => {
      const gId = uid();
      const newGroup: Group = {
        id: gId,
        name,
        members: [stateRef.current.name || 'You', ...members],
        exps: [],
        phones: {},
      };

      updateStateAndSync((prev) => ({
        ...prev,
        groups: [...(prev.groups || []), newGroup],
        gid: gId,
      }));
      showToast(`Group "${name}" created.`);
    },
    [updateStateAndSync, showToast]
  );

  const addSharedExpense = useCallback(
    (groupId: string, exp: { desc: string; amt: number; payer: number; with: number[] }) => {
      const newExp: GroupExpense = {
        id: uid(),
        date: NOW(),
        desc: exp.desc,
        amt: exp.amt,
        payer: exp.payer,
        with: exp.with,
        paid: {},
      };

      updateStateAndSync((prev) => ({
        ...prev,
        groups: (prev.groups || []).map((g) =>
          g.id === groupId ? { ...g, exps: [...g.exps, newExp] } : g
        ),
      }));
      showToast('Shared expense added and split.');
    },
    [updateStateAndSync, showToast]
  );

  const toggleGroupExpensePaid = useCallback(
    (groupId: string, expenseId: string, memberIndex: number) => {
      updateStateAndSync((prev) => ({
        ...prev,
        groups: (prev.groups || []).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            exps: g.exps.map((e) => {
              if (e.id !== expenseId) return e;
              const currentPaid = e.paid || {};
              return {
                ...e,
                paid: {
                  ...currentPaid,
                  [memberIndex]: !currentPaid[memberIndex],
                },
              };
            }),
          };
        }),
      }));
    },
    [updateStateAndSync]
  );

  const markAllGroupDuesSettled = useCallback(
    (groupId: string, fromMember: number, toMember: number) => {
      updateStateAndSync((prev) => ({
        ...prev,
        groups: (prev.groups || []).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            exps: g.exps.map((e) => {
              if (e.payer === toMember && e.with.includes(fromMember)) {
                return {
                  ...e,
                  paid: { ...(e.paid || {}), [fromMember]: true },
                };
              }
              return e;
            }),
          };
        }),
      }));
      showToast('All marked as settled.');
    },
    [updateStateAndSync, showToast]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      updateStateAndSync((prev) => {
        const remaining = (prev.groups || []).filter((g) => g.id !== groupId);
        return {
          ...prev,
          groups: remaining,
          gid: remaining[0]?.id || undefined,
        };
      });
      showToast('Group deleted.');
    },
    [updateStateAndSync, showToast]
  );

  const deleteSharedExpense = useCallback(
    (groupId: string, expenseId: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        groups: (prev.groups || []).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            exps: g.exps.filter((e) => e.id !== expenseId),
          };
        }),
      }));
      showToast('Expense deleted.');
    },
    [updateStateAndSync, showToast]
  );

  const saveMemberPhone = useCallback(
    (groupId: string, memberIndex: number, phone: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        groups: (prev.groups || []).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            phones: {
              ...(g.phones || {}),
              [memberIndex]: phone,
            },
          };
        }),
      }));
      showToast('Phone number saved.');
    },
    [updateStateAndSync, showToast]
  );

  const updateName = useCallback(
    (name: string) => {
      updateStateAndSync((prev) => ({ ...prev, name }));
      showToast('Name saved.');
    },
    [updateStateAndSync, showToast]
  );

  const updateEmailSettings = useCallback(
    (email: string, mailOn: boolean) => {
      updateStateAndSync((prev) => ({ ...prev, email, mailOn }));
      showToast('Email preferences updated.');
    },
    [updateStateAndSync, showToast]
  );

  const updatePhoneSettings = useCallback(
    (phone: string, chan: 'wa' | 'sms') => {
      updateStateAndSync((prev) => ({ ...prev, phone, chan }));
      showToast('Alert preferences updated.');
    },
    [updateStateAndSync, showToast]
  );

  const toggleHide = useCallback(() => {
    updateStateAndSync(toggleGlobalPrivacy);
    showToast(stateRef.current.hide ? 'Amounts hidden.' : 'Amounts visible.');
  }, [updateStateAndSync, showToast]);

  const toggleHeroHide = useCallback(() => {
    updateStateAndSync(previous => ({ ...previous, hh: !heroIsHidden(previous) }));
  }, [updateStateAndSync]);

  const cycleTheme = useCallback(() => {
    updateStateAndSync((prev) => {
      const themes: ('auto' | 'light' | 'dark')[] = ['auto', 'light', 'dark'];
      const curIdx = themes.indexOf(prev.theme || 'auto');
      const nextTheme = themes[(curIdx + 1) % themes.length];
      applyTheme(nextTheme);
      return { ...prev, theme: nextTheme };
    });
  }, [updateStateAndSync, applyTheme]);

  const dismissAlert = useCallback(
    (id: string) => {
      updateStateAndSync((prev) => ({
        ...prev,
        alerts: prev.alerts.filter((a) => a.id !== id),
      }));
    },
    [updateStateAndSync]
  );

  const clearAlerts = useCallback(() => {
    updateStateAndSync((prev) => ({
      ...prev,
      alerts: [],
    }));
    showToast('Alerts cleared.');
  }, [updateStateAndSync, showToast]);

  const markAlertsAsRead = useCallback(() => {
    updateStateAndSync((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => ({ ...a, read: true })),
    }));
  }, [updateStateAndSync]);

  const setChartType = useCallback(
    (ct: 'donut' | 'pie' | 'bar' | 'line') => {
      updateStateAndSync((prev) => ({ ...prev, ct }));
    },
    [updateStateAndSync]
  );

  const setActiveGroup = useCallback(
    (gid: string) => {
      updateStateAndSync((prev) => ({ ...prev, gid }));
    },
    [updateStateAndSync]
  );

  const syncNow = useCallback(async (): Promise<boolean> => {
    const userId = userRef.current?.id;
    if (!userId) return false;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    try {
      let snapshot = stateRef.current;
      if (!cloudReadyRef.current) {
        snapshot = await readCloudState(snapshot, userId);
        if (!publicView) {
          const next = applyRecurringExpenses(snapshot);
          notifyRecurringAlerts(snapshot, next);
          snapshot = next;
        }
        stateRef.current = snapshot;
        setState(snapshot);
        cloudReadyRef.current = true;
      }
      queueSync(snapshot);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      const success = await pushToCloud(snapshot, userId);
      if (success && !pendingRef.current) showToast('Synced to your account.');
      else if (!success) showToast('Could not sync. Your changes remain on this device. Try again.', 'err');
      return success && !pendingRef.current;
    } catch (error) {
      setSyncStatus('error');
      setSyncError((error as { message?: string })?.message || 'Could not sync.');
      showToast('Could not sync. Your changes remain on this device. Try again.', 'err');
      return false;
    }
  }, [pushToCloud, queueSync, readCloudState, publicView, showToast, notifyRecurringAlerts]);

  const logout = useCallback(async (): Promise<boolean> => {
    // Preserve both session and local data if its final cloud write fails.
    if (userRef.current && !(await syncNow())) return false;
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
    } catch {
      showToast('Could not sign out. Your session and saved data are preserved. Try again.', 'err');
      return false;
    }
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    pendingRef.current = null;
    userRef.current = null;
    cloudReadyRef.current = false;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(PENDING_USER_KEY);
    setUser(null);
    setIsAdmin(false);
    setIsGuest(false);
    const reset = restoreState(null);
    stateRef.current = reset;
    setState(reset);
    applyTheme('auto');
    router.push('/login');
    return true;
  }, [router, applyTheme, showToast, syncNow]);

  return (
    <AppContext.Provider
      value={{
        state,
        user,
        isGuest,
        isLoading,
        syncStatus,
        syncError,
        isAdmin,
        toastInfo,
        dismissToast,
        showToast,
        burstConfetti,
        addExpense,
        deleteExpense,
        addCategory,
        setCategoryLimit,
        deleteCategory,
        addRecurring,
        deleteRecurring,
        addGoal,
        addSavings,
        deleteGoal,
        addGroup,
        addSharedExpense,
        toggleGroupExpensePaid,
        markAllGroupDuesSettled,
        deleteGroup,
        deleteSharedExpense,
        saveMemberPhone,
        updateName,
        updateEmailSettings,
        updatePhoneSettings,
        toggleHide,
        toggleHeroHide,
        cycleTheme,
        dismissAlert,
        clearAlerts,
        markAlertsAsRead,
        setChartType,
        setActiveGroup,
        syncNow,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
