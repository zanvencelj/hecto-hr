import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MailService } from '@hecto/mail';
import { TASKS_QUEUE, JOB_NAMES, type SendWelcomeEmailData, type SendVerificationEmailData, type SendPasswordResetEmailData, type SendInvitationEmailData } from '../queue.constants';

@Processor(TASKS_QUEUE, { concurrency: 5 })
export class TasksProcessor extends WorkerHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.SEND_WELCOME_EMAIL: {
        const data = job.data as SendWelcomeEmailData;
        await this.mailService.sendWelcomeEmail(data.email, data.firstName);
        break;
      }
      case JOB_NAMES.SEND_VERIFICATION_EMAIL: {
        const data = job.data as SendVerificationEmailData;
        await this.mailService.sendVerificationEmail(data.email, data.code, data.firstName);
        break;
      }
      case JOB_NAMES.SEND_PASSWORD_RESET_EMAIL: {
        const data = job.data as SendPasswordResetEmailData;
        await this.mailService.sendPasswordResetEmail(data.email, data.resetLink, data.firstName);
        break;
      }
      case JOB_NAMES.SEND_INVITATION_EMAIL: {
        const data = job.data as SendInvitationEmailData;
        await this.mailService.sendInvitationEmail(
          data.email,
          data.firstName,
          data.inviteLink,
          data.organizationName,
          data.inviterName,
        );
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.error(`Job ${job.id ?? 'unknown'} (${job.name}) failed after ${job.attemptsMade} attempts: ${err.message}`, err.stack);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.debug(`Job ${job.id ?? 'unknown'} (${job.name}) completed`);
  }
}
