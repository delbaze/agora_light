// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReconciliationService } from './reconciliation.service';
import { PostsMicroserviceController } from './posts.microservice.controller';
@Module({
  imports: [NotificationsModule],
  controllers: [PostsController, PostsMicroserviceController],
  providers: [PostsService, ReconciliationService],
})
export class PostsModule {}
