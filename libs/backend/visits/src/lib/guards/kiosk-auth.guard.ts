import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';
import type { KioskDevice } from '@hecto/database';
import { KioskDevicesRepository } from '../kiosk-devices.repository';

/**
 * Authenticates kiosk tablets via a long-lived device token issued at pairing.
 * The token only grants access to kiosk endpoints — it is not a user session.
 */
@Injectable()
export class KioskAuthGuard implements CanActivate {
  constructor(private readonly kioskDevicesRepository: KioskDevicesRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { kioskDevice?: KioskDevice }>();

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('No device token provided');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const device = await this.kioskDevicesRepository.findActiveByTokenHash(tokenHash);
    if (!device) {
      throw new UnauthorizedException('Invalid or revoked device token');
    }

    request.kioskDevice = device;
    void this.kioskDevicesRepository.touchLastSeen(device.id);
    return true;
  }
}
