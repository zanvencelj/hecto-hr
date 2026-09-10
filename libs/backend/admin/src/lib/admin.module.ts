import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { UsersModule } from '@hecto/users';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminAuditController } from './audit/admin-audit.controller';
import { AdminAuditService } from './audit/admin-audit.service';
import { AdminAuditRepository } from './audit/admin-audit.repository';
import { AdminOrganizationsController } from './organizations/admin-organizations.controller';
import { AdminOrganizationsService } from './organizations/admin-organizations.service';
import { AdminOrganizationsRepository } from './organizations/admin-organizations.repository';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminUsersRepository } from './users/admin-users.repository';
import { AdminInvitationsController } from './invitations/admin-invitations.controller';
import { AdminInvitationsService } from './invitations/admin-invitations.service';
import { AdminInvitationsRepository } from './invitations/admin-invitations.repository';
import { AdminAppLinksController } from './app-links/admin-app-links.controller';
import { PublicAppLinksController } from './app-links/public-app-links.controller';
import { AdminAppLinksService } from './app-links/admin-app-links.service';
import { AdminAppLinksRepository } from './app-links/admin-app-links.repository';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [
    AdminAuthController,
    AdminOrganizationsController,
    AdminUsersController,
    AdminInvitationsController,
    AdminAuditController,
    AdminAppLinksController,
    PublicAppLinksController,
  ],
  providers: [
    AdminAuthService,
    AdminAuditService,
    AdminAuditRepository,
    AdminOrganizationsService,
    AdminOrganizationsRepository,
    AdminUsersService,
    AdminUsersRepository,
    AdminInvitationsService,
    AdminInvitationsRepository,
    AdminAppLinksService,
    AdminAppLinksRepository,
  ],
})
export class AdminModule {}
