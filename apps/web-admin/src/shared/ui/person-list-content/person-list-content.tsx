/**
 * 인물 리스트 UI — 국가 상세·인물 페이지 공용
 * 국가 선택 시 인물 탭과 동일한 기능·디자인
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiCheck,
  FiGrid,
  FiList,
  FiPlus,
  FiSearch,
  FiSquare,
  FiStar,
  FiTable,
  FiTarget,
  FiTrash2,
} from 'react-icons/fi'
import styled, { css, useTheme } from 'styled-components'

import { personKeys } from '@/entities/person/api'
import { useHistoricalCountries } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'
import { PERSON_TRAIT_META } from '@/shared/api/person-stats'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { usePersonEvaluationIndex } from '@/shared/lib/person-evaluation-index'
import { getPositionBg, getPositionColor } from '@/shared/lib/position-color'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { BORDER_COLOR, FOCUS_COLOR } from '@/shared/ui/register-form-layout'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'
import { PersonBulkEvaluateModal } from '@/widgets/person/person-stats-section/person-bulk-evaluate-modal'
import { PersonStatsEditModal } from '@/widgets/person/person-stats-section/person-stats-edit-modal'

import { PersonTable } from './person-table'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function isRegisteredWithin24h(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  return Number.isFinite(created) && Date.now() - created < TWENTY_FOUR_HOURS_MS
}

type PersonLike = {
  id: string
  name: string
  surname?: string | null
  biography?: string | null
  profileImageUrl?: string | null
  gender?: string | null
  birthYear?: number | null
  deathYear?: number | null
  birthEra?: string | null
  deathEra?: string | null
  birth_year?: number | null
  death_year?: number | null
  birth_era?: string | null
  death_era?: string | null
  dynastyId?: string | null
  dynasty?: { id: string; name: string } | null
  countryId?: string | null
  country?: { id: string; name: string; flagEmoji?: string | null; defaultNameDisplayOrder?: string | null; isoCode?: string | null } | null
  /** 등록일 (24시간 이내면 NEW 뱃지 표시) */
  createdAt?: string | null
  /** 사망일 미상 여부 */
  isDeathDateUnknown?: boolean | null
  /** 생존 여부 */
  isAlive?: boolean | null
  /** 출생지 */
  birthCity?: { id: string; name: string } | null
  birthAdminDivision?: { id: string; name: string } | null
  birthPlaceText?: string | null
  /** 역사적 영향력 (0-100) — 카드에 뱃지로 표시 */
  influence?: number | null
  /** 관직 재임 기록 (필터용 positionType, 표시용 직책명) */
  governmentTenures?: Array<{
    id: string
    positionType: string
    title?: string | null
    positionDefinition?: {
      id: string
      title?: string | null
      positionType?: string
    } | null
  }> | null
  /** 군주명 관련 */
  regnalName?: string | null
  templeName?: string | null
  /** 사망 유형 (필터·검색용) */
  deathType?: string | null
  /** 사망 원인 (검색용) */
  deathCause?: string | null
  /** 별명/호/필명 (검색용) */
  nicknames?: Array<{ nickname: string }> | null
}

interface DynastyItem {
  id: string
  name: string
}

export interface PersonListContentProps {
  persons: PersonLike[]
  dynasties: DynastyItem[]
  /** 인물 등록 시 기본 국가 (미지정 시 국가 선택 없음) */
  initialCountryId?: string | null
  /** 캐시 무효화 시 쿼리 키 (예: ['persons-by-country', countryId]) */
  invalidateKeys?: unknown[]
  /** 제목 */
  title?: string
  /** 빈 목록 메시지 */
  emptyMessage?: string
  /** 검색·필터 빈 결과 메시지 */
  emptyFilterMessage?: string
  /** 리스트 ↔ 인물 상세 전환 시 호출 (상단 공통 헤더 문구 변경용) */
  onViewChange?: (view: 'list' | 'detail') => void
  /**
   * 제공 시 인물 카드 클릭이 인라인 상세 패널 대신 이 콜백을 호출한다.
   * (예: 대시보드에서 /persons/:id 페이지로 네비게이션)
   */
  onPersonClick?: (personId: string) => void
  /** true면 타이틀·설명 행 숨김 (국가 상세 인물 탭에서 공통 헤더 사용) */
  hideMainHeader?: boolean
  /** true면 리스트 내 '인물 등록' 버튼 숨김 (헤더 우측에 배치된 경우) */
  hideCreateButton?: boolean
  /** 값이 바뀔 때마다 등록 폼 열기 (헤더 버튼에서 사용) */
  registerTrigger?: number
  /** false면 국가 필터 버튼·모달 숨김 (예: 국가 상세 인물 탭) */
  enableCountryFilter?: boolean
  /**
   * 인물 등록/수정 모달 렌더 함수 (widgets 레이어의 PersonRegisterViewModal 주입용)
   * shared → widgets 역방향 의존성을 제거하기 위해 render props 패턴 사용
   */
  renderRegisterModal?: (props: {
    isOpen: boolean
    onClose: () => void
    initialCountryId?: string | null
    editPersonId?: string | null
    onSuccess: (personId: string) => void
  }) => React.ReactNode
  /**
   * 프리셋 진입 모드 (예: 국가 상세 → "인물 전체 보기"로 국가 필터 고정).
   * 제공 시 상단 PresetBanner 노출 + 해제 콜백 실행 버튼 표시.
   */
  onClearPreset?: () => void
}

function formatLifespan(person: PersonLike): string {
  const birthYear = person.birthYear ?? person.birth_year
  const deathYear = person.deathYear ?? person.death_year
  const formatYear = (y: number) =>
    y.toLocaleString('ko-KR', { useGrouping: true })
  const era = (e: string | null | undefined) => (e === 'BC' ? 'BC' : 'AD')
  const isAlive = birthYear != null && deathYear == null
  const currentYear = new Date().getFullYear()
  const currentAge =
    isAlive && birthYear != null && person.birthEra !== 'BC'
      ? currentYear - birthYear
      : null
  const ageAtDeath =
    birthYear != null &&
    deathYear != null &&
    person.birthEra !== 'BC' &&
    person.deathEra !== 'BC'
      ? deathYear - birthYear
      : null
  if (birthYear != null && deathYear != null) {
    const base = `${era(person.birthEra ?? person.birth_era)} ${formatYear(birthYear)} ~ ${era(person.deathEra ?? person.death_era)} ${formatYear(deathYear)}`
    return ageAtDeath != null
      ? `${base} · 사망 · ${ageAtDeath}세`
      : `${base} · 사망`
  }
  if (birthYear != null) {
    return isAlive && currentAge != null && currentAge >= 0
      ? `AD ${formatYear(birthYear)} ~ 생존 (${currentAge}세)`
      : `${era(person.birthEra ?? person.birth_era)} ${formatYear(birthYear)} ~`
  }
  return '생몰년 미상'
}

function getCentury(
  year: number | undefined,
  era: string | undefined,
): number | null {
  if (year == null || year <= 0) return null
  if (era === 'BC') return -Math.ceil(year / 100)
  return Math.ceil(year / 100)
}

const CENTURY_UNKNOWN = 999

/** 사망 유형 enum → 한국어 라벨 (필터 칩) */
const DEATH_TYPE_LABELS: Record<string, string> = {
  NATURAL: '자연사',
  ILLNESS: '병사',
  ASSASSINATION: '암살',
  EXECUTION: '처형',
  BATTLE: '전사',
  ACCIDENT: '사고사',
  SUICIDE: '자살',
  UNKNOWN: '불명',
  OTHER: '기타',
}

type SortMode =
  | 'century' // 기본 — 세기별 그루핑 + 출생년 내림차순
  | 'name' // 이름 가나다순
  | 'influence' // 영향력 내림차순
  | 'statsAvg' // 능력치 평균 내림차순
  | 'recent' // 최근 등록순

const SORT_OPTIONS: Array<{ key: SortMode; label: string }> = [
  { key: 'century', label: '세기별' },
  { key: 'recent', label: '최근 등록순' },
  { key: 'influence', label: '영향력 ↓' },
  { key: 'statsAvg', label: '능력치 평균 ↓' },
  { key: 'name', label: '이름 가나다순' },
]

type EvalFilter = 'all' | 'evaluated' | 'unevaluated'

type ViewMode = 'cards' | 'compact' | 'table'

const VIEW_MODE_OPTIONS: Array<{
  key: ViewMode
  label: string
  Icon: typeof FiGrid
}> = [
  { key: 'cards', label: '카드', Icon: FiGrid },
  { key: 'compact', label: '조밀', Icon: FiList },
  { key: 'table', label: '표', Icon: FiTable },
]

/**
 * 검색어가 비어 있지 않으면 텍스트에서 매치 부분을 <mark>로 감싸 반환.
 * 단순 case-insensitive includes 매치 — 검색 로직과 동일.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim()
  if (!q || !text) return text
  const lowerText = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  const out: React.ReactNode[] = []
  let cursor = 0
  let idx = lowerText.indexOf(lowerQ, cursor)
  let key = 0
  while (idx !== -1) {
    if (idx > cursor) out.push(text.slice(cursor, idx))
    out.push(<HighlightMark key={`m-${key++}`}>{text.slice(idx, idx + q.length)}</HighlightMark>)
    cursor = idx + q.length
    idx = lowerText.indexOf(lowerQ, cursor)
  }
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

/** 이름에서 모노그램(이니셜) 생성 — 사진 없는 인물 placeholder용 */
function buildMonogram(person: PersonLike): string {
  const reg = (person.regnalName || '').trim()
  // 군주명이 영문이면 첫 글자 + 숫자 추출 (Vittorio Emanuele II → "VE2")
  if (reg && /^[A-Za-z]/.test(reg)) {
    const tokens = reg.split(/\s+/).filter(Boolean)
    const initials = tokens
      .filter((t) => /^[A-Za-z]/.test(t))
      .slice(0, 2)
      .map((t) => t[0]!.toUpperCase())
      .join('')
    const numMatch = reg.match(/\b([IVXLCDM]+)\b/i)
    let num = ''
    if (numMatch) {
      const ROMAN: Record<string, number> = {
        I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
      }
      num = String(ROMAN[numMatch[1]!.toUpperCase()] ?? '')
    }
    return `${initials}${num}` || initials || '?'
  }
  // 한글/한자: 이름 첫 글자 + (성 첫 글자가 있으면 성)
  const sur = (person.surname || '').trim()
  const nm = (person.name || '').trim()
  if (sur && nm) return `${sur[0]}${nm[0]}`
  return (nm[0] ?? sur[0] ?? '?').toString()
}

