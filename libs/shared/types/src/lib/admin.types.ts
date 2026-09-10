import type { UserRole } from './user.types';

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export interface AdminUser {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  deletedAt: string | null;
  dateJoined: string;
  lastLogin: string | null;
  createdAt: string;
}

export interface AdminSessionInfo {
  id: string;
  deviceName: string | null;
  platform: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  adminEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  organizationId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminInvitation {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: string;
  expiresAt: string;
  createdAt: string;
}

/** Org-scoped entity tabs available under /admin/organizations/:id/entities/:entityType */
export const ADMIN_ORG_ENTITY_TYPES = [
  'employee-profiles',
  'invitations',
  'leave-types',
  'leave-requests',
  'leave-balances',
  'shifts',
  'recurring-shifts',
  'work-events',
  'event-change-requests',
  'employee-availability',
  'visits',
  'kiosk-devices',
] as const;

export type AdminOrgEntityType = (typeof ADMIN_ORG_ENTITY_TYPES)[number];

export interface AppLinks {
  androidApkUrl: string | null;
  iosDownloadUrl: string | null;
}
