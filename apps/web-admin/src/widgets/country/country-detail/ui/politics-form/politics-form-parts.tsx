/**
 * 선거·정당 등록 모달 부품 — **사건 등록 폼의 실제 부품**을 그대로 쓴다.
 *
 * - 고르기 칩(ToneChipGroup) = 사건 분야 칩(`S.CategoryCard`): 38px 알약 + 22px 색 원 아이콘 + 이름,
 *   고르면 그 색 면·링. 군부대 모달의 군종 칩과 같은 조립(widgets/.../military-unit-form.modal.tsx).
 * - 날짜(YmdDateField) = 사건 시작·종료 칸(`InlineDateField appearance="field"`): 칸 안에서 연·월·일을
 *   바로 치고, 달력은 아이콘으로 칸 아래 드롭다운. 예전엔 칸 전체가 달력 버튼이라 날짜 하나에 세 단계였다.
 *
 * 선거·정당 날짜는 서버가 DATETIME(연·월·일)으로만 받는다 — 연도만·기원전은 저장할 수 없어서
 * 칸이 그 상태면 문구로 알리고 저장을 막는다(조용히 1월 1일로 채우지 않는다).
 */
import React, { useEffect, useId, useRef, useState } from 'react'

import type { IconType } from 'react-icons'
import {
  FiActivity,
  FiCheckCircle,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiCircle,
  FiClock,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiFlag,
  FiGitBranch,
  FiHome,
  FiList,
  FiMapPin,
  FiMoreHorizontal,
  FiPieChart,
  FiRefreshCw,
  FiTrendingUp,
  FiUmbrella,
  FiUser,
  FiUsers,
  FiXCircle,
  FiZap,
  FiAlertTriangle,
  FiAward,
  FiSlash,
} from 'react-icons/fi'
import { useTheme } from 'styled-components'

import * as S from '@/pages/events/create/event-create.styles'
import type { Era } from '@/shared/api/persons'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { InlineDateField } from '@/shared/ui/person-register-modal/sections/inline-date-field'

// ─── 고르기 칩 ─────────────────────────────────────────────────────────────

export interface ToneChipOption<Value extends string = string> {
  value: Value
  label: string
  Icon: IconType
  /** 칩 면·테 색 — 'r, g, b' */
  rgb: string
  text: string
  textDark: string
  accent: string
  title?: string
}

/**
 * 한 개 고르기 — 사건 분야 칩과 같은 라디오그룹(방향키는 포커스만, Space/Enter·클릭이 선택).
 * allowDeselect면 고른 칩을 다시 눌러 해제한다(사건 분야 칩과 같은 동작).
 */
export function ToneChipGroup<Value extends string = string>({
  value,
  onChange,
  options,
  ariaLabelledBy,
  ariaLabel,
  allowDeselect = false,
  id,
}: {
  value: Value | '' | null | undefined
  onChange: (next: Value | '') => void
  options: ReadonlyArray<ToneChipOption<Value>>
  ariaLabelledBy?: string
  ariaLabel?: string
  allowDeselect?: boolean
  id?: string
}) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = options.findIndex((option) => option.value === value)
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = buttonsRef.current.findIndex((button) => button === document.activeElement)
    if (current < 0) return
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (step === 0) return
    event.preventDefault()
    buttonsRef.current[(current + step + options.length) % options.length]?.focus()
  }

  return (
    <S.CategoryGrid
      id={id}
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value
        const OptionIcon = option.Icon
        return (
          <S.CategoryCard
            key={option.value}
            ref={(element) => {
              buttonsRef.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-pressed={isSelected}
            tabIndex={index === tabStop ? 0 : -1}
            title={option.title}
            style={
              {
                '--cat-rgb': option.rgb,
                '--cat-text': isDark ? option.textDark : option.text,
                '--cat-accent': option.accent,
              } as React.CSSProperties
            }
            $selected={isSelected}
            onClick={() => onChange(isSelected && allowDeselect ? '' : option.value)}
          >
            <S.CategoryIcon $selected={isSelected}>
              <OptionIcon size={13} />
            </S.CategoryIcon>
            <S.CategoryLabel>{option.label}</S.CategoryLabel>
          </S.CategoryCard>
        )
      })}
    </S.CategoryGrid>
  )
}

