import { Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import * as Joi from 'joi'
import { AppConfigService } from './config.service'

const validationSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Server
  API_PORT: Joi.number().port().default(3000),
  PORT: Joi.number().port().default(3000),
  BIND_HOST: Joi.string().default('127.0.0.1'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Security
  APP_ORIGINS: Joi.string().default(''),
  // 인증 쿠키 SameSite. 프론트와 API가 같은 사이트(nginx·vite·데스크톱 프록시)면 lax로 충분하고
  // CSRF를 막아 준다. 다른 사이트에서 API를 직접 부르는 배포만 none(자동으로 Secure)으로 연다.
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_CRT_PATH: Joi.string().optional(),
  // 운영에서 /api-docs를 열지 여부 (개발은 항상 열림)
  SWAGGER_ENABLED: Joi.boolean().default(false),

  // Uploads (기본: API 앱 내 uploads)
  UPLOAD_PATH: Joi.string().default('./apps/api/uploads'),
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
})

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      expandVariables: true,
    }),
  ],
  providers: [ConfigService, AppConfigService],
  exports: [ConfigService, AppConfigService],
})
export class AppConfigModule {}
