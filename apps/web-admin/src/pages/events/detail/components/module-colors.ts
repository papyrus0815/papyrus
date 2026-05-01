/**
 * 모듈별 카테고리 색 — 군사/외교/정치 톤 시각 그루핑.
 *
 * SectionTitle 좌측 색 점에 사용. 색상은 ledger 카테고리 토큰 재사용.
 */
import { LEDGER_CATEGORY } from '@/pages/events/ledger/styles/ledger-tokens'

export const MODULE_COLOR = {
  belligerents: LEDGER_CATEGORY['전쟁/군사'].color,
  casualties: LEDGER_CATEGORY['전쟁/군사'].color,
  'military-details': LEDGER_CATEGORY['전쟁/군사'].color,
  treaties: LEDGER_CATEGORY['회담/조약'].color,
  cabinets: LEDGER_CATEGORY['정치'].color,
} as const

export type ModuleKey = keyof typeof MODULE_COLOR
