import { Module } from '@nestjs/common'
import { CompanyController } from '../presentation/company.controller'
import { CompanyCategoryController } from '../presentation/company-category.controller'
import { CompanyService } from '../application/company.service'
import { CompanyCategoryService } from '../application/company-category.service'
import { CompanyRepository } from './company.repository'
import { CompanyCategoryRepository } from './company-category.repository'

@Module({
  controllers: [CompanyController, CompanyCategoryController],
  providers: [
    CompanyService,
    CompanyRepository,
    CompanyCategoryService,
    CompanyCategoryRepository,
  ],
  exports: [CompanyService, CompanyCategoryService],
})
export class CompanyModule {}
