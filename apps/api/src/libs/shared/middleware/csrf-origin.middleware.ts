import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

import { AppConfigService } from '../config'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const AUTH_COOKIES = ['access_token', 'refresh_token']
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function parseUrl(value: string | undefined): URL | null {
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/**
 * 요청 출처가 허용되는지 판단 — 미들웨어와 분리해 단위 테스트한다.
 *
 * - 허용 목록(APP_ORIGINS)에 있으면 통과.
 * - 요청이 향한 호스트(프록시 뒤면 X-Forwarded-Host)와 같은 호스트에서 왔으면 같은 오리진이라 통과.
 * - 출처와 대상이 모두 루프백이면 통과 — 데스크톱 앱의 로컬 서버(임의 포트)가 API를 프록시한다.
 *   공격자 페이지가 사용자 PC의 루프백에서 뜰 수는 없다.
 */
export function isAllowedRequestOrigin(params: {
  origin: string
  allowedOrigins: string[]
  requestHost: string | undefined
}): boolean {
  const { origin, allowedOrigins, requestHost } = params
  if (allowedOrigins.includes(origin)) return true
  const source = parseUrl(origin)
  const target = requestHost ? parseUrl(`http://${requestHost}`) : null
  if (!source || !target) return false
  if (source.host === target.host) return true
  return LOOPBACK_HOSTS.has(source.hostname) && LOOPBACK_HOSTS.has(target.hostname)
}

/**
 * CSRF 방어(심층) — 인증 쿠키를 든 상태 변경 요청은 허용된 출처에서 온 것만 받는다.
 *
 * 1차 방어는 SameSite=Lax 쿠키다. 이 미들웨어는 SameSite=None으로 여는 배포와,
 * 같은 사이트의 다른 서브도메인에서 오는 요청까지 막는 두 번째 줄이다.
 * Origin(없으면 Referer)이 아예 없는 요청은 브라우저가 아닌 클라이언트라 통과시킨다 —
 * 브라우저는 교차 출처 POST에 Origin을 항상 싣는다.
 * 개발 모드는 CORS처럼 모든 출처를 허용한다(LAN IP·터널 접속).
 */
@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method.toUpperCase())) return next()
    if (this.config.app.nodeEnv === 'development') return next()

    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {}
    if (!AUTH_COOKIES.some((name) => cookies[name])) return next()

    // Origin이 있는데 해석되지 않으면('null' — 샌드박스 iframe·data: 문서) 거절 쪽으로 둔다
    const rawOrigin = req.headers.origin as string | undefined
    const origin =
      rawOrigin !== undefined
        ? (parseUrl(rawOrigin)?.origin ?? 'null')
        : parseUrl(req.headers.referer as string | undefined)?.origin
    if (!origin) return next()

    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim()
    const requestHost = forwardedHost || req.headers.host
    if (
      isAllowedRequestOrigin({
        origin,
        allowedOrigins: this.config.app.allowedOrigins,
        requestHost,
      })
    ) {
      return next()
    }
    throw new ForbiddenException('허용되지 않은 출처의 요청입니다.')
  }
}
