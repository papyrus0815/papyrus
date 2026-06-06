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
