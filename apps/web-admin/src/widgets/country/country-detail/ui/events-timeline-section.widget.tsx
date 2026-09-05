/**
 * 연대표(전체 사건) 섹션 — 가문·민족 메뉴와 동일한 헤더·레이아웃
 * 목록 뷰 + 사건 등록(events/create 전체 기능, 카드만 가문·민족 스타일)
 */
import React, { useEffect, useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { useEvents } from '@/entities/event/model'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import {
  formatCenturyLabel,
  formatSignedYear,
} from '@/shared/lib/lifespan-text'
import { pathKeys } from '@/shared/router'
import { EventCreateFormDashboard } from './event-create-form-dashboard'

const MAIN = '#6366f1'

const Root = styled(motion.div)<{ $isForm?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$isForm ? 0 : 32)}px;
  padding: ${(p) => (p.$isForm ? '24px 28px 0' : '36px 32px 48px')};
  position: relative;
  min-height: ${(p) => (p.$isForm ? 0 : 'calc(100vh - 200px)')};
  height: ${(p) => (p.$isForm ? '100%' : 'auto')};
  overflow: ${(p) => (p.$isForm ? 'hidden' : 'visible')};
  box-sizing: ${(p) => (p.$isForm ? 'border-box' : 'border-box')};
`

const FormSection = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

/* ── 시간축 목록 ─────────────────────────────────────────────────────────────── */

const Chronology = styled.div`
  display: flex;
  flex-direction: column;
`

const CenturySection = styled.section`
  display: flex;
  flex-direction: column;
  scroll-margin-top: 12px;

  /* 연표 막대에서 넘어왔을 때 잠깐 켜지는 강조 — 어디에 내려섰는지 알려 준다 */
  &[data-century-focus='true'] {
    animation: centuryArrive 1.6s ease-out;
  }

  @keyframes centuryArrive {
    0%,
    60% {
      background: rgba(245, 158, 11, 0.14);
      box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.7);
    }
    100% {
      background: transparent;
      box-shadow: inset 3px 0 0 transparent;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-century-focus='true'] {
      animation: none;
      box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.7);
    }
  }
`

/** 세기 머리 — 스크롤 중에도 지금 보는 세기가 남도록 sticky */
const CenturyHead = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 14px 0 8px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const CenturyLabel = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenturyCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/**
 * 한 사건 = 한 행. 연도 열을 고정폭·tabular로 세워 세로로 스캔되게 한다
 * (카드 격자에서는 연도가 카드마다 다른 x에 있어 훑을 수가 없었다).
 */
const EventRow = styled.button`
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 56px minmax(0, 1fr);
  }
`

const RowYear = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const RowBody = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const RowTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RowRange = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

/** 정렬 방향 토글 — 역사는 오래된순이 기본, 최근 동향을 볼 땐 최신순 */
/**
 * 지면 머리 한 줄 — 제목·건수·설명은 왼쪽, 조작(정렬·등록)은 오른쪽.
 * 건수를 따로 큰 박스에 담지 않는다. 숫자 하나에 카드 한 장은 과잉이고, 제목 옆이
 * "무엇이 몇 건인지"를 한 번에 읽히게 한다.
 */
const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
`

const HeaderText = styled.div`
  min-width: 0;
`

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderCount = styled.span`
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeaderDesc = styled.p`
  margin: 6px 0 0;
  max-width: 540px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const OrderToggle = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const OrderButton = styled.button<{ $active: boolean }>`
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.background.primary : 'transparent'};
`

/** 사건 카드 하단 관련 국가 칩 줄 */
const CountryChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  max-width: 320px;

  @media (max-width: 720px) {
    display: none;
  }
`

/** 과거 국가는 앰버 톤으로 — 현대 국가 칩과 한눈에 갈리게 */
const CountryChip = styled.span<{ $past?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  color: ${({ theme, $past }) =>
    $past
      ? theme.mode === 'dark'
        ? '#fbbf24'
        : '#92400e'
      : theme.colors.text.secondary};
  background: ${({ theme, $past }) =>
    $past
      ? theme.mode === 'dark'
        ? 'rgba(245,158,11,0.16)'
        : '#fef3c7'
      : theme.colors.background.secondary};
`

