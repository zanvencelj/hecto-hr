export type UserRole = 'admin' | 'hr' | 'manager' | 'employee' | 'superadmin';

export interface UserPublic {
  id: string;
  organizationId: string | null;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  dateJoined: string;
  lastLogin: string | null;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  platform: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface OrganizationPublic {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}
