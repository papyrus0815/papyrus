/**
 * /history/country[/:countryId/*] 의 공통 셸 — React Router의 layout route로 동작.
 *
 * - 모바일 UI와 상세용 폼 모달은 어떤 sub-route(events / detail / dashboard / ...)에서나 동일.
 * - 우측 콘텐츠는 `<Outlet context={...}/>`로 자식 라우트에 위임.
 * - **좌측 국가 목록은 여기 없다** — 레이아웃(ContentAreaShell → CountrySidebar)이 소유한다.
 *   지면을 옮겨도 사이드바가 재마운트되지 않게 하려면 페이지보다 위에 있어야 한다.
 *
 * Layout route 패턴 덕분에 events ↔ dashboard 같은 sub-route 전환 시 셸이 unmount되지 않음 →
 * `useContentCoreData`/`useCountryFormHandlers` 등 데이터·모달 state 보존, document.title 깜빡임 해소.
 *
 * 자식 라우트는 `useCountryDetailShellContext()`로 args를 받는다.
 */
import { useEffect, useMemo, useState } from 'react'

import { createGlobalStyle } from 'styled-components'
import {
  Outlet,
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
import { CountryMobileUI } from '@/widgets/country/country-mobile-ui/ui/country-mobile-ui'
import { HistoricalCountryFormModal } from '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'
import { useContentCoreData } from '@/widgets/content-shell'

import { useCountryDetailRouting } from './use-country-detail-routing.hook'
import { useCountryFormHandlers } from './use-country-form-handlers.hook'
import { useContentLocation } from './use-content-location.hook'
import type { CountryDetailTabKey } from '@/widgets/country/country-detail/ui/country-detail.widget'

/** 페이지 마운트 동안 전역 흰색 배경 + 배경 이미지 숨김 — DOM 직접 조작 대신 styled GlobalStyle. */
const CountryDetailPageGlobalStyle = createGlobalStyle`
  body { background-color: #ffffff; }
  #global-bg { display: none; }
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

  // 최근 방문 국가 캐시 (⌘K 팔레트용) — store가 dedup 처리.
  // 실존하는 국가만 push해 오타·삭제된 URL의 유령 id 영속을 막는다(F59).
  // (로딩 중 미존재 시엔 다음 렌더에서 countriesById 채워진 뒤 자연 보충)
  const pushRecentCountry = useRecentCountriesStore((store) => store.push)
  useEffect(() => {
    if (selectedId && countriesById.has(selectedId)) {
      pushRecentCountry(selectedId)
    }
  }, [selectedId, countriesById, pushRecentCountry])

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
      .filter((country) => country.type === 'modern')
      .map((country) => ({ id: country.id, name: country.name }))
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
      {/*
        sub-route 전환에 motion을 걸지 말 것.
        예전엔 `key={location.pathname}`인 AnimatePresence(mode="wait")로 감쌌는데, 그러면
        대시보드↔행정구역처럼 **같은 컴포넌트**로 가는 탭 전환에서도 우측이 통째로
        언마운트→재마운트된다. 실측 결과 탭바가 34프레임(≈0.55초) 동안 사라졌다가 다시
        그려졌다 — 사용자가 본 "메뉴 깜빡임"이 이것이다.

        전환 연출은 이미 CountryDetail 위젯 안에 제자리로 있다: 탭바(StickyTopBar)는 페이드
        밖에 두고 탭 패널만 TabSwapMotion으로 페이드하며, 국가 전환은 CountrySwapMotion이
        맡는다. 여기서 한 겹 더 덮을 이유가 없다.
      */}
      {/* sub-tab 위젯 일부가 거대(elections·cabinets 등) — 단일 throw가 페이지 전체를
          날리지 않도록 ErrorBoundary로 격리. */}
      <SmartErrorBoundary>
        <Outlet context={context} />
      </SmartErrorBoundary>

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
    </>
  )
}

