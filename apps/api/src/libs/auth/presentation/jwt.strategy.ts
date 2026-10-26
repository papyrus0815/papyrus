import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { Request } from 'express'
import { AppConfigService } from '../../shared/config'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.access_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.secret,
    })
  }

  async validate(payload: { sub: string; type?: string }) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload')
    }
    // 리프레시 토큰(수명이 더 긴)을 액세스 토큰으로 쓰지 못하게 한다. type이 없는 것은
    // 'access' 표기 이전에 발급된 액세스 토큰이라 만료까지는 받아 준다.
    if (payload.type !== undefined && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type')
    }

    return { id: payload.sub, userId: payload.sub }; // id와 userId 모두 제공
  }
}
