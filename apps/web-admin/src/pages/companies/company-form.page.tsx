import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import {
  FiArrowLeft,
  FiCalendar,
  FiGlobe,
  FiImage,
  FiMapPin,
  FiSave,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyStatus, CreateCompanyInput } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'
import { cityApi } from '@/shared/api/city'
import { getAllCountries, type CountryResponseDto } from '@/shared/api/countries'
import {
  getAllHistoricalCountries,
  type HistoricalCountryResponseDto,
} from '@/shared/api/historical-countries'
import { getAllPersons, type PersonResponseDto } from '@/shared/api/persons'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { DateRangeField } from '@/shared/ui/form-fields/date-range-field'
import { notify } from '@/shared/ui/toast'

/** 상태별 라벨 + 칩 색조. */
const STATUS_META: Record<CompanyStatus, { label: string; tone: string }> = {
  // 리스트(companies-list STATUS_META)와 색 통일 — DISSOLVED 빨강·MERGED 파랑.
  ACTIVE: { label: '활동 중', tone: '#16a34a' },
  DISSOLVED: { label: '해산', tone: '#dc2626' },
  MERGED: { label: '합병', tone: '#2563eb' },
  SUSPENDED: { label: '중단', tone: '#d97706' },
  OTHER: { label: '기타', tone: '#64748b' },
}
const STATUS_ORDER: CompanyStatus[] = [
  'ACTIVE',
  'DISSOLVED',
  'MERGED',
  'SUSPENDED',
  'OTHER',
]

const SECTIONS = [
  { id: 'identity', label: '정체성' },
  { id: 'affiliation', label: '소속 · 인물' },
  { id: 'period', label: '기간 · 링크' },
] as const

/* ───────────────────────── Page (자체 스크롤 컨테이너) ─────────────────────────
   전역 body·#root가 overflow:hidden + 100vh라 윈도우 스크롤이 잠겨 있다.
   → 페이지를 헤더 아래 *내부 스크롤 컨테이너*로 만들어야 긴 폼·sticky가 동작한다
   (사건 상세 동일 패턴). 풀-블리드는 width:100%만으로 충분. */
const Page = styled.div`
  height: calc(100vh - var(--header-height, 64px));
  margin-top: var(--header-height, 64px);
  overflow-y: auto;
  overflow-x: hidden;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  scrollbar-width: thin;
`

const PAD = 'clamp(1.5rem, 4vw, 3rem)'

/* ───────────────────────── Hero band (풀폭) ───────────────────────── */

const HeroBand = styled.section`
  width: 100%;
  box-sizing: border-box;
  padding: 2rem ${PAD} 2.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
`

const HeroTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`

const TitleWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:active {
    transform: scale(0.96);
  }
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StepNav = styled.nav`
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};

  @media (max-width: 560px) {
    flex-wrap: wrap;
  }
`

const StepPill = styled.button<{ $active: boolean }>`
  padding: 6px 15px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  transition: background 0.16s, color 0.16s, box-shadow 0.16s;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 2px rgba(15,23,42,0.08)' : 'none'};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const HeroMain = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 1rem;
  }
`

const LogoBox = styled.div<{ $empty: boolean }>`
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 640px) {
    width: 88px;
    height: 88px;
    font-size: 2.2rem;
  }
`

const HeroFields = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 720px;
`

const NameInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  font-size: 1.875rem;
  font-weight: 750;
  letter-spacing: -0.025em;
  padding: 0.1rem 0 0.5rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $error }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.18s;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 650;
  }
  &:focus {
    outline: none;
    border-bottom-color: ${({ theme, $error }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.primary};
  }

  @media (max-width: 640px) {
    font-size: 1.4rem;
  }
`

const SubGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const ChipRow = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
`

const StatusChipBtn = styled.button<{ $active: boolean; $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s, color 0.16s, border-color 0.16s;
  border: 1px solid
    ${({ theme, $active, $tone }) =>
      $active ? `${$tone}66` : theme.colors.border.default};
  background: ${({ $active, $tone }) =>
    $active ? `${$tone}1a` : 'transparent'};
  color: ${({ theme, $active, $tone }) =>
    $active ? $tone : theme.colors.text.tertiary};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $tone }) => $tone};
    opacity: ${({ $active }) => ($active ? 1 : 0.4)};
  }

  &:hover {
    border-color: ${({ theme, $active, $tone }) =>
      $active ? `${$tone}66` : theme.colors.border.medium};
    color: ${({ theme, $active, $tone }) =>
      $active ? $tone : theme.colors.text.secondary};
  }
