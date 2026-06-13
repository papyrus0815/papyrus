/**
 * /history/country[/:countryId/*] 의 공통 셸 — React Router의 layout route로 동작.
 *
 * - 좌측 리스트, 모바일 UI, 폼 모달은 어떤 sub-route(events / detail / dashboard / ...)에서나 동일.
 * - 우측 콘텐츠는 `<Outlet context={...}/>`로 자식 라우트에 위임.
 *
 * Layout route 패턴 덕분에 events ↔ dashboard 같은 sub-route 전환 시 셸이 unmount되지 않음 →
 * `useContentCoreData`/`useCountryFormHandlers` 등 데이터·모달 state 보존, document.title 깜빡임 해소.
 *
 * 자식 라우트는 `useCountryDetailShellContext()`로 args를 받는다.
 */
import { useEffect, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import styled, { createGlobalStyle } from 'styled-components'
import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { ContinentOption } from '@/entities/country/api'
import { pathKeys } from '@/shared/router'
import { useRecentCountriesStore } from '@/widgets/command-palette'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'
import { CountryFormModal } from '@/widgets/country/country-form/ui/country-form-modal'
import { CountryList } from '@/widgets/country/country-list/ui/country-list'
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui/ui/country-mobile-ui'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'
import { ContentShell, useContentCoreData } from '@/widgets/content-shell'

import { useCountryDetailRouting } from './use-country-detail-routing.hook'
import { useCountryFormHandlers } from './use-country-form-handlers.hook'
import { useContentLocation } from './use-content-location.hook'
import type { CountryDetailTabKey } from '@/widgets/country/country-detail/ui/country-detail.widget'

/** 페이지 마운트 동안 전역 흰색 배경 + 배경 이미지 숨김 — DOM 직접 조작 대신 styled GlobalStyle. */
const CountryDetailPageGlobalStyle = createGlobalStyle`
  body { background-color: #ffffff; }
  #global-bg { display: none; }
`

/** sub-route(events ↔ detail) 전환 시 우측 콘텐츠 fade를 담당하는 motion 래퍼. */
const RouteSwapMotion = styled(motion.div)`
  width: 100%;
  min-height: 100%;
`

export interface CountryDetailShellContext {
  selectedId: string | null
  selectedCountry: UnifiedCountry | undefined
  continents: ContinentOption[]
  /** 핵심 데이터가 아직 로드 중이고 selectedCountry를 못 찾은 상태 */
  isInitialLoading: boolean
  notFound: boolean
  initialDetailTab: CountryDetailTabKey | undefined
  handleDetailTabChange: (tab: CountryDetailTabKey | null) => void
  /** 상세 폼 모달 진입 — country.type에 따라 분기 */
  onEdit: (country: UnifiedCountry) => void
  onDelete: (id: string) => Promise<void>
}

/** 자식 라우트가 셸 args를 받는 hook. */
export function useCountryDetailShellContext(): CountryDetailShellContext {
  return useOutletContext<CountryDetailShellContext>()
}

export function CountryDetailShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ countryId?: string }>()
  const hloc = useContentLocation()

  const {
    unifiedCountries,
    countriesById,
    continents,
    apiHistoricalCountries,
    isLoading: isCoreDataLoading,
  } = useContentCoreData()

  const selectedId = params.countryId ?? null

  // 최근 방문 국가 캐시 (⌘K 팔레트용) — store가 dedup 처리
  const pushRecentCountry = useRecentCountriesStore((s) => s.push)
  useEffect(() => {
    if (selectedId) pushRecentCountry(selectedId)
  }, [selectedId, pushRecentCountry])

  // 현재 선택된 국가 — 통합 인덱스에서 O(1) 조회 (현대/raw 역사/현대의 하위 역사 모두)
  const selectedCountry = useMemo(() => {
    if (!selectedId) return undefined
    return countriesById.get(selectedId)
  }, [countriesById, selectedId])

  const notFound = !!selectedId && !isCoreDataLoading && !selectedCountry
  const isInitialLoading =
    !!selectedId && isCoreDataLoading && !selectedCountry

  // 페이지 타이틀 — 다중 탭 식별 향상. unmount/국가 변경 시 이전 타이틀 복원해
  // 다른 페이지로 떠날 때 이전 국가명이 잠깐 남아 있는 잔상 방지.
  // (Layout route 덕분에 sub-route 전환 시에는 이 effect가 재실행되지 않음 — 깜빡임 없음.)
  useEffect(() => {
    if (!selectedCountry) return
    const prev = document.title
    document.title = `${selectedCountry.name} · Papyrus`
    return () => {
      document.title = prev
    }
  }, [selectedCountry])

  // 라우팅·리다이렉트
  const { initialDetailTab, handleDetailTabChange } = useCountryDetailRouting({
    selectedId,
    detailTab: hloc.detailTab,
  })

  // 모달 + 폼 핸들러
  const {
    countryForm,
    historicalForm,
    editHistoricalFromList,
    editFromDetail,
    deleteFromDetail,
  } = useCountryFormHandlers({
    apiHistoricalCountries,
    selectedCountry,
  })

  const [isMobileListOpen, setIsMobileListOpen] = useState(false)

  const handleSelectCountry = (id: string) =>
    navigate(pathKeys.countryDetail(id))

  // 역사 폼 모달의 modernCountries / historicalCountries — 모달이 닫혀 있으면 계산 회피
  const modernCountriesForModal = useMemo(() => {
    if (!historicalForm.isOpen) return []
    return unifiedCountries
      .filter((c) => c.type === 'modern')
      .map((c) => ({ id: c.id, name: c.name }))
  }, [historicalForm.isOpen, unifiedCountries])

  const historicalCountriesForModal = useMemo(() => {
    if (!historicalForm.isOpen) return []
    return (apiHistoricalCountries ?? [])
      .filter((hc) => hc.id !== historicalForm.editing?.id)
      .map((hc) => ({ id: hc.id, name: hc.name }))
  }, [
    historicalForm.isOpen,
    apiHistoricalCountries,
    historicalForm.editing?.id,
  ])

  // 자식이 effect deps로 context 객체 자체를 참조해도 안정적이도록 useMemo.
  const context = useMemo<CountryDetailShellContext>(
    () => ({
      selectedId,
      selectedCountry,
      continents,
      isInitialLoading,
      notFound,
      initialDetailTab,
      handleDetailTabChange,
      onEdit: editFromDetail,
      onDelete: deleteFromDetail,
    }),
    [
      selectedId,
      selectedCountry,
      continents,
      isInitialLoading,
      notFound,
      initialDetailTab,
      handleDetailTabChange,
      editFromDetail,
      deleteFromDetail,
    ],
  )

  return (
    <>
      <CountryDetailPageGlobalStyle />
      <ContentShell
        /* 모바일(≤1024px)에서 상세 페인 노출 — 없으면 display:none으로 국가 상세 전체가 빈 화면.
           국가 목록은 CountryMobileUI 오버레이("목록" 칩)가 담당한다. */
        mobileDetailVisible
        left={({ listCollapsed, toggleListCollapsed }) => (
          <CountryList
            selectedId={selectedId}
            onSelect={handleSelectCountry}
            onAdd={countryForm.openCreate}
            onAddHistorical={historicalForm.openCreate}
            onEditHistorical={editHistoricalFromList}
            collapsed={listCollapsed}
            onToggleCollapse={toggleListCollapsed}
          />
        )}
        right={
          <AnimatePresence initial={false} mode="wait">
            {/* sub-route 전환마다 motion이 fade — 페이지가 자체 motion wrapper를 갖지 않아도 됨 */}
            <RouteSwapMotion
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {/* sub-tab 위젯 일부가 거대(elections·cabinets 등) — 단일 throw가 페이지 전체를
                  날리지 않도록 ErrorBoundary로 격리. 좌측 리스트·모달은 셸이 보존. */}
              <SmartErrorBoundary>
                <Outlet context={context} />
              </SmartErrorBoundary>
            </RouteSwapMotion>
          </AnimatePresence>
        }
      >
        <CountryMobileUI
          isMobileListOpen={isMobileListOpen}
          onMobileListOpenChange={setIsMobileListOpen}
          selectedId={selectedId}
          onSelectCountry={handleSelectCountry}
          onAddCountry={countryForm.openCreate}
        />

        <CountryFormModal
          isOpen={countryForm.isOpen}
          onClose={countryForm.close}
          mode={countryForm.mode}
          editing={countryForm.editing}
          continents={continents}
          onSave={countryForm.save}
        />

        <HistoricalCountryFormModal
          isOpen={historicalForm.isOpen}
          onClose={historicalForm.close}
          editing={historicalForm.editingForModal}
          initialPreset={historicalForm.preset}
          modernCountries={modernCountriesForModal}
          historicalCountries={historicalCountriesForModal}
          onSave={historicalForm.save}
        />
      </ContentShell>
    </>
  )
}

