/**
 * 출생 / 사망 / 묘소·안장 카드 + 통합 Google 지도 공간 뷰포트 — 개요 탭.
 * - 당대 지명 표기(historicalLabel)와 현대 정본 위치(Place)를 명확히 분리 표기
 * - 복수 학설(일설 ALTERNATIVE / 논쟁 DISPUTED) 및 추정(PROBABLE) 층위 표시
 * - 클릭 한 번으로 카드 하단에서 출생·사망·묘소·일설 Google 지도(일반/위성/거리뷰) 및 전체 동선 확인
 */
import { useMemo, useState } from 'react'

import {
  FiAnchor,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiGlobe,
  FiNavigation,
  FiSunset,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  type PersonPlaceRecord,
  buildPersonPlaceGoogleMapsUrls,
} from '@/shared/lib/person-place-google-map.lib'
import { formatFloruit } from '@/shared/lib/lifespan-text'

import { DEATH_TYPE_LABELS } from './helpers'
import {
  BirthMarkerPill,
  DeathCauseText,
  DeathInfoRow,
  DeathNoteText,
  DeathTypePill,
  LifeCard,
  LifeCardAge,
  LifeCardGrid,
  LifeCardHeader,
  LifeCardIconWrap,
  LifeCardLabel,
  LifeCardRow,
  LifeCardTitle,
  LifeCardValue,
} from './person-detail-panel.styles'
import {
  ALL_TRAJECTORY_KEY,
  PersonSpatialMapPanel,
  type PersonSpatialStop,
} from './person-spatial-map-panel'
import type { PersonDetailData } from './types'

interface BirthDeathCardsProps {
  person: PersonDetailData
  /** formatDateKo 결과 — 빈 문자열이면 미표시 */
  birthDateStr: string
  deathDateStr: string
  ageAtDeath: number | null
}

function resolveRoleStops(params: {
  role: 'BIRTH' | 'DEATH' | 'BURIAL'
  roleLabel: string
  records: PersonPlaceRecord[]
  fallbackPlace?: PersonDetailData['birthPlace']
  fallbackHistoricalLabel?: string | null
  fallbackLegacyText?: string | null
  fallbackCity?: PersonDetailData['birthCity']
  fallbackDivision?: PersonDetailData['birthAdminDivision']
  fallbackCountryName?: string | null
  dateLabel?: string | null
}): PersonSpatialStop[] {
  const matching = params.records.filter((r) => r.role === params.role)
  if (matching.length > 0) {
    return matching.map((r, idx) => {
      const displayLabel =
        r.historicalLabel?.trim() ||
        r.place?.name?.trim() ||
        params.fallbackLegacyText?.trim() ||
        ''
      const modernName = r.place?.name?.trim() ?? null
      const modernAddr = r.place?.modernAddress?.trim() ?? null
      const modernSubtitle =
        modernName && modernName !== displayLabel
          ? modernName
          : modernAddr && modernAddr !== displayLabel
            ? modernAddr
            : null
      return {
        key: r.id ?? `${params.role}-${idx}`,
        role: params.role,
        roleLabel: params.roleLabel,
        estimateRole: r.estimateRole ?? 'PREFERRED',
        certainty: r.certainty ?? 'CERTAIN',
        displayLabel,
        modernSubtitle,
        countryName:
          r.country?.name ??
          r.place?.countryName ??
          params.fallbackCountryName ??
          null,
        dateLabel: params.dateLabel ?? null,
        note: r.note ?? null,
        place: r.place ?? null,
      }
    }).filter((s) => Boolean(s.displayLabel))
  }

  // 레거시/모의 테스트 데이터 폴백 (PersonPlace 배열이 아직 없을 때)
  const displayLabel =
    params.fallbackHistoricalLabel?.trim() ||
    params.fallbackPlace?.name?.trim() ||
    params.fallbackCity?.name?.trim() ||
    params.fallbackDivision?.name?.trim() ||
    params.fallbackLegacyText?.trim() ||
    ''

  if (!displayLabel) return []

  const modernName = params.fallbackPlace?.name?.trim() ?? null
  const modernSubtitle =
    modernName && modernName !== displayLabel ? modernName : null

  return [
    {
      key: `${params.role}-fallback`,
      role: params.role,
      roleLabel: params.roleLabel,
      estimateRole: 'PREFERRED',
      certainty: /(?:지명\s*미상|정확한\s*장소\s*미상)/.test(displayLabel)
        ? 'UNKNOWN'
        : 'CERTAIN',
      displayLabel,
      modernSubtitle,
      countryName:
        params.fallbackPlace?.countryName ?? params.fallbackCountryName ?? null,
      dateLabel: params.dateLabel ?? null,
      note: null,
      place: params.fallbackPlace ?? null,
      fallbackLat:
        params.fallbackCity?.latitude ?? params.fallbackDivision?.centerLat ?? null,
      fallbackLng:
        params.fallbackCity?.longitude ?? params.fallbackDivision?.centerLng ?? null,
    },
  ]
}