export interface EventsTimelineSectionProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 */
  countryId?: string | null
  /**
   * 이 국가로 인정할 id 전부 — 현대 국가 id + 브리지된 과거 국가 id들.
   *
   * 서버 필터(countryId)는 **최상위 사건**에만 걸리는데, 응답에 실려온 하위 사건이
   * 변환 단계에서 평탄화돼 목록에 함께 들어온다. 그래서 이 국가와 무관한 자식 사건이
   * 섞인다(독일: 최상위 36건 → 목록 97건, 그중 40여 건이 무관).
   * 이 집합이 있으면 목록을 같은 기준으로 한 번 더 거른다. 없으면 거르지 않는다.
   */
  scopeCountryIds?: string[]
  /** URL searchParams form=create 시 true. 사건 등록 폼을 바로 표시 */
  initialFormFromSearchParams?: boolean
  /**
   * URL의 `century` — 부호 세기 문자열(20 = 20세기, -1 = 기원전 1세기).
   * 대시보드 연표 막대에서 넘어오면 그 세기 묶음으로 스크롤하고 잠깐 강조한다.
   * 걸러내지 않고 **데려다 놓기만** 한다 — 필터로 만들면 그 세기 밖 사건이 사라져,
   * 전체를 보러 온 사람이 잃는 것이 생긴다.
   */
  focusCentury?: string | null
  /** 목록↔폼 전환 시 URL 동기화 (form 열기: true, 목록: false) */
  onNavigateToForm?: (toForm: boolean) => void
  /** 수정 모드: 전달 시 목록/헤더 없이 수정 폼만 표시 (dashboard/events/:id/edit) */
  editEventId?: string | null
  /** 수정 폼에서 뒤로가기 시 (상세로 이동) */
  onEditBack?: () => void
  /** 수정 완료 시 (상세로 이동) */
  onEditSuccess?: () => void
}

