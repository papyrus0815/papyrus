/**
 * Events Ledger Page — "렌즈 & 장부" 컨셉
 *
 * 사이드바 없음. 위에서부터: lens chips → pivot tabs → ledger.
 * 우하단에 떠있는 ⌘K hint.
 *
 * Lens 칩이 곧 *지금 보고 있는 맥락*이고, 피벗은 *그 맥락을 어떤 축으로 정리할지*.
 * 두 개념은 직교한다.
 */
import React, { useEffect, useRef } from 'react'

import toast from 'react-hot-toast'

import { CommandPalette } from './components/command-palette'
import { EmptyState } from './components/empty-state'
import { FloatingSearchHint } from './components/floating-search-hint'
import { LensBar } from './components/lens-bar'
import { PivotTabs } from './components/pivot-tabs'
import { CategoryPivot } from './components/pivots/category-pivot'
import { CountryPivot } from './components/pivots/country-pivot'
import { PersonPivot } from './components/pivots/person-pivot'
import { QualityPivot } from './components/pivots/quality-pivot'
import { TimePivot } from './components/pivots/time-pivot'
import { useLedgerData } from './hooks/use-ledger-data'
import { PIVOT, useLedgerState } from './hooks/use-ledger-state'
import {
  FloatingHintWrap,
  LedgerScroller,
  LedgerSlot,
  LensSlot,
  Page,
  PivotSlot,
} from './styles/ledger.styles'

export interface EventsLedgerPageProps {
  countryId?: string | null
}

export const EventsLedgerPage: React.FC<EventsLedgerPageProps> = ({
  countryId,
}) => {
  const {
    lens,
    addLens,
    removeLens,
    clearLens,
    pivot,
    setPivot,
    expandedEventId,
    setExpandedEventId,
    toggleExpand,
    paletteOpen,
    setPaletteOpen,
  } = useLedgerState()

  const {
    events,
    isLoading,
    isFetchingNextPage,
    hasMore,
    fetchMoreEvents,
    isError,
    dbCategories,
    countries,
    historicalCountries,
    resolveChipLabel,
  } = useLedgerData(countryId, lens)

  /**
   * 인라인 확장 사건이 lens 변경(서버 재요청)으로 결과에서 사라지면 닫고
   * 토스트로 안내한다. "직전 events에는 있었는데 지금은 사라졌다"를 판별하기
   * 위해 이전 events id 셋을 ref에 저장. ref 갱신은 *체크 이후*에 해야 정확.
   */
  const prevEventIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (isLoading || isFetchingNextPage) {
      prevEventIdsRef.current = new Set(events.map((evt) => evt.id))
      return
    }
    if (expandedEventId && events.length > 0) {
      const inCurrent = events.some((evt) => evt.id === expandedEventId)
      const wasKnown = prevEventIdsRef.current.has(expandedEventId)
      if (!inCurrent && wasKnown) {
        setExpandedEventId(null)
        toast('현재 렌즈 조건에서 해당 사건이 보이지 않아 닫았어요.', {
          icon: 'ℹ️',
          duration: 3000,
        })
      }
    }
    prevEventIdsRef.current = new Set(events.map((evt) => evt.id))
  }, [events, expandedEventId, isLoading, isFetchingNextPage, setExpandedEventId])

  const showLoading = isLoading && events.length === 0
  const showError = isError && events.length === 0
  const showEmptyEvents = !isLoading && !isError && events.length === 0

  const scrollerRef = useRef<HTMLDivElement | null>(null)

  return (
    <Page>
      <LensSlot>
        <LensBar
          lens={lens}
          events={events}
          dbCategories={dbCategories}
          countries={countries}
          historicalCountries={historicalCountries}
          onAdd={addLens}
          onRemove={removeLens}
          onClear={clearLens}
          resolveLabel={resolveChipLabel}
          totalCount={events.length}
          filteredCount={events.length}
        />
      </LensSlot>

      <PivotSlot>
        <PivotTabs pivot={pivot} setPivot={setPivot} />
      </PivotSlot>

      <LedgerSlot>
        <LedgerScroller ref={scrollerRef}>
          {showError ? (
            <EmptyState
              variant="error"
              title="데이터를 불러오지 못했습니다"
              hint="잠시 뒤 다시 시도해 주세요. 문제가 계속되면 새로고침을 눌러 보세요."
            />
          ) : showLoading ? (
            <EmptyState
              title="사건을 불러오는 중…"
              hint="잠시만 기다려 주세요."
            />
          ) : showEmptyEvents ? (
            <EmptyState
              title="등록된 사건이 없습니다"
              hint="아직 데이터가 비어 있어요."
            />
          ) : (
            <>
              {pivot === PIVOT.TIME && (
                <TimePivot
                  events={events}
                  expandedEventId={expandedEventId}
                  onToggleExpand={toggleExpand}
                  onSelectChild={(id) => setExpandedEventId(id)}
                  scrollerRef={scrollerRef}
                  hasMore={hasMore}
                  isFetchingMore={isFetchingNextPage}
                  onLoadMore={fetchMoreEvents}
                />
              )}
              {pivot === PIVOT.COUNTRY && (
                <CountryPivot
                  events={events}
                  onSelectEvent={(id) => {
                    setPivot(PIVOT.TIME)
                    setExpandedEventId(id)
                  }}
                  onAddCountryLens={(kind, value, label) =>
                    addLens({ kind, value, label })
                  }
                />
              )}
              {pivot === PIVOT.CATEGORY && (
                <CategoryPivot
                  events={events}
                  onSelectEvent={(id) => {
                    setPivot(PIVOT.TIME)
                    setExpandedEventId(id)
                  }}
                  onAddCategoryLens={(categoryId, categoryName) =>
                    addLens({
                      kind: 'category',
                      value: categoryId,
                      label: categoryName,
                    })
                  }
                />
              )}
              {pivot === PIVOT.PERSON && (
                <PersonPivot
                  events={events}
                  onSelectEvent={(id) => {
                    setPivot(PIVOT.TIME)
                    setExpandedEventId(id)
                  }}
                />
              )}
              {pivot === PIVOT.QUALITY && (
                <QualityPivot
                  events={events}
                  onSelectEvent={(id) => {
                    setPivot(PIVOT.TIME)
                    setExpandedEventId(id)
                  }}
                />
              )}
            </>
          )}
        </LedgerScroller>

        <FloatingHintWrap>
          <FloatingSearchHint onClick={() => setPaletteOpen(true)} />
        </FloatingHintWrap>
      </LedgerSlot>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        events={events}
        dbCategories={dbCategories}
        onSelectEvent={(id) => {
          setExpandedEventId(id)
          setPaletteOpen(false)
          setPivot(PIVOT.TIME)
        }}
        onAddLens={(chip) => {
          addLens(chip)
          setPaletteOpen(false)
        }}
      />
    </Page>
  )
}

export default EventsLedgerPage
