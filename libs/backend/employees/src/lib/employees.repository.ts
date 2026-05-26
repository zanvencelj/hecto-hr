import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type Database,
  employeeProfiles,
  type EmployeeProfile,
  type NewEmployeeProfile,
  users,
  type User,
  organizations,
  type Organization,
  notDeleted,
} from '@hecto/database';

export interface EmployeeWithProfile extends User {
  profile: EmployeeProfile | null;
}

@Injectable()
export class EmployeesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAllInOrg(organizationId: string, search?: string): Promise<EmployeeWithProfile[]> {
    const rows = await this.db
      .select()
      .from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(
        and(
          eq(users.organizationId, organizationId),
          notDeleted(users.deletedAt),
          search
            ? or(
                ilike(users.firstName, `%${search}%`),
                ilike(users.lastName, `%${search}%`),
                ilike(users.email, `%${search}%`),
              )
            : undefined,
        ),
      );

    return rows.map((r) => ({ ...r.users, profile: r.employee_profiles }));
  }

  async findByIdInOrg(id: string, organizationId: string): Promise<EmployeeWithProfile | null> {
    const rows = await this.db
      .select()
      .from(users)
      .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
      .where(
        and(
          eq(users.id, id),
          eq(users.organizationId, organizationId),
          notDeleted(users.deletedAt),
        ),
      )
      .limit(1);

    if (!rows[0]) return null;
    return { ...rows[0].users, profile: rows[0].employee_profiles };
  }

  async upsertProfile(data: NewEmployeeProfile): Promise<EmployeeProfile> {
    const result = await this.db
      .insert(employeeProfiles)
      .values(data)
      .onConflictDoUpdate({
        target: employeeProfiles.userId,
        set: {
          position: data.position,
          department: data.department,
          phone: data.phone,
          hireDate: data.hireDate,
          emergencyContact: data.emergencyContact,
          notes: data.notes,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0]!;
  }

  async findOrg(organizationId: string): Promise<Organization | null> {
    const result = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return result[0] ?? null;
  }

  async updateProfile(
    userId: string,
    data: Partial<Omit<EmployeeProfile, 'id' | 'userId' | 'organizationId' | 'createdAt'>>,
  ): Promise<void> {
    await this.db
      .update(employeeProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeProfiles.userId, userId));
  }
}
