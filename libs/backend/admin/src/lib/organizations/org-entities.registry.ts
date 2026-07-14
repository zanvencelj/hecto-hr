import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  employeeAvailability,
  employeeProfiles,
  eventChangeRequests,
  invitations,
  kioskDevices,
  leaveBalances,
  leaveRequests,
  leaveTypes,
  recurringShifts,
  shifts,
  visits,
  workEvents,
} from '@hecto/database';
import type { AdminOrgEntityType } from '@hecto/shared-types';

export interface OrgEntityConfig {
  table: PgTable;
  orgColumn: AnyPgColumn;
  orderColumn: AnyPgColumn;
  /** Property names stripped from responses (token hashes, storage keys). */
  omit: readonly string[];
}

export const ORG_ENTITY_REGISTRY: Record<AdminOrgEntityType, OrgEntityConfig> = {
  'employee-profiles': {
    table: employeeProfiles,
    orgColumn: employeeProfiles.organizationId,
    orderColumn: employeeProfiles.createdAt,
    omit: [],
  },
  invitations: {
    table: invitations,
    orgColumn: invitations.organizationId,
    orderColumn: invitations.createdAt,
    omit: ['tokenHash'],
  },
  'leave-types': {
    table: leaveTypes,
    orgColumn: leaveTypes.organizationId,
    orderColumn: leaveTypes.createdAt,
    omit: [],
  },
  'leave-requests': {
    table: leaveRequests,
    orgColumn: leaveRequests.organizationId,
    orderColumn: leaveRequests.createdAt,
    omit: [],
  },
  'leave-balances': {
    table: leaveBalances,
    orgColumn: leaveBalances.organizationId,
    orderColumn: leaveBalances.createdAt,
    omit: [],
  },
  shifts: {
    table: shifts,
    orgColumn: shifts.organizationId,
    orderColumn: shifts.createdAt,
    omit: [],
  },
  'recurring-shifts': {
    table: recurringShifts,
    orgColumn: recurringShifts.organizationId,
    orderColumn: recurringShifts.createdAt,
    omit: [],
  },
  'work-events': {
    table: workEvents,
    orgColumn: workEvents.organizationId,
    orderColumn: workEvents.createdAt,
    omit: [],
  },
  'event-change-requests': {
    table: eventChangeRequests,
    orgColumn: eventChangeRequests.organizationId,
    orderColumn: eventChangeRequests.createdAt,
    omit: [],
  },
  'employee-availability': {
    table: employeeAvailability,
    orgColumn: employeeAvailability.organizationId,
    orderColumn: employeeAvailability.createdAt,
    omit: [],
  },
  visits: {
    table: visits,
    orgColumn: visits.organizationId,
    orderColumn: visits.createdAt,
    omit: ['signatureKey'],
  },
  'kiosk-devices': {
    table: kioskDevices,
    orgColumn: kioskDevices.organizationId,
    orderColumn: kioskDevices.createdAt,
    omit: ['tokenHash'],
  },
};
