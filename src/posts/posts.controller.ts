import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ParseSortOrderPipe } from 'src/common/pipes/parse-sort-order-pipe';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les posts avec pagination' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('authorId', new ParseIntPipe({ optional: true })) authorId?: number,
    @Query('topic') topic?: string,
    @Query('order', new DefaultValuePipe('desc'), new ParseSortOrderPipe())
    order?: 'asc' | 'desc',
  ) {
    return this.postsService.findAll(paginationDto, { authorId, topic, order });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un post par ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un post' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: { id: number }) {
    return this.postsService.create(dto, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un post' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.postsService.remove(id, user.id);
  }
}
