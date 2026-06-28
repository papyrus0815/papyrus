/**
 * 재무 모듈 공용 토널 배지 — RatingPill/StancePill/PeriodBadge/DistChip/ImpactDot/
 * ChangeTag/Revision이 모듈마다 거의 동일하게 재정의되던 것을 3종으로 통합.
 * 색은 [[financial-tone]] 단일 출처(theme.mode로 light/dark 분기).
 */
import styled from 'styled-components'

import { type Tone, toneColor, toneSoftBg } from './financial-tone'

/** 라운드 칩(soft 배경) — 투자의견·방향·기간 등락·의견 분포 칩. */
export const TonePill = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
  color: ${({ theme, $tone }) => toneColor($tone, theme.mode === 'dark')};
  background: ${({ theme, $tone }) => toneSoftBg($tone, theme.mode === 'dark')};
`

/** 작은 색 점 — 핵심 변수 호재/악재 표시. */
export const ToneDot = styled.span<{ $tone: Tone }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $tone }) => toneColor($tone, theme.mode === 'dark')};
`

/** 아이콘+텍스트 인라인 강조(배경 없음) — 등락(▲/▼)·상향/하향. */
export const ToneTag = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) => toneColor($tone, theme.mode === 'dark')};

  span {
    font-weight: 500;
    opacity: 0.85;
  }
`