// ─── Styled ───────────────────────────────────────────────────────────────────
const ListHeader = styled.header<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const ListHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ListHeaderTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: baseline;
  gap: 6px;
`

const ListHeaderCount = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
`

const SearchWrap = styled.div`
  flex: 1;
  min-width: 180px;
  max-width: 240px;
  position: relative;

  @media (max-width: 480px) {
    max-width: 100%;
    width: 100%;
  }
`

/** 프리셋 진입(카드 리스트 전용 모드)용 상단 배너 — 평면 + 작은 chip */
const PresetBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.primary};
`

const PresetBannerLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PresetBannerPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
`

const PresetBannerClose = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  display: flex;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 32px;
  font-size: 13px;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid transparent;
  transition: border-color 0.12s, background 0.12s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.active};
    background: ${({ theme }) => theme.colors.background.primary};
  }
`

const GenderBtnGroup = styled.div`
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const GenderBtn = styled.button<{
  $active?: boolean
  $gender?: 'all' | 'male' | 'female'
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  white-space: nowrap;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: background 0.12s, color 0.12s;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.active};

      &:hover {
        background: ${theme.colors.activeLight};
        color: ${theme.colors.active};
      }
    `}
`

const CountryFilterSection = styled.div`
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ViewModeToggle = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  overflow: hidden;
`

const ViewModeBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: background 0.12s, color 0.12s;
  &:last-child {
    border-right: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.active};
      &:hover {
        background: ${theme.colors.activeLight};
        color: ${theme.colors.active};
      }
    `}
`

const SortSelect = styled.select`
  padding: 7px 10px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  outline: none;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const SecondaryFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  min-width: 0;
`

const SecondaryFilterLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  width: 56px;
`

const SecondaryChipScroll = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
`

const SecondaryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid transparent;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.active};
      &:hover {
        background: ${theme.colors.activeLight};
        color: ${theme.colors.active};
      }
    `}
`

const SecondaryChipCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
`

const BulkActionBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.12)'
      : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid rgba(99, 102, 241, 0.3);
  backdrop-filter: blur(8px);
`

const BulkActionLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

const BulkActionRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const BulkSelectedCount = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: #4f46e5;
  font-variant-numeric: tabular-nums;
`

const BulkActionGhost = styled.button`
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: rgba(99, 102, 241, 0.12);
    color: #4f46e5;
  }
`

const BulkActionPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: 1px solid rgba(99, 102, 241, 0.45);
  &:hover:not(:disabled) {
    opacity: 0.92;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const BulkActionDanger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  background: #dc2626;
  color: #fff;
  border: 1px solid #b91c1c;
  &:hover:not(:disabled) {
    background: #b91c1c;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ModernCountryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

const ModernCountryChip = styled.button<{
  $active?: boolean
  $hasFilter?: boolean
}>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: ${(p) => (p.$active || p.$hasFilter ? 600 : 500)};
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  border: 1px solid transparent;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.12s, color 0.12s, border-color 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $active, $hasFilter, theme }) =>
    ($active || $hasFilter) &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.active};

      &:hover {
        background: ${theme.colors.activeLight};
        color: ${theme.colors.active};
      }
    `}
`

const ActiveFilterDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  opacity: 0.7;
`

const ClearFilterBtn = styled.button`
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const HistoricalCountryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const HistoricalCountryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.active};

      &:hover {
        background: ${theme.colors.activeLight};
        color: ${theme.colors.active};
      }
    `}
`

const HistoricalChipName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.2;
`

const HistoricalChipYear = styled.span`
  font-size: 10px;
  font-weight: 400;
  opacity: 0.65;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: ${FOCUS_COLOR};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
  &:hover:not(:disabled) {
    background: #4338ca;
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:focus-visible {
    outline: 2px solid ${FOCUS_COLOR};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`

// 패딩 적용하지마라.
const ListSectionWrap = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 16px 16px 40px;
  }
`

const ListScrollArea = styled.div`
  width: 100%;
  min-width: 0;
`

// 패딩 적용하지마라, 전체 컨테이너에 적용되어 있으니.
const DetailViewWrap = styled.div`
  width: 100%;
  min-width: 0;
  min-height: 60vh;
  padding: 28px 0px;

  @media (max-width: 768px) {
    padding: 20px 16px 40px;
  }
`

const AdaptiveGrid = styled.div<{ $compact?: boolean }>`
  display: grid;
  gap: ${({ $compact }) => ($compact ? '8px' : '12px')};
  grid-template-columns: repeat(
    auto-fill,
    minmax(${({ $compact }) => ($compact ? '260px' : '360px')}, 1fr)
  );
  @media (min-width: 1400px) {
    grid-template-columns: repeat(
      auto-fill,
      minmax(${({ $compact }) => ($compact ? '280px' : '400px')}, 1fr)
    );
    gap: ${({ $compact }) => ($compact ? '10px' : '14px')};
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ $compact }) => ($compact ? '6px' : '10px')};
  }
`

/** 세기 시대 → 강조 색. 인포그래픽 ERAS와 매핑 통일. */
type EraKey = 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'unknown'

function getCenturyEra(century: number): EraKey {
  if (century === CENTURY_UNKNOWN) return 'unknown'
  // 경계는 통념·인포그래픽 ERAS(고대 ~500, 중세 500~1500)와 일치:
  // 고대 = 기원전~서기 5세기, 중세 = 6~15세기, 근세 = 16~19세기, 근현대 = 20세기~
  if (century <= 5) return 'ancient'
  if (century <= 15) return 'medieval'
  if (century <= 19) return 'early-modern'
  return 'modern'
}

/** era별 dot 컬러 — infographic ERAS와 통일 (디자인 일관성) */
const ERA_DOT: Record<EraKey, string> = {
  ancient: '#f59e0b', // ERAS.ancient
  medieval: '#ef4444', // ERAS.medieval
  'early-modern': '#10b981', // ERAS.early
  modern: '#6366f1', // ERAS.modern20
  unknown: '#94a3b8',
}

/** 시대(era)별 그룹 헤더 라벨 — '시대별' 그룹 모드에서 사용 */
const ERA_LABEL: Record<EraKey, string> = {
  ancient: '고대 (기원전~5세기)',
  medieval: '중세 (6~15세기)',
  'early-modern': '근세 (16~19세기)',
  modern: '근현대 (20세기~)',
  unknown: '세기 미상',
}

/** 시대별 그룹 — navigator·히스토그램용 짧은 라벨 */
const ERA_NAV_LABEL: Record<EraKey, string> = {
  ancient: '고대',
  medieval: '중세',
  'early-modern': '근세',
  modern: '근현대',
  unknown: '미상',
}

/** 세기별 그룹 모드에서 인접 희소 세기를 병합하는 기준 (이 미만이면 같은 시대끼리 병합) */
const MERGE_THRESHOLD = 4

/** 세기별 그룹 입도 — 'century'=세기 단위(희소 병합), 'era'=거친 5시대 단위 */
type GroupBy = 'century' | 'era'

const CenturySection = styled.section`
  margin-bottom: 32px;
  &:last-child {
    margin-bottom: 0;
  }
`

/** 리스트 + 우측 세기 navigator 레이아웃 */
const ListWithNavWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: start;
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

/** 우측 sticky 세기 navigator */
const CenturyNav = styled.nav`
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  font-size: 11px;
  width: 84px;
  flex-shrink: 0;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  @media (max-width: 1024px) {
    display: none;
  }
`

const CenturyNavBtn = styled.button`
  display: grid;
  grid-template-columns: 8px 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s, color 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CenturyNavDot = styled.span<{ $era: EraKey }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $era }) => ERA_DOT[$era]};
  flex-shrink: 0;
`

const CenturyNavLabel = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`

const CenturyNavCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const CenturySeparator = styled.div<{ $era: EraKey }>`
  width: 100%;
  height: 1px;
  margin-bottom: 22px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.08)'} 20%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.13)'
        : 'rgba(0,0,0,0.11)'} 50%,
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.08)'} 80%,
    transparent 100%
  );
`

const CenturyHeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 12px;
  position: sticky;
  top: 0;
  z-index: 5;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const CenturyHeadingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CenturyEraDot = styled.span<{ $era: EraKey }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $era }) => ERA_DOT[$era]};
`

const CenturyHeadingLabel = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenturyCountBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* ── 시대 그룹 입도 토글 (세기 / 시대) ─────────────────────────────── */
const GroupByToggle = styled.div`
  display: inline-flex;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  overflow: hidden;
`

const GroupByBtn = styled.button<{ $active?: boolean }>`
  height: 30px;
  padding: 0 10px;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: background 0.12s, color 0.12s;
  &:last-child {
    border-right: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.activeLight};
      color: ${theme.colors.active};
      &:hover {
        background: ${theme.colors.activeLight};
        color: ${theme.colors.active};
      }
    `}
`

/* ── 시대 밀도 오버뷰 (세기별 인원 히스토그램) ───────────────────────── */
const DensityOverview = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 46px;
  margin-bottom: 18px;
  padding: 6px 8px 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow-x: auto;
`

const DensityCol = styled.button<{ $era: EraKey }>`
  flex: 1 1 0;
  min-width: 5px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.12s;
  &:hover {
    opacity: 1;
  }
  /* 인물 없는 세기(빈 막대) — 클릭 대상 아님 */
  &:disabled {
    cursor: default;
    opacity: 0.85;
  }
`

const DensityFill = styled.span<{ $era: EraKey; $pct: number; $empty?: boolean }>`
  display: block;
  width: 100%;
  height: ${({ $pct, $empty }) =>
    $empty ? '2px' : `${Math.max($pct * 100, 6)}%`};
  border-radius: 3px 3px 1px 1px;
  background: ${({ $era, $empty }) =>
    $empty ? 'rgba(148, 163, 184, 0.35)' : ERA_DOT[$era]};