export function BirthDeathCards({
  person: p,
  birthDateStr,
  deathDateStr,
  ageAtDeath,
}: BirthDeathCardsProps) {
  const [openStopKey, setOpenStopKey] = useState<string | null>(null)

  const birthPlaceAff = p.countryAffiliations?.find(
    (aff) => aff.affiliationType === 'BIRTH_PLACE',
  )
  const birthCountry =
    birthPlaceAff?.historicalCountry?.name ?? birthPlaceAff?.country?.name ?? null

  const deathPlaceAff = p.countryAffiliations?.find(
    (aff) => aff.affiliationType === 'DEATH_PLACE',
  )
  const deathCountry =
    deathPlaceAff?.historicalCountry?.name ?? deathPlaceAff?.country?.name ?? null

  const fallbackCountryName = p.country?.name ?? null
  const allPlaceRecords = useMemo(() => p.places ?? [], [p.places])

  const birthStops = useMemo(
    () =>
      resolveRoleStops({
        role: 'BIRTH',
        roleLabel: '출생지',
        records: allPlaceRecords,
        fallbackPlace: p.birthPlace,
        fallbackHistoricalLabel: p.birthPlaceHistoricalLabel,
        fallbackLegacyText: p.birthPlaceText,
        fallbackCity: p.birthCity,
        fallbackDivision: p.birthAdminDivision,
        fallbackCountryName: birthPlaceAff?.country?.name ?? fallbackCountryName,
        dateLabel: birthDateStr || null,
      }),
    [
      allPlaceRecords,
      p.birthPlace,
      p.birthPlaceHistoricalLabel,
      p.birthPlaceText,
      p.birthCity,
      p.birthAdminDivision,
      birthPlaceAff?.country?.name,
      fallbackCountryName,
      birthDateStr,
    ],
  )

  const deathStops = useMemo(
    () =>
      resolveRoleStops({
        role: 'DEATH',
        roleLabel: '사망지',
        records: allPlaceRecords,
        fallbackPlace: p.deathPlace,
        fallbackHistoricalLabel: p.deathPlaceHistoricalLabel,
        fallbackLegacyText: p.deathPlaceText,
        fallbackCity: p.deathCity,
        fallbackDivision: p.deathAdminDivision,
        fallbackCountryName: deathPlaceAff?.country?.name ?? fallbackCountryName,
        dateLabel: deathDateStr || null,
      }),
    [
      allPlaceRecords,
      p.deathPlace,
      p.deathPlaceHistoricalLabel,
      p.deathPlaceText,
      p.deathCity,
      p.deathAdminDivision,
      deathPlaceAff?.country?.name,
      fallbackCountryName,
      deathDateStr,
    ],
  )

  const burialStops = useMemo(
    () =>
      resolveRoleStops({
        role: 'BURIAL',
        roleLabel: '묘소·안장지',
        records: allPlaceRecords,
        fallbackPlace: p.burialPlace,
        fallbackHistoricalLabel: p.burialPlaceHistoricalLabel,
        fallbackCountryName,
      }),
    [
      allPlaceRecords,
      p.burialPlace,
      p.burialPlaceHistoricalLabel,
      fallbackCountryName,
    ],
  )

  const allMappableStops = useMemo(
    () =>
      [...birthStops, ...deathStops, ...burialStops].filter(
        (s) => s.certainty !== 'UNKNOWN' || s.place?.latitude != null,
      ),
    [birthStops, deathStops, burialStops],
  )

  const pinnedStopsCount = useMemo(
    () =>
      allMappableStops.filter(
        (s) =>
          (s.place?.latitude != null && s.place?.longitude != null) ||
          (s.fallbackLat != null && s.fallbackLng != null),
      ).length,
    [allMappableStops],
  )

  const primaryBirthStop = birthStops[0] ?? null
  const altBirthStops = birthStops.slice(1)
  const primaryDeathStop = deathStops[0] ?? null
  const altDeathStops = deathStops.slice(1)
  const primaryBurialStop = burialStops[0] ?? null
  const altBurialStops = burialStops.slice(1)

  const floruitStartSigned =
    p.floruitStartYear != null
      ? ((p.floruitStartEra ?? p.floruitEra) === 'BC'
          ? -p.floruitStartYear
          : p.floruitStartYear)
      : null
  const floruitEndSigned =
    p.floruitEndYear != null
      ? ((p.floruitEndEra ?? p.floruitEra) === 'BC'
          ? -p.floruitEndYear
          : p.floruitEndYear)
      : null
  const floruitLabel =
    !birthDateStr && !deathDateStr
      ? formatFloruit(floruitStartSigned, floruitEndSigned)
      : ''

  const hasBirthExtra =
    !!primaryBirthStop ||
    !!birthCountry ||
    !!p.illegitimate ||
    !!p.birthNote
  const hasDeathExtra =
    !!primaryDeathStop ||
    !!deathCountry ||
    !!p.deathType ||
    !!p.deathCause ||
    !!p.deathNote
  const hasBurial = !!primaryBurialStop || !!p.burialNote

  if (!hasBirthExtra && !hasDeathExtra && !hasBurial) return null

  const hasBirth =
    !!birthDateStr ||
    hasBirthExtra ||
    !!p.isBirthDateUnknown ||
    !!floruitLabel
  const hasDeath =
    !!deathDateStr ||
    hasDeathExtra ||
    !!p.isDeathDateUnknown
  if (!hasBirth && !hasDeath && !hasBurial) return null

  const toggleStopOnMap = (key: string) => {
    setOpenStopKey((prev) => (prev === key ? null : key))
  }

  const renderPlaceBlock = (
    primaryStop: PersonSpatialStop,
    altStops: PersonSpatialStop[],
  ) => {
    const canMap =
      primaryStop.certainty !== 'UNKNOWN' ||
      primaryStop.place?.latitude != null
    const mapUrls = canMap
      ? buildPersonPlaceGoogleMapsUrls({
          place: primaryStop.place,
          fallbackLat: primaryStop.fallbackLat,
          fallbackLng: primaryStop.fallbackLng,
          historicalLabel: primaryStop.displayLabel,
          countryName: primaryStop.countryName,
        })
      : null
    const isExpandedForThis = openStopKey === primaryStop.key

    return (
      <PlaceValueStack>
        <PlacePrimaryLine>
          <span>{primaryStop.displayLabel}</span>
          {primaryStop.certainty === 'PROBABLE' && (
            <MetaBadge $tone="probable">추정</MetaBadge>
          )}
          {primaryStop.certainty === 'UNKNOWN' && (
            <MetaBadge $tone="unknown">세부 미상</MetaBadge>
          )}

          {mapUrls && (
            <MapActionInline>
              <InlineMapToggle
                type="button"
                $active={isExpandedForThis}
                onClick={() => toggleStopOnMap(primaryStop.key)}
                title="Google 지도로 위치 확인"
              >
                <FiGlobe size={11} />
                <span>{isExpandedForThis ? '지도 닫기' : '구글 지도'}</span>
                {isExpandedForThis ? (
                  <FiChevronUp size={11} />
                ) : (
                  <FiChevronDown size={11} />
                )}
              </InlineMapToggle>

              <InlineExternalAnchor
                href={mapUrls.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="새 탭에서 Google 지도 열기"
                aria-label={`${primaryStop.displayLabel} 새 탭 Google 지도 열기`}
              >
                <FiExternalLink size={11} />
              </InlineExternalAnchor>
            </MapActionInline>
          )}
        </PlacePrimaryLine>

        {primaryStop.modernSubtitle && (
          <ModernEquivalentLine>
            현대 위치: {primaryStop.modernSubtitle}
          </ModernEquivalentLine>
        )}

        {primaryStop.note && (
          <PlaceClaimNote>{primaryStop.note}</PlaceClaimNote>
        )}

        {altStops.length > 0 && (
          <AltClaimsList>
            {altStops.map((alt) => {
              const altActive = openStopKey === alt.key
              return (
                <AltClaimRow key={alt.key}>
                  <MetaBadge $tone="alt">
                    {alt.estimateRole === 'DISPUTED' ? '논쟁' : '일설'}
                  </MetaBadge>
                  <span>{alt.displayLabel}</span>
                  {alt.certainty !== 'UNKNOWN' && (
                    <InlineMapToggle
                      type="button"
                      $active={altActive}
                      onClick={() => toggleStopOnMap(alt.key)}
                    >
                      <FiGlobe size={10.5} />
                      <span>지도</span>
                    </InlineMapToggle>
                  )}
                </AltClaimRow>
              )
            })}
          </AltClaimsList>
        )}
      </PlaceValueStack>
    )
  }

  const personDisplayName = [p.surname, p.name].filter(Boolean).join(' ') || p.name

  return (
    <div>
      <LifeCardGrid>
        {hasBirth && (
          <LifeCard $tone="birth" aria-label="출생 정보">
            <LifeCardHeader>
              <LifeCardIconWrap $tone="birth">
                <FiCalendar size={14} strokeWidth={2.2} />
              </LifeCardIconWrap>
              <LifeCardTitle>출생</LifeCardTitle>
              {p.illegitimate && <BirthMarkerPill>서출</BirthMarkerPill>}
            </LifeCardHeader>
            {birthDateStr ? (
              <LifeCardRow>
                <LifeCardLabel>일자</LifeCardLabel>
                <LifeCardValue>
                  {birthDateStr}
                  {p.isBirthDateApproximate ? '경' : ''}
                </LifeCardValue>
              </LifeCardRow>
            ) : p.isBirthDateUnknown ? (
              <LifeCardRow>
                <LifeCardLabel>일자</LifeCardLabel>
                <LifeCardValue>미상</LifeCardValue>
              </LifeCardRow>
            ) : null}
            {floruitLabel && (
              <LifeCardRow>
                <LifeCardLabel>활동시기</LifeCardLabel>
                <LifeCardValue>{floruitLabel}</LifeCardValue>
              </LifeCardRow>
            )}
            {primaryBirthStop && (
              <LifeCardRow>
                <LifeCardLabel>장소</LifeCardLabel>
                <LifeCardValue>
                  {renderPlaceBlock(primaryBirthStop, altBirthStops)}
                </LifeCardValue>
              </LifeCardRow>
            )}
            {birthCountry && (
              <LifeCardRow>
                <LifeCardLabel>출생국</LifeCardLabel>
                <LifeCardValue>{birthCountry}</LifeCardValue>
              </LifeCardRow>
            )}
            {p.birthNote && <DeathNoteText>{p.birthNote}</DeathNoteText>}
          </LifeCard>
        )}

        {hasDeath && (
          <LifeCard $tone="death" aria-label="사망 정보">
            <LifeCardHeader>
              <LifeCardIconWrap $tone="death">
                <FiSunset size={14} strokeWidth={2.2} />
              </LifeCardIconWrap>
              <LifeCardTitle>사망</LifeCardTitle>
              {ageAtDeath != null && (
                <LifeCardAge>
                  향년{' '}
                  {p.isBirthDateApproximate || p.isDeathDateApproximate
                    ? '약 '
                    : ''}
                  {ageAtDeath}세
                </LifeCardAge>
              )}
            </LifeCardHeader>
            {deathDateStr ? (
              <LifeCardRow>
                <LifeCardLabel>일자</LifeCardLabel>
                <LifeCardValue>
                  {deathDateStr}
                  {p.isDeathDateApproximate ? '경' : ''}
                </LifeCardValue>
              </LifeCardRow>
            ) : p.isDeathDateUnknown ? (
              <LifeCardRow>
                <LifeCardLabel>일자</LifeCardLabel>
                <LifeCardValue>미상</LifeCardValue>
              </LifeCardRow>
            ) : null}
            {primaryDeathStop && (
              <LifeCardRow>
                <LifeCardLabel>장소</LifeCardLabel>
                <LifeCardValue>
                  {renderPlaceBlock(primaryDeathStop, altDeathStops)}
                </LifeCardValue>
              </LifeCardRow>
            )}
            {deathCountry && (
              <LifeCardRow>
                <LifeCardLabel>사망국</LifeCardLabel>
                <LifeCardValue>{deathCountry}</LifeCardValue>
              </LifeCardRow>
            )}
            {(p.deathType || p.deathCause) && (
              <LifeCardRow>
                <LifeCardLabel>유형</LifeCardLabel>
                <DeathInfoRow>
                  {p.deathType && (
                    <DeathTypePill>
                      {DEATH_TYPE_LABELS[p.deathType] ?? p.deathType}
                    </DeathTypePill>
                  )}
                  {p.deathCause && (
                    <DeathCauseText>{p.deathCause}</DeathCauseText>
                  )}
                </DeathInfoRow>
              </LifeCardRow>
            )}
            {p.deathNote && <DeathNoteText>{p.deathNote}</DeathNoteText>}
          </LifeCard>
        )}

        {hasBurial && (
          <BurialLifeCard aria-label="묘소 및 안장 정보">
            <LifeCardHeader>
              <BurialIconWrap>
                <FiAnchor size={14} strokeWidth={2.2} />
              </BurialIconWrap>
              <LifeCardTitle>묘소·안장</LifeCardTitle>
            </LifeCardHeader>
            {primaryBurialStop && (
              <LifeCardRow>
                <LifeCardLabel>장소</LifeCardLabel>
                <LifeCardValue>
                  {renderPlaceBlock(primaryBurialStop, altBurialStops)}
                </LifeCardValue>
              </LifeCardRow>
            )}
            {p.burialNote && <DeathNoteText>{p.burialNote}</DeathNoteText>}
          </BurialLifeCard>
        )}
      </LifeCardGrid>

      {pinnedStopsCount >= 2 && openStopKey === null && (
        <QuickTrajectoryBar>
          <QuickTrajectoryBtn
            type="button"
            onClick={() => setOpenStopKey(ALL_TRAJECTORY_KEY)}
          >
            <FiNavigation size={11.5} />
            <span>
              출생·사망{hasBurial ? '·묘소' : ''} 전체 동선 지도 보기 ({pinnedStopsCount}곳)
            </span>
          </QuickTrajectoryBtn>
        </QuickTrajectoryBar>
      )}

      {openStopKey !== null && allMappableStops.length > 0 && (
        <PersonSpatialMapPanel
          personName={personDisplayName}
          stops={allMappableStops}
          activeStopKey={openStopKey}
          onSelectStopKey={(nextKey) => setOpenStopKey(nextKey)}
          onClose={() => setOpenStopKey(null)}
        />
      )}
    </div>
  )
}

const PlaceValueStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const PlacePrimaryLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const ModernEquivalentLine = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PlaceClaimNote = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`

const MapActionInline = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const InlineMapToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.colors.primary
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.14)'
          : 'rgba(15, 23, 42, 0.12)'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.22)'
        : 'rgba(99, 102, 241, 0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.85)'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#4338ca'
      : theme.colors.text.secondary};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  }
`

const InlineExternalAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.08)'};
  }
