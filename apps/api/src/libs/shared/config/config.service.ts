import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  AppConfig,
  DatabaseConfig,
  JwtConfig,
  SecurityConfig,
} from './config.interface'

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get app(): AppConfig {
    return {
      databaseUrl: this.configService.get<string>('DATABASE_URL')!,
      jwtSecret: this.configService.get<string>('JWT_SECRET')!,
      jwtExpiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      jwtRefreshExpiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ),
      port:
        this.configService.get<number>('API_PORT') ||
        this.configService.get<number>('PORT', 3000),
      host: this.configService.get<string>('BIND_HOST', '127.0.0.1'),
      nodeEnv: this.configService.get<'development' | 'production' | 'test'>(
        'NODE_ENV',
        'development',
      ),
      allowedOrigins: this.configService
        .get<string>('APP_ORIGINS', '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      sslKeyPath: this.configService.get<string>('SSL_KEY_PATH'),
      sslCertPath: this.configService.get<string>('SSL_CRT_PATH'),
      uploadPath: this.configService.get<string>('UPLOAD_PATH', './uploads'),
      maxFileSize: this.configService.get<number>(
        'MAX_FILE_SIZE',
        10 * 1024 * 1024,
      ),
    }
  }

  get database(): DatabaseConfig {
    return {
      url: this.configService.get<string>('DATABASE_URL')!,
      logLevel: this.isDevelopment
        ? ['info', 'warn', 'error']
        : ['warn', 'error'],
    }
  }

  get jwt(): JwtConfig {
    return {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      refreshExpiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ),
    }
  }

  get security(): SecurityConfig {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')
    const isProduction = nodeEnv === 'production'

    return {
      allowedOrigins: this.app.allowedOrigins,
      useHttps: Boolean(this.app.sslKeyPath && this.app.sslCertPath),
      cookieSettings: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }
  }

  get isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development'
  }

  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }

  get isTest(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'test'
  }
}
