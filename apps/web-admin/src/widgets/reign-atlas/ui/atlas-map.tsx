/**
 * 수장 지도 — 역사국가 좌표 위에 그해 수장 핀, 나라 사이에 교전(붉은 행진 점선)·동맹(푸른 점선) 곡선.
 *
 * - 핀은 0×0 divIcon 안의 라벨을 가운데 정렬해 띄운다(라벨 폭이 이름마다 달라 iconSize를 못 박는다).
 * - 선택된 나라가 있으면 그 나라의 교전·동맹 상대만 테두리 강조, 나머지 핀·선은 흐리게.
 * - 화면 맞춤은 처음 데이터가 왔을 때 한 번만 — 연도를 넘길 때마다 지도가 튀면 비교가 안 된다.
 * - 멀리서 보면(줌 ≤ COMPACT_MAX_ZOOM) 핀을 한 줄 이름표로 줄인다 — 유럽처럼 촘촘한 곳에서
 *   카드형 핀이 서로를 덮고 그 아래 전선까지 가렸다.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FiMaximize } from 'react-icons/fi'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import styled, { css } from 'styled-components'

import type { AtlasEdge, AtlasNode } from '../lib/atlas-model'
import { TITLE_RANK_META, type TitleRank } from '../lib/title-rank'

interface Props {
  year: number
  nodes: AtlasNode[]
  edges: AtlasEdge[]
  selectedId: string | null
  warPeers: ReadonlySet<string>
  allyPeers: ReadonlySet<string>
  /** 칭호 필터 — 맞지 않는 나라 핀은 흐리게 (관계선 맥락은 남긴다) */
  rankFilter: TitleRank | null
  isDark: boolean
  onSelect: (countryId: string | null) => void
  onOpenEvent: (eventId: string) => void
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 두 점 사이 2차 베지어 곡선 — 경도 차가 180°를 넘으면 짧은 쪽(날짜변경선 너머)으로 */
function curvePoints(
  from: [number, number],
  to: [number, number],
  bend: number,
): [number, number][] {
  const [lat1, lng1] = from
  let [lat2, lng2] = to
  if (lng2 - lng1 > 180) lng2 -= 360
  else if (lng1 - lng2 > 180) lng2 += 360
  const midLat = (lat1 + lat2) / 2
  const midLng = (lng1 + lng2) / 2
  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  const distance = Math.hypot(dLat, dLng) || 1
  const controlLat = midLat + (-dLng / distance) * distance * bend
  const controlLng = midLng + (dLat / distance) * distance * bend
  const points: [number, number][] = []
  const SEGMENTS = 28
  for (let index = 0; index <= SEGMENTS; index += 1) {
    const t = index / SEGMENTS
    const inverse = 1 - t
    points.push([
      inverse * inverse * lat1 + 2 * inverse * t * controlLat + t * t * lat2,
      inverse * inverse * lng1 + 2 * inverse * t * controlLng + t * t * lng2,
    ])
  }
  return points
}

/**
 * 같은 자리(소수 첫째 자리까지 같은 좌표)에 선 나라는 세로로 쌓는다 — 프로이센 왕국과 독일 제국은
 * 둘 다 베를린 좌표라 그대로 두면 한 핀이 다른 핀을 완전히 가린다. 수장이 있는 쪽이 위.
 */
function stackIndexById(nodes: AtlasNode[]): Map<string, number> {
  const groups = new Map<string, AtlasNode[]>()
  for (const node of nodes) {
    const key = `${node.country.lat.toFixed(1)},${node.country.lng.toFixed(1)}`
    const group = groups.get(key) ?? []
    group.push(node)
    groups.set(key, group)
  }
  const indexById = new Map<string, number>()
  for (const group of groups.values()) {
    group.sort(
      (left, right) =>
        right.rulers.length - left.rulers.length ||
        left.country.name.localeCompare(right.country.name, 'ko'),
    )
    group.forEach((node, index) => indexById.set(node.country.id, index))
  }
  return indexById
}

/** 이 줌 이하에서는 한 줄 이름표 핀 */
const COMPACT_MAX_ZOOM = 4

