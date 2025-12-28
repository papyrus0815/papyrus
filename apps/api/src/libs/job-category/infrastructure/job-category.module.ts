import { Module } from '@nestjs/common'
import { JobCategoryController } from '../presentation/job-category.controller'
import { JobCategoryService } from '../application/job-category.service'
import { JobCategoryRepository } from './job-category.repository'

@Module({
  controllers: [JobCategoryController],
  providers: [JobCategoryService, JobCategoryRepository],
  exports: [JobCategoryService],
})
export class JobCategoryModule {}
