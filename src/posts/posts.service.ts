// src/posts/posts.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePostDto } from './dto/create-post.dto';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationsProducer } from '../notifications/notifications.producer';
import { unlink } from 'fs/promises';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private cacheKey = 'posts:populars';

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private notificationsProducer: NotificationsProducer,
  ) {}

  async findPopulars() {
    const cached = await this.cache.get<Post[]>(this.cacheKey); // ici je récupère, s'il y en a, les posts populaires en cache
    if (cached) {
      this.logger.debug('Post populaires servis depuis le cache');
      return cached;
    }

    const posts = await this.prisma.post.findMany({
      where: { published: true },
      orderBy: { comments: { _count: 'desc' } },
      take: 30,
      include: { author: { select: { id: true, name: true } } },
    });
    await this.cache.set(this.cacheKey, posts, 300000);
    return posts;
  }

  async findAll(
    paginationDto: PaginationDto,
    filters: {
      authorId?: number;
      topic?: string;
      order?: 'asc' | 'desc';
    } = {},
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      published: true,
      ...(filters.authorId && { authorId: filters.authorId }),
      ...(filters.topic && { topic: filters.topic }),
    };

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: filters.order! },
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post ${id} introuvable`);
    }

    return post;
  }

  async create(dto: CreatePostDto, authorId: number) {
    const post = await this.prisma.post.create({
      data: { ...dto, authorId },
      include: {
        author: { select: { id: true, name: true } },
      },
    });
    await this.cache.del(this.cacheKey);

    await this.notificationsProducer.notifyNewComment(
      authorId,
      post.id,
      `Votre post ${post.title} a été publié`,
    );

    return post;
  }

  async remove(id: number, requesterId: number) {
    const post = await this.findOne(id);
    if (post.authorId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce post');
    }
    return this.prisma.post.delete({ where: { id } });
  }

  async findAllForExport() {
    return this.prisma.post.findMany({
      where: { published: true },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createAttachments(
    tx: Prisma.TransactionClient,
    postId: number,
    files: Express.Multer.File[],
  ) {
    if (files.length === 0) return;

    await tx.postAttachment.createMany({
      data: files.map((file) => ({
        filename: file.filename,
        url: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        postId,
      })),
    });
  }
  async createWithAttachments(
    dto: CreatePostDto,
    authorId: number,
    files: Express.Multer.File[],
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const post = await tx.post.create({
          data: { ...dto, authorId },
          include: { author: { select: { id: true, name: true } } },
        });

        await this.createAttachments(tx, post.id, files);

        return tx.post.findUnique({
          where: { id: post.id },
          include: {
            author: { select: { id: true, name: true } },
            attachments: true,
          },
        });
      });
    } catch (error) {
      await this.cleanupFiles(files);
      throw error;
    }
  }

  async addAttachments(
    postId: number,
    requesterId: number,
    files: Express.Multer.File[],
  ) {
    const post = await this.findOne(postId);
    if (post.authorId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce post');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.createAttachments(tx, postId, files);

        return tx.post.findUnique({
          where: { id: postId },
          include: {
            author: { select: { id: true, name: true } },
            attachments: true,
          },
        });
      });
    } catch (error) {
      await this.cleanupFiles(files);
      throw error;
    }
  }

  private async cleanupFiles(files: Express.Multer.File[]) {
    // Promise.allSettled — continue même si un unlink échoue
    await Promise.allSettled(
      files.map((file) => {
        this.logger.warn(`Nettoyage du fichier orphelin : ${file.path}`);
        return unlink(file.path);
      }),
    );
  }
}
