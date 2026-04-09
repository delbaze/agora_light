import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> | Promise<Observable<ApiResponse<T>>> {
    return next.handle().pipe(
      map((data: T) => ({
        data,
        statusCode: context.switchToHttp().getResponse<Response>().statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
