import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });
  private readonly from =
    process.env.SMTP_FROM ?? 'LOOP AMBIENTAL <no-reply@loopambiental.com>';
  private readonly publicUrl =
    process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
  async sendEmailVerification(email: string, token: string) {
    return this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Confirme seu e-mail na LOOP AMBIENTAL',
      text: `Confirme seu e-mail: ${this.publicUrl}/verificar-email?token=${token}`,
    });
  }
  async sendPasswordReset(email: string, token: string) {
    return this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Redefina sua senha na LOOP AMBIENTAL',
      text: `Redefina sua senha: ${this.publicUrl}/redefinir-senha?token=${token}`,
    });
  }
}
