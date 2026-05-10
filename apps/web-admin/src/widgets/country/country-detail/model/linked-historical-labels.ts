/**
 * 과거국가 화면 — 변천·관계·소속 enum의 한글 라벨.
 *
 * 위젯 본체에서 분리해 라벨 변경/추가가 메인 로직에 영향 없게 한다.
 */
import type {
  HistoricalMembershipRole,
  HistoricalRelationType,
} from '@/shared/api/historical-countries'

export const TRANSITION_EVENT_LABELS: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병/연합',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SECULARIZATION: '세속화',
  SPLIT: '분열',
  OTHER: '기타',
}

export const TRANSITION_SCOPE_LABELS: Record<string, string> = {
  STATE_SUCCESSION: '국가 계승',
  REGIME_CHANGE: '정권 교체',
}

export const RELATION_TYPE_LABELS: Record<HistoricalRelationType, string> = {
  ALLIANCE: '동맹',
  WAR: '전쟁',
  SUZERAIN_VASSAL: '종주-속국',
  TRIBUTARY: '조공',
  PERSONAL_UNION: '동군연합',
}

export const MEMBERSHIP_ROLE_LABELS: Record<HistoricalMembershipRole, string> = {
  COLONY: '식민지',
  PROTECTORATE: '보호국',
  DOMINION: '자치령',
  CONFEDERATION_MEMBER: '연방 구성원',
  VASSAL_STATE: '속국',
  ALLY: '동맹',
  UNION: '연합',
  SUCCESSION: '계승',
  OTHER: '기타',
}
