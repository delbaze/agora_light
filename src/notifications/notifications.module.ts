import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProducer } from './notifications.producer';
import { NotificationsConsumer } from './notifications.consumer';
import { MailService } from './mail.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationsProducer, NotificationsConsumer, MailService],
  exports: [NotificationsProducer],
})
export class NotificationsModule {}
