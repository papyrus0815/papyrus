/**
 * 이벤트 위치 정보 섹션
 * FSD: widgets/event-form/ui
 *
 * 국가 도메인에 등록된 행정구역·도시(AdministrativeDivision/City)를 PlaceSelect로 선택해
 * 사건에 연결한다. DB에 없는 역사 지명은 '직접 입력' 탭으로 자유 텍스트 저장.
 * 선택 결과(place)는 cityId/administrativeDivisionId로, 표시명(location)은 DB Event.location으로 저장된다.
 */
import React from 'react'

import { motion } from 'framer-motion'

import { PlaceSelect, type PlaceResult } from '@/shared/ui/place-autocomplete/place-autocomplete'

import * as S from '../../../pages/events/create/event-create.styles'

interface LocationSectionProps {
  place: PlaceResult | null
  setPlace: (value: PlaceResult | null) => void
  /** place의 표시명을 DB Event.location(자유 텍스트 라벨)에 동기화 */
  setLocation: (value: string) => void
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  place,
  setPlace,
  setLocation,
}) => {
  const handleChange = (next: PlaceResult | null) => {
    setPlace(next)
    setLocation(next?.displayName ?? '')
  }

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
          <PlaceSelect value={place} onChange={handleChange} />
          <S.Hint>
            사건이 발생한 장소를 등록된 행정구역·도시에서 선택하거나, 직접
            입력하세요
          </S.Hint>
        </S.FormField>
      </S.FormRow>
    </S.FormSection>
  )
}
