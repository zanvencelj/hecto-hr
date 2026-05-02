import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { welcomeEmailHtml } from './templates/welcome.template';
import { verificationCodeEmailHtml } from './templates/verification-code.template';
import { passwordResetEmailHtml } from './templates/password-reset.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.get<string>('SMTP_FROM') ?? 'noreply@hectohr.io';
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST') ?? 'localhost',
      port: config.get<number>('SMTP_PORT') ?? 1025,
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: config.get<string>('SMTP_USER')
        ? {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string | null): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Welcome to HectoHR',
      html: welcomeEmailHtml(firstName),
    });
    this.logger.log(`Welcome email sent → ${email}`);
  }

  async sendVerificationEmail(email: string, code: string, firstName: string | null): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: `${code} is your HectoHR verification code`,
      html: verificationCodeEmailHtml(code, firstName),
    });
    this.logger.log(`Verification email sent → ${email}`);
  }

  async sendPasswordResetEmail(email: string, resetLink: string, firstName: string | null): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Reset your HectoHR password',
      html: passwordResetEmailHtml(resetLink, firstName),
    });
    this.logger.log(`Password reset email sent → ${email}`);
  }
}