export function EventsTimelineSection({
  countryId,
  scopeCountryIds,
  initialFormFromSearchParams,
  focusCentury,
  onNavigateToForm,
  editEventId,
  onEditBack,
  onEditSuccess,
}: EventsTimelineSectionProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const [pageSize] = useState(50)
  const [view, setView] = useState<'list' | 'form'>(() =>
    initialFormFromSearchParams ? 'form' : 'list',
  )
  // autoLoadAll: 타임라인은 사건을 서버 순서(start_date DESC)로 카드 나열하는데, 1000년 이전
  // 사건은 start_date NULL이라 서버 정렬상 맨 뒤(마지막 페이지)로 밀린다. 전체 페이지를 자동
  // 소진해 옛 세기 사건도 '더 보기' 클릭 없이 바로 나오게 한다(수동 페이지네이션 대체).
  // [[event-catalog-clientside-sort-over-paginated]]
  // loadMoreFailed: 자동 소진 중 한 페이지가 실패하면 무한 재시도 방지를 위해 자동 재개가
  // 멈춘다(useEvents 가드). 이 경우 일부 사건(특히 뒤 페이지의 옛 세기)이 누락된 채로 남으므로
  // 재시도 버튼으로 사용자가 이어받게 한다 — 없으면 부분 데이터가 조용히 묻힌다.
  const { events, isLoading, loadMoreFailed, fetchMoreEvents, refetch } =
    useEvents({
      pageSize,
      countryId: countryId ?? undefined,
      autoLoadAll: true,
    })

  /**
   * 서버가 거른 것과 같은 기준으로 목록을 한 번 더 좁힌다 —
   * 관련 현대 국가 또는 관련 과거 국가가 이 국가 스코프에 걸리는 사건만.
   */
  const scopeSet = useMemo(
    () => (scopeCountryIds?.length ? new Set(scopeCountryIds) : null),
    [scopeCountryIds],
  )
  const list = useMemo(() => {
    const all = events ?? []
    if (!scopeSet) return all
    return all.filter((evt) => {
      const modern = (evt as { relatedCountries?: Array<{ id: string }> })
        .relatedCountries
      const historical = (
        evt as { relatedHistoricalCountries?: Array<{ id: string }> }
      ).relatedHistoricalCountries
      return (
        (modern ?? []).some((item) => scopeSet.has(item.id)) ||
        (historical ?? []).some((item) => scopeSet.has(item.id))
      )
    })
  }, [events, scopeSet])

  /**
   * 시간축 그룹 — 세기 → 사건. 카드 격자는 읽는 순서가 지그재그이고 연도 축이 없어서
   * "언제 무슨 일이 있었나"를 못 읽는다. 세기로 묶고 행마다 연도를 고정폭으로 세운다.
   *
   * 연도는 부호 연도(BC 음수)로 정렬한다 — 원시 문자열 비교는 BC를 뒤집는다.
   * 연도 미상은 방향과 무관하게 항상 맨 끝의 '연도 미상' 묶음으로 보낸다.
   */
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const centuryGroups = useMemo(() => {
    type Entry = {
      event: (typeof list)[number]
      signedYear: number | null
      yearLabel: string
      rangeLabel: string | null
      modern: Array<{ id: string; name: string; flagEmoji?: string }>
      historical: Array<{ id: string; name: string }>
    }

    const entries: Entry[] = list.map((event) => {
      const withRelations = event as typeof event & {
        relatedCountries?: Array<{
          id: string
          name: string
          flagEmoji?: string
        }>
        relatedHistoricalCountries?: Array<{ id: string; name: string }>
      }
      const signedYear = signedYearFromIsoLike(event.startDate)
      const range = formatDateRange(event.startDate, event.endDate)
      return {
        event,
        signedYear,
        yearLabel:
          signedYear == null ? '미상' : formatSignedYear(signedYear),
        // 연도는 왼쪽 열에 이미 있으므로, 기간이 한 해로 끝나면 중복이라 감춘다
        rangeLabel: event.endDate ? range : null,
        modern: withRelations.relatedCountries ?? [],
        historical: withRelations.relatedHistoricalCountries ?? [],
      }
    })

    const direction = order === 'asc' ? 1 : -1
    const buckets = new Map<
      string,
      { key: string; label: string; sortKey: number; events: Entry[] }
    >()
    for (const entry of entries) {
      const key =
        entry.signedYear == null
          ? '__unknown__'
          : `c${Math.sign(entry.signedYear)}-${Math.floor((Math.abs(entry.signedYear) - 1) / 100) + 1}`
      const existing = buckets.get(key)
      if (existing) {
        existing.events.push(entry)
      } else {
        buckets.set(key, {
          key,
          label:
            entry.signedYear == null
              ? '연도 미상'
              : formatCenturyLabel(entry.signedYear),
          sortKey:
            entry.signedYear == null
              ? Number.POSITIVE_INFINITY
              : entry.signedYear,
          events: [entry],
        })
      }
    }

    return Array.from(buckets.values())
      .sort((left, right) => {
        // 미상은 방향과 무관하게 끝
        if (!Number.isFinite(left.sortKey)) return 1
        if (!Number.isFinite(right.sortKey)) return -1
        return (left.sortKey - right.sortKey) * direction
      })
      .map((group) => ({
        ...group,
        events: [...group.events].sort((left, right) => {
          if (left.signedYear == null && right.signedYear == null) return 0
          if (left.signedYear == null) return 1
          if (right.signedYear == null) return -1
          return (left.signedYear - right.signedYear) * direction
        }),
      }))
  }, [list, order])

  /*
   * 연표 막대에서 넘어온 세기로 데려다 놓는다.
   *
   * 목록을 자르지 않는 이유: 자르면 그 세기 밖 사건이 사라져 '전체를 보러 온' 사람이
   * 잃는 게 생긴다. 스크롤 + 잠깐의 강조면 "여기다"를 말하기에 충분하다.
   * 사건이 페이지 단위로 들어오므로 list가 늘어날 때마다 다시 시도한다(한 번 성공하면 끝).
   */
  const [centuryFocused, setCenturyFocused] = useState(false)
  const focusKey = useMemo(() => {
    if (!focusCentury) return null
    const century = Number(focusCentury)
    if (!Number.isFinite(century) || century === 0) return null
    return `c${century > 0 ? 1 : -1}-${Math.abs(century)}`
  }, [focusCentury])

  useEffect(() => {
    setCenturyFocused(false)
  }, [focusKey])

  useEffect(() => {
    if (!focusKey || view !== 'list') return
    const target = document.querySelector<HTMLElement>(
      `[data-century-key="${focusKey}"]`,
    )
    if (!target) return

    /*
     * 사건은 페이지 단위로 들어온다. 첫 페이지에서 한 번 스크롤하고 끝내면 뒤 페이지가
     * 붙으면서 목표가 아래로 밀려 **엉뚱한 세기 앞에 서 있게 된다**(실측: 19세기로
     * 갔는데 18세기가 화면 위였다). 목록이 자랄 때마다 다시 맞춘다 —
     * 강조는 처음 한 번만 켠다.
     */
    target.scrollIntoView({
      block: 'start',
      behavior: centuryFocused ? 'auto' : 'smooth',
    })
    if (centuryFocused) return

    setCenturyFocused(true)
    target.setAttribute('data-century-focus', 'true')
    const timer = window.setTimeout(
      () => target.removeAttribute('data-century-focus'),
      1600,
    )
    return () => window.clearTimeout(timer)
  }, [focusKey, centuryFocused, view, list.length])

  useEffect(() => {
    setView(initialFormFromSearchParams ? 'form' : 'list')
  }, [initialFormFromSearchParams])

  const goToList = () => {
    setView('list')
    onNavigateToForm?.(false)
  }

  const openCreate = () => {
    setView('form')
    onNavigateToForm?.(true)
  }

  const handleCreateSuccess = () => {
    refetch()
    goToList()
  }

  if (editEventId && onEditBack && onEditSuccess) {
    return (
      <Root
        $isForm
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <FormSection aria-label="사건 수정">
          <EventCreateFormDashboard
            eventId={editEventId}
            onBack={onEditBack}
            onSuccess={onEditSuccess}
          />
        </FormSection>
      </Root>
    )
  }

  return (
    <Root
      $isForm={view === 'form'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/*
       * 지면 머리 — 이 위젯이 독립 페이지였던 시절엔 h2 '연대표' + 칸이 하나뿐인 탭바
       * ('전체 사건') + 숫자 하나만 든 KPI 박스 + h3 '연대표'가 겹겹이 쌓여 있었다.
       * 국가 상세의 탭으로 들어온 지금은 바깥 탭바가 이미 '사건'을 말하므로 전부 중복 —
       * 본문에 닿기까지 네 겹의 크롬을 지나야 했다. 한 줄로 접는다.
       */}
      <Header>
        <HeaderText>
          <HeaderTitleRow>
            <HeaderTitle>연대표</HeaderTitle>
            {view === 'list' && list.length > 0 && (
              <HeaderCount>{list.length}건</HeaderCount>
            )}
          </HeaderTitleRow>
          <HeaderDesc>
            {countryId
              ? '이 국가와 과거 국가에 연관된 사건입니다. 행을 클릭하면 상세로 이동합니다.'
              : '등록된 사건입니다. 행을 클릭하면 상세로 이동합니다.'}
          </HeaderDesc>
        </HeaderText>
        {view === 'list' && (
          <HeaderActions>
            {list.length > 0 && (
              <OrderToggle role="group" aria-label="정렬 방향">
                <OrderButton
                  type="button"
                  $active={order === 'asc'}
                  aria-pressed={order === 'asc'}
                  onClick={() => setOrder('asc')}
                >
                  오래된순
                </OrderButton>
                <OrderButton
                  type="button"
                  $active={order === 'desc'}
                  aria-pressed={order === 'desc'}
                  onClick={() => setOrder('desc')}
                >
                  최신순
                </OrderButton>
              </OrderToggle>
            )}
            <CreateButton
              type="button"
              onClick={openCreate}
              aria-label="새 사건 등록"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              새 사건 등록
            </CreateButton>
          </HeaderActions>
        )}
      </Header>

      {view === 'form' ? (
        <FormSection aria-label="사건 등록">
          <EventCreateFormDashboard
            onBack={goToList}
            onSuccess={handleCreateSuccess}
          />
        </FormSection>
      ) : (
        <section aria-label="연대표">

          {isLoading && list.length === 0 ? (
            <div
              style={{
                padding: 56,
                textAlign: 'center',
                color: theme.colors.text.secondary,
                fontSize: 14,
                background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
                borderRadius: 16,
                border: `1px solid ${theme.colors.border.default}`,
              }}
            >
              불러오는 중…
            </div>
          ) : list.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '64px 40px 72px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                backdropFilter: isDark ? 'blur(12px)' : 'none',
                borderRadius: 20,
                border: `1px solid ${theme.colors.border.light}`,
                boxShadow: isDark
                  ? '0 1px 3px rgba(0,0,0,0.4)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '20%',
                  width: 280,
                  height: 280,
                  marginLeft: -140,
                  marginTop: -140,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                  filter: 'blur(32px)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: theme.colors.text.primary,
                    letterSpacing: '-0.02em',
                  }}
                >
                  등록된 사건이 없습니다
                </h3>
                <p
                  style={{
                    margin: '10px 0 0',
                    fontSize: 14,
                    color: theme.colors.text.secondary,
                    maxWidth: 320,
                    lineHeight: 1.55,
                    fontWeight: 500,
                  }}
                >
                  위{' '}
                  <strong
                    style={{
                      color: theme.colors.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    새 사건 등록
                  </strong>{' '}
                  버튼을 눌러 첫 사건을 등록하거나,{' '}
                  <strong
                    style={{
                      color: theme.colors.text.primary,
                      fontWeight: 600,
                    }}
                  >
                    사건
                  </strong>{' '}
                  메뉴에서 연대표를 이용해 보세요.
                </p>
              </div>
            </motion.div>
          ) : (
            <Chronology>
              {centuryGroups.map((group) => (
                <CenturySection key={group.key} data-century-key={group.key}>
                  <CenturyHead>
                    <CenturyLabel>{group.label}</CenturyLabel>
                    <CenturyCount>{group.events.length}건</CenturyCount>
                  </CenturyHead>
                  {group.events.map((entry) => (
                    <EventRow
                      key={entry.event.id}
                      type="button"
                      onClick={() =>
                        navigate(pathKeys.events.detail(entry.event.id))
                      }
                    >
                      <RowYear>{entry.yearLabel}</RowYear>
                      <RowBody>
                        <RowTitle>{entry.event.title || '제목 없음'}</RowTitle>
                        {entry.rangeLabel && (
                          <RowRange>{entry.rangeLabel}</RowRange>
                        )}
                      </RowBody>
                      {(entry.historical.length > 0 ||
                        entry.modern.length > 0) && (
                        <CountryChipRow>
                          {entry.historical.map((item) => (
                            <CountryChip key={`h-${item.id}`} $past>
                              {item.name}
                            </CountryChip>
                          ))}
                          {entry.modern.map((item) => (
                            <CountryChip key={`m-${item.id}`}>
                              {item.flagEmoji ? `${item.flagEmoji} ` : ''}
                              {item.name}
                            </CountryChip>
                          ))}
                        </CountryChipRow>
                      )}
                    </EventRow>
                  ))}
                </CenturySection>
              ))}
            </Chronology>
          )}

          {/* 자동 소진 중 일부 페이지 로드 실패 — 재시도로 이어받기(옛 세기 누락 방지) */}
          {loadMoreFailed && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 13,
                  color: theme.colors.text.secondary,
                  marginBottom: 10,
                }}
              >
                일부 사건을 불러오지 못했습니다.
              </div>
              <button
                type="button"
                onClick={() => fetchMoreEvents()}
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: `1px solid ${theme.colors.border.default}`,
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  color: theme.colors.text.secondary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                다시 시도
              </button>
            </div>
          )}
        </section>
      )}
    </Root>
  )
}
