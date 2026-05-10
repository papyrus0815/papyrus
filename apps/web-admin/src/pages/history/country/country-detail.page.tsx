/**
 * /history/country/:countryId/*  — 국가 상세 페이지
 *
 * 좌측: CountryList (검색·필터·정렬·탭)
 * 우측: CountryDetail (개요·역대 수반·인물·행정·선거·법령·연대표 탭)
 *
 * 페이지의 책임은 데이터 모음 + 뷰 분기뿐 — 라우팅/모달은 hook으로 위임.
 */
import { useEffect, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { createGlobalStyle } from 'styled-components'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import { useRecentCountriesStore } from '@/widgets/command-palette'
import { CountryDetail } from '@/widgets/country/country-detail/ui/country-detail.widget'
import { EventsTimelineSection } from '@/widgets/country/country-detail/ui/events-timeline-section.widget'
import { CountryFormModal } from '@/widgets/country/country-form/ui/country-form-modal'
import { CountryList } from '@/widgets/country/country-list/ui/country-list'
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui/ui/country-mobile-ui'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'
import { HistoryShell, useHistoryCoreData } from '@/widgets/history-shell'

import { useCountryDetailRouting } from './use-country-detail-routing.hook'
import { useCountryFormHandlers } from './use-country-form-handlers.hook'
import { useHistoryLocation } from './use-history-location.hook'

/** 페이지 마운트 동안 전역 흰색 배경 + 배경 이미지 숨김 — DOM 직접 조작 대신 styled GlobalStyle. */
const CountryDetailPageGlobalStyle = createGlobalStyle`
  body { background-color: #ffffff; }
  #global-bg { display: none; }
`

export default function CountryDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ countryId?: string }>()
  const [searchParams] = useSearchParams()
  const hloc = useHistoryLocation()

  const {
    unifiedCountries,
    countriesById,
    continents,
    apiHistoricalCountries,
    isLoading: isCoreDataLoading,
  } = useHistoryCoreData()

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

  // 잘못된 ID — 핵심 데이터가 다 로드됐는데도 못 찾으면 NotFound
  const notFound = !!selectedId && !isCoreDataLoading && !selectedCountry

  // 페이지 타이틀 — 다중 탭 식별 향상
  useEffect(() => {
    if (selectedCountry) {
      document.title = `${selectedCountry.name} · Papyrus`
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
    navigate(pathKeys.history.countryDetail(id))

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

  // 우측 콘텐츠 — events 탭은 EventsTimelineSection, 그 외는 CountryDetail
  const rightContent =
    hloc.detailTab === 'events' ? (
      <motion.div
        key={`events-${selectedId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ width: '100%', minHeight: '100%' }}
      >
        <EventsTimelineSection
          countryId={selectedId ?? undefined}
          initialFormFromSearchParams={searchParams.get('form') === 'create'}
          onNavigateToForm={(toForm) => {
            if (!selectedId) return
            navigate(
              toForm
                ? pathKeys.history.countryEvents(selectedId, 'create')
                : pathKeys.history.countryEvents(selectedId),
            )
          }}
        />
      </motion.div>
    ) : (
      <motion.div
        key={`detail-${selectedId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ width: '100%', minHeight: '100%' }}
      >
        <CountryDetail
          country={selectedCountry || null}
          continents={continents}
          isLoading={!!selectedId && isCoreDataLoading && !selectedCountry}
          notFound={notFound}
          onEdit={editFromDetail}
          onDelete={deleteFromDetail}
          initialDetailTab={initialDetailTab}
          onDetailTabChange={handleDetailTabChange}
        />
      </motion.div>
    )

  return (
    <>
      <CountryDetailPageGlobalStyle />
      <HistoryShell
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
            {rightContent}
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
      </HistoryShell>
    </>
  )
}