`

/* ── 카드 시대 배지 ──────────────────────────────────────────────── */
const EraBadge = styled.span<{ $era: EraKey }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: ${({ $era }) => ERA_DOT[$era]};
  background: ${({ $era }) => `${ERA_DOT[$era]}1f`};
`

/* ── Horizontal person card ─────────────────────────────────────────── */

/**
 * 인물 카드 — 키보드 접근성을 위해 `<button>`.
 * Enter/Space는 native button이 자동 처리, focus-visible 링 추가.
 */
/**
 * 카드 wrapper — Card(button)와 hover 액션(QuickEditBtn)을 함께 묶음.
 * Card는 button이라 button 안에 button을 넣을 수 없어 분리.
 */
const CardWrap = styled.div`
  position: relative;
  &:hover button[data-quick-edit='true'],
  &:focus-within button[data-quick-edit='true'] {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
`

/** 카드 좌상단 다중 선택 체크박스 — hover 시 노출, 선택된 카드는 항상 노출 */
const CardCheckbox = styled.button<{ $checked: boolean }>`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid
    ${({ $checked }) =>
      $checked ? '#6366f1' : 'rgba(255, 255, 255, 0.6)'};
  background: ${({ $checked }) =>
    $checked ? '#6366f1' : 'rgba(0, 0, 0, 0.45)'};
  color: #fff;
  backdrop-filter: blur(6px);
  opacity: ${({ $checked }) => ($checked ? 1 : 0)};
  transform: ${({ $checked }) => ($checked ? 'translateY(0)' : 'translateY(-4px)')};
  pointer-events: ${({ $checked }) => ($checked ? 'auto' : 'none')};
  transition: opacity 0.15s ease, transform 0.15s ease, background 0.12s ease,
    border-color 0.12s ease;
  @media (hover: none) {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
`

const Card = styled.button<{ $compact?: boolean; $selected?: boolean }>`
  border-radius: ${({ $compact }) => ($compact ? '12px' : '16px')};
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  cursor: pointer;
  min-height: ${({ $compact }) => ($compact ? '74px' : '116px')};
  transition: box-shadow 0.25s ease, transform 0.25s ease, outline-color 0.15s ease;
  padding: 0;
  margin: 0;
  border: none;
  outline: 2px solid
    ${({ $selected }) => ($selected ? '#6366f1' : 'transparent')};
  outline-offset: -2px;
  font: inherit;
  color: inherit;
  text-align: left;
  width: 100%;

  &:focus-visible {
    outline: 2px solid ${FOCUS_COLOR};
    outline-offset: 2px;
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset,
                      0 2px 12px rgba(0,0,0,0.24);
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 1px 0 rgba(255,255,255,0.12) inset,
                        0 8px 24px rgba(0,0,0,0.32);
          }
        `
      : css`
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.08);
          }
        `}
`

/* Left: image column */
const CardImageSide = styled.div<{ $compact?: boolean }>`
  width: ${({ $compact }) => ($compact ? '64px' : '110px')};
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f3f4f6'};

  /* 이미지 lazy-loading 동안 보이는 쉬머 — <img>가 로드되면 위에 덮임 */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)'
        : 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)'};
    background-size: 200% 100%;
    animation: cardImgShimmer 1.4s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
  @keyframes cardImgShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  /* img · placeholder가 있을 때 쉬머 위를 덮음 */
  > img,
  > div {
    position: relative;
    z-index: 1;
  }
`

const NewBadge = styled.span`
  position: absolute;
  top: 7px;
  left: 7px;
  z-index: 2;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 800;
  color: #fff;
  background: #ef4444;
  border-radius: 8px;
  letter-spacing: 0.05em;
  animation: newBadgePulse 2s ease-in-out infinite;

  @keyframes newBadgePulse {
    0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
    60%  { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  }
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
  ${Card}:hover & {
    transform: scale(1.04);
  }
`

const CardImagePlaceholder = styled.div<{ $color: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) =>
    theme.mode === 'dark'
      ? `${$color}18`
      : `${$color}12`};
  color: ${({ $color }) => $color};
  opacity: 0.55;
  svg {
    width: 36px;
    height: 36px;
  }
`

/** 사진 부재 시 모노그램 (이름 이니셜 또는 군주명 단축형) */
const CardMonogram = styled.div<{ $color: string; $compact?: boolean }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color, theme }) =>
    theme.mode === 'dark' ? `${$color}1f` : `${$color}14`};
  color: ${({ $color }) => $color};
  font-size: ${({ $compact }) => ($compact ? '15px' : '22px')};
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant: small-caps;
  opacity: 0.85;
`

/* Right: content column */
const CardContent = styled.div`
  flex: 1;
  min-width: 0;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  min-width: 0;
`

const PersonName = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MonarchNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
`

const MonarchNameText = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(251,191,36,0.85)' : 'rgba(180,130,0,0.9)'};
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MonarchCrown = styled.span`
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
`

/** 작은 "평가됨" 버튼 핀 — 카드에 boolean 신호만 + 클릭으로 수정 진입 */
const EvalPinBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  flex-shrink: 0;
  cursor: pointer;
  font-family: inherit;
  &:hover {
    background: rgba(99, 102, 241, 0.18);
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 1px;
  }
`

/**
 * 카드 hover 시 우측 상단에 떠오르는 평가 진입 버튼.
 * - 데스크톱(hover 가능): hover/focus 시에만 노출
 * - 모바일/터치(@media (hover: none)): hover 없으니 항상 노출 + 약간 작게
 */
const QuickEditBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border: 1px solid rgba(99, 102, 241, 0.45);
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease, background 0.12s ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  &:hover {
    background: #4f46e5;
  }
  &:focus-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
  @media (hover: none) {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    padding: 4px 8px;
    font-size: 10.5px;
    box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
  }
`

const GenderBadge = styled.span<{ $gender: 'MALE' | 'FEMALE' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;

  ${({ theme, $gender }) =>
    theme.mode === 'dark'
      ? $gender === 'MALE'
        ? css`color: #93c5fd; background: rgba(96,165,250,0.14); border: 1px solid rgba(96,165,250,0.25);`
        : css`color: #f9a8d4; background: rgba(244,114,182,0.14); border: 1px solid rgba(244,114,182,0.25);`
      : $gender === 'MALE'
        ? css`color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe;`
        : css`color: #db2777; background: #fdf2f8; border: 1px solid #fbcfe8;`}
`

/* Lifespan bar */
const LifespanRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`

const LifespanYear = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

const LifespanTrack = styled.div`
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e9ecef'};
  position: relative;
  overflow: hidden;
`

const LifespanFill = styled.div<{ $color: string; $pct: number }>`
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: ${({ $pct }) => $pct}%;
  min-width: 6px;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  opacity: 0.75;
`

const LifespanAge = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`

/* Position badges */
const CardBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
`

const CardHeadsBadge = styled.span<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  letter-spacing: 0.01em;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
`

/* Country row */
const CardCountryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`

const CardCountryFlag = styled.span`
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
`

const CardCountryName = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.85)' : '#64748b'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/* Meta (dynasty / birthplace) */
const CardMetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
`

const CardMetaLabel = styled.span`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.6;
  flex-shrink: 0;
`

const CardMetaValue = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`

const CardBio = styled.p`
  margin: 6px 0 0 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

/** 검색 매치 강조 — 노란 배경 + 약간 굵은 글씨 */
const HighlightMark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(250, 204, 21, 0.22)' : '#fef08a'};
  color: inherit;
  font-weight: 700;
  padding: 0 2px;
  border-radius: 2px;
`

const LifespanYearMuted = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.55;
  letter-spacing: 0.01em;
`

const EmptyState = styled.div`
  padding: 60px 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#fafafa'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e5e7eb'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`

const EmptyStateTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyStateDesc = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 520px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: center;
`

const ActiveFilterPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.active};
`

const ActiveFilterClearX = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  &:hover {
    background: rgba(0, 0, 0, 0.08);
  }
`

const EmptyStateActions = styled.div`
  display: inline-flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
`

const EmptyStateCta = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  ${({ $primary, theme }) =>
    $primary
      ? css`
          color: #fff;
          background: ${FOCUS_COLOR};
          border: none;
          &:hover {
            background: #4338ca;
          }
          &:focus-visible {
            outline: 2px solid ${FOCUS_COLOR};
            outline-offset: 2px;
          }
        `
      : css`
          color: ${theme.colors.text.secondary};
          background: ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : '#ffffff'};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.mode === 'dark'
              ? 'rgba(255,255,255,0.1)'
              : '#f3f4f6'};
            color: ${theme.colors.text.primary};
          }
        `}
`

