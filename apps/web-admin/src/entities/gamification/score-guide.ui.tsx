import React from 'react'

import { FiPlusCircle, FiStar } from 'react-icons/fi'
import styled from 'styled-components'

/**
 * 점수 획득 안내 — 기본 적립 + 완성도 보너스 규칙을 사용자에게 노출해 등록·보강을 유도.
 * 규칙은 백엔드(point.policy.ts / 각 도메인 service)와 동일하게 유지할 것.
 */
interface GuideRow {
  label: string
  base: string
  bonus: string
}

const ROWS: GuideRow[] = [
  { label: '인물', base: '+30', bonus: '사진 · 약력 · 출생연도' },
  { label: '국가', base: '+30', bonus: '썸네일 · 수도 · 현지어명' },
  { label: '역사적 국가', base: '+30', bonus: '썸네일 · 설명 · 명칭 유래' },
  { label: '사건', base: '+20', bonus: '이미지 · 섹션 · 배경 설명' },
]

export const ScoreGuide: React.FC = () => {
  return (
    <Wrap>
      <Lead>
        <FiPlusCircle size={14} /> 콘텐츠를 등록하면 점수가 쌓이고 등급·뱃지가 올라갑니다.
      </Lead>
      <Rows>
        {ROWS.map((r) => (
          <Row key={r.label}>
            <RowLabel>{r.label}</RowLabel>
            <Base>{r.base}</Base>
            <Bonus>
              <FiStar size={11} /> {r.bonus} 채우면 항목당 +5
            </Bonus>
          </Row>
        ))}
      </Rows>
      <Foot>
        💡 처음 간단히 등록한 뒤 사진·설명을 <b>나중에 채워 수정</b>해도 완성도 보너스를 받을 수 있어요.
      </Foot>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Lead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 84px 44px 1fr;
  align-items: center;
  gap: 10px;
  font-size: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 70px 40px 1fr;
  }
`

const RowLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Base = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary ?? '#6366f1'};
`

const Bonus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Foot = styled.div`
  font-size: 11px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};

  b {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 700;
  }
`
