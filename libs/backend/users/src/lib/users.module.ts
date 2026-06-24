import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { PushTokensRepository } from './push-tokens.repository';
import { PushTokensController } from './push-tokens.controller';

@Module({
  imports: [],
  controllers: [PushTokensController],
  providers: [UsersRepository, UsersService, PushTokensRepository],
  exports: [UsersService, PushTokensRepository],
})
export class UsersModule {}
