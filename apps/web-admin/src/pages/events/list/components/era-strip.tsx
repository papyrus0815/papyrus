/**
 * 시대 띠 — 사건 목록 머리의 개관 한 줄.
 *
 * 목록은 32,245px(행 수에 비례)라 '어느 시대에 무엇이 몰려 있나, 큰 사건이 어느 기간을 덮나'를 스크롤로만
 * 알 수 있었다. 프랑스 혁명까지 15,110px. 이 띠는 전 시대를 한 줄에 놓는다(2026-11-08 인포그래픽 검토 A):
 *
 * - 세기마다 같은 폭의 칸, 칸 안 10년 막대 = 그 10년에 시작한 사건 수(하위 포함)
 * - 위쪽 가는 선 = 묶음 사건(전쟁·혁명)의 기간 — 겹치면 줄을 나눈다
 * - 옅은 창 = 지금 목록 화면에 보이는 해들
 * - 10년 막대를 누르면 목록이 그 해(가장 가까운 연 머리)로 간다
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import styled from 'styled-components'

import { parseIsoDateParts } from '@/shared/lib/iso-date'

import type { HistoricalEvent } from '../../create/events.types'
import { metaText } from '../../styles/theme'
import {
  buildEraAxis,
  centuryLabel,
  centuryOf,
  decadeIndex,
  decadeMidYear,
  packLanes,
} from '../lib/era-strip.lib'

const SPAN_LANES = 3
const YEAR_HEADING_PREFIX = 'events-year-'

const yearOf = (iso?: string | null) => parseIsoDateParts(iso)?.year ?? null

/** 목록에서 그 해(없으면 가장 가까운 해)의 연 머리로 — 접힌 세기 안이면 머리가 없어 가장 가까운 보이는 해로 간다 */
function jumpToYear(target: number) {
  const headings = [...document.querySelectorAll<HTMLElement>(`[id^="${YEAR_HEADING_PREFIX}"]`)]
  let best: { element: HTMLElement; distance: number } | null = null
  for (const element of headings) {
    const year = Number(element.id.slice(YEAR_HEADING_PREFIX.length))
    if (!Number.isFinite(year)) continue
    const distance = Math.abs(year - target)
    if (!best || distance < best.distance) best = { element, distance }
  }
  best?.element.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

export function EraStrip({ events }: { events: ReadonlyArray<HistoricalEvent> }) {
  const model = useMemo(() => {
    const starts: Array<{ year: number }> = []
    const spans: Array<{ id: string; title: string; from: number; to: number }> = []
    for (const event of events) {
      const from = yearOf(event.startDate)
      if (from == null) continue
      starts.push({ year: from })
      if (event.kind === 'COLLECTION' && !event.parentEventId) {
        const to = yearOf(event.endDate) ?? from
        spans.push({ id: event.id, title: event.title, from, to: Math.max(to, from) })
      }
    }
    const axis = buildEraAxis(starts.map((start) => start.year))
    if (!axis) return null
    const decades = new Map<string, number>()
    for (const { year } of starts) {
      const key = `${centuryOf(year)}:${decadeIndex(year)}`
      decades.set(key, (decades.get(key) ?? 0) + 1)
    }
    const peak = Math.max(1, ...decades.values())
    const lanes = packLanes(
      spans.map((span) => ({
        ...span,
        left: axis.toPct(span.from),
        /* 한 해짜리 묶음도 보이게 최소 폭 */
        right: Math.max(axis.toPct(span.to + 1), axis.toPct(span.from) + 0.25),
      })),
      SPAN_LANES,
    )
    return { axis, decades, peak, lanes }
  }, [events])

  /* 지금 목록 화면에 보이는 해들 — 연 머리의 위치로 잰다(스크롤은 버블되지 않아 캡처로 듣는다) */
  const stripRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState<[number, number] | null>(null)
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const top = stripRef.current?.getBoundingClientRect().bottom ?? 0
      const bottom = window.innerHeight
      const years: number[] = []
      let lastAbove: number | null = null
      for (const element of document.querySelectorAll<HTMLElement>(`[id^="${YEAR_HEADING_PREFIX}"]`)) {
        const year = Number(element.id.slice(YEAR_HEADING_PREFIX.length))
        if (!Number.isFinite(year)) continue
        const rect = element.getBoundingClientRect()
        if (rect.top < top) lastAbove = year
        else if (rect.top <= bottom) years.push(year)
      }
      /* 화면 위로 지나간 마지막 머리의 해도 지금 읽는 해다 */
      if (lastAbove != null) years.push(lastAbove)
      setVisible(years.length ? [Math.min(...years), Math.max(...years)] : null)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    schedule()
    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    const timer = window.setInterval(schedule, 1500)
    return () => {
      document.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      window.clearInterval(timer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  if (!model) return null
  const { axis, decades, peak, lanes } = model
  const windowLeft = visible ? axis.toPct(visible[0]) : null
  const windowRight = visible ? axis.toPct(visible[1] + 1) : null

  return (
    <Strip ref={stripRef} aria-label="시대 띠 — 세기별 사건 분포와 큰 사건의 기간">
      <Spans aria-hidden="true" style={{ height: `${SPAN_LANES * 5}px` }}>
        {lanes.map((span) => (
          <SpanLine
            key={span.id}
            title={`${span.title} · ${span.from < 0 ? `BC ${-span.from}` : span.from}–${span.to < 0 ? `BC ${-span.to}` : span.to}`}
            style={{ left: `${span.left}%`, width: `${span.right - span.left}%`, top: `${span.lane * 5}px` }}
          />
        ))}
      </Spans>
      <Bars>
        {windowLeft != null && windowRight != null && (
          <Window aria-hidden="true" style={{ left: `${windowLeft}%`, width: `${Math.max(0.6, windowRight - windowLeft)}%` }} />
        )}
        {axis.slots.map((slot) =>
          slot.kind === 'gap' ? (
            <Gap
              key={`gap-${slot.century}`}
              style={{ left: `${slot.left}%`, width: `${slot.width}%` }}
              title={`사건 없는 ${slot.skipped}개 세기`}
              aria-hidden="true"
            >
              ⋯
            </Gap>
          ) : (
            <Century key={slot.century} style={{ left: `${slot.left}%`, width: `${slot.width}%` }}>
              {Array.from({ length: 10 }, (unusedSlot, index) => {
                const count = decades.get(`${slot.century}:${index}`) ?? 0
                const year = decadeMidYear(slot.century, index)
                const label = `${centuryLabel(slot.century)}세기 ${index === 0 ? '첫 10년' : `${index * 10}년대`}`
                return (
                  <Decade
                    key={index}
                    type="button"
                    disabled={count === 0}
                    onClick={() => jumpToYear(year)}
                    title={count ? `${label} — ${count}건 · 눌러서 그 해로` : undefined}
                    aria-label={count ? `${label} ${count}건, 목록에서 그 해로 가기` : undefined}
                    tabIndex={count ? 0 : -1}
                  >
                    {count > 0 && <span style={{ height: `${Math.max(12, Math.sqrt(count / peak) * 100)}%` }} />}
                  </Decade>
                )
              })}
            </Century>
          ),
        )}
      </Bars>
      <Labels aria-hidden="true">
        {axis.slots
          .filter((slot) => slot.kind === 'century')
          .map((slot, index, centuries) => (
            <span key={slot.century} style={{ left: `${slot.left + slot.width / 2}%` }}>
              {centuryLabel(slot.century)}
              {/* 단위는 마지막 칸에 한 번 — 칸마다 '세기'를 붙이면 숫자가 묻힌다 */}
              {index === centuries.length - 1 && '세기'}
            </span>
          ))}
      </Labels>
    </Strip>
  )
}

/* ── styled ── */

const Strip = styled.div`
  flex-shrink: 0;
  margin: 0 0 6px;
  padding: 8px 12px 4px;
  border-radius: 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(20,19,34,0.025)')};

  @media (max-width: 640px) {
    display: none;
  }
`

const Spans = styled.div`
  position: relative;
`

/** 묶음 사건 기간 — 가는 선. 진하지 않게(막대가 주인공) */
const SpanLine = styled.span`
  position: absolute;
  height: 3px;
  min-width: 3px;
  border-radius: 2px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(165,180,252,0.55)' : 'rgba(79,70,229,0.45)')};
`

const Bars = styled.div`
  position: relative;
  height: 34px;
  margin-top: 4px;
  border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(20,19,34,0.12)')};
`

/** 지금 화면 — 옅은 면 + 위아래 테두리 없이 좌우만 */
const Window = styled.span`
  position: absolute;
  top: -22px;
  bottom: -1px;
  border-left: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  border-right: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.07)')};
  pointer-events: none;
  transition: left 0.15s ease, width 0.15s ease;
`

const Gap = styled.span`
  position: absolute;
  bottom: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 11px;
  color: ${metaText};
  opacity: 0.7;
`

const Century = styled.div`
  position: absolute;
  bottom: 0;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  padding: 0 1px;
  border-left: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,34,0.06)')};
`

const Decade = styled.button`
  position: relative;
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  span {
    display: block;
    width: 100%;
    border-radius: 2px 2px 0 0;
    background: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#71717a')};
  }

  &:hover:not(:disabled) span,
  &:focus-visible span {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#e4e4e7' : '#18181b')};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#4f46e5')};
    outline-offset: 1px;
  }
`

const Labels = styled.div`
  position: relative;
  height: 15px;
  font-size: 10px;
  line-height: 15px;
  color: ${metaText};
  font-variant-numeric: tabular-nums;

  span {
    position: absolute;
    transform: translateX(-50%);
    white-space: nowrap;
  }
`
