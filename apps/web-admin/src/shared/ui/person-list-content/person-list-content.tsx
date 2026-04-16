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

// ─── Position type color mapping ─────────────────────────────────────────────
function getPositionColor(positionType: string | null | undefined): string {
  switch (positionType) {
    case 'HEAD_OF_STATE':
      return '#d97706' // amber – monarchs/presidents
    case 'HEAD_OF_GOVERNMENT':
      return '#4f46e5' // indigo – prime ministers/chancellors
    case 'CABINET_MINISTER':
      return '#0891b2' // cyan – ministers
    case 'LEGISLATOR':
      return '#059669' // emerald – legislators
    case 'MILITARY_COMMANDER':
      return '#dc2626' // red – military
    case 'JUDICIARY':
      return '#7c3aed' // violet – judiciary
    default:
      return '#64748b' // slate – others
  }
}

function getPositionBg(
  positionType: string | null | undefined,
  dark = false,
): string {
  const colorMap: Record<string, [string, string]> = {
    HEAD_OF_STATE: ['#fef3c7', 'rgba(217,119,6,0.18)'],
    HEAD_OF_GOVERNMENT: ['#eef2ff', 'rgba(79,70,229,0.18)'],
    CABINET_MINISTER: ['#ecfeff', 'rgba(8,145,178,0.18)'],
    LEGISLATOR: ['#d1fae5', 'rgba(5,150,105,0.18)'],
    MILITARY_COMMANDER: ['#fee2e2', 'rgba(220,38,38,0.18)'],
    JUDICIARY: ['#ede9fe', 'rgba(124,58,237,0.18)'],
  }
  const pair = colorMap[positionType ?? ''] ?? ['#f1f5f9', 'rgba(100,116,139,0.15)']
  return dark ? pair[1] : pair[0]
}

// ─── Styled ───────────────────────────────────────────────────────────────────
const ListHeader = styled.header<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
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
`

const SearchWrap = styled.div`
  flex: 1;
  min-width: 180px;
  max-width: 240px;
  position: relative;
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
  box-sizing: border-box;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: ${theme.colors.text.primary};
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          &::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }
          &:hover {
            border-color: rgba(255, 255, 255, 0.2);
          }
          &:focus {
            border-color: rgba(99, 106, 242, 0.5);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(99, 106, 242, 0.15);
          }
        `
      : css`
          color: #111827;
          background: #f8fafc;
          border: 1px solid ${BORDER_COLOR};
          &::placeholder {
            color: #9ca3af;
          }
          &:hover {
            border-color: #d1d5db;
          }
          &:focus {
            border-color: ${FOCUS_COLOR};
            background: #fff;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.07);
          }
        `}
`

const GenderBtnGroup = styled.div`
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`border: 1px solid rgba(255,255,255,0.1);`
      : css`border: 1px solid ${BORDER_COLOR};`}
`

