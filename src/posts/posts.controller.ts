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
  UseInterceptors,
  BadRequestException,
  Version,
  Res,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseSortOrderPipe } from '../common/pipes/parse-sort-order-pipe';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadedFiles } from '@nestjs/common';
import { multerConfig } from '../common/config/multer.config';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { Parser } from 'json2csv';
import { Throttle } from '@nestjs/throttler';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 secondes spécifiquement pour cette route
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
  @Get('populars')
  // ici c'est manuel depuis le service
  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(30000) // 30 secondes spécifiquement pour cette route
  @ApiOperation({ summary: 'Lister les posts populaires' })
  findPopulars() {
    return this.postsService.findPopulars();
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Exporter les posts en CSV' })
  async exportCsv(@Res() res: Response) {
    const posts = await this.postsService.findAllForExport();
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Titre', value: 'title' },
      { label: 'Auteur', value: 'author.name' },
      { label: 'Topic', value: 'topic' },
      { label: 'Commentaires', value: '_count.comments' },
      { label: 'Date de création', value: 'createdAt' },
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(posts);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="posts.csv"');
    res.send('\uFEFF' + csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un post par ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ short: { ttl: 10000, limit: 1 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un post' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: { id: number }) {
    return this.postsService.create(dto, user.id);
  }

  @Post()
  @Version('2')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 5, multerConfig))
  @ApiOperation({ summary: 'Créer un post avec fichiers optionnels' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        topic: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title', 'content'],
    },
  })
  async createv2(
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: { id: number },
  ) {
    return await this.postsService.createWithAttachments(
      dto,
      user.id,
      files ?? [],
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles()
  @ApiOperation({ summary: 'Supprimer un post' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: Role },
  ) {
    return this.postsService.remove(id, user.id, user.role);
  }

  @Post(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 5, multerConfig))
  @ApiOperation({
    summary: 'Ajouter des fichiers à un post — 5 max, 5MB chacun',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  uploadAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: { id: number },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.postsService.addAttachments(id, user.id, files);
  }
}
