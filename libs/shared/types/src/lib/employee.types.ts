import type { UserRole } from './user.types';

export interface EmployeePublic {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  dateJoined: string;
  lastLogin: string | null;
  position: string | null;
  department: string | null;
  phone: string | null;
  hireDate: string | null;
  maxHoursPerWeek: number | null;
  notes: string | null;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
}

export interface InvitationPublic {
  id: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  expiresAt: string;
  createdAt: string;
}
