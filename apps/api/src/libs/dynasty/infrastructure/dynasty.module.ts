import { Module } from '@nestjs/common'
import { DynastyController } from '../presentation/dynasty.controller'
import { DynastyService } from '../application/dynasty.service'
import { DynastyRepository } from './dynasty.repository'
import { UploadModule } from '../../shared/upload/upload.module'

@Module({
  imports: [UploadModule],
  controllers: [DynastyController],
  providers: [DynastyService, DynastyRepository],
  exports: [DynastyService],
})
export class DynastyModule {}
