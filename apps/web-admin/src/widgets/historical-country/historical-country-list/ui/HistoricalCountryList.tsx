import React from 'react'
import { motion } from 'framer-motion'
import type { HistoricalCountry } from '@/entities/historical-country/api'
import {
  getStateTypeLabel,
  getStateTypeColor,
  getStateTypeEmoji,
} from '@/entities/historical-country/lib/utils'
import styled from 'styled-components'

interface HistoricalCountryListProps {
  countries: HistoricalCountry[]
  selectedId: string | null
  onSelect: (country: HistoricalCountry) => void
}

export function HistoricalCountryList({
  countries,
  selectedId,
  onSelect,
}: HistoricalCountryListProps) {
  /**
   * Era 기반 날짜를 포맷팅
   */
  const formatEraDate = (
    era: 'BC' | 'AD' | null,
    year: number | null,
  ): string => {
    if (!era || !year) return '?'
    const eraText = era === 'BC' ? '기원전' : '기원후'
    return `${eraText} ${year}년`
  }

  /**
   * 존속 기간 계산 (대략적)
   */
  const calculateDuration = (
    startEra: 'BC' | 'AD' | null,
    startYear: number | null,
    endEra: 'BC' | 'AD' | null,
    endYear: number | null,
  ): string => {
    if (!startEra || !startYear || !endEra || !endYear) return '?'

    // BC는 음수로, AD는 양수로 변환
    const startYearValue = startEra === 'BC' ? -startYear : startYear
    const endYearValue = endEra === 'BC' ? -endYear : endYear

    const duration = endYearValue - startYearValue
    return `약 ${duration}년`
  }

  if (countries.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>🏛️</EmptyIcon>
        <EmptyText>역사적 국가가 없습니다</EmptyText>
        <EmptySubtext>새로운 국가를 추가해보세요</EmptySubtext>
      </EmptyState>
    )
  }

  return (
    <Container>
      {countries.map((country, index) => {
        const isSelected = country.id === selectedId
        const stateTypeColor = getStateTypeColor(country.stateType)

        return (
          <CountryCard
            key={country.id}
            onClick={() => onSelect(country)}
            $isSelected={isSelected}
            $stateTypeColor={stateTypeColor}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <CardHeader>
              <StateTypeBadge $color={stateTypeColor}>
                <span>{getStateTypeEmoji(country.stateType)}</span>
                <span>{getStateTypeLabel(country.stateType)}</span>
              </StateTypeBadge>
            </CardHeader>

            <CardBody>
              <CountryName>{country.name}</CountryName>
              {country.enName && (
                <CountryEnName>{country.enName}</CountryEnName>
              )}

              <InfoGrid>
                <InfoItem>
                  <InfoLabel>📅 시작</InfoLabel>
                  <InfoValue>
                    {formatEraDate(country.startEra, country.startYear)}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>🏁 종료</InfoLabel>
                  <InfoValue>
                    {formatEraDate(country.endEra, country.endYear)}
                  </InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>⏳ 기간</InfoLabel>
                  <InfoValue>
                    {calculateDuration(
                      country.startEra,
                      country.startYear,
                      country.endEra,
                      country.endYear,
                    )}
                  </InfoValue>
                </InfoItem>
              </InfoGrid>

              {country.description && (
                <Description>
                  {country.description.length > 100
                    ? `${country.description.substring(0, 100)}...`
                    : country.description}
                </Description>
              )}
            </CardBody>
          </CountryCard>
        )
      })}
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 16px;
`

const CountryCard = styled(motion.div)<{
  $isSelected: boolean
  $stateTypeColor: string
}>`
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  border: 2px solid
    ${(props) => (props.$isSelected ? props.$stateTypeColor : '#e5e7eb')};
  box-shadow: ${(props) =>
    props.$isSelected
      ? `0 4px 12px ${props.$stateTypeColor}40`
      : '0 1px 3px rgba(0, 0, 0, 0.1)'};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`

const CardHeader = styled.div`
  margin-bottom: 16px;
`

const StateTypeBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: ${(props) => `${props.$color}15`};
  color: ${(props) => props.$color};
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
`

const CardBody = styled.div``

const CountryName = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
`

const CountryEnName = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
`

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const InfoLabel = styled.div`
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
`

const InfoValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`

const Description = styled.p`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
`

const EmptyText = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`

const EmptySubtext = styled.div`
  font-size: 14px;
  color: #9ca3af;
`
