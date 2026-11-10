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
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerBackground } from '@/entities/event/ui/ledger-tokens'
import { cityApi } from '@/shared/api/city'
import {
  type EventMapFeatureInput,
  type EventMapGeometryType,
  listEventMapFeatures,
  syncEventMapFeatures,
} from '@/shared/api/event-map-features'
import { eventKeys } from '@/shared/api/event-query-keys'
import { type EventOverviewNode } from '@/shared/api/event-overview'
import { updateEvent, type UpdateEventDto } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { metaText } from '@/pages/events/styles/theme'

import { LocationPickerModal } from '../detail/components/location-picker-modal'
import { extractPlaceFromEventTitle, placeQueryFromText } from '../detail/components/location-text.lib'
import { type OverviewGrouping } from './event-overview.lib'
import { type MapPin, type MapVectorFeature } from './overview-map-canvas'
import * as S from './overview.styles'

const OverviewMapCanvas = lazy(() => import('./overview-map-canvas'))

type PlaceCandidate = Awaited<ReturnType<typeof cityApi.searchPlaces>>[number]

/** OpenStreetMap 이용 정책 — 초당 1건 이하. 서버 프록시에 줄 세우는 장치가 없어 여기서 간격을 둔다 */
const SEARCH_INTERVAL_MS = 1100
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

/**
 * 찾을 말 — 위치 글의 첫 장소, 글이 없으면 제목의 지명('그라블로트-생프리바 전투' → '그라블로트-생프리바').
 * 보불전쟁 하위 13건 중 위치 글은 2건뿐이었고 나머지 전투는 제목이 곧 장소였다.
 */
