import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { WarDeclarationController } from './presentation/war-declaration.controller'

@Module({
  imports: [PrismaModule],
  controllers: [WarDeclarationController],
  exports: [],
})
export class WarDeclarationModule {}
