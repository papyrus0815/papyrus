/**
 * 조망 › 지도 — '어디서'. 하위 사건 전부의 핀을 한 지도에.
 *
 * 왜: 최상위 사건(프랑스 혁명)은 자기 위치가 없고, 상세 장부의 지도는 그 사건 하나만 본다. 하위 93건 중 8건에
 * 핀을 꽂아도 루트에선 하나도 보이지 않았다.
 *
 * - 번호 = 전개(간트)와 같은 번호, 테두리 색 = 묶음 색(간트 묶음 띠와 같은 색). 묶음 밖·여섯째 묶음부터는 회색.
 * - 같은 자리 여럿은 한 핀 'N건'(canvas가 묶는다).
 * - 거르기(묶음·나라·세부·시기)는 흐리기로 따른다 — 다른 탭과 같은 규칙.
 * - 옆 목록 '아직 핀 없는 하위' — 행마다 '지도에 찍기'(상세와 같은 위치 모달). 지도를 채우는 작업대.
 */
import { Suspense, lazy, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerBackground } from '@/entities/event/ui/ledger-tokens'
import { eventKeys } from '@/shared/api/event-query-keys'
import { type EventOverviewNode } from '@/shared/api/event-overview'
import { updateEvent, type UpdateEventDto } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { notify } from '@/shared/ui/toast'
import { metaText } from '@/pages/events/styles/theme'

import { LocationPickerModal } from '../detail/components/location-picker-modal'
import { type OverviewGrouping } from './event-overview.lib'
import { type MapPin } from './overview-map-canvas'
import * as S from './overview.styles'

const OverviewMapCanvas = lazy(() => import('./overview-map-canvas'))

/**
 * 지도 위 묶음 색 — 지도 바탕(OSM)은 테마와 무관하게 밝아서 늘 밝은 쪽 단계를 쓴다. 간트 묶음 팔레트의 앞 다섯
 * (검증: 밝은 바탕 명도·채도·색각 분리 통과). 여섯째부터와 묶음 밖은 '그 밖' 회색 — 새 색을 만들지 않는다.
 */
const MAP_GROUP_COLORS = ['#0d9488', '#d97706', '#db2777', '#4f46e5', '#65a30d'] as const
const MAP_OTHER_COLOR = '#64748b'

interface MapPanelProps {
  rootId: string
  root: EventOverviewNode
  /** 전개 순서의 하위 전부 */
  ordered: ReadonlyArray<EventOverviewNode>
  numberById: Map<string, string>
  dateLabelById: Map<string, string>
  grouping: OverviewGrouping
  visibleIds: Set<string> | null
  hotId: string | null
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
}

