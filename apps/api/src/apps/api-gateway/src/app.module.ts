import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AppController } from './app.controller'
import { AuthModule } from '../../../libs/auth/infrastructure/auth.module'
import { CountryModule } from '../../../libs/country/infrastructure/country.module'
import { ContinentModule } from '../../../libs/continent/infrastructure/continent.module'
import { HistoricalCountryModule } from '../../../libs/historical-country/infrastructure/historical-country.module'
import { PersonModule } from '../../../libs/person/person.module'
import { ReligionModule } from '../../../libs/religion/infrastructure/religion.module'
import { DynastyModule } from '../../../libs/dynasty/infrastructure/dynasty.module'
import { JobModule } from '../../../libs/job/infrastructure/job.module'
import { JobCategoryModule } from '../../../libs/job-category/infrastructure/job-category.module'
import { MilitaryUnitModule } from '../../../libs/military/military-unit/infrastructure/military-unit.module'
import { UserModule } from '../../../libs/user/infrastructure/user.module'
import { CurationModule } from '../../../libs/curation/infrastructure/curation.module'
import { SocialModule } from '../../../libs/social/infrastructure/social.module'
import { EventModule } from '../../../libs/event/infrastructure/event.module'
import { EventCategoryModule } from '../../../libs/event-category/event-category.module'
import { UploadModule } from '../../../libs/shared/upload/upload.module'

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
    AppConfigModule,
    PrismaModule,
    AuthModule,
    CountryModule,
    ContinentModule,
    HistoricalCountryModule,
    PersonModule,
    ReligionModule,
    DynastyModule,
    JobModule,
    JobCategoryModule,
    MilitaryUnitModule,
    UserModule,
    CurationModule,
    SocialModule,
    EventModule,
    EventCategoryModule,
    UploadModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
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
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
