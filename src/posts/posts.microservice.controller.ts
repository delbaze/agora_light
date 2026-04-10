import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PostsService } from './posts.service';
import { PaginationDto } from '../common/dto/pagination.dto';

//@MessagePattern('posts.findOne') // on répond à un pattern de message
// @Get(':id') // réponse à une route

@Controller()
export class PostsMicroserviceController {
  private readonly logger = new Logger(PostsMicroserviceController.name);

  constructor(private postsService: PostsService) {}
  @MessagePattern('posts.findOne')
  async findOne(@Payload() data: { id: number }) {
    this.logger.debug(
      `[MicroService] Réception de posts.findOne - ID: ${data.id}`,
    );
    return this.postsService.findOne(data.id);
  }

  @MessagePattern('posts.findAll')
  async findAll(
    @Payload() data: { page?: number; limit?: number; topic?: string },
  ) {
    this.logger.debug(`[MicroService] Réception de posts.findAll `);
    const paginationDto: PaginationDto = {
      page: data.page ?? 1,
      limit: data.limit ?? 10,
    };

    return this.postsService.findAll(paginationDto, { topic: data.topic });
  }
}
