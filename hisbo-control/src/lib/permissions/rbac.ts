import { AdminRole, PermissionAction } from '@/types/admin';

export const ROLE_PERMISSIONS: Record<AdminRole, PermissionAction[]> = {
  super_admin: [
    'overview:read',
    'users:read',
    'users:export',
    'analytics:read',
    'blogs:read',
    'blogs:write',
    'monitoring:read',
    'activity:read',
    'admins:read',
    'admins:write',
    'settings:read',
    'settings:write',
  ],
  admin: [
    'overview:read',
    'users:read',
    'users:export',
    'analytics:read',
    'blogs:read',
    'blogs:write',
    'monitoring:read',
    'activity:read',
    'admins:read',
    'settings:read',
  ],
  viewer: [
    'overview:read',
    'users:read',
    'analytics:read',
    'blogs:read',
    'monitoring:read',
    'activity:read',
    'settings:read',
  ],
};

export function hasPermission(role: AdminRole | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

export function getRoleBadgeClass(role: AdminRole): string {
  switch (role) {
    case 'super_admin':
      return 'badge-role-super';
    case 'admin':
      return 'badge-role-admin';
    case 'viewer':
      return 'badge-role-viewer';
    default:
      return 'badge-neutral';
  }
}

export function formatRoleName(role: AdminRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'viewer':
      return 'Viewer';
    default:
      return role;
  }
}

