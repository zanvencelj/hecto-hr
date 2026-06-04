import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { AccessTokenPayload } from '@hecto/shared-types';
import { JwtAuthGuard, CurrentUser } from '@hecto/auth';
import { PushTokensRepository } from './push-tokens.repository';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('users/push-tokens')
@UseGuards(JwtAuthGuard)
export class PushTokensController {
  constructor(private readonly pushTokensRepo: PushTokensRepository) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(
    @Body() dto: RegisterPushTokenDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    await this.pushTokensRepo.upsert(user.sub, dto.token);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(
    @Body() dto: RegisterPushTokenDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    await this.pushTokensRepo.delete(user.sub, dto.token);
  }
}
