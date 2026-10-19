'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useModal } from '@/context/ModalContext';
import { PAL } from '@/lib/state/initial-state';
import {
  fmt,
  fmtR,
  NOW,
  mk,
  paise,
  col,
  mTotal,
  spent,
} from '@/lib/state/calculations';
import { Expense } from '@/types/state';
import BannerCarousel from '@/components/app/overview/BannerCarousel';
import DateBar, { formatMonthLabel } from '@/components/app/overview/DateBar';
import OverviewCharts from '@/components/app/overview/OverviewCharts';
import DeleteExpenseModal from '@/components/app/overview/DeleteExpenseModal';

function fD(d: string): string {
  try {
    return new Date(d + 'T00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fS(d: string): string {
  try {
    return new Date(d + 'T00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return d;
  }
}

function getWeekRange(dateStr: string): [string, string] {
  const t = new Date(dateStr + 'T00:00');
  const a = new Date(t);
  a.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const b = new Date(a);
  b.setDate(a.getDate() + 6);

  const pad = (n: number) => String(n).padStart(2, '0');
  const ymdStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return [ymdStr(a), ymdStr(b)];
}

export default function OverviewPage() {
  const { state, addExpense, deleteExpense, toggleHide, showToast } = useApp();
  const { openName } = useModal();

  const currentMonth = mk(NOW());
  const todayStr = NOW();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState('');
  const [sortOption, setSortOption] = useState<'recent' | 'high' | 'low'>('recent');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Quick add form state in right column
  const [newAmt, setNewAmt] = useState('');
  const [newCat, setNewCat] = useState(state.cats[0]?.id || '');
  const [newDate, setNewDate] = useState(todayStr);
  const [newNote, setNewNote] = useState('');

  // Hero calculations
  const isCurrentMonth = selectedMonth === currentMonth;
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const totalSpentMonth = useMemo(() => mTotal(selectedMonth, state.exps), [selectedMonth, state.exps]);
  const totalSpentDay = useMemo(() => {
    if (!selectedDay) return 0;
    return state.exps.filter((e) => e.date === selectedDay).reduce((sum, e) => sum + e.amt, 0);
  }, [selectedDay, state.exps]);

  const heroBigAmount = selectedDay ? totalSpentDay : totalSpentMonth;

  // Comparison with previous month
  const prevMonthStr = useMemo(() => {
    const y = parseInt(selectedMonth.slice(0, 4), 10);
    const m = parseInt(selectedMonth.slice(5), 10);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const prevMonthTotal = useMemo(() => mTotal(prevMonthStr, state.exps), [prevMonthStr, state.exps]);

  const vsLabel = isCurrentMonth ? 'last month' : 'the previous month';
  const comparisonText = useMemo(() => {
    if (selectedDay) {
      return `Month total ${fmt(totalSpentMonth, state.hide)}`;
    }
    if (prevMonthTotal === 0) {
      return `No spending recorded ${vsLabel}`;
    }
    const diffPct = Math.round(((totalSpentMonth - prevMonthTotal) / prevMonthTotal) * 100);
    if (diffPct === 0) {
      return `→ Same as ${vsLabel}`;
    }
    return `${diffPct < 0 ? '↓ ' : '↑ '}${Math.abs(diffPct)}% vs ${vsLabel}`;
  }, [selectedDay, totalSpentMonth, prevMonthTotal, vsLabel, state.hide]);

  // Today & Week calculations
  const todaySpent = useMemo(
    () => state.exps.filter((e) => e.date === todayStr).reduce((sum, e) => sum + e.amt, 0),
    [state.exps, todayStr]
  );

  const anchorDate = selectedDay || todayStr;
  const weekRange = useMemo(() => getWeekRange(anchorDate), [anchorDate]);
  const weekSpent = useMemo(
    () =>
      state.exps
        .filter((e) => e.date >= weekRange[0] && e.date <= weekRange[1])
        .reduce((sum, e) => sum + e.amt, 0),
    [state.exps, weekRange]
  );

  const monthlyBudgetLimit = useMemo(
    () => state.cats.reduce((sum, c) => sum + c.limit, 0),
    [state.cats]
  );
  const remainingBudget = monthlyBudgetLimit - totalSpentMonth;
  const budgetPercentUsed = monthlyBudgetLimit ? (totalSpentMonth / monthlyBudgetLimit) * 100 : 0;

  // Monthly report due check
  const isReportDue = useMemo(() => {
    if (!state.mailOn || !state.email) return false;
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const pm = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
    const lastReport = state.lastRep || '';

    if (now.getDate() === lastDayOfMonth && lastReport < currentMonth) return true;
    if (lastReport < pm && state.exps.some((e) => mk(e.date) === pm)) return true;
    return false;
  }, [state.mailOn, state.email, state.lastRep, state.exps, currentMonth]);

  // Filtered & sorted expenses
  const displayedExpenses = useMemo(() => {
    const filtered = state.exps.filter((e) => {
      if (selectedDay) return e.date === selectedDay;
      return mk(e.date) === selectedMonth;
    });

    return filtered.sort((a, b) => {
      if (sortOption === 'high') return b.amt - a.amt;
      if (sortOption === 'low') return a.amt - b.amt;
      // Recent: by date desc, then ts desc
      return b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0);
    });
  }, [state.exps, selectedMonth, selectedDay, sortOption]);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amtPaise = paise(newAmt);
    if (amtPaise <= 0) {
      showToast('Enter an amount greater than ₹0.', 'err');
      return;
    }
    if (amtPaise > 1000000000) {
      showToast('Amount is too large (maximum ₹10 crore).', 'err');
      return;
    }
    const validCatId = newCat || state.cats[0]?.id;
    if (!validCatId) {
      showToast('Please add a category in Budgets first.', 'err');
      return;
    }

    addExpense({
      amt: amtPaise,
      cat: validCatId,
      date: newDate,
      note: newNote.trim() || undefined,
    });

    const categoryObj = state.cats.find((c) => c.id === validCatId);
    showToast(`${fmt(amtPaise, state.hide)} added successfully to ${categoryObj?.name || 'category'}.`);
    setNewAmt('');
    setNewNote('');
  };

  const handleSendReport = () => {
    if (!state.email) {
      showToast('Add your email in Alerts first.', 'warn');
      return;
    }
    const reportSubject = `Hisbo report: ${formatMonthLabel(selectedMonth)}`;
    const reportBody = `Hisbo report for ${formatMonthLabel(selectedMonth)}${state.name ? ` (${state.name})` : ''}\n\nTotal spent: ${fmtR(totalSpentMonth)} of ${fmtR(monthlyBudgetLimit)} budget (${Math.round(budgetPercentUsed)}%)\n\nSaved so far: ${fmtR(state.goals.reduce((a, g) => a + g.saved, 0))}`;
    const mailto = `mailto:${encodeURIComponent(state.email)}?subject=${encodeURIComponent(reportSubject)}&body=${encodeURIComponent(reportBody)}`;
    window.open(mailto, '_blank');
  };

  return (
    <div>
      {/* Greeting Header */}
      <div className="gr">
        <div className="mut">{greeting},</div>
        <h1>
          {state.name || 'there'} <span className="wave">👋</span>
        </h1>
      </div>

      {/* Hero Summary Card */}
      <div className="hero">
        <button
          type="button"
          className="heye"
          onClick={toggleHide}
          aria-label={state.hide ? 'Show amounts' : 'Hide amounts'}
          title={state.hide ? 'Show amounts' : 'Hide amounts'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {state.hide ? (
              <>
                <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.5 13.5 0 0 0 2 11s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
                <path d="M2 2l20 20" />
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>

        <div className="hi">
          {selectedDay
            ? `Spent on ${fD(selectedDay)}`
            : isCurrentMonth
            ? 'Spent this month'
            : `Spent in ${formatMonthLabel(selectedMonth)}`}
          {state.name ? (
            <button
              type="button"
              className="edit"
              onClick={() => openName(false)}
              style={{ marginLeft: '10px' }}
            >
              Edit name
            </button>
          ) : null}
        </div>

        <div className="big" id="bt">
          {fmt(heroBigAmount, state.hide)}
        </div>

        <div className="hd">{comparisonText}</div>

        <div className="tiles">
          <div className="tile">
            <span>Today</span>
            <b>{fmt(todaySpent, state.hide)}</b>
            <small>{fS(todayStr)}</small>
          </div>
          <div className="tile">
            <span>{selectedDay ? `Week of ${fS(weekRange[0])}` : 'This week'}</span>
            <b>{fmt(weekSpent, state.hide)}</b>
            <small>{`${fS(weekRange[0])} – ${fS(weekRange[1])}`}</small>
          </div>
          <div className="tile">
            <span>{remainingBudget < 0 ? 'Over budget by' : 'Remaining budget'}</span>
            <b>{fmt(Math.abs(remainingBudget), state.hide)}</b>
            <small>{formatMonthLabel(selectedMonth)}</small>
          </div>
          <div className="tile">
            <span>Monthly budget</span>
            <b>{fmt(monthlyBudgetLimit, state.hide)}</b>
            <small>{Math.round(budgetPercentUsed)}% used</small>
          </div>
        </div>

        <div className="hp">
          <i
            style={{
              width: `${Math.min(budgetPercentUsed, 100)}%`,
              background: budgetPercentUsed > 100 ? '#ffb4a8' : '#fff',
            }}
          />
        </div>
      </div>

      {/* Monthly Report Banner */}
      {isReportDue && (
        <div className="card rb" style={{ marginBottom: '14px' }}>
          <div>
            <b>Your {formatMonthLabel(selectedMonth)} report is ready</b>
            <div className="mut">Send it to {state.email}</div>
          </div>
          <button type="button" className="b" onClick={handleSendReport}>
            Send report
          </button>
        </div>
      )}

      {/* Promotional Banner Carousel */}
      <BannerCarousel />

      {/* Date Navigation Bar */}
      <DateBar
        selectedMonth={selectedMonth}
        selectedDay={selectedDay}
        onMonthChange={(m) => {
          setSelectedMonth(m);
          setSelectedDay('');
        }}
        onDayChange={(d) => {
          setSelectedDay(d);
          if (d) setSelectedMonth(mk(d));
        }}
        onResetToday={() => {
          setSelectedMonth(currentMonth);
          setSelectedDay('');
        }}
      />

      {/* Main Grid: Left Charts + Right Add/Budgets */}
      <div className="grid two">
        {/* Left Column: Spending Overview Chart */}
        <div className="card">
          <h2>
            Spending overview{' '}
            <span className="mut" style={{ fontWeight: 400 }}>
              &middot; {selectedDay ? fD(selectedDay) : formatMonthLabel(selectedMonth)}
            </span>
          </h2>
          <OverviewCharts
            selectedMonth={selectedMonth}
            selectedDay={selectedDay}
            onToggleDay={(day) => {
              setSelectedDay(selectedDay === day ? '' : day);
            }}
          />
        </div>

        {/* Right Column: Add Expense Form + Category Budget Progress */}
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <h2>Add expense</h2>
            <form onSubmit={handleAddExpenseSubmit}>
              <div className="row">
                <input
                  id="ea"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount ₹"
                  inputMode="decimal"
                  value={newAmt}
                  onChange={(e) => setNewAmt(e.target.value)}
                  required
                />
                <select
                  id="ec"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  aria-label="Category"
                >
                  {state.cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  id="ed"
                  type="date"
                  value={newDate}
                  max={todayStr}
                  min="2000-01-01"
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
                <input
                  id="en"
                  type="text"
                  placeholder="Note (optional)"
                  maxLength={60}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button type="submit" className="b">
                  Add expense
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Budget progress</h2>
            {state.cats.length ? (
              state.cats.map((c) => {
                const s = spent(c.id, selectedMonth, state.exps);
                const p = c.limit ? (s / c.limit) * 100 : 0;
                return (
                  <div
                    key={c.id}
                    className="li"
                    style={{ border: 0, padding: '6px 0', display: 'block' }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span>{c.name}</span>
                      <span className="mut">
                        {fmt(s, state.hide)} / {fmt(c.limit, state.hide)}
                      </span>
                    </div>
                    <div className="bar">
                      <i
                        style={{
                          width: `${Math.min(p, 100)}%`,
                          background: col(p),
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty">Add a category in Budgets.</div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width Card: Recent Expenses List */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div
          className="row"
          style={{ justifyContent: 'space-between', flexWrap: 'nowrap', marginBottom: '6px' }}
        >
          <h2 style={{ margin: 0 }}>
            {selectedDay
              ? `Expenses on ${fD(selectedDay)}`
              : `Expenses in ${formatMonthLabel(selectedMonth)}`}
          </h2>
          <select
            className="srt"
            aria-label="Sort expenses"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
          >
            <option value="recent">Recent</option>
            <option value="high">Highest</option>
            <option value="low">Lowest</option>
          </select>
        </div>

        {displayedExpenses.length ? (
          displayedExpenses.slice(0, selectedDay ? 100 : 25).map((e) => {
            const catObj = state.cats.find((c) => c.id === e.cat);
            const catIndex = state.cats.findIndex((c) => c.id === e.cat);
            const initial = (catObj?.name || '?')[0].toUpperCase();
            const color = PAL[catIndex >= 0 ? catIndex % PAL.length : 0];

            const timeStr =
              e.ts && e.ts > 0 && !e.nt && !/\(auto\)$/.test(e.note || '')
                ? ` · ${new Date(e.ts).toLocaleTimeString('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`
                : '';

            return (
              <div key={e.id} className="li">
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <div className="ic" style={{ background: color }}>
                    {initial}
                  </div>
                  <div>
                    {e.note || catObj?.name || 'Expense'}
                    <div className="mut">
                      {fD(e.date)}
                      {timeStr} <span className="tag">{catObj?.name || '?'}</span>
                    </div>
                  </div>
                </div>

                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <span className="amt">{fmt(e.amt, state.hide)}</span>
                  <button
                    type="button"
                    className="g"
                    onClick={() => setExpenseToDelete(e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">No expenses for this period.</div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteExpenseModal
        expense={expenseToDelete}
        categoryName={state.cats.find((c) => c.id === expenseToDelete?.cat)?.name}
        isHide={state.hide === true}
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
}
