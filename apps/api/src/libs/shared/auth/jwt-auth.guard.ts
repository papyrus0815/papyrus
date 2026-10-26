import { ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'

import { IS_PUBLIC_KEY } from './public.decorator'

/**
 * 전역(APP_GUARD) JWT 가드 — `@Public()`이 없는 모든 라우트에 인증을 요구한다.
 *
 * 컨트롤러마다 `@UseGuards(AuthGuard('jwt'))`를 붙이던 opt-in 방식은 빠뜨린 곳이 그대로
 * 열렸다(대륙·종교·직업·군부대 CRUD, 업로드, 재임·행정부 쓰기). 서비스의 소유권 검사가
 * `accountId == null`이면 통과하도록 짜여 있어, 가드가 없으면 로그인한 사용자조차 남의
 * 행을 고칠 수 있었다. 기존 `@UseGuards` 선언은 중복이지만 무해하므로 그대로 둔다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }
}
