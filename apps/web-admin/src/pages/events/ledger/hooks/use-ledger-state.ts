/**
 * Ledger 페이지의 UI 상태:
 *  - lens 칩 (다중 AND 결합)
 *  - 피벗 (시간 / 국가 / 카테고리 / 인물 / 품질)
 *  - 인라인 확장 행 (한 번에 하나)
 *  - ⌘K 팔레트 열림 여부
 *
 * URL ↔ 상태 양방향 동기화. 키보드:
 *  ⌘K → 팔레트, Esc → 팔레트/확장 닫기, 1~5 → 피벗 전환.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useSearchParams } from 'react-router-dom'

import {
  type LensChip,
  parseLens,
  stringifyLens,
} from '../types/lens'

export const PIVOT = {
  TIME: 'time',
  COUNTRY: 'country',
  CATEGORY: 'category',
  PERSON: 'person',
  QUALITY: 'quality',
} as const

export type Pivot = (typeof PIVOT)[keyof typeof PIVOT]

const isPivot = (val: string | null): val is Pivot =>
  val === 'time' || val === 'country' || val === 'category' || val === 'person' || val === 'quality'

export function useLedgerState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [lens, setLens] = useState<LensChip[]>(() => parseLens(searchParams.get('lens')))
  const [pivot, setPivot] = useState<Pivot>(() => {
    const param = searchParams.get('pivot')
    return isPivot(param) ? param : PIVOT.TIME
  })
  const [expandedEventId, setExpandedEventId] = useState<string | null>(
    searchParams.get('open'),
  )
  const [paletteOpen, setPaletteOpen] = useState(false)

  /**
   * 상태 → URL.
   * lens·pivot 변경은 history push (뒤로가기로 칩 추가 이전 상태로 돌아가야 함),
   * expandedEventId만 변경되는 경우는 replace (인라인 확장은 가벼운 UI 상태).
   */
  const prevSerialized = useRef<{ lens: string; pivot: string }>({
    lens: stringifyLens(lens),
    pivot,
  })

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    const setOrDel = (key: string, val: string | null | undefined, def?: string) => {
      if (val && val !== def) next.set(key, val)
      else next.delete(key)
    }
    const lensStr = stringifyLens(lens)
    setOrDel('lens', lensStr || null)
    setOrDel('pivot', pivot, PIVOT.TIME)
    setOrDel('open', expandedEventId)
    if (next.toString() === searchParams.toString()) return

    const navChanged =
      prevSerialized.current.lens !== lensStr ||
      prevSerialized.current.pivot !== pivot
    prevSerialized.current = { lens: lensStr, pivot }
    setSearchParams(next, { replace: !navChanged })
  }, [lens, pivot, expandedEventId, searchParams, setSearchParams])

  /** lens 칩 조작 — 같은 kind는 1개만 (decade·century 동시 활성 불가) */
  const addLens = useCallback((chip: LensChip) => {
    setLens((prev) => {
      if (prev.some((existing) => existing.kind === chip.kind && existing.value === chip.value)) return prev
      const filtered = prev.filter((existing) => existing.kind !== chip.kind)
      return [...filtered, chip]
    })
  }, [])

  const removeLens = useCallback((kind: LensChip['kind'], value: string) => {
    setLens((prev) => prev.filter((chip) => !(chip.kind === kind && chip.value === value)))
  }, [])

  const clearLens = useCallback(() => setLens([]), [])

  /** 인라인 확장 — 한 번에 하나 */
  const toggleExpand = useCallback((eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId))
  }, [])

  /**
   * 키보드 — ⌘K · Esc · 1~5.
   * 의존하는 상태(paletteOpen, expandedEventId)는 ref로 참조해 리스너를 한 번만 등록한다.
   */
  const stateRef = useRef({ paletteOpen, expandedEventId })
  stateRef.current = { paletteOpen, expandedEventId }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const editable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target?.isContentEditable ?? false)

      const isMod = event.metaKey || event.ctrlKey
      if (isMod && event.key === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }

      if (event.key === 'Escape') {
        if (stateRef.current.paletteOpen) setPaletteOpen(false)
        else if (stateRef.current.expandedEventId) setExpandedEventId(null)
        return
      }

      if (!isMod && !editable && /^[1-5]$/.test(event.key)) {
        const pivotMap: Record<string, Pivot> = {
          '1': PIVOT.TIME,
          '2': PIVOT.COUNTRY,
          '3': PIVOT.CATEGORY,
          '4': PIVOT.PERSON,
          '5': PIVOT.QUALITY,
        }
        const nextPivot = pivotMap[event.key]
        if (nextPivot) {
          event.preventDefault()
          setPivot(nextPivot)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return {
    lens,
    setLens,
    addLens,
    removeLens,
    clearLens,
    pivot,
    setPivot,
    expandedEventId,
    setExpandedEventId,
    toggleExpand,
    paletteOpen,
    setPaletteOpen,
  }
}
