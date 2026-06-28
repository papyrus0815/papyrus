import { Module } from '@nestjs/common'
import { WalletService } from './application/wallet.service'
import { WalletController } from './presentation/wallet.controller'

/**
 * 파피(구매형 가상화폐) 모듈 — 환전·충전·상점·구매·장착·환불.
 *
 * PrismaModule이 전역(@Global)이라 import 없이 PrismaService를 주입받는다.
 * 게이미피케이션과 달리 다른 도메인에서 주입할 일이 없어 @Global을 쓰지 않는다.
 */
@Module({
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
