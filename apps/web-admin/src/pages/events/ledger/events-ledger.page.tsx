/**
 * Events Ledger Page — "렌즈 & 장부" 컨셉
 *
 * 사이드바 없음. 위에서부터: lens chips → pivot tabs → ledger.
 * 우하단에 떠있는 ⌘K hint.
 *
 * Lens 칩이 곧 *지금 보고 있는 맥락*이고, 피벗은 *그 맥락을 어떤 축으로 정리할지*.
 * 두 개념은 직교한다.
 */
import React, { useEffect, useMemo, useRef } from 'react'

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
import { useFilteredEvents } from './hooks/use-filtered-events'
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
    events,
    isLoading,
    isError,
    dbCategories,
    countries,
    historicalCountries,
    resolveChipLabel,
  } = useLedgerData(countryId)

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

  const filtered = useFilteredEvents(events, lens)
  const visibleCount = useMemo(() => filtered.length, [filtered])

  /**
   * 인라인 확장 사건이 현재 lens로 인해 사라지면 닫고 토스트로 안내.
   * 사용자가 "방금 클릭한 사건이 왜 사라졌지?"라고 느끼지 않게 한다.
   * 첫 마운트(events 미적재) 단계에서는 토스트가 잘못 뜨지 않도록 가드.
   */
  useEffect(() => {
    if (!expandedEventId) return
    if (events.length === 0) return
    if (!filtered.some((evt) => evt.id === expandedEventId)) {
      const closed = events.find((evt) => evt.id === expandedEventId)
      setExpandedEventId(null)
      toast(
        closed
          ? `현재 렌즈 조건에서 "${closed.title}" 사건이 보이지 않아 닫았어요.`
          : '확장된 사건이 현재 결과에 없어 닫았어요.',
        { icon: 'ℹ️', duration: 3000 },
      )
    }
  }, [events, filtered, expandedEventId, setExpandedEventId])

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
          filteredCount={visibleCount}
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
                  events={filtered}
                  expandedEventId={expandedEventId}
                  onToggleExpand={toggleExpand}
                  onSelectChild={(id) => setExpandedEventId(id)}
                  scrollerRef={scrollerRef}
                />
              )}
              {pivot === PIVOT.COUNTRY && (
                <CountryPivot
                  events={filtered}
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
                  events={filtered}
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
                  events={filtered}
                  onSelectEvent={(id) => {
                    setPivot(PIVOT.TIME)
                    setExpandedEventId(id)
                  }}
                />
              )}
              {pivot === PIVOT.QUALITY && (
                <QualityPivot
                  events={filtered}
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
