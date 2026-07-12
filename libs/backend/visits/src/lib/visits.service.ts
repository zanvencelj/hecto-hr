import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import type {
  KioskDevicePublic,
  KioskOpenVisit,
  KioskPairResponse,
  KioskPairingCodeResponse,
  VisitPublic,
  VisitSignatureUrlResponse,
} from '@hecto/shared-types';
import type { KioskDevice, Visit } from '@hecto/database';
import { StorageService } from '@hecto/storage';
import { KioskDevicesRepository } from './kiosk-devices.repository';
import { VisitsRepository } from './visits.repository';
import type { CreateVisitDto } from './dto/create-visit.dto';

const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class VisitsService {
  constructor(
    private readonly visitsRepository: VisitsRepository,
    private readonly kioskDevicesRepository: KioskDevicesRepository,
    private readonly storageService: StorageService,
  ) {}

  // ── Device pairing ────────────────────────────────────────────────

  async createPairingCode(
    organizationId: string,
    userId: string,
    deviceName: string,
  ): Promise<KioskPairingCodeResponse> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    await this.kioskDevicesRepository.createPairingCode({
      organizationId,
      codeHash: sha256(code),
      deviceName,
      createdByUserId: userId,
      expiresAt,
    });

    return { code, expiresAt: expiresAt.toISOString() };
  }

  async pairDevice(code: string): Promise<KioskPairResponse> {
    const pairingCode = await this.kioskDevicesRepository.findValidPairingCode(sha256(code));
    if (!pairingCode) {
      throw new UnauthorizedException('Invalid or expired pairing code');
    }

    await this.kioskDevicesRepository.markPairingCodeUsed(pairingCode.id);

    const deviceToken = randomBytes(32).toString('hex');
    const device = await this.kioskDevicesRepository.createDevice({
      organizationId: pairingCode.organizationId,
      name: pairingCode.deviceName,
      tokenHash: sha256(deviceToken),
      pairedByUserId: pairingCode.createdByUserId,
    });

    const organizationName =
      (await this.kioskDevicesRepository.getOrganizationName(device.organizationId)) ?? '';

    return {
      deviceToken,
      device: { id: device.id, name: device.name, organizationName },
    };
  }

  async listDevices(organizationId: string): Promise<KioskDevicePublic[]> {
    const devices = await this.kioskDevicesRepository.listByOrg(organizationId);
    return devices.map(toDevicePublic);
  }

  async renameDevice(
    id: string,
    organizationId: string,
    name: string,
  ): Promise<KioskDevicePublic> {
    const device = await this.kioskDevicesRepository.findByIdInOrg(id, organizationId);
    if (!device) throw new NotFoundException('Device not found');

    const updated = await this.kioskDevicesRepository.rename(id, name);
    return toDevicePublic(updated!);
  }

  async revokeDevice(id: string, organizationId: string): Promise<KioskDevicePublic> {
    const device = await this.kioskDevicesRepository.findByIdInOrg(id, organizationId);
    if (!device) throw new NotFoundException('Device not found');
    if (device.revokedAt) return toDevicePublic(device);

    const revoked = await this.kioskDevicesRepository.revoke(id);
    return toDevicePublic(revoked ?? device);
  }

  // ── Kiosk visit flow ──────────────────────────────────────────────

  async signInVisitor(device: KioskDevice, dto: CreateVisitDto): Promise<KioskOpenVisit> {
    const signaturePng = this.decodeSignature(dto.signature);

    const visitId = randomUUID();
    const signatureKey = `visits/${device.organizationId}/${visitId}.png`;
    await this.storageService.upload(signatureKey, signaturePng, 'image/png');

    try {
      const visit = await this.visitsRepository.create({
        id: visitId,
        organizationId: device.organizationId,
        deviceId: device.id,
        name: dto.name.trim(),
        purpose: dto.purpose.trim(),
        signatureKey,
      });
      return toKioskOpenVisit(visit);
    } catch (error) {
      await this.storageService.delete(signatureKey).catch(() => undefined);
      throw error;
    }
  }

  async getOpenVisitsForKiosk(organizationId: string): Promise<KioskOpenVisit[]> {
    const open = await this.visitsRepository.findOpenByOrg(organizationId);
    return open.map(toKioskOpenVisit);
  }

  async signOutVisitor(device: KioskDevice, visitId: string): Promise<KioskOpenVisit> {
    const visit = await this.visitsRepository.findByIdInOrg(visitId, device.organizationId);
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.signedOutAt) throw new BadRequestException('Visitor is already signed out');

    const updated = await this.visitsRepository.signOut(visitId);
    return toKioskOpenVisit(updated ?? visit);
  }

  // ── Manager view ──────────────────────────────────────────────────

  async getOpenVisits(organizationId: string): Promise<VisitPublic[]> {
    const open = await this.visitsRepository.findOpenByOrg(organizationId);
    return open.map(toVisitPublic);
  }

  async getVisits(organizationId: string, from?: string, to?: string): Promise<VisitPublic[]> {
    const visits = await this.visitsRepository.findByOrg(
      organizationId,
      parseDateParam(from, 'from'),
      parseDateParam(to, 'to'),
    );
    return visits.map(toVisitPublic);
  }

  async getSignatureUrl(
    visitId: string,
    organizationId: string,
  ): Promise<VisitSignatureUrlResponse> {
    const visit = await this.visitsRepository.findByIdInOrg(visitId, organizationId);
    if (!visit) throw new NotFoundException('Visit not found');

    const url = await this.storageService.getSignedDownloadUrl(visit.signatureKey);
    return { url };
  }

  async signOutVisitorManually(visitId: string, organizationId: string): Promise<VisitPublic> {
    const visit = await this.visitsRepository.findByIdInOrg(visitId, organizationId);
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.signedOutAt) throw new BadRequestException('Visitor is already signed out');

    const updated = await this.visitsRepository.signOut(visitId);
    return toVisitPublic({ ...(updated ?? visit), deviceName: null });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private decodeSignature(signature: string): Buffer {
    const base64 = signature.replace(/^data:image\/png;base64,/, '');
    let decoded: Buffer;
    try {
      decoded = Buffer.from(base64, 'base64');
    } catch {
      throw new BadRequestException('Signature is not valid base64');
    }

    if (decoded.length === 0 || !decoded.subarray(0, 4).equals(PNG_MAGIC)) {
      throw new BadRequestException('Signature must be a PNG image');
    }
    if (decoded.length > MAX_SIGNATURE_BYTES) {
      throw new BadRequestException('Signature image is too large');
    }
    return decoded;
  }
}

function toDevicePublic(device: KioskDevice): KioskDevicePublic {
  return {
    id: device.id,
    organizationId: device.organizationId,
    name: device.name,
    pairedByUserId: device.pairedByUserId,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    revokedAt: device.revokedAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
  };
}

function toKioskOpenVisit(visit: Visit): KioskOpenVisit {
  return {
    id: visit.id,
    name: visit.name,
    signedInAt: visit.signedInAt.toISOString(),
  };
}

function toVisitPublic(visit: Visit & { deviceName?: string | null }): VisitPublic {
  return {
    id: visit.id,
    organizationId: visit.organizationId,
    deviceId: visit.deviceId,
    deviceName: visit.deviceName ?? null,
    name: visit.name,
    purpose: visit.purpose,
    signedInAt: visit.signedInAt.toISOString(),
    signedOutAt: visit.signedOutAt?.toISOString() ?? null,
    autoClosed: visit.autoClosedAt !== null,
  };
}

function parseDateParam(value: string | undefined, label: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${label} date`);
  }
  return date;
}
