// ====================================================================
// Hisbo Control — Analytics & Metrics Types
// ====================================================================

export type TimeRangeFilter = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface OverviewMetrics {
  totalUsers: number;
  userGrowthPct: number;
  activeUsersDay: number;
  activeUsersMonth: number;
  totalExpensesLogged: number;
  expenseGrowthPct: number;
  totalSavingsTracked: number;
  blogPageviews: number;
  blogGrowthPct: number;
  systemUptime: number;
  avgLatencyMs: number;
  totalRegisteredUsers?: number;
  totalRegisteredUsersGrowth?: number;
  activeUsersMonthly?: number;
  activeUsersWeekly?: number;
  activeUsersDaily?: number;
}

export interface MetricTrendPoint {
  date: string;
  value: number;
  label?: string;
  signups?: number;
  activeUsers?: number;
  pageViews?: number;
  guestSessions?: number;
}

export interface TrafficSourceItem {
  source: string;
  visitors: number;
  percentage: number;
  changePct?: number;
  channel?: string;
  users?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface TopRouteItem {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgDurationSec: number;
}

export interface DeviceBreakdown {
  category: 'Mobile' | 'Desktop' | 'Tablet';
  percentage: number;
  count: number;
}

export interface BrowserBreakdown {
  browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other';
  percentage: number;
}

