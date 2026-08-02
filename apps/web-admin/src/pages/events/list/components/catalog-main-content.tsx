/**
 * 카탈로그 메인 영역 (활성 뷰 모드).
 *
 * 디자인 원칙
 *  - **뷰 세그먼트 2+1**: 자주 쓰는 타임라인/목록은 세그먼트 노출, 그 외(격자/통계/트리/갤러리/지도)는
 *    "더보기 ▾" 드롭다운으로 묶어 시각 부담 감소.
 *  - **통계 인라인**: 페이지 헤더의 KPI chip을 제거하고 ViewMeta 자리에 한 줄 요약으로 융합.
 *  - 표시 옵션(정렬·방향·페이지 크기)은 필터와 시각 family 분리.
 *
 * 활성 뷰 슬롯은 부모(events.page)가 viewMode에 따라 하나만 빌드해 `activeSlot`으로 넘긴다.
 * 이렇게 하면 7개 view의 React element를 매 렌더마다 모두 평가하던 비용이 사라진다.
 *
 * 상세 패널은 `CatalogDetailDrawer`로 분리.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useOverlayEscape } from '@/shared/hooks/use-overlay-escape.hook'

import { createPortal } from 'react-dom'
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
  FiMaximize2,
  FiMinimize2,
  FiMoreHorizontal,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { SortOption } from '@/features/event-list/lib'
import { VIEW_MODES, type ViewMode } from '@/features/event-list/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { useAnchoredPosition } from '@/shared/hooks/use-anchored-position.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

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
  /** 현재 필터·북마크가 적용돼 화면에 렌더되는 *행* 수(부모+펼친 자식) */
  visibleCount: number
  /** 그중 필터를 실제로 만족하는 사건 수 — 문맥용 부모 행은 제외 */
  matchedCount: number
  /** 현재까지 로드된 *최상위* 사건 수 — serverTotal과 같은 모수 */
  totalCount: number
  /** 서버의 권위 총개수(최상위 기준, 로드 여부 무관) */
  serverTotal?: number
  /** 필터·검색·북마크가 실제로 걸려 있는가 — 카운트 비교로 추측하지 않는다 */
  filtersActive: boolean

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

  /**
   * 집중(넓게) 보기 — 상단 페이지 헤더·뷰 힌트·미니맵을 접어 콘텐츠(특히 타임라인)에
   * 세로 공간을 양보한다. 상태는 페이지가 소유(localStorage 영속).
   */
  wideMode: boolean
  onToggleWideMode: () => void

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
  [VIEW_MODES.MAP]: '지리적 위치 — 좌표 데이터가 아직 없어 준비 중입니다',
  [VIEW_MODES.GRID]: '10년 단위 밀집도 — 어느 시대에 사건이 몰렸는지',
  [VIEW_MODES.DASHBOARD]: '데이터 분포·품질 통계 — 사건 목록이 아닌 집계',
  [VIEW_MODES.TREE]: '상·하위 사건의 계층 관계',
  [VIEW_MODES.GALLERY]: '이미지 중심 카드 — 시각적 탐색',
}

/**
 * 자주 쓰는 2개 — 세그먼트 컨트롤로 노출.
 *
 * 지도는 여기서 **빠졌다**(2026-07-28 검토 M8): 좌표 파이프라인이 스키마·DTO·등록
 * 폼 어디에도 없어 데이터와 무관하게 100% 빈 화면인데, primary 3개 중 하나를
 * 차지하고 있었다. 좌표를 실제로 싣게 되면 다시 올릴 것.
 */
const PRIMARY_MODES: ModeDef[] = [
  { value: VIEW_MODES.TIMELINE, label: '타임라인', icon: <FiClock size={13} /> },
  { value: VIEW_MODES.LIST, label: '목록', icon: <FiList size={13} /> },
]

/** 보조 5개 — "더보기 ▾" 드롭다운에 묶음 */
const SECONDARY_MODES: ModeDef[] = [
  { value: VIEW_MODES.GRID, label: '격자', icon: <FiGrid size={13} /> },
  {
    value: VIEW_MODES.DASHBOARD,
    label: '통계',
    icon: <FiBarChart2 size={13} />,
  },
  { value: VIEW_MODES.TREE, label: '트리', icon: <FiGitBranch size={13} /> },
  { value: VIEW_MODES.GALLERY, label: '갤러리', icon: <FiImage size={13} /> },
  { value: VIEW_MODES.MAP, label: '지도', icon: <FiMapPin size={13} /> },
]

