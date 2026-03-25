import transporter from './smtp-transport';
import logger from '@/lib/logger';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, replyTo } = params;
  const toAddresses = Array.isArray(to) ? to.join(', ') : to;
  const fromName = process.env.SMTP_FROM_NAME || 'HRLite';
  const fromEmail = process.env.SMTP_FROM_EMAIL;

  if (!fromEmail) {
    logger.error('[Email] SMTP_FROM_EMAIL chưa được cấu hình');
    return false;
  }

  // Development: chỉ log, không gửi thật
  if (process.env.NODE_ENV === 'development') {
    logger.info('[Email] DEV MODE — không gửi thật', {
      to: toAddresses,
      subject,
    });
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: toAddresses,
      subject,
      html,
      ...(replyTo && { replyTo }),
    });

    logger.info('[Email] Gửi thành công', {
      messageId: info.messageId,
      to: toAddresses,
      subject,
    });
    return true;
  } catch (error) {
    logger.error('[Email] Gửi thất bại', {
      to: toAddresses,
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
