import { Module } from '@nestjs/common'
import { LanguageService } from '../application/language.service'
import { LanguagePrismaRepository } from './language.prisma.repository'
import { LanguageController } from '../presentation/language.controller'
import { PrismaModule } from '../../shared/database'

@Module({
  imports: [PrismaModule],
  controllers: [LanguageController],
  providers: [
    LanguageService,
    LanguagePrismaRepository,
    { provide: 'LanguageRepository', useClass: LanguagePrismaRepository },
  ],
  exports: [LanguageService],
})
export class LanguageModule {}
