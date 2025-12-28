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
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_CRT_PATH: Joi.string().optional(),

  // Uploads
  UPLOAD_PATH: Joi.string().default('./uploads'),
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
