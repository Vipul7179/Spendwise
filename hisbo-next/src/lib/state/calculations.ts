import { AppState, Category, Expense, Group, GroupExpense, AlertItem, RecurringExpense } from '@/types/state';

export const MASK_DOTS = '\u25cf\u202f\u25cf\u202f\u25cf\u202f\u25cf';
export const MASK_AMOUNT = '\u20b9\u00a0' + MASK_DOTS;

export function maskAmounts(text: string): string {
  return text.replace(/₹\s?[\d,]+(\.\d+)?/g, MASK_AMOUNT);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function NOW(): string {
  return ymd(new Date());
}

export function mk(dateString: string): string {
  return dateString.slice(0, 7);
}

export function paise(v: string | number): number {
  if (typeof v === 'number') return Math.round(v);
  const clean = String(v).replace(/,/g, '').trim();
  const num = parseFloat(clean);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

export function fmtR(p: number): string {
  const rupees = p / 100;
  return (
    '₹' +
    rupees.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })
  );
}

export function fmt(p: number, hide = false): string {
  return hide ? MASK_AMOUNT : fmtR(p);
}

export function spent(categoryId: string, month: string, exps: Expense[]): number {
  return exps
    .filter((e) => e.cat === categoryId && mk(e.date) === month)
    .reduce((sum, e) => sum + e.amt, 0);
}

export function spentV(
  categoryId: string,
  month: string,
  vDay: string | null | undefined,
  exps: Expense[]
): number {
  if (vDay) {
    return exps
      .filter((e) => e.cat === categoryId && e.date === vDay)
      .reduce((sum, e) => sum + e.amt, 0);
  }
  return spent(categoryId, month, exps);
}

export function mTotal(month: string, exps: Expense[]): number {
  return exps
    .filter((e) => mk(e.date) === month)
    .reduce((sum, e) => sum + e.amt, 0);
}

export function col(percent: number): string {
  if (percent > 100) return 'var(--bad)';
  if (percent >= 50) return 'var(--warn)';
  return 'var(--ok)';
}

export function gShares(e: GroupExpense): Record<number, number> {
  const k = e.with.length;
  if (k <= 0) return {};
  const base = Math.floor(e.amt / k);
  const remainder = e.amt - base * k;
  const out: Record<number, number> = {};
  e.with.forEach((m) => {
    out[m] = base;
  });
  const remRecipient = e.with.includes(e.payer) ? e.payer : e.with[0];
  out[remRecipient] = (out[remRecipient] || 0) + remainder;
  return out;
}

export interface GroupDue {
  id: string;
  from: number;
  to: number;
  amt: number;
  desc: string;
  date: string;
  done: boolean;
}

export function gDues(g: Group): GroupDue[] {
  const out: GroupDue[] = [];
  (g.exps || []).forEach((e) => {
    const shares = gShares(e);
    e.with.forEach((m) => {
      if (m !== e.payer && shares[m] > 0) {
        out.push({
          id: e.id,
          from: m,
          to: e.payer,
          amt: shares[m],
          desc: e.desc,
          date: e.date,
          done: !!(e.paid && e.paid[m]),
        });
      }
    });
  });
  return out;
}

export function gNet(g: Group): number[] {
  const net = (g.members || []).map(() => 0);
  gDues(g).forEach((d) => {
    if (!d.done) {
      net[d.to] += d.amt;
      net[d.from] -= d.amt;
    }
  });
  return net;
}

export function evaluateThresholdAlerts(
  categoryId: string,
  date: string,
  cats: Category[],
  exps: Expense[],
  fired: Record<string, number>
): { alerts: AlertItem[]; newFired: Record<string, number> } {
  const c = cats.find((x) => x.id === categoryId);
  const m = mk(date);
  if (!c || !c.limit) return { alerts: [], newFired: { ...fired } };

  const sp = spent(categoryId, m, exps);
  const pct = (sp / c.limit) * 100;
  const newAlerts: AlertItem[] = [];
  const updatedFired = { ...fired };

  [50, 80, 100].forEach((threshold) => {
    const k = `${m}|${categoryId}|${threshold}`;
    if (pct >= threshold && !updatedFired[k]) {
      updatedFired[k] = 1;
      const msg =
        threshold >= 100
          ? `You have used your full ${c.name} budget (${fmtR(sp)} of ${fmtR(c.limit)}).`
          : `Heads up: you've used ${threshold}% of your ${c.name} budget (${fmtR(sp)} of ${fmtR(c.limit)}).`;
      newAlerts.push({
        id: uid(),
        t: new Date().toLocaleString('en-IN'),
        msg,
        read: false,
      });
    }
  });

  const overKey = `${m}|${categoryId}|over`;
  if (sp > c.limit && !updatedFired[overKey]) {
    updatedFired[overKey] = 1;
    newAlerts.push({
      id: uid(),
      t: new Date().toLocaleString('en-IN'),
      msg: `Over budget! ${c.name} spending is ${fmtR(sp)}, above your ${fmtR(c.limit)} limit.`,
      read: false,
    });
  }

  return { alerts: newAlerts, newFired: updatedFired };
}

export function runRecurringExpenses(
  recurring: RecurringExpense[],
  cats: Category[]
): { createdExpenses: Expense[]; updatedRecurring: RecurringExpense[] } {
  const d = new Date();
  const m = mk(NOW());
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const createdExpenses: Expense[] = [];
  const updatedRecurring: RecurringExpense[] = [];

  recurring.forEach((r) => {
    const day = Math.min(r.day, dim);
    if (r.last !== m && d.getDate() >= day) {
      createdExpenses.push({
        id: uid(),
        ts: Date.now(),
        date: `${m}-${String(day).padStart(2, '0')}`,
        amt: r.amt,
        cat: r.cat,
        note: `${r.name} (auto)`,
      });
      updatedRecurring.push({ ...r, last: m });
    } else {
      updatedRecurring.push(r);
    }
  });

  return { createdExpenses, updatedRecurring };
}
