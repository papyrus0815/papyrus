import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * 전역 JwtAuthGuard를 건너뛰는 핸들러/컨트롤러 표시.
 *
 * 기본값은 '인증 필요'다 — 새 컨트롤러가 가드를 빠뜨려도 열리지 않게 하려는 것.
 * 로그인·토큰 갱신·헬스체크처럼 토큰 없이 불려야 하는 곳에만 붙인다.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
