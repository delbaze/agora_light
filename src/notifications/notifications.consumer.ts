import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

@Processor('notifications')
export class NotificationsConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationsConsumer.name);
  constructor(private mailService: MailService) {
    super();
  }
  async process(job: Job): Promise<any> {
    this.logger.log(`Traitement de la tâche ${job.name} - ID: ${job.id}`);
    // job locking
    // job.id, job.name (new-comment), job.data {postAuthorId, postId, commentPreview}, job.attemptsMade (nombre de tentatives qui ont déjà eu lieu)
    switch (job.name) {
      case 'new-comment':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.handleNewComment(job.data);
        break;
      case 'welcome':
        await this.handleWelcome(job.data);
        break;
      default:
        this.logger.warn(`Tâche inconnue: ${job.name}`);
    }
  }

  private async handleNewComment(data: {
    postAuthorId: number;
    postId: number;
    commentPreview: string;
  }) {
    this.logger.log(
      `Notification envoyée à l'utilisateur ${data.postAuthorId} pour un commentaire sur le post ${data.postId}`,
    );
    //simulation d'un travail asynchrone (envoi de mail à faire ici par exemple)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async handleWelcome(data: {
    userId: number;
    userName: string;
    userEmail: string;
  }) {
    // En production : appel à un service d'email (SendGrid, Mailgun, etc.)
    this.logger.log(
      `Email de bienvenue envoyé à ${data.userName} (${data.userEmail})`,
    );
    // await new Promise((resolve) => setTimeout(resolve, 100));
    await this.mailService.sendWelcomeEmail(data.userName, data.userEmail);
  }
}
