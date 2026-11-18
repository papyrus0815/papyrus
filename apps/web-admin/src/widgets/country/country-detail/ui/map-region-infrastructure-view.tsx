/**
 * 지도 및 지역 — 인프라 전용 뷰
 *
 * 구성:
 *  1) 2열 Event-Ledger 벤토 인포그래픽 (기간시설 유형 분포·총 연장 / 주요 노선·거점 Top 5)
 *  2) 좌우 병렬 아틀라스 데스크: 좌측 원장 목록 + 우측(다중 핀 지도 + 상세/총람 패널)
 */
import { useEffect, useMemo, useState } from 'react'

import { FiEdit2, FiTrash2, FiZap } from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import {
  type Infrastructure,
  type InfrastructureType,
  useDeleteInfrastructure,
  useInfrastructures,
} from '@/entities/country/api.infrastructure'
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
  { value: 'length' as const, label: '연장 길이순' },
  { value: 'opened' as const, label: '개통 연도순' },
  { value: 'recent' as const, label: '최근 등록순' },
]

const TYPE_LABEL: Record<InfrastructureType, string> = {
  highway: '고속도로',
  railway: '철도',
  airport: '공항',
  port: '항구',
}

function getTypeBadge(
  type: InfrastructureType,
  isDark: boolean,
): { label: string; color: string; bg: string } {
  switch (type) {
    case 'highway':
      return isDark
        ? { label: '고속도로', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)' }
        : { label: '고속도로', color: '#b45309', bg: 'rgba(217, 119, 6, 0.1)' }
    case 'railway':
      return isDark
        ? { label: '철도', color: '#a5b4fc', bg: 'rgba(165, 180, 252, 0.16)' }
        : { label: '철도', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.1)' }
    case 'airport':
      return isDark
        ? { label: '공항', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' }
        : { label: '공항', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' }
    case 'port':
      return isDark
        ? { label: '항구', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.14)' }
        : { label: '항구', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' }
  }
}

function buildSubtitle(item: Infrastructure): string {
  const parts: string[] = []
  if (item.code) parts.push(item.code)
  if (item.lengthKm != null)
    parts.push(`${Number(item.lengthKm).toLocaleString('ko-KR')}km`)
  if (item.capacity) parts.push(item.capacity)
  if (item.openedYear != null) parts.push(`${item.openedYear}년 개통`)
  return parts.join(' · ')
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

export function MapRegionInfrastructureView({
  country,
}: MapRegionInfrastructureViewProps) {
  const palette = useRegionPalette()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

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

  const infographic = useMemo(() => {
    const counts: Record<InfrastructureType, number> = {
      highway: 0,
      railway: 0,
      airport: 0,
      port: 0,
    }
    let totalLengthKm = 0
    let pinnedCount = 0
    for (const i of allInfra) {
      counts[i.type]++
      if (i.lengthKm != null) totalLengthKm += Number(i.lengthKm)
      if (i.latitude != null && i.longitude != null) pinnedCount++
    }

    const typeSlices: SegmentSlice[] = [
      {
        key: 'highway',
        label: '고속도로',
        value: counts.highway,
        color: isDark ? '#fbbf24' : '#d97706',
      },
      {
        key: 'railway',
        label: '철도',
        value: counts.railway,
        color: isDark ? '#a5b4fc' : '#4f46e5',
      },
      {
        key: 'airport',
        label: '공항',
        value: counts.airport,
        color: isDark ? '#38bdf8' : '#0284c7',
      },
      {
        key: 'port',
        label: '항구',
        value: counts.port,
        color: isDark ? '#2dd4bf' : '#0d9488',
      },
    ].filter((s) => s.value > 0)

    const pool =
      url.filter !== 'all'
        ? allInfra.filter((i) => i.type === url.filter)
        : allInfra
    const ranked = [...pool]
      .sort(
        (a, b) =>
          Number(b.lengthKm ?? 0) - Number(a.lengthKm ?? 0) ||
          (a.openedYear ?? 9999) - (b.openedYear ?? 9999) ||
          a.name.localeCompare(b.name, 'ko'),
      )
      .slice(0, 5)
    const maxLen = ranked.length > 0 ? Number(ranked[0]!.lengthKm ?? 0) : 0

    return {
      counts,
      totalLengthKm: Math.round(totalLengthKm),
      pinnedCount,
      typeSlices,
      ranked,
      maxLen,
    }
  }, [allInfra, isDark, url.filter])

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
        .filter((i) => i.latitude != null && i.longitude != null)
        .map((i) => ({
          id: i.id,
          latitude: Number(i.latitude),
          longitude: Number(i.longitude),
          name: i.name,
        })),
    [filteredAndSorted],
  )

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
      notify.success('인프라 항목을 삭제했습니다')
      if (url.selectedId === pendingDelete.id) url.setSelectedId(null)
      setPendingDelete(null)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    }
  }

  const bentoSummary =
    !isLoading && allInfra.length > 0 ? (
      <BentoGrid2Col aria-label="국가 기간시설 인포그래픽 요약">
        <BentoCard>
          <BentoCardHeader>
            <BentoCardTitleGroup>
              <BentoCardTitle>국가 기간시설 유형 구성</BentoCardTitle>
              <BentoCardBadge>
                총 {allInfra.length.toLocaleString('ko-KR')}곳
              </BentoCardBadge>
            </BentoCardTitleGroup>
          </BentoCardHeader>
          <BentoCardBody>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <MiniDonutRing
                slices={infographic.typeSlices}
                size={70}
                strokeWidth={8.5}
                centerValue={allInfra.length.toLocaleString('ko-KR')}
                centerLabel="시설"
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
                            active ? 'all' : (s.key as InfraFilter),
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
                  {infographic.totalLengthKm > 0
                    ? ` · 총 연장 ${infographic.totalLengthKm.toLocaleString('ko-KR')}km`
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
                  ? '주요 기간망 · 거점 Top 5'
                  : `주요 ${TYPE_LABEL[url.filter]} Top 5`}
              </BentoCardTitle>
              <BentoCardBadge>
                {infographic.maxLen > 0 ? '연장 기준' : '개통 · 거점'}
              </BentoCardBadge>
            </BentoCardTitleGroup>
          </BentoCardHeader>
          <BentoCardBody>
            <RankRows>
              {infographic.ranked.map((item, idx) => {
                const len = Number(item.lengthKm ?? 0)
                const pct =
                  infographic.maxLen > 0 && len > 0
                    ? Math.max(8, (len / infographic.maxLen) * 100)
                    : 32
                const badge = getTypeBadge(item.type, isDark)
                const metaStr =
                  len > 0
                    ? `${len.toLocaleString('ko-KR')}km`
                    : item.code ||
                      (item.openedYear != null
                        ? `${item.openedYear}년`
                        : item.capacity || TYPE_LABEL[item.type])
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
                          opacity: len > 0 ? 1 : 0.45,
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
                      {metaStr}
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
    if (allInfra.length === 0) {
      return (
        <ListEmptyState
          palette={palette}
          message="등록된 인프라 항목이 없습니다"
          action={
            <RegisterButton
              palette={palette}
              onClick={openCreate}
              label="첫 시설 등록"
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
            {country.name} 기간시설 총람 ({filteredAndSorted.length}곳)
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
            const len =
              item.lengthKm != null
                ? `${Number(item.lengthKm).toLocaleString('ko-KR')}km`
                : null
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
                  {item.code && <span>{item.code}</span>}
                  {len && (
                    <span style={{ color: palette.primary, fontWeight: 700 }}>
                      {len}
                    </span>
                  )}
                  {item.openedYear != null && (
                    <span>{item.openedYear}년</span>
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
        ariaLabel="인프라"
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
                    placeholder="이름 · 코드 · 지역 검색"
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
              emptyIcon={<FiZap size={20} />}
              emptyTitle="등록된 기간시설이 없습니다"
              emptyDescription="고속도로·철도·공항·항만 데이터를 추가하면 지도와 연동해 탐색할 수 있습니다"
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
              {selectedItem?.code && (
                <MetaCard
                  palette={palette}
                  label="식별 코드"
                  value={selectedItem.code}
                />
              )}
              {selectedItem?.region && (
                <MetaCard
                  palette={palette}
                  label="소재 지역"
                  value={selectedItem.region}
                />
              )}
              {selectedItem?.lengthKm != null && (
                <MetaCard
                  palette={palette}
                  label="노선 연장"
                  value={`${Number(selectedItem.lengthKm).toLocaleString('ko-KR')}km`}
                />
              )}
              {selectedItem?.capacity && (
                <MetaCard
                  palette={palette}
                  label="처리 용량"
                  value={selectedItem.capacity}
                />
              )}
              {selectedItem?.operatorName && (
                <MetaCard
                  palette={palette}
                  label="운영 기관"
                  value={selectedItem.operatorName}
                />
              )}
              {selectedItem?.openedYear != null && (
                <MetaCard
                  palette={palette}
                  label="개통 연도"
                  value={`${selectedItem.openedYear}년`}
                />
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
    </div>
  )
}
