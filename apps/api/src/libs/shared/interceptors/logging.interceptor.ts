import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Request, Response } from 'express'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const { method, url, ip, headers } = request
    const userAgent = headers['user-agent'] || ''
    const requestId = headers['x-request-id'] as string

    const startTime = Date.now()

    const logContext = {
      method,
      url,
      ip,
      userAgent,
      requestId,
    }

    this.logger.log(`Incoming Request: ${method} ${url}`, logContext)

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now()
          const duration = endTime - startTime

          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${response.statusCode} - ${duration}ms`,
            {
              ...logContext,
              statusCode: response.statusCode,
              duration,
              responseSize: JSON.stringify(data).length,
            },
          )
        },
        error: (error) => {
          const endTime = Date.now()
          const duration = endTime - startTime

          this.logger.error(
            `Error Response: ${method} ${url} - ${duration}ms`,
            {
              ...logContext,
              duration,
              error: error.message,
              stack: error.stack,
            },
          )
        },
      }),
    )
  }
}
