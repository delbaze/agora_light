// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { NotificationsProducer } from '../notifications/notifications.producer';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private notificationsProducer: NotificationsProducer,
  ) {}

  async create(data: { name: string; email: string; password: string }) {
    this.logger.debug(`Tentative de création d'un utilisateur : ${data.email}`);

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      this.logger.warn(`Email déjà utilisé : ${data.email}`);
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });

    this.logger.log(`Utilisateur créé avec succès — ID : ${user.id}`);
    await this.notificationsProducer.notifyWelcome(
      user.id,
      user.name,
      user.email,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return result;
  }

  async findAll(search?: string) {
    const where: Prisma.UserWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const users = await this.prisma.user.findMany({ where });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return users.map(({ password, ...u }) => u);
  }

  async findOne(id: number) {
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT — ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache MISS — ${cacheKey}`);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    await this.cache.set(cacheKey, result, 300000);

    return result;
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(
    id: number,
    data: { name?: string; bio?: string; avatarUrl?: string },
  ) {
    await this.findOne(id); // Vérifie l'existence, lève NotFoundException si absent
    const user = await this.prisma.user.update({ where: { id }, data });

    await this.cache.del(`user:${id}`);
    this.logger.debug(`Cache invalidé — user:${id}`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });

    await this.cache.del(`user:${id}`);
    this.logger.debug(`Cache invalidé — user:${id}`);

    return { message: `Utilisateur ${id} supprimé` };
  }

  async findAllPaginated(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
