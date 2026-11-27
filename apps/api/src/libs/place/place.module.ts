import { Module } from '@nestjs/common'

import { PrismaModule } from '../shared/database'
import { PlaceService } from './application/place.service'
import { PlaceController } from './presentation/place.controller'

/**
 * 범용 역사·지리 장소 정본(Place) 모듈
 * - 인물(출생·사망·묘소·연보) 및 타 도메인 공용 지리 카탈로그
 * - Google Places API (New) + Nominatim 듀얼 지오코딩 및 중복 방지 Upsert 제공
 */
@Module({
  imports: [PrismaModule],
  controllers: [PlaceController],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceModule {}
