import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendWelcomeEmail(name: string, email: string) {
    await this.transporter.sendMail({
      from: '"Agora" <noreply@agora.com>',
      to: email,
      subject: `Bienvenue sur Agora, ${name} !`,
      html: `
        <h1>Bonjour ${name} !</h1>
        <p>Votre compte Agora a été créé avec succès.</p>
        <p>Vous pouvez dès maintenant publier vos premiers posts.</p>
        <p>À bientôt sur Agora !</p>
      `,
    });
    this.logger.log(`Email de bienvenue envoyé à ${email}`);
  }
}
