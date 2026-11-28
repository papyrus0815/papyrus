/**
 * 위치 카드의 작은 지도 — 좌표 한 점을 가운데 둔 정적 타일 3×3.
 *
 * 위치는 '글자 칸'이 아니라 '지도 위의 한 점'이다. 핀을 찍어도 예전엔 '48.8566°N, 2.3522°E' 알약만 떠서
 * 맞는 자리에 찍혔는지 눈으로 확인할 수 없었다. leaflet은 무거워(고르기 모달에서만 lazy) 여기선
 * 같은 타일 출처의 그림 9장만 깐다 — 상호작용 없음, 누르면 고르기 모달이 열린다.
 */
import React from 'react'

import { FiMapPin } from 'react-icons/fi'
import styled from 'styled-components'

const TILE = 256

/** 고르기 지도(location-picker-map)와 같은 타일 출처 */
const tileUrl = (x: number, y: number, z: number) =>
  `https://mt${(x + y) % 4}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}&hl=ko&gl=KR`

function worldPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sin = Math.sin((clampedLat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

export function PlaceMiniMap({ lat, lng, zoom = 8 }: { lat: number; lng: number; zoom?: number }) {
  const { x, y } = worldPixel(lat, lng, zoom)
  const tileX = Math.floor(x / TILE)
  const tileY = Math.floor(y / TILE)
  const offsetX = x - tileX * TILE
  const offsetY = y - tileY * TILE
  const tileCount = 2 ** zoom
  const tiles: Array<{ key: string; src: string; left: number; top: number }> = []
  for (let row = -1; row <= 1; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      const ty = tileY + row
      if (ty < 0 || ty >= tileCount) continue
      const tx = (((tileX + col) % tileCount) + tileCount) % tileCount
      tiles.push({
        key: `${col}:${row}`,
        src: tileUrl(tx, ty, zoom),
        left: (col + 1) * TILE,
        top: (row + 1) * TILE,
      })
    }
  }
  return (
    <MapFrame aria-hidden>
      <TileGrid style={{ transform: `translate(${-(offsetX + TILE)}px, ${-(offsetY + TILE)}px)` }}>
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </TileGrid>
      <Pin>
        <FiMapPin size={26} strokeWidth={2.2} />
      </Pin>
      <PinShadow />
    </MapFrame>
  )
}

const MapFrame = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1f2937' : '#e5e7eb')};
`

const TileGrid = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${TILE * 3}px;
  height: ${TILE * 3}px;

  img {
    position: absolute;
    width: ${TILE}px;
    height: ${TILE}px;
    user-select: none;
    /* 다크에선 밝은 타일이 판을 뚫고 튀지 않게 한 톤 눌러 둔다 */
    filter: ${({ theme }) => (theme.mode === 'dark' ? 'brightness(0.78) saturate(0.85)' : 'none')};
  }
`

const Pin = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -100%);
  display: inline-flex;
  color: ${({ theme }) => theme.colors.primary};
  filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.35));

  svg {
    fill: ${({ theme }) => (theme.mode === 'dark' ? '#1a1a1a' : '#ffffff')};
  }
`

const PinShadow = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 4px;
  transform: translate(-50%, -1px);
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.35);
`