function pinHtml(
  node: AtlasNode,
  year: number,
  state: string,
  stackIndex: number,
  compact: boolean,
): string {
  const ruler = node.rulers[0]
  const country = escapeHtml(node.country.name)
  const stackStyle = `--stack:${stackIndex}`
  const compactClass = compact ? ' atlas-pin--compact' : ''
  if (!ruler) {
    return `<div class="atlas-pin atlas-pin--bare${compactClass} ${state}" style="${stackStyle}"><span class="atlas-pin__country">${country}</span></div>`
  }
  // 핀 테두리 = 칭호 등급 색 (황제 금색·국왕 하늘색…)
  const color = TITLE_RANK_META[node.country.rank].color
  const tenureYear = year - ruler.startYear + 1
  const isNew = tenureYear === 1
  const more =
    node.rulers.length > 1 ? ` <i>+${node.rulers.length - 1}</i>` : ''
  if (compact) {
    return (
      `<div class="atlas-pin${compactClass} ${state}" style="--pin:${color};${stackStyle}">` +
      (isNew ? `<span class="atlas-pin__new">즉위</span>` : '') +
      `<span class="atlas-pin__ruler">${escapeHtml(ruler.name)}${more}</span>` +
      `</div>`
    )
  }
  return (
    `<div class="atlas-pin ${state}" style="--pin:${color};${stackStyle}">` +
    (isNew ? `<span class="atlas-pin__new">즉위</span>` : '') +
    `<span class="atlas-pin__country">${country}</span>` +
    `<span class="atlas-pin__ruler">${escapeHtml(ruler.name)}${more}</span>` +
    `<span class="atlas-pin__meta">${tenureYear}년차</span>` +
    `</div>`
  )
}

function FitOnce({ nodes }: { nodes: AtlasNode[] }) {
  const map = useMap()
  const fittedRef = useRef(false)
  useEffect(() => {
    if (fittedRef.current || nodes.length === 0) return
    fittedRef.current = true
    const bounds = Leaflet.latLngBounds(
      nodes.map((node) => [node.country.lat, node.country.lng]),
    )
    map.fitBounds(bounds, {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 150],
      maxZoom: 5,
    })
  }, [map, nodes])
  return null
}

function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => {
    onZoom(map.getZoom())
  }, [map, onZoom])
  return null
}

/**
 * 나라를 고르면 그 나라와 교전·동맹 상대가 한 화면에 들어오게 맞춘다 (관계가 없으면 화면 밖일 때만 이동).
 * 선택이 바뀔 때만 움직인다 — 같은 선택으로 연도를 넘길 때 지도가 매년 튀지 않게.
 */
function FocusSelected({
  node,
  peers,
}: {
  node: AtlasNode | null
  peers: AtlasNode[]
}) {
  const map = useMap()
  const peersRef = useRef(peers)
  peersRef.current = peers
  const selectedId = node?.country.id ?? null
  useEffect(() => {
    if (!node) return
    const position = Leaflet.latLng(node.country.lat, node.country.lng)
    const related = peersRef.current
    if (related.length > 0) {
      const bounds = Leaflet.latLngBounds([
        position,
        ...related.map((peer) =>
          Leaflet.latLng(peer.country.lat, peer.country.lng),
        ),
      ])
      map.fitBounds(bounds, {
        paddingTopLeft: [70, 70],
        paddingBottomRight: [70, 170],
        maxZoom: 6,
      })
      return
    }
    if (!map.getBounds().pad(-0.1).contains(position)) map.panTo(position)
    // 선택 id가 바뀔 때만 — node 객체는 연도마다 새로 만들어진다
  }, [map, selectedId])
  return null
}

function FitButton({ nodes }: { nodes: AtlasNode[] }) {
  const map = useMap()
  return (
    <FitControl
      type="button"
      onClick={() => {
        if (nodes.length === 0) return
        map.fitBounds(
          Leaflet.latLngBounds(
            nodes.map((node) => [node.country.lat, node.country.lng]),
          ),
          {
            paddingTopLeft: [40, 40],
            paddingBottomRight: [40, 150],
            maxZoom: 5,
          },
        )
      }}
      aria-label="그해 나라 전체가 보이게 맞추기"
      title="전체 보기"
    >
      <FiMaximize size={14} />
    </FitControl>
  )
}

