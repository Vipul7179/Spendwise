'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fmt, paise, NOW, ymd } from '@/lib/state/calculations';

const KW: Record<string, string[]> = {
  Food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'dominos', 'mcdonald', 'bigbasket', 'blinkit', 'zepto', 'grocery', 'kitchen'],
  Transport: ['uber', 'ola', 'rapido', 'irctc', 'metro', 'petrol', 'fuel', 'hpcl', 'bpcl', 'indian oil', 'fastag'],
  Bills: ['electric', 'bescom', 'recharge', 'airtel', 'jio', 'vodafone', 'broadband', 'insurance', 'lic', 'gas', 'netflix', 'hotstar', 'emi', 'rent'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'mall'],
};

const MNAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseDateString(s: string, prefFmt: 'DMY' | 'MDY' = 'DMY'): string {
  if (!s) return NOW();
  const trimmed = String(s).trim();

  // YYYY-MM-DD
  const m1 = trimmed.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m1) {
    const d = new Date(+m1[1], +m1[2] - 1, +m1[3]);
    const res = ymd(d);
    if (res === `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`) {
      return res;
    }
  }

  // DD-Mon-YYYY
  const nm1 = trimmed.match(/(\d{1,2})[-\s\/]+([A-Za-z]{3,9})[-\s\/,]+(\d{2,4})/);
  if (nm1) {
    const mon = MNAMES[nm1[2].slice(0, 3).toLowerCase()];
    if (mon) {
      const y = nm1[3].length === 2 ? '20' + nm1[3] : nm1[3];
      const d = new Date(+y, mon - 1, +nm1[1]);
      if (d.getMonth() === mon - 1) return ymd(d);
    }
  }

  // Mon-DD-YYYY
  const nm2 = trimmed.match(/([A-Za-z]{3,9})[-\s\/]+(\d{1,2})[-\s\/,]+(\d{2,4})/);
  if (nm2) {
    const mon = MNAMES[nm2[1].slice(0, 3).toLowerCase()];
    if (mon) {
      const y = nm2[3].length === 2 ? '20' + nm2[3] : nm2[3];
      const d = new Date(+y, mon - 1, +nm2[2]);
      if (d.getMonth() === mon - 1) return ymd(d);
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const m2 = trimmed.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (!m2) return NOW();
  const y = m2[3].length === 2 ? '20' + m2[3] : m2[3];
  let day: number, mo: number;
  if (prefFmt === 'MDY') {
    mo = +m2[1];
    day = +m2[2];
  } else {
    day = +m2[1];
    mo = +m2[2];
  }
  const dt = new Date(+y, mo - 1, day);
  const res = ymd(dt);
  return res >= '2000-01-01' && res <= NOW() && dt.getMonth() === mo - 1 ? res : NOW();
}

function parseSms(t: string): { amt: number; mer: string; date: string } | 'credit' | null {
  if (/credited|received|deposited|refund/i.test(t) && !/debited|spent|paid/i.test(t)) {
    return 'credit';
  }
  const a = t.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!a || !/debit|spent|paid|sent|purchase|withdrawn|payment/i.test(t)) {
    return null;
  }
  const m = t.match(/(?:\bat\b|\bto\b|\bfor\b)\s+([A-Za-z0-9&.@_ -]{2,40})/i);
  const mer = m
    ? m[1].split(/\s(?:on|via|ref|upi|avl|bal|from|using)\b/i)[0].replace(/[.\s-]+$/, '').trim()
    : '';
  return {
    amt: paise(a[1].replace(/,/g, '')),
    mer: mer || 'Bank debit',
    date: parseDateString(t),
  };
}

function getOrdinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  const last = n % 10;
  if (last === 1) return `${n}st`;
  if (last === 2) return `${n}nd`;
  if (last === 3) return `${n}rd`;
  return `${n}th`;
}

interface PendingCsvRow {
  amt: number;
  mer: string;
  rawDate: string;
  rawDesc: string;
}

