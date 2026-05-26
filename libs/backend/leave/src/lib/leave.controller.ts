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
import type {
  AccessTokenPayload,
  LeaveTypePublic,
  LeaveBalancePublic,
  LeaveRequestPublic,
} from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { SetLeaveBalanceDto } from './dto/set-leave-balance.dto';
import { EditRequestDaysDto } from './dto/edit-request-days.dto';

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('types')
  getLeaveTypes(@CurrentUser() user: AccessTokenPayload): Promise<LeaveTypePublic[]> {
    return this.leaveService.getLeaveTypes(user.organizationId);
  }

  @Get('balances/org')
  @Roles('admin', 'hr', 'manager')
  getAllBalances(
    @CurrentUser() user: AccessTokenPayload,
    @Query('year') year: string,
  ): Promise<LeaveBalancePublic[]> {
    return this.leaveService.getAllBalancesForOrg(parseInt(year) || new Date().getFullYear(), user);
  }

  @Get('balances/employee/:userId')
  getEmployeeBalances(
    @Param('userId') userId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Query('year') year: string,
  ): Promise<LeaveBalancePublic[]> {
    return this.leaveService.getBalancesForEmployee(
      userId,
      parseInt(year) || new Date().getFullYear(),
      user,
    );
  }

  @Post('balances')
  @Roles('admin', 'hr', 'manager')
  setLeaveBalance(
    @Body() dto: SetLeaveBalanceDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeaveBalancePublic> {
    return this.leaveService.setLeaveBalance(dto, user);
  }

  @Get('requests/org')
  @Roles('admin', 'hr', 'manager')
  getOrgRequests(
    @CurrentUser() user: AccessTokenPayload,
    @Query('status') status?: string,
  ): Promise<LeaveRequestPublic[]> {
    return this.leaveService.getLeaveRequestsForOrg(user, status);
  }

  @Get('requests/employee/:userId')
  getEmployeeRequests(
    @Param('userId') userId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeaveRequestPublic[]> {
    return this.leaveService.getLeaveRequestsForEmployee(userId, user);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  createRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeaveRequestPublic> {
    return this.leaveService.createLeaveRequest(dto, user);
  }

  @Patch('requests/:id/review')
  @Roles('admin', 'hr', 'manager')
  reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeaveRequestPublic> {
    return this.leaveService.reviewLeaveRequest(id, dto, user);
  }

  @Patch('requests/:id/days')
  @Roles('admin', 'hr', 'manager')
  editRequestDays(
    @Param('id') id: string,
    @Body() dto: EditRequestDaysDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeaveRequestPublic> {
    return this.leaveService.editRequestDays(id, dto.totalDays, user);
  }

  @Delete('requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelRequest(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.leaveService.cancelLeaveRequest(id, user);
  }
}
