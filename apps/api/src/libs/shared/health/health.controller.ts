import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { HealthService } from './health.service'

export interface HealthCheckResponse {
  status: 'ok' | 'error'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: {
    database: {
      status: 'ok' | 'error'
      responseTime?: number
      error?: string
    }
    memory: {
      used: number
      total: number
      percentage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
  }
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '시스템 헬스체크' })
  @ApiResponse({
    status: 200,
    description: '시스템 상태 정보',
    type: Object,
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.getHealthStatus()
  }

  @Get('ready')
  @ApiOperation({ summary: '준비 상태 확인 (Kubernetes readiness probe): Promise<any>' })
  @ApiResponse({ status: 200, description: '서비스 준비 완료' })
  async ready(): Promise<{ status: string }> {
    const isReady = await this.healthService.isReady()
    return { status: isReady ? 'ready' : 'not ready' }
  }

  @Get('live')
  @ApiOperation({ summary: '생존 상태 확인 (Kubernetes liveness probe)' })
  @ApiResponse({ status: 200, description: '서비스 실행 중' })
  async live(): Promise<{ status: string }> {
    return { status: 'alive' }
  }
}
