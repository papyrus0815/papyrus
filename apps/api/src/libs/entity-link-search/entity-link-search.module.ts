import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { EntityLinkSearchController } from './presentation/entity-link-search.controller'

@Module({
  imports: [PrismaModule],
  controllers: [EntityLinkSearchController],
})
export class EntityLinkSearchModule {}
