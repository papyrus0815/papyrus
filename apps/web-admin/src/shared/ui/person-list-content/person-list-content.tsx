/**
 * 인물 리스트 UI — 국가 상세·인물 페이지 공용
 * 국가 선택 시 인물 탭과 동일한 기능·디자인
 */
import { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { FiPlus, FiSearch } from 'react-icons/fi'
import styled, { css, useTheme } from 'styled-components'

import { personKeys } from '@/entities/person/api'
import { useHistoricalCountries } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { getPositionBg, getPositionColor } from '@/shared/lib/position-color'
import { InfluenceBadge } from '@/shared/ui/influence-badge'
import { BORDER_COLOR, FOCUS_COLOR } from '@/shared/ui/register-form-layout'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'

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

const AdaptiveGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 14px;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`

/** 세기 시대 → 강조 색. 인포그래픽 ERAS와 매핑 통일. */
type EraKey = 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'unknown'

function getCenturyEra(century: number): EraKey {
  if (century === CENTURY_UNKNOWN) return 'unknown'
  if (century < 0) return 'ancient'
  if (century <= 10) return 'medieval'
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

const CenturySection = styled.section`
  margin-bottom: 32px;
  &:last-child {
    margin-bottom: 0;
  }
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

/* ── Horizontal person card ─────────────────────────────────────────── */

/**
 * 인물 카드 — 키보드 접근성을 위해 `<button>`.
 * Enter/Space는 native button이 자동 처리, focus-visible 링 추가.
 */
const Card = styled.button`
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  cursor: pointer;
  min-height: 116px;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  padding: 0;
  margin: 0;
  border: none;
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
const CardImageSide = styled.div`
  width: 110px;
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
  max-width: 420px;
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
    return persons.filter((person) => {
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
      const matchSearch =
        !searchQuery.trim() ||
        name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        bio.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        (dynastyName ?? '')
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      const matchGender =
        !filterGender ||
        (filterGender === 'MALE' && person.gender === 'MALE') ||
        (filterGender === 'FEMALE' && person.gender === 'FEMALE')
      const matchCountry =
        filterCountryIds.length === 0 ||
        (person.countryId != null &&
          filterCountryIds.includes(person.countryId))
      return matchSearch && matchGender && matchCountry
    })
  }, [
    persons,
    dynasties,
    searchQuery,
    filterGender,
    filterCountryIds,
  ])

  const personsByCentury = useMemo(() => {
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

    const toBirthSortableYear = (p: PersonLike): number => {
      const year = p.birthYear ?? p.birth_year
      const era = p.birthEra ?? p.birth_era
      if (year == null) return -Infinity
      return era === 'BC' ? -year : year
    }

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
  }, [filteredPersons])

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
              <EmptyState>
                <EmptyStateTitle>{emptyFilterMessage}</EmptyStateTitle>
                <EmptyStateDesc>
                  검색어·성별·국가 필터를 조정하거나 초기화해 다시 확인해보세요.
                </EmptyStateDesc>
                <EmptyStateActions>
                  <EmptyStateCta
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setFilterGender('')
                      setFilterCountryIds([])
                      setExpandedModernId(null)
                    }}
                  >
                    필터 초기화
                  </EmptyStateCta>
                </EmptyStateActions>
              </EmptyState>
            ) : (
              <ListScrollArea>
                {personsByCentury.map(([century, list]) => {
                  const era = getCenturyEra(century)
                  const centuryLabel =
                    century === CENTURY_UNKNOWN
                      ? '세기 미상'
                      : century < 0
                        ? `기원전 ${-century}세기`
                        : `${century}세기`
                  return (
                  <CenturySection key={century}>
                    <CenturySeparator $era={era} />
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
                    <AdaptiveGrid
                      as={motion.div}
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

                        return (
                          <Card
                            key={person.id}
                            type="button"
                            aria-label={`${fullName || '이름 없음'} 상세 보기`}
                            onClick={() =>
                              onPersonClick
                                ? onPersonClick(person.id)
                                : setSelectedPersonId(person.id)
                            }
                          >
                            {/* Image — left column */}
                            <CardImageSide>
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
                                <CardImagePlaceholder $color={accentColor}>
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                  </svg>
                                </CardImagePlaceholder>
                              )}
                            </CardImageSide>

                            {/* Info — right column */}
                            <CardContent>
                              <PersonNameRow>
                                <PersonName>{fullName || '(이름 없음)'}</PersonName>
                                {person.gender === 'MALE' && (
                                  <GenderBadge $gender="MALE">♂ 남</GenderBadge>
                                )}
                                {person.gender === 'FEMALE' && (
                                  <GenderBadge $gender="FEMALE">♀ 여</GenderBadge>
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

                              {/* Lifespan bar */}
                              <LifespanRow>
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

                              {/* Dynasty / birthplace */}
                              {dynastyName && (
                                <CardMetaRow>
                                  <CardMetaLabel>가문</CardMetaLabel>
                                  <CardMetaValue>{dynastyName}</CardMetaValue>
                                </CardMetaRow>
                              )}
                              {birthPlace && (
                                <CardMetaRow>
                                  <CardMetaLabel>출신</CardMetaLabel>
                                  <CardMetaValue>{birthPlace}</CardMetaValue>
                                </CardMetaRow>
                              )}

                              {bioExcerpt && <CardBio>{bioExcerpt}</CardBio>}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </AdaptiveGrid>
                  </CenturySection>
                  )
                })}
              </ListScrollArea>
            )}
          </ListSectionWrap>
        )}
      </AnimatePresence>
    </>
  )
}
