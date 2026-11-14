/**
 * 국가 상세 → 정부·행정 → 행정부·내각 탭의 「원장 목록(Ledger)」 뷰.
 * 수십 개 이상의 역대 행정부·내각을 가로 스크롤 없이 한눈에 스캔하고 바로 상세로 진입할 수 있는 밀도형 테이블.
 */
import React from 'react'

import { FiAward, FiLink2, FiUsers } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerRowWash,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import type { CabinetListItemDto } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'

import {
  formatDate,
  getHeadTenureTerritoryLabel,
  getPersonName,
} from './cabinets-section.helpers'

export interface CabinetsLedgerViewProps {
  items: readonly CabinetListItemDto[]
  countryName: string
  isHistoricalCountry: boolean
  showTerritoryLabels: boolean
  reignEraLineByCabinetId: ReadonlyMap<string, string>
  deletingCabinetId: string | null
  onSelectCabinet: (cabinetId: string) => void
}

export function CabinetsLedgerView({
  items,
  countryName,
  isHistoricalCountry,
  showTerritoryLabels,
  reignEraLineByCabinetId,
  deletingCabinetId,
  onSelectCabinet,
}: CabinetsLedgerViewProps) {
  return (
    <LedgerShell role="region" aria-label="역대 행정부 원장 목록">
      <LedgerHeaderRow>
        <span>재임 기간</span>
        <span>대수 · 직함</span>
        <span>수반 · 행정부 명칭</span>
        <DesktopOnlyCol>시대 · 연호</DesktopOnlyCol>
        <RightHeaderCol>구성 · 기록</RightHeaderCol>
      </LedgerHeaderRow>

      <LedgerBody>
        {items.map((cabinetItem, rowIndex) => {
          const headTenure = cabinetItem.headTenure
          const effStart = headTenure?.startDate ?? cabinetItem.startDate
          const effEnd = headTenure ? headTenure.endDate : cabinetItem.endDate
          const ongoingLabel = isHistoricalCountry ? '' : '현재'
          const periodText = effStart
            ? `${formatDate(effStart)} – ${
                effEnd ? formatDate(effEnd) : ongoingLabel || '종료 미상'
              }`
            : '연대 미상'

          const territoryLabel = showTerritoryLabels
            ? getHeadTenureTerritoryLabel(
                headTenure ?? {
                  country: cabinetItem.country,
                  historicalCountry: cabinetItem.historicalCountry,
                },
                countryName,
              )
            : null

          const personDisplayName = headTenure?.person
            ? getPersonName(headTenure.person)
            : cabinetItem.name?.trim() || '집단지도 · 과도정부'

          const positionTitle = headTenure
            ? (headTenure.positionDefinition?.title ??
              headTenure.title ??
              '수반')
            : '집단지도 · 위원회'

          const ordinalText =
            headTenure?.ordinal != null
              ? `제${headTenure.ordinal}대${
                  headTenure.subTermNumber != null
                    ? ` ${headTenure.subTermNumber}기`
                    : ''
                }`
              : null

          const explicitCabinetName = cabinetItem.name?.trim() || null
          const avatarUrl = headTenure?.person?.profileImageUrl
            ? getUploadImageUrl(headTenure.person.profileImageUrl)
            : null

          const reignEraText =
            reignEraLineByCabinetId.get(cabinetItem.id) ?? null
          const ministerCount = Math.max(
            cabinetItem._count?.members ?? 0,
            cabinetItem._count?.memberTenures ?? 0,
          )
          const achievementCount = Array.isArray(headTenure?.achievements)
            ? headTenure.achievements.length
            : 0
          const hasLinkageGroup = Boolean(cabinetItem.linkageGroup)
          const isDeleting = deletingCabinetId === cabinetItem.id

          return (
            <LedgerRowButton
              key={cabinetItem.id}
              type="button"
              disabled={isDeleting}
              $striped={rowIndex % 2 === 1}
              onClick={() => onSelectCabinet(cabinetItem.id)}
            >
              <PeriodCell>{periodText}</PeriodCell>

              <PositionCell>
                <PositionMainLine>
                  {ordinalText && <OrdinalBadge>{ordinalText}</OrdinalBadge>}
                  <PositionTitleSpan>{positionTitle}</PositionTitleSpan>
                </PositionMainLine>
                {territoryLabel && (
                  <TerritoryChip>🏛️ {territoryLabel}</TerritoryChip>
                )}
              </PositionCell>

              <LeaderCell>
                {avatarUrl ? (
                  <MiniAvatar src={avatarUrl} alt={personDisplayName} />
                ) : (
                  <MiniAvatarFallback>
                    {personDisplayName.slice(0, 1)}
                  </MiniAvatarFallback>
                )}
                <LeaderTextStack>
                  <LeaderNameText>{personDisplayName}</LeaderNameText>
                  {explicitCabinetName &&
                    explicitCabinetName !== personDisplayName && (
                      <CabinetSubName>{explicitCabinetName}</CabinetSubName>
                    )}
                </LeaderTextStack>
              </LeaderCell>

              <DesktopOnlyCol>
                {reignEraText ? (
                  <EraPill>{reignEraText}</EraPill>
                ) : (
                  <MutedDash>—</MutedDash>
                )}
              </DesktopOnlyCol>

              <MetaBadgeCell>
                {ministerCount > 0 && (
                  <StatChip title={`소속 각료 ${ministerCount}명`}>
                    <FiUsers size={11} />
                    <span>{ministerCount}</span>
                  </StatChip>
                )}
                {achievementCount > 0 && (
                  <StatChip title={`재임 기록·업적 ${achievementCount}건`}>
                    <FiAward size={11} />
                    <span>{achievementCount}</span>
                  </StatChip>
                )}
                {hasLinkageGroup && (
                  <AccentChip title="다국 국제사건 연결 행정부">
                    <FiLink2 size={11} />
                    <span>다국연결</span>
                  </AccentChip>
                )}
                {ministerCount === 0 &&
                  achievementCount === 0 &&
                  !hasLinkageGroup && <MutedDash>상세 →</MutedDash>}
              </MetaBadgeCell>
            </LedgerRowButton>
          )
        })}
      </LedgerBody>
    </LedgerShell>
  )
}

