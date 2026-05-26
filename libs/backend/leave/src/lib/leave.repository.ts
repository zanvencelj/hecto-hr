import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  leaveTypes,
  type LeaveType,
  type NewLeaveType,
  leaveBalances,
  type LeaveBalance,
  leaveRequests,
  type LeaveRequest,
  type NewLeaveRequest,
  users,
} from '@hecto/database';

export interface LeaveBalanceWithType extends LeaveBalance {
  typeName: string;
  typeCode: string;
  typeColor: string;
}

export interface LeaveRequestWithType extends LeaveRequest {
  typeName: string;
  typeCode: string;
  typeColor: string;
  employeeName: string;
}

@Injectable()
export class LeaveRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findLeaveTypesByOrg(organizationId: string): Promise<LeaveType[]> {
    return this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.isActive, true),
          eq(leaveTypes.organizationId, organizationId),
        ),
      );
  }

  async findSystemLeaveTypes(): Promise<LeaveType[]> {
    return this.db
      .select()
      .from(leaveTypes)
      .where(and(eq(leaveTypes.isActive, true)));
  }

  async createLeaveType(data: NewLeaveType): Promise<LeaveType> {
    const result = await this.db.insert(leaveTypes).values(data).returning();
    return result[0]!;
  }

  async findBalancesForEmployee(
    userId: string,
    organizationId: string,
    year: number,
  ): Promise<LeaveBalanceWithType[]> {
    const rows = await this.db
      .select()
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.organizationId, organizationId),
          eq(leaveBalances.year, year),
        ),
      );

    return rows.map((r) => ({
      ...r.leave_balances,
      typeName: r.leave_types?.name ?? '',
      typeCode: r.leave_types?.code ?? '',
      typeColor: r.leave_types?.color ?? '#6366f1',
    }));
  }

  async findAllBalancesForOrg(
    organizationId: string,
    year: number,
  ): Promise<LeaveBalanceWithType[]> {
    const rows = await this.db
      .select()
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
      .where(
        and(
          eq(leaveBalances.organizationId, organizationId),
          eq(leaveBalances.year, year),
        ),
      );

    return rows.map((r) => ({
      ...r.leave_balances,
      typeName: r.leave_types?.name ?? '',
      typeCode: r.leave_types?.code ?? '',
      typeColor: r.leave_types?.color ?? '#6366f1',
    }));
  }

  async upsertBalance(
    userId: string,
    organizationId: string,
    leaveTypeId: string,
    year: number,
    totalDays: string,
  ): Promise<LeaveBalance> {
    const result = await this.db
      .insert(leaveBalances)
      .values({ userId, organizationId, leaveTypeId, year, totalDays })
      .onConflictDoUpdate({
        target: [leaveBalances.userId, leaveBalances.leaveTypeId, leaveBalances.year],
        set: { totalDays, updatedAt: new Date() },
      })
      .returning();
    return result[0]!;
  }

  async adjustUsedDays(
    userId: string,
    organizationId: string,
    leaveTypeId: string,
    year: number,
    usedDelta: string,
    pendingDelta: string,
  ): Promise<void> {
    // Ensure a record exists (totalDays '0' = no quota set, tracks usage only)
    await this.db
      .insert(leaveBalances)
      .values({ userId, organizationId, leaveTypeId, year, totalDays: '0', usedDays: '0', pendingDays: '0' })
      .onConflictDoNothing();

    const current = await this.db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.leaveTypeId, leaveTypeId),
          eq(leaveBalances.year, year),
        ),
      )
      .limit(1);

    if (!current[0]) return;

    const newUsed = Math.max(0, parseFloat(current[0].usedDays) + parseFloat(usedDelta)).toString();
    const newPending = Math.max(0, parseFloat(current[0].pendingDays) + parseFloat(pendingDelta)).toString();

    await this.db
      .update(leaveBalances)
      .set({ usedDays: newUsed, pendingDays: newPending, updatedAt: new Date() })
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.leaveTypeId, leaveTypeId),
          eq(leaveBalances.year, year),
        ),
      );
  }

  async createRequest(data: NewLeaveRequest): Promise<LeaveRequestWithType> {
    const result = await this.db.insert(leaveRequests).values(data).returning();
    const row = result[0]!;
    const [type, employee] = await Promise.all([
      this.db.select().from(leaveTypes).where(eq(leaveTypes.id, row.leaveTypeId)).limit(1),
      this.db.select().from(users).where(eq(users.id, row.userId)).limit(1),
    ]);
    const u = employee[0];
    return {
      ...row,
      typeName: type[0]?.name ?? '',
      typeCode: type[0]?.code ?? '',
      typeColor: type[0]?.color ?? '#6366f1',
      employeeName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '',
    };
  }

  async updateRequest(
    id: string,
    data: Partial<Pick<LeaveRequest, 'status' | 'reviewedByUserId' | 'reviewedAt' | 'reviewNotes' | 'totalDays' | 'isEdited' | 'editedByUserId' | 'editedAt'>>,
  ): Promise<LeaveRequest> {
    const result = await this.db
      .update(leaveRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return result[0]!;
  }

  async findRequestById(id: string): Promise<LeaveRequestWithType | null> {
    const rows = await this.db
      .select()
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .leftJoin(users, eq(users.id, leaveRequests.userId))
      .where(eq(leaveRequests.id, id))
      .limit(1);

    if (!rows[0]) return null;
    const u = rows[0].users;
    return {
      ...rows[0].leave_requests,
      typeName: rows[0].leave_types?.name ?? '',
      typeCode: rows[0].leave_types?.code ?? '',
      typeColor: rows[0].leave_types?.color ?? '#6366f1',
      employeeName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '',
    };
  }

  async findRequestsForEmployee(
    userId: string,
    organizationId: string,
  ): Promise<LeaveRequestWithType[]> {
    const rows = await this.db
      .select()
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .leftJoin(users, eq(users.id, leaveRequests.userId))
      .where(
        and(
          eq(leaveRequests.userId, userId),
          eq(leaveRequests.organizationId, organizationId),
        ),
      );

    return rows.map((r) => {
      const u = r.users;
      return {
        ...r.leave_requests,
        typeName: r.leave_types?.name ?? '',
        typeCode: r.leave_types?.code ?? '',
        typeColor: r.leave_types?.color ?? '#6366f1',
        employeeName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '',
      };
    });
  }

  async findRequestsForOrg(
    organizationId: string,
    status?: string,
  ): Promise<LeaveRequestWithType[]> {
    const rows = await this.db
      .select()
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .leftJoin(users, eq(users.id, leaveRequests.userId))
      .where(
        and(
          eq(leaveRequests.organizationId, organizationId),
          status ? eq(leaveRequests.status, status as LeaveRequest['status']) : undefined,
        ),
      );

    return rows.map((r) => {
      const u = r.users;
      return {
        ...r.leave_requests,
        typeName: r.leave_types?.name ?? '',
        typeCode: r.leave_types?.code ?? '',
        typeColor: r.leave_types?.color ?? '#6366f1',
        employeeName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '',
      };
    });
  }

  async seedDefaultLeaveTypes(organizationId: string): Promise<void> {
    const defaults: NewLeaveType[] = [
      {
        organizationId,
        name: 'Annual Leave',
        code: 'annual',
        color: '#6366f1',
        defaultDaysPerYear: 20,
        isPaid: true,
      },
      {
        organizationId,
        name: 'Sick Leave',
        code: 'sick',
        color: '#f59e0b',
        defaultDaysPerYear: 10,
        isPaid: true,
      },
      {
        organizationId,
        name: 'Unpaid Leave',
        code: 'unpaid',
        color: '#6b7280',
        defaultDaysPerYear: 0,
        isPaid: false,
      },
    ];
    await this.db.insert(leaveTypes).values(defaults).onConflictDoNothing();
  }
}
