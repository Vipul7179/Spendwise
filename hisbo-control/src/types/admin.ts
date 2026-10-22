// ====================================================================
// Hisbo Control — Administrative Types
// ====================================================================

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
  status: 'active' | 'suspended';
}

export type PermissionAction =
  | 'overview:read'
  | 'users:read'
  | 'users:export'
  | 'analytics:read'
  | 'blogs:read'
  | 'blogs:write'
  | 'monitoring:read'
  | 'activity:read'
  | 'admins:read'
  | 'admins:write'
  | 'settings:read'
  | 'settings:write';

export type AuditLogCategory =
  | 'auth'
  | 'users'
  | 'admins'
  | 'roles'
  | 'blogs'
  | 'banners'
  | 'monitoring'
  | 'settings'
  | 'security';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  action: string;
  category: AuditLogCategory;
  details: string;
  ipHash: string;
  status: 'success' | 'failed' | 'denied';
}

export interface UserManagementItem {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn?: string;
  authProvider: 'email' | 'google' | 'guest';
  status: 'active' | 'inactive';
  isAdmin: boolean;
  totalExpensesCount?: number;
  hasBudgets?: boolean;
  hasGoals?: boolean;
}

