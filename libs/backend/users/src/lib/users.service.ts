import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { UserPublic, UserRole } from '@hecto/shared-types';
import type { User } from '@hecto/database';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';

export interface CreateFromVerifiedEmailData {
  email: string;
  passwordHash: string;
  organizationId: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserPublic> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.usersRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      username: dto.username ?? null,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
    });

    return this.toPublic(user);
  }

  async findByEmail(email: string): Promise<UserPublic | null> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    return user ? this.toPublic(user) : null;
  }

  async createFromVerifiedEmail(data: CreateFromVerifiedEmailData): Promise<UserPublic> {
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already registered');

    const user = await this.usersRepository.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      organizationId: data.organizationId,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    return this.toPublic(user);
  }

  async findById(id: string): Promise<UserPublic> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toPublic(user);
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (!user || !user.isActive) return null;

    const valid = await argon2.verify(user.passwordHash, password);
    return valid ? user : null;
  }

  async updateLastLogin(id: string): Promise<void> {
    return this.usersRepository.updateLastLogin(id);
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    await this.usersRepository.update(id, { passwordHash: newPasswordHash });
  }

  toPublic(user: User): UserPublic {
    return {
      id: user.id,
      organizationId: user.organizationId ?? null,
      email: user.email,
      username: user.username ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      role: user.role,
      isActive: user.isActive,
      dateJoined: user.dateJoined.toISOString(),
      lastLogin: user.lastLogin?.toISOString() ?? null,
    };
  }
}
