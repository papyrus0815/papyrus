/**
 * 카탈로그 메인 영역 (활성 뷰 모드).
 *
 * 디자인 원칙
 *  - **뷰 세그먼트 3+1**: 자주 쓰는 타임라인/목록/지도는 세그먼트 노출, 그 외(격자/통계/트리/갤러리)는
 *    "더보기 ▾" 드롭다운으로 묶어 시각 부담 감소.
 *  - **통계 인라인**: 페이지 헤더의 KPI chip을 제거하고 ViewMeta 자리에 한 줄 요약으로 융합.
 *  - 표시 옵션(정렬·방향·페이지 크기)은 필터와 시각 family 분리.
 *
 * 활성 뷰 슬롯은 부모(events.page)가 viewMode에 따라 하나만 빌드해 `activeSlot`으로 넘긴다.
 * 이렇게 하면 7개 view의 React element를 매 렌더마다 모두 평가하던 비용이 사라진다.
 *
 * 상세 패널은 `CatalogDetailDrawer`로 분리.
 */
import React, { useEffect, useRef, useState } from 'react'

import {
  FiArrowDown,
  FiBarChart2,
  FiChevronDown,
  FiClock,
  FiGitBranch,
  FiGrid,
  FiImage,
  FiList,
  FiMapPin,
  FiMoreHorizontal,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { SortOption } from '@/features/event-list/lib'
import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import type { HistoricalEvent } from '../../create/events.types'
import * as Filter from '../../styles/filter.styles'
import * as List from '../../styles/list.styles'
import * as PageStyles from '../../styles/list-page.styles'
import { BRAND, MOTION, SHADOW } from '../../styles/theme'
import * as ToolbarStyles from '../../styles/list-toolbar.styles'

import { CatalogHeaderStats } from './catalog-header-stats'

interface Props {
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void
  /** 현재 필터·북마크가 적용된 *보이는* 항목 수 — 화면 상의 진실 */
  visibleCount: number
  /** 현재까지 로드된 최상위 사건 수 — visibleCount와 다를 때만 보조 표시 */
  totalCount: number
  /** 서버의 권위 총개수(로드 여부 무관). 있으면 "전체 N건"을 이 값으로 — 로드된 수 과소표시 해소 */
  serverTotal?: number

  /** 인라인 통계 strip을 위한 데이터 */
  events: HistoricalEvent[]
  dbCategories: EventCategoryDto[]

  // 표시 옵션
  sortBy: SortOption
  sortDirection: 'asc' | 'desc'
  onSortChange: (sortBy: SortOption) => void
  onSortDirectionToggle: () => void

  pageSize: number
  onPageSizeChange: (size: number) => void

  /** 부모가 viewMode에 따라 빌드해 넘긴 단일 활성 슬롯 */
  activeSlot: React.ReactNode
}

interface ModeDef {
  value: ViewMode
  label: string
  icon: React.ReactNode
}

/**
 * 뷰별 한 줄 역할 안내 — 7개 뷰가 각각 "무엇을 잘 보여주는지" 모호하다는 IA 문제 보완.
 * 활성 뷰 아래에 캡션으로 노출해, 사용자가 목적에 맞는 뷰를 고르도록 돕는다.
 */
const VIEW_HINTS: Record<ViewMode, string> = {
  [VIEW_MODES.TIMELINE]:
    '시대별 분포·동시대성 — 막대 길이=기간, 우측 목록으로 사건명 확인',
  [VIEW_MODES.LIST]: '전체 사건을 시간순으로 훑기 — 세기·연도별 그룹',
  [VIEW_MODES.MAP]: '지리적 위치 — 좌표가 있는 사건만 표시',
  [VIEW_MODES.GRID]: '10년 단위 밀집도 — 어느 시대에 사건이 몰렸는지',
  [VIEW_MODES.DASHBOARD]: '데이터 분포·품질 통계 — 사건 목록이 아닌 집계',
  [VIEW_MODES.TREE]: '상·하위 사건의 계층 관계',
  [VIEW_MODES.GALLERY]: '이미지 중심 카드 — 시각적 탐색',
}

/** 자주 쓰는 3개 — 세그먼트 컨트롤로 노출 */
const PRIMARY_MODES: ModeDef[] = [
  { value: VIEW_MODES.TIMELINE, label: '타임라인', icon: <FiClock size={13} /> },
  { value: VIEW_MODES.LIST, label: '목록', icon: <FiList size={13} /> },
  { value: VIEW_MODES.MAP, label: '지도', icon: <FiMapPin size={13} /> },
]

/** 보조 4개 — "더보기 ▾" 드롭다운에 묶음 */
const SECONDARY_MODES: ModeDef[] = [
  { value: VIEW_MODES.GRID, label: '격자', icon: <FiGrid size={13} /> },
  {
    value: VIEW_MODES.DASHBOARD,
    label: '통계',
    icon: <FiBarChart2 size={13} />,
  },
  { value: VIEW_MODES.TREE, label: '트리', icon: <FiGitBranch size={13} /> },
  { value: VIEW_MODES.GALLERY, label: '갤러리', icon: <FiImage size={13} /> },
]

export const CatalogMainContent: React.FC<Props> = ({
  viewMode,
  setViewMode,
  visibleCount,
  totalCount,
  serverTotal,
  events,
  dbCategories,
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionToggle,
  pageSize,
  onPageSizeChange,
  activeSlot,
}) => {
  const isFiltered = visibleCount !== totalCount
  /** 표시용 권위 총량 — 서버 count가 있으면 그 값, 없으면 로드된 수로 폴백 */
  const authoritativeTotal = serverTotal ?? totalCount

  // ── 더보기 메뉴 ────────────────────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!moreOpen) return
    const onDocDown = (e: MouseEvent) => {
      if (!moreRef.current) return
      if (!moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const activeSecondary = SECONDARY_MODES.find((m) => m.value === viewMode)
  const moreActive = !!activeSecondary

  return (
    <PageStyles.ActiveContent>
      <ToolbarStyles.ViewSwitcherRow>
        <ToolbarStyles.ViewSegmented role="group" aria-label="보기 모드">
          {PRIMARY_MODES.map((mode) => {
            const active = viewMode === mode.value
            return (
              <ToolbarStyles.ViewSegment
                key={mode.value}
                type="button"
                $active={active}
                onClick={() => setViewMode(mode.value)}
                aria-pressed={active}
                title={mode.label}
                aria-label={mode.label}
              >
                {mode.icon}
                <span className="label">{mode.label}</span>
              </ToolbarStyles.ViewSegment>
            )
          })}

          {/* 더보기 — 격자/통계/트리/갤러리 묶음 */}
          <MoreSegmentWrap ref={moreRef}>
            <ToolbarStyles.ViewSegment
              type="button"
              $active={moreActive}
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={moreOpen}
              aria-label={
                activeSecondary
                  ? `${activeSecondary.label} 보기 — 다른 보기 선택`
                  : '다른 보기 모드'
              }
              title="다른 보기 모드"
            >
              {activeSecondary ? (
                activeSecondary.icon
              ) : (
                <FiMoreHorizontal size={13} />
              )}
              <span className="label">
                {activeSecondary ? activeSecondary.label : '더보기'}
              </span>
              <FiChevronDown
                size={11}
                aria-hidden="true"
                style={{
                  marginLeft: 1,
                  opacity: 0.7,
                  transform: moreOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.15s ease',
                }}
              />
            </ToolbarStyles.ViewSegment>
            {moreOpen && (
              // role="group" + aria-pressed 버튼 그룹 — 선언만 하고 키보드 메뉴
              // 내비(화살표 로빙)를 구현하지 않던 menu 패턴 대신 실제 Tab 동작과 일치.
              <MoreMenu role="group" aria-label="추가 보기 모드">
                {SECONDARY_MODES.map((mode) => {
                  const active = viewMode === mode.value
                  return (
                    <MoreMenuItem
                      key={mode.value}
                      aria-pressed={active}
                      $active={active}
                      type="button"
                      onClick={() => {
                        setViewMode(mode.value)
                        setMoreOpen(false)
                      }}
                    >
                      <span aria-hidden="true">{mode.icon}</span>
                      <span>{mode.label}</span>
                    </MoreMenuItem>
                  )
                })}
              </MoreMenu>
            )}
          </MoreSegmentWrap>
        </ToolbarStyles.ViewSegmented>

        {/* 표시 옵션 — 정렬 + 방향 + 페이지 크기. 필터와 시각 family 분리(border 없음). */}
        <ToolbarStyles.DisplayOptions>
          <Filter.SortSelect
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="정렬 기준"
          >
            {/* 'recent'는 내부적으로 startDate 기준 — UI 라벨은 사건 *발생 시기*임을 명확히 */}
            <option value="recent">시기순</option>
            <option value="duration">기간순</option>
          </Filter.SortSelect>
          <Filter.SortButton
            type="button"
            onClick={onSortDirectionToggle}
            aria-label={sortDirection === 'asc' ? '오름차순' : '내림차순'}
            $direction={sortDirection}
          >
            <FiArrowDown size={14} aria-hidden="true" />
          </Filter.SortButton>
          <List.SortSelect
            value={pageSize}
            aria-label="한 번에 불러올 사건 수"
            title="한 번에 불러올 사건 수 (스크롤 시 추가 로드)"
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={20}>20개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
          </List.SortSelect>
        </ToolbarStyles.DisplayOptions>

        <MetaArea aria-live="polite">
          <CatalogHeaderStats
            events={events}
            dbCategories={dbCategories}
            visibleCount={isFiltered ? visibleCount : undefined}
            serverTotal={serverTotal}
          />
          {isFiltered && (
            <FilteredHint title="등록된 전체 사건 수(필터 적용 전). 카테고리·세기·검색 필터는 이 값에 반영되지 않음.">
              / 등록 전체 {authoritativeTotal.toLocaleString()}건
            </FilteredHint>
          )}
        </MetaArea>
      </ToolbarStyles.ViewSwitcherRow>

      <ViewHint role="note">{VIEW_HINTS[viewMode]}</ViewHint>

      {activeSlot}
    </PageStyles.ActiveContent>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// styled — 더보기 dropdown + 메타 영역
// ─────────────────────────────────────────────────────────────────────────────

const MoreSegmentWrap = styled.div`
  position: relative;
  display: inline-flex;
`

const MoreMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  min-width: 140px;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: #18181b;
         border: 1px solid rgba(255,255,255,0.08);
         box-shadow: ${SHADOW.mdDark};`
      : `background: #ffffff;
         border: 1px solid rgba(15,23,42,0.08);
         box-shadow: ${SHADOW.md};`}
`

const MoreMenuItem = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryFillDark
        : BRAND.primarySoftHover
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover
      : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  letter-spacing: -0.005em;
  cursor: pointer;
  text-align: left;
  transition: background ${MOTION.fast}, color ${MOTION.fast};

  & > span:first-child {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    flex-shrink: 0;
  }

  &:hover {
    background: ${({ theme, $active }) =>
      $active
        ? theme.mode === 'dark'
          ? BRAND.primaryFillDark
          : BRAND.primarySoftHover
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`

const ViewHint = styled.div`
  margin: 2px 2px 8px;
  font-size: 11.5px;
  line-height: 1.4;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaArea = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const FilteredHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  letter-spacing: -0.005em;
`
