/**
 * 모듈별 색 — 군사/경제/정치 톤 시각 그루핑.
 *
 * SectionTitle 좌측 색 점에 사용. 색상은 분야 레지스트리의 액센트를 재사용한다.
 */
import { EVENT_DOMAINS } from '@/entities/event/model/event-domain'

export const MODULE_COLOR = {
  sides: EVENT_DOMAINS.MILITARY.color,
  metrics: EVENT_DOMAINS.ECONOMY.color,
  'military-details': EVENT_DOMAINS.MILITARY.color,
  /* 조약 — 분야 팔레트에서 '회담/조약'이 빠져(조약은 세부 분야) 그 네이비를 모듈 색으로 직접 든다 */
  treaties: '#1e3a8a',
  cabinets: EVENT_DOMAINS.POLITICS.color,
} as const

export type ModuleKey = keyof typeof MODULE_COLOR