export function MapPanel({
  rootId,
  root,
  ordered,
  numberById,
  dateLabelById,
  grouping,
  visibleIds,
  hotId,
  onHover,
  onOpen,
}: MapPanelProps) {
  const queryClient = useQueryClient()
  const [route, setRoute] = useState(false)
  const [pinning, setPinning] = useState<EventOverviewNode | null>(null)

  const groupIndex = useMemo(() => new Map(grouping.groups.map((group) => [group.id, group.index])), [grouping])
  const colorOf = (id: string) => {
    const groupId = grouping.groupIdOf.get(id)
    const index = groupId !== undefined ? groupIndex.get(groupId) : undefined
    return index !== undefined && index < MAP_GROUP_COLORS.length ? MAP_GROUP_COLORS[index] : MAP_OTHER_COLOR
  }

  const pins = useMemo<MapPin[]>(() => {
    const list: MapPin[] = []
    const push = (node: EventOverviewNode, number: string) => {
      if (node.locationLatitude == null || node.locationLongitude == null) return
      list.push({
        id: node.id,
        number,
        title: node.title,
        dateLabel: dateLabelById.get(node.id) ?? null,
        lat: node.locationLatitude,
        lng: node.locationLongitude,
        color: node.id === root.id ? '#0f172a' : colorOf(node.id),
        dimmed: visibleIds !== null && node.id !== root.id && !visibleIds.has(node.id),
      })
    }
    push(root, '★')
    for (const node of ordered) push(node, numberById.get(node.id) ?? '·')
    return list
    // colorOf는 grouping·groupIndex에서 나온다
  }, [root, ordered, numberById, dateLabelById, visibleIds, grouping, groupIndex])

  const unpinned = ordered.filter((node) => node.locationLatitude == null || node.locationLongitude == null)
  const withText = unpinned.filter((node) => node.location?.trim())
  const withoutText = unpinned.filter((node) => !node.location?.trim())
  const legendGroups = grouping.groups.filter((group) =>
    pins.some((pin) => grouping.groupIdOf.get(pin.id) === group.id),
  )
  const hasOther = pins.some((pin) => pin.id !== root.id && pin.color === MAP_OTHER_COLOR)

  const savePin = async (node: EventOverviewNode, value: UpdateEventDto) => {
    try {
      await updateEvent(node.id, value)
      invalidateEventQueries(queryClient, { eventId: node.id })
      await queryClient.invalidateQueries({ queryKey: eventKeys.overview(rootId) })
      notify.success(`'${node.title}'에 핀을 꽂았습니다`)
    } catch {
      notify.error('위치를 저장하지 못했습니다')
    }
  }

  const unpinnedRow = (node: EventOverviewNode) => (
    <UnpinnedRow key={node.id} data-dim={visibleIds !== null && !visibleIds.has(node.id) ? '' : undefined}>
      <span className="number">{numberById.get(node.id)}</span>
      <button type="button" className="title" onClick={() => onOpen(node.id)} title={node.title}>
        {node.title}
        {node.location?.trim() && <span className="place">{node.location}</span>}
      </button>
      <S.TextButton type="button" onClick={() => setPinning(node)}>
        지도에 찍기
      </S.TextButton>
    </UnpinnedRow>
  )

  return (
    <S.Panel $wide id="overview-map" aria-labelledby="overview-map-title">
      <S.PanelHead>
        <S.PanelTitle id="overview-map-title">지도</S.PanelTitle>
        {pins.length >= 2 && (
          <S.ViewSwitch role="group" aria-label="핀 잇기">
            <S.ViewSwitchItem type="button" $active={!route} aria-pressed={!route} onClick={() => setRoute(false)}>
              핀만
            </S.ViewSwitchItem>
            <S.ViewSwitchItem type="button" $active={route} aria-pressed={route} onClick={() => setRoute(true)}>
              시간 순으로 잇기
            </S.ViewSwitchItem>
          </S.ViewSwitch>
        )}
        <S.PanelNote style={{ flexBasis: '100%' }}>
          핀 {pins.length}곳 · 번호 = 전개 번호 · 한 자리에 여럿이면 'N건'(누르면 목록)
          {unpinned.length > 0 && ` · 아직 핀 없는 하위 ${unpinned.length}건`}
        </S.PanelNote>
        {(legendGroups.length > 0 || hasOther) && (
          <Legend aria-label="핀 테두리 색 — 묶음">
            {legendGroups.map((group) => (
              <li key={group.id}>
                <Ring style={{ borderColor: colorOf(group.id) }} aria-hidden />
                {group.title}
              </li>
            ))}
            {hasOther && (
              <li>
                <Ring style={{ borderColor: MAP_OTHER_COLOR }} aria-hidden />
                {legendGroups.length > 0 ? '그 밖' : '하위 사건'}
              </li>
            )}
          </Legend>
        )}
      </S.PanelHead>

      <Layout $withList={unpinned.length > 0}>
        {pins.length > 0 ? (
          <Suspense fallback={<MapLoading style={{ height: 460 }}>지도를 싣는 중…</MapLoading>}>
            <OverviewMapCanvas pins={pins} route={route} hotId={hotId} onOpen={onOpen} onHover={onHover} height={460} />
          </Suspense>
        ) : (
          <MapEmpty>
            <FiMapPin aria-hidden />
            <strong>아직 지도에 꽂힌 하위 사건이 없습니다</strong>
            <span>옆 목록에서 '지도에 찍기'로 하나씩 꽂으면 여기에 모입니다.</span>
          </MapEmpty>
        )}

        {unpinned.length > 0 && (
          <UnpinnedList aria-label="아직 핀 없는 하위 사건">
            {withText.length > 0 && (
              <>
                <UnpinnedHead>위치 글만 있음 {withText.length}</UnpinnedHead>
                {withText.map(unpinnedRow)}
              </>
            )}
            {withoutText.length > 0 && (
              <>
                <UnpinnedHead>위치 없음 {withoutText.length}</UnpinnedHead>
                {withoutText.map(unpinnedRow)}
              </>
            )}
          </UnpinnedList>
        )}
      </Layout>

      {pinning && (
        <LocationPickerModal
          isOpen
          onClose={() => setPinning(null)}
          initial={{
            location: pinning.location,
            latitude: pinning.locationLatitude,
            longitude: pinning.locationLongitude,
            note: pinning.locationNote,
          }}
          onSave={(value) => {
            const node = pinning
            setPinning(null)
            void savePin(node, value as UpdateEventDto)
          }}
        />
      )}
    </S.Panel>
  )
}

const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

const Ring = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 3px solid;
  border-radius: 50%;
  background: #fff;
  box-sizing: border-box;
`

const Layout = styled.div<{ $withList: boolean }>`
  display: grid;
  grid-template-columns: ${({ $withList }) => ($withList ? 'minmax(0, 1fr) minmax(240px, 320px)' : 'minmax(0, 1fr)')};
  gap: 16px;
  align-items: start;

  @container overviewpanel (max-width: 759px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const MapLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 13px;
  color: ${metaText};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)')};
`

const MapEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 220px;
  padding: 24px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  text-align: center;
  font-size: 13px;
  color: ${metaText};

  svg {
    width: 22px;
    height: 22px;
  }
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const UnpinnedList = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 460px;
  overflow-y: auto;
  scrollbar-width: thin;
`

const UnpinnedHead = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const UnpinnedRow = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 6px;
  padding: 5px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 12.5px;

  &[data-dim] {
    opacity: 0.45;
  }

  .number {
    font-variant-numeric: tabular-nums;
    color: ${metaText};
  }
  .title {
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    text-align: left;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }
  .place {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11.5px;
    color: ${metaText};
  }
`
