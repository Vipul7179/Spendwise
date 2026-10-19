export interface Category {
  id: string;
  name: string;
  limit: number; // in paise (e.g. 600000 = ₹6,000)
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amt: number; // in paise
  cat: string; // category id
  note?: string;
  ts?: number; // timestamp in milliseconds
  nt?: boolean;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amt: number; // in paise
  cat: string;
  day: number; // 1 to 31
  last?: string | null; // YYYY-MM
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number; // in paise
  saved: number; // in paise
  ms: number[]; // achieved milestone percentages [25, 50, 75, 100]
}

export interface GroupExpense {
  id: string;
  date: string;
  desc: string;
  amt: number; // in paise
  payer: number; // member index
  with: number[]; // member indices
  paid?: Record<number, boolean>;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  phones?: Record<number, string>;
  exps: GroupExpense[];
}

export interface AlertItem {
  id: string;
  t: string; // localized timestamp string
  msg: string;
  read?: boolean;
}

export interface AppState {
  cats: Category[];
  exps: Expense[];
  rec: RecurringExpense[];
  goals: SavingsGoal[];
  alerts: AlertItem[];
  groups?: Group[];
  fired: Record<string, number>;
  name?: string;
  phone?: string;
  email?: string;
  theme?: 'auto' | 'light' | 'dark';
  hide?: boolean; // privacy mask active
  hh?: boolean;
  chan?: 'wa' | 'sms';
  mailOn?: boolean;
  lastRep?: string;
  gid?: string; // active group id
  ct?: 'donut' | 'pie' | 'bar' | 'line';
}

