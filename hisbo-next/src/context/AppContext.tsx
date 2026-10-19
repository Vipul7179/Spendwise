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
  runRecurringExpenses,
  paise,
} from '@/lib/state/calculations';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'spendwise_v1';
const GUEST_KEY = 'sw_guest';

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
  cycleTheme: () => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  markAlertsAsRead: () => void;
  setChartType: (ct: 'donut' | 'pie' | 'bar' | 'line') => void;
  setActiveGroup: (gid: string) => void;
  syncNow: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
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
  const stateRef = useRef(state);
  stateRef.current = state;
  const userRef = useRef(user);
  userRef.current = user;

  const showToast = useCallback((msg: string, type: 'ok' | 'warn' | 'err' = 'ok') => {
    setToastInfo({ id: Date.now(), msg, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToastInfo(null);
  }, []);

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

  // Push state to Supabase
  const pushToCloud = useCallback(async (stateToPush: AppState, userId: string) => {
    try {
      setSyncStatus('syncing');
      const supabase = createClient();
      const { error } = await supabase.from('user_data').upsert({
        user_id: userId,
        data: stateToPush,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setSyncStatus('synced');
      setSyncError(null);
    } catch (err: any) {
      console.warn('[Sync] Push failed:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Sync failed');
    }
  }, []);

  // Debounced push queue
  const queueSync = useCallback((nextState: AppState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }

    if (!userRef.current) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      if (userRef.current) {
        pushToCloud(nextState, userRef.current.id);
      }
    }, 1500);
  }, [pushToCloud]);

  // Initial bootstrap and Supabase session check
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      let localState: AppState = INITIAL_STATE;

      // 1. Read local storage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          localState = mergeS(parsed, INITIAL_STATE);
        }
      } catch (e) {
        console.warn('[App] Local storage read error:', e);
      }

      // 2. Check Supabase auth session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);

        // Fetch cloud data and merge
        try {
          const { data: row } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', session.user.id)
            .maybeSingle();

          let finalState = localState;
          if (row?.data && Object.keys(row.data).length > 0) {
            finalState = mergeS(localState, row.data);
          } else {
            // Push local data up to initialize cloud
            await supabase.from('user_data').upsert({
              user_id: session.user.id,
              data: localState,
              updated_at: new Date().toISOString(),
            });
          }

          // Check admin status
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .maybeSingle();

          setIsAdmin(!!profile?.is_admin);

          // Run recurring expenses check
          const { createdExpenses, updatedRecurring } = runRecurringExpenses(
            finalState.rec,
            finalState.cats
          );
          if (createdExpenses.length > 0) {
            finalState.exps = [...finalState.exps, ...createdExpenses];
            finalState.rec = updatedRecurring;
          }

          setState(finalState);
          applyTheme(finalState.theme);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalState));
        } catch (err: any) {
          console.error('[App] Cloud bootstrap error:', err);
          setState(localState);
          applyTheme(localState.theme);
        }
      } else {
        // Guest mode
        const isGuestFlag = localStorage.getItem(GUEST_KEY) === '1';
        setIsGuest(isGuestFlag);
        setUser(null);

        // Run recurring expenses check
        const { createdExpenses, updatedRecurring } = runRecurringExpenses(
          localState.rec,
          localState.cats
        );
        if (createdExpenses.length > 0) {
          localState.exps = [...localState.exps, ...createdExpenses];
          localState.rec = updatedRecurring;
        }

        setState(localState);
        applyTheme(localState.theme);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
      }

      setIsLoading(false);
    };

    initApp();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setIsGuest(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applyTheme]);

  // Actions
  const updateStateAndSync = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev);
      queueSync(next);
      return next;
    });
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
        const { createdExpenses, updatedRecurring } = runRecurringExpenses(
          [...prev.rec, item],
          prev.cats
        );
        return {
          ...prev,
          rec: updatedRecurring,
          exps: [...prev.exps, ...createdExpenses],
        };
      });
      showToast('Recurring expense added.');
    },
    [updateStateAndSync, showToast]
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
    updateStateAndSync((prev) => {
      const nextHide = !prev.hide;
      showToast(nextHide ? 'Amounts hidden.' : 'Amounts visible.');
      return { ...prev, hide: nextHide };
    });
  }, [updateStateAndSync, showToast]);

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

  const syncNow = useCallback(async () => {
    if (!userRef.current) return;
    await pushToCloud(stateRef.current, userRef.current.id);
    showToast('Synced to your account.');
  }, [pushToCloud, showToast]);

  const logout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Auth] Sign out error:', e);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GUEST_KEY);
    setUser(null);
    setIsAdmin(false);
    setIsGuest(false);
    setState(INITIAL_STATE);
    applyTheme('auto');
    router.push('/login');
  }, [router, applyTheme]);

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
