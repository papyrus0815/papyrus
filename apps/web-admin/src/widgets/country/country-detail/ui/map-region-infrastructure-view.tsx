/**
 * 지도 및 지역 — 인프라 전용 뷰
 *
 * 데이터 소스: GET /infrastructures?countryId=xxx
 * - 항목 클릭 시 지도가 좌표로 이동·핀 표시
 * - 검색 / 정렬 / 키보드 네비 / URL 동기화 지원
 */
import { useEffect, useMemo, useState } from 'react'

import { toast } from 'react-hot-toast'

import {
  type Infrastructure,
  type InfrastructureType,
  useDeleteInfrastructure,
  useInfrastructures,
} from '@/entities/country/api.infrastructure'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'

import {
  FilterPill,
  InfrastructureFormModal,
  ListEmptyState,
  ListToolbarRow,
  MapCard,
  MetaCard,
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

type InfraFilter = 'all' | InfrastructureType
type InfraSort = 'name' | 'length' | 'opened' | 'recent'

const FILTER_VALUES = ['all', 'highway', 'railway', 'airport', 'port'] as const
const SORT_VALUES = ['name', 'length', 'opened', 'recent'] as const

interface MapRegionInfrastructureViewProps {
  country: {
    id: string
    name: string
    latitude?: number | null
    longitude?: number | null
  }
}

const FILTERS: { value: InfraFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'highway', label: '고속도로' },
  { value: 'railway', label: '철도' },
  { value: 'airport', label: '공항' },
  { value: 'port', label: '항구' },
]

const SORT_OPTIONS = [
  { value: 'name' as const, label: '이름순' },
  { value: 'length' as const, label: '길이 긴 순' },
  { value: 'opened' as const, label: '개통 빠른 순' },
  { value: 'recent' as const, label: '최근 등록순' },
]

const TYPE_LABEL: Record<InfrastructureType, string> = {
  highway: '고속도로',
  railway: '철도',
  airport: '공항',
  port: '항구',
}

function buildSubtitle(item: Infrastructure): string {
  const parts: string[] = []
  if (item.code) parts.push(item.code)
  if (item.lengthKm != null) parts.push(`${item.lengthKm.toLocaleString()}km`)
  if (item.capacity) parts.push(item.capacity)
  if (item.openedYear != null) parts.push(`${item.openedYear}`)
  return parts.join(' · ')
}

export function MapRegionInfrastructureView({
  country,
}: MapRegionInfrastructureViewProps) {
  const palette = useRegionPalette()

  const url = useRegionUrlState<InfraFilter, InfraSort>({
    prefix: 'infra',
    filterValues: FILTER_VALUES,
    sortValues: SORT_VALUES,
    defaultFilter: 'all',
    defaultSort: 'name',
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Infrastructure | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Infrastructure | null>(
    null,
  )

  const { data: allInfra = [], isLoading } = useInfrastructures(country.id)
  const deleteMut = useDeleteInfrastructure()

  const filteredAndSorted = useMemo(() => {
    let list = allInfra
    if (url.filter !== 'all') list = list.filter((i) => i.type === url.filter)
    if (url.search.trim()) {
      const q = url.search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.localName ?? '').toLowerCase().includes(q) ||
          (i.code ?? '').toLowerCase().includes(q) ||
          (i.region ?? '').toLowerCase().includes(q),
      )
    }
    const sorted = [...list]
    if (url.sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    } else if (url.sort === 'length') {
      sorted.sort(
        (a, b) => Number(b.lengthKm ?? 0) - Number(a.lengthKm ?? 0),
      )
    } else if (url.sort === 'opened') {
      sorted.sort(
        (a, b) =>
          (a.openedYear ?? Number.MAX_SAFE_INTEGER) -
          (b.openedYear ?? Number.MAX_SAFE_INTEGER),
      )
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    return sorted
  }, [allInfra, url.filter, url.search, url.sort])

  const selectedItem = url.selectedId
    ? allInfra.find((i) => i.id === url.selectedId) ?? null
    : null

  useEffect(() => {
    if (url.selectedId && !allInfra.some((i) => i.id === url.selectedId)) {
      url.setSelectedId(null)
    }
  }, [allInfra, url])

  const countByType = useMemo(() => {
    const counts: Record<InfrastructureType, number> = {
      highway: 0,
      railway: 0,
      airport: 0,
      port: 0,
    }
    for (const i of allInfra) counts[i.type]++
    return counts
  }, [allInfra])

  const totalCount = allInfra.length

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

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (item: Infrastructure) => {
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
      toast.success('인프라 항목을 삭제했습니다')
      if (url.selectedId === pendingDelete.id) url.setSelectedId(null)
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const kpiStrip = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '10px 14px',
        background: palette.bgSecondary,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        fontSize: 13,
        color: palette.textSecondary,
        fontWeight: 500,
      }}
    >
      <span style={{ color: palette.text, fontWeight: 600 }}>현재 보기</span>
      <span>·</span>
      <span>고속도로 {countByType.highway}개</span>
      <span>철도 {countByType.railway}개</span>
      <span>공항 {countByType.airport}개</span>
      <span>항구 {countByType.port}개</span>
      <span
        style={{
          marginLeft: 'auto',
          color: palette.primary,
          fontWeight: 600,
        }}
      >
        총 {totalCount}개
      </span>
    </div>
  )

  const listContent = (() => {
    if (isLoading) {
      return <ListEmptyState palette={palette} message="불러오는 중..." />
    }
    if (allInfra.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 인프라 항목이 없습니다"
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
        : `${TYPE_LABEL[url.filter as InfrastructureType] ?? ''} 항목이 없습니다`
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
        ariaLabel="인프라"
        sectionLabel="인프라"
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
                    placeholder="이름·코드·지역으로 검색"
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
            emptyIcon="⚡"
            emptyTitle="인프라를 선택해주세요"
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
            {selectedItem?.code && (
              <MetaCard palette={palette} label="식별 코드" value={selectedItem.code} />
            )}
            {selectedItem?.region && (
              <MetaCard palette={palette} label="지역" value={selectedItem.region} />
            )}
            {selectedItem?.lengthKm != null && (
              <MetaCard
                palette={palette}
                label="길이"
                value={`${selectedItem.lengthKm.toLocaleString()}km`}
              />
            )}
            {selectedItem?.capacity && (
              <MetaCard
                palette={palette}
                label="이용량/처리능력"
                value={selectedItem.capacity}
              />
            )}
            {selectedItem?.operatorName && (
              <MetaCard
                palette={palette}
                label="운영"
                value={selectedItem.operatorName}
              />
            )}
            {selectedItem?.openedYear != null && (
              <MetaCard
                palette={palette}
                label="개통"
                value={`${selectedItem.openedYear}년`}
              />
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

      <InfrastructureFormModal
        isOpen={formOpen}
        countryId={country.id}
        editing={editing}
        defaultType={
          url.filter !== 'all' ? (url.filter as InfrastructureType) : 'highway'
        }
        onClose={closeForm}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="인프라 항목 삭제"
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
