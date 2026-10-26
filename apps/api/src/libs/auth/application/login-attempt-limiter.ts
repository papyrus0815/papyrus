import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

const WINDOW_MS = 15 * 60 * 1000
/** 같은 IP에서 같은 계정으로 — 비밀번호 추측 */
const MAX_FAILURES_PER_ACCOUNT = 5
/** 같은 IP에서 계정 불문 — 여러 계정에 흔한 비밀번호 뿌리기 */
const MAX_FAILURES_PER_IP = 30
/** 메모리 상한 — 넘으면 만료된 항목부터 정리 */
const PRUNE_THRESHOLD = 10_000

interface Bucket {
  failures: number
  windowStart: number
}

export class TooManyLoginAttemptsException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      `로그인 시도가 너무 많습니다. ${Math.ceil(retryAfterSeconds / 60)}분 뒤 다시 시도하세요.`,
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
}

/**
 * 로그인 실패 횟수 제한 — 무차별 대입 방지.
 *
 * 키를 '계정'만으로 잡으면 남이 일부러 틀려서 admin을 잠글 수 있으므로 'IP+계정'으로 잡고,
 * 계정을 바꿔 가며 뿌리는 경우는 IP 단위 상한으로 막는다. 성공하면 IP+계정 카운터를 지운다.
 * 프로세스 메모리에 두므로 인스턴스가 하나인 배포(현재 구성)를 전제로 한다 — 여러 대로
 * 늘리면 Redis 같은 공유 저장소로 옮길 것. 재시작하면 초기화된다.
 */
@Injectable()
export class LoginAttemptLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly now: () => number = Date.now) {}

  /** 제한에 걸렸으면 429를 던진다 */
  assertAllowed(ip: string, account: string): void {
    const retryAfterMs = Math.max(
      this.blockedFor(this.accountKey(ip, account), MAX_FAILURES_PER_ACCOUNT),
      this.blockedFor(this.ipKey(ip), MAX_FAILURES_PER_IP),
    )
    if (retryAfterMs > 0) throw new TooManyLoginAttemptsException(Math.ceil(retryAfterMs / 1000))
  }

  recordFailure(ip: string, account: string): void {
    this.increment(this.accountKey(ip, account))
    this.increment(this.ipKey(ip))
    if (this.buckets.size > PRUNE_THRESHOLD) this.prune()
  }

  recordSuccess(ip: string, account: string): void {
    this.buckets.delete(this.accountKey(ip, account))
  }

  private accountKey(ip: string, account: string): string {
    return `acct:${ip}:${account.trim().toLowerCase()}`
  }

  private ipKey(ip: string): string {
    return `ip:${ip}`
  }

  /** 막혀 있으면 남은 ms, 아니면 0 */
  private blockedFor(key: string, limit: number): number {
    const bucket = this.liveBucket(key)
    if (!bucket || bucket.failures < limit) return 0
    return bucket.windowStart + WINDOW_MS - this.now()
  }

  private increment(key: string): void {
    const bucket = this.liveBucket(key)
    if (bucket) bucket.failures += 1
    else this.buckets.set(key, { failures: 1, windowStart: this.now() })
  }

  /** 창이 지난 항목은 없는 것으로 */
  private liveBucket(key: string): Bucket | undefined {
    const bucket = this.buckets.get(key)
    if (bucket && this.now() - bucket.windowStart >= WINDOW_MS) {
      this.buckets.delete(key)
      return undefined
    }
    return bucket
  }

  private prune(): void {
    const now = this.now()
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= WINDOW_MS) this.buckets.delete(key)
    }
  }
}
