/**
 * 모듈별 카테고리 색 — 군사/외교/정치 톤 시각 그루핑.
 *
 * SectionTitle 좌측 색 점에 사용. 색상은 ledger 카테고리 토큰 재사용.
 */
import { LEDGER_CATEGORY } from '@/entities/event/ui/ledger-tokens'

export const MODULE_COLOR = {
  sides: LEDGER_CATEGORY['군사'].color,
  metrics: LEDGER_CATEGORY['경제'].color,
  'military-details': LEDGER_CATEGORY['군사'].color,
  /* 조약 — 분야 팔레트에서 '회담/조약'이 빠져(형식은 사건 유형) 그 네이비를 모듈 색으로 직접 든다 */
  treaties: '#1e3a8a',
  cabinets: LEDGER_CATEGORY['정치'].color,
} as const

export type ModuleKey = keyof typeof MODULE_COLOR
