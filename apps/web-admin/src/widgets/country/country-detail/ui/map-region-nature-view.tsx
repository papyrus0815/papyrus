/**
 * 지도 및 지역 — 자연지리 전용 뷰
 *
 * 구성:
 *  1) 2열 Event-Ledger 벤토 인포그래픽 (지형 유형 분포·보호구역 / 주요 자연 지형 규모 Top 5)
 *  2) 좌우 병렬 아틀라스 데스크: 좌측 원장 목록 + 우측(다중 핀 지도 + 상세/총람 패널)
 */
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import {
  FiCompass,
  FiDroplet,
  FiEdit2,
  FiLayers,
  FiMapPin,
  FiTrash2,
} from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import {
  type NaturalFeature,
  type NaturalFeatureType,
  useDeleteNaturalFeature,
  useNaturalFeatures,
} from '@/entities/country/api.natural-feature'
import {
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoGrid2Col,
  MiniDonutRing,
  type SegmentSlice,
  StackedSegmentBar,
} from '@/entities/event/ui/bento-primitives'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  FilterPill,
  ListEmptyState,
  ListToolbarRow,
  MapCard,
  MetaCard,
  NaturalFeatureFormModal,
  PillToolbar,
  RegionDetailHeader,
  RegionDetailPanel,
  RegionListItem,
  RegionListPanel,
  RegionSplitLayout,
  RegisterButton,
  SearchInput,
  SortSelect,
  useListKeyboard,
  useRegionPalette,
  useRegionUrlState,
} from './map-region'

type NatureFilter = 'all' | NaturalFeatureType
type NatureSort = 'name' | 'metric' | 'recent'

const FILTER_VALUES = ['all', 'mountain', 'river', 'lake', 'coast'] as const
const SORT_VALUES = ['name', 'metric', 'recent'] as const

interface MapRegionNatureViewProps {
  country: {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
  }
}

const FILTERS: { value: NatureFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'mountain', label: '산' },
  { value: 'river', label: '강' },
  { value: 'lake', label: '호수' },
  { value: 'coast', label: '해안' },
]

const SORT_OPTIONS = [
  { value: 'name' as const, label: '이름순' },
  { value: 'metric' as const, label: '규모순 (고도·길이·면적)' },
  { value: 'recent' as const, label: '최근 등록순' },
]

const TYPE_LABEL: Record<NaturalFeatureType, string> = {
  mountain: '산',
  river: '강',
  lake: '호수',
  coast: '해안',
}