`

const FieldLabel = styled.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 인라인 검증 에러 메시지 — country-form ErrorMessage 미러. */
const ErrorMessage = styled.span`
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  margin-top: 0.35rem;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
`

/** 입력에 에러 테두리를 입히는 modifier — Field/IconField 내부 input·textarea에 적용. */
const errorInputBorder = css`
  input,
  textarea {
    border-color: ${({ theme }) => theme.colors.alert.danger.fg};
    &:focus {
      border-color: ${({ theme }) => theme.colors.alert.danger.fg};
      box-shadow: 0 0 0 3px
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(220, 38, 38, 0.2)'
            : 'rgba(220, 38, 38, 0.12)'};
    }
  }
`

/* ───────────────────────── Shell (2단: 입력 / 미리보기) ───────────────────────── */

const Shell = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: 1.75rem ${PAD} 4rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(340px, 28vw, 400px);
  gap: clamp(1.25rem, 2vw, 2rem);
  align-items: start;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
    padding-bottom: 6rem;
  }
`

const LeftCanvas = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`

const Card = styled.section`
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  padding: 1.75rem;
  scroll-margin-top: 1rem;
`

const SectionHead = styled.header`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
`

const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div<{ $error?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;

  label {
    font-weight: 600;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input,
  select,
  textarea {
    padding: 0.7rem 0.85rem;
    border-radius: 12px;
    font-size: 0.9rem;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fbfcfe'};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
    transition: border-color 0.16s, box-shadow 0.16s, background 0.16s;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
    &:focus {
      outline: none;
      background: ${({ theme }) => theme.colors.background.primary};
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.18)'
            : 'rgba(99, 102, 241, 0.12)'};
    }
  }

  textarea {
    min-height: 84px;
    resize: vertical;
    font-family: inherit;
  }

  select option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $error }) => $error && errorInputBorder}
`

const IconField = styled(Field)`
  .control {
    position: relative;

    svg.lead {
      position: absolute;
      left: 0.7rem;
      top: 50%;
      transform: translateY(-50%);
      color: ${({ theme }) => theme.colors.text.tertiary};
      pointer-events: none;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding-left: 2.1rem;
    }
  }
`

/* ───────────────────────── Right rail (라이브 미리보기 + CTA) ───────────────────────── */

const RightRail = styled.aside`
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: calc(100vh - var(--header-height, 64px) - 2rem);

  @media (max-width: 1080px) {
    position: static;
    max-height: none;
  }
`

const PreviewScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 1080px) {
    overflow: visible;
  }
`

const Eyebrow = styled.div`
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PreviewCard = styled.div`
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  padding: 1.1rem;
`

const ListMirror = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`

const MirrorThumb = styled.div<{ $hasLogo: boolean }>`
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  background: ${({ theme, $hasLogo }) =>
    $hasLogo
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : '#eef2ff'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const MirrorBody = styled.div`
  min-width: 0;
  flex: 1;
`

const MirrorTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`

const MirrorName = styled.span<{ $placeholder?: boolean }>`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme, $placeholder }) =>
    $placeholder ? theme.colors.text.tertiary : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const MirrorShort = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MirrorStatus = styled.span<{ $tone: string }>`
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ $tone }) => `${$tone}22`};
  color: ${({ $tone }) => $tone};
`

const MirrorMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 5px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.tertiary};

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  svg {
    opacity: 0.7;
  }
`

const DetailMirror = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .name {
    font-size: 1.1rem;
    font-weight: 750;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .meta {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const InfoNote = styled.p`
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};

  strong {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-weight: 600;
  }
`

const CtaBox = styled.div`
  flex-shrink: 0;
  display: flex;
  gap: 0.6rem;

  @media (max-width: 1080px) {
    position: sticky;
    bottom: 0;
    padding: 0.85rem ${PAD};
    margin: 0 -${PAD};
    background: ${({ theme }) => theme.colors.background.secondary};
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
    backdrop-filter: blur(8px);
    z-index: 5;
  }
`

const Btn = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 650;
  transition: background 0.18s, border-color 0.18s, transform 0.12s, box-shadow 0.18s;

  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  ${({ theme, $primary }) =>
    $primary
      ? css`
          flex: 2;
          background: ${theme.colors.gradient.primary};
          color: ${theme.colors.button.text};
          border: none;
          box-shadow: 0 4px 14px ${theme.colors.shadow.md};
          &:hover:not(:disabled) {
            box-shadow: 0 6px 18px ${theme.colors.shadow.lg};
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
            border-color: ${theme.colors.border.medium};
          }
        `}
`

