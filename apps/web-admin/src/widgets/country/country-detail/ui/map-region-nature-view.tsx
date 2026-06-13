/**
 * 지도 및 지역 — 자연지리 전용 뷰
 *
 * 데이터 소스: GET /natural-features?countryId=xxx
 * - 항목 클릭 시 지도가 좌표로 이동·핀 표시
 * - 검색 / 정렬 / 키보드 네비 / URL 동기화 지원
 */
import { useEffect, useMemo, useState } from 'react'

import {
  type NaturalFeature,
  type NaturalFeatureType,
  useDeleteNaturalFeature,
  useNaturalFeatures,
} from '@/entities/country/api.natural-feature'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  FilterPill,
  KpiChip,
  KpiStrip,
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
  { value: 'metric' as const, label: '규모순 (고도·길이·면적 큰 순)' },
  { value: 'recent' as const, label: '최근 등록순' },
]

const TYPE_LABEL: Record<NaturalFeatureType, string> = {
  mountain: '산',
  river: '강',
  lake: '호수',
  coast: '해안',
}

const TYPE_BADGE: Record<
  NaturalFeatureType,
  { label: string; color: string; bg: string }
> = {
  mountain: { label: '산', color: '#15803d', bg: '#dcfce7' },
  river: { label: '강', color: '#1d4ed8', bg: '#dbeafe' },
  lake: { label: '호수', color: '#0e7490', bg: '#cffafe' },
  coast: { label: '해안', color: '#92400e', bg: '#fef3c7' },
}

const EMPTY_ICON_BY_TYPE: Record<NaturalFeatureType, string> = {
  mountain: '🏔️',
  river: '🏞️',
  lake: '🏞️',
  coast: '🏖️',
}

function buildSubtitle(item: NaturalFeature): string {
  const parts: string[] = []
  if (item.region) parts.push(item.region)
  if (item.heightM != null) parts.push(`${item.heightM.toLocaleString()}m`)
  if (item.lengthKm != null) parts.push(`${item.lengthKm.toLocaleString()}km`)
  if (item.areaSqKm != null) parts.push(`${item.areaSqKm.toLocaleString()}km²`)
  if (item.isProtected) parts.push('보호구역')
  return parts.join(' · ')
}

function metricOf(item: NaturalFeature): number {
  // 산은 고도, 강·해안은 길이, 호수는 면적 — 비교 가능한 단일 숫자
  if (item.type === 'mountain') return item.heightM ?? 0
  if (item.type === 'lake') return Number(item.areaSqKm ?? 0)
  return Number(item.lengthKm ?? 0)
}

export function MapRegionNatureView({ country }: MapRegionNatureViewProps) {
  const palette = useRegionPalette()

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

  // 선택된 항목이 더이상 표시 영역에 없으면 선택 해제 (삭제 등)
  useEffect(() => {
    if (url.selectedId && !allFeatures.some((f) => f.id === url.selectedId)) {
      url.setSelectedId(null)
    }
  }, [allFeatures, url])

  const countByType = useMemo(() => {
    const counts: Record<NaturalFeatureType, number> = {
      mountain: 0,
      river: 0,
      lake: 0,
      coast: 0,
    }
    for (const f of allFeatures) counts[f.type]++
    return counts
  }, [allFeatures])

  const totalCount = allFeatures.length

  // 키보드 네비
  useListKeyboard({
    items: filteredAndSorted,
    selectedId: url.selectedId,
    onSelect: url.setSelectedId,
    enabled: !formOpen && !pendingDelete,
  })

  // 지도에 선택된 항목의 좌표를 표시
  const mapLocation = useMemo(() => {
    if (
      selectedItem?.latitude != null &&
      selectedItem?.longitude != null
    ) {
      return {
        latitude: Number(selectedItem.latitude),
        longitude: Number(selectedItem.longitude),
        name: selectedItem.name,
      }
    }
    return null
  }, [selectedItem])

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

  const kpiStrip = (
    <KpiStrip palette={palette} totalCount={totalCount}>
      <KpiChip
        palette={palette}
        filterValue="mountain"
        currentFilter={url.filter}
        onFilterChange={url.setFilter}
        label="산"
        count={countByType.mountain}
      />
      <KpiChip
        palette={palette}
        filterValue="river"
        currentFilter={url.filter}
        onFilterChange={url.setFilter}
        label="강"
        count={countByType.river}
      />
      <KpiChip
        palette={palette}
        filterValue="lake"
        currentFilter={url.filter}
        onFilterChange={url.setFilter}
        label="호수"
        count={countByType.lake}
      />
      <KpiChip
        palette={palette}
        filterValue="coast"
        currentFilter={url.filter}
        onFilterChange={url.setFilter}
        label="해안"
        count={countByType.coast}
      />
    </KpiStrip>
  )

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
              label="첫 항목 등록"
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
        typeBadge={url.filter === 'all' ? TYPE_BADGE[item.type] : null}
        onEdit={() => openEdit(item)}
        onDelete={() => setPendingDelete(item)}
      />
    ))
  })()

  return (
    <>
      <MapCard
        palette={palette}
        country={country}
        mapLocation={mapLocation}
        zoom={{ withLocation: 11, withoutLocation: 7 }}
      />

      <RegionSplitLayout
        ariaLabel="자연지리"
        sectionLabel="자연지리"
        kpiStrip={kpiStrip}
        minHeight={400}
        left={
          <RegionListPanel
            palette={palette}
            maxHeight={1120}
            minHeight={400}
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
                    placeholder="이름·현지어·지역으로 검색"
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
          <RegionDetailPanel
            palette={palette}
            isSelected={!!selectedItem}
            emptyIcon={
              url.filter !== 'all'
                ? EMPTY_ICON_BY_TYPE[url.filter as NaturalFeatureType]
                : '🏔️'
            }
            emptyTitle="자연 지형을 선택해주세요"
            emptyDescription="좌측 목록에서 항목을 선택하면 지도가 해당 위치로 이동합니다 (↑↓ Esc)"
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
                />
              ) : null
            }
          >
            {selectedItem?.region && (
              <MetaCard palette={palette} label="지역" value={selectedItem.region} />
            )}
            {selectedItem?.heightM != null && (
              <MetaCard
                palette={palette}
                label="고도"
                value={`${selectedItem.heightM.toLocaleString()}m`}
              />
            )}
            {selectedItem?.lengthKm != null && (
              <MetaCard
                palette={palette}
                label="길이"
                value={`${selectedItem.lengthKm.toLocaleString()}km`}
              />
            )}
            {selectedItem?.areaSqKm != null && (
              <MetaCard
                palette={palette}
                label="면적"
                value={`${selectedItem.areaSqKm.toLocaleString()}km²`}
              />
            )}
            {selectedItem?.isProtected && (
              <MetaCard palette={palette} label="구분" value="보호구역" />
            )}
            {selectedItem?.latitude != null && selectedItem?.longitude != null && (
              <MetaCard
                palette={palette}
                label="좌표"
                value={`${selectedItem.latitude.toFixed(4)}, ${selectedItem.longitude.toFixed(4)}`}
              />
            )}
          </RegionDetailPanel>
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
    </>
  )
}
