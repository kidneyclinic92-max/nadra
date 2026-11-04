import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  // Gmail shows app passwords in groups of four; the spaces are not part of it.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set to send email.");
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  await getTransporter().sendMail({ from, ...message });
}
