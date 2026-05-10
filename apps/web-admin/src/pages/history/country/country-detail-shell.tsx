/**
 * /history/country/:countryId/* 의 공통 셸.
 *
 * 좌측 리스트, 모바일 UI, 폼 모달은 어떤 탭에서나 동일 — 이 셸이 소유한다.
 * 우측 콘텐츠만 페이지가 render prop으로 주입한다 (탭별 페이지가 EventsTimelineSection /
 * CountryDetail / ... 등으로 분기).
 *
 * 페이지가 직접 가지고 있던 데이터·핸들러·모달 상태를 한 군데로 모은 결과 — 페이지는
 * "어떤 우측을 그릴지"만 결정하면 된다.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { AnimatePresence } from 'framer-motion'
import { createGlobalStyle } from 'styled-components'
import { useNavigate, useParams } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import type { ContinentOption } from '@/entities/country/api'
import { pathKeys } from '@/shared/router'
import { useRecentCountriesStore } from '@/widgets/command-palette'
import { CountryFormModal } from '@/widgets/country/country-form/ui/country-form-modal'
import { CountryList } from '@/widgets/country/country-list/ui/country-list'
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui/ui/country-mobile-ui'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'
import { HistoryShell, useHistoryCoreData } from '@/widgets/history-shell'

import { useCountryDetailRouting } from './use-country-detail-routing.hook'
import { useCountryFormHandlers } from './use-country-form-handlers.hook'
import { useHistoryLocation } from './use-history-location.hook'
import type { CountryDetailTabKey } from '@/widgets/country/country-detail/ui/country-detail.widget'

/** 페이지 마운트 동안 전역 흰색 배경 + 배경 이미지 숨김 — DOM 직접 조작 대신 styled GlobalStyle. */
const CountryDetailPageGlobalStyle = createGlobalStyle`
  body { background-color: #ffffff; }
  #global-bg { display: none; }
`

export interface CountryDetailShellRenderArgs {
  selectedId: string | null
  selectedCountry: UnifiedCountry | undefined
  continents: ContinentOption[]
  isLoading: boolean
  notFound: boolean
  initialDetailTab: CountryDetailTabKey | undefined
  handleDetailTabChange: (tab: CountryDetailTabKey | null) => void
  /** 상세 폼 모달 진입 — country.type에 따라 분기 */
  onEdit: (country: UnifiedCountry) => void
  onDelete: (id: string) => Promise<void>
}

interface CountryDetailShellProps {
  /** 우측 콘텐츠 — 탭에 따라 페이지가 결정한다. AnimatePresence로 감싸 페이지 전환 시 페이드. */
  renderRight: (args: CountryDetailShellRenderArgs) => ReactNode
}

export function CountryDetailShell({ renderRight }: CountryDetailShellProps) {
  const navigate = useNavigate()
  const params = useParams<{ countryId?: string }>()
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

  // 페이지 타이틀 — 다중 탭 식별 향상. unmount/국가 변경 시 이전 타이틀 복원해
  // 다른 페이지로 떠날 때 이전 국가명이 잠깐 남아 있는 잔상 방지.
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

  const isLoading = !!selectedId && isCoreDataLoading && !selectedCountry

  const right = renderRight({
    selectedId,
    selectedCountry,
    continents,
    isLoading,
    notFound,
    initialDetailTab,
    handleDetailTabChange,
    onEdit: editFromDetail,
    onDelete: deleteFromDetail,
  })

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
            {right}
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
