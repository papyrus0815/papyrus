/**
 * PersonList 전용 스타일 — 인물 도메인에만 있는 조각.
 *
 * 패널·검색행·그룹헤더·행 등 목록 조판은 전부 `@/shared/ui/sidebar-list`(국가 목록과 공용).
 * 여기엔 인물에만 있는 것(군주/국가원수 표식, 상세 필터 유도 배지)만 둔다.
 * 영향력 수치는 공용 행의 metric 슬롯(RowMetricBadge)이 그린다.
 */
import styled from 'styled-components'

import * as S from '@/shared/ui/sidebar-list'

/** 이름 옆 군주(♛)·국가원수(★) 표식 */
export const RoleMark = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 4px;
  line-height: 1;
`

/** 검색·필터 행 아래 유도 배지 줄 (국가 목록의 '과거 국가 N개 보기' 자리) */
/* 유도 줄 조판은 공용 sidebar-list로 승격 — 국가 목록과 같은 코드를 각자 갖고 있었다.
   옛 이름은 호출부를 건드리지 않으려고 그대로 둔다. */
export const DiscoveryRow = S.DiscoveryRow
export const AdvancedFilterBadge = S.DiscoveryBadge
export const BadgeCount = S.DiscoveryBadgeCount
/** 상세 필터가 켜져 있음을 알리는 힌트 (국가의 '연결 안 됨'과 같은 자리) */
export const ActiveAdvancedHint = styled(S.DiscoveryHint).attrs({
  $tone: 'accent' as const,
})``
