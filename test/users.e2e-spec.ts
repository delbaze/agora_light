// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { default as request } from 'supertest';
import { AppModule } from '../src/app.module';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );
    // Reproduire exactement la configuration de main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users/register', () => {
    it('devrait créer un utilisateur et retourner 201', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          name: 'Alice',
          email: `alice+${Date.now()}@test.com`, // email unique par test
          password: 'motdepasse123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.email).toContain('alice');
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it("devrait retourner 400 si l'email est invalide", () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({ name: 'Bob', email: 'pas-un-email', password: 'secret123' })
        .expect(400);
    });

    it('devrait retourner 400 si le mot de passe est trop court', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({ name: 'Bob', email: 'bob@test.com', password: '123' })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('devrait retourner un tableau', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
