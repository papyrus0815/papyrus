import { Module } from '@nestjs/common'
import { WalletModule } from '../wallet/wallet.module'
import { ArtifactService } from './application/artifact.service'
import { ArtifactController } from './presentation/artifact.controller'

/**
 * 역사 유물 수집 모듈.
 *
 * WalletModule을 import해 WalletService.spend(파피 소비 프리미티브)를 주입받는다
 * (유물 구매 = 파피 차감 + CONSUME 원장, 코스메틱 구매와 동일 안전성 재사용).
 */
@Module({
  imports: [WalletModule],
  controllers: [ArtifactController],
  providers: [ArtifactService],
  exports: [ArtifactService],
})
export class ArtifactModule {}
