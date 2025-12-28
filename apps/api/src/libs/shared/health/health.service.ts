import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { AppConfigService } from '../config'
import { HealthCheckResponse } from './health.controller'
import * as fs from 'fs'
import * as os from 'os'

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: AppConfigService,
  ) {}

  async getHealthStatus(): Promise<HealthCheckResponse> {
    const startTime = Date.now()
    
    try {
      // 데이터베이스 연결 확인
      const dbStartTime = Date.now()
      await this.prisma.$queryRaw`SELECT 1`
      const dbResponseTime = Date.now() - dbStartTime

      // 메모리 사용량
      const memoryUsage = process.memoryUsage()
      const totalMemory = os.totalmem()
      
      // 디스크 사용량 (간단한 버전)
      const diskStats = await this.getDiskUsage()

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: this.configService.app.nodeEnv,
        checks: {
          database: {
            status: 'ok',
            responseTime: dbResponseTime,
          },
          memory: {
            used: memoryUsage.heapUsed,
            total: totalMemory,
            percentage: Math.round((memoryUsage.heapUsed / totalMemory) * 100),
          },
          disk: diskStats,
        },
      }
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: this.configService.app.nodeEnv,
        checks: {
          database: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          memory: {
            used: 0,
            total: 0,
            percentage: 0,
          },
          disk: {
            used: 0,
            total: 0,
            percentage: 0,
          },
        },
      }
    }
  }

  async isReady(): Promise<boolean> {
    try {
      // 데이터베이스 연결 확인
      await this.prisma.$queryRaw`SELECT 1`
      
return true
    } catch {
      return false
    }
  }

  private async getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const stats = await fs.promises.statfs('.')
      const total = stats.bavail * stats.bsize
      const free = stats.bfree * stats.bsize
      const used = total - free
      
      return {
        used,
        total,
        percentage: Math.round((used / total) * 100),
      }
    } catch {
      // Windows나 다른 시스템에서는 간단한 더미 데이터 반환
      return {
        used: 0,
        total: 0,
        percentage: 0,
      }
    }
  }
}
