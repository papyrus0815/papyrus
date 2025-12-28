import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Request } from 'express'

export interface ApiSuccessResponse<T = any> {
  success: true
  timestamp: string
  path: string
  method: string
  data: T
  requestId?: string
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()

    return next.handle().pipe(
      map((data) => ({
        success: true,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        data,
        requestId: this.getRequestId(request),
      })),
    )
  }

  private getRequestId(request: Request): string | undefined {
    return request.headers['x-request-id'] as string
  }
}
