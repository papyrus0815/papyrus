/**
 * 연도 스크러버 — "이 해에 누가 있었나"를 1년씩 넘겨 보는 공용 컨트롤.
 *
 * 슬라이더 · ±한 걸음 · 자동 재생 · 걸음 크기(1/5/10년) · 분수령 칩.
 * 값은 호출부가 소유한다(제어 컴포넌트). `value`가 null이면 아직 연도를 고르지 않은 상태 —
 * 첫 조작(재생·한 걸음·슬라이더)이 `min`부터 시작한다.
 *
 * 수장 비교 연표(가이드라인 연도)와 수장 지도 아틀라스가 같은 컨트롤을 쓴다.
 */
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { FiChevronLeft, FiChevronRight, FiPause, FiPlay } from 'react-icons/fi'
import styled, { css } from 'styled-components'

export interface YearScrubberMilestone {
  id: string
  year: number
  label: string
}

interface Props {
  value: number | null
  min: number
  max: number
  onChange: (year: number) => void
  /** 슬라이더 우측에 붙는 요약·토글 (예: "동시 재위 9명", 비교표 버튼) */
  trailing?: ReactNode
  /** 칩으로 점프하는 분수령 연도 — 비면 칩 줄을 그리지 않는다 */
  milestones?: YearScrubberMilestone[]
  /** 재생 한 틱(ms) */
  intervalMs?: number
}

const STEP_OPTIONS = [1, 5, 10] as const
type StepOption = (typeof STEP_OPTIONS)[number]

export function formatScrubberYear(year: number): string {
  return year < 0 ? `BC ${Math.abs(year)}` : String(year)
}

/** 축 눈금 — 범위를 4~6칸으로 나누는 '깔끔한' 간격 */
function buildTicks(min: number, max: number): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
  const stepSize = candidates.find((candidate) => span / candidate <= 6) ?? 1000
  const ticks: number[] = []
  const first = Math.ceil(min / stepSize) * stepSize
  for (let year = first; year <= max; year += stepSize) ticks.push(year)
  return ticks
}