export function AtlasMap({
  year,
  nodes,
  edges,
  selectedId,
  warPeers,
  allyPeers,
  rankFilter,
  isDark,
  onSelect,
  onOpenEvent,
}: Props) {
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.country.id, node])),
    [nodes],
  )
  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null
  const peerNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          warPeers.has(node.country.id) || allyPeers.has(node.country.id),
      ),
    [nodes, warPeers, allyPeers],
  )
  const [zoom, setZoom] = useState(3)
  const compact = zoom <= COMPACT_MAX_ZOOM

  const icons = useMemo(() => {
    const stackIndex = stackIndexById(nodes)
    return nodes.map((node) => {
      const id = node.country.id
      let state = ''
      if (selectedId === id) state = 'is-selected'
      else if (warPeers.has(id)) state = 'is-war-peer'
      else if (allyPeers.has(id)) state = 'is-ally-peer'
      else if (selectedId) state = 'is-dimmed'
      else if (rankFilter && node.country.rank !== rankFilter)
        state = 'is-dimmed'
      return {
        node,
        icon: Leaflet.divIcon({
          className: 'atlas-pin-host',
          html: pinHtml(node, year, state, stackIndex.get(id) ?? 0, compact),
          iconSize: [0, 0],
        }),
      }
    })
  }, [nodes, year, selectedId, warPeers, allyPeers, rankFilter, compact])

  return (
    <MapShell $isDark={isDark}>
      <MapContainer
        center={[45, 30]}
        zoom={3}
        minZoom={2}
        worldCopyJump
        style={{ width: '100%', height: '100%' }}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnce nodes={nodes} />
        <ZoomWatcher onZoom={setZoom} />
        <FocusSelected node={selectedNode} peers={peerNodes} />

        {edges.map((edge) => {
          const from = nodeById.get(edge.aId)
          const to = nodeById.get(edge.bId)
          if (!from || !to) return null
          const touchesSelection =
            !selectedId || edge.aId === selectedId || edge.bId === selectedId
          const isWar = edge.kind === 'war'
          return (
            <Polyline
              key={`${edge.key}:${touchesSelection ? 'on' : 'off'}`}
              positions={curvePoints(
                [from.country.lat, from.country.lng],
                [to.country.lat, to.country.lng],
                isWar ? 0.18 : -0.14,
              )}
              // className은 생성 시에만 먹는다 — pathOptions(setStyle 경로)에 넣으면 무시된다
              className={isWar ? 'atlas-edge atlas-edge--war' : 'atlas-edge'}
              pathOptions={{
                color: isWar ? '#ef4444' : '#3b82f6',
                weight: isWar ? 3 : 2,
                dashArray: isWar ? '9 6' : '3 6',
                opacity: touchesSelection ? (isWar ? 0.95 : 0.8) : 0.12,
              }}
              eventHandlers={{
                click: () => {
                  if (edge.eventId) onOpenEvent(edge.eventId)
                },
              }}
            >
              <Tooltip sticky direction="top">
                <EdgeTip>
                  <b>{isWar ? '⚔ 교전' : '🤝 동맹'}</b> {from.country.name} ↔{' '}
                  {to.country.name}
                  <div>
                    {edge.label}
                    {edge.extraCount > 0 && ` 외 ${edge.extraCount}건`}
                  </div>
                  <small>
                    {edge.source === 'side'
                      ? '사건 진영 기준'
                      : edge.source === 'role'
                        ? '사건 역할 기준(진영 미입력)'
                        : '동맹 조약 기준'}
                    {edge.eventId && ' · 클릭하면 사건 보기'}
                  </small>
                </EdgeTip>
              </Tooltip>
            </Polyline>
          )
        })}

        {icons.map(({ node, icon }) => (
          <Marker
            key={node.country.id}
            position={[node.country.lat, node.country.lng]}
            icon={icon}
            zIndexOffset={
              selectedId === node.country.id
                ? 1000
                : node.rulers.length > 0
                  ? 100
                  : 0
            }
            keyboard
            title={`${node.country.name}${node.rulers[0] ? ` — ${node.rulers[0].name}` : ''}`}
            eventHandlers={{
              click: () =>
                onSelect(
                  selectedId === node.country.id ? null : node.country.id,
                ),
            }}
          />
        ))}

        <FitButton nodes={nodes} />
      </MapContainer>
    </MapShell>
  )
}

