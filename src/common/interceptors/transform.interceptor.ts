import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const httpResponse = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((payload) => {
        // Skip transform for streamed responses (e.g. CSV download)
        if (payload?.__skipTransform === true) {
          return payload;
        }
        return {
          success: true,
          statusCode: httpResponse.statusCode,
          message: payload?.message ?? 'Request successful',
          data: payload?.data !== undefined ? payload.data : payload,
        };
      }),
    );
  }
}
