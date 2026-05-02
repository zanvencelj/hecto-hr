import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { TASKS_QUEUE, JOB_NAMES, type SendWelcomeEmailData, type SendVerificationEmailData, type SendPasswordResetEmailData } from './queue.constants';

@Injectable()
export class TasksQueueService {
  private readonly logger = new Logger(TasksQueueService.name);

  constructor(@InjectQueue(TASKS_QUEUE) private readonly queue: Queue) {}

  async sendWelcomeEmail(email: string, firstName: string | null): Promise<void> {
    const data: SendWelcomeEmailData = { email, firstName };
    await this.queue.add(JOB_NAMES.SEND_WELCOME_EMAIL, data);
    this.logger.log(`Enqueued welcome email → ${email}`);
  }

  async sendVerificationEmail(email: string, code: string, firstName: string | null): Promise<void> {
    const data: SendVerificationEmailData = { email, code, firstName };
    await this.queue.add(JOB_NAMES.SEND_VERIFICATION_EMAIL, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log(`Enqueued verification email → ${email}`);
  }

  async sendPasswordResetEmail(email: string, resetLink: string, firstName: string | null): Promise<void> {
    const data: SendPasswordResetEmailData = { email, resetLink, firstName };
    await this.queue.add(JOB_NAMES.SEND_PASSWORD_RESET_EMAIL, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log(`Enqueued password reset email → ${email}`);
  }
}
