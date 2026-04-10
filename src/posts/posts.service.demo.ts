// src/posts/posts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PostsRepository } from './posts.repository';

export interface PostFilters {
  authorId?: number;
  topic?: string;
  order?: 'asc' | 'desc';
}

@Injectable()
export class PostsService {
  constructor(
    private postsRepository: PostsRepository,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async findAll(paginationDto: PaginationDto, filters: PostFilters) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);

    const [posts, total] = await Promise.all([
      this.postsRepository.findMany({ where, skip, take: limit }),
      this.postsRepository.count(where),
    ]);

    return this.buildPaginatedResponse(posts, total, page, limit);
  }

  private buildWhereClause(filters: PostFilters): Prisma.PostWhereInput {
    return {
      published: true,
      ...(filters.authorId && { authorId: filters.authorId }),
      ...(filters.topic && { topic: filters.topic }),
    };
  }

  private buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
      },
    };
  }
}
