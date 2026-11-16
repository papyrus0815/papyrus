import React, { useMemo, useState } from 'react'

import {
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
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
}

/**
 * 부처 · 국가기관 상세 화면(국가 상세 탭 / 전 국가 부처 상세 / 우측 상세 드로어)에서
 * 청사·본부 소재지를 Google 지도 임베드 및 외부 지도로 즉시 검토하는 공용 블록.
 */
export const HeadquartersMapPreview: React.FC<HeadquartersMapPreviewProps> = ({
  headquarters,
  latitude,
  longitude,
  countryName,
  departmentName,
  defaultExpanded = false,
  mapHeight = 220,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
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
      }),
    [headquarters, validPoint, countryName],
  )

  if (!googleMapsSpec) return null

  return (
    <PreviewContainer>
      <ActionRow>
        {validPoint ? (
          <CoordBadge title="등록된 WGS84 대표 좌표">
            <FiMapPin size={11} aria-hidden />
            <span>{formatHeadquartersCoordinate(validPoint)}</span>
          </CoordBadge>
        ) : null}

        <ActionBtnGroup>
          <MapToggleBtn
            type="button"
            $active={expanded}
            onClick={() => setExpanded((prevExpanded) => !prevExpanded)}
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
          >
            <span>Google 지도</span>
            <FiExternalLink size={11} aria-hidden />
          </ExternalGoogleLink>
        </ActionBtnGroup>
      </ActionRow>

      {expanded ? (
        <EmbedFrameCard $height={mapHeight}>
          <EmbedCaptionBar>
            <span>
              {googleMapsSpec.mode === 'pinned'
                ? '핀 좌표 기준 구글 지도'
                : '소재지 명칭 검색 기준 구글 지도'}
            </span>
            <ExternalGoogleLink
              href={googleMapsSpec.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>크게 보기</span>
              <FiExternalLink size={11} aria-hidden />
            </ExternalGoogleLink>
          </EmbedCaptionBar>
          <iframe
            key={googleMapsSpec.embedUrl}
            title={`${headquarters?.trim() || departmentName || '청사 소재지'} 구글 지도`}
            src={googleMapsSpec.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </EmbedFrameCard>
      ) : null}
    </PreviewContainer>
  )
}

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const CoordBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4338ca'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.16)'
      : 'rgba(99, 102, 241, 0.08)'};
`

const ActionBtnGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
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
      : 'transparent'};
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
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const EmbedFrameCard = styled.div<{ $height: number }>`
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#18181b' : '#f8fafc'};

  iframe {
    width: 100%;
    height: ${({ $height }) => $height}px;
    border: 0;
    display: block;
  }
`

const EmbedCaptionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : '#e2e8f0'};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
