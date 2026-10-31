import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

/** Test hook: the last messages sent (only populated in NODE_ENV=test). */
export const sentMail: Mail[] = [];

export async function sendMail(mail: Mail): Promise<void> {
  if (env.NODE_ENV === 'test') {
    sentMail.push(mail);
    return;
  }
  if (!transport) {
    // No SMTP configured: development fallback prints the message (including links) to the API log.
    logger.info('mail (SMTP not configured — not delivered)', {
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    return;
  }
  await transport.sendMail({ from: env.MAIL_FROM, ...mail });
}
