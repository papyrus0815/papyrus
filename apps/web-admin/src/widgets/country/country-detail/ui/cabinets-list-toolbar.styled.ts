/**
 * 행정부·내각 목록 툴바의 작은 부품 — 정치체 고르기 칸 폭, 보기·정렬 세그먼트 묶음.
 * (cabinets-section.styled.tsx는 4,500줄이라 새 부품은 여기 따로 둔다)
 */
import styled from 'styled-components'

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
