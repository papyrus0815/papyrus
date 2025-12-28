import styled from 'styled-components'

interface GoogleMapProps {
  latitude: number
  longitude: number
  name: string
  zoom?: number
}

const MapContainer = styled.div`
  width: 100%;
  height: 400px;
  overflow: hidden;

  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`

const MapFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  display: block;
`

const NoLocationMessage = styled.div`
  width: 100%;
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #9ca3af;
  font-size: 14px;
  gap: 8px;
`

export function GoogleMap({
  latitude,
  longitude,
  name,
  zoom = 13,
}: GoogleMapProps) {
  if (!latitude || !longitude) {
    return (
      <NoLocationMessage>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            fill="currentColor"
          />
        </svg>
        <div>위치 정보가 없습니다</div>
      </NoLocationMessage>
    )
  }

  // 좌표 값을 명시적으로 숫자로 변환
  const lat = Number(latitude)
  const lng = Number(longitude)

  // OpenStreetMap 기반
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.5},${lat - 0.5},${lng + 0.5},${lat + 0.5}&layer=mapnik&marker=${lat},${lng}`

  return (
    <MapContainer>
      <MapFrame
        src={osmUrl}
        title={`${name} 지도`}
        loading="lazy"
        allowFullScreen
      />
    </MapContainer>
  )
}