export const CatalogMainContent: React.FC<Props> = ({
  viewMode,
  setViewMode,
  visibleCount,
  matchedCount,
  totalCount,
  serverTotal,
  filtersActive,
  events,
  dbCategories,
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionToggle,
  pageSize,
  onPageSizeChange,
  wideMode,
  onToggleWideMode,
  activeSlot,
}) => {
  /**
   * 필터 여부는 **실제 필터 상태**로 판정한다.
   * 예전엔 `visibleCount !== totalCount`로 추측했는데, 두 값의 모수가 애초에 달라
   * (행 수 vs 최상위 사건 수) 필터를 하나도 안 걸어도 거의 항상 true였고, 반대로
   * 계층을 접으면 우연히 같아져 '미필터'로 뒤집히기도 했다(검토 M10).
   */
  const isFiltered = filtersActive
  /** 표시용 권위 총량 — 서버 count가 있으면 그 값, 없으면 로드된 최상위 수로 폴백 */
  const authoritativeTotal = serverTotal ?? totalCount

  // ── 더보기 메뉴 ────────────────────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null)
  /** 포털된 메뉴 노드 — moreRef의 자손이 아니라 외부클릭 판정에 따로 필요 */
  const moreMenuRef = useRef<HTMLDivElement | null>(null)
  const morePosition = useAnchoredPosition(moreTriggerRef, moreOpen, {
    maxWidth: 140,
  })
  const closeMoreMenu = useCallback(() => setMoreOpen(false), [])

  useEffect(() => {
    if (!moreOpen) return
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (moreRef.current?.contains(target)) return
      // 메뉴는 body로 포털된다 — 이 검사가 없으면 항목을 누르는 mousedown이
      // 외부 클릭으로 판정돼 click 전에 언마운트되고 뷰가 전환되지 않는다.
      if (moreMenuRef.current?.contains(target)) return
      setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
    }
  }, [moreOpen])
  // Escape는 공용 훅이 처리(전파 차단) — 검토 INT-1
  useOverlayEscape(moreOpen, closeMoreMenu)

  const activeSecondary = SECONDARY_MODES.find((m) => m.value === viewMode)
  const moreActive = !!activeSecondary

  return (
    <PageStyles.ActiveContent $capped={viewMode === VIEW_MODES.LIST}>
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

          {/* 더보기 — 격자/통계/트리/갤러리/지도 묶음 */}
          <MoreSegmentWrap ref={moreRef}>
            <ToolbarStyles.ViewSegment
              ref={moreTriggerRef}
              type="button"
              $active={moreActive}
              onClick={() => setMoreOpen((prev) => !prev)}
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
            {moreOpen &&
              morePosition &&
              createPortal(
                // role="group" + aria-pressed 버튼 그룹 — 선언만 하고 키보드 메뉴
                // 내비(화살표 로빙)를 구현하지 않던 menu 패턴 대신 실제 Tab 동작과 일치.
                <MoreMenu
                  ref={moreMenuRef}
                  role="group"
                  aria-label="추가 보기 모드"
                  style={{
                    top: morePosition.top,
                    left: morePosition.left,
                    maxHeight: morePosition.maxHeight,
                  }}
                >
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
                </MoreMenu>,
                document.body,
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
            <option value="created">등록순</option>
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

        {/* 집중(넓게) 보기 토글 — 어느 뷰에서도 항상 보이도록 ViewSwitcherRow에 둠.
            (특히 타임라인은 미니맵 접기로 ~166px를 본문에 양보) */}
        <ToolbarStyles.ToolbarBtn
          type="button"
          $active={wideMode}
          onClick={onToggleWideMode}
          aria-pressed={wideMode}
          title={
            wideMode
              ? '기본 보기 — 접은 상단 영역 다시 표시'
              : '넓게 보기 — 상단 영역(헤더·미니맵 등)을 접어 콘텐츠를 최대화'
          }
        >
          {wideMode ? (
            <FiMinimize2 size={13} aria-hidden="true" />
          ) : (
            <FiMaximize2 size={13} aria-hidden="true" />
          )}
          <span>{wideMode ? '기본' : '넓게'}</span>
        </ToolbarStyles.ToolbarBtn>

        <MetaArea aria-live="polite">
          <CatalogHeaderStats
            events={events}
            dbCategories={dbCategories}
            visibleCount={isFiltered ? matchedCount : undefined}
            serverTotal={serverTotal}
          />
          {isFiltered && (
            <FilteredHint title="등록된 최상위 사건 수(필터 적용 전). 앞의 숫자는 현재 조건을 만족하는 사건 수이므로 모수가 다릅니다.">
              / 등록 전체 {authoritativeTotal.toLocaleString()}건(최상위)
            </FilteredHint>
          )}
        </MetaArea>
      </ToolbarStyles.ViewSwitcherRow>

      {!wideMode && (
        <ViewHint role="note">
          {VIEW_HINTS[viewMode]}
          {/**
           * IA-12 — 목록 뷰는 연도 그룹핑이 고정이라 '기간순'은 **같은 해 안에서만** 적용된다.
           * 그런데 화면 어디에도 그 사실이 드러나지 않아, '가장 오래 지속된 사건'을 찾으려는
           * 사용자는 겉보기에 변화 없는 목록을 보고 컨트롤이 고장 났다고 판단한다.
           * 그룹핑을 끄는 대신(연도 그룹은 이 뷰의 정체성이다) 조건을 정직하게 밝힌다.
           */}
          {viewMode === VIEW_MODES.LIST && sortBy === 'duration' && (
            <SortScopeNote>
              · 기간순은 연도 그룹이 고정이라 <strong>같은 해 안에서만</strong> 적용됩니다
            </SortScopeNote>
          )}
          {viewMode === VIEW_MODES.LIST && sortBy === 'created' && (
            <SortScopeNote>
              · 등록순은 <strong>연도 그룹을 해제</strong>하고 최근 등록한 순서로 나열합니다
            </SortScopeNote>
          )}
        </ViewHint>
      )}

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

/**
 * body로 포털된다 — 좌표는 useAnchoredPosition이 인라인으로 주입.
 * ViewSegmented가 ≤720px에서 `overflow-x:auto`를 걸기 때문에,
 * (양 끝 mask-image는 2026-08-01 제거됨 — 지도 뷰 강등으로 세그먼트가 넘치지 않게 됐다)
 * 세그먼트 안에서 absolute로 띄우면 메뉴가 통째로 잘려 격자·통계·트리·갤러리에
 * 진입할 수단이 사라진다(2026-07-28 검토 P1-8).
 */
const MoreMenu = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.DROPDOWN};
  min-width: 140px;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
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

/* 정렬 적용 범위 안내 — 목록 뷰 + 기간순 조합에서만 나타난다(검토 IA-12). */
const SortScopeNote = styled.span`
  margin-left: 4px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#854d0e')};

  strong {
    font-weight: 700;
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
