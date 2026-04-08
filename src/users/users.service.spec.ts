// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  // Mock de PrismaService — on contrôle ce que Prisma retourne
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait créer un utilisateur et retourner les données sans le mot de passe', async () => {
      const dto = {
        name: 'Alice',
        email: 'alice@test.com',
        password: 'secret123',
      };

      // Configurer le mock : findUnique retourne null (pas de doublon)
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Configurer le mock : create retourne l'utilisateur créé
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        name: dto.name,
        email: dto.email,
        password: '$2b$10$hashedpassword',
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(dto.email);
      expect(result.name).toBe(dto.name);
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it("devrait lever ConflictException si l'email existe déjà", async () => {
      const dto = {
        name: 'Alice',
        email: 'alice@test.com',
        password: 'secret123',
      };

      // Simuler un utilisateur existant
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it("devrait lever NotFoundException si l'utilisateur n'existe pas", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