export default function AutomatePage() {
  const { state, addExpense, addRecurring, deleteRecurring, addCategory, showToast } = useApp();

  // SMS text
  const [smsText, setSmsText] = useState('');

  // Recurring form
  const [recName, setRecName] = useState('');
  const [recAmt, setRecAmt] = useState('');
  const [recCat, setRecCat] = useState(state.cats[0]?.id || '');
  const [recDay, setRecDay] = useState('');

  // CSV Ambiguous Date Modal
  const [pendingCsvRows, setPendingCsvRows] = useState<PendingCsvRow[] | null>(null);
  const [ambiguousSample, setAmbiguousSample] = useState<{ raw: string; dmyEx: string; mdyEx: string } | null>(null);

  const pickCategoryForText = (text: string): string => {
    const lower = text.toLowerCase();
    let matchedName: string | null = null;
    for (const catName in KW) {
      if (KW[catName].some((w) => lower.includes(w))) {
        matchedName = catName;
        break;
      }
    }

    if (matchedName) {
      const existing = state.cats.find((c) => c.name.toLowerCase() === matchedName?.toLowerCase());
      if (existing) return existing.id;
    }

    // Default to 'Other'
    let other = state.cats.find((c) => c.name.toLowerCase() === 'other');
    if (!other) {
      addCategory('Other', 0);
      const freshlyAdded = state.cats.find((c) => c.name.toLowerCase() === 'other');
      if (freshlyAdded) return freshlyAdded.id;
    }
    return other ? other.id : state.cats[0]?.id || '';
  };

  const handleImportSms = () => {
    const raw = smsText.trim();
    if (!raw) {
      showToast('Paste at least one bank SMS.', 'err');
      return;
    }
    if (raw.length > 20000) {
      showToast('That is too much text. Paste up to 200 messages at a time.', 'err');
      return;
    }

    const lines = raw.split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 200);
    let importedCount = 0;
    let skippedCount = 0;

    lines.forEach((l) => {
      const parsed = parseSms(l);
      if (parsed && parsed !== 'credit') {
        const isDuplicate = state.exps.some(
          (e) => e.date === parsed.date && e.amt === parsed.amt && e.note === parsed.mer
        );
        if (!isDuplicate && parsed.amt > 0 && parsed.amt <= 1000000000) {
          const categoryId = pickCategoryForText(parsed.mer + ' ' + l);
          addExpense({
            amt: parsed.amt,
            cat: categoryId,
            date: parsed.date,
            note: parsed.mer.slice(0, 60),
          });
          importedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    });

    setSmsText('');
    showToast(
      `${importedCount} expense${importedCount === 1 ? '' : 's'} imported${
        skippedCount ? `; ${skippedCount} skipped (credits, duplicates or unreadable)` : ''
      }`
    );
  };

  const commitCsvImport = (prefFmt: 'DMY' | 'MDY') => {
    if (!pendingCsvRows) return;
    let count = 0;

    pendingCsvRows.forEach((item) => {
      const date = parseDateString(item.rawDate, prefFmt);
      const isDuplicate = state.exps.some(
        (e) => e.date === date && e.amt === item.amt && e.note === item.mer
      );
      if (!isDuplicate && item.amt > 0 && item.amt <= 1000000000) {
        const categoryId = pickCategoryForText(item.mer + ' ' + item.rawDesc);
        addExpense({
          amt: item.amt,
          cat: categoryId,
          date,
          note: item.mer.slice(0, 60),
        });
        count++;
      }
    });

    setPendingCsvRows(null);
    setAmbiguousSample(null);
    showToast(`${count} expenses imported from CSV.`);
  };

  const handleCsvFileUpload = (file?: File) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) || file.size > 2000000) {
      showToast('Upload a .csv file smaller than 2 MB.', 'err');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => {
          const out: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const ch of l) {
            if (ch === '"') inQuotes = !inQuotes;
            else if (ch === ',' && !inQuotes) {
              out.push(current);
              current = '';
            } else {
              current += ch;
            }
          }
          out.push(current);
          return out;
        });

      const headerIdx = rows.findIndex((row) => row.some((v) => /date/i.test(v)));
      if (headerIdx < 0) {
        showToast('No header row with a Date column found in CSV.', 'err');
        return;
      }

      const headers = rows[headerIdx];
      const dateCol = headers.findIndex((v) => /date/i.test(v));
      const descCol = headers.findIndex((v) => /desc|narr|particular|remark/i.test(v));
      const debitCol = headers.findIndex((v) => /debit|withdraw|amount/i.test(v));

      if (debitCol < 0) {
        showToast('No Debit or Amount column found in CSV.', 'err');
        return;
      }

      const parsedItems: PendingCsvRow[] = [];
      rows.slice(headerIdx + 1).forEach((row) => {
        const amtStr = (row[debitCol] || '').replace(/[^\d.]/g, '');
        const amtPaise = paise(amtStr);
        if (amtPaise > 0) {
          parsedItems.push({
            amt: amtPaise,
            mer: (row[descCol] || 'Bank debit').trim().slice(0, 40),
            rawDate: (row[dateCol] || '').trim(),
            rawDesc: row[descCol] || '',
          });
        }
      });

      if (!parsedItems.length) {
        showToast('No debit transactions found in CSV.', 'warn');
        return;
      }

      let dmyVotes = 0;
      let mdyVotes = 0;
      interface AmbiguousInfo {
        raw: string;
        a: number;
        b: number;
        y: string;
      }
      let ambiguous: AmbiguousInfo | null = null;

      parsedItems.forEach((r) => {
        const m = r.rawDate.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
        if (m) {
          const a = parseInt(m[1], 10);
          const b = parseInt(m[2], 10);
          if (a > 12 && b <= 12) dmyVotes++;
          else if (b > 12 && a <= 12) mdyVotes++;
          else if (a <= 12 && b <= 12 && !ambiguous) {
            ambiguous = { raw: r.rawDate, a, b, y: m[3].length === 2 ? '20' + m[3] : m[3] };
          }
        }
      });

      setPendingCsvRows(parsedItems);

      if (dmyVotes > 0 && mdyVotes === 0) {
        commitCsvImport('DMY');
      } else if (mdyVotes > 0 && dmyVotes === 0) {
        commitCsvImport('MDY');
      } else if (ambiguous) {
        const amb = ambiguous as AmbiguousInfo;
        const moNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        setAmbiguousSample({
          raw: amb.raw,
          dmyEx: `${amb.a} ${moNames[amb.b - 1] || ''} ${amb.y}`,
          mdyEx: `${moNames[amb.a - 1] || ''} ${amb.b}, ${amb.y}`,
        });
      } else {
        commitCsvImport('DMY');
      }
    };

    reader.readAsText(file);
  };

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = recName.trim();
    if (!trimmed) {
      showToast('Enter a name for the recurring expense.', 'err');
      return;
    }
    const amtPaise = paise(recAmt);
    if (amtPaise <= 0) {
      showToast('Enter an amount greater than ₹0.', 'err');
      return;
    }
    const dayNum = parseInt(recDay, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      showToast('Choose a day between 1 and 31.', 'err');
      return;
    }
    const validCat = recCat || state.cats[0]?.id;
    if (!validCat) {
      showToast('Add a category in Budgets first.', 'err');
      return;
    }

    addRecurring(trimmed, amtPaise, validCat, dayNum);
    setRecName('');
    setRecAmt('');
    setRecDay('');
  };

  const copyShortcutLink = () => {
    const url = 'https://www.hisbo.in/overview?add=1';
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast('Shortcut link copied.'))
        .catch(() => showToast('Add ?add=1 to the end of your Hisbo URL.', 'warn'));
    } else {
      showToast('Add ?add=1 to the end of your Hisbo URL.', 'warn');
    }
  };

  return (
    <div>
      {/* Smart Import Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Smart import</h2>
        <textarea
          id="sms"
          rows={5}
          placeholder={`Paste bank SMS, one per line. Example:\nRs 850.00 debited from A/c XX1234 at BIGBASKET on 12-10-2026`}
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
        />
        <div className="row" style={{ marginTop: '10px' }}>
          <button type="button" className="b" onClick={handleImportSms}>
            Import from SMS
          </button>
          <label className="g" style={{ padding: '11px 16px', cursor: 'pointer', textAlign: 'center' }}>
            Upload bank statement (CSV)
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) handleCsvFileUpload(e.target.files[0]);
              }}
            />
          </label>
        </div>
        <div className="note">
          Amount, merchant and date are detected, and the category is assigned from the merchant name.
          Credits are ignored and duplicates are skipped.
        </div>
      </div>

      {/* Auto Deduct Recurring Expense Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Auto-deduct a recurring expense</h2>
        <form onSubmit={handleAddRecurring}>
          <div className="row">
            <input
              id="rn"
              type="text"
              placeholder="Name (e.g. Rent)"
              maxLength={30}
              value={recName}
              onChange={(e) => setRecName(e.target.value)}
              required
            />
            <input
              id="ra"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount ₹"
              inputMode="decimal"
              value={recAmt}
              onChange={(e) => setRecAmt(e.target.value)}
              required
            />
            <select
              id="rc"
              value={recCat}
              onChange={(e) => setRecCat(e.target.value)}
              aria-label="Category"
            >
              {state.cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              id="rd"
              aria-label="Day of month"
              value={recDay}
              onChange={(e) => setRecDay(e.target.value)}
              required
            >
              <option value="" disabled>
                Day of month
              </option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {getOrdinal(n)} of every month
                </option>
              ))}
            </select>
            <button type="submit" className="b">
              Add recurring
            </button>
          </div>
        </form>
        <div className="note">
          It is logged automatically each month on that day (on the last day of shorter months). This records the spend;
          to move real money, use UPI AutoPay or a bank standing instruction.
        </div>
      </div>

      {/* Active Recurring Deductions Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Active</h2>
        {state.rec.length ? (
          state.rec.map((r) => {
            const catObj = state.cats.find((c) => c.id === r.cat);
            return (
              <div key={r.id} className="li">
                <div>
                  <b>{r.name}</b>
                  <div className="mut">
                    Day {r.day} every month <span className="tag">{catObj?.name || '?'}</span>
                  </div>
                </div>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <span className="amt">{fmt(r.amt, state.hide)}</span>
                  <button
                    type="button"
                    className="g"
                    onClick={() => {
                      deleteRecurring(r.id);
                      showToast('Recurring expense stopped.');
                    }}
                  >
                    Stop
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">Nothing scheduled yet.</div>
        )}
      </div>

      {/* Fully Automatic Tracking Info Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Fully automatic tracking</h2>
        <div className="m3">
          <div>
            <b>
              Android app <span className="st">Needs app</span>
            </b>
            <span className="mut">
              Reads incoming bank SMS with your permission and logs debits the moment they arrive.
            </span>
          </div>
          <div>
            <b>
              Bank sync via Account Aggregator <span className="st">Needs backend</span>
            </b>
            <span className="mut">
              Consent-based access to your bank transactions through a licensed partner.
            </span>
          </div>
          <div>
            <b>
              UPI AutoPay <span className="st">Done at your bank</span>
            </b>
            <span className="mut">
              Moves the real money for recurring payments. Hisbo then logs them under Recurring.
            </span>
          </div>
        </div>
        <div className="note">A web page cannot read your SMS, so these connections are not active in this version.</div>
      </div>

      {/* Quick Add Shortcuts Card */}
      <div className="card">
        <h2>Quick add shortcuts</h2>
        <div className="m3">
          <div>
            <b>iPhone: double-tap the back</b>
            <span className="mut">
              A website cannot detect phone taps, so iOS runs a Shortcut for it. Open Settings, Accessibility, Touch,
              Back Tap, Double Tap, and pick a Shortcut that opens this page&apos;s link ending in ?add=1.
            </span>
          </div>
          <div>
            <b>Android and desktop: the + button</b>
            <span className="mut">
              Tap the + button on the Overview page to open Quick add. On desktop you can also press N.
            </span>
          </div>
        </div>
        <div className="row" style={{ marginTop: '12px' }}>
          <button type="button" className="g" onClick={copyShortcutLink}>
            Copy shortcut link
          </button>
        </div>
      </div>

      {/* CSV Ambiguous Date Modal */}
      {ambiguousSample && (
        <div className="mod">
          <div className="box" role="dialog" aria-modal="true" aria-label="Confirm Date Format">
            <div className="nm">
              <h2>Confirm Date Format</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                We found dates like <b>{ambiguousSample.raw}</b>. How should they be interpreted?
              </p>
              <button
                type="button"
                className="b"
                onClick={() => commitCsvImport('DMY')}
              >
                DD/MM/YYYY &middot; e.g. {ambiguousSample.dmyEx}
              </button>
              <button
                type="button"
                className="b"
                onClick={() => commitCsvImport('MDY')}
              >
                MM/DD/YYYY &middot; e.g. {ambiguousSample.mdyEx}
              </button>
              <button
                type="button"
                className="g"
                onClick={() => {
                  setPendingCsvRows(null);
                  setAmbiguousSample(null);
                }}
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
