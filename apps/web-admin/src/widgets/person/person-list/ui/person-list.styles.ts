/**
 * PersonList 전용 스타일 — 인물 도메인에만 있는 조각.
 *
 * 패널·검색행·그룹헤더·행 등 목록 조판은 전부 `@/shared/ui/sidebar-list`(국가 목록과 공용).
 * 여기엔 인물에만 있는 것(영향력 배지, 군주/국가원수 표식, 상세 필터 유도 배지)만 둔다.
 */
import styled from 'styled-components'

/** 행 우측 영향력 수치 — 국가 행의 자식 수 배지와 같은 자리 */
export const InfluenceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 15px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  flex-shrink: 0;
`

/** 이름 옆 군주(♛)·국가원수(★) 표식 */
export const RoleMark = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 4px;
  line-height: 1;
`

/** 검색·필터 행 아래 유도 배지 줄 (국가 목록의 '과거 국가 N개 보기' 자리) */
export const DiscoveryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

/** 다중 선택·영향력·생존 등 상세 필터를 여는 배지 */
export const AdvancedFilterBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.14)'
        : theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

export const BadgeCount = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 상세 필터가 켜져 있음을 알리는 경고 톤 힌트 (국가의 '연결 안 됨'과 같은 자리) */
export const ActiveAdvancedHint = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.32)' : '#c7d2fe'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.14)' : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#3730a3')};
`