const MapShell = styled.div<{ $isDark: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  .leaflet-container {
    background: ${({ $isDark }) => ($isDark ? '#0b1220' : '#dbe7f0')};
    font-family: inherit;
  }

  ${({ $isDark }) =>
    $isDark &&
    css`
      .leaflet-tile-pane {
        filter: invert(1) hue-rotate(180deg) brightness(0.82) contrast(0.92)
          saturate(0.6);
      }
    `}

  .atlas-pin-host {
    background: none;
    border: none;
  }

  .atlas-pin {
    position: absolute;
    left: 0;
    top: 0;
    /* 겹친 자리는 --stack 칸만큼 아래로 (핀 높이 ≈ 50px) */
    transform: translate(
      -50%,
      calc(-50% + var(--stack, 0) * var(--stack-step, 54px))
    );
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 4px 9px 5px;
    border-radius: 9px;
    border: 2px solid var(--pin, #94a3b8);
    background: ${({ $isDark }) =>
      $isDark ? 'rgba(12, 18, 32, 0.94)' : 'rgba(255, 255, 255, 0.96)'};
    color: ${({ $isDark }) => ($isDark ? '#f8fafc' : '#0f172a')};
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
    white-space: nowrap;
    cursor: pointer;
    line-height: 1.2;
    transition:
      opacity 0.15s,
      box-shadow 0.15s,
      transform 0.15s;
  }
  .atlas-pin:hover {
    transform: translate(
        -50%,
        calc(-50% + var(--stack, 0) * var(--stack-step, 54px))
      )
      scale(1.06);
  }
  .atlas-pin__country {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.7;
  }
  .atlas-pin__ruler {
    font-size: 12px;
    font-weight: 800;
  }
  .atlas-pin__ruler i {
    font-style: normal;
    font-size: 10px;
    font-weight: 700;
    opacity: 0.6;
  }
  .atlas-pin__meta {
    font-size: 10px;
    font-weight: 700;
    color: var(--pin);
    font-variant-numeric: tabular-nums;
  }
  .atlas-pin__new {
    position: absolute;
    top: -9px;
    right: -8px;
    padding: 0 5px;
    border-radius: 999px;
    background: #ef4444;
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    line-height: 15px;
  }
  .atlas-pin--compact {
    --stack-step: 22px;
    flex-direction: row;
    padding: 1px 7px 2px;
    border-width: 0 0 0 3px;
    border-radius: 4px;
  }
  .atlas-pin--compact .atlas-pin__ruler {
    font-size: 11px;
  }
  .atlas-pin--compact .atlas-pin__new {
    top: -8px;
    right: -6px;
  }
  .atlas-pin--bare {
    padding: 2px 7px;
    border-width: 1px;
    border-style: dashed;
    opacity: 0.8;
  }
  .atlas-pin.is-selected {
    box-shadow:
      0 0 0 3px ${({ $isDark }) => ($isDark ? '#f8fafc' : '#0f172a')},
      0 8px 22px rgba(0, 0, 0, 0.35);
  }
  .atlas-pin.is-war-peer {
    box-shadow:
      0 0 0 3px #ef4444,
      0 0 18px rgba(239, 68, 68, 0.45);
  }
  .atlas-pin.is-ally-peer {
    box-shadow:
      0 0 0 3px #3b82f6,
      0 0 18px rgba(59, 130, 246, 0.35);
  }
  .atlas-pin.is-dimmed {
    opacity: 0.25;
  }

  .atlas-edge--war {
    animation: atlas-march 0.7s linear infinite;
  }
  @keyframes atlas-march {
    to {
      stroke-dashoffset: -15;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .atlas-edge--war {
      animation: none;
    }
  }
`

const FitControl = styled.button`
  position: absolute;
  top: 80px;
  left: 10px;
  z-index: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 4px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  background: #ffffff;
  color: #333333;
  cursor: pointer;
  &:hover {
    background: #f4f4f4;
  }
`

const EdgeTip = styled.div`
  font-size: 12px;
  line-height: 1.4;
  b {
    font-weight: 800;
  }
  small {
    display: block;
    margin-top: 2px;
    color: #64748b;
  }
`
