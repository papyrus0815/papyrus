import { Module } from '@nestjs/common'
import { CurationService } from '../application/curation.service'
import { CurationController } from '../presentation/curation.controller'
import { CurationPrismaRepository } from './curation.prisma.repository'
import { PrismaModule } from '../../../libs/shared'
import { UserModule } from '../../../libs/user/infrastructure/user.module'

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [CurationController],
  providers: [
    CurationService,
    {
      provide: 'ICurationRepository',
      useClass: CurationPrismaRepository,
    },
  ],
  exports: [CurationService],
})
export class CurationModule {}
