export interface UserPublic {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isSuperuser: boolean;
  isStaff: boolean;
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
