import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { runWithActor } from './actor-context'

/**
 * 가드(JwtStrategy) 이후 실행되어 req.user에서 계정 ID를 꺼내 요청 컨텍스트에 심는다.
 * 이후 핸들러·서비스 호출은 모두 이 컨텍스트 안에서 동작하므로
 * 알림 생성 등에서 getActorAccountId()로 행위자를 알 수 있다.
 */
@Injectable()
export class ActorContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest()
    const accountId: string | undefined = req?.user?.id ?? req?.user?.sub
    return new Observable((subscriber) => {
      runWithActor(accountId, () => {
        next.handle().subscribe(subscriber)
      })
    })
  }
}