`

const MetaBadge = styled.span<{ $tone: 'probable' | 'unknown' | 'alt' }>`
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ $tone, theme }) =>
    $tone === 'alt'
      ? theme.mode === 'dark'
        ? 'rgba(168, 85, 247, 0.18)'
        : 'rgba(168, 85, 247, 0.1)'
      : $tone === 'probable'
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.16)'
          : 'rgba(245, 158, 11, 0.1)'
        : theme.mode === 'dark'
          ? 'rgba(148, 163, 184, 0.16)'
          : 'rgba(100, 116, 139, 0.1)'};
  color: ${({ $tone, theme }) =>
    $tone === 'alt'
      ? theme.mode === 'dark'
        ? '#d8b4fe'
        : '#7e22ce'
      : $tone === 'probable'
        ? theme.mode === 'dark'
          ? '#fcd34d'
          : '#b45309'
        : theme.colors.text.tertiary};
`

const AltClaimsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 3px;
  padding-top: 4px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.1)'};
`

const AltClaimRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const BurialLifeCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.06)'
      : 'rgba(245, 158, 11, 0.04)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(245, 158, 11, 0.22)'
        : 'rgba(245, 158, 11, 0.16)'};
`

const BurialIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#d97706')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(245, 158, 11, 0.18)'
      : 'rgba(245, 158, 11, 0.12)'};
`

const QuickTrajectoryBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 7px;
`

const QuickTrajectoryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 25px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.3)'
        : 'rgba(99, 102, 241, 0.22)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.12)'
      : 'rgba(99, 102, 241, 0.06)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`
