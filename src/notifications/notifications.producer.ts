import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsProducer {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  async notifyNewComment(
    postAuthorId: number,
    postId: number,
    commentContent: string,
  ) {
    await this.queue.add(
      'new-comment',
      {
        postAuthorId,
        postId,
        commentPreview: commentContent.substring(0, 100),
      },
      {
        attempts: 3, // réessayer jusqu'à 3 fois en cas d'échec
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
  async notifyWelcome(userId: number, userName: string, userEmail: string) {
    await this.queue.add(
      'welcome',
      {
        userId,
        userName,
        userEmail,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }
}
