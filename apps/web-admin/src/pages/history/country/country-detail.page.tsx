/**
 * /history/country/:countryId/*  — 국가 상세 페이지
 *
 * 좌측: CountryList (검색·필터·정렬·탭)
 * 우측: CountryDetail (개요·역대 수반·인물·행정·선거·법령·연대표 탭)
 *
 * Phase 4 리팩토링에서 기존 country.page.tsx(1600줄)의 국가 상세 담당 부분만 추출.
 * 대시보드·브라우즈 모드는 각각 별도 페이지로 분리됨.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import type { Country } from '@/entities/country/api'
import {
  type UnifiedCountry,
  historicalToUnified,
} from '@/entities/country/model/unified-types'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import { pathKeys } from '@/shared/router'
import { useRecentCountriesStore } from '@/widgets/command-palette'
import { CountryDetail } from '@/widgets/country/country-detail/ui/country-detail.widget'
import { EventsTimelineSection } from '@/widgets/country/country-detail/ui/events-timeline-section.widget'
import { CountryFormModal } from '@/widgets/country/country-form/ui/country-form-modal'
import { useCountryFormModal } from '@/widgets/country/country-form/model/use-country-form-modal.hook'
import { CountryList } from '@/widgets/country/country-list/ui/country-list'
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui/ui/country-mobile-ui'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'
import { useHistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/model/use-historical-country-form-modal.hook'
import { HistoryShell, useHistoryCoreData } from '@/widgets/history-shell'

import { useHistoryLocation } from './use-history-location.hook'

export default function CountryDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ countryId?: string }>()
  const [searchParams] = useSearchParams()
  const hloc = useHistoryLocation()

  const { unifiedCountries, continents, apiHistoricalCountries } =
    useHistoryCoreData()

  const selectedId = params.countryId ?? null

  // 최근 방문 국가 캐시 (⌘K 팔레트용)
  const pushRecentCountry = useRecentCountriesStore((s) => s.push)
  useEffect(() => {
    if (selectedId) pushRecentCountry(selectedId)
  }, [selectedId, pushRecentCountry])

  // 역대 수반 탭은 행정조직 탭으로 통합 — /persons?tab=heads → /government
  // replace: true + 조건 early return만으로 루프 방지 (리다이렉트 후엔 detailTab이 'government'로 바뀌어 조건 false)
  useEffect(() => {
    if (!selectedId || hloc.detailTab !== 'persons') return
    if (searchParams.get('tab') !== 'heads') return
    navigate(pathKeys.history.countryGovernment(selectedId), { replace: true })
  }, [selectedId, hloc.detailTab, searchParams, navigate])

  // 페이지 배경 흰색 + 전역 배경 이미지 숨김
  useEffect(() => {
    document.body.style.backgroundColor = '#ffffff'
    const globalBg = document.getElementById('global-bg')
    if (globalBg) globalBg.style.display = 'none'
    return () => {
      document.body.style.backgroundColor = ''
      const gb = document.getElementById('global-bg')
      if (gb) gb.style.display = ''
    }
  }, [])

  // 현재 선택된 국가 찾기 (현대/역사 모두)
  const selectedCountry = useMemo<UnifiedCountry | undefined>(() => {
    if (!selectedId) return undefined
    const modern = unifiedCountries.find((c) => c.id === selectedId)
    if (modern) return modern
    const fromApi = (apiHistoricalCountries ?? []).find(
      (hc) => hc.id === selectedId,
    )
    if (fromApi) return historicalToUnified(fromApi as HistoricalCountry)
    for (const country of unifiedCountries) {
      if (country.type === 'modern' && country.historicalCountries) {
        const hit = country.historicalCountries.find((h) => h.id === selectedId)
        if (hit) return historicalToUnified(hit)
      }
    }
    return undefined
  }, [unifiedCountries, selectedId, apiHistoricalCountries])


  // 국가 폼 모달 (현대 국가 등록·수정·삭제)
  const countryForm = useCountryFormModal()

  // 역사 국가 폼 모달
  const historicalForm = useHistoricalCountryFormModal()

  const handleEditHistoricalFromList = useCallback(
    (country: UnifiedCountry) => {
      const full = apiHistoricalCountries?.find((hc) => hc.id === country.id)
      if (full) historicalForm.openEdit(full as HistoricalCountry)
    },
    [apiHistoricalCountries, historicalForm],
  )

  const handleEditFromDetail = useCallback(
    (country: UnifiedCountry) => {
      if (country.type === 'historical') {
        const full = apiHistoricalCountries?.find((hc) => hc.id === country.id)
        if (full) historicalForm.openEdit(full as HistoricalCountry)
      } else {
        countryForm.openEdit(country as Country)
      }
    },
    [apiHistoricalCountries, countryForm, historicalForm],
  )

  const handleDeleteFromDetail = useCallback(
    async (id: string) => {
      if (selectedCountry?.type === 'historical') {
        const ok = await historicalForm.remove(id)
        if (ok) navigate(pathKeys.history.country())
      } else {
        const name = selectedCountry?.name ?? '국가'
        await countryForm.remove(id, name)
      }
    },
    [selectedCountry, historicalForm, countryForm, navigate],
  )

  const [isMobileListOpen, setIsMobileListOpen] = useState(false)

  // 핸들러 — 탭·뷰 변경
  const handleSelectCountry = useCallback(
    (id: string) => navigate(pathKeys.history.countryDetail(id)),
    [navigate],
  )

  const handleDetailTabChange = useCallback(
    (
      tab:
        | 'heads'
        | 'linked-historical'
        | 'regions'
        | 'government'
        | 'elections'
        | 'laws'
        | null,
    ) => {
      if (!selectedId) return
      if (tab === 'heads' || tab === 'government')
        navigate(pathKeys.history.countryGovernment(selectedId))
      else if (tab === 'linked-historical')
        navigate(pathKeys.history.countryHistorical(selectedId))
      else if (tab === 'regions')
        navigate(pathKeys.history.countryRegions(selectedId))
      else if (tab === 'elections')
        navigate(pathKeys.history.countryElections(selectedId))
      else if (tab === 'laws') navigate(pathKeys.history.countryLaws(selectedId))
      else navigate(pathKeys.history.countryDetail(selectedId))
    },
    [navigate, selectedId],
  )

  const handleDashboardView = useCallback(() => {
    if (selectedId) navigate(pathKeys.history.countryDashboard(selectedId))
  }, [navigate, selectedId])

  // 인물 탭 URL(/history/country/:id/persons*)로 진입 시 헤더 인물 페이지로 리다이렉트 (country 프리셋 포함)
  useEffect(() => {
    if (!selectedId) return
    if (hloc.detailTab === 'persons') {
      navigate(
        `${pathKeys.history.dashboardPersons()}?countries=${encodeURIComponent(selectedId)}`,
        { replace: true },
      )
    }
  }, [hloc.detailTab, selectedId, navigate])

  // CountryDetail widget의 initialDetailTab prop 계산 (persons 케이스는 위에서 리다이렉트)
  const initialDetailTab = useMemo(() => {
    switch (hloc.detailTab) {
      case 'dashboard':
        return 'dashboard' as const
      case 'heads-of-state':
        return 'heads' as const
      case 'linked-historical':
        return 'linked-historical' as const
      case 'regions':
        return 'regions' as const
      case 'government':
        return 'government' as const
      case 'elections':
        return 'elections' as const
      case 'laws':
        return 'laws' as const
      default:
        return undefined
    }
  }, [hloc.detailTab])

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
          isLoading={false}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteFromDetail}
          initialDetailTab={initialDetailTab}
          onDetailTabChange={handleDetailTabChange}
          onDashboardView={handleDashboardView}
        />
      </motion.div>
    )

  return (
    <HistoryShell
      left={({ listCollapsed, toggleListCollapsed }) => (
        <CountryList
          selectedId={selectedId}
          onSelect={handleSelectCountry}
          onAdd={countryForm.openCreate}
          onAddHistorical={historicalForm.openCreate}
          onEditHistorical={handleEditHistoricalFromList}
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
        editing={countryForm.editing}
        continents={continents}
        onSave={countryForm.save}
      />

      <HistoricalCountryFormModal
        isOpen={historicalForm.isOpen}
        onClose={historicalForm.close}
        editing={historicalForm.editingForModal}
        initialPreset={historicalForm.preset}
        modernCountries={unifiedCountries
          .filter((c) => c.type === 'modern')
          .map((c) => ({ id: c.id, name: c.name }))}
        historicalCountries={(apiHistoricalCountries ?? [])
          .filter((hc) => hc.id !== historicalForm.editing?.id)
          .map((hc) => ({ id: hc.id, name: hc.name }))}
        onSave={historicalForm.save}
      />
    </HistoryShell>
  )
}
