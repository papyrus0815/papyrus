import { UnauthorizedException } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'

/**
 * 요청별 행위자(actor) 컨텍스트.
 * 인터셉터가 요청 시작 시 로그인 계정 ID를 저장해두면,
 * 깊은 서비스 계층(특히 알림 생성)에서 시그니처를 늘리지 않고 ambient하게 읽어 쓴다.
 */
interface ActorStore {
  accountId?: string
}

const storage = new AsyncLocalStorage<ActorStore>()

/** 주어진 계정 컨텍스트 안에서 콜백 실행 (인터셉터에서 사용) */
export function runWithActor<T>(accountId: string | undefined, fn: () => T): T {
  return storage.run({ accountId }, fn)
}

/** 현재 요청의 행위자 계정 ID (없으면 undefined — 비로그인/시스템 동작) */
export function getActorAccountId(): string | undefined {
  return storage.getStore()?.accountId
}

/**
 * 소유권 검사용 — 행위자 계정 ID가 없으면 401.
 *
 * 예전 검사는 `accountId == null`이면 통과(fail-open)했다. 전역 JwtAuthGuard 이후로는 실제로
 * 뚫리지 않지만, 누가 라우트에 @Public()을 붙이거나 계정 인자를 빠뜨리면 소유권 검사가 조용히
 * 꺼진다. 쓰기 경로는 행위자가 없으면 거절하도록 이 함수를 거친다.
 */
export function requireActorId(accountId: string | null | undefined): string {
  if (!accountId) throw new UnauthorizedException('로그인이 필요합니다.')
  return accountId
}
