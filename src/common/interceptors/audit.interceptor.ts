import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
interface AuditLog {
  userId: number | null;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
}
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AUDIT');
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, path } = request;
    const user = request.user as { id: number } | undefined;

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - start;
          const audit: AuditLog = {
            userId: user?.id ?? null,
            method,
            path,
            statusCode: response.statusCode,
            duration,
            timestamp: new Date().toISOString(),
          };

          if (method !== 'GET') {
            this.logger.log(JSON.stringify(audit));
          }
        },
        // error: () => {},
        // complete: () => {}
      }),
      //   tap(() => {
      //     const response = context.switchToHttp().getResponse<Response>();
      //     const duration = Date.now() - start;
      //     this.logger.log(
      //       `${method} ${url} ${response.statusCode} - ${duration}ms`,
      //     );
      //   }),
    );
  }
}
