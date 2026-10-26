import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from '../application/auth.service'
import { LoginAttemptLimiter } from '../application/login-attempt-limiter'
import { AccountsPrismaRepository } from './accounts.prisma.repository'
import { AppConfigService } from '../../shared/config/config.service'

import {
  AccountController,
  AuthController,
} from '../presentation/auth.controller'
import { JwtStrategy } from '../presentation/jwt.strategy'


@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: { expiresIn: configService.jwt.expiresIn as any },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController, AccountController],
  providers: [
    AuthService,
    // 생성자의 시계 인자는 테스트용 — Nest가 주입하려 들지 않게 팩토리로 만든다
    { provide: LoginAttemptLimiter, useFactory: () => new LoginAttemptLimiter() },
    JwtStrategy,
    AccountsPrismaRepository,
    { provide: 'AccountRepository', useClass: AccountsPrismaRepository },
  ],
  exports: [AuthService],
})
export class AuthModule {}
