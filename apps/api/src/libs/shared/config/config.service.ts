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
      // 운영은 SWAGGER_ENABLED=true일 때만 — 문서가 인증 없이 전 엔드포인트 지도를 보여 준다
      swaggerEnabled:
        this.configService.get<string>('NODE_ENV', 'development') !== 'production' ||
        String(this.configService.get('SWAGGER_ENABLED', 'false')) === 'true',
      sslCertPath: this.configService.get<string>('SSL_CRT_PATH'),
      uploadPath: this.configService.get<string>('UPLOAD_PATH', './apps/api/uploads'),
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

    const sameSite = this.configService.get<'lax' | 'strict' | 'none'>('COOKIE_SAMESITE', 'lax')

    return {
      allowedOrigins: this.app.allowedOrigins,
      useHttps: Boolean(this.app.sslKeyPath && this.app.sslCertPath),
      cookieSettings: {
        httpOnly: true,
        // SameSite=None은 Secure 없이는 브라우저가 버린다
        secure: isProduction || sameSite === 'none',
        // 예전 기본값(운영=none)은 다른 사이트의 폼 POST에도 인증 쿠키를 실어 보내 CSRF가 열렸다
        sameSite,
        maxAge: 1000 * 60 * 60 * 24, // 1 day — 토큰 수명을 해석하지 못할 때의 폴백
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
