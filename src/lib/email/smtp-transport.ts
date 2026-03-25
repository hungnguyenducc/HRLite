import nodemailer from 'nodemailer';
import logger from '@/lib/logger';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host || !user || !pass) {
  logger.warn('[SMTP] SMTP_HOST, SMTP_USER hoặc SMTP_PASS chưa được cấu hình. Email sẽ không gửi được.');
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user && pass ? { user, pass } : undefined,
});

export default transporter;
