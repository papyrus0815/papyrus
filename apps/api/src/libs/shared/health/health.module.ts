import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { AppConfigService } from '../config'

@Module({
  controllers: [HealthController],
  providers: [HealthService, AppConfigService],
  exports: [HealthService],
})
export class HealthModule {}
