import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/database'
import { OrganizationController } from '../presentation/organization.controller'
import { OrganizationService } from '../application/organization.service'
import { OrganizationPrismaRepository } from './organization.prisma.repository'

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationPrismaRepository],
  exports: [OrganizationService],
})
export class OrganizationModule {}
