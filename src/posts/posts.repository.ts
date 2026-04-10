// src/posts/posts.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostsRepository {
  constructor(private prisma: PrismaService) {}

  async findMany(params: {
    where?: Prisma.PostWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.PostOrderByWithRelationInput;
  }) {
    return this.prisma.post.findMany({
      ...params,
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async count(where?: Prisma.PostWhereInput) {
    return this.prisma.post.count({ where });
  }

  async findById(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async create(data: Prisma.PostCreateInput) {
    return this.prisma.post.create({
      data,
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async delete(id: number) {
    return this.prisma.post.delete({ where: { id } });
  }
}
