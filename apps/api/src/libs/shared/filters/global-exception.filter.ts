import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { Request, Response } from 'express'

import { AppConfigService } from '../config/config.service'


export interface ApiErrorResponse {
  success: false
  timestamp: string
  path: string
  method: string
  statusCode: number
  error: {
    name: string
    message: string
    code?: string
    details?: any
  }
  requestId?: string
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor(private readonly config: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const errorResponse = this.buildErrorResponse(exception, request)

    // 로깅
    this.logError(exception, request, errorResponse)

    response.status(errorResponse.statusCode).json(errorResponse)
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ApiErrorResponse {
    const timestamp = new Date().toISOString()
    const path = request.url
    const method = request.method

    // HttpException 처리
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      return {
        success: false,
        timestamp,
        path,
        method,
        statusCode: status,
        error: {
          name: exception.name,
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : (exceptionResponse as any)?.message || exception.message,
          details:
            typeof exceptionResponse === 'object'
              ? exceptionResponse
              : undefined,
        },
        requestId: this.getRequestId(request),
      }
    }

    // Prisma 에러 처리
    if (exception instanceof PrismaClientKnownRequestError) {
      return {
        success: false,
        timestamp,
        path,
        method,
        statusCode: this.getPrismaErrorStatus(exception.code),
        error: {
          name: 'DatabaseError',
          message: this.getPrismaErrorMessage(exception),
          code: exception.code,
        },
        requestId: this.getRequestId(request),
      }
    }

    // 기본 에러 처리 — 의도하지 않은 예외라 원문에 내부 정보가 섞인다(Prisma 검증 오류면 호출문·
    // dist 경로·쿼리 일부). 운영에서는 일반 문구와 requestId만 내려보내고 원문은 로그(logError)에만 둔다.
    const isError = exception instanceof Error
    const exposeDetail = isError && !this.config.isProduction
    return {
      success: false,
      timestamp,
      path,
      method,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        name: exposeDetail ? exception.name : 'InternalServerError',
        message: exposeDetail ? exception.message : 'Internal server error',
      },
      requestId: this.getRequestId(request),
    }
  }

  private getPrismaErrorStatus(code: string): number {
    switch (code) {
      case 'P2002': // Unique constraint violation
        return HttpStatus.CONFLICT
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND
      case 'P2003': // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST
      case 'P2004': // Constraint violation
        return HttpStatus.BAD_REQUEST
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR
    }
  }

  private getPrismaErrorMessage(error: PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        return 'A record with this data already exists'
      case 'P2025':
        return 'The requested record was not found'
      case 'P2003':
        return 'Invalid reference to related record'
      case 'P2004':
        return 'Data constraint violation'
      default:
        return 'Database operation failed'
    }
  }

  private getRequestId(request: Request): string | undefined {
    return request.headers['x-request-id'] as string
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ApiErrorResponse,
  ): void {
    const { statusCode, error } = errorResponse
    const { method, url, ip, headers } = request
    // 응답에서는 가렸더라도 로그에는 원문을 남긴다
    const message = exception instanceof Error ? exception.message : error.message

    const logMessage = `${method} ${url} - ${statusCode} - ${message}`
    const logContext = {
      timestamp: errorResponse.timestamp,
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      requestId: errorResponse.requestId,
      error: {
        name: exception instanceof Error ? exception.name : error.name,
        message,
        details: error.details, // Validation 에러 상세 정보 추가
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    }

    if (statusCode >= 500) {
      this.logger.error(logMessage, logContext)
    } else if (statusCode >= 400) {
      this.logger.warn(logMessage, logContext)
    } else {
      this.logger.log(logMessage, logContext)
    }
  }
}