const GenderBtn = styled.button<{ $active?: boolean; $gender?: 'all' | 'male' | 'female' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
  white-space: nowrap;
  border: none;
  border-right: 1px solid transparent;
  &:last-child { border-right: none; }

  ${({ theme, $active, $gender }) => {
    if (theme.mode === 'dark') {
      const activeBg =
        $gender === 'male'   ? 'rgba(96,165,250,0.18)' :
        $gender === 'female' ? 'rgba(244,114,182,0.18)' :
                               'rgba(255,255,255,0.1)'
      const activeColor =
        $gender === 'male'   ? '#93c5fd' :
        $gender === 'female' ? '#f9a8d4' :
                               theme.colors.text.primary
      return css`
        background: ${$active ? activeBg : 'rgba(255,255,255,0.04)'};
        color: ${$active ? activeColor : theme.colors.text.tertiary};
        border-right-color: rgba(255,255,255,0.08);
        &:hover { background: ${$active ? activeBg : 'rgba(255,255,255,0.08)'}; }
      `
    }
    const activeBg =
      $gender === 'male'   ? '#eff6ff' :
      $gender === 'female' ? '#fdf2f8' :
                             '#f1f5f9'
    const activeColor =
      $gender === 'male'   ? '#2563eb' :
      $gender === 'female' ? '#db2777' :
                             '#374151'
    return css`
      background: ${$active ? activeBg : '#f8fafc'};
      color: ${$active ? activeColor : '#9ca3af'};
      border-right-color: ${BORDER_COLOR};
      &:hover { background: ${$active ? activeBg : '#f1f5f9'}; }
    `
  }}
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

const ModernCountryChip = styled.button<{ $active?: boolean; $hasFilter?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: ${(p) => (p.$active || p.$hasFilter ? '600' : '400')};
  border-radius: 100px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.14s;
  position: relative;
  ${(p) =>
    p.theme.mode === 'dark'
      ? css`
          color: ${p.$active || p.$hasFilter ? '#a5b4fc' : p.theme.colors.text.secondary};
          background: ${p.$active ? 'rgba(99,102,241,0.2)' : p.$hasFilter ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.06)'};
          border: 1px solid ${p.$active ? 'rgba(99,102,241,0.5)' : p.$hasFilter ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'};
          &:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
        `
      : css`
          color: ${p.$active ? '#4f46e5' : p.$hasFilter ? '#4338ca' : '#374151'};
          background: ${p.$active ? '#eef2ff' : p.$hasFilter ? '#e0e7ff' : '#f1f5f9'};
          border: 1px solid ${p.$active ? '#c7d2fe' : p.$hasFilter ? '#a5b4fc' : '#e2e8f0'};
          &:hover { background: ${p.$active ? '#e0e7ff' : '#e9ecef'}; }
        `}
`

const ActiveFilterDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
`

const ClearFilterBtn = styled.button`
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.14s;
  ${(p) =>
    p.theme.mode === 'dark'
      ? css`
          color: #fca5a5;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          &:hover { background: rgba(239,68,68,0.18); }
        `
      : css`
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          &:hover { background: #fee2e2; }
        `}
`

const HistoricalCountryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 12px;
  ${(p) =>
    p.theme.mode === 'dark'
      ? css`
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.15);
        `
      : css`
          background: #f5f3ff;
          border: 1px solid #e0e7ff;
        `}
`

const HistoricalCountryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.14s;
  ${(p) =>
    p.theme.mode === 'dark'
      ? css`
          color: ${p.$active ? '#c4b5fd' : p.theme.colors.text.secondary};
          background: ${p.$active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)'};
          border: 1px solid ${p.$active ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'};
          &:hover { background: rgba(255,255,255,0.1); }
        `
      : css`
          color: ${p.$active ? '#5b21b6' : '#374151'};
          background: ${p.$active ? '#ede9fe' : '#ffffff'};
          border: 1px solid ${p.$active ? '#a78bfa' : '#e2e8f0'};
          &:hover { background: ${p.$active ? '#ddd6fe' : '#f1f5f9'}; }
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
  background: #6366f1;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  &:hover:not(:disabled) {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

/** 세기 시대 → 강조 색 */
type EraKey = 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'unknown'

function getCenturyEra(century: number): EraKey {
  if (century === CENTURY_UNKNOWN) return 'unknown'
  if (century < 0) return 'ancient'
  if (century <= 10) return 'medieval'
  if (century <= 19) return 'early-modern'
  return 'modern'
}

/** era별 dot 컬러만 유지 (배경·테두리 제거) */
const ERA_DOT: Record<EraKey, { light: string; dark: string }> = {
  ancient:       { light: '#7c3aed', dark: '#a78bfa' },
  medieval:      { light: '#059669', dark: '#34d399' },
  'early-modern':{ light: '#d97706', dark: '#fbbf24' },
  modern:        { light: '#4f46e5', dark: '#818cf8' },
  unknown:       { light: '#94a3b8', dark: '#64748b' },
}

const CenturySection = styled.section`
  margin-bottom: 44px;
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
  margin-bottom: 18px;
`

const CenturyHeadingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CenturyEraDot = styled.span<{ $era: EraKey }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $era, theme }) =>
    theme.mode === 'dark' ? ERA_DOT[$era].dark : ERA_DOT[$era].light};
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

const Card = styled.div`
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  cursor: pointer;
  min-height: 116px;
  transition: box-shadow 0.22s ease, transform 0.22s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset,
                      0 2px 12px rgba(0,0,0,0.28);
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset,
                        0 10px 32px rgba(0,0,0,0.42);
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
  border-radius: 5px;
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
  transition: transform 0.3s ease;
  ${Card}:hover & {
    transform: scale(1.06);
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
  padding: 14px 16px 14px 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
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
  margin-bottom: 4px;
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
  border-radius: 100px;
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
  margin-bottom: 8px;
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
    theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e9ecef'};
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
  gap: 4px;
  margin-bottom: 6px;
`

const CardHeadsBadge = styled.span<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 100px;
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
  gap: 5px;
  margin-bottom: 4px;
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
  gap: 4px;
  margin-top: 2px;
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
  margin: 5px 0 0 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

/* Not used but keep to avoid refactor scope creep */
const CardDivider = styled.div``

const EmptyState = styled.div`
  padding: 60px 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#fafafa'};
  border-radius: 10px;
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
            <ListHeader $compact={hideMainHeader}>
              <ListHeaderLeft>
                {!hideMainHeader && (
                  <ListHeaderTitle>
                    {title}
                    <ListHeaderCount>
                      {filteredPersons.length}명
                      {(searchQuery.trim() ||
                        filterGender ||
                        filterCountryIds.length > 0) &&
                        ` / ${persons.length}명`}
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
              <EmptyState>{emptyMessage}</EmptyState>
            ) : filteredPersons.length === 0 ? (
              <EmptyState>{emptyFilterMessage}</EmptyState>
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
                        const fullName = getPersonDisplayName(person, true)
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
                            onClick={() =>
                              onPersonClick
                                ? onPersonClick(person.id)
                                : setSelectedPersonId(person.id)
                            }
                          >
                            {/* Image — left column */}
                            <CardImageSide>
                              {showNewBadge && <NewBadge>NEW</NewBadge>}
                              {displayImage ? (
                                <CardImage src={displayImage} alt={fullName} />
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
                                  <LifespanYear style={{ opacity: 0.35 }}>
                                    생몰년 미상
                                  </LifespanYear>
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
