// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReconciliationService } from './reconciliation.service';
@Module({
  imports: [NotificationsModule],
  controllers: [PostsController],
  providers: [PostsService, ReconciliationService],
})
export class PostsModule {}
