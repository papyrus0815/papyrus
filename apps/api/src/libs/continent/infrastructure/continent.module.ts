import { Module } from '@nestjs/common'
import { ContinentService } from '../application/continent.service'
import { ContinentPrismaRepository } from './continent.prisma.repository'
import { ContinentController } from '../presentation/continent.controller'
import { PrismaModule } from '../../shared/database'

@Module({
  imports: [PrismaModule],
  controllers: [ContinentController],
  providers: [
    ContinentService,
    ContinentPrismaRepository,
    { provide: 'ContinentRepository', useClass: ContinentPrismaRepository },
  ],
  exports: [ContinentService],
})
export class ContinentModule {}