export function YearScrubber({
  value,
  min,
  max,
  onChange,
  trailing,
  milestones,
  intervalMs = 380,
}: Props) {
  const [playing, setPlaying] = useState(false)
  const [stepSize, setStepSize] = useState<StepOption>(1)
  const valueRef = useRef(value)
  valueRef.current = value

  const clamp = useCallback(
    (year: number) => Math.min(max, Math.max(min, Math.round(year))),
    [min, max],
  )

  // 재생 — 매 틱 최신 값에서 한 걸음. 끝에 닿으면 멈춘다.
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const current = valueRef.current ?? min
      if (current >= max) {
        setPlaying(false)
        return
      }
      onChange(clamp(current + stepSize))
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [playing, stepSize, intervalMs, min, max, clamp, onChange])

  // 범위가 바뀌어 값이 밖으로 나가면 재생을 끊는다 (줌 아웃 중 재생 폭주 방지)
  useEffect(() => {
    if (value != null && (value < min || value > max)) setPlaying(false)
  }, [value, min, max])

  const togglePlay = () => {
    if (playing) {
      setPlaying(false)
      return
    }
    // 끝에서 재생 = 처음부터 다시
    if (value == null || value >= max) onChange(min)
    setPlaying(true)
  }

  const step = (direction: -1 | 1) => {
    setPlaying(false)
    const base = value ?? (direction > 0 ? min - stepSize : max + stepSize)
    onChange(clamp(base + direction * stepSize))
  }

  const ticks = useMemo(() => buildTicks(min, max), [min, max])
  const span = Math.max(1, max - min)
  const visibleMilestones = (milestones ?? []).filter(
    (milestone) => milestone.year >= min && milestone.year <= max,
  )

  return (
    <Wrap>
      <Row>
        <ButtonCluster>
          <StepButton
            type="button"
            onClick={() => step(-1)}
            disabled={value != null && value <= min}
            aria-label={`${stepSize}년 전`}
            title={`${stepSize}년 전`}
          >
            <FiChevronLeft size={15} />
          </StepButton>
          <PlayButton
            type="button"
            $playing={playing}
            onClick={togglePlay}
            aria-pressed={playing}
            aria-label={playing ? '재생 멈춤' : '연도 자동 재생'}
          >
            {playing ? <FiPause size={13} /> : <FiPlay size={13} />}
            <span>{playing ? '멈춤' : '재생'}</span>
          </PlayButton>
          <StepButton
            type="button"
            onClick={() => step(1)}
            disabled={value != null && value >= max}
            aria-label={`${stepSize}년 후`}
            title={`${stepSize}년 후`}
          >
            <FiChevronRight size={15} />
          </StepButton>
        </ButtonCluster>

        <Readout aria-live={playing ? 'off' : 'polite'}>
          <strong>{value != null ? formatScrubberYear(value) : '—'}</strong>
          <span>년</span>
        </Readout>

        <SliderColumn>
          <Slider
            type="range"
            min={min}
            max={max}
            step={1}
            value={value ?? min}
            $unset={value == null}
            onChange={(event) => {
              setPlaying(false)
              onChange(clamp(Number(event.target.value)))
            }}
            aria-label="기준 연도"
            aria-valuetext={
              value != null ? `${formatScrubberYear(value)}년` : '연도 미선택'
            }
          />
          <Ticks aria-hidden>
            {ticks.map((tick) => (
              <Tick
                key={tick}
                style={{ left: `${((tick - min) / span) * 100}%` }}
              >
                {formatScrubberYear(tick)}
              </Tick>
            ))}
          </Ticks>
        </SliderColumn>

        <StepGroup role="radiogroup" aria-label="한 걸음 크기">
          {STEP_OPTIONS.map((option) => (
            <StepChip
              key={option}
              type="button"
              role="radio"
              aria-checked={stepSize === option}
              $active={stepSize === option}
              onClick={() => setStepSize(option)}
            >
              {option}년
            </StepChip>
          ))}
        </StepGroup>

        {trailing && <Trailing>{trailing}</Trailing>}
      </Row>

      {visibleMilestones.length > 0 && (
        <Milestones aria-label="분수령 연도로 이동">
          {visibleMilestones.map((milestone) => (
            <MilestoneChip
              key={milestone.id}
              type="button"
              $active={value === milestone.year}
              onClick={() => {
                setPlaying(false)
                onChange(milestone.year)
              }}
            >
              <b>{formatScrubberYear(milestone.year)}</b>
              <span>{milestone.label}</span>
            </MilestoneChip>
          ))}
        </Milestones>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`

const ButtonCluster = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const StepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const PlayButton = styled.button<{ $playing: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  ${({ $playing, theme }) =>
    $playing &&
    css`
      background: ${theme.colors.background.primary};
      color: ${theme.colors.primary};
    `}
`

const Readout = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  min-width: 84px;
  font-variant-numeric: tabular-nums;
  strong {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SliderColumn = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;
  padding-bottom: 16px;
`

const Slider = styled.input<{ $unset: boolean }>`
  width: 100%;
  height: 4px;
  border-radius: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: ${({ theme }) => theme.colors.border.medium};
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.colors.background.primary};
    background: ${({ theme, $unset }) =>
      $unset ? theme.colors.text.tertiary : '#ef4444'};
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
    cursor: grab;
  }
  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.colors.background.primary};
    background: ${({ theme, $unset }) =>
      $unset ? theme.colors.text.tertiary : '#ef4444'};
    cursor: grab;
  }
  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }
`

const Ticks = styled.div`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 14px;
`

const Tick = styled.span`
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const StepGroup = styled.div`
  display: inline-flex;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const StepChip = styled.button<{ $active: boolean }>`
  padding: 3px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.primary};
    `}
`

const Trailing = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

/* 한 줄 가로 스크롤 — 칩이 수십 개여도 스크러버 높이가 변하지 않는다 */
const Milestones = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
  > * {
    flex-shrink: 0;
  }
`

const MilestoneChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  max-width: 260px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  cursor: pointer;
  b {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  ${({ $active, theme }) =>
    $active &&
    css`
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
      b {
        color: #ef4444;
      }
    `}
`
