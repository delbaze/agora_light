import { NestFactory } from '@nestjs/core';
import { Injectable, Module } from '@nestjs/common';
import { ClientsModule, Transport, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

interface Post {
  id: number;
  title: string;
  content: string;
  topic: string;
  authorId: number;
  createdAt: string;
}

interface PaginatedPosts {
  data: Post[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

@Injectable()
export class TestService {
  constructor(private client: ClientProxy) {} //send() emit()

  async runTests() {
    console.log('--- Test du microservice Agora');
    try {
      const post = await firstValueFrom<Post>(
        this.client.send<Post>('posts.findOne', { id: 1 }),
      );
      console.log('posts.findOne: ', post);
    } catch (err) {
      console.error('posts.findOne a échoué : ', err);
    }
    try {
      const posts = await firstValueFrom<PaginatedPosts>(
        this.client.send<PaginatedPosts>('posts.findAll', {
          page: 1,
          limit: 3,
        }),
      );
      console.log('posts.findAll: ', posts);
    } catch (err) {
      console.error('posts.findAll a échoué : ', err);
    }
  }
}

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AGORA_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
    ]),
  ],
  providers: [
    {
      provide: TestService,
      useFactory: (client: ClientProxy) => new TestService(client),
      inject: ['AGORA_SERVICE'],
    },
  ],
})
class TestModule {}

async function runTest() {
  const app = await NestFactory.createApplicationContext(TestModule);
  const testService = app.get(TestService);
  await testService.runTests();
  await app.close();
}

runTest().catch(console.error);
