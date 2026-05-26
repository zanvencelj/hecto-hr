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
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { AccessTokenPayload, ShiftPublic, ShiftBreakPublic } from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftBreakDto } from './dto/create-shift-break.dto';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.CREATED)
  createShift(
    @Body() dto: CreateShiftDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ShiftPublic> {
    return this.shiftsService.createShift(dto, user);
  }

  @Get('org')
  @Roles('admin', 'hr', 'manager')
  getOrgShifts(
    @CurrentUser() user: AccessTokenPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<ShiftPublic[]> {
    return this.shiftsService.getShiftsForOrg(user, from, to);
  }

  @Get('employee/:userId')
  getEmployeeShifts(
    @Param('userId') userId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<ShiftPublic[]> {
    return this.shiftsService.getShiftsForEmployee(userId, user, from, to);
  }

  @Patch(':id')
  @Roles('admin', 'hr', 'manager')
  updateShift(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ShiftPublic> {
    return this.shiftsService.updateShift(id, dto, user);
  }

  @Delete('user/:userId')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUserShifts(
    @Param('userId') userId: string,
    @Query('future', new DefaultValuePipe(false), ParseBoolPipe) future: boolean,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.shiftsService.deleteUserShifts(userId, user, future);
  }

  @Delete(':id')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteShift(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.shiftsService.deleteShift(id, user);
  }

  @Post(':id/breaks')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.CREATED)
  addBreak(
    @Param('id') shiftId: string,
    @Body() dto: CreateShiftBreakDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ShiftBreakPublic> {
    return this.shiftsService.addBreak(shiftId, dto, user);
  }

  @Delete(':id/breaks/:breakId')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBreak(
    @Param('id') shiftId: string,
    @Param('breakId') breakId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.shiftsService.deleteBreak(shiftId, breakId, user);
  }
}
