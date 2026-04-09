import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProducer } from './notifications.producer';
import { NotificationsConsumer } from './notifications.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationsProducer, NotificationsConsumer],
  exports: [NotificationsProducer],
})
export class NotificationsModule {}
