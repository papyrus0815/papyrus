import { Module } from '@nestjs/common'
import { SocialService } from '../application/social.service'
import { SocialController } from '../presentation/social.controller'
import { PrismaModule } from '../../../libs/shared'

@Module({
  imports: [PrismaModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}