function placeQueryOf(node: EventOverviewNode): { query: string; from: 'text' | 'title' } | null {
  const fromText = placeQueryFromText(node.location)
  if (fromText.length >= 2) return { query: fromText, from: 'text' }
  const fromTitle = extractPlaceFromEventTitle(node.title)
  return fromTitle ? { query: fromTitle, from: 'title' } : null
}

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

  const vectorFeatures = useMemo<MapVectorFeature[]>(() => {
    const allNodes = [root, ...ordered]
    const list: MapVectorFeature[] = []
    for (const node of allNodes) {
      if (visibleIds !== null && node.id !== root.id && !visibleIds.has(node.id)) continue
      for (const feat of node.mapFeatures ?? []) {
        list.push({
          id: feat.id,
          eventId: feat.eventId,
          geometryType: feat.geometryType,
          title: feat.title,
          description: feat.description,
          color: feat.color ?? (node.id === root.id ? '#dc2626' : colorOf(node.id)),
          sideName: feat.sideName,
          deployedUnitName: feat.deployedUnitName,
          coordinates: feat.coordinates,
        })
      }
    }
    return list
  }, [root, ordered, visibleIds, grouping, groupIndex])

  const [vectorEditorOpen, setVectorEditorOpen] = useState(false)
  const [vectorSaving, setVectorSaving] = useState(false)
  const [vectorType, setVectorType] = useState<EventMapGeometryType>('ARROW')
  const [vectorTitle, setVectorTitle] = useState('')
  const [vectorSideId, setVectorSideId] = useState('')
  const [vectorUnitId, setVectorUnitId] = useState('')
  const [vectorColor, setVectorColor] = useState('#dc2626')
  const [vectorCoordsText, setVectorCoordsText] = useState('')
  const [vectorDesc, setVectorDesc] = useState('')

  const parseCoordsInput = (rawText: string): Array<[number, number]> => {
    return rawText
      .split(/[;\n]+/)
      .map((pairStr) => pairStr.trim())
      .filter(Boolean)
      .map((pairStr) => {
        const parts = pairStr.split(/[,\s]+/).map((token) => Number(token.trim()))
        if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
          return [parts[0], parts[1]] as [number, number]
        }
        return null
      })
      .filter((coord): coord is [number, number] => coord !== null)
  }

  const draftCoords = useMemo(() => parseCoordsInput(vectorCoordsText), [vectorCoordsText])

  const draftFeature = useMemo<MapVectorFeature | null>(() => {
    if (!vectorEditorOpen || draftCoords.length === 0) return null
    return {
      id: '__draft__',
      eventId: rootId,
      geometryType: vectorType,
      title: vectorTitle.trim() || '작성 중인 도형 미리보기',
      description: vectorDesc.trim() || null,
      color: vectorColor || '#dc2626',
      sideName: null,
      deployedUnitName: null,
      coordinates: draftCoords,
    }
  }, [vectorEditorOpen, draftCoords, rootId, vectorType, vectorTitle, vectorDesc, vectorColor])

  const handleMapClickForVector = (lat: number, lng: number) => {
    const formattedPoint = `${lat.toFixed(4)},${lng.toFixed(4)}`
    setVectorCoordsText((prevText) => {
      const trimmed = prevText.trim()
      return trimmed ? `${trimmed}; ${formattedPoint}` : formattedPoint
    })
  }

  const handleUndoLastVectorPoint = () => {
    const nextCoords = draftCoords.slice(0, -1)
    setVectorCoordsText(nextCoords.map((pt) => `${pt[0].toFixed(4)},${pt[1].toFixed(4)}`).join('; '))
  }

  const handleAddVectorFeature = async () => {
    const coords = parseCoordsInput(vectorCoordsText)
    const minPts = vectorType === 'POLYGON' ? 3 : vectorType === 'POINT' ? 1 : 2
    if (!vectorTitle.trim()) {
      notify.error('지리 도형 이름을 입력해 주세요 (예: 중부집단군 민스크-스몰렌스크 진격로)')
      return
    }
    if (coords.length < minPts) {
      notify.error(`최소 ${minPts}개의 위도,경도 좌표 쌍을 입력해 주세요 (예: 52.23,21.01; 53.90,27.56)`)
      return
    }
    setVectorSaving(true)
    try {
      const currentRootFeatures = await listEventMapFeatures(rootId)
      const nextInputs: EventMapFeatureInput[] = [
        ...currentRootFeatures.map((existing) => ({
          geometryType: existing.geometryType,
          title: existing.title,
          description: existing.description,
          color: existing.color,
          sideId: existing.sideId,
          deployedUnitId: existing.deployedUnitId,
          coordinates: existing.coordinates,
          sortOrder: existing.sortOrder,
        })),
        {
          geometryType: vectorType,
          title: vectorTitle.trim(),
          description: vectorDesc.trim() || null,
          color: vectorColor || null,
          sideId: vectorSideId || null,
          deployedUnitId: vectorUnitId || null,
          coordinates: coords,
          sortOrder: currentRootFeatures.length,
        },
      ]
      await syncEventMapFeatures(rootId, nextInputs)
      await queryClient.invalidateQueries({ queryKey: eventKeys.overview(rootId) })
      setVectorTitle('')
      setVectorCoordsText('')
      setVectorDesc('')
      notify.success('전선·진격로·포위망 도형을 추가했습니다')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '도형 저장에 실패했습니다')
    } finally {
      setVectorSaving(false)
    }
  }

  const handleRemoveVectorFeature = async (targetEventId: string, featureId: string) => {
    setVectorSaving(true)
    try {
      const currentFeatures = await listEventMapFeatures(targetEventId)
      const remaining = currentFeatures
        .filter((item) => item.id !== featureId)
        .map((existing, idx) => ({
          geometryType: existing.geometryType,
          title: existing.title,
          description: existing.description,
          color: existing.color,
          sideId: existing.sideId,
          deployedUnitId: existing.deployedUnitId,
          coordinates: existing.coordinates,
          sortOrder: idx,
        }))
      await syncEventMapFeatures(targetEventId, remaining)
      await queryClient.invalidateQueries({ queryKey: eventKeys.overview(rootId) })
      notify.success('지도 도형을 삭제했습니다')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '도형 삭제에 실패했습니다')
    } finally {
      setVectorSaving(false)
    }
  }

  const unpinned = ordered.filter((node) => node.locationLatitude == null || node.locationLongitude == null)
  const withText = unpinned.filter((node) => node.location?.trim())
  const withoutText = unpinned.filter((node) => !node.location?.trim())
  /** 좌표 후보를 찾을 수 있는 하위 — 위치 글이 있거나 제목에 지명이 있는 것 */
  const searchable = unpinned.filter((node) => placeQueryOf(node) !== null)
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

  /**
   * 위치 글 → 좌표 후보 일괄 — 글만 있고 핀이 없는 하위(실측 608건 중 94건)를 하나씩 '지도에 찍기'로 여는 대신,
   * 글의 첫 장소(위치 모달의 미리 검색과 같은 규칙)로 OpenStreetMap 후보를 한 번에 찾아 행마다 보인다.
   * **자동 저장은 없다** — 행의 '이 자리로'나 '후보 모두 꽂기'(확인 후)로만 저장한다. 위치 글은 그대로 둔다.
   */
  const [candidates, setCandidates] = useState<
    ReadonlyMap<string, { place: PlaceCandidate; from: 'text' | 'title' } | null>
  >(() => new Map())
  const [searching, setSearching] = useState<{ done: number; total: number } | null>(null)
  const searchRun = useRef(0)
  useEffect(
    () => () => {
      searchRun.current += 1
    },
    [],
  )
  const findCandidates = async () => {
    const run = ++searchRun.current
    const targets = searchable.filter((node) => !candidates.has(node.id))
    setSearching({ done: 0, total: targets.length })
    for (const [index, node] of targets.entries()) {
      if (searchRun.current !== run) return
      const target = placeQueryOf(node)!
      const results = await cityApi.searchPlaces(target.query, undefined, { anyPlace: true })
      if (searchRun.current !== run) return
      setCandidates((previous) =>
        new Map(previous).set(node.id, results[0] ? { place: results[0], from: target.from } : null),
      )
      setSearching({ done: index + 1, total: targets.length })
      if (index < targets.length - 1) await wait(SEARCH_INTERVAL_MS)
    }
    setSearching(null)
  }
  const pinValue = (candidate: PlaceCandidate): UpdateEventDto =>
    ({ locationLatitude: candidate.lat, locationLongitude: candidate.lng }) as UpdateEventDto
  const acceptAll = async () => {
    const ready = unpinned.filter((node) => candidates.get(node.id))
    const ok = await confirm({
      title: `후보 ${ready.length}곳을 모두 꽂을까요?`,
      message:
        '후보는 위치 글의 첫 장소(글이 없으면 제목의 지명)를 검색한 첫 결과라 틀릴 수 있습니다(같은 이름의 다른 곳). 꽂은 뒤 지도에서 보고 각 사건의 위치에서 고칠 수 있습니다. 위치 글은 바뀌지 않습니다.',
      confirmLabel: '모두 꽂기',
    })
    if (!ok) return
    let saved = 0
    for (const node of ready) {
      try {
        await updateEvent(node.id, pinValue(candidates.get(node.id)!.place))
        invalidateEventQueries(queryClient, { eventId: node.id })
        saved += 1
      } catch {
        /* 하나 실패해도 나머지는 꽂는다 — 끝에 건수로 알린다 */
      }
    }
    await queryClient.invalidateQueries({ queryKey: eventKeys.overview(rootId) })
    if (saved === ready.length) notify.success(`${saved}곳에 핀을 꽂았습니다`)
    else notify.error(`${ready.length}곳 중 ${saved}곳만 꽂았습니다`)
  }
  const readyCount = unpinned.filter((node) => candidates.get(node.id)).length

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
      {candidates.has(node.id) && (
        <Candidate>
          {candidates.get(node.id) ? (
            <>
              <span title={candidates.get(node.id)!.place.displayName}>
                {candidates.get(node.id)!.from === 'title' ? '제목에서 찾은 후보' : '후보'} ·{' '}
                {candidates.get(node.id)!.place.shortName}
                {candidates.get(node.id)!.place.country && ` (${candidates.get(node.id)!.place.country})`}
              </span>
              <S.TextButton type="button" onClick={() => void savePin(node, pinValue(candidates.get(node.id)!.place))}>
                이 자리로
              </S.TextButton>
            </>
          ) : (
            <span className="none">후보 없음 — '지도에 찍기'로 직접</span>
          )}
        </Candidate>
      )}
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
        {pins.length > 0 || vectorFeatures.length > 0 || vectorEditorOpen ? (
          <Suspense fallback={<MapLoading style={{ height: 460 }}>지도를 싣는 중…</MapLoading>}>
            <OverviewMapCanvas
              pins={pins}
              features={vectorFeatures}
              draftFeature={draftFeature}
              onMapClick={vectorEditorOpen ? handleMapClickForVector : null}
              route={route}
              hotId={hotId}
              onOpen={onOpen}
              onHover={onHover}
              height={460}
            />
          </Suspense>
        ) : (
          <MapEmpty>
            <FiMapPin aria-hidden />
            <strong>아직 지도에 꽂힌 하위 사건이나 작전 도형이 없습니다</strong>
            <span>옆 목록에서 '지도에 찍기'로 꽂거나 아래 '전선·진격로·포위망 도형 관리'에서 추가하세요.</span>
          </MapEmpty>
        )}

        {unpinned.length > 0 && (
          <UnpinnedList aria-label="아직 핀 없는 하위 사건">
            {searchable.length > 0 && (
              <CandidateBar>
                <HeadActions>
                  {searching ? (
                    <span>
                      후보 찾는 중 {searching.done}/{searching.total}
                    </span>
                  ) : (
                    searchable.some((node) => !candidates.has(node.id)) && (
                      <S.TextButton
                        type="button"
                        onClick={() => void findCandidates()}
                        title="위치 글의 첫 장소(글이 없으면 제목의 지명)로 OpenStreetMap에서 찾는다 — 저장은 확인 후"
                      >
                        좌표 후보 찾기 ({searchable.filter((node) => !candidates.has(node.id)).length}건)
                      </S.TextButton>
                    )
                  )}
                  {!searching && readyCount > 0 && (
                    <S.TextButton type="button" onClick={() => void acceptAll()}>
                      후보 {readyCount}곳 모두 꽂기
                    </S.TextButton>
                  )}
                </HeadActions>
              </CandidateBar>
            )}
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

      <VectorSection>
        <VectorToggleRow>
          <S.TextButton
            type="button"
            onClick={() => setVectorEditorOpen((prev) => !prev)}
          >
            🗺️ 전선 · 진격로 화살표 · 포위망 폴리곤 관리 ({vectorFeatures.length}건) {vectorEditorOpen ? '▴' : '▾'}
          </S.TextButton>
        </VectorToggleRow>

        {vectorEditorOpen && (
          <VectorEditorBody>
            {vectorFeatures.length > 0 && (
              <VectorChipList>
                {vectorFeatures.map((feat) => (
                  <VectorChip key={feat.id} $color={feat.color}>
                    <span>
                      {feat.geometryType === 'ARROW'
                        ? '➔'
                        : feat.geometryType === 'POLYGON'
                          ? '🕸️'
                          : feat.geometryType === 'LINE'
                            ? '➖'
                            : '📍'}{' '}
                      <strong>{feat.title}</strong>
                      {feat.sideName && ` · ${feat.sideName}`}
                      {feat.deployedUnitName && ` · ⚔️ ${feat.deployedUnitName}`}
                    </span>
                    <VectorRemoveBtn
                      type="button"
                      disabled={vectorSaving}
                      onClick={() => void handleRemoveVectorFeature(feat.eventId, feat.id)}
                    >
                      ✕
                    </VectorRemoveBtn>
                  </VectorChip>
                ))}
              </VectorChipList>
            )}

            <VectorFormRow>
              <VectorSelect
                value={vectorType}
                onChange={(changeEvent) => setVectorType(changeEvent.target.value as EventMapGeometryType)}
                aria-label="도형 종류"
              >
                <option value="ARROW">➔ 진격로·기동축 화살표 (ARROW)</option>
                <option value="POLYGON">🕸️ 포위망·점령권역 폴리곤 (POLYGON)</option>
                <option value="LINE">➖ 전선·방어선·목표선 (LINE)</option>
              </VectorSelect>

              <VectorInput
                type="text"
                placeholder="도형 이름 (예: 중부집단군 제2·3기갑집단 민스크-스몰렌스크 진격로)"
                value={vectorTitle}
                onChange={(changeEvent) => setVectorTitle(changeEvent.target.value)}
              />

              {(root.sides ?? []).length > 0 && (
                <VectorSelect
                  value={vectorSideId}
                  onChange={(changeEvent) => {
                    const nextSideId = changeEvent.target.value
                    setVectorSideId(nextSideId)
                    setVectorUnitId('')
                    const matchedSide = (root.sides ?? []).find((side) => side.id === nextSideId)
                    if (matchedSide?.color) setVectorColor(matchedSide.color)
                  }}
                  aria-label="소속 진영"
                >
                  <option value="">진영 선택 (선택)</option>
                  {(root.sides ?? []).map((side) => (
                    <option key={side.id} value={side.id}>
                      {side.name}
                    </option>
                  ))}
                </VectorSelect>
              )}

              {vectorSideId && (
                <VectorSelect
                  value={vectorUnitId}
                  onChange={(changeEvent) => setVectorUnitId(changeEvent.target.value)}
                  aria-label="기동 부대"
                >
                  <option value="">부대 선택 (선택)</option>
                  {((root.sides ?? []).find((side) => side.id === vectorSideId)?.deployedUnits ?? []).map(
                    (unitItem) => (
                      <option key={unitItem.id} value={unitItem.id}>
                        ⚔️ {unitItem.name}
                      </option>
                    ),
                  )}
                </VectorSelect>
              )}

              <VectorInput
                type="color"
                value={vectorColor}
                onChange={(changeEvent) => setVectorColor(changeEvent.target.value)}
                style={{ flex: '0 0 42px', padding: 2, height: 30 }}
                aria-label="도형 색상"
              />
            </VectorFormRow>

            <VectorFormRow>
              <VectorInput
                type="text"
                placeholder="위 지도를 클릭해 좌표를 찍거나 직접 입력 (세미콜론 구분 — 예: 52.23,21.01; 53.90,27.56)"
                value={vectorCoordsText}
                onChange={(changeEvent) => setVectorCoordsText(changeEvent.target.value)}
                style={{ flex: '2 1 320px' }}
              />
              {draftCoords.length > 0 && (
                <>
                  <S.TextButton type="button" onClick={handleUndoLastVectorPoint}>
                    마지막 점 지우기 ({draftCoords.length}점)
                  </S.TextButton>
                  <S.TextButton type="button" onClick={() => setVectorCoordsText('')}>
                    초기화
                  </S.TextButton>
                </>
              )}
              <VectorInput
                type="text"
                placeholder="설명 (선택 — 예: 60만 포위 섬멸)"
                value={vectorDesc}
                onChange={(changeEvent) => setVectorDesc(changeEvent.target.value)}
              />
              <VectorSubmitBtn
                type="button"
                disabled={vectorSaving}
                onClick={() => void handleAddVectorFeature()}
              >
                도형 추가
              </VectorSubmitBtn>
            </VectorFormRow>
          </VectorEditorBody>
        )}
      </VectorSection>

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

/** 후보 줄 — 행 아래 둘째 줄, 제목 열부터 */
const Candidate = styled.div`
  grid-column: 2 / -1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};

  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .none {
    color: ${metaText};
  }
`

const HeadActions = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};
`

/** 후보 찾기 줄 — 목록 맨 위(위치 글·제목 지명 모두 대상) */
const CandidateBar = styled.div`
  padding: 6px 0 2px;
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

const VectorSection = styled.div`
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
`

const VectorToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const VectorEditorBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`

const VectorChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const VectorChip = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  border-left: 3px solid ${({ $color }) => $color};
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 11.5px;
`

const VectorRemoveBtn = styled.button`
  border: none;
  background: transparent;
  color: ${metaText};
  cursor: pointer;
  font-size: 11px;
`

const VectorFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const VectorSelect = styled.select`
  flex: 1 1 160px;
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const VectorInput = styled.input`
  flex: 1 1 200px;
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const VectorSubmitBtn = styled.button`
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.text.primary};
  color: ${({ theme }) => theme.colors.background.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`
