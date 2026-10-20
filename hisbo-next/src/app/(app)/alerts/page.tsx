'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { fmt, fmtR, NOW, mk, mTotal, spent } from '@/lib/state/calculations';
import { formatMonthLabel } from '@/components/app/overview/DateBar';

export default function AlertsPage() {
  const {
    state,
    updateEmailSettings,
    updatePhoneSettings,
    dismissAlert,
    clearAlerts,
    markAlertsAsRead,
    showToast,
  } = useApp();

  const currentMonth = mk(NOW());

  const [emailInput, setEmailInput] = useState(state.email || '');
  const [mailOn, setMailOn] = useState(state.mailOn !== false);
  const [channel, setChannel] = useState<'wa' | 'sms'>(state.chan || 'wa');
  const [phoneInput, setPhoneInput] = useState(state.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(!state.phone);

  // Mark alerts as read on visit
  useEffect(() => {
    markAlertsAsRead();
  }, [markAlertsAsRead]);

  // Sync state if it updates externally
  useEffect(() => {
    if (state.email) setEmailInput(state.email);
    if (state.phone) setPhoneInput(state.phone);
    if (state.chan) setChannel(state.chan);
    if (state.mailOn !== undefined) setMailOn(state.mailOn);
  }, [state.email, state.phone, state.chan, state.mailOn]);

  const handleSaveEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = emailInput.trim();
    if (trimmed.length > 80 || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmed)) {
      showToast('Enter a valid email address, like name@example.com.', 'err');
      return;
    }
    updateEmailSettings(trimmed, mailOn);
    showToast('Email preferences saved.');
  };

  const handleSavePhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = phoneInput.trim();
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      showToast('Enter a phone number to save.', 'err');
      return;
    }
    if (/[^\d+\s()-]/.test(raw) || digitsOnly.length < 10 || digitsOnly.length > 15) {
      showToast('Enter a valid phone number: digits only, with country code if outside India.', 'err');
      return;
    }

    const formatted = digitsOnly.length === 10 ? '91' + digitsOnly : digitsOnly;
    updatePhoneSettings(formatted, channel);
    setIsEditingPhone(false);
    showToast('Phone number saved.');
  };

  const handleDeletePhone = () => {
    if (window.confirm('Delete this phone number?')) {
      updatePhoneSettings('', channel);
      setPhoneInput('');
      setIsEditingPhone(true);
      showToast('Phone number deleted.');
    }
  };

  // Generate monthly report text
  const generateReportText = (m: string, full: boolean) => {
    const tot = mTotal(m, state.exps);
    const lim = state.cats.reduce((a, c) => a + c.limit, 0);
    const N = '\n';

    const catRows = state.cats
      .map((c) => ({
        name: c.name,
        v: spent(c.id, m, state.exps),
        limit: c.limit,
      }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v);

    const monthExps = state.exps
      .filter((e) => mk(e.date) === m)
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);

    const header = `Hisbo report for ${formatMonthLabel(m)}${state.name ? ` (${state.name})` : ''}${N}${N}Total spent: ${fmtR(tot)}${lim ? ` of ${fmtR(lim)} budget (${Math.round((tot / lim) * 100)}%)` : ''}${N}${N}By category:${N}${
      catRows.length
        ? catRows
            .map(
              (r) =>
                `- ${r.name}: ${fmtR(r.v)}${
                  r.limit ? ` / ${fmtR(r.limit)}${r.v > r.limit ? ' (over budget)' : ''}` : ''
                }`
            )
            .join(N)
        : '- No spending'
    }${N}${N}Saved so far: ${fmtR(totalSaved)}`;

    if (full) {
      const txRows = monthExps.map(
        (e) =>
          `${e.date}  ${fmtR(e.amt)}  ${state.cats.find((c) => c.id === e.cat)?.name || ''}  ${e.note || ''}`
      );
      return `${header}${N}${N}Transactions (${monthExps.length}):${N}${txRows.join(N)}`;
    }

    return `${header}${N}${N}${monthExps.length} transactions (full list left out because the email was too long).`;
  };

  const handleSendReportNow = () => {
    if (!state.email) {
      showToast('Add your email first.', 'warn');
      return;
    }

    const fullText = generateReportText(currentMonth, true);
    let mailto = `mailto:${encodeURIComponent(state.email)}?subject=${encodeURIComponent(
      `Hisbo report: ${formatMonthLabel(currentMonth)}`
    )}&body=${encodeURIComponent(fullText)}`;

    if (mailto.length > 1900) {
      const shortText = generateReportText(currentMonth, false);
      mailto = `mailto:${encodeURIComponent(state.email)}?subject=${encodeURIComponent(
        `Hisbo report: ${formatMonthLabel(currentMonth)}`
      )}&body=${encodeURIComponent(shortText)}`;
    }

    window.open(mailto, '_blank');
  };

  const handleCopyReport = () => {
    const text = generateReportText(currentMonth, true);
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast('Report copied.'))
        .catch(() => showToast('Could not copy the report.', 'err'));
    } else {
      showToast('Could not copy the report.', 'err');
    }
  };

  const getAlertSendLink = (msg: string) => {
    const digits = state.phone?.replace(/\D/g, '');
    if (!digits) return null;
    return state.chan === 'wa'
      ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
      : `sms:+${digits}?body=${encodeURIComponent(msg)}`;
  };

  const maskAmount = (text: string) => {
    return text.replace(/₹\s?[\d,]+(\.\d+)?/g, '₹ ••••');
  };

  return (
    <div>
      {/* Monthly Email Report Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Monthly email report</h2>
        <p className="mut" style={{ margin: '0 0 12px' }}>
          Get a summary of your spending, budgets and savings at the end of every month.
        </p>

        <form onSubmit={handleSaveEmail}>
          <div className="row">
            <input
              id="em"
              type="email"
              placeholder="you@example.com"
              maxLength={80}
              autoComplete="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
            />
            <button type="submit" className="b">
              Save email
            </button>
          </div>
        </form>

        <label className="sw" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
          <input
            type="checkbox"
            checked={mailOn}
            onChange={(e) => {
              const nextVal = e.target.checked;
              setMailOn(nextVal);
              updateEmailSettings(emailInput || state.email || '', nextVal);
              showToast(nextVal ? 'Month end reminders enabled.' : 'Month end reminders turned off.');
            }}
          />
          Remind me to send my report at month end
        </label>

        <div className="row" style={{ marginTop: '14px' }}>
          <button type="button" className="g" onClick={handleSendReportNow}>
            Send {formatMonthLabel(currentMonth)} report now
          </button>
          <button type="button" className="g" onClick={handleCopyReport}>
            Copy report
          </button>
        </div>

        <div className="note">
          Reports open in your email app, ready to send. Sending automatically without a tap needs a server.
        </div>
      </div>

      {/* Alert Delivery Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Alert delivery</h2>
        <div className="row" style={{ marginBottom: '10px' }}>
          <select
            id="chan"
            value={channel}
            onChange={(e) => {
              const ch = e.target.value as 'wa' | 'sms';
              setChannel(ch);
              updatePhoneSettings(state.phone || '', ch);
              showToast(`Alerts set to ${ch === 'wa' ? 'WhatsApp' : 'SMS'}.`);
            }}
            aria-label="Alert channel"
          >
            <option value="wa">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </div>

        {state.phone && !isEditingPhone ? (
          <div className="li" style={{ border: 0, paddingTop: '4px' }}>
            <div>
              <b>+{state.phone}</b>
              <div className="mut">{state.chan === 'wa' ? 'WhatsApp' : 'SMS'} alerts</div>
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <button
                type="button"
                className="g"
                onClick={() => setIsEditingPhone(true)}
              >
                Edit
              </button>
              <button
                type="button"
                className="g"
                onClick={handleDeletePhone}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSavePhone}>
            <div className="row">
              <input
                id="ph"
                type="tel"
                inputMode="tel"
                placeholder="Phone number, e.g. 9876543210"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                required
              />
              <button type="submit" className="b" style={{ flex: 'none' }}>
                Save number
              </button>
              {state.phone ? (
                <button
                  type="button"
                  className="g"
                  onClick={() => setIsEditingPhone(false)}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        )}

        <div className="note">
          Tap Send on an alert to open WhatsApp or SMS with the message filled in. Fully automatic sending needs a server.
        </div>
      </div>

      {/* Alert History Card */}
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>Alert history</h2>
          {state.alerts.length > 0 && (
            <button
              type="button"
              className="g"
              onClick={() => {
                clearAlerts();
                showToast('All alerts cleared.');
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {state.alerts.length ? (
          state.alerts.map((a) => {
            const sendUrl = getAlertSendLink(a.msg);
            const displayMsg = state.hide ? maskAmount(a.msg) : a.msg;

            return (
              <div key={a.id} className="li">
                <div>
                  {!a.read && (
                    <span className="tag" style={{ color: 'var(--acc)', marginRight: '6px' }}>
                      New
                    </span>
                  )}
                  {displayMsg}
                  <div className="mut">{a.t}</div>
                </div>

                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  {sendUrl && (
                    <a
                      className="g"
                      href={sendUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Send
                    </a>
                  )}
                  <button
                    type="button"
                    className="g"
                    onClick={() => dismissAlert(a.id)}
                    aria-label="Dismiss alert"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">
            No alerts yet. They appear at 50%, 80% and 100% of a category limit.
          </div>
        )}
      </div>
    </div>
  );
}
