import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AuthModule } from '../../../libs/auth/infrastructure/auth.module'
import { CountryModule } from '../../../libs/country/infrastructure/country.module'
import { ContinentModule } from '../../../libs/continent/infrastructure/continent.module'
import { CurrencyModule } from '../../../libs/currency/infrastructure/currency.module'
import { LanguageModule } from '../../../libs/language/infrastructure/language.module'
import { HistoricalCountryModule } from '../../../libs/historical-country/infrastructure/historical-country.module'
import { PersonModule } from '../../../libs/person/person.module'
import { ReligionModule } from '../../../libs/religion/infrastructure/religion.module'
import { DynastyModule } from '../../../libs/dynasty/infrastructure/dynasty.module'
import { JobModule } from '../../../libs/job/infrastructure/job.module'
import { JobCategoryModule } from '../../../libs/job-category/infrastructure/job-category.module'
import { MilitaryUnitModule } from '../../../libs/military/military-unit/infrastructure/military-unit.module'
import { EventModule } from '../../../libs/event/infrastructure/event.module'
import { EventCategoryModule } from '../../../libs/event-category/event-category.module'
import { CityModule } from '../../../libs/city/city.module'
import { NotificationModule } from '../../../libs/notification/notification.module'
import { OrganizationModule } from '../../../libs/organization/infrastructure/organization.module'
import { CompanyModule } from '../../../libs/company/infrastructure/company.module'
import { UploadModule } from '../../../libs/shared/upload/upload.module'
import { UploadServeMiddleware } from '../../../libs/shared/upload/upload-serve.middleware'
import { ActorContextInterceptor } from '../../../libs/shared/actor-context.interceptor'
import { AdministrationDepartmentModule } from '../../../libs/administration-department/administration-department.module'
import { EthnicityModule } from '../../../libs/ethnicity/ethnicity.module'
import { GlossaryModule } from '../../../libs/glossary/glossary.module'
import { TreatyModule } from '../../../libs/treaty/treaty.module'
import { ElectionModule } from '../../../libs/election/election.module'
import { EntityLinkSearchModule } from '../../../libs/entity-link-search/entity-link-search.module'
import { NaturalFeatureModule } from '../../../libs/natural-feature/natural-feature.module'
import { InfrastructureModule } from '../../../libs/infrastructure/infrastructure.module'
import { GamificationModule } from '../../../libs/gamification/gamification.module'

import {
  AppConfigModule,
  PrismaModule,
  GlobalExceptionFilter,
  TransformInterceptor,
  LoggingInterceptor,
  GlobalValidationPipe,
  RequestIdMiddleware,
  HealthModule,
} from '../../../libs/shared'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AppConfigModule,
    PrismaModule,
    GamificationModule,
    AuthModule,
    CountryModule,
    ContinentModule,
    CurrencyModule,
    LanguageModule,
    HistoricalCountryModule,
    PersonModule,
    ReligionModule,
    DynastyModule,
    JobModule,
    JobCategoryModule,
    MilitaryUnitModule,
    EventModule,
    EventCategoryModule,
    CityModule,
    NotificationModule,
    OrganizationModule,
    CompanyModule,
    UploadModule,
    AdministrationDepartmentModule,
    EthnicityModule,
    GlossaryModule,
    TreatyModule,
    ElectionModule,
    EntityLinkSearchModule,
    NaturalFeatureModule,
    InfrastructureModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    UploadServeMiddleware,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 가드 이후 req.user → 요청 컨텍스트에 행위자 계정 ID 저장 (알림 작성자 표기용)
    {
      provide: APP_INTERCEPTOR,
      useClass: ActorContextInterceptor,
    },
    // Nestia SDK와 호환되지 않으므로 TransformInterceptor 비활성화
    // Nestia는 자체적으로 타입 안전한 응답을 제공하므로 추가 래핑 불필요
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TransformInterceptor,
    // },
    {
      provide: APP_PIPE,
      useClass: GlobalValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // /uploads 요청은 라우터보다 먼저 처리 (미들웨어에서 경로 체크 후 파일 서빙)
    consumer.apply(UploadServeMiddleware).forRoutes('*')
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