/* 색 — 사건 분야 레지스트리(event-domain.ts)의 soft 규격(rgb · 밝은 글자 · 어두운 글자 · 진한 점)과 같은 꼴 */
const tone = (rgb: string, text: string, textDark: string, accent: string) => ({ rgb, text, textDark, accent })
const RED = tone('220, 38, 38', '#b91c1c', '#fca5a5', '#dc2626')
const ROSE = tone('225, 29, 72', '#be123c', '#fda4af', '#e11d48')
const ORANGE = tone('234, 88, 12', '#c2410c', '#fdba74', '#ea580c')
const SLATE = tone('100, 116, 139', '#475569', '#cbd5e1', '#64748b')
const SKY = tone('2, 132, 199', '#0369a1', '#7dd3fc', '#0284c7')
const BLUE = tone('37, 99, 235', '#1d4ed8', '#93c5fd', '#2563eb')
const NAVY = tone('49, 46, 129', '#312e81', '#a5b4fc', '#4338ca')
const AMBER = tone('217, 119, 6', '#b45309', '#fcd34d', '#d97706')
const VIOLET = tone('124, 58, 237', '#6d28d9', '#c4b5fd', '#7c3aed')
const TEAL = tone('13, 148, 136', '#0f766e', '#5eead4', '#0d9488')
const GREEN = tone('22, 163, 74', '#15803d', '#86efac', '#16a34a')
const INDIGO = tone('99, 102, 241', '#4f46e5', '#a5b4fc', '#6366f1')

/** 정치 스펙트럼 — 왼쪽(붉은 쪽)에서 오른쪽(푸른 쪽)으로, 빅텐트는 따로 */
export const POSITION_TONE_OPTIONS = [
  { value: 'FAR_LEFT', label: '극좌', Icon: FiChevronsLeft, ...RED },
  { value: 'LEFT', label: '좌파', Icon: FiChevronLeft, ...ROSE },
  { value: 'CENTER_LEFT', label: '중도좌파', Icon: FiCornerUpLeft, ...ORANGE },
  { value: 'CENTER', label: '중도', Icon: FiCircle, ...SLATE },
  { value: 'CENTER_RIGHT', label: '중도우파', Icon: FiCornerUpRight, ...SKY },
  { value: 'RIGHT', label: '우파', Icon: FiChevronRight, ...BLUE },
  { value: 'FAR_RIGHT', label: '극우', Icon: FiChevronsRight, ...NAVY },
  { value: 'BIG_TENT', label: '빅텐트', Icon: FiUmbrella, ...AMBER, title: '좌우를 아우르는 포괄 정당' },
] as const satisfies ReadonlyArray<ToneChipOption>

/** 정당 종류 — 값·라벨 정본은 shared/api/political-party(POLITICAL_PARTY_KIND_OPTIONS) */
export const PARTY_KIND_TONE_OPTIONS = [
  { value: 'PARTY', label: '정당', Icon: FiFlag, ...INDIGO, title: '근대 정당' },
  { value: 'MOVEMENT', label: '정치 운동', Icon: FiTrendingUp, ...ORANGE, title: '정당으로 조직되기 전 단계 — 전투 파쇼(1919)' },
  { value: 'FACTION', label: '붕당·파벌', Icon: FiGitBranch, ...VIOLET, title: '선거 없는 정치 집단 — 동인·서인, 옵티마테스' },
  { value: 'PARLIAMENTARY_GROUP', label: '의회 클럽·교섭단체', Icon: FiUsers, ...TEAL, title: '원내 집단' },
  { value: 'ELECTORAL_LIST', label: '공동 명부', Icon: FiList, ...AMBER, title: '여러 정당이 한 명부로 한 정당처럼 득표' },
  { value: 'OTHER', label: '기타', Icon: FiMoreHorizontal, ...SLATE },
] as const satisfies ReadonlyArray<ToneChipOption>

