'use client';

import React, { useState, useRef, useEffect } from 'react';
import GuestEntryButton from '@/components/auth/GuestEntryButton';

interface CategoryData {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
}

const INITIAL_CATEGORIES: CategoryData[] = [
  { id: 'food', name: 'Food', color: '#0f7a58', icon: '🍔', amount: 5857 },
  { id: 'bills', name: 'Bills', color: '#e29a00', icon: '💡', amount: 4686 },
  { id: 'travel', name: 'Travel', color: '#22d3ee', icon: '🚕', amount: 3347 },
  { id: 'shopping', name: 'Shopping', color: '#e0529c', icon: '🛍️', amount: 1673 },
  { id: 'other', name: 'Other', color: '#8a5cf6', icon: '📦', amount: 1172 },
];

const MONTHLY_BUDGET = 34800;

export default function ExpenseCalculator() {
  const [categories, setCategories] = useState<CategoryData[]>(INITIAL_CATEGORIES);
  const [selectedCatId, setSelectedCatId] = useState<string>('food');
  const [inputAmount, setInputAmount] = useState<string>('500');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [justAddedMsg, setJustAddedMsg] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalSpent = categories.reduce((sum, c) => sum + c.amount, 0);
  const percentUsed = Math.min(100, Math.round((totalSpent / MONTHLY_BUDGET) * 100));

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation Logic
    const trimmed = inputAmount.trim();
    if (!trimmed) {
      setValidationError('Please enter an expense amount.');
      return;
    }

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || !isFinite(parsed)) {
      setValidationError('Please enter a valid numeric amount.');
      return;
    }

    if (parsed <= 0) {
      setValidationError('Expense amount must be greater than ₹0.');
      return;
    }

    if (parsed > 1000000) {
      setValidationError('Expense amount cannot exceed ₹10,00,000.');
      return;
    }

    // Clean amount (supports decimals rounded to 2 places)
    const cleanAmount = Math.round(parsed * 100) / 100;
    setValidationError(null);

    // Update Category Totals
    setCategories((prev) =>
      prev.map((c) =>
        c.id === selectedCatId
          ? { ...c, amount: Math.round((c.amount + cleanAmount) * 100) / 100 }
          : c
      )
    );

    const catName = categories.find((c) => c.id === selectedCatId)?.name || 'Expense';
    setJustAddedMsg(
      `Added ₹${cleanAmount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })} to ${catName}!`
    );
    setTimeout(() => setJustAddedMsg(null), 3000);
  };

  const handleReset = () => {
    setCategories(INITIAL_CATEGORIES);
    setInputAmount('500');
    setSelectedCatId('food');
    setValidationError(null);
    setJustAddedMsg('Demo reset to initial values.');
    setTimeout(() => setJustAddedMsg(null), 2500);
  };

  const selectedCategory =
    categories.find((c) => c.id === selectedCatId) || categories[0];

  // Compute donut circumference & offsets for circle r=38 (circumference = 2 * PI * 38 ≈ 238.76)
  const circumference = 2 * Math.PI * 38;
  const donutSegments = categories.map((cat, idx) => {
    const pct = totalSpent > 0 ? cat.amount / totalSpent : 0;
    const strokeDash = pct * circumference;
    const previousAccumulated = categories
      .slice(0, idx)
      .reduce(
        (sum, prevCat) =>
          sum + (totalSpent > 0 ? (prevCat.amount / totalSpent) * circumference : 0),
        0
      );
    const strokeOffset = -previousAccumulated;

    return {
      ...cat,
      pctDisplay: Math.round(pct * 100),
      strokeDasharray: `${strokeDash.toFixed(1)} ${(circumference - strokeDash).toFixed(1)}`,
      strokeDashoffset: strokeOffset.toFixed(1),
    };
  });

  return (
    <section className="lsec calc-section" id="calculator" aria-labelledby="calc-heading">
      <div className="calc-header-wrap">
        <h2 id="calc-heading">Try the expense calculator</h2>
        <p>See how your daily expenses impact your monthly budget.</p>
      </div>

      <div className="calc-card-main">
        {/* Left Column: Interactive Form */}
        <div className="calc-form-panel">
          <form onSubmit={handleAddExpense} className="calc-inputs-form" noValidate>
            <div className="calc-fields-row">
              {/* Expense Amount Control */}
              <div className="calc-field-group">
                <label htmlFor="calc-amount-input">Expense amount</label>
                <div
                  className={`calc-field-control ${
                    validationError ? 'has-error' : ''
                  }`}
                >
                  <span className="calc-currency-prefix" aria-hidden="true">
                    ₹
                  </span>
                  <input
                    id="calc-amount-input"
                    type="number"
                    step="any"
                    min="0"
                    max="1000000"
                    inputMode="decimal"
                    value={inputAmount}
                    onChange={(e) => {
                      setInputAmount(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="500"
                    className="calc-clean-input"
                    aria-invalid={!!validationError}
                    aria-describedby={validationError ? 'calc-amount-error' : undefined}
                    required
                  />
                </div>
                {validationError && (
                  <div className="calc-inline-error" id="calc-amount-error" role="alert">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Theme-Matched Custom Category Dropdown */}
              <div className="calc-field-group" ref={dropdownRef}>
                <label id="calc-cat-label">Category</label>
                <div className="calc-dropdown-container">
                  <button
                    type="button"
                    className={`calc-field-control calc-dropdown-trigger ${
                      dropdownOpen ? 'is-open' : ''
                    }`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                    aria-labelledby="calc-cat-label"
                  >
                    <span className="calc-cat-selected-preview">
                      <span className="calc-cat-emoji" aria-hidden="true">
                        {selectedCategory.icon}
                      </span>
                      <span className="calc-cat-name">{selectedCategory.name}</span>
                    </span>
                    <span className="calc-chevron" aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  {/* Dropdown Menu Popup (Custom Theme Matched) */}
                  {dropdownOpen && (
                    <div
                      className="calc-dropdown-menu"
                      role="listbox"
                      aria-labelledby="calc-cat-label"
                    >
                      {categories.map((c) => {
                        const isSelected = c.id === selectedCatId;
                        return (
                          <div
                            key={c.id}
                            className={`calc-dropdown-option ${
                              isSelected ? 'selected' : ''
                            }`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSelectedCatId(c.id);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className="calc-opt-left">
                              <span className="calc-cat-emoji" aria-hidden="true">
                                {c.icon}
                              </span>
                              <span className="calc-opt-name">{c.name}</span>
                            </span>
                            <span className="calc-opt-right">
                              <span
                                className="calc-opt-dot"
                                style={{ background: c.color }}
                              />
                              {isSelected && (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="calc-opt-check"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button type="submit" className="lbtn p calc-submit-btn">
              <span>Add expense</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>

          {justAddedMsg && (
            <div className="calc-feedback-toast" role="status">
              ✓ {justAddedMsg}
            </div>
          )}

          {/* Redesigned Clean Secondary Actions with Balanced Buttons & Mobile Stacking */}
          <div className="calc-secondary-actions">
            <button
              type="button"
              className="calc-ghost-btn"
              onClick={handleReset}
              title="Reset demonstration numbers to initial state"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset demo</span>
            </button>

            <GuestEntryButton className="calc-guest-cta-link">
              <span>Track expenses in guest mode</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </GuestEntryButton>
          </div>
        </div>

        {/* Right Column: Live Reactive Budget & Compact Spending Summary */}
        <div className="calc-results-panel">
          <div className="calc-budget-header">
            <div>
              <span className="calc-budget-kicker">Monthly Budget</span>
              <div className="calc-budget-amount">
                ₹{MONTHLY_BUDGET.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="calc-budget-progress-status">
              <span className="calc-budget-spent-txt">
                ₹{Math.round(totalSpent).toLocaleString('en-IN')} spent
              </span>
              <span className="calc-budget-pct-txt">· {percentUsed}% used</span>
            </div>
          </div>

          {/* Interactive Progress Bar */}
          <div className="calc-budget-bar-track">
            <div
              className="calc-budget-bar-fill"
              style={{
                width: `${percentUsed}%`,
                background:
                  percentUsed > 90
                    ? 'var(--bad)'
                    : percentUsed > 75
                    ? 'var(--warn)'
                    : 'linear-gradient(90deg, #0f7a58, #27c08a)',
              }}
            />
          </div>

          {/* Compact Spending Summary with Centered Donut & Column-Aligned Legend */}
          <div className="calc-donut-legend-wrap">
            <div className="calc-donut-svg-box">
              <svg
                width="98"
                height="98"
                viewBox="0 0 100 100"
                aria-label="Expenses donut chart breakdown"
              >
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.id}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="15"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="calc-donut-circle"
                  />
                ))}
              </svg>
            </div>

            <div className="calc-legend-items-list" role="list">
              {donutSegments.map((seg) => (
                <div key={seg.id} className="calc-legend-row" role="listitem">
                  <span
                    className="calc-legend-dot"
                    style={{ background: seg.color }}
                    aria-hidden="true"
                  />
                  <span className="calc-legend-name">{seg.name}</span>
                  <span className="calc-legend-pct">{seg.pctDisplay}%</span>
                  <span className="calc-legend-amount">
                    ₹{Math.round(seg.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="calc-footnote">
        * Demonstration values only. Data does not affect any real accounts.
      </p>
    </section>
  );
}
