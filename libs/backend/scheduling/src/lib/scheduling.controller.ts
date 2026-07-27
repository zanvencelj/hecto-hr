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
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type {
  AccessTokenPayload,
  PublishResultPublic,
  ScheduleDraftPublic,
  SchedulingSettingsPublic,
  ShiftCandidatePublic,
  StaffingTemplatePublic,
} from '@hecto/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@hecto/auth';
import { SchedulingService } from './scheduling.service';
import { UpdateSchedulingSettingsDto } from './dto/update-scheduling-settings.dto';
import { CreateStaffingTemplateDto } from './dto/create-staffing-template.dto';
import { UpdateStaffingTemplateDto } from './dto/update-staffing-template.dto';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { UpdateDraftAssignmentDto } from './dto/update-draft-assignment.dto';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ── settings ──────────────────────────────────────────────────────────────

  @Get('settings')
  @Roles('admin', 'hr', 'manager')
  getSettings(@CurrentUser() user: AccessTokenPayload): Promise<SchedulingSettingsPublic> {
    return this.schedulingService.getSettings(user);
  }

  @Put('settings')
  @Roles('admin', 'hr')
  updateSettings(
    @Body() dto: UpdateSchedulingSettingsDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<SchedulingSettingsPublic> {
    return this.schedulingService.updateSettings(dto, user);
  }

  // ── staffing templates ────────────────────────────────────────────────────

  @Get('templates')
  @Roles('admin', 'hr', 'manager')
  getTemplates(@CurrentUser() user: AccessTokenPayload): Promise<StaffingTemplatePublic[]> {
    return this.schedulingService.getTemplates(user);
  }

  @Post('templates')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.CREATED)
  createTemplate(
    @Body() dto: CreateStaffingTemplateDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<StaffingTemplatePublic> {
    return this.schedulingService.createTemplate(dto, user);
  }

  @Patch('templates/:id')
  @Roles('admin', 'hr', 'manager')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateStaffingTemplateDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<StaffingTemplatePublic> {
    return this.schedulingService.updateTemplate(id, dto, user);
  }

  @Delete('templates/:id')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.schedulingService.deleteTemplate(id, user);
  }

  // ── drafts ────────────────────────────────────────────────────────────────

  @Get('draft')
  @Roles('admin', 'hr', 'manager')
  async getActiveDraft(
    @CurrentUser() user: AccessTokenPayload,
    @Res() res: Response,
  ): Promise<void> {
    const draft = await this.schedulingService.getActiveDraft(user);
    res.json(draft);
  }

  @Post('drafts')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.CREATED)
  generateDraft(
    @Body() dto: GenerateDraftDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ScheduleDraftPublic> {
    return this.schedulingService.generateDraft(dto, user);
  }

  @Patch('draft/assignments/:id')
  @Roles('admin', 'hr', 'manager')
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateDraftAssignmentDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ScheduleDraftPublic> {
    return this.schedulingService.updateAssignment(id, dto, user);
  }

  @Post('draft/approve')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.OK)
  approveDraft(@CurrentUser() user: AccessTokenPayload): Promise<PublishResultPublic> {
    return this.schedulingService.approveDraft(user);
  }

  @Delete('draft')
  @Roles('admin', 'hr', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  discardDraft(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.schedulingService.discardDraft(user);
  }

  @Get('draft/candidates/:shiftId')
  @Roles('admin', 'hr', 'manager')
  getShiftCandidates(
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ShiftCandidatePublic[]> {
    return this.schedulingService.getShiftCandidates(shiftId, user);
  }
}
