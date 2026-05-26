import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AccessTokenPayload, EmployeePublic, InvitationPublic } from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, Public } from '@hecto/auth';
import { EmployeesService } from './employees.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('admin', 'hr', 'manager')
  listEmployees(
    @CurrentUser() user: AccessTokenPayload,
    @Query('search') search?: string,
  ): Promise<EmployeePublic[]> {
    return this.employeesService.listEmployees(user.organizationId, search);
  }

  @Get('me')
  getOwnProfile(@CurrentUser() user: AccessTokenPayload): Promise<EmployeePublic> {
    return this.employeesService.getOwnProfile(user);
  }

  @Get('invitations')
  @Roles('admin', 'hr', 'manager')
  listInvitations(@CurrentUser() user: AccessTokenPayload): Promise<InvitationPublic[]> {
    return this.employeesService.listInvitations(user.organizationId);
  }

  @Post('invite')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.CREATED)
  inviteEmployee(
    @Body() dto: InviteEmployeeDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<InvitationPublic> {
    return this.employeesService.inviteEmployee(dto, user);
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<void> {
    await this.employeesService.acceptInvitation(dto.token, dto.password);
  }

  @Delete('invitations/:id')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelInvitation(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.employeesService.cancelInvitation(id, user.organizationId);
  }

  @Get(':id')
  @Roles('admin', 'hr', 'manager')
  getEmployee(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EmployeePublic> {
    return this.employeesService.getEmployee(id, user.organizationId);
  }

  @Patch(':id')
  @Roles('admin', 'hr', 'manager')
  updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EmployeePublic> {
    return this.employeesService.updateEmployee(id, user.organizationId, dto);
  }
}