const LoadingText = styled.p`
  padding: calc(var(--header-height, 64px) + 1.5rem) 2rem;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* ───────────────────────── 검색형 선택 picker (창립자·본사 도시) ───────────────────────── */

const PickerControl = styled.div`
  position: relative;
`

const SelectedBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.6rem 0.6rem 0.8rem;
  border-radius: 11px;
  font-size: 0.9rem;
  background: ${({ theme }) => theme.colors.activeLight};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.4)' : '#c7d2fe'};
  color: ${({ theme }) => theme.colors.text.primary};

  .label {
    flex: 1;
    font-weight: 500;
  }
  button {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    display: inline-flex;
    padding: 2px;
    &:hover {
      opacity: 1;
    }
  }
`

const PickerInputWrap = styled.div`
  position: relative;
  svg.lead {
    position: absolute;
    left: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.65rem 0.8rem 0.65rem 2.1rem;
    border-radius: 11px;
    font-size: 0.9rem;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
    transition: border-color 0.18s, box-shadow 0.18s;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.25)'
            : 'rgba(99, 102, 241, 0.15)'};
    }
  }
`

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 12px 32px ${({ theme }) => theme.colors.shadow.lg};
`

const DropItem = styled.li<{ $active?: boolean }>`
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.hover : 'transparent'};
  .main {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const DropEmpty = styled.li`
  padding: 0.5rem 0.6rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

type PickerOption = { id: string; label: string; sub?: string }

const SearchPicker: React.FC<{
  value: string
  selectedLabel: string
  placeholder: string
  /** 접근성 라벨 베이스 — "{label} 검색"·"{label} 해제"에 사용 */
  label: string
  fetchOptions: (query: string) => Promise<PickerOption[]>
  showOnEmpty?: boolean
  onChange: (id: string, label: string) => void
}> = ({
  value,
  selectedLabel,
  placeholder,
  label,
  fetchOptions,
  showOnEmpty = false,
  onChange,
}) => {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<PickerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reactId = useId()
  const listId = `${reactId}-listbox`
  const optionId = (index: number) => `${reactId}-option-${index}`

  useEffect(() => {
    if (!editing) return
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [editing])

  useEffect(() => {
    if (!editing) return
    if (!query.trim() && !showOnEmpty) {
      setOptions([])
      return
    }
    let alive = true
    setLoading(true)
    const timer = setTimeout(() => {
      fetchOptions(query)
        .then((opts) => alive && setOptions(opts))
        .catch(() => alive && setOptions([]))
        .finally(() => alive && setLoading(false))
    }, 200)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query, editing, showOnEmpty, fetchOptions])

  // 옵션 목록이 바뀌면 활성 인덱스 리셋.
  useEffect(() => {
    setActiveIndex(-1)
  }, [options])

  const selectOption = (option: PickerOption) => {
    onChange(option.id, option.label)
    setEditing(false)
    setQuery('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const dropdownOpen = editing && (query.trim().length > 0 || showOnEmpty)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!dropdownOpen) {
        setEditing(true)
        return
      }
      if (options.length === 0) return
      setActiveIndex((index) => (index + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (options.length === 0) return
      // 미선택(-1)에서 위로 = 마지막 항목(둘러가기). (-1-1+len)%len는 끝-1로 새던 버그.
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      // 드롭다운이 열려 있으면 Enter는 *항상* 폼 제출을 막는다 — 활성 항목이 없으면
      // (타이핑 직후, activeIndex=-1) 첫 결과를 고른다. preventDefault를 활성 항목이
      // 있을 때로만 한정하면 일반 흐름에서 native Enter가 폼을 제출하는 버그가 난다.
      if (!dropdownOpen) return
      event.preventDefault()
      const picked = activeIndex >= 0 ? options[activeIndex] : options[0]
      if (picked) selectOption(picked)
    } else if (event.key === 'Escape') {
      setEditing(false)
    }
  }

  if (value && !editing) {
    return (
      <PickerControl>
        <SelectedBox>
          <span className="label">{selectedLabel || '(이름 없음)'}</span>
          <button
            type="button"
            aria-label={`${label} 검색`}
            onClick={() => {
              setQuery('')
              setOptions([])
              setEditing(true)
            }}
          >
            <FiSearch size={15} />
          </button>
          <button
            type="button"
            aria-label={`${label} 해제`}
            onClick={() => onChange('', '')}
          >
            <FiX size={16} />
          </button>
        </SelectedBox>
      </PickerControl>
    )
  }

  const dropdownOpen = editing && (query.trim().length > 0 || showOnEmpty)

  return (
    <PickerControl ref={wrapRef}>
      <PickerInputWrap>
        <FiSearch className="lead" size={15} />
        <input
          autoFocus={editing}
          value={query}
          placeholder={placeholder}
          onFocus={() => setEditing(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-label={label ? `${label} 검색` : placeholder}
          aria-expanded={dropdownOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
        />
      </PickerInputWrap>
      {dropdownOpen && (
        <Dropdown id={listId} role="listbox">
          {loading && <DropEmpty>검색 중...</DropEmpty>}
          {!loading && options.length === 0 && <DropEmpty>결과 없음</DropEmpty>}
          {!loading &&
            options.map((option, index) => (
              <DropItem
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                $active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectOption(option)
                }}
              >
                <span className="main">{option.label}</span>
                {option.sub && <span className="sub">{option.sub}</span>}
              </DropItem>
            ))}
        </Dropdown>
      )}
    </PickerControl>
  )
}

type FormState = {
  name: string
  shortName: string
  localName: string
  status: CompanyStatus
  foundedAt: string
  dissolvedAt: string
  websiteUrl: string
  logoUrl: string
  description: string
  countryId: string
  historicalCountryId: string
  founderId: string
  headquartersCityId: string
}

const EMPTY: FormState = {
  name: '',
  shortName: '',
  localName: '',
  status: 'ACTIVE',
  foundedAt: '',
  dissolvedAt: '',
  websiteUrl: '',
  logoUrl: '',
  description: '',
  countryId: '',
  historicalCountryId: '',
  founderId: '',
  headquartersCityId: '',
}

function personLabel(person: PersonResponseDto): string {
  return getPersonDisplayName({
    name: person.name ?? '',
    surname: (person as { surname?: string }).surname ?? '',
    middleName: (person as { middleName?: string }).middleName ?? '',
    nameDisplayOrder: person.nameDisplayOrder ?? null,
    country:
      (person as { country?: { defaultNameDisplayOrder?: string | null } | null })
        .country ?? null,
  })
}

/** 설립 연도 라벨 — BC 음수연도 표기. */
function foundedYearLabel(iso: string): string | null {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  return parts.year < 0 ? `BC ${Math.abs(parts.year)}` : `${parts.year}`
}

/** 인라인 검증 에러 — 필드별 메시지(없으면 통과). */
type FormErrors = {
  name?: string
  dateRange?: string
  websiteUrl?: string
  logoUrl?: string
}

export const CompanyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [countries, setCountries] = useState<CountryResponseDto[]>([])
  const [historicalCountries, setHistoricalCountries] = useState<
    HistoricalCountryResponseDto[]
  >([])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [founderLabel, setFounderLabel] = useState('')
  const [cityLabel, setCityLabel] = useState('')
  const [logoBroken, setLogoBroken] = useState(false)
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id)
  const [errors, setErrors] = useState<FormErrors>({})
  const personsRef = useRef<PersonResponseDto[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const websiteInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // 미저장 변경 추적 — SPA 라우트 이동(useBlocker)·새로고침/탭 닫기(beforeunload) 경고.
  // person-edit.page와 동일 패턴(ref로 판정해 confirm 직후 같은 틱 navigate가 막히지 않게).
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty
  // 더티 비교 기준 스냅샷 — create는 EMPTY, edit은 서버 hydrate 직후 캡처.
  const baselineRef = useRef<string>(JSON.stringify(EMPTY))

  useEffect(() => setLogoBroken(false), [form.logoUrl])

  const fetchFounderOptions = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      if (!personsRef.current) {
        personsRef.current = await getAllPersons().catch(() => [])
      }
      const list = personsRef.current ?? []
      const norm = query.trim().toLowerCase()
      const filtered = norm
        ? list.filter((person) => {
            const display = personLabel(person).toLowerCase()
            const orig = (
              (person as { originalName?: string }).originalName ?? ''
            ).toLowerCase()
            return display.includes(norm) || orig.includes(norm)
          })
        : list
      return filtered.slice(0, 30).map((person) => ({
        id: person.id,
        label: personLabel(person),
        sub: (person as { originalName?: string }).originalName ?? undefined,
      }))
    },
    [],
  )

  const fetchCityOptions = useCallback(
    async (query: string): Promise<PickerOption[]> => {
      const cities = await cityApi.searchCities(query)
      return cities.map((city) => ({
        id: city.id,
        label: city.name,
        sub: city.countryName ?? undefined,
      }))
    },
    [],
  )

  useEffect(() => {
    getAllCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
    getAllHistoricalCountries()
      .then(setHistoricalCountries)
      .catch(() => setHistoricalCountries([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    companyApi
      .getById(id!)
      .then((company) => {
        if (company) {
          const hydrated: FormState = {
            name: company.name,
            shortName: company.shortName ?? '',
            localName: company.localName ?? '',
            status: company.status ?? 'ACTIVE',
            foundedAt: company.foundedAt ?? '',
            dissolvedAt: company.dissolvedAt ?? '',
            websiteUrl: company.websiteUrl ?? '',
            logoUrl: company.logoUrl ?? '',
            description: company.description ?? '',
            countryId: company.countryId ?? '',
            historicalCountryId: company.historicalCountryId ?? '',
            founderId: company.founderId ?? '',
            headquartersCityId: company.headquartersCityId ?? '',
          }
          setForm(hydrated)
          // 더티 기준 스냅샷 — 비동기 hydrate를 dirty로 오판하지 않게 여기서 캡처.
          baselineRef.current = JSON.stringify(hydrated)
          setIsDirty(false)
          setFounderLabel(company.founder?.name ?? '')
          setCityLabel(company.headquartersCity?.name ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, isEdit])

  /* 스크롤에 따라 현재 섹션 하이라이트 (스텝 내비). */
  useEffect(() => {
    if (loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { root: scrollRef.current, rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    )
    for (const section of SECTIONS) {
      const node = document.getElementById(section.id)
      if (node) observer.observe(node)
    }
    return () => observer.disconnect()
  }, [loading])

  const scrollToSection = (sectionId: string) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // 폼 스냅샷을 기준선과 비교해 더티 판정 (founderLabel/cityLabel은 form의 id에서 파생).
  useEffect(() => {
    setIsDirty(JSON.stringify(form) !== baselineRef.current)
  }, [form])

  // SPA 내 라우트 전환(브라우저 뒤로가기·사이드바 링크 포함) 차단 — data router의 useBlocker.
  const blocker = useBlocker(() => isDirtyRef.current)
  // blocked 진입당 confirm 1회만 — 비동기 confirm 대기 중 리렌더로 다이얼로그 중복 방지.
  const blockerPromptingRef = useRef(false)
  useEffect(() => {
    if (blocker.state !== 'blocked') {
      blockerPromptingRef.current = false
      return
    }
    if (blockerPromptingRef.current) return
    blockerPromptingRef.current = true
    confirm({
      title: '확인',
      message: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?',
      confirmLabel: '나가기',
      danger: true,
    }).then((confirmed) => {
      if (confirmed) blocker.proceed()
      else blocker.reset()
    })
  }, [blocker])

  // 새로고침/탭 닫기 경고 — 앱 공통 패턴(person-edit.page와 동일).
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // 취소·뒤로가기 공용 — 더티일 때만 동일 confirm 후 이동.
  const handleCancel = async () => {
    if (
      isDirtyRef.current &&
      !(await confirm({
        title: '확인',
        message: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?',
        confirmLabel: '나가기',
        danger: true,
      }))
    ) {
      return
    }
    // 이미 확인받았으므로 dirty 해제 — blocker의 중복 confirm 방지.
    isDirtyRef.current = false
    setIsDirty(false)
    navigate('/companies')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = '기업명을 입력해주세요.'
    }
    if (form.foundedAt && form.dissolvedAt) {
      const foundedKey = dateSortKey(form.foundedAt)
      const dissolvedKey = dateSortKey(form.dissolvedAt)
      if (
        foundedKey != null &&
        dissolvedKey != null &&
        dissolvedKey < foundedKey
      ) {
        nextErrors.dateRange = '해산일은 설립일보다 빠를 수 없습니다.'
      }
    }
    if (
      form.websiteUrl.trim() &&
      !/^https?:\/\//i.test(form.websiteUrl.trim())
    ) {
      nextErrors.websiteUrl = '공식 웹사이트는 http(s)://로 시작해야 합니다.'
    }
    if (form.logoUrl.trim() && !/^https?:\/\//i.test(form.logoUrl.trim())) {
      nextErrors.logoUrl = '로고 URL은 http(s)://로 시작해야 합니다.'
    }

    setErrors(nextErrors)
    // 첫 실패 필드로 포커스·스크롤 (헤어로 밴드의 기업명은 깊은 스크롤 시 화면 밖).
    if (nextErrors.name) {
      nameInputRef.current?.focus()
      nameInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      notify.error(nextErrors.name)
      return
    }
    if (nextErrors.dateRange) {
      scrollToSection('period')
      notify.error(nextErrors.dateRange)
      return
    }
    if (nextErrors.websiteUrl) {
      websiteInputRef.current?.focus()
      websiteInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      notify.error(nextErrors.websiteUrl)
      return
    }
    if (nextErrors.logoUrl) {
      logoInputRef.current?.focus()
      logoInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      notify.error(nextErrors.logoUrl)
      return
    }

    setSaving(true)
    const payload: CreateCompanyInput = {
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      localName: form.localName.trim() || null,
      status: form.status,
      foundedAt: form.foundedAt || null,
      dissolvedAt: form.dissolvedAt || null,
      websiteUrl: form.websiteUrl.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      description: form.description.trim() || null,
      countryId: form.countryId || null,
      historicalCountryId: form.historicalCountryId || null,
      founderId: form.founderId || null,
      headquartersCityId: form.headquartersCityId || null,
    }
    try {
      const saved = isEdit
        ? await companyApi.update(id!, payload)
        : await companyApi.create(payload)
      // 저장 성공 — dirty 해제 후 이동(이탈 경고·blocker 오발 방지).
      isDirtyRef.current = false
      setIsDirty(false)
      navigate(pathKeys.companies.detail(saved.id))
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingText>불러오는 중...</LoadingText>

  const showLogo = !!form.logoUrl && !logoBroken
  const statusMeta = STATUS_META[form.status]
  const countryName =
    countries.find((country) => country.id === form.countryId)?.name ??
    historicalCountries.find((hist) => hist.id === form.historicalCountryId)
      ?.name ??
    null
  const foundedLabel = foundedYearLabel(form.foundedAt)
  const initial = (form.shortName || form.name || '?').trim().charAt(0)
  const hasName = !!form.name.trim()
  const detailMetaParts = [statusMeta.label, countryName].filter(Boolean)
  if (foundedLabel) {
    detailMetaParts.push(
      `${foundedLabel}${foundedYearLabel(form.dissolvedAt) ? `~${foundedYearLabel(form.dissolvedAt)}` : '~'}`,
    )
  }

  return (
    <Page ref={scrollRef}>
      <form onSubmit={handleSubmit}>
        <HeroBand>
        <HeroTop>
          <TitleWrap>
            <BackBtn type="button" onClick={handleCancel} aria-label="목록으로">
              <FiArrowLeft size={18} />
            </BackBtn>
            <Title>{isEdit ? '기업 수정' : '기업 추가'}</Title>
          </TitleWrap>
          <StepNav>
            {SECTIONS.map((section) => (
              <StepPill
                key={section.id}
                type="button"
                $active={activeSection === section.id}
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </StepPill>
            ))}
          </StepNav>
        </HeroTop>

        <HeroMain id="identity">
          <LogoBox $empty={!showLogo}>
            {showLogo ? (
              <img
                src={form.logoUrl}
                alt=""
                onError={() => setLogoBroken(true)}
              />
            ) : (
              '🏢'
            )}
          </LogoBox>
          <HeroFields>
            <div>
              <NameInput
                ref={nameInputRef}
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }))
                  }
                }}
                placeholder="회사명 (예: 영국 동인도회사)"
                maxLength={100}
                aria-label="기업명"
                aria-required
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? 'company-name-error' : undefined
                }
                $error={!!errors.name}
              />
              {errors.name && (
                <ErrorMessage id="company-name-error" role="alert">
                  {errors.name}
                </ErrorMessage>
              )}
            </div>
            <SubGrid>
              <Field>
                <label htmlFor="company-short-name">약칭 / 티커</label>
                <input
                  id="company-short-name"
                  type="text"
                  value={form.shortName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, shortName: event.target.value }))
                  }
                  placeholder="예: EIC"
                  maxLength={50}
                />
              </Field>
              <Field>
                <label htmlFor="company-local-name">현지어 / 원어명</label>
                <input
                  id="company-local-name"
                  type="text"
                  value={form.localName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, localName: event.target.value }))
                  }
                  placeholder="East India Company"
                  maxLength={200}
                />
              </Field>
            </SubGrid>
            <div>
              <FieldLabel>상태</FieldLabel>
              <ChipRow role="radiogroup" aria-label="상태" style={{ marginTop: 6 }}>
                {STATUS_ORDER.map((value) => {
                  const meta = STATUS_META[value]
                  const active = form.status === value
                  return (
                    <StatusChipBtn
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      $active={active}
                      $tone={meta.tone}
                      onClick={() => setForm((prev) => ({ ...prev, status: value }))}
                    >
                      {meta.label}
                    </StatusChipBtn>
                  )
                })}
              </ChipRow>
            </div>
          </HeroFields>
        </HeroMain>
      </HeroBand>

        <Shell>
          <LeftCanvas>
            {/* ② 소속 · 인물 */}
            <Card id="affiliation">
              <SectionHead>
                <SectionTitle>
                  <FiUsers size={16} /> 소속 · 인물
                </SectionTitle>
              </SectionHead>
              <Grid2>
                <Field>
                  <label htmlFor="company-country">소속 국가 (현대)</label>
                  <select
                    id="company-country"
                    value={form.countryId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, countryId: event.target.value }))
                    }
                  >
                    <option value="">— 없음 —</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <label htmlFor="company-historical-country">
                    소속 국가 (역사)
                  </label>
                  <select
                    id="company-historical-country"
                    value={form.historicalCountryId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        historicalCountryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">— 없음 —</option>
                    {historicalCountries.map((hist) => (
                      <option key={hist.id} value={hist.id}>
                        {hist.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </Grid2>
              <Grid2 style={{ marginTop: '1rem' }}>
                <Field>
                  <label>
                    <FiUser
                      size={12}
                      style={{ verticalAlign: '-1px', marginRight: 4 }}
                    />
                    창립자
                  </label>
                  <SearchPicker
                    value={form.founderId}
                    selectedLabel={founderLabel}
                    placeholder="인물 이름으로 검색..."
                    label="창립자"
                    showOnEmpty
                    fetchOptions={fetchFounderOptions}
                    onChange={(founderId, label) => {
                      setForm((prev) => ({ ...prev, founderId }))
                      setFounderLabel(label)
                    }}
                  />
                </Field>
                <Field>
                  <label>
                    <FiMapPin
                      size={12}
                      style={{ verticalAlign: '-1px', marginRight: 4 }}
                    />
                    본사 도시
                  </label>
                  <SearchPicker
                    value={form.headquartersCityId}
                    selectedLabel={cityLabel}
                    placeholder="도시 이름으로 검색..."
                    label="본사 도시"
                    fetchOptions={fetchCityOptions}
                    onChange={(cityId, label) => {
                      setForm((prev) => ({ ...prev, headquartersCityId: cityId }))
                      setCityLabel(label)
                    }}
                  />
                </Field>
              </Grid2>
            </Card>

            {/* ③ 기간 · 링크 */}
            <Card id="period">
              <SectionHead>
                <SectionTitle>
                  <FiCalendar size={16} /> 기간 · 링크
                </SectionTitle>
              </SectionHead>
              <Field as="div" $error={!!errors.dateRange}>
                <label>설립일 · 해산일</label>
                <DateRangeField
                  renderControlOnly
                  startValue={form.foundedAt}
                  endValue={form.dissolvedAt}
                  onStartChange={(date) => {
                    setForm((prev) => ({ ...prev, foundedAt: date }))
                    if (errors.dateRange)
                      setErrors((prev) => ({ ...prev, dateRange: undefined }))
                  }}
                  onEndChange={(date) => {
                    setForm((prev) => ({ ...prev, dissolvedAt: date }))
                    if (errors.dateRange)
                      setErrors((prev) => ({ ...prev, dateRange: undefined }))
                  }}
                  startPlaceholder="설립일"
                  endPlaceholder="해산일 (선택)"
                  startPickerTitle="설립일 선택"
                  endPickerTitle="해산일 선택"
                  openEndAfterStart={false}
                  clearableEnd
                  blockBc
                />
                {errors.dateRange && (
                  <ErrorMessage id="company-date-error" role="alert">
                    {errors.dateRange}
                  </ErrorMessage>
                )}
              </Field>
              <Grid2 style={{ marginTop: '1rem' }}>
                <IconField $error={!!errors.websiteUrl}>
                  <label htmlFor="company-website">공식 웹사이트</label>
                  <div className="control">
                    <FiGlobe className="lead" size={15} />
                    <input
                      id="company-website"
                      ref={websiteInputRef}
                      type="url"
                      value={form.websiteUrl}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          websiteUrl: event.target.value,
                        }))
                        if (errors.websiteUrl) {
                          setErrors((prev) => ({
                            ...prev,
                            websiteUrl: undefined,
                          }))
                        }
                      }}
                      placeholder="https://..."
                      maxLength={255}
                      aria-invalid={!!errors.websiteUrl}
                      aria-describedby={
                        errors.websiteUrl
                          ? 'company-website-error'
                          : undefined
                      }
                    />
                  </div>
                  {errors.websiteUrl && (
                    <ErrorMessage id="company-website-error" role="alert">
                      {errors.websiteUrl}
                    </ErrorMessage>
                  )}
                </IconField>
                <IconField $error={!!errors.logoUrl}>
                  <label htmlFor="company-logo-url">로고 URL</label>
                  <div className="control">
                    <FiImage className="lead" size={15} />
                    <input
                      id="company-logo-url"
                      ref={logoInputRef}
                      type="url"
                      value={form.logoUrl}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          logoUrl: event.target.value,
                        }))
                        if (errors.logoUrl) {
                          setErrors((prev) => ({ ...prev, logoUrl: undefined }))
                        }
                      }}
                      placeholder="https://..."
                      maxLength={255}
                      aria-invalid={!!errors.logoUrl}
                      aria-describedby={
                        errors.logoUrl ? 'company-logo-url-error' : undefined
                      }
                    />
                  </div>
                  {errors.logoUrl && (
                    <ErrorMessage id="company-logo-url-error" role="alert">
                      {errors.logoUrl}
                    </ErrorMessage>
                  )}
                </IconField>
              </Grid2>
              <Field as="div" style={{ marginTop: '1rem' }}>
                <label htmlFor="company-description">한 줄 소개</label>
                <textarea
                  id="company-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="기업을 한눈에 설명하는 짧은 소개 (상세 설명은 저장 후 작성)"
                />
              </Field>
            </Card>
          </LeftCanvas>

          {/* 우측: 라이브 미리보기 + CTA */}
          <RightRail>
            <PreviewScroll>
              <Eyebrow>목록에서 이렇게 보입니다</Eyebrow>
              <PreviewCard>
                <ListMirror>
                  <MirrorThumb $hasLogo={showLogo}>
                    {showLogo ? <img src={form.logoUrl} alt="" /> : initial}
                  </MirrorThumb>
                  <MirrorBody>
                    <MirrorTopRow>
                      <MirrorName $placeholder={!hasName}>
                        {hasName ? form.name : '회사명을 입력하세요'}
                      </MirrorName>
                      {form.shortName && <MirrorShort>{form.shortName}</MirrorShort>}
                      <MirrorStatus $tone={statusMeta.tone}>
                        {statusMeta.label}
                      </MirrorStatus>
                    </MirrorTopRow>
                    <MirrorMeta>
                      {countryName && (
                        <span>
                          <FiMapPin size={11} />
                          {countryName}
                        </span>
                      )}
                      {foundedLabel && (
                        <span>
                          <FiCalendar size={11} />
                          {foundedLabel} 설립
                        </span>
                      )}
                      {founderLabel && (
                        <span>
                          <FiUser size={11} />
                          {founderLabel}
                        </span>
                      )}
                    </MirrorMeta>
                  </MirrorBody>
                </ListMirror>
              </PreviewCard>

              <Eyebrow>상세 헤더</Eyebrow>
              <PreviewCard>
                <DetailMirror>
                  <span className="name">
                    {hasName ? form.name : '회사명을 입력하세요'}
                  </span>
                  {(form.localName || form.shortName) && (
                    <span className="sub">
                      {[form.localName, form.shortName].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className="meta">{detailMetaParts.join(' · ')}</span>
                </DetailMirror>
              </PreviewCard>

              <InfoNote>
                연혁·시설·업종과 본문 상세 설명은{' '}
                <strong>저장 후 상세 페이지</strong>에서 바로 이어서 작성할 수
                있습니다.
              </InfoNote>
            </PreviewScroll>

            <CtaBox>
              <Btn type="button" onClick={handleCancel}>
                취소
              </Btn>
              <Btn $primary type="submit" disabled={saving}>
                <FiSave size={16} />
                {saving ? '저장 중...' : isEdit ? '저장' : '만들고 이어서 작성'}
              </Btn>
            </CtaBox>
          </RightRail>
        </Shell>
      </form>
    </Page>
  )
}