/** 선거 유형 — 라벨은 ELECTION_TYPE_OPTIONS와 같다(값·라벨 정본은 shared/api/election) */
export const ELECTION_TYPE_TONE: Record<string, { Icon: IconType } & ReturnType<typeof tone>> = {
  PRESIDENTIAL_OR_HEAD: { Icon: FiUser, ...VIOLET },
  PARLIAMENTARY_CONSTITUENCY: { Icon: FiMapPin, ...INDIGO },
  PARLIAMENTARY_PROPORTIONAL: { Icon: FiPieChart, ...SKY },
  LOCAL: { Icon: FiHome, ...TEAL },
  BY_ELECTION: { Icon: FiRefreshCw, ...ORANGE },
  PRIMARY: { Icon: FiFlag, ...ROSE },
  REFERENDUM_OR_PLEBISCITE: { Icon: FiCheckSquare, ...GREEN },
  OTHER: { Icon: FiMoreHorizontal, ...SLATE },
}

export const ELECTION_STATUS_TONE: Record<string, { Icon: IconType } & ReturnType<typeof tone>> = {
  SCHEDULED: { Icon: FiClock, ...BLUE },
  IN_PROGRESS: { Icon: FiActivity, ...AMBER },
  FINALIZED: { Icon: FiCheckCircle, ...GREEN },
  CANCELLED: { Icon: FiXCircle, ...SLATE },
}

export const LEGISLATURE_CLOSURE_TONE: Record<string, { Icon: IconType } & ReturnType<typeof tone>> = {
  FULL_TERM: { Icon: FiAward, ...GREEN },
  EARLY_DISSOLUTION: { Icon: FiZap, ...ORANGE },
  NO_CONFIDENCE: { Icon: FiAlertTriangle, ...RED },
  HEAD_DISSOLUTION_DECREE: { Icon: FiUser, ...VIOLET },
  REFERENDUM_OR_PLEBISCITE: { Icon: FiCheckSquare, ...TEAL },
  JUDICIAL_OR_CONSTITUTIONAL: { Icon: FiSlash, ...NAVY },
  OTHER: { Icon: FiMoreHorizontal, ...SLATE },
}

/** { value, label }[] + 색 표 → 칩 옵션(표에 없는 값은 회색 점) */
export function withTones(
  options: ReadonlyArray<{ value: string; label: string }>,
  tones: Record<string, { Icon: IconType } & ReturnType<typeof tone>>,
): ToneChipOption[] {
  return options.map((option) => ({
    ...option,
    ...(tones[option.value] ?? { Icon: FiCircle, ...SLATE }),
  }))
}

// ─── 날짜 칸 ───────────────────────────────────────────────────────────────

interface DateParts {
  era: Era
  year: string
  month: string
  day: string
}

const EMPTY_PARTS: DateParts = { era: 'AD', year: '', month: '', day: '' }

function partsOfYmd(ymd: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return EMPTY_PARTS
  return { era: 'AD', year: String(Number(match[1])), month: match[2], day: match[3] }
}

/** 칸 → 'YYYY-MM-DD' 또는 오류 문구. 다 비었으면 빈 값 */
export function ymdOfParts(parts: DateParts): { ymd: string; error: string | null } {
  const { era, year, month, day } = parts
  if (!year && !month && !day) return { ymd: '', error: null }
  if (era === 'BC') return { ymd: '', error: '기원전 날짜는 저장할 수 없습니다.' }
  if (!year || !month || !day) return { ymd: '', error: '연·월·일을 모두 입력하세요.' }
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (yearNumber < 1000) return { ymd: '', error: '1000년 이후 날짜만 저장할 수 있습니다.' }
  const probe = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber))
  if (probe.getUTCMonth() !== monthNumber - 1 || probe.getUTCDate() !== dayNumber) {
    return { ymd: '', error: '없는 날짜입니다.' }
  }
  const pad = (value: number) => String(value).padStart(2, '0')
  return { ymd: `${String(yearNumber).padStart(4, '0')}-${pad(monthNumber)}-${pad(dayNumber)}`, error: null }
}