export function PersonListContent({
  persons,
  dynasties,
  initialCountryId = null,
  invalidateKeys = [],
  title = '인물 리스트',
  emptyMessage = '등록된 인물이 없습니다.',
  emptyFilterMessage = '검색·필터 조건에 맞는 인물이 없습니다.',
  onViewChange,
  onPersonClick,
  hideMainHeader = false,
  hideCreateButton = false,
  registerTrigger,
  enableCountryFilter = true,
  renderRegisterModal,
  onClearPreset,
}: PersonListContentProps) {
  const queryClient = useQueryClient()
  const theme = useTheme()
  const isDarkMode = (theme as any)?.mode === 'dark'
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState<string>('')
  const [filterCountryIds, setFilterCountryIds] = useState<string[]>([])
  const [expandedModernId, setExpandedModernId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('century')
  const [groupBy, setGroupBy] = useState<GroupBy>('century')
  const [evalFilter, setEvalFilter] = useState<EvalFilter>('all')
  const [filterDynastyId, setFilterDynastyId] = useState<string | null>(null)
  const [filterDeathType, setFilterDeathType] = useState<string | null>(null)
  const [filterTraits, setFilterTraits] = useState<string[]>([])
  const [quickEditPersonId, setQuickEditPersonId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'cards'
    return (localStorage.getItem('person-list-view') as ViewMode) || 'cards'
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkEvalOpen, setBulkEvalOpen] = useState(false)
  // 세기/시대 navigator·밀도 바 → 클릭 시 점프할 ref 저장소 (그룹 key 기준)
  const centuryRefs = useRef<Map<string, HTMLElement>>(new Map())

  // 뷰 모드 변경 영구 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('person-list-view', viewMode)
    }
  }, [viewMode])

  // 뷰 모드/필터/정렬 변경 시 선택 초기화 — 화면에서 사라진 인물이 선택 상태로 남는 것 방지
  useEffect(() => {
    setSelectedIds(new Set())
  }, [viewMode, sortMode, filterCountryIds, filterDynastyId, filterDeathType, evalFilter, filterTraits])

  const toggleSelected = useCallback((id: string, _additive: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const targetPersons = ids
      .map((id) => persons.find((p) => p.id === id))
      .filter((p): p is PersonLike => p != null)
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `선택된 ${ids.length}명의 인물을 삭제할까요? (등록 정보·관계·평가 모두 함께 제거됩니다)\n\n삭제 후 5초 내에 토스트의 "되돌리기" 버튼으로 복원할 수 있습니다.`,
        danger: true,
      }))
    )
      return
    setBulkDeleting(true)
    try {
      const { deletePerson } = await import('@/shared/api/persons')
      const results = await Promise.allSettled(ids.map((id) => deletePerson(id)))
      const successIds = ids.filter((_, i) => results[i]!.status === 'fulfilled')
      const failed = results.length - successIds.length
      if (failed > 0) {
        notify.error(`${successIds.length}명 삭제 성공, ${failed}명 실패`)
      } else {
        // C3: 5초 Undo — 토스트의 버튼 클릭 시 삭제된 인물을 재등록
        notify.show(
          (t) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <span>{successIds.length}명을 삭제했습니다.</span>
              <button
                type="button"
                onClick={async () => {
                  notify.dismiss(t.id)
                  const undoToastId = notify.loading('복원 중…')
                  try {
                    const { createPerson } = await import('@/shared/api/persons')
                    const restored = targetPersons.filter((p) => successIds.includes(p.id))
                    await Promise.allSettled(
                      restored.map((p) =>
                        // 핵심 필드만 재등록 — 관계·평가 등은 유실 (cascade 됐기 때문)
                        createPerson({
                          name: p.name,
                          surname: p.surname ?? undefined,
                          gender: (p.gender as 'MALE' | 'FEMALE' | undefined) ?? undefined,
                          dynastyId: p.dynastyId ?? undefined,
                          countryId: p.countryId ?? undefined,
                          influence: p.influence ?? undefined,
                          biography: p.biography ?? undefined,
                          profileImageUrl: p.profileImageUrl ?? undefined,
                          regnalName: p.regnalName ?? undefined,
                          templeName: p.templeName ?? undefined,
                        }),
                      ),
                    )
                    notify.dismiss(undoToastId)
                    notify.success('복원되었습니다 (관계·평가 등 부속 정보는 유실).')
                    if (invalidateKeys.length > 0) {
                      queryClient.invalidateQueries({ queryKey: invalidateKeys as string[] })
                    }
                  } catch (err) {
                    notify.dismiss(undoToastId)
                    notify.error('복원 실패')
                  }
                }}
                style={{
                  background: '#fff',
                  color: '#4f46e5',
                  border: '1px solid #c7d2fe',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                되돌리기
              </button>
            </span>
          ),
          { duration: 5000 },
        )
      }
      setSelectedIds(new Set())
      if (invalidateKeys.length > 0) {
        queryClient.invalidateQueries({ queryKey: invalidateKeys as string[] })
      }
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] })
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, queryClient, invalidateKeys, persons])

  /** 사용자 전체 평가 인덱스 — 평가 indicator·정렬·필터에 활용 */
  const evalIndex = usePersonEvaluationIndex()

  /** 등록 인물에 실제 쓰인 가문만 chip — 전체 가문 풀에서 필터링하면 빈 결과 노이즈 */
  const dynastiesUsedByPersons = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>()
    for (const p of persons) {
      if (!p.dynastyId) continue
      const name =
        p.dynasty?.name ??
        dynasties.find((d) => d.id === p.dynastyId)?.name ??
        ''
      if (!name) continue
      const cur = counts.get(p.dynastyId)
      if (cur) cur.count += 1
      else counts.set(p.dynastyId, { id: p.dynastyId, name, count: 1 })
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count)
  }, [persons, dynasties])

  /** 등록 인물에 실제 쓰인 사망 유형만 chip */
  const deathTypesUsedByPersons = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of persons) {
      if (!p.deathType) continue
      counts.set(p.deathType, (counts.get(p.deathType) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [persons])

  /** B5: 평가에 부착된 태그만 chip — bulk eval index에서 카운트 */
  const traitsUsedByPersons = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of persons) {
      const traits = evalIndex.get(p.id)?.traits ?? []
      const seen = new Set<string>()
      for (const t of traits) {
        const key = t.trait as string
        if (seen.has(key)) continue // 한 인물당 한 트레이트 한 번만 카운트
        seen.add(key)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([trait, count]) => ({
        trait,
        count,
        // PERSON_TRAIT_META에서 라벨 가져옴
        label: (PERSON_TRAIT_META as Record<string, { label: string }>)[trait]?.label ?? trait,
      }))
      .sort((a, b) => b.count - a.count)
  }, [persons, evalIndex])

  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  const historicalByModern = useMemo(() => {
    const map: Record<string, typeof historicalCountries> = {}
    historicalCountries.forEach((hc) => {
      ;(hc as any).parentModernCountryIds?.forEach((mid: string) => {
        if (!map[mid]) map[mid] = []
        map[mid].push(hc)
      })
    })
    return map
  }, [historicalCountries])

  const modernCountriesWithHistory = useMemo(
    () => modernCountries.filter((mc) => (historicalByModern[mc.id]?.length ?? 0) > 0),
    [modernCountries, historicalByModern],
  )

  /** 프리셋 모드에서 표시할 국가 이름·플래그 — 현대/역사 국가 둘 다 검색 */
  const presetCountryInfo = useMemo(() => {
    if (!onClearPreset || !initialCountryId) return null
    const modern = modernCountries.find((c) => c.id === initialCountryId)
    if (modern) {
      return {
        name: modern.name,
        flag: (modern as { flagEmoji?: string | null }).flagEmoji ?? null,
      }
    }
    const hc = historicalCountries.find((c) => c.id === initialCountryId)
    if (hc) return { name: (hc as { name: string }).name, flag: null }
    return null
  }, [onClearPreset, initialCountryId, modernCountries, historicalCountries])

  const filteredPersons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return persons.filter((person) => {
      // 검색 — 이름·약력·가문 + 군주명·묘호·별명·직책·사망원인
      const name = getPersonDisplayName(person, true)
      const bio =
        person.biography
          ?.replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || ''
      const dynastyName =
        person.dynasty?.name ??
        (person.dynastyId != null
          ? dynasties.find((d) => d.id === person.dynastyId)?.name
          : '')
      const positionTitles =
        person.governmentTenures
          ?.map((t) => t.positionDefinition?.title ?? t.title ?? '')
          .filter(Boolean)
          .join(' ') ?? ''
      const nicknameStr =
        person.nicknames?.map((n) => n.nickname).join(' ') ?? ''
      const searchHaystack = [
        name,
        bio,
        dynastyName ?? '',
        person.regnalName ?? '',
        person.templeName ?? '',
        nicknameStr,
        positionTitles,
        person.deathCause ?? '',
      ]
        .join(' ')
        .toLowerCase()

      const matchSearch = !q || searchHaystack.includes(q)
      const matchGender =
        !filterGender ||
        (filterGender === 'MALE' && person.gender === 'MALE') ||
        (filterGender === 'FEMALE' && person.gender === 'FEMALE')
      const matchCountry =
        filterCountryIds.length === 0 ||
        (person.countryId != null &&
          filterCountryIds.includes(person.countryId))
      const matchDynasty =
        !filterDynastyId ||
        (person.dynastyId != null && person.dynastyId === filterDynastyId)
      const matchDeathType =
        !filterDeathType ||
        (person.deathType != null && person.deathType === filterDeathType)
      const matchEval =
        evalFilter === 'all' ||
        (evalFilter === 'evaluated' && evalIndex.get(person.id)?.hasEvaluation === true) ||
        (evalFilter === 'unevaluated' && !evalIndex.get(person.id)?.hasEvaluation)
      // B5: 트레이트 필터 — 선택된 모든 트레이트가 부착된 인물만 (AND 매칭)
      const matchTraits = (() => {
        if (filterTraits.length === 0) return true
        const personTraits = new Set(
          (evalIndex.get(person.id)?.traits ?? []).map((t) => t.trait as string),
        )
        return filterTraits.every((t) => personTraits.has(t))
      })()
      return (
        matchSearch &&
        matchGender &&
        matchCountry &&
        matchDynasty &&
        matchDeathType &&
        matchEval &&
        matchTraits
      )
    })
  }, [
    persons,
    dynasties,
    searchQuery,
    filterGender,
    filterCountryIds,
    filterDynastyId,
    filterDeathType,
    evalFilter,
    filterTraits,
    evalIndex,
  ])

  const personsByCentury = useMemo(() => {
    const toBirthSortableYear = (p: PersonLike): number => {
      const year = p.birthYear ?? p.birth_year
      const era = p.birthEra ?? p.birth_era
      if (year == null) return -Infinity
      return era === 'BC' ? -year : year
    }

    // 세기 외 정렬은 평면 그룹 (단일 키)으로 묶고 헤더 라벨을 정렬 모드 기준으로 표기
    if (sortMode !== 'century') {
      const sorters: Record<Exclude<SortMode, 'century'>, (a: PersonLike, b: PersonLike) => number> = {
        name: (a, b) =>
          getPersonDisplayName(a, true).localeCompare(
            getPersonDisplayName(b, true),
            'ko',
          ),
        influence: (a, b) =>
          (b.influence ?? -Infinity) - (a.influence ?? -Infinity),
        statsAvg: (a, b) => {
          const av = evalIndex.get(a.id)?.statsAverage ?? -Infinity
          const bv = evalIndex.get(b.id)?.statsAverage ?? -Infinity
          return bv - av
        },
        recent: (a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return bt - at
        },
      }
      const sorted = [...filteredPersons].sort(sorters[sortMode])
      // CENTURY_UNKNOWN을 평면 키로 재사용 — 렌더에서 평면 모드 체크
      return [[CENTURY_UNKNOWN, sorted]] as Array<[number, PersonLike[]]>
    }

    const currentCentury = Math.ceil(new Date().getFullYear() / 100)
    const map = new Map<number, PersonLike[]>()
    filteredPersons.forEach((p) => {
      const birthYear = p.birthYear ?? p.birth_year
      const birthEra = p.birthEra ?? p.birth_era
      // 출생년도 기준으로 세기 결정. 출생년도 없으면 세기 미상
      const isAlive = p.isAlive === true
      const key =
        birthYear != null
          ? (getCentury(birthYear ?? undefined, birthEra ?? undefined) ??
            CENTURY_UNKNOWN)
          : isAlive
            ? currentCentury
            : CENTURY_UNKNOWN
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })

    return Array.from(map.entries())
      .sort(([a], [b]) =>
        a === CENTURY_UNKNOWN ? 1 : b === CENTURY_UNKNOWN ? -1 : b - a,
      )
      .map(
        ([century, list]) =>
          [
            century,
            [...list].sort(
              (a, b) => toBirthSortableYear(b) - toBirthSortableYear(a),
            ),
          ] as [number, PersonLike[]],
      )
  }, [filteredPersons, sortMode, evalIndex])

  /**
   * 렌더용 그룹 — personsByCentury(세기 단위 원천)에서 파생.
   * - 평면 정렬: 헤더 없는 단일 패스스루 그룹
   * - 세기 그룹(century): 인접한 희소 세기를 같은 시대끼리 병합 (헤더·여백 낭비 제거)
   * - 시대 그룹(era): 고대/중세/근세/근현대 5개 거친 버킷
   */
  const displayGroups = useMemo<
    Array<{
      key: string
      centuries: number[]
      era: EraKey
      label: string
      navLabel: string
      persons: PersonLike[]
    }>
  >(() => {
    if (sortMode !== 'century') {
      return personsByCentury.map(([century, list]) => ({
        key: `flat-${century}`,
        centuries: [century],
        era: 'unknown' as EraKey,
        label: '',
        navLabel: '',
        persons: list,
      }))
    }

    const centuryLabelOf = (c: number) =>
      c === CENTURY_UNKNOWN
        ? '세기 미상'
        : c < 0
          ? `기원전 ${-c}세기`
          : `${c}세기`
    const centuryNavLabelOf = (c: number) =>
      c === CENTURY_UNKNOWN ? '미상' : c < 0 ? `BC ${-c}c` : `${c}c`

    if (groupBy === 'era') {
      const order: EraKey[] = [
        'modern',
        'early-modern',
        'medieval',
        'ancient',
        'unknown',
      ]
      const byEra = new Map<
        EraKey,
        { centuries: number[]; persons: PersonLike[] }
      >()
      personsByCentury.forEach(([century, list]) => {
        const era = getCenturyEra(century)
        if (!byEra.has(era)) byEra.set(era, { centuries: [], persons: [] })
        const g = byEra.get(era)!
        g.centuries.push(century)
        g.persons.push(...list)
      })
      return order
        .filter((era) => byEra.has(era))
        .map((era) => {
          const g = byEra.get(era)!
          return {
            key: `era-${era}`,
            centuries: g.centuries,
            era,
            label: ERA_LABEL[era],
            navLabel: ERA_NAV_LABEL[era],
            persons: g.persons,
          }
        })
    }

    // 세기 단위 + 희소 병합. personsByCentury는 최신(세기 내림차순)·미상 마지막 순.
    const groups: Array<{
      key: string
      centuries: number[]
      era: EraKey
      label: string
      navLabel: string
      persons: PersonLike[]
    }> = []
    let run: { era: EraKey; centuries: number[]; persons: PersonLike[] } | null =
      null
    const flushRun = () => {
      if (!run) return
      const cs = run.centuries // 내림차순 유지
      const hi = cs[0]
      const lo = cs[cs.length - 1]
      if (cs.length === 1) {
        groups.push({
          key: `c-${hi}`,
          centuries: cs,
          era: run.era,
          label: centuryLabelOf(hi),
          navLabel: centuryNavLabelOf(hi),
          persons: run.persons,
        })
      } else {
        // 범위 라벨은 오래된 쪽 먼저(한국어 관례 '15~19세기') — 화면 그룹 순서(최신→과거)와 별개.
        // ancient가 기원전~서기 5세기를 포괄하므로 BC/AD 혼합 run도 처리.
        const label =
          hi < 0
            ? `기원전 ${-lo}~${-hi}세기`
            : lo < 0
              ? `기원전 ${-lo}세기~${hi}세기`
              : `${lo}~${hi}세기`
        const navLabel =
          hi < 0
            ? `BC ${-lo}~${-hi}c`
            : lo < 0
              ? `BC ${-lo}c~${hi}c`
              : `${lo}~${hi}c`
        groups.push({
          key: `c-${hi}_${lo}`,
          centuries: cs,
          era: run.era,
          label,
          navLabel,
          persons: run.persons,
        })
      }
      run = null
    }
    personsByCentury.forEach(([century, list]) => {
      const era = getCenturyEra(century)
      const dense = list.length >= MERGE_THRESHOLD || century === CENTURY_UNKNOWN
      if (dense) {
        flushRun()
        groups.push({
          key: `c-${century}`,
          centuries: [century],
          era,
          label: centuryLabelOf(century),
          navLabel: centuryNavLabelOf(century),
          persons: list,
        })
        return
      }
      if (run && run.era === era) {
        run.centuries.push(century)
        run.persons.push(...list)
      } else {
        flushRun()
        run = { era, centuries: [century], persons: [...list] }
      }
    })
    flushRun()
    return groups
  }, [personsByCentury, sortMode, groupBy])

  /** 밀도 오버뷰용 세기별 인원 (오래된→최신 = 좌→우 타임라인). 세기 정렬일 때만. */
  const densityData = useMemo(() => {
    if (sortMode !== 'century') return [] as Array<{
      century: number
      count: number
      pct: number
      era: EraKey
    }>
    const known = personsByCentury.filter(([c]) => c !== CENTURY_UNKNOWN)
    if (known.length === 0)
      return [] as Array<{
        century: number
        count: number
        pct: number
        era: EraKey
      }>
    const counts = new Map(known.map(([c, l]) => [c, l.length]))
    const centuries = [...counts.keys()]
    const min = Math.min(...centuries)
    const max = Math.max(...centuries)
    const peak = Math.max(...counts.values(), 1)
    // min~max 사이 빈 세기도 0명 막대로 채움 — 등간격 막대에서 비연속 구간이
    // 연속처럼 보여 시대 밀도 분포를 오독하는 것 방지.
    const out: Array<{
      century: number
      count: number
      pct: number
      era: EraKey
    }> = []
    for (let c = min; c <= max; c++) {
      if (c === 0) continue // 0세기는 없음 (기원전 1세기 다음은 서기 1세기)
      const count = counts.get(c) ?? 0
      out.push({ century: c, count, pct: count / peak, era: getCenturyEra(c) })
    }
    return out
  }, [personsByCentury, sortMode])

  /** 세기 번호 → 렌더 그룹 key (밀도 바·navigator 점프 시 병합된 그룹으로 스크롤) */
  const centuryToGroupKey = useMemo(() => {
    const m = new Map<number, string>()
    displayGroups.forEach((g) => g.centuries.forEach((c) => m.set(c, g.key)))
    return m
  }, [displayGroups])

  useEffect(() => {
    onViewChange?.(selectedPersonId ? 'detail' : 'list')
  }, [selectedPersonId, onViewChange])

  useEffect(() => {
    if (registerTrigger != null && registerTrigger > 0) {
      setEditingPersonId(null)
      setShowRegisterForm(true)
    }
  }, [registerTrigger])

  return (
    <>
      {/* 등록/수정 모달 — renderRegisterModal prop으로 주입 (widgets 의존성 제거) */}
      {renderRegisterModal?.({
        isOpen: showRegisterForm,
        onClose: () => {
          setShowRegisterForm(false)
          setEditingPersonId(null)
        },
        initialCountryId,
        editPersonId: editingPersonId,
        onSuccess: (personId) => {
          const wasEditing = editingPersonId != null
          if (invalidateKeys.length > 0) {
            queryClient.invalidateQueries({
              queryKey: invalidateKeys as string[],
            })
          }
          if (personId) {
            queryClient.invalidateQueries({
              queryKey: personKeys.detailFull(personId),
            })
            queryClient.invalidateQueries({
              queryKey: personKeys.detail(personId),
            })
          }
          // 평가 인덱스도 갱신 — 인물 삭제·재등록 시 평가 키와 정합 유지
          queryClient.invalidateQueries({ queryKey: ['my-evaluations'] })
          setShowRegisterForm(false)
          setEditingPersonId(null)
          if (!wasEditing) {
            setSelectedPersonId(null)
          }
        },
      })}
      <AnimatePresence mode="wait">
        {selectedPersonId ? (
          <DetailViewWrap
            key="detail"
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PersonDetailPanel
              personId={selectedPersonId}
              onClose={() => setSelectedPersonId(null)}
              onEdit={(id) => {
                setEditingPersonId(id)
                setShowRegisterForm(true)
              }}
              closeLabel="목록으로"
            />
          </DetailViewWrap>
        ) : (
          <ListSectionWrap key="list">
            {presetCountryInfo && onClearPreset && (
              <PresetBanner role="status" aria-live="polite">
                <PresetBannerLeft>
                  <span>필터 고정:</span>
                  <PresetBannerPill>
                    {presetCountryInfo.flag && <span>{presetCountryInfo.flag}</span>}
                    {presetCountryInfo.name}
                  </PresetBannerPill>
                </PresetBannerLeft>
                <PresetBannerClose
                  type="button"
                  onClick={onClearPreset}
                  aria-label="국가 필터 해제"
                >
                  ← 전체 인물 보기
                </PresetBannerClose>
              </PresetBanner>
            )}
            <ListHeader $compact={hideMainHeader}>
              <ListHeaderLeft>
                {!hideMainHeader && (
                  <ListHeaderTitle>
                    {title}
                    <ListHeaderCount>
                      {(() => {
                        const isFiltering =
                          !!searchQuery.trim() ||
                          !!filterGender ||
                          filterCountryIds.length > 0
                        return isFiltering
                          ? `${filteredPersons.length} / ${persons.length}명`
                          : `${persons.length}명`
                      })()}
                    </ListHeaderCount>
                  </ListHeaderTitle>
                )}
              </ListHeaderLeft>
              <ToolbarRow>
                <SearchWrap>
                  <SearchIcon>
                    <FiSearch size={14} />
                  </SearchIcon>
                  <SearchInput
                    type="search"
                    placeholder="이름, 약력, 가문 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.currentTarget.blur()
                        setSearchQuery('')
                      }
                    }}
                    aria-label="인물 검색"
                  />
                </SearchWrap>
                <GenderBtnGroup role="group" aria-label="성별 필터">
                  <GenderBtn
                    type="button"
                    $gender="all"
                    $active={filterGender === ''}
                    onClick={() => setFilterGender('')}
                  >
                    전체
                  </GenderBtn>
                  <GenderBtn
                    type="button"
                    $gender="male"
                    $active={filterGender === 'MALE'}
                    onClick={() => setFilterGender('MALE')}
                  >
                    ♂ 남
                  </GenderBtn>
                  <GenderBtn
                    type="button"
                    $gender="female"
                    $active={filterGender === 'FEMALE'}
                    onClick={() => setFilterGender('FEMALE')}
                  >
                    ♀ 여
                  </GenderBtn>
                </GenderBtnGroup>
                <GenderBtnGroup role="group" aria-label="평가 여부 필터">
                  <GenderBtn
                    type="button"
                    $active={evalFilter === 'all'}
                    onClick={() => setEvalFilter('all')}
                  >
                    전체
                  </GenderBtn>
                  <GenderBtn
                    type="button"
                    $active={evalFilter === 'evaluated'}
                    onClick={() => setEvalFilter('evaluated')}
                    title="능력치·태그 평가가 있는 인물만"
                  >
                    <FiStar size={11} /> 평가됨
                  </GenderBtn>
                  <GenderBtn
                    type="button"
                    $active={evalFilter === 'unevaluated'}
                    onClick={() => setEvalFilter('unevaluated')}
                    title="평가 안 한 인물만"
                  >
                    미평가
                  </GenderBtn>
                </GenderBtnGroup>
                <ViewModeToggle role="group" aria-label="뷰 모드">
                  {VIEW_MODE_OPTIONS.map(({ key, label, Icon }) => (
                    <ViewModeBtn
                      key={key}
                      type="button"
                      $active={viewMode === key}
                      onClick={() => setViewMode(key)}
                      title={label}
                      aria-label={label}
                      aria-pressed={viewMode === key}
                    >
                      <Icon size={13} />
                    </ViewModeBtn>
                  ))}
                </ViewModeToggle>
                <SortSelect
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  aria-label="정렬"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </SortSelect>
                {sortMode === 'century' && (
                  <GroupByToggle
                    role="group"
                    aria-label="시대 그룹 입도"
                  >
                    <GroupByBtn
                      type="button"
                      $active={groupBy === 'century'}
                      aria-pressed={groupBy === 'century'}
                      onClick={() => setGroupBy('century')}
                      title="세기 단위 (희소 세기는 자동 병합)"
                    >
                      세기
                    </GroupByBtn>
                    <GroupByBtn
                      type="button"
                      $active={groupBy === 'era'}
                      aria-pressed={groupBy === 'era'}
                      onClick={() => setGroupBy('era')}
                      title="고대·중세·근세·근현대 5시대 단위"
                    >
                      시대
                    </GroupByBtn>
                  </GroupByToggle>
                )}
                {!hideCreateButton && (
                  <CreateButton
                    type="button"
                    onClick={() => {
                      setEditingPersonId(null)
                      setShowRegisterForm(true)
                    }}
                    aria-label="인물 등록"
                  >
                    <FiPlus size={14} />
                    인물 등록
                  </CreateButton>
                )}
              </ToolbarRow>
            </ListHeader>

            {/* 다중 선택 툴바 — 선택된 인물이 있을 때만 등장 */}
            {selectedIds.size > 0 && (
              <BulkActionBar role="toolbar" aria-label="다중 선택 액션">
                <BulkActionLeft>
                  <BulkSelectedCount>{selectedIds.size}명 선택됨</BulkSelectedCount>
                  <BulkActionGhost
                    type="button"
                    onClick={() =>
                      setSelectedIds(
                        new Set(personsByCentury.flatMap(([, l]) => l).map((p) => p.id)),
                      )
                    }
                  >
                    화면 전체 선택
                  </BulkActionGhost>
                  <BulkActionGhost type="button" onClick={() => setSelectedIds(new Set())}>
                    선택 해제
                  </BulkActionGhost>
                </BulkActionLeft>
                <BulkActionRight>
                  <BulkActionPrimary
                    type="button"
                    onClick={() => setBulkEvalOpen(true)}
                    disabled={bulkDeleting}
                    title="선택된 인물에 동일 평가 적용"
                  >
                    <FiStar size={13} /> 선택 평가
                  </BulkActionPrimary>
                  <BulkActionDanger
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                  >
                    <FiTrash2 size={13} />
                    {bulkDeleting ? '삭제 중…' : '선택 삭제'}
                  </BulkActionDanger>
                </BulkActionRight>
              </BulkActionBar>
            )}

            {enableCountryFilter && modernCountriesWithHistory.length > 0 && (
              <CountryFilterSection>
                <ModernCountryRow>
                  {modernCountriesWithHistory.map((mc) => {
                    const hcList = historicalByModern[mc.id] ?? []
                    const hcIds = hcList.map((hc) => hc.id)
                    const allSelected = hcIds.length > 0 && hcIds.every((id) => filterCountryIds.includes(id))
                    const hasActive = hcList.some((hc) => filterCountryIds.includes(hc.id))
                    const isExpanded = expandedModernId === mc.id
                    return (
                      <ModernCountryChip
                        key={mc.id}
                        type="button"
                        $active={allSelected}
                        $hasFilter={hasActive && !allSelected}
                        onClick={() => {
                          if (allSelected) {
                            setFilterCountryIds([])
                            setExpandedModernId(null)
                          } else {
                            setFilterCountryIds(hcIds)
                            setExpandedModernId(mc.id)
                          }
                        }}
                      >
                        {(mc as any).flagEmoji && <span>{(mc as any).flagEmoji}</span>}
                        {mc.name}
                        {hasActive && <ActiveFilterDot />}
                      </ModernCountryChip>
                    )
                  })}
                  {filterCountryIds.length > 0 && (
                    <ClearFilterBtn type="button" onClick={() => { setFilterCountryIds([]); setExpandedModernId(null) }}>
                      필터 초기화
                    </ClearFilterBtn>
                  )}
                </ModernCountryRow>
                {expandedModernId && (historicalByModern[expandedModernId]?.length ?? 0) > 0 && (
                  <HistoricalCountryRow>
                    {(historicalByModern[expandedModernId] ?? [])
                      .slice()
                      .sort((a, b) => {
                        const ay = (a as any).startEra === 'BC' ? -((a as any).startYear ?? 0) : ((a as any).startYear ?? 9999)
                        const by_ = (b as any).startEra === 'BC' ? -((b as any).startYear ?? 0) : ((b as any).startYear ?? 9999)
                        return ay - by_
                      })
                      .map((hc) => {
                        const isActive = filterCountryIds.includes(hc.id)
                        const startYear = (hc as any).startYear
                        const endYear = (hc as any).endYear
                        const startEra = (hc as any).startEra
                        const endEra = (hc as any).endEra
                        const yearRange = startYear
                          ? `${startEra === 'BC' ? 'BC ' : ''}${startYear}${endYear ? ` ~ ${endEra === 'BC' ? 'BC ' : ''}${endYear}` : ' ~'}`
                          : null
                        return (
                          <HistoricalCountryChip
                            key={hc.id}
                            type="button"
                            $active={isActive}
                            onClick={() =>
                              setFilterCountryIds((prev) =>
                                prev.includes(hc.id)
                                  ? prev.filter((x) => x !== hc.id)
                                  : [...prev, hc.id],
                              )
                            }
                          >
                            <HistoricalChipName>{hc.name}</HistoricalChipName>
                            {yearRange && <HistoricalChipYear>{yearRange}</HistoricalChipYear>}
                          </HistoricalCountryChip>
                        )
                      })}
                  </HistoricalCountryRow>
                )}
              </CountryFilterSection>
            )}

            {/* 가문 필터 — 등록된 인물의 가문만 chip 노출 (전체 가문에서 필터링하면 노이즈) */}
            {dynastiesUsedByPersons.length > 0 && (
              <SecondaryFilterRow aria-label="가문 필터">
                <SecondaryFilterLabel>가문</SecondaryFilterLabel>
                <SecondaryChipScroll>
                  <SecondaryChip
                    type="button"
                    $active={filterDynastyId === null}
                    onClick={() => setFilterDynastyId(null)}
                  >
                    전체
                  </SecondaryChip>
                  {dynastiesUsedByPersons.map((d) => (
                    <SecondaryChip
                      key={d.id}
                      type="button"
                      $active={filterDynastyId === d.id}
                      onClick={() =>
                        setFilterDynastyId((prev) => (prev === d.id ? null : d.id))
                      }
                    >
                      {d.name}
                      <SecondaryChipCount>{d.count}</SecondaryChipCount>
                    </SecondaryChip>
                  ))}
                </SecondaryChipScroll>
              </SecondaryFilterRow>
            )}

            {/* B5: 트레이트 필터 — 평가에 사용된 태그만 chip 노출 (AND 매칭) */}
            {traitsUsedByPersons.length > 0 && (
              <SecondaryFilterRow aria-label="태그 필터">
                <SecondaryFilterLabel>태그</SecondaryFilterLabel>
                <SecondaryChipScroll>
                  <SecondaryChip
                    type="button"
                    $active={filterTraits.length === 0}
                    onClick={() => setFilterTraits([])}
                  >
                    전체
                  </SecondaryChip>
                  {traitsUsedByPersons.map((t) => (
                    <SecondaryChip
                      key={t.trait}
                      type="button"
                      $active={filterTraits.includes(t.trait)}
                      onClick={() =>
                        setFilterTraits((prev) =>
                          prev.includes(t.trait)
                            ? prev.filter((x) => x !== t.trait)
                            : [...prev, t.trait],
                        )
                      }
                    >
                      {t.label}
                      <SecondaryChipCount>{t.count}</SecondaryChipCount>
                    </SecondaryChip>
                  ))}
                </SecondaryChipScroll>
              </SecondaryFilterRow>
            )}

            {/* 사망 유형 필터 — 등록된 인물의 사망 유형만 chip 노출 */}
            {deathTypesUsedByPersons.length > 0 && (
              <SecondaryFilterRow aria-label="사망 유형 필터">
                <SecondaryFilterLabel>사망 유형</SecondaryFilterLabel>
                <SecondaryChipScroll>
                  <SecondaryChip
                    type="button"
                    $active={filterDeathType === null}
                    onClick={() => setFilterDeathType(null)}
                  >
                    전체
                  </SecondaryChip>
                  {deathTypesUsedByPersons.map((dt) => (
                    <SecondaryChip
                      key={dt.type}
                      type="button"
                      $active={filterDeathType === dt.type}
                      onClick={() =>
                        setFilterDeathType((prev) => (prev === dt.type ? null : dt.type))
                      }
                    >
                      {DEATH_TYPE_LABELS[dt.type] ?? dt.type}
                      <SecondaryChipCount>{dt.count}</SecondaryChipCount>
                    </SecondaryChip>
                  ))}
                </SecondaryChipScroll>
              </SecondaryFilterRow>
            )}

            {persons.length === 0 ? (
              <EmptyState>
                <EmptyStateTitle>{emptyMessage}</EmptyStateTitle>
                <EmptyStateDesc>
                  새 인물을 등록해 생몰·가문·영향력 등 풍부한 정보를 기록할 수 있습니다.
                </EmptyStateDesc>
                {!hideCreateButton && (
                  <EmptyStateActions>
                    <EmptyStateCta
                      $primary
                      type="button"
                      onClick={() => {
                        setEditingPersonId(null)
                        setShowRegisterForm(true)
                      }}
                    >
                      <FiPlus size={14} />
                      첫 인물 등록
                    </EmptyStateCta>
                  </EmptyStateActions>
                )}
              </EmptyState>
            ) : filteredPersons.length === 0 ? (
              (() => {
                // 활성 필터 목록 — 어떤 필터가 결과를 좁혔는지 사용자에게 명시
                const activeFilters: Array<{ label: string; clear: () => void }> = []
                if (searchQuery.trim())
                  activeFilters.push({
                    label: `검색 "${searchQuery.trim()}"`,
                    clear: () => setSearchQuery(''),
                  })
                if (filterGender)
                  activeFilters.push({
                    label: filterGender === 'MALE' ? '성별: 남' : '성별: 여',
                    clear: () => setFilterGender(''),
                  })
                if (filterCountryIds.length > 0)
                  activeFilters.push({
                    label: `국가 ${filterCountryIds.length}개`,
                    clear: () => {
                      setFilterCountryIds([])
                      setExpandedModernId(null)
                    },
                  })
                if (filterDynastyId) {
                  const d = dynasties.find((x) => x.id === filterDynastyId)
                  activeFilters.push({
                    label: `가문: ${d?.name ?? '?'}`,
                    clear: () => setFilterDynastyId(null),
                  })
                }
                if (filterDeathType)
                  activeFilters.push({
                    label: `사망: ${DEATH_TYPE_LABELS[filterDeathType] ?? filterDeathType}`,
                    clear: () => setFilterDeathType(null),
                  })
                if (evalFilter !== 'all')
                  activeFilters.push({
                    label: evalFilter === 'evaluated' ? '평가됨만' : '미평가만',
                    clear: () => setEvalFilter('all'),
                  })
                if (filterTraits.length > 0)
                  activeFilters.push({
                    label: `태그 ${filterTraits.length}개`,
                    clear: () => setFilterTraits([]),
                  })
                return (
                  <EmptyState>
                    <EmptyStateTitle>{emptyFilterMessage}</EmptyStateTitle>
                    <EmptyStateDesc>
                      현재 활성 필터: {activeFilters.length === 0 ? '없음' : ''}
                      {activeFilters.map((f, i) => (
                        <ActiveFilterPill key={i}>
                          {f.label}
                          <ActiveFilterClearX type="button" onClick={f.clear} aria-label={`${f.label} 해제`}>
                            ×
                          </ActiveFilterClearX>
                        </ActiveFilterPill>
                      ))}
                    </EmptyStateDesc>
                    <EmptyStateActions>
                      <EmptyStateCta
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setFilterGender('')
                          setFilterCountryIds([])
                          setExpandedModernId(null)
                          setFilterDynastyId(null)
                          setFilterDeathType(null)
                          setEvalFilter('all')
                          setFilterTraits([])
                        }}
                      >
                        모든 필터 초기화
                      </EmptyStateCta>
                    </EmptyStateActions>
                  </EmptyState>
                )
              })()
            ) : viewMode === 'table' ? (
              // 테이블 뷰 — 95명 단위 비교에 최적
              <ListScrollArea>
                <PersonTable
                  persons={personsByCentury.flatMap(([, l]) => l)}
                  dynasties={dynasties}
                  evalIndex={evalIndex}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                  onToggleAll={(allSelected) => {
                    if (allSelected) {
                      setSelectedIds(new Set())
                    } else {
                      setSelectedIds(
                        new Set(personsByCentury.flatMap(([, l]) => l).map((p) => p.id)),
                      )
                    }
                  }}
                  onPersonClick={(id) =>
                    onPersonClick ? onPersonClick(id) : setSelectedPersonId(id)
                  }
                  onQuickEdit={setQuickEditPersonId}
                />
              </ListScrollArea>
            ) : (
              <ListWithNavWrap>
              <ListScrollArea>
                {/* 시대 밀도 오버뷰 — 세기별 인원 히스토그램 (좌:오래된 → 우:최신) */}
                {sortMode === 'century' && densityData.length > 1 && (
                  <DensityOverview aria-label="세기별 인원 밀도">
                    {densityData.map((d) => {
                      const label =
                        d.century < 0
                          ? `기원전 ${-d.century}세기`
                          : `${d.century}세기`
                      return (
                        <DensityCol
                          key={`density-${d.century}`}
                          type="button"
                          $era={d.era}
                          title={`${label} · ${d.count}명`}
                          disabled={d.count === 0}
                          onClick={() => {
                            const key = centuryToGroupKey.get(d.century)
                            const el = key && centuryRefs.current.get(key)
                            if (el)
                              el.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              })
                          }}
                        >
                          <DensityFill
                            $era={d.era}
                            $pct={d.pct}
                            $empty={d.count === 0}
                          />
                        </DensityCol>
                      )
                    })}
                  </DensityOverview>
                )}
                {displayGroups.map((group) => {
                  const { era, label: centuryLabel, persons: list } = group
                  const isFlatSort = sortMode !== 'century'
                  return (
                  <CenturySection
                    key={`${sortMode}-${groupBy}-${group.key}`}
                    ref={(el) => {
                      if (el) centuryRefs.current.set(group.key, el)
                      else centuryRefs.current.delete(group.key)
                    }}
                  >
                    {!isFlatSort && <CenturySeparator $era={era} />}
                    {!isFlatSort && (
                      <CenturyHeadingRow>
                        <CenturyHeadingLeft>
                          <CenturyEraDot $era={era} />
                          <CenturyHeadingLabel>
                            {centuryLabel}
                          </CenturyHeadingLabel>
                        </CenturyHeadingLeft>
                        <CenturyCountBadge>
                          {list.length}명
                        </CenturyCountBadge>
                      </CenturyHeadingRow>
                    )}
                    <AdaptiveGrid
                      as={motion.div}
                      $compact={viewMode === 'compact'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      {list.map((person) => {
                        const fullName = getPersonDisplayName(person)
                        const bioText = (() => {
                          const raw = person.biography?.trim() || ''
                          if (!raw) return ''
                          // HTML 태그 제거
                          return raw
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/\s+/g, ' ')
                            .trim()
                        })()
                        const bioExcerpt =
                          bioText.length > 120
                            ? `${bioText.slice(0, 120)}…`
                            : bioText || null
                        const displayImage = person.profileImageUrl
                        const showNewBadge = isRegisteredWithin24h(
                          person.createdAt ?? (person as any).created_at,
                        )
                        const dynastyName =
                          person.dynasty?.name ??
                          (person.dynastyId != null
                            ? dynasties.find((d) => d.id === person.dynastyId)
                                ?.name
                            : undefined)
                        const birthPlace =
                          person.birthCity?.name ??
                          person.birthAdminDivision?.name ??
                          person.birthPlaceText ??
                          null
                        // ── infographic card data ──────────────────────
                        const birthYear = person.birthYear ?? person.birth_year
                        const deathYear = person.deathYear ?? person.death_year
                        // 카드 시대 배지 — 출생 세기 기준. 평면 정렬에서도 시대 식별
                        const cardCentury = getCentury(
                          birthYear ?? undefined,
                          (person.birthEra ?? person.birth_era) ?? undefined,
                        )
                        const cardEra =
                          cardCentury != null
                            ? getCenturyEra(cardCentury)
                            : null
                        const cardEraLabel =
                          cardCentury != null
                            ? cardCentury < 0
                              ? `BC ${-cardCentury}C`
                              : `${cardCentury}C`
                            : null
                        const ageAtDeath =
                          birthYear != null &&
                          deathYear != null &&
                          (person.birthEra ?? person.birth_era) !== 'BC' &&
                          (person.deathEra ?? person.death_era) !== 'BC'
                            ? deathYear - birthYear
                            : null
                        // lifespan bar: fill % = age / 100 capped at 100
                        const lifePct =
                          ageAtDeath != null
                            ? Math.min(Math.max(ageAtDeath, 4), 100)
                            : birthYear != null
                              ? 8 // living or unknown — show a stub
                              : 0

                        const primaryTenure = person.governmentTenures?.[0]
                        const primaryPositionType =
                          primaryTenure?.positionDefinition?.positionType ??
                          primaryTenure?.positionType
                        const accentColor = getPositionColor(primaryPositionType)
                        const isDark = isDarkMode

                        const monarchName =
                          person.templeName ||
                          person.regnalName ||
                          null

                        const positionTitles = Array.from(
                          new Set(
                            (person.governmentTenures ?? [])
                              .map(
                                (t) =>
                                  t.positionDefinition?.title ?? t.title,
                              )
                              .filter(Boolean),
                          ),
                        ).slice(0, 2) as string[]

                        const evalSummary = evalIndex.get(person.id) ?? null
                        const monogram = buildMonogram(person)

                        return (
                          <CardWrap key={person.id}>
                            {/* 다중 선택 체크박스 — 모든 카드 모드에서 좌상단 노출 */}
                            <CardCheckbox
                              type="button"
                              data-quick-edit="true"
                              $checked={selectedIds.has(person.id)}
                              aria-label={
                                selectedIds.has(person.id) ? '선택 해제' : '선택'
                              }
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                toggleSelected(person.id, false)
                              }}
                            >
                              {selectedIds.has(person.id) ? (
                                <FiCheck size={11} />
                              ) : (
                                <FiSquare size={11} />
                              )}
                            </CardCheckbox>
                            <Card
                              type="button"
                              $compact={viewMode === 'compact'}
                              $selected={selectedIds.has(person.id)}
                              aria-label={`${fullName || '이름 없음'} 상세 보기`}
                              onClick={() =>
                                onPersonClick
                                  ? onPersonClick(person.id)
                                  : setSelectedPersonId(person.id)
                              }
                            >
                            {/* Image — left column */}
                            <CardImageSide $compact={viewMode === 'compact'}>
                              {showNewBadge && <NewBadge>NEW</NewBadge>}
                              <InfluenceBadge
                                influence={person.influence}
                                variant="overlay"
                              />
                              {displayImage ? (
                                <CardImage
                                  src={displayImage}
                                  alt={fullName}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <CardMonogram
                                  $color={accentColor}
                                  $compact={viewMode === 'compact'}
                                >
                                  {monogram}
                                </CardMonogram>
                              )}
                            </CardImageSide>

                            {/* Info — right column */}
                            <CardContent>
                              <PersonNameRow>
                                <PersonName>
                                  {fullName
                                    ? highlightMatch(fullName, searchQuery)
                                    : '(이름 없음)'}
                                </PersonName>
                                {person.gender === 'MALE' && (
                                  <GenderBadge $gender="MALE">♂ 남</GenderBadge>
                                )}
                                {person.gender === 'FEMALE' && (
                                  <GenderBadge $gender="FEMALE">♀ 여</GenderBadge>
                                )}
                                {cardEra && cardEraLabel && (
                                  <EraBadge
                                    $era={cardEra}
                                    title={`${cardEraLabel} · ${ERA_NAV_LABEL[cardEra]}`}
                                  >
                                    {cardEraLabel}
                                  </EraBadge>
                                )}
                                {evalSummary?.hasEvaluation && (
                                  <EvalPinBtn
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      setQuickEditPersonId(person.id)
                                    }}
                                    title={
                                      evalSummary.statsAverage != null
                                        ? `내 평가 평균 ${evalSummary.statsAverage}점${evalSummary.traitCount > 0 ? ` · 태그 ${evalSummary.traitCount}개` : ''} · 클릭으로 수정`
                                        : `내 평가됨 · 태그 ${evalSummary.traitCount}개 · 클릭으로 수정`
                                    }
                                  >
                                    <FiTarget size={9} />
                                    평가됨
                                  </EvalPinBtn>
                                )}
                              </PersonNameRow>

                              {person.country?.name && (
                                <CardCountryRow>
                                  {person.country.flagEmoji && (
                                    <CardCountryFlag>{person.country.flagEmoji}</CardCountryFlag>
                                  )}
                                  <CardCountryName>{person.country.name}</CardCountryName>
                                </CardCountryRow>
                              )}

                              {monarchName && (
                                <MonarchNameRow>
                                  <MonarchCrown>♛</MonarchCrown>
                                  <MonarchNameText>{monarchName}</MonarchNameText>
                                </MonarchNameRow>
                              )}

                              {/* Lifespan bar — track 폭은 100세 만점 기준의 수명 비율 */}
                              <LifespanRow
                                title={
                                  ageAtDeath != null
                                    ? `수명 ${ageAtDeath}세 (track 100세 만점 기준)`
                                    : birthYear != null
                                      ? '생존 또는 사망일 미상'
                                      : '생몰년 미상'
                                }
                              >
                                {birthYear != null ? (
                                  <>
                                    <LifespanYear>
                                      {(person.birthEra ?? person.birth_era) === 'BC' ? 'BC ' : ''}
                                      {Math.abs(birthYear)}
                                    </LifespanYear>
                                    <LifespanTrack>
                                      <LifespanFill $color={accentColor} $pct={lifePct} />
                                    </LifespanTrack>
                                    <LifespanYear>
                                      {deathYear != null
                                        ? `${(person.deathEra ?? person.death_era) === 'BC' ? 'BC ' : ''}${Math.abs(deathYear)}`
                                        : '現'}
                                    </LifespanYear>
                                    {ageAtDeath != null && (
                                      <LifespanAge>· {ageAtDeath}세</LifespanAge>
                                    )}
                                  </>
                                ) : (
                                  <LifespanYearMuted>생몰년 미상</LifespanYearMuted>
                                )}
                              </LifespanRow>

                              {/* Position badges */}
                              {positionTitles.length > 0 && (
                                <CardBadgeRow>
                                  {positionTitles.map((title, i) => {
                                    const pt =
                                      person.governmentTenures?.[i]
                                        ?.positionDefinition?.positionType ??
                                      person.governmentTenures?.[i]?.positionType
                                    return (
                                      <CardHeadsBadge
                                        key={i}
                                        $color={getPositionColor(pt)}
                                        $bg={getPositionBg(pt, isDark)}
                                      >
                                        {title}
                                      </CardHeadsBadge>
                                    )
                                  })}
                                </CardBadgeRow>
                              )}

                              {/* Dynasty / birthplace — 조밀 모드에서는 가문만 1줄 */}
                              {dynastyName && (
                                <CardMetaRow>
                                  <CardMetaLabel>가문</CardMetaLabel>
                                  <CardMetaValue>{dynastyName}</CardMetaValue>
                                </CardMetaRow>
                              )}
                              {viewMode !== 'compact' && birthPlace && (
                                <CardMetaRow>
                                  <CardMetaLabel>출신</CardMetaLabel>
                                  <CardMetaValue>{birthPlace}</CardMetaValue>
                                </CardMetaRow>
                              )}

                              {viewMode !== 'compact' && bioExcerpt && (
                                <CardBio>{highlightMatch(bioExcerpt, searchQuery)}</CardBio>
                              )}
                            </CardContent>
                            </Card>
                            {/* Hover quick-edit — 모달 직접 호출, 카드 클릭(상세 진입)을 가로채지 않도록 stopPropagation */}
                            <QuickEditBtn
                              type="button"
                              data-quick-edit="true"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setQuickEditPersonId(person.id)
                              }}
                              title={evalSummary?.hasEvaluation ? '평가 수정' : '평가 시작'}
                              aria-label={evalSummary?.hasEvaluation ? '평가 수정' : '평가 시작'}
                            >
                              <FiStar size={12} />
                              {evalSummary?.hasEvaluation ? '수정' : '평가'}
                            </QuickEditBtn>
                          </CardWrap>
                        )
                      })}
                    </AdaptiveGrid>
                  </CenturySection>
                  )
                })}
              </ListScrollArea>
              {/* 세기/시대 navigator — 세기별 정렬일 때만 노출, 95명+ 빠른 점프 */}
              {sortMode === 'century' && displayGroups.length > 1 && (
                <CenturyNav aria-label="세기 navigator">
                  {displayGroups.map((group) => {
                    const { era, navLabel: label, persons: list } = group
                    return (
                      <CenturyNavBtn
                        key={`nav-${group.key}`}
                        type="button"
                        onClick={() => {
                          const el = centuryRefs.current.get(group.key)
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        title={`${label} (${list.length}명)`}
                      >
                        <CenturyNavDot $era={era} />
                        <CenturyNavLabel>{label}</CenturyNavLabel>
                        <CenturyNavCount>{list.length}</CenturyNavCount>
                      </CenturyNavBtn>
                    )
                  })}
                </CenturyNav>
              )}
              </ListWithNavWrap>
            )}
          </ListSectionWrap>
        )}
      </AnimatePresence>

      {/* D5: 일괄 평가 모달 */}
      <PersonBulkEvaluateModal
        open={bulkEvalOpen}
        personIds={Array.from(selectedIds)}
        onClose={() => setBulkEvalOpen(false)}
      />

      {/* Hover quick-edit 모달 — 리스트에서 평가 직접 호출 */}
      {quickEditPersonId && (
        <PersonStatsEditModal
          open={true}
          personId={quickEditPersonId}
          personName={(() => {
            const p = persons.find((x) => x.id === quickEditPersonId)
            return p ? getPersonDisplayName(p as PersonLike) : undefined
          })()}
          initialStats={evalIndex.get(quickEditPersonId)?.stats ?? null}
          initialTraits={evalIndex.get(quickEditPersonId)?.traits ?? []}
          canDelete={evalIndex.get(quickEditPersonId)?.hasEvaluation ?? false}
          onClose={() => setQuickEditPersonId(null)}
        />
      )}
    </>
  )
}
