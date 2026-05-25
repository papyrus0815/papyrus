import { Module } from '@nestjs/common'
import { CompanyController } from '../presentation/company.controller'
import { CompanyService } from '../application/company.service'
import { CompanyRepository } from './company.repository'

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository],
  exports: [CompanyService],
})
export class CompanyModule {}
