// src/posts/posts.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private prisma: PrismaService) {}

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
    return this.prisma.post.create({
      data: { ...dto, authorId },
      include: {
        author: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: number, requesterId: number) {
    const post = await this.findOne(id);
    if (post.authorId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce post');
    }
    return this.prisma.post.delete({ where: { id } });
  }
}
