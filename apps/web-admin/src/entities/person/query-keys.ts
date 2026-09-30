/**
 * Person 쿼리 키 — 정본.
 *
 * api.ts에서 분리한 이유: api.ts는 SDK 클라이언트(api.service → import.meta.env)를 끌어와,
 * 사건 쪽 코드가 인물 캐시를 무효화하려고 personKeys만 import해도 jest에서 모듈이 로드되지
 * 않았다. 키만 담은 이 파일은 의존성이 없다. 기존 경로(@/entities/person/api)도 re-export한다.
 */
export const personKeys = {
  all: ['persons'] as const,
  /** GET /persons/infographic (경량 목록) — ['persons'] 프리픽스라 all 무효화 시 함께 갱신됨 */
  infographic: ['persons', 'infographic'] as const,
  /** GET /persons/:id (요약) */
  detail: (id: string) => ['persons', id] as const,
  /** GET /persons/:id/detail (관계·재임 등 포함 상세) */
  detailFull: (id: string) => ['person-detail', id] as const,
  /** person-detail prefix 전체 (모달 스택의 다른 personId 상세까지 broad invalidate용) */
  detailFullAll: ['person-detail'] as const,
  /** 가계도 (다른 인물 상세에 박힌 가족 노드 profileImageUrl 공유) */
  familyTree: ['person-family-tree'] as const,
  /** 동시대 수장 스트립 */
  contemporaries: ['person-contemporaries'] as const,
  /** 같은 국가 전/후 재위(승계) */
  reignAdjacency: ['person-reign-adjacency'] as const,
  /** 국가 대시보드 인물 통계 */
  byCountry: ['persons-by-country'] as const,
  /** 가문 구성원 */
  byDynasty: ['persons-by-dynasty'] as const,
  /** 국가 상세 수장 섹션 */
  byTenureCountry: ['persons-by-tenure-country'] as const,
  /** GET /persons/dashboard/person-counts-by-modern-country */
  modernCountryPersonCounts: ['persons', 'modern-country-person-counts'] as const,
}
