import React from 'react'

import styled from 'styled-components'

import type { HistoricalCountry, HistoricalEntityKind } from '@/entities/historical-country/api'
import {
  getEntityKindLabel,
  getEntityKindColor,
  getEntityKindEmoji,
  getStateTypeLabel as getStateTypeLabelUtil,
} from '@/entities/historical-country/lib/utils'
import { getUploadImageUrl } from '@/shared/api/upload'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Spinner } from '@/shared/ui/spinner'

interface HistoricalCountryDetailProps {
  /** 표시할 역사적 국가 (null이면 선택 안내 메시지 표시) */
  country: HistoricalCountry | null
  /** 로딩 상태 */
  isLoading?: boolean
  /** 수정 핸들러 */
  onEdit: (country: HistoricalCountry) => void
  /** 삭제 핸들러 */
  onDelete: (id: string) => void
}

/**
 * 역사적 국가 상세 정보 컴포넌트
 * - 선택된 역사적 국가의 상세 정보를 카드 형태로 표시
 * - 수정/삭제 액션 제공
 */
export function HistoricalCountryDetail({
  country,
  isLoading = false,
  onEdit,
  onDelete,
}: HistoricalCountryDetailProps) {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const prevCountryIdRef = React.useRef<string | null>(null)

  // country가 변경되면 즉시 로딩 상태로 전환
  const currentCountryId = country?.id || null
  const isCountryChanging =
    currentCountryId !== prevCountryIdRef.current && currentCountryId !== null

  React.useEffect(() => {
    if (isCountryChanging) {
      setInternalLoading(true)
      prevCountryIdRef.current = currentCountryId

      const timer = setTimeout(() => {
        setInternalLoading(false)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentCountryId, isCountryChanging])

  /**
   * 기원과 날짜를 포맷팅하여 표시
   * - 예: 기원전 2333년 7월 17일
   * - 예: 기원후 1392년
   */
  const formatDate = (
    era: 'BC' | 'AD' | null,
    year: number | null,
    month: number | null,
    day: number | null,
  ): string => {
    if (!era || !year) return '-'

    const eraText = era === 'BC' ? '기원전' : '기원후'
    const yearText = `${year}년`
    const monthText = month ? ` ${month}월` : ''
    const dayText = day ? ` ${day}일` : ''

    return `${eraText} ${yearText}${monthText}${dayText}`
  }

  const stateTypeLabel = country ? getStateTypeLabelUtil(country.stateType) : ''
  const entityKind: HistoricalEntityKind | null = country?.entityKind ?? null

  // 로딩 중 (country 변경 중이거나 외부 loading이 true일 때)
  if (isLoading || internalLoading || isCountryChanging) {
    return (
      <Container>
        <LoadingWrapper>
          <Spinner />
          <LoadingText>역사적 국가 정보를 불러오는 중...</LoadingText>
        </LoadingWrapper>
      </Container>
    )
  }

  // 선택된 국가가 없음
  if (!country) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>📜</EmptyIcon>
          <EmptyTitle>역사적 국가를 선택해주세요</EmptyTitle>
          <EmptyDescription>
            좌측 목록에서 국가를 선택하면
            <br />
            상세 정보를 확인할 수 있습니다
          </EmptyDescription>
        </EmptyState>
      </Container>
    )
  }

  return (
    <Container>
      <DetailCard>
        {/* 헤더: 썸네일 + 국가명 */}
        <Header>
          {country.thumbnailUrl ? (
            <Thumbnail src={getUploadImageUrl(country.thumbnailUrl)} alt={country.name} />
          ) : (
            <ThumbnailPlaceholder>🏛️</ThumbnailPlaceholder>
          )}
          <HeaderInfo>
            <CountryName>{country.name}</CountryName>
            {country.enName && <CountryEnName>{country.enName}</CountryEnName>}
            <BadgeRow>
              {entityKind != null && (
                <EntityKindBadge $color={getEntityKindColor(entityKind)}>
                  {getEntityKindEmoji(entityKind)} {getEntityKindLabel(entityKind)}
                </EntityKindBadge>
              )}
              <StateTypeBadge>
                {stateTypeLabel}
              </StateTypeBadge>
            </BadgeRow>
          </HeaderInfo>
        </Header>

        {/* 액션 버튼 */}
        <ActionButtons>
          <ActionButton $variant="edit" onClick={() => onEdit(country)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                fill="currentColor"
              />
            </svg>
            수정
          </ActionButton>
          <ActionButton
            $variant="delete"
            onClick={async () => {
              if (
                await confirm({
                  title: '삭제 확인',
                  message: `정말로 "${country.name}"을(를) 삭제하시겠습니까?`,
                  danger: true,
                })
              ) {
                onDelete(country.id)
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                fill="currentColor"
              />
            </svg>
            삭제
          </ActionButton>
        </ActionButtons>

        {/* 기본 정보 */}
        <Section>
          <SectionTitle>
            <SectionIcon>📋</SectionIcon>
            기본 정보
          </SectionTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>국가명 (한글)</InfoLabel>
              <InfoValue>{country.name}</InfoValue>
            </InfoItem>
            {country.enName && (
              <InfoItem>
                <InfoLabel>국가명 (영문)</InfoLabel>
                <InfoValue>{country.enName}</InfoValue>
              </InfoItem>
            )}
            {country.nameOrigin && (
              <InfoItem style={{ gridColumn: '1 / -1' }}>
                <InfoLabel>국가명 유래</InfoLabel>
                <InfoValue style={{ whiteSpace: 'pre-wrap' }}>
                  {country.nameOrigin}
                </InfoValue>
              </InfoItem>
            )}
            <InfoItem>
              <InfoLabel>국가 형태</InfoLabel>
              <InfoValue>
                <StateTypeBadge>
                  {stateTypeLabel}
                </StateTypeBadge>
              </InfoValue>
            </InfoItem>
            {entityKind != null && (
              <InfoItem>
                <InfoLabel>정치체 성격</InfoLabel>
                <InfoValue>
                  <EntityKindBadge $color={getEntityKindColor(entityKind)}>
                    {getEntityKindEmoji(entityKind)} {getEntityKindLabel(entityKind)}
                  </EntityKindBadge>
                </InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>

        {/* 존속 기간 */}
        <Section>
          <SectionTitle>
            <SectionIcon>📅</SectionIcon>
            존속 기간
          </SectionTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>시작</InfoLabel>
              <InfoValue>
                {formatDate(
                  country.startEra,
                  country.startYear,
                  country.startMonth,
                  country.startDay,
                )}
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>종료</InfoLabel>
              <InfoValue>
                {formatDate(
                  country.endEra,
                  country.endYear,
                  country.endMonth,
                  country.endDay,
                )}
              </InfoValue>
            </InfoItem>
          </InfoGrid>
        </Section>

        {/* 설명 */}
        {country.description && (
          <Section>
            <SectionTitle>
              <SectionIcon>📝</SectionIcon>
              설명
            </SectionTitle>
            <Description>{country.description}</Description>
          </Section>
        )}

        {/* 메타 정보 */}
        <Section>
          <SectionTitle>
            <SectionIcon>🔍</SectionIcon>
            메타 정보
          </SectionTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>생성일</InfoLabel>
              <InfoValue>
                {new Date(country.createdAt).toLocaleString('ko-KR')}
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>수정일</InfoLabel>
              <InfoValue>
                {new Date(country.updatedAt).toLocaleString('ko-KR')}
              </InfoValue>
            </InfoItem>
          </InfoGrid>
        </Section>
      </DetailCard>
    </Container>
  )
}

// ==================== Styled Components ====================

const Container = styled.div`
  height: 100%;
  overflow-y: auto;
  background: #f9fafb;
  padding: 24px;
`

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
`

const LoadingText = styled.p`
  color: #6b7280;
  font-size: 14px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
`

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
`

const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
`

const EmptyDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
`

const DetailCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`

const Thumbnail = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 12px;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
`

const ThumbnailPlaceholder = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  border: 3px solid rgba(255, 255, 255, 0.3);
`

const HeaderInfo = styled.div`
  flex: 1;
`

const CountryName = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
`

const CountryEnName = styled.p`
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 12px;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

const EntityKindBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${(p) => `${p.$color}22`};
  color: ${(p) => p.$color};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
`

const StateTypeBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(10px);
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
`

const ActionButton = styled.button<{ $variant: 'edit' | 'delete' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.$variant === 'edit'
      ? `
    background: #3b82f6;
    color: white;
    &:hover {
      background: #2563eb;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
  `
      : `
    background: #ef4444;
    color: white;
    &:hover {
      background: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
  `}
`

const Section = styled.section`
  padding: 32px;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
`

const SectionIcon = styled.span`
  font-size: 20px;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const InfoLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const InfoValue = styled.span`
  font-size: 16px;
  font-weight: 500;
  color: #111827;
`

const Description = styled.p`
  font-size: 15px;
  line-height: 1.8;
  color: #374151;
  white-space: pre-wrap;
`
