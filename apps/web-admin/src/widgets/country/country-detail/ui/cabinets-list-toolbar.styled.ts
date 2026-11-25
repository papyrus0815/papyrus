/**
 * 행정부·내각 목록 툴바의 작은 부품 — 정치체 고르기 칸 폭, 보기·정렬 세그먼트 묶음.
 * (cabinets-section.styled.tsx는 4,500줄이라 새 부품은 여기 따로 둔다)
 */
import styled from 'styled-components'

import { CabListSearchBox } from './cabinets-section.styled'

export const PolitySelectWrap = styled.div`
  flex: 0 1 220px;
  min-width: 160px;

  @media (max-width: 640px) {
    flex: 1 1 100%;
  }
`

/** 보기(연표·원장) · 정렬(과거순·최신순) 두 세그먼트 */
export const SegmentWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  > [role='radiogroup'] {
    flex-wrap: nowrap;
  }
`

export const SegmentLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
`

export const RegisterLabel = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`

/**
 * 툴바 폭 기준으로 줄을 나눈다 — 좁아지면(≤940px) 검색이 첫 줄을 다 쓰고, 둘째 줄은 정치체(왼쪽)와
 * 보기·정렬·등록(오른쪽)이 나눠 쓴다. 예전엔 오른쪽 묶음만 둘째 줄로 떨어져 그 줄 왼쪽이 통째로 비었다.
 */
export const ToolbarContainer = styled.div`
  container-type: inline-size;
  width: 100%;

  @container (max-width: 940px) {
    ${CabListSearchBox} {
      flex: 1 1 100%;
    }
  }
`
