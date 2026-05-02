import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database, users, type User, type NewUser } from '@hecto/database';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db.insert(users).values(data).returning();
    return result[0]!;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'dateJoined'>>): Promise<User> {
    const result = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0]!;
  }
}