/**
 * 연·월·일 직접 입력 + 달력 드롭다운 — 사건 시작·종료 칸(EventDateField)과 같은 부품·같은 동작.
 * 값은 'YYYY-MM-DD'. 치는 중간 상태는 칸이 들고, 유효할 때만 onChange를 보낸다.
 */
export function YmdDateField({
  value,
  onChange,
  onErrorChange,
  ariaLabel,
  pickerTitle,
  error,
  ariaDescribedBy,
  minDate,
  anchorId: anchorIdProp,
}: {
  value: string
  onChange: (ymd: string) => void
  /** 칸 입력이 날짜가 못 될 때 문구(없으면 null) — 폼은 이걸로 저장을 막는다 */
  onErrorChange?: (message: string | null) => void
  ariaLabel: string
  pickerTitle: string
  error?: boolean
  ariaDescribedBy?: string
  minDate?: string
  anchorId?: string
}) {
  const generatedId = useId()
  const anchorId = anchorIdProp ?? generatedId
  const [pickerOpen, setPickerOpen] = useState(false)
  const [parts, setParts] = useState<DateParts>(() => partsOfYmd(value))
  const [inputError, setInputError] = useState<string | null>(null)
  const lastEmittedRef = useRef(value)

  /* 바깥 값이 바뀌면(불러오기·빠른 입력 버튼) 칸을 다시 채운다 */
  useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    setParts(partsOfYmd(value))
    setInputError(null)
    onErrorChange?.(null)
    // 콜백 정체성 변화로 칸을 덮지 않게 값만 본다
  }, [value])

  const apply = (next: DateParts) => {
    setParts(next)
    const result = ymdOfParts(next)
    setInputError(result.error)
    onErrorChange?.(result.error)
    lastEmittedRef.current = result.ymd
    if (result.ymd !== value) onChange(result.ymd)
  }

  return (
    <>
      <InlineDateField
        appearance="field"
        anchorId={anchorId}
        pickerOpen={pickerOpen}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        error={error || Boolean(inputError)}
        era={parts.era}
        year={parts.year}
        month={parts.month}
        day={parts.day}
        onEra={(era) => apply({ ...parts, era })}
        onYear={(year) => apply({ ...parts, year })}
        onMonth={(month) => apply({ ...parts, month })}
        onDay={(day) => apply({ ...parts, day })}
        onOpenPicker={() => setPickerOpen(true)}
      />
      {inputError ? <S.ErrorMessage role="alert">{inputError}</S.ErrorMessage> : null}
      {pickerOpen ? (
        <DatePickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(date) => {
            apply(partsOfYmd(date.slice(0, 10)))
            setPickerOpen(false)
          }}
          initialDate={value || minDate}
          minDate={minDate}
          title={pickerTitle}
          anchorEl={document.getElementById(anchorId)}
        />
      ) : null}
    </>
  )
}

// ─── 2단 분할 / 1단 보기 ───────────────────────────────────────────────────

/** 사건·군부대 등록 모달과 같은 보기 전환 — 기본은 2단, 고른 보기는 이 브라우저에 기억 */
export function useSplitLayoutMode(storageKey: string) {
  const [layoutMode, setLayoutMode] = useState<'split' | 'single'>(() => {
    if (typeof window === 'undefined') return 'split'
    try {
      return window.localStorage.getItem(storageKey) === 'single' ? 'single' : 'split'
    } catch {
      return 'split'
    }
  })
  const toggleLayoutMode = () => {
    setLayoutMode((prev) => {
      const next = prev === 'split' ? 'single' : 'split'
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {
        // storage disabled
      }
      return next
    })
  }
  return { layoutMode, toggleLayoutMode }
}
