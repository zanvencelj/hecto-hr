import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { KioskDevice } from '@hecto/database';
import type { Request } from 'express';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): KioskDevice => {
    const request = ctx.switchToHttp().getRequest<Request & { kioskDevice: KioskDevice }>();
    return request.kioskDevice;
  },
);
