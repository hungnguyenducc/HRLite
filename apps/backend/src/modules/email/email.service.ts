import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import logger from '../../common/logger';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor(private configService: ConfigService) {
    const isDev = this.configService.get('NODE_ENV') !== 'production';
    this.fromAddress = this.configService.get('SMTP_FROM') || 'noreply@hrlite.local';

    if (isDev) {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST'),
        port: Number(this.configService.get('SMTP_PORT') || 587),
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });
    }
  }

  async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const result = await this.transporter.sendMail({
        from: this.fromAddress,
        ...options,
      });
      if (this.configService.get('NODE_ENV') !== 'production') {
        logger.debug('[Email] Dev mode - email logged', { to: options.to, subject: options.subject });
      }
    } catch (error) {
      logger.error('[Email] Failed to send email', {
        to: options.to,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  sendLeaveApprovedEmail(data: {
    employeeEmail: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    approverName: string;
  }): void {
    const html = `<p>Xin chào ${data.employeeName},</p><p>Yêu cầu nghỉ phép <strong>${data.leaveType}</strong> từ ${data.startDate} đến ${data.endDate} (${data.days} ngày) đã được <strong>${data.approverName}</strong> phê duyệt.</p>`;
    this.sendEmail({
      to: data.employeeEmail,
      subject: `[HRLite] Yêu cầu nghỉ phép đã được duyệt — ${data.leaveType}`,
      html,
    }).catch(() => {});
  }

  sendLeaveRejectedEmail(data: {
    employeeEmail: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    approverName: string;
    reason?: string;
  }): void {
    const reasonText = data.reason ? `<p>Lý do: ${data.reason}</p>` : '';
    const html = `<p>Xin chào ${data.employeeName},</p><p>Yêu cầu nghỉ phép <strong>${data.leaveType}</strong> từ ${data.startDate} đến ${data.endDate} (${data.days} ngày) đã bị <strong>${data.approverName}</strong> từ chối.</p>${reasonText}`;
    this.sendEmail({
      to: data.employeeEmail,
      subject: `[HRLite] Yêu cầu nghỉ phép bị từ chối — ${data.leaveType}`,
      html,
    }).catch(() => {});
  }
}