const LedgerShell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
  overflow: hidden;
`

const LedgerHeaderRow = styled.div`
  display: grid;
  grid-template-columns: 190px 210px minmax(200px, 1fr) 150px 150px;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  @media (max-width: 1024px) {
    grid-template-columns: 165px 180px minmax(160px, 1fr) 120px;
  }

  @media (max-width: 720px) {
    display: none;
  }
`

const DesktopOnlyCol = styled.div`
  min-width: 0;

  @media (max-width: 1024px) {
    display: none;
  }
`

const RightHeaderCol = styled.span`
  text-align: right;
`

const LedgerBody = styled.div`
  display: flex;
  flex-direction: column;
`

const LedgerRowButton = styled.button<{ $striped: boolean }>`
  display: grid;
  grid-template-columns: 190px 210px minmax(200px, 1fr) 150px 150px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme, $striped }) =>
    $striped ? ledgerRowWash(theme.mode) : 'transparent'};
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 165px 180px minmax(160px, 1fr) 120px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 12px 14px;
  }
`

const PeriodCell = styled.span`
  ${DIGIT_DISPLAY}
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PositionCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
`

const PositionMainLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
`

const OrdinalBadge = styled.span`
  ${DIGIT_DISPLAY}
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const PositionTitleSpan = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TerritoryChip = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: ${RADIUS.XS};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(245, 158, 11, 0.1)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#b45309')};
`

const LeaderCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const MiniAvatar = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const MiniAvatarFallback = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const LeaderTextStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const LeaderNameText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CabinetSubName = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EraPill = styled.span`
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: ${RADIUS.PILL};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MutedDash = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaBadgeCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`

const StatChip = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AccentChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`
