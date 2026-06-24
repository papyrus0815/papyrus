/**
 * /history/dashboard/persons
 * /history/dashboard/persons/:personId
 *
 * 인물 대시보드 — 인포그래픽 5뷰 (매트릭스/은하계/시대 스토리/왕조/능력치) + 필터.
 * 인물 상세는 같은 페이지에서 PersonDetailPanel로 우측 렌더.
 *
 * URL 쿼리(useFilterUrlSync 가 store와 양방향 동기화):
 *   view, q, era, region, field, countries, alive, minInf, sort
 *
 * 국가 상세 → "이 나라 인물 보기"는 ?countries=<id>로 진입 → 일반 필터 스코프로 적용됨
 * (별도 카드 전용 모드 없음 — 인포그래픽 + 필터로 통일).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import { FiFilter } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  ContentShell,
  LeftFilterSlot,
  SidebarSheet,
  SidebarSheetTrigger,
} from '@/widgets/content-shell'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'
import {
  countActiveScopes,
  PersonFilterPanel,
  PersonInfographicPane,
  usePersonInfographicFilterStore,
} from '@/widgets/person-infographic'

const SCROLL_KEY = 'person-list-scroll'

/** 가장 가까운 스크롤 가능 조상(overflow-y auto/scroll) — 실제 스크롤은 window가 아니라 레이아웃 Content. */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const oy = getComputedStyle(node).overflowY
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return node
    node = node.parentElement
  }
  return null
}

export default function DashboardPersonsPage() {
  const navigate = useNavigate()
  const params = useParams<{ personId?: string }>()
  const personId = params.personId ?? null
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)

  // 모바일 필터 트리거 배지용 — 활성 필터 개수 (scope + 영향력 + 생존 + 검색어)
  const activeFilterCount = usePersonInfographicFilterStore(
    (state) =>
      countActiveScopes(state.scopes) +
      (state.minInfluence > 0 ? 1 : 0) +
      (state.aliveFilter !== 'all' ? 1 : 0) +
      (state.query.trim() ? 1 : 0),
  )

  /** 카드 → 상세 → 뒤로 왔을 때 스크롤 위치 복원 (실제 스크롤 컨테이너 기준) */
  const scrollElRef = useRef<HTMLElement | null>(null)
  const setScrollSentinel = useCallback((node: HTMLDivElement | null) => {
    if (node) scrollElRef.current = findScrollParent(node)
  }, [])

  useEffect(() => {
    if (personId) return // 상세 화면에서는 추적/복원 안 함
    const el = scrollElRef.current
    if (!el) return

    // 복원 — 비동기 콘텐츠(react-query + 페이드인)로 높이가 늦게 차므로,
    // 목표 위치까지 스크롤 가능해질 때까지 몇 프레임 재시도 후 클램프.
    // (필터로 리스트가 짧아졌으면 maxTop으로 클램프돼 바닥 튐/0 초기화를 방지)
    let restoreRaf = 0
    let cancelled = false
    const saved = sessionStorage.getItem(SCROLL_KEY)
    const target = saved != null ? Number(saved) : NaN
    if (Number.isFinite(target) && target > 0) {
      let attempts = 0
      const tryRestore = () => {
        if (cancelled) return
        const maxTop = el.scrollHeight - el.clientHeight
        if (maxTop < target && attempts < 20) {
          attempts += 1
          restoreRaf = requestAnimationFrame(tryRestore)
          return
        }
        el.scrollTop = Math.min(target, Math.max(0, maxTop))
      }
      restoreRaf = requestAnimationFrame(tryRestore)
    }

    // 리스트가 떠 있는 동안 위치 추적 (rAF throttle)
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop))
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelled = true
      if (restoreRaf) cancelAnimationFrame(restoreRaf)
      el.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [personId])

  const handlePersonClick = useCallback(
    (id: string) => navigate(pathKeys.personsTimelineDetail(id)),
    [navigate],
  )

  return (
    <>
      <ContentShell
        listCollapsedConfig={{
          storageKey: 'persons-filter-collapsed',
          defaultCollapsed: true,
        }}
        mobileDetailVisible
        left={({ listCollapsed, toggleListCollapsed }) => (
          <LeftFilterSlot
            view="person"
            collapsed={listCollapsed}
            onToggleCollapse={toggleListCollapsed}
          />
        )}
        right={
          personId ? (
            <DetailWrap>
              <PersonDetailPanel
                key={personId}
                personId={personId}
                syncDocumentTitle
                onClose={() => navigate(pathKeys.personsTimeline())}
                onEdit={(id) => {
                  setEditingPersonId(id)
                  setEditModalOpen(true)
                }}
                onLinkedPersonClick={handlePersonClick}
                closeLabel="뒤로"
              />
            </DetailWrap>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', minHeight: '100%' }}
            >
              <div ref={setScrollSentinel} aria-hidden style={{ height: 0 }} />
              <PersonInfographicPane onPersonClick={handlePersonClick} />
            </motion.div>
          )
        }
      />

      {!personId && (
        <>
          <SidebarSheetTrigger
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-label={
              activeFilterCount > 0
                ? `필터 열기, ${activeFilterCount}개 적용 중`
                : '필터 열기'
            }
          >
            <FiFilter size={20} />
            {activeFilterCount > 0 && (
              <FilterCountBadge aria-hidden>{activeFilterCount}</FilterCountBadge>
            )}
          </SidebarSheetTrigger>
          <SidebarSheet
            open={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            title="인물 필터"
          >
            <PersonFilterPanel />
          </SidebarSheet>
        </>
      )}

      <PersonRegisterViewModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editPersonId={editingPersonId}
        onSuccess={() => setEditModalOpen(false)}
      />
    </>
  )
}

const DetailWrap = styled.div`
  padding: 36px 32px 48px;
  background: ${({ theme }) => theme.colors.background.primary};
  @media (max-width: 640px) {
    padding: 16px 16px 32px;
  }
`

/** 모바일 필터 트리거 우상단 — 활성 필터 개수 배지 */
const FilterCountBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.active};
  color: ${({ theme }) => theme.colors.background.primary};
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.background.primary};
`
