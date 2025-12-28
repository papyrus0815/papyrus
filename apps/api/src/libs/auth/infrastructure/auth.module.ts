import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from '../application/auth.service'
import { AccountsPrismaRepository } from './accounts.prisma.repository'
import { AppConfigService } from '../../shared/config'

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
        signOptions: { expiresIn: configService.jwt.expiresIn },
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AuthController, AccountController],
  providers: [
    AuthService,
    JwtStrategy,
    AccountsPrismaRepository,
    { provide: 'AccountRepository', useClass: AccountsPrismaRepository },
  ],
  exports: [AuthService],
})
export class AuthModule {}
