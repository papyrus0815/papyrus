import React, { useMemo, useState } from 'react'

import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiExternalLink,
  FiGlobe,
  FiLayers,
  FiMapPin,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  HEADQUARTERS_ZOOM_PRESETS,
  type HeadquartersGoogleMapLayer,
  buildHeadquartersGoogleMapsSpec,
  clampValidWgs84,
  formatHeadquartersCoordinate,
} from './headquarters-google-map.lib'

export interface HeadquartersMapPreviewProps {
  headquarters?: string | null
  latitude?: number | null
  longitude?: number | null
  countryName?: string | null
  departmentName?: string | null
  defaultExpanded?: boolean
  mapHeight?: number
  /** 소재지 명칭 헤더까지 한 카드·바 안에 통합 표시할지 여부 (히어로·드로어용) */
  showHeadline?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

/**
 * 부처 · 국가기관 상세 화면(국가 상세 탭 / 전 국가 부처 상세 / 우측 상세 드로어)에서
 * 청사·본부 소재지를 Google 지도(일반·위성) 및 외부 지도로 즉시 검토하는 공용 카드.
 */
export const HeadquartersMapPreview: React.FC<HeadquartersMapPreviewProps> = ({
  headquarters,
  latitude,
  longitude,
  countryName,
  departmentName,
  defaultExpanded = false,
  mapHeight = 236,
  showHeadline = false,
  onExpandedChange,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [mapLayer, setMapLayer] =
    useState<HeadquartersGoogleMapLayer>('roadmap')
  const [zoomLevel, setZoomLevel] = useState<number>(15)
  const [copied, setCopied] = useState(false)

  const validPoint = useMemo(
    () => clampValidWgs84(latitude, longitude),
    [latitude, longitude],
  )

  const googleMapsSpec = useMemo(
    () =>
      buildHeadquartersGoogleMapsSpec({
        headquarters,
        latitude: validPoint?.lat ?? null,
        longitude: validPoint?.lng ?? null,
        countryName,
        zoom: validPoint ? zoomLevel : Math.min(zoomLevel, 15),
        mapLayer,
      }),
    [headquarters, validPoint, countryName, zoomLevel, mapLayer],
  )

  if (!googleMapsSpec) return null

  const cleanHq = headquarters?.trim() ?? ''

  const toggleExpand = () => {
    setExpanded((prevExpanded) => {
      const nextExpanded = !prevExpanded
      onExpandedChange?.(nextExpanded)
      return nextExpanded
    })
  }

  const handleCopyCoord = async () => {
    if (!validPoint) return
    try {
      await navigator.clipboard?.writeText(
        `${validPoint.lat.toFixed(6)}, ${validPoint.lng.toFixed(6)}`,
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한 불가 시 무시
    }
  }

  return (
    <PreviewRoot $boxed={showHeadline || expanded}>
      <SummaryBar $boxed={showHeadline || expanded} $expanded={expanded}>
        <SummaryLeft>
          {showHeadline ? (
            <HeadlineWrap>
              <PinBadge $pinned={validPoint !== null} aria-hidden="true">
                <FiMapPin size={11.5} />
              </PinBadge>
              <HeadlineText>
                {cleanHq ||
                  (validPoint ? formatHeadquartersCoordinate(validPoint) : '')}
              </HeadlineText>
            </HeadlineWrap>
          ) : null}

          {validPoint ? (
            <CoordChip
              type="button"
              onClick={() => void handleCopyCoord()}
              title="클릭하여 WGS84 위·경도 좌표 복사"
            >
              <PinDot />
              <span>{formatHeadquartersCoordinate(validPoint)}</span>
              {copied ? (
                <FiCheck size={10.5} aria-hidden />
              ) : (
                <FiCopy size={10} className="copy-ic" aria-hidden />
              )}
            </CoordChip>
          ) : !showHeadline ? (
            <UnpinnedNote>명칭 기준 위치 검색</UnpinnedNote>
          ) : null}
        </SummaryLeft>

        <ActionCluster>
          <MapToggleBtn
            type="button"
            $active={expanded}
            onClick={toggleExpand}
          >
            <FiGlobe size={12} aria-hidden />
            <span>{expanded ? '구글 지도 닫기' : '구글 지도 보기'}</span>
            {expanded ? (
              <FiChevronUp size={12} aria-hidden />
            ) : (
              <FiChevronDown size={12} aria-hidden />
            )}
          </MapToggleBtn>

          <ExternalGoogleLink
            href={googleMapsSpec.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="새 탭에서 Google 지도 열기"
          >
            <span>Google 지도</span>
            <FiExternalLink size={11} aria-hidden />
          </ExternalGoogleLink>
        </ActionCluster>
      </SummaryBar>

      {expanded ? (
        <EmbedFrameWrap $height={mapHeight}>
          <EmbedControlBar>
            <EmbedModeLabel>
              <ModeDot $pinned={googleMapsSpec.mode === 'pinned'} />
              <span>
                {googleMapsSpec.mode === 'pinned'
                  ? '등록 핀 좌표 기준'
                  : '소재지 명칭 검색 기준'}
              </span>
            </EmbedModeLabel>

            <EmbedControlsRight>
              <MicroSwitch role="group" aria-label="구글 지도 레이어">
                <MicroSwitchBtn
                  type="button"
                  $active={mapLayer === 'roadmap'}
                  onClick={() => setMapLayer('roadmap')}
                >
                  일반
                </MicroSwitchBtn>
                <MicroSwitchBtn
                  type="button"
                  $active={mapLayer === 'hybrid'}
                  onClick={() => setMapLayer('hybrid')}
                >
                  <FiLayers size={10} />
                  위성
                </MicroSwitchBtn>
              </MicroSwitch>

              <MicroSwitch role="group" aria-label="구글 지도 배율">
                {HEADQUARTERS_ZOOM_PRESETS.map((presetItem) => (
                  <MicroSwitchBtn
                    key={presetItem.key}
                    type="button"
                    $active={zoomLevel === presetItem.zoom}
                    onClick={() => setZoomLevel(presetItem.zoom)}
                  >
                    {presetItem.label}
                  </MicroSwitchBtn>
                ))}
              </MicroSwitch>

              <ExternalGoogleLink
                href={googleMapsSpec.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>크게 보기</span>
                <FiExternalLink size={10.5} aria-hidden />
              </ExternalGoogleLink>
            </EmbedControlsRight>
          </EmbedControlBar>

          <iframe
            key={googleMapsSpec.embedUrl}
            title={`${cleanHq || departmentName || '청사 소재지'} 구글 지도`}
            src={googleMapsSpec.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </EmbedFrameWrap>
      ) : null}
    </PreviewRoot>
  )
}

const PreviewRoot = styled.div<{ $boxed: boolean }>`
  display: flex;
  flex-direction: column;
  margin-top: ${({ $boxed }) => ($boxed ? '6px' : '8px')};
  overflow: hidden;
  border-radius: ${({ $boxed }) => ($boxed ? '10px' : '0')};
  border: ${({ $boxed, theme }) =>
    $boxed
      ? `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(15, 23, 42, 0.09)'
        }`
      : 'none'};
  background: ${({ $boxed, theme }) =>
    $boxed
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.025)'
        : '#f8fafc'
      : 'transparent'};
`

const SummaryBar = styled.div<{ $boxed: boolean; $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: ${({ $boxed }) => ($boxed ? '7px 11px' : '0')};
  border-bottom: ${({ $expanded, theme }) =>
    $expanded
      ? `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(15, 23, 42, 0.08)'
        }`
      : 'none'};
`

const SummaryLeft = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
`

const HeadlineWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const PinBadge = styled.span<{ $pinned: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 21px;
  height: 21px;
  border-radius: 6px;
  flex-shrink: 0;
  color: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.secondary};
  background: ${({ $pinned, theme }) =>
    $pinned
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.06)'};
`

const HeadlineText = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`

const CoordChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 23px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : 'rgba(99, 102, 241, 0.2)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.14)'
      : 'rgba(99, 102, 241, 0.07)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : '#4338ca'};
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease;

  .copy-ic {
    opacity: 0.55;
    transition: opacity 0.14s ease;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    .copy-ic {
      opacity: 1;
    }
  }
`

const PinDot = styled.span`
  width: 5.5px;
  height: 5.5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #10b981;
`

const UnpinnedNote = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ActionCluster = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
`

const MapToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 25px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.14)'
          : '#cbd5e1'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.09)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : '#ffffff'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    color 0.14s ease,
    background 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  }
`

const ExternalGoogleLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  text-decoration: none;
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.07)'};
  }
`

const EmbedFrameWrap = styled.div<{ $height: number }>`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#18181b' : '#f1f5f9'};

  iframe {
    width: 100%;
    height: ${({ $height }) => $height}px;
    border: 0;
    display: block;
  }
`

const EmbedControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 5px 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(24, 24, 27, 0.9)' : '#ffffff'};
`

const EmbedModeLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ModeDot = styled.span<{ $pinned: boolean }>`
  width: 5.5px;
  height: 5.5px;
  border-radius: 50%;
  background: ${({ $pinned }) => ($pinned ? '#10b981' : '#94a3b8')};
`

const EmbedControlsRight = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
`

const MicroSwitch = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 1.5px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'};
`

const MicroSwitchBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 6.5px;
  border: none;
  border-radius: 4px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.24)'
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.secondary};
  font: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
`
