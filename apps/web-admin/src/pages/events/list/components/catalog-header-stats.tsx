/**
 * 인라인 통계 스트립 — 표의 '사건' 열 머리글이 싣는 한 줄 요약.
 *
 * 한때 도구줄(보기 행)에도 같은 스트립이 섰다. 표가 없는 뷰(격자·통계·지도…)에는
 * 머리글이 없었기 때문인데, 그 뷰들이 사라지면서 자리도 하나로 합쳐졌다 —
 * 숫자가 설명하는 대상이 바로 아래 표이므로 원래 자리가 이쪽이다.
 *
 * 이전엔 PageHeader 우측에 별도 KPI chip 그룹이었으나, 사용자 시선 부담과
 * ViewMeta(표시/전체 카운트)와의 정보 중복 때문에 한 줄로 융합. 이제 다음과 같이 노출:
 *
 *   표시 1,247건 · 정치 47
 *
 * (제거) 최다 카테고리 'TOP 1' — 라벨 없이 '● 전쟁/군사 62'로 열 머리글에 끼어 흘린 조각처럼
 * 읽혔다(2026-09-25). 건수(N건)만 남긴다.
 *
 * 중요도(핵심·주요) 칩은 **제거됐다**(2026-07-28 검토 M9) — importance는 스키마·DTO에
 * 없는 값이라 transformer가 전부 'notable'로 채웠고, 그래서 이 칩은 단 한 번도 렌더된
 * 적이 없다. 실재하지 않는 집계를 지운다.
 *
 * 모수 규약: `events`는 **총계와 같은 모수**여야 한다(검토 IA-13).
 */
import React from 'react'

import styled from 'styled-components'

import type { EventCategoryDto } from '@/shared/api/event-categories'

import type { HistoricalEvent } from '../../create/events.types'
import { metaText } from '../../styles/theme'

interface Props {
  events: HistoricalEvent[]
  /** (미사용) 최다 카테고리 표기를 걷어낸 뒤 남은 prop — 호출부 호환을 위해 둔다 */
  dbCategories?: EventCategoryDto[]
  /** 필터를 만족하는 사건 수 — undefined(미필터)면 serverTotal/events.length로 폴백 */
  visibleCount?: number
  /** 서버 권위 총개수(최상위 기준) — 미필터 상태의 "N건" */
  serverTotal?: number
  /**
   * 필터 중일 때 함께 보여 줄 **모수** — '조건 일치 N건'만으로는 N이 큰지 작은지 모른다.
   * 앞 숫자와 모수가 다르므로(조건 일치 vs 등록 전체) 반드시 라벨을 붙여 구별한다.
   */
  authoritativeTotal?: number
}

export const CatalogHeaderStats: React.FC<Props> = ({
  events,
  visibleCount,
  serverTotal,
  authoritativeTotal,
}) => {

  if (events.length === 0) return null

  // 필터 중이면 조건을 만족하는 사건 수, 아니면 서버 권위 총량(없으면 로드된 수)
  const isFiltered = visibleCount !== undefined
  const total = visibleCount ?? serverTotal ?? events.length

  return (
    <Strip aria-label="등록 사건 분포">
      <Total
        title={
          isFiltered
            ? '현재 조건을 만족하는 사건 수'
            : '등록된 최상위 사건 수(하위 사건은 별도)'
        }
      >
        {isFiltered && <TotalPrefix>조건 일치</TotalPrefix>}
        <strong>{total.toLocaleString()}</strong>건
      </Total>
      {isFiltered && authoritativeTotal !== undefined && (
        <TotalHint title="등록된 최상위 사건 수(필터 적용 전). 앞의 숫자는 현재 조건을 만족하는 사건 수이므로 모수가 다릅니다.">
          / 등록 전체 {authoritativeTotal.toLocaleString()}건(최상위)
        </TotalHint>
      )}
    </Strip>
  )
}

const Strip = styled.div`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  color: ${metaText};
`

const Total = styled.span`
  font-weight: 500;
  color: ${metaText};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-right: 1px;
  }
`

const TotalPrefix = styled.span`
  margin-right: 4px;
  font-weight: 500;
  color: ${metaText};
`



const TotalHint = styled.span`
  font-weight: 500;
  color: ${metaText};
  opacity: 0.9;
`

