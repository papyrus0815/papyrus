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

/** 현재 보고 있는 인물 기준 1클릭 문맥 필터 토글 칩 (같은 국가 · 같은 왕조) */
export const ContextFilterChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 148px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.45)'
          : '#a5b4fc'
        : S.sidebarLine(theme)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.18)'
        : '#eef2ff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.colors.text.tertiary};

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? '#c7d2fe'
          : '#3730a3'
        : theme.colors.primary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.24)'
          : '#e0e7ff'
        : S.sidebarFill(theme)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`

/** 상세 필터로 걸린 개별 조건 해제 칩 (예: 프랑스 ×, 군사 ×) */
export const ActiveFilterChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 132px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#3730a3')};
  transition: background 0.14s ease, border-color 0.14s ease;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.24)' : '#e0e7ff'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 1px;
  }
`