function getTypeBadge(
  type: NaturalFeatureType,
  isDark: boolean,
): { label: string; color: string; bg: string } {
  switch (type) {
    case 'mountain':
      return isDark
        ? { label: '산', color: '#34d399', bg: 'rgba(52, 211, 153, 0.14)' }
        : { label: '산', color: '#047857', bg: 'rgba(5, 150, 105, 0.1)' }
    case 'river':
      return isDark
        ? { label: '강', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.14)' }
        : { label: '강', color: '#1d4ed8', bg: 'rgba(37, 99, 235, 0.1)' }
    case 'lake':
      return isDark
        ? { label: '호수', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' }
        : { label: '호수', color: '#0369a1', bg: 'rgba(2, 132, 199, 0.1)' }
    case 'coast':
      return isDark
        ? { label: '해안', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)' }
        : { label: '해안', color: '#b45309', bg: 'rgba(217, 119, 6, 0.1)' }
  }
}

const EMPTY_ICON_BY_TYPE: Record<NaturalFeatureType, ReactNode> = {
  mountain: <FiCompass size={20} />,
  river: <FiDroplet size={20} />,
  lake: <FiLayers size={20} />,
  coast: <FiMapPin size={20} />,
}

function formatMetricLabel(item: NaturalFeature): string | null {
  if (item.heightM != null) return `${item.heightM.toLocaleString('ko-KR')}m`
  if (item.lengthKm != null)
    return `${Number(item.lengthKm).toLocaleString('ko-KR')}km`
  if (item.areaSqKm != null)
    return `${Number(item.areaSqKm).toLocaleString('ko-KR')}km²`
  return null
}

function buildSubtitle(item: NaturalFeature): string {
  const parts: string[] = []
  if (item.region) parts.push(item.region)
  const metric = formatMetricLabel(item)
  if (metric) parts.push(metric)
  if (item.isProtected) parts.push('보호구역')
  return parts.join(' · ')
}

function metricOf(item: NaturalFeature): number {
  if (item.type === 'mountain') return item.heightM ?? 0
  if (item.type === 'lake') return Number(item.areaSqKm ?? 0)
  return Number(item.lengthKm ?? 0)
}

const LegendWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
`

const LegendBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  margin: -1px -4px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : 'transparent'};
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  font-size: 11.5px;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const Dot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const RankRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RankRowBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  display: grid;
  grid-template-columns: 20px auto minmax(76px, 128px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 3px 6px;
  margin: 0 -6px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const RankTrack = styled.div`
  width: 100%;
  height: 7px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const RankFill = styled.div`
  height: 100%;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
`

export function MapRegionNatureView({ country }: MapRegionNatureViewProps) {
  const palette = useRegionPalette()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const url = useRegionUrlState<NatureFilter, NatureSort>({
    prefix: 'nature',
    filterValues: FILTER_VALUES,
    sortValues: SORT_VALUES,
    defaultFilter: 'all',
    defaultSort: 'name',
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NaturalFeature | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NaturalFeature | null>(
    null,
  )

  const { data: allFeatures = [], isLoading } = useNaturalFeatures(country.id)
  const deleteMut = useDeleteNaturalFeature()

  const filteredAndSorted = useMemo(() => {
    let list = allFeatures
    if (url.filter !== 'all') list = list.filter((f) => f.type === url.filter)
    if (url.search.trim()) {
      const q = url.search.trim().toLowerCase()
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.localName ?? '').toLowerCase().includes(q) ||
          (f.region ?? '').toLowerCase().includes(q),
      )
    }
    const sorted = [...list]
    if (url.sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    } else if (url.sort === 'metric') {
      sorted.sort((a, b) => metricOf(b) - metricOf(a))
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    return sorted
  }, [allFeatures, url.filter, url.search, url.sort])

  const selectedItem = url.selectedId
    ? allFeatures.find((f) => f.id === url.selectedId) ?? null
    : null

  useEffect(() => {
    if (url.selectedId && !allFeatures.some((f) => f.id === url.selectedId)) {
      url.setSelectedId(null)
    }
  }, [allFeatures, url])

  const infographic = useMemo(() => {
    const counts: Record<NaturalFeatureType, number> = {
      mountain: 0,
      river: 0,
      lake: 0,
      coast: 0,
    }
    let protectedCount = 0
    let pinnedCount = 0
    for (const f of allFeatures) {
      counts[f.type]++
      if (f.isProtected) protectedCount++
      if (f.latitude != null && f.longitude != null) pinnedCount++
    }

    const typeSlices: SegmentSlice[] = [
      {
        key: 'mountain',
        label: '산',
        value: counts.mountain,
        color: isDark ? '#34d399' : '#059669',
      },
      {
        key: 'river',
        label: '강',
        value: counts.river,
        color: isDark ? '#60a5fa' : '#2563eb',
      },
      {
        key: 'lake',
        label: '호수',
        value: counts.lake,
        color: isDark ? '#38bdf8' : '#0284c7',
      },
      {
        key: 'coast',
        label: '해안',
        value: counts.coast,
        color: isDark ? '#fbbf24' : '#d97706',
      },
    ].filter((s) => s.value > 0)

    // Top 5 (필터가 특정 유형이면 해당 유형, 전체면 규모가 가장 많이 입력된 유형 우선)
    const pool =
      url.filter !== 'all'
        ? allFeatures.filter((f) => f.type === url.filter)
        : allFeatures
    const ranked = [...pool]
      .sort((a, b) => metricOf(b) - metricOf(a) || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 5)
    const maxVal = ranked.length > 0 ? metricOf(ranked[0]!) : 0

    return {
      counts,
      protectedCount,
      pinnedCount,
      typeSlices,
      ranked,
      maxVal,
    }
  }, [allFeatures, isDark, url.filter])

  useListKeyboard({
    items: filteredAndSorted,
    selectedId: url.selectedId,
    onSelect: url.setSelectedId,
    enabled: !formOpen && !pendingDelete,
  })

  const mapLocation = useMemo(() => {
    if (selectedItem?.latitude != null && selectedItem?.longitude != null) {
      return {
        latitude: Number(selectedItem.latitude),
        longitude: Number(selectedItem.longitude),
        name: selectedItem.name,
      }
    }
    return null
  }, [selectedItem])

  const mapMarkers = useMemo(
    () =>
      filteredAndSorted
        .filter((f) => f.latitude != null && f.longitude != null)
        .map((f) => ({
          id: f.id,
          latitude: Number(f.latitude),
          longitude: Number(f.longitude),
          name: f.name,
        })),
    [filteredAndSorted],
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (item: NaturalFeature) => {
    setEditing(item)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMut.mutateAsync(pendingDelete.id)
      notify.success('자연 지리 항목을 삭제했습니다')
      if (url.selectedId === pendingDelete.id) url.setSelectedId(null)
      setPendingDelete(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const bentoSummary =
    !isLoading && allFeatures.length > 0 ? (
      <BentoGrid2Col aria-label="자연지리 인포그래픽 요약">
        <BentoCard>
          <BentoCardHeader>
            <BentoCardTitleGroup>
              <BentoCardTitle>자연 지형 유형 구성</BentoCardTitle>
              <BentoCardBadge>
                총 {allFeatures.length.toLocaleString('ko-KR')}곳
              </BentoCardBadge>
            </BentoCardTitleGroup>
          </BentoCardHeader>
          <BentoCardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <MiniDonutRing
                slices={infographic.typeSlices}
                size={70}
                strokeWidth={8.5}
                centerValue={allFeatures.length.toLocaleString('ko-KR')}
                centerLabel="지형"
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <StackedSegmentBar
                  slices={infographic.typeSlices}
                  height={9}
                  showPercent
                />
                <LegendWrap>
                  {infographic.typeSlices.map((s) => {
                    const active = url.filter === s.key
                    return (
                      <LegendBtn
                        key={s.key}
                        type="button"
                        $active={active}
                        onClick={() =>
                          url.setFilter(
                            active ? 'all' : (s.key as NatureFilter),
                          )
                        }
                      >
                        <Dot $color={s.color} />
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </LegendBtn>
                    )
                  })}
                </LegendWrap>
                <div
                  style={{
                    fontSize: 11,
                    color: palette.textSecondary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  좌표 핀 {infographic.pinnedCount}곳
                  {infographic.protectedCount > 0
                    ? ` · 보호구역 ${infographic.protectedCount}곳`
                    : ''}
                </div>
              </div>
            </div>
          </BentoCardBody>
        </BentoCard>

        <BentoCard>
          <BentoCardHeader>
            <BentoCardTitleGroup>
              <BentoCardTitle>
                {url.filter === 'all'
                  ? '주요 자연 지형 규모 Top 5'
                  : `주요 ${TYPE_LABEL[url.filter]} 규모 Top 5`}
              </BentoCardTitle>
              <BentoCardBadge>
                {url.filter === 'all'
                  ? '고도 · 연장 · 면적'
                  : TYPE_LABEL[url.filter]}
              </BentoCardBadge>
            </BentoCardTitleGroup>
          </BentoCardHeader>
          <BentoCardBody>
            <RankRows>
              {infographic.ranked.map((item, idx) => {
                const val = metricOf(item)
                const pct =
                  infographic.maxVal > 0 && val > 0
                    ? Math.max(8, (val / infographic.maxVal) * 100)
                    : 24
                const badge = getTypeBadge(item.type, isDark)
                const metricStr = formatMetricLabel(item) ?? (item.region || TYPE_LABEL[item.type])
                return (
                  <RankRowBtn
                    key={item.id}
                    type="button"
                    $active={url.selectedId === item.id}
                    onClick={() => url.setSelectedId(item.id)}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: palette.textSecondary,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: badge.color,
                        background: badge.bg,
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: palette.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <RankTrack>
                      <RankFill
                        style={{
                          width: `${pct}%`,
                          opacity: val > 0 ? 1 : 0.4,
                        }}
                      />
                    </RankTrack>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: palette.textSecondary,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {metricStr}
                    </span>
                  </RankRowBtn>
                )
              })}
            </RankRows>
          </BentoCardBody>
        </BentoCard>
      </BentoGrid2Col>
    ) : null

  const listContent = (() => {
    if (isLoading) {
      return <ListEmptyState palette={palette} message="불러오는 중..." />
    }
    if (allFeatures.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 자연 지리 항목이 없습니다"
          action={
            <RegisterButton
              palette={palette}
              onClick={openCreate}
              label="첫 지형 등록"
            />
          }
        />
      )
    }
    if (filteredAndSorted.length === 0) {
      const message = url.search.trim()
        ? `"${url.search}" 검색 결과가 없습니다`
        : `${TYPE_LABEL[url.filter as NaturalFeatureType] ?? ''} 항목이 없습니다`
      return (
        <ListEmptyState
          palette={palette}
          message={message}
          action={
            !url.search.trim() ? (
              <RegisterButton palette={palette} onClick={openCreate} />
            ) : undefined
          }
        />
      )
    }
    return filteredAndSorted.map((item) => (
      <RegionListItem
        key={item.id}
        palette={palette}
        selected={url.selectedId === item.id}
        onSelect={() => url.setSelectedId(item.id)}
        title={item.name}
        subtitle={buildSubtitle(item) || TYPE_LABEL[item.type]}
        hasCoords={item.latitude != null && item.longitude != null}
        typeBadge={url.filter === 'all' ? getTypeBadge(item.type, isDark) : null}
        onEdit={() => openEdit(item)}
        onDelete={() => setPendingDelete(item)}
      />
    ))
  })()

  const unselectedOverview =
    filteredAndSorted.length > 0 ? (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 10,
            marginBottom: 12,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>
            {country.name} 자연 지형 총람 ({filteredAndSorted.length}곳)
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
            gap: 8,
          }}
        >
          {filteredAndSorted.slice(0, 20).map((item) => {
            const badge = getTypeBadge(item.type, isDark)
            const metric = formatMetricLabel(item)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => url.setSelectedId(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 5,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: `1px solid ${palette.border}`,
                  background: palette.bgSecondary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: palette.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: badge.color,
                      background: badge.bg,
                      padding: '1px 6px',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: palette.textSecondary,
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  {item.region && <span>{item.region}</span>}
                  {metric && (
                    <span style={{ color: palette.primary, fontWeight: 700 }}>
                      {metric}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    ) : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bentoSummary}

      <RegionSplitLayout
        ariaLabel="자연지리"
        minHeight={400}
        left={
          <RegionListPanel
            palette={palette}
            toolbar={
              <>
                <ListToolbarRow
                  palette={palette}
                  rightSlot={
                    <RegisterButton palette={palette} onClick={openCreate} />
                  }
                >
                  <SearchInput
                    palette={palette}
                    value={url.search}
                    onChange={url.setSearch}
                    placeholder="이름 · 현지어 · 지역 검색"
                  />
                  <SortSelect
                    palette={palette}
                    value={url.sort}
                    options={SORT_OPTIONS}
                    onChange={url.setSort}
                  />
                </ListToolbarRow>
                <PillToolbar palette={palette}>
                  {FILTERS.map((f) => (
                    <FilterPill
                      key={f.value}
                      palette={palette}
                      active={url.filter === f.value}
                      onClick={() => url.setFilter(f.value)}
                    >
                      {f.label}
                    </FilterPill>
                  ))}
                </PillToolbar>
              </>
            }
          >
            {listContent}
          </RegionListPanel>
        }
        right={
          <>
            <MapCard
              palette={palette}
              country={country}
              mapLocation={mapLocation}
              markers={mapMarkers}
              selectedMarkerId={url.selectedId}
              selectedDivisionName={selectedItem?.name ?? null}
              onMarkerClick={(id) => url.setSelectedId(id)}
              zoom={{ withLocation: 10, withoutLocation: 6 }}
            />

            <RegionDetailPanel
              palette={palette}
              isSelected={!!selectedItem}
              empty={unselectedOverview}
              emptyIcon={
                url.filter !== 'all' ? (
                  EMPTY_ICON_BY_TYPE[url.filter as NaturalFeatureType]
                ) : (
                  <FiCompass size={20} />
                )
              }
              emptyTitle="등록된 자연 지형이 없습니다"
              emptyDescription="산맥·하천·호수·해안 데이터를 추가하면 지도와 연동해 탐색할 수 있습니다"
              header={
                selectedItem ? (
                  <RegionDetailHeader
                    palette={palette}
                    title={selectedItem.name}
                    subtitle={
                      selectedItem.localName
                        ? `${TYPE_LABEL[selectedItem.type]} · ${selectedItem.localName}`
                        : TYPE_LABEL[selectedItem.type]
                    }
                    rightSlot={
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => openEdit(selectedItem)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 28,
                            padding: '0 9px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: `1px solid ${palette.border}`,
                            background: 'transparent',
                            color: palette.text,
                            cursor: 'pointer',
                          }}
                        >
                          <FiEdit2 size={12} /> 수정
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(selectedItem)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 28,
                            padding: '0 9px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: `1px solid ${palette.border}`,
                            background: 'transparent',
                            color: palette.textSecondary,
                            cursor: 'pointer',
                          }}
                        >
                          <FiTrash2 size={12} /> 삭제
                        </button>
                      </div>
                    }
                  />
                ) : null
              }
            >
              {selectedItem?.region && (
                <MetaCard
                  palette={palette}
                  label="소재 지역"
                  value={selectedItem.region}
                />
              )}
              {selectedItem?.heightM != null && (
                <MetaCard
                  palette={palette}
                  label="해발 고도"
                  value={`${selectedItem.heightM.toLocaleString('ko-KR')}m`}
                />
              )}
              {selectedItem?.lengthKm != null && (
                <MetaCard
                  palette={palette}
                  label="연장 길이"
                  value={`${Number(selectedItem.lengthKm).toLocaleString('ko-KR')}km`}
                />
              )}
              {selectedItem?.areaSqKm != null && (
                <MetaCard
                  palette={palette}
                  label="유역·수면 면적"
                  value={`${Number(selectedItem.areaSqKm).toLocaleString('ko-KR')}km²`}
                />
              )}
              {selectedItem?.isProtected && (
                <MetaCard palette={palette} label="보전 지정" value="보호구역" />
              )}
              {selectedItem?.latitude != null &&
                selectedItem?.longitude != null && (
                  <MetaCard
                    palette={palette}
                    label="중심 좌표"
                    value={`${selectedItem.latitude.toFixed(4)}°, ${selectedItem.longitude.toFixed(4)}°`}
                  />
                )}
            </RegionDetailPanel>
          </>
        }
      />

      <NaturalFeatureFormModal
        isOpen={formOpen}
        countryId={country.id}
        editing={editing}
        defaultType={
          url.filter !== 'all' ? (url.filter as NaturalFeatureType) : 'mountain'
        }
        onClose={closeForm}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="자연 지리 항목 삭제"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
