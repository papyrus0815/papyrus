import { Global, Module } from '@nestjs/common'
import { PointService } from './application/point.service'
import { GamificationController } from './presentation/gamification.controller'

/**
 * 게이미피케이션 모듈 — 콘텐츠 등록 점수 적립/등급.
 *
 * @Global: 여러 도메인 서비스(person/event/country/...)가 PointService를 주입받으므로
 * 전역 등록해 모듈별 import 보일러플레이트를 줄인다. (PrismaModule과 동일한 패턴)
 */
@Global()
@Module({
  controllers: [GamificationController],
  providers: [PointService],
  exports: [PointService],
})
export class GamificationModule {}
