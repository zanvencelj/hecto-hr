import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { WorkEvent, EventChangeRequest } from '@hecto/database';
import type {
  WorkEventPublic,
  EventChangeRequestPublic,
  ChangeRequestType,
} from '@hecto/shared-types';
import { EventsRepository } from './events.repository';
import { ChangeRequestsRepository } from './change-requests.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ReviewChangeRequestDto } from './dto/review-change-request.dto';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly changeRequestsRepository: ChangeRequestsRepository,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    dto: CreateEventDto,
  ): Promise<WorkEventPublic> {
    const event = await this.eventsRepository.create({
      userId,
      organizationId,
      type: dto.type,
      notes: dto.notes ?? null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
    });
    return this.toPublic(event);
  }

  async getForEmployee(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<WorkEventPublic[]> {
    const events = await this.eventsRepository.findByUserId(userId, organizationId, from, to);
    return events.map((e) => this.toPublic(e));
  }

  async getForOrganization(
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<WorkEventPublic[]> {
    const events = await this.eventsRepository.findByOrganization(organizationId, from, to);
    return events.map((e) => this.toPublic(e));
  }

  async createChangeRequest(
    userId: string,
    organizationId: string,
    dto: CreateChangeRequestDto,
  ): Promise<EventChangeRequestPublic> {
    if (dto.requestType !== 'add') {
      if (!dto.eventId) throw new BadRequestException('eventId required for edit/delete');
      const event = await this.eventsRepository.findById(dto.eventId);
      if (!event || event.organizationId !== organizationId) throw new NotFoundException('Event not found');
      if (Date.now() - event.occurredAt.getTime() > THIRTY_DAYS_MS) {
        throw new BadRequestException('Cannot request changes for events older than 30 days');
      }
    }
    if (dto.requestType === 'add' || dto.requestType === 'edit') {
      if (!dto.requestedType) throw new BadRequestException('requestedType required for add/edit');
      if (!dto.requestedOccurredAt) throw new BadRequestException('requestedOccurredAt required for add/edit');
      const requestedDate = new Date(dto.requestedOccurredAt);
      if (Date.now() - requestedDate.getTime() > THIRTY_DAYS_MS) {
        throw new BadRequestException('Cannot request events older than 30 days');
      }
    }

    const req = await this.changeRequestsRepository.create({
      userId,
      organizationId,
      requestType: dto.requestType,
      eventId: dto.eventId ?? null,
      requestedType: dto.requestedType ?? null,
      requestedOccurredAt: dto.requestedOccurredAt ? new Date(dto.requestedOccurredAt) : null,
      requestedNotes: dto.requestedNotes ?? null,
      reason: dto.reason ?? null,
    });
    return this.toChangeRequestPublic(req);
  }

  async getChangeRequestsForEmployee(
    userId: string,
    organizationId: string,
  ): Promise<EventChangeRequestPublic[]> {
    const reqs = await this.changeRequestsRepository.findByUserId(userId, organizationId);
    return reqs.map((r) => this.toChangeRequestPublic(r));
  }

  async getChangeRequestsForOrg(
    organizationId: string,
  ): Promise<EventChangeRequestPublic[]> {
    const reqs = await this.changeRequestsRepository.findByOrganization(organizationId);
    return reqs.map((r) => this.toChangeRequestPublic(r));
  }

  async reviewChangeRequest(
    id: string,
    organizationId: string,
    reviewerUserId: string,
    dto: ReviewChangeRequestDto,
  ): Promise<EventChangeRequestPublic> {
    const req = await this.changeRequestsRepository.findById(id);
    if (!req || req.organizationId !== organizationId) throw new NotFoundException('Change request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request already reviewed');

    const updated = await this.changeRequestsRepository.update(id, {
      status: dto.status,
      reviewedByUserId: reviewerUserId,
      reviewedAt: new Date(),
      reviewNotes: dto.reviewNotes ?? null,
    });

    if (dto.status === 'approved') {
      await this.applyChangeRequest(req);
    }

    return this.toChangeRequestPublic(updated);
  }

  private async applyChangeRequest(req: EventChangeRequest): Promise<void> {
    const type = req.requestType as ChangeRequestType;
    if (type === 'add') {
      await this.eventsRepository.create({
        userId: req.userId,
        organizationId: req.organizationId,
        type: req.requestedType!,
        notes: req.requestedNotes ?? null,
        occurredAt: req.requestedOccurredAt!,
      });
    } else if (type === 'edit' && req.eventId) {
      await this.eventsRepository.update(req.eventId, {
        type: req.requestedType!,
        occurredAt: req.requestedOccurredAt!,
        notes: req.requestedNotes ?? null,
      });
    } else if (type === 'delete' && req.eventId) {
      await this.eventsRepository.delete(req.eventId);
    }
  }

  private toPublic(event: WorkEvent): WorkEventPublic {
    return {
      id: event.id,
      userId: event.userId,
      organizationId: event.organizationId,
      type: event.type,
      notes: event.notes ?? null,
      occurredAt: event.occurredAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
    };
  }

  private toChangeRequestPublic(req: EventChangeRequest): EventChangeRequestPublic {
    return {
      id: req.id,
      userId: req.userId,
      organizationId: req.organizationId,
      requestType: req.requestType,
      eventId: req.eventId ?? null,
      requestedType: req.requestedType ?? null,
      requestedOccurredAt: req.requestedOccurredAt?.toISOString() ?? null,
      requestedNotes: req.requestedNotes ?? null,
      reason: req.reason ?? null,
      status: req.status,
      reviewedByUserId: req.reviewedByUserId ?? null,
      reviewedAt: req.reviewedAt?.toISOString() ?? null,
      reviewNotes: req.reviewNotes ?? null,
      createdAt: req.createdAt.toISOString(),
    };
  }
}
