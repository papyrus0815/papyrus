/**
 * 이벤트 위치 정보 섹션
 * FSD: widgets/event-form/ui
 */
import React from 'react'

import { motion } from 'framer-motion'

import * as S from '../../../pages/events/create/event-create.styles'

interface LocationSectionProps {
  location: string
  setLocation: (value: string) => void
  latitude: string
  setLatitude: (value: string) => void
  longitude: string
  setLongitude: (value: string) => void
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  location,
  setLocation,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
}) => {
  return (
    <S.FormSection
      as={motion.div}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <S.FormRow>
        <S.FormLabel>위치</S.FormLabel>
        <S.FormField>
          <S.Input
            type="text"
            placeholder="예: 노르망디, 프랑스"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <S.Hint>사건이 발생한 장소를 입력하세요</S.Hint>
        </S.FormField>
      </S.FormRow>

      <S.FormRow>
        <S.FormLabel>좌표</S.FormLabel>
        <S.FormField>
          <div style={{ display: 'flex', gap: '12px' }}>
            <S.Input
              type="text"
              placeholder="위도 (Latitude)"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <S.Input
              type="text"
              placeholder="경도 (Longitude)"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <S.Hint>정확한 위치 좌표를 입력하세요 (선택 사항)</S.Hint>
        </S.FormField>
      </S.FormRow>
    </S.FormSection>
  )
}
