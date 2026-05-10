import { useMemo } from 'react'

import { FiBookmark, FiCalendar, FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import type { YearRange } from '../model/types'
import type { UserTimePreset } from '../model/use-user-presets'
import { formatYear } from '../lib/format-year'

interface Props {
  range: YearRange
  onRangeChange: (next: YearRange) => void
  /** 가이드라인이 꽂혀 있으면 그 연도를 줌 중심으로 사용 — 사용자가 본 시점을 잃지 않도록 */
  zoomAnchorYear?: number | null
  /** 사건 오버레이 핀 개수 — 0이면 "추가" 라벨, 1+면 N개 표시 */
  eventOverlayCount?: number
  onOpenEventOverlay?: () => void
  /** 사용자 저장 시대 — 이름 + range로 빠른 점프 */
  userPresets?: UserTimePreset[]
  onSaveUserPreset?: (label: string, range: YearRange) => void
  onRemoveUserPreset?: (id: string) => void
}

interface ErasPreset {
  id: string
  label: string
  range: YearRange
}

const PRESETS: ErasPreset[] = [
  { id: 'ancient', label: '고대', range: { startYear: -800, endYear: 500 } },
  { id: 'medieval', label: '중세', range: { startYear: 500, endYear: 1500 } },
  { id: 'early-modern', label: '근세', range: { startYear: 1500, endYear: 1800 } },
  { id: 'modern', label: '근현대', range: { startYear: 1800, endYear: 2030 } },
  { id: 'contemporary', label: '현대', range: { startYear: 1900, endYear: 2030 } },
]

/**
 * 시간축 줌 + 시대 프리셋 컨트롤.
 * - 시대 버튼: 클릭 시 해당 범위로 점프
 * - 줌 슬라이더: 현재 범위의 중심을 유지하며 span을 늘리고 줄임
 */
export function RangeControls({
  range,
  onRangeChange,
  zoomAnchorYear,
  eventOverlayCount = 0,
  onOpenEventOverlay,
  userPresets = [],
  onSaveUserPreset,
  onRemoveUserPreset,
}: Props) {
  const span = range.endYear - range.startYear
  const center =
    zoomAnchorYear != null && zoomAnchorYear >= range.startYear && zoomAnchorYear <= range.endYear
      ? zoomAnchorYear
      : (range.startYear + range.endYear) / 2

  // 슬라이더 값 = log scale로 span에 매핑 (10년 ~ 4000년)
  const MIN_SPAN = 30
  const MAX_SPAN = 4000
  const sliderValue = useMemo(() => {
    const t =
      (Math.log(span) - Math.log(MIN_SPAN)) /
      (Math.log(MAX_SPAN) - Math.log(MIN_SPAN))
    return Math.round(Math.max(0, Math.min(1, t)) * 100)
  }, [span])

  const setSpanFromSlider = (v: number) => {
    const t = v / 100
    const nextSpan = Math.exp(
      Math.log(MIN_SPAN) + t * (Math.log(MAX_SPAN) - Math.log(MIN_SPAN)),
    )
    const half = nextSpan / 2
    onRangeChange({
      startYear: Math.round(center - half),
      endYear: Math.round(center + half),
    })
  }

  // 정확히 일치하지 않아도 현재 범위의 중심이 들어가는 프리셋을 active로 — 컨텍스트 단서 유지
  const exactPresetId = PRESETS.find(
    (p) => p.range.startYear === range.startYear && p.range.endYear === range.endYear,
  )?.id
  const rangeCenter = (range.startYear + range.endYear) / 2
  const containingPresetId = PRESETS.find(
    (p) => rangeCenter >= p.range.startYear && rangeCenter <= p.range.endYear,
  )?.id
  const activePresetId = exactPresetId ?? containingPresetId

  return (
    <Wrap>
      <PresetGroup>
        {PRESETS.map((p) => (
          <PresetButton
            key={p.id}
            type="button"
            $active={activePresetId === p.id}
            onClick={() => onRangeChange(p.range)}
          >
            {p.label}
          </PresetButton>
        ))}
      </PresetGroup>
      <ZoomGroup>
        <ZoomLabel>줌</ZoomLabel>
        <ZoomSlider
          type="range"
          min={0}
          max={100}
          value={sliderValue}
          onChange={(e) => setSpanFromSlider(Number(e.target.value))}
          aria-label="시간축 줌"
          title={`현재 ${span}년 표시 · Ctrl+휠로도 줌`}
        />
        <ZoomReadout>
          {formatYearShort(range.startYear)} – {formatYearShort(range.endYear)}
        </ZoomReadout>
      </ZoomGroup>
      {onOpenEventOverlay && (
        <EventBtn type="button" onClick={onOpenEventOverlay}>
          <FiCalendar size={12} />
          사건 오버레이
          {eventOverlayCount > 0 && <CountBadge>{eventOverlayCount}</CountBadge>}
        </EventBtn>
      )}
      {onSaveUserPreset && (
        <UserPresetGroup>
          {userPresets.map((p) => (
            <UserPreset key={p.id}>
              <UserPresetMain
                type="button"
                onClick={() => onRangeChange(p.range)}
                title={`${p.range.startYear} – ${p.range.endYear}`}
              >
                <FiBookmark size={10} />
                <span>{p.label}</span>
              </UserPresetMain>
              {onRemoveUserPreset && (
                <UserPresetRemove
                  type="button"
                  aria-label={`${p.label} 삭제`}
                  onClick={() => onRemoveUserPreset(p.id)}
                >
                  <FiX size={10} />
                </UserPresetRemove>
              )}
            </UserPreset>
          ))}
          <SavePresetBtn
            type="button"
            onClick={() => {
              const label = window.prompt(
                '시대 별명 (예: "조선 후기")',
                `${formatYearShort(range.startYear)}–${formatYearShort(range.endYear)}`,
              )
              if (label && label.trim()) {
                onSaveUserPreset(label.trim(), range)
              }
            }}
            title="현재 줌을 별명으로 저장"
          >
            <FiBookmark size={11} /> 저장
          </SavePresetBtn>
        </UserPresetGroup>
      )}
    </Wrap>
  )
}

function formatYearShort(year: number): string {
  return formatYear(year, { compact: true })
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const PresetGroup = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 2px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const PresetButton = styled.button<{ $active: boolean }>`
  padding: 5px 12px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.primary};
    `}
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const ZoomGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 280px;
  max-width: 500px;
`

const ZoomLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ZoomSlider = styled.input`
  flex: 1;
  height: 4px;
  border-radius: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: ${({ theme }) => theme.colors.border.light};
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    border: none;
    cursor: pointer;
  }
`

const ZoomReadout = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const EventBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
`

const UserPresetGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const UserPreset = styled.span`
  display: inline-flex;
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 999px;
  overflow: hidden;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const UserPresetMain = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const UserPresetRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 22px;
  border: none;
  border-left: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #b91c1c;
  }
`

const SavePresetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`
