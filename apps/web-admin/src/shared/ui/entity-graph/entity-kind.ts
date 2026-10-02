/**
 * 엔티티 종류별 표시 메타 — 이름·아이콘·상세 경로를 한 곳에서.
 * 칩·연결 패널·(이후) 멘션·검색이 같은 말을 하게 하는 단일 출처.
 */
import type { IconType } from 'react-icons'
import {
  FiAward,
  FiBookmark,
  FiCalendar,
  FiFileText,
  FiFlag,
  FiGlobe,
  FiLayers,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi'

import type { ConnectionGroup, EntityKind } from '@/shared/api/entity-graph'
import { pathKeys } from '@/shared/router'

export const ENTITY_KIND_META: Record<EntityKind, { label: string; Icon: IconType }> = {
  person: { label: '인물', Icon: FiUser },
  event: { label: '사건', Icon: FiCalendar },
  country: { label: '국가', Icon: FiGlobe },
  historicalCountry: { label: '역사 국가', Icon: FiFlag },
  dynasty: { label: '가문', Icon: FiAward },
  organization: { label: '조직', Icon: FiLayers },
  treaty: { label: '조약', Icon: FiFileText },
  militaryUnit: { label: '군부대', Icon: FiShield },
  politicalParty: { label: '정당', Icon: FiBookmark },
  personGroup: { label: '인물 묶음', Icon: FiUsers },
}

/**
 * 상세 경로 — 없으면 null(칩은 누를 수 없는 표지로 남는다). 미리보기 모달이 있는 종류는
 * 호스트가 onOpen으로 가로챈다(인물·국가·사건·가문).
 */
export function entityPath(kind: EntityKind, id: string): string | null {
  switch (kind) {
    case 'person':
      return pathKeys.personsTimelineDetail(id)
    case 'event':
      return pathKeys.events.detail(id)
    case 'country':
    case 'historicalCountry':
      return pathKeys.countryDetail(id)
    case 'treaty':
      return pathKeys.treaties.detail(id)
    case 'personGroup':
      return pathKeys.personGroupDetail(id)
    default:
      return null
  }
}

/** 연결 패널의 묶음 — 배열 순서가 화면 순서 */
export const CONNECTION_GROUPS: ReadonlyArray<{ id: ConnectionGroup; label: string }> = [
  { id: 'polity', label: '국가·정체' },
  { id: 'office', label: '직위' },
  { id: 'lineage', label: '가문' },
  { id: 'family', label: '가족' },
  { id: 'social', label: '관계·묶음' },
  { id: 'event', label: '사건' },
  { id: 'organization', label: '조직·정당' },
  { id: 'treaty', label: '조약' },
  { id: 'military', label: '군사' },
]
