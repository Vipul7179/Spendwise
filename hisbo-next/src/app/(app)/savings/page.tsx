'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fmt, paise } from '@/lib/state/calculations';
import { SavingsGoal } from '@/types/state';

export default function SavingsPage() {
  const { state, addGoal, addSavings, deleteGoal, showToast } = useApp();

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = goalName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      showToast('Enter a goal name.', 'err');
      return;
    }
    if (trimmed.length > 30) {
      showToast('Goal name must be 30 characters or fewer.', 'err');
      return;
    }
    const targetPaise = paise(goalTarget);
    if (targetPaise <= 0) {
      showToast('Target amount must be greater than ₹0.', 'err');
      return;
    }
    if (targetPaise > 1000000000) {
      showToast('Target amount is too large (maximum ₹10 crore).', 'err');
      return;
    }

    addGoal(trimmed, targetPaise);
    setGoalName('');
    setGoalTarget('');
  };

  const handleAddSavings = (goalId: string) => {
    const rawVal = contributionAmounts[goalId] || '';
    const amtPaise = paise(rawVal);
    if (amtPaise <= 0) {
      showToast('Enter a valid contribution amount greater than ₹0.', 'err');
      return;
    }
    if (amtPaise > 1000000000) {
      showToast('Contribution amount is too large (maximum ₹10 crore).', 'err');
      return;
    }

    addSavings(goalId, amtPaise);
    setContributionAmounts((prev) => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div>
      {/* New Goal Form Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>New saving goal</h2>
        <form onSubmit={handleCreateGoal}>
          <div className="row">
            <input
              id="gn"
              type="text"
              placeholder="Goal (e.g. New phone)"
              maxLength={30}
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              required
            />
            <input
              id="gt"
              type="number"
              min="1"
              step="0.01"
              placeholder="Target ₹"
              inputMode="decimal"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              required
            />
            <button type="submit" className="b">
              Create goal
            </button>
          </div>
        </form>
      </div>

      {/* Goals Grid */}
      <div className="grid two">
        {state.goals.length ? (
          state.goals.map((g) => {
            const p = g.target > 0 ? (g.saved / g.target) * 100 : 0;
            const clampedP = Math.min(100, Math.max(0, p));
            const isCompleted = p >= 100;
            const strokeColor = isCompleted ? 'var(--ok)' : 'var(--acc)';

            return (
              <div key={g.id} className="card">
                <div className="goal">
                  {/* SVG Circular Progress Ring */}
                  <div className="ring" style={{ width: '84px', flex: 'none', position: 'relative' }}>
                    <svg viewBox="0 0 42 42" style={{ display: 'block', width: '100%' }}>
                      <circle
                        r="15.9155"
                        cx="21"
                        cy="21"
                        fill="none"
                        stroke="var(--line)"
                        strokeWidth="5"
                      />
                      <circle
                        r="15.9155"
                        cx="21"
                        cy="21"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${clampedP} ${100 - clampedP}`}
                        transform="rotate(-90 21 21)"
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                      />
                    </svg>
                    <b
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.95rem',
                      }}
                    >
                      {Math.round(p)}%
                    </b>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '1.1rem', letterSpacing: '-0.02em', display: 'block' }}>
                      {g.name}
                    </b>
                    <div className="mut">
                      {fmt(g.saved, state.hide)} of {fmt(g.target, state.hide)}
                    </div>
                    <div className="mut">
                      {isCompleted ? (
                        <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Goal reached &#127881;</span>
                      ) : (
                        `${fmt(g.target - g.saved, state.hide)} to go`
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Savings Input & Actions */}
                <div className="row" style={{ marginTop: '12px' }}>
                  <input
                    id={`g_${g.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount ₹"
                    inputMode="decimal"
                    value={contributionAmounts[g.id] || ''}
                    onChange={(e) =>
                      setContributionAmounts((prev) => ({ ...prev, [g.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSavings(g.id);
                    }}
                  />
                  <button
                    type="button"
                    className="b"
                    onClick={() => handleAddSavings(g.id)}
                  >
                    Add savings
                  </button>
                  <button
                    type="button"
                    className="g"
                    onClick={() => setGoalToDelete(g)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card empty" style={{ gridColumn: '1 / -1' }}>
            No goals yet. Set a target above and start saving.
          </div>
        )}
      </div>

      {/* Delete Goal Modal */}
      {goalToDelete && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGoalToDelete(null);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Delete goal">
            <div className="nm">
              <div className="av bad">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </div>
              <h2>Delete goal &quot;{goalToDelete.name}&quot;?</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                This will delete your saving goal and all progress made towards it.
                <br />
                This cannot be undone.
              </p>
              <button
                type="button"
                className="b dng"
                style={{ width: '100%', background: 'var(--bad)', color: '#fff', marginTop: '8px' }}
                onClick={() => {
                  deleteGoal(goalToDelete.id);
                  setGoalToDelete(null);
                }}
              >
                Delete goal
              </button>
              <button
                type="button"
                className="g"
                style={{ width: '100%', marginTop: '6px' }}
                onClick={() => setGoalToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
