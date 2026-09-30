import * as nodemailer from 'nodemailer';

export class EmailSender {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  private readonly from =
    process.env.SMTP_FROM ?? 'LOOP AMBIENTAL <no-reply@loopambiental.com>';

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!to) return;
    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
