import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowUpRight,
  FiCalendar,
  FiEdit2,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiPlus,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import type { ExportImport } from '@/entities/country/api.trade'
import { toPyramidRows } from '@/entities/country/model/population-pyramid'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
} from '@/entities/political-system/model/political-system'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { cityApi } from '@/shared/api/city'
import type {
  BondYield,
  DemographicIndicator,
  DevelopmentIndicator,
  EconomicIndicator,
} from '@/shared/api/country-indicators'
import type { PoliticalSystem } from '@/shared/api/political-system'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  formatCountryPeriod,
  getCountryYearRange,
} from '@/shared/lib/country-period'
import {
  buildHeadquartersGoogleMapsSpec,
  clampValidWgs84,
} from '@/shared/ui/headquarters-location-field/headquarters-google-map.lib'

import type {
  CenturyDomainBucket,
  ContinentComparison,
  CurrentCabinetSummary,
  CurrentHead,
  ElectionSummary,
  MilitaryBranchSummary,
  WarOutcomeSummary,
} from '../../model/use-country-dashboard-stats'
import { formatAreaValue, formatPopulation } from '../dashboard-panels/format'
import { formatMetricValue } from '../dashboard-panels/indicator-trend-chart'
import { buildComposition } from '../dashboard-panels/trade-composition'
import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoDivider,
  BentoHeaderActions,
  BentoPill,
  BentoSubLabel,
  HdiScaleBar,
  MilitaryForceInfographicBlock,
  MiniSvgSparkline,
  PercentileBulletBar,
  type SegmentSlice,
  StackedCenturyDomainChart,
  StackedSegmentBar,
} from './bento-primitives'

const PARTY_FALLBACK_PALETTE = [
  '#4f46e5',
  '#0284c7',
  '#0d9488',
  '#d97706',
  '#db2777',
  '#64748b',
]

/* ─── 1. Governance & Power Architecture Bento Card ──────────────────────── */

export function GovernancePowerBentoCard({
  description,
  currentPolity,
  isBridgedPolity,
  currentHeads,
  currentCabinet,
  nextElection,
  recentElection,
  onEditCountry,
  onOpenPoliticalSystem,
  onOpenCabinets,
  onOpenElections,
  onSelectPerson,
}: {
  description?: string | null
  currentPolity: PoliticalSystem | null
  isBridgedPolity: boolean
  currentHeads: CurrentHead[]
  currentCabinet: CurrentCabinetSummary | null
  nextElection: ElectionSummary | null
  recentElection: ElectionSummary | null
  onEditCountry?: () => void
  onOpenPoliticalSystem: () => void
  onOpenCabinets: (cabinetId?: string | null) => void
  onOpenElections: (electionId?: string) => void
  onSelectPerson: (personId: string) => void
}) {
  const [descExpanded, setDescExpanded] = useState(false)
  const cleanDesc = description?.trim() ?? ''
  const isLongDesc = cleanDesc.length > 170

  const polityBadges = useMemo(() => {
    if (!currentPolity) return []
    const items: string[] = []
    if (currentPolity.stateStructure) {
      items.push(STATE_STRUCTURE_LABEL[currentPolity.stateStructure])
    }
    if (currentPolity.governmentForm) {
      items.push(GOVERNMENT_FORM_LABEL[currentPolity.governmentForm])
    }
    if (currentPolity.legislatureType) {
      items.push(LEGISLATURE_TYPE_LABEL[currentPolity.legislatureType])
    }
    if (currentPolity.partySystem) {
      items.push(PARTY_SYSTEM_LABEL[currentPolity.partySystem])
    }
    return items
  }, [currentPolity])

  const seatSlices = useMemo<SegmentSlice[]>(() => {
    if (!currentPolity) return []
    const out: SegmentSlice[] = []
    if (currentPolity.lowerHouseSeats && currentPolity.lowerHouseSeats > 0) {
      out.push({
        key: 'lower',
        label:
          currentPolity.lowerHouseName?.trim() ||
          primaryHouseLabel(currentPolity.legislatureType ?? null),
        value: currentPolity.lowerHouseSeats,
        color: '#4f46e5',
        meta: `${currentPolity.lowerHouseSeats.toLocaleString('ko-KR')}석`,
      })
    }
    if (
      currentPolity.legislatureType === 'BICAMERAL' &&
      currentPolity.upperHouseSeats &&
      currentPolity.upperHouseSeats > 0
    ) {
      out.push({
        key: 'upper',
        label: currentPolity.upperHouseName?.trim() || '상원',
        value: currentPolity.upperHouseSeats,
        color: '#0ea5e9',
        meta: `${currentPolity.upperHouseSeats.toLocaleString('ko-KR')}석`,
      })
    }
    return out
  }, [currentPolity])

  const cabinetPartySlices = useMemo<SegmentSlice[]>(() => {
    if (!currentCabinet?.partyDistribution.length) return []
    return currentCabinet.partyDistribution.map((item, idx) => ({
      key: item.partyId ?? `party-${idx}`,
      label: item.partyName,
      value: item.count,
      color:
        item.color || PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length],
      meta: `${item.count}명`,
    }))
  }, [currentCabinet])

  const activeElection = nextElection ?? recentElection
  const electionTag = useMemo(() => {
    if (!activeElection) return null
    const diffDays = Math.round(
      (new Date(activeElection.pollDate).getTime() - Date.now()) / 86_400_000,
    )
    if (!Number.isFinite(diffDays)) return activeElection.pollDate.slice(0, 10)
    if (diffDays > 0) return `D-${diffDays}`
    if (diffDays === 0) return '오늘 투표'
    return `${activeElection.pollDate.slice(0, 10)} 실시`
  }, [activeElection])

  return (
    <BentoCard aria-label="헌정 체제 및 통치 권력 구조">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>헌정 체제 · 현직 통치 구조</BentoCardTitle>
          {currentPolity ? (
            <BentoCardBadge>
              {isBridgedPolity ? '전신 체제 참조' : currentPolity.name}
            </BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" onClick={onOpenPoliticalSystem}>
            정체 <FiArrowUpRight size={11} />
          </BentoActionBtn>
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => onOpenCabinets(currentCabinet?.cabinetId)}
          >
            내각·행정 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {/* 1. 국가 핵심 개요문 (3줄 클램프) */}
        {cleanDesc ? (
          <OverviewProseBox>
            <OverviewProseText $clamped={isLongDesc && !descExpanded}>
              {cleanDesc}
            </OverviewProseText>
            <OverviewProseFoot>
              {isLongDesc ? (
                <TextActionBtn
                  type="button"
                  onClick={() => setDescExpanded((p) => !p)}
                >
                  {descExpanded ? '접기' : '더보기'}
                </TextActionBtn>
              ) : null}
              {onEditCountry ? (
                <TextActionBtn type="button" onClick={onEditCountry}>
                  <FiEdit2 size={10.5} /> 개요 수정
                </TextActionBtn>
              ) : null}
            </OverviewProseFoot>
          </OverviewProseBox>
        ) : onEditCountry ? (
          <EmptyInlinePrompt type="button" onClick={onEditCountry}>
            <FiPlus size={12} /> 국가 한 줄 소개·개요 추가하기
          </EmptyInlinePrompt>
        ) : null}

        {/* 2. 체제 배지 아키텍처 */}
        {polityBadges.length > 0 ? (
          <BadgeCluster>
            {polityBadges.map((badge) => (
              <ArchBadge key={badge}>{badge}</ArchBadge>
            ))}
            {currentPolity ? (
              <PeriodSpan>{formatPeriod(currentPolity)}</PeriodSpan>
            ) : null}
          </BadgeCluster>
        ) : (
          <EmptyInlinePrompt type="button" onClick={onOpenPoliticalSystem}>
            <FiPlus size={12} /> 대통령제·의원내각제 등 헌정 체제 등록
          </EmptyInlinePrompt>
        )}

        {/* 3. 현직 국가원수 · 정부수반 초상 스트립 */}
        {currentHeads.length > 0 ? (
          <HeadsGrid>
            {currentHeads.slice(0, 2).map((head) => {
              const avatarSrc = head.profileImageUrl
                ? getUploadImageUrl(head.profileImageUrl)
                : null
              return (
                <HeadCardBtn
                  key={head.tenureId}
                  type="button"
                  onClick={() =>
                    head.personId
                      ? onSelectPerson(head.personId)
                      : onOpenCabinets(currentCabinet?.cabinetId)
                  }
                >
                  <HeadAvatar>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" />
                    ) : (
                      <FiUser size={14} />
                    )}
                  </HeadAvatar>
                  <HeadMeta>
                    <HeadRole>{head.positionTitle}</HeadRole>
                    <HeadName>{head.personName}</HeadName>
                    {head.startDate ? (
                      <HeadSince>{head.startDate.slice(0, 10)} 취임</HeadSince>
                    ) : null}
                  </HeadMeta>
                </HeadCardBtn>
              )
            })}
          </HeadsGrid>
        ) : null}

        {/* 4. 내각 정당 지분 스택바 & 의회 의석 비율 바 */}
        {cabinetPartySlices.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 6 }}>
              <span>
                {currentCabinet?.name ?? '현 내각'} 각료 정당 분포 (
                {currentCabinet?.ministerCount ?? 0}명)
              </span>
            </BentoSubLabel>
            <StackedSegmentBar slices={cabinetPartySlices} height={9} />
          </div>
        ) : null}

        {seatSlices.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 6 }}>
              <span>입법부 의석 구성</span>
            </BentoSubLabel>
            <StackedSegmentBar slices={seatSlices} height={8} />
          </div>
        ) : null}

        {/* 5. 직전 / 차기 선거 스냅샷 */}
        {activeElection ? (
          <>
            <BentoDivider />
            <ElectionBarBtn
              type="button"
              onClick={() => onOpenElections(activeElection.id)}
            >
              <ElectionBarLeft>
                <FiCalendar size={12} />
                <span className="kind">
                  {nextElection ? '차기 예정 선거' : '최근 실시 선거'}
                </span>
                <strong>{activeElection.name}</strong>
              </ElectionBarLeft>
              {electionTag ? <BentoPill $accent>{electionTag}</BentoPill> : null}
            </ElectionBarBtn>
          </>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 2. National Scale & Continental Percentile Bento Card ──────────────── */

export function NationalScaleBentoCard({
  popNum,
  popYearNote,
  areaNum,
  densityText,
  capitalText,
  cityCount,
  continentComparison,
  latestGdp,
  latestGdpPerCapita,
  latestHdi,
  onOpenDemographics,
  onOpenRegions,
  onOpenEconomics,
  onOpenDataManager,
}: {
  popNum: number | null
  popYearNote: string | null
  areaNum: number | null
  densityText: string | null
  capitalText: string
  cityCount: number
  continentComparison: ContinentComparison
  latestGdp: EconomicIndicator | null
  latestGdpPerCapita: EconomicIndicator | null
  latestHdi: DevelopmentIndicator | null
  onOpenDemographics: () => void
  onOpenRegions: () => void
  onOpenEconomics: () => void
  onOpenDataManager: () => void
}) {
  const hdiVal =
    latestHdi?.hdi != null && Number.isFinite(Number(latestHdi.hdi))
      ? Number(latestHdi.hdi)
      : null

  return (
    <BentoCard aria-label="국력 규모 및 대륙 백분위 지표">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>국력 스케일 · 대륙 포지션</BentoCardTitle>
          {continentComparison.totalCount > 1 ? (
            <BentoCardBadge>
              대륙 {continentComparison.totalCount}개국 비교
            </BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" onClick={onOpenDataManager}>
            지표 입력
          </BentoActionBtn>
          <BentoActionBtn type="button" $accent onClick={onOpenEconomics}>
            경제·통계 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <ScaleCellsGrid>
        {/* 1. 인구 + 대륙 백분위 */}
        <ScaleCellBtn type="button" onClick={onOpenDemographics}>
          <ScaleCellLabel>인구 규모</ScaleCellLabel>
          <ScaleCellValue $muted={popNum == null}>
            {popNum != null ? formatPopulation(popNum) : '미등록'}
          </ScaleCellValue>
          {popNum != null && continentComparison.populationRank != null ? (
            <PercentileBulletBar
              rank={continentComparison.populationRank}
              total={continentComparison.populationRankTotal}
              deltaPct={continentComparison.populationDeltaPct}
            />
          ) : (
            <ScaleCellSub>{popYearNote ?? '인구 지표 탭 열기'}</ScaleCellSub>
          )}
        </ScaleCellBtn>

        {/* 2. 면적 + 대륙 백분위 */}
        <ScaleCellBtn type="button" onClick={onOpenRegions}>
          <ScaleCellLabel>영토 면적</ScaleCellLabel>
          <ScaleCellValue $muted={areaNum == null}>
            {areaNum != null ? formatAreaValue(areaNum) : '미등록'}
          </ScaleCellValue>
          {areaNum != null && continentComparison.areaRank != null ? (
            <PercentileBulletBar
              rank={continentComparison.areaRank}
              total={continentComparison.areaRankTotal}
              deltaPct={continentComparison.areaDeltaPct}
            />
          ) : (
            <ScaleCellSub>지리·행정구역 탭 열기</ScaleCellSub>
          )}
        </ScaleCellBtn>

        {/* 3. 명목 GDP */}
        <ScaleCellBtn type="button" onClick={onOpenEconomics}>
          <ScaleCellLabel>명목 GDP</ScaleCellLabel>
          <ScaleCellValue $muted={latestGdp?.gdp == null}>
            {latestGdp?.gdp != null
              ? formatMetricValue(latestGdp.gdp, 'USD')
              : '미등록'}
          </ScaleCellValue>
          <ScaleCellSub>
            {latestGdp ? `${latestGdp.year}년 기준` : '거시경제 지표 등록'}
          </ScaleCellSub>
        </ScaleCellBtn>

        {/* 4. 1인당 GDP */}
        <ScaleCellBtn type="button" onClick={onOpenEconomics}>
          <ScaleCellLabel>1인당 GDP</ScaleCellLabel>
          <ScaleCellValue $muted={latestGdpPerCapita?.gdpPerCapita == null}>
            {latestGdpPerCapita?.gdpPerCapita != null
              ? formatMetricValue(latestGdpPerCapita.gdpPerCapita, 'USD_CAPITA')
              : '미등록'}
          </ScaleCellValue>
          <ScaleCellSub>
            {latestGdpPerCapita
              ? `${latestGdpPerCapita.year}년 기준`
              : '거시경제 지표 등록'}
          </ScaleCellSub>
        </ScaleCellBtn>

        {/* 5. 수도 · 인구밀도 */}
        <ScaleCellBtn type="button" onClick={onOpenRegions}>
          <ScaleCellLabel>수도 · 인구 밀도</ScaleCellLabel>
          <ScaleCellValue $muted={!capitalText && !densityText}>
            {capitalText || densityText || '미등록'}
          </ScaleCellValue>
          <ScaleCellSub>
            {[
              capitalText && densityText ? `밀도 ${densityText}` : null,
              cityCount > 0 ? `등록 행정구역 ${cityCount}곳` : null,
            ]
              .filter(Boolean)
              .join(' · ') || '수도·행정구역 보기'}
          </ScaleCellSub>
        </ScaleCellBtn>

        {/* 6. 인간개발지수 (HDI) 4단계 게이지 */}
        <ScaleCellBtn type="button" onClick={onOpenEconomics}>
          <ScaleCellLabel>인간개발지수 (HDI)</ScaleCellLabel>
          <ScaleCellValue $muted={hdiVal == null}>
            {hdiVal != null ? hdiVal.toFixed(3) : '미등록'}
          </ScaleCellValue>
          {hdiVal != null ? (
            <HdiScaleBar hdi={hdiVal} />
          ) : (
            <ScaleCellSub>사회·발전 지표 등록</ScaleCellSub>
          )}
        </ScaleCellBtn>
      </ScaleCellsGrid>
    </BentoCard>
  )
}

/* ─── 3. Always-Visible 4-Column Macro Sparklines Strip ──────────────────── */

export function MacroSparklinesBentoStrip({
  economicIndicators,
  bondYields,
  onOpenEconomics,
  onOpenBonds,
  onOpenDataManager,
}: {
  economicIndicators: EconomicIndicator[]
  bondYields: BondYield[]
  onOpenEconomics: () => void
  onOpenBonds: () => void
  onOpenDataManager: () => void
}) {
  const theme = useTheme()

  const cards = useMemo(() => {
    const sortedEco = [...economicIndicators].sort((a, b) => a.year - b.year)
    const gdpPts = sortedEco
      .filter((r) => r.gdp != null && Number.isFinite(Number(r.gdp)))
      .map((r) => ({ year: r.year, value: Number(r.gdp) }))
    const gdpCapPts = sortedEco
      .filter(
        (r) =>
          r.gdpPerCapita != null && Number.isFinite(Number(r.gdpPerCapita)),
      )
      .map((r) => ({ year: r.year, value: Number(r.gdpPerCapita) }))
    const growthPts = sortedEco
      .filter(
        (r) =>
          r.gdpGrowthRate != null && Number.isFinite(Number(r.gdpGrowthRate)),
      )
      .map((r) => ({ year: r.year, value: Number(r.gdpGrowthRate) }))
    const debtPts = sortedEco
      .filter(
        (r) =>
          r.debtToGdpRatio != null && Number.isFinite(Number(r.debtToGdpRatio)),
      )
      .map((r) => ({ year: r.year, value: Number(r.debtToGdpRatio) }))

    const y10Pts = [...bondYields]
      .filter(
        (b) =>
          b.maturity === 'Y10' &&
          b.yieldRate != null &&
          Number.isFinite(Number(b.yieldRate)),
      )
      .sort((a, b) => a.year - b.year)
      .map((b) => ({ year: b.year, value: Number(b.yieldRate) }))

    const deltaBadge = (
      pts: Array<{ year: number; value: number }>,
      isPctPoint = false,
    ): string | null => {
      if (pts.length < 2) return null
      const prev = pts[pts.length - 2].value
      const curr = pts[pts.length - 1].value
      if (isPctPoint) {
        const diff = curr - prev
        return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%p`
      }
      if (prev === 0) return null
      const pct = ((curr - prev) / Math.abs(prev)) * 100
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
    }

    const out: Array<{
      key: string
      label: string
      latestText: string
      subText: string
      delta: string | null
      points: Array<{ year: number; value: number }>
      color: string
      zeroLine?: boolean
      onClick: () => void
    }> = []

    if (gdpPts.length > 0) {
      const last = gdpPts[gdpPts.length - 1]
      out.push({
        key: 'gdp',
        label: '명목 GDP 추이',
        latestText: formatMetricValue(last.value, 'USD'),
        subText: `${last.year}년`,
        delta: deltaBadge(gdpPts),
        points: gdpPts,
        color: ledgerAccent(theme.mode),
        onClick: onOpenEconomics,
      })
    }
    if (gdpCapPts.length > 0) {
      const last = gdpCapPts[gdpCapPts.length - 1]
      out.push({
        key: 'gdpCap',
        label: '1인당 GDP 추이',
        latestText: formatMetricValue(last.value, 'USD_CAPITA'),
        subText: `${last.year}년`,
        delta: deltaBadge(gdpCapPts),
        points: gdpCapPts,
        color: theme.mode === 'dark' ? '#38bdf8' : '#0284c7',
        onClick: onOpenEconomics,
      })
    }
    if (growthPts.length > 0) {
      const last = growthPts[growthPts.length - 1]
      out.push({
        key: 'growth',
        label: '실질 경제성장률',
        latestText: `${last.value.toFixed(1)}%`,
        subText: `${last.year}년`,
        delta: deltaBadge(growthPts, true),
        points: growthPts,
        color: theme.mode === 'dark' ? '#34d399' : '#059669',
        zeroLine: true,
        onClick: onOpenEconomics,
      })
    }
    if (y10Pts.length > 0) {
      const last = y10Pts[y10Pts.length - 1]
      out.push({
        key: 'bond10y',
        label: '10년물 국채금리',
        latestText: `${last.value.toFixed(2)}%`,
        subText: `${last.year}년`,
        delta: deltaBadge(y10Pts, true),
        points: y10Pts,
        color: theme.mode === 'dark' ? '#fbbf24' : '#b45309',
        onClick: onOpenBonds,
      })
    } else if (debtPts.length > 0) {
      const last = debtPts[debtPts.length - 1]
      out.push({
        key: 'debt',
        label: 'GDP 대비 국가채무',
        latestText: `${last.value.toFixed(1)}%`,
        subText: `${last.year}년`,
        delta: deltaBadge(debtPts, true),
        points: debtPts,
        color: theme.mode === 'dark' ? '#fbbf24' : '#b45309',
        onClick: onOpenEconomics,
      })
    }

    return out
  }, [economicIndicators, bondYields, theme.mode, onOpenEconomics, onOpenBonds])

  if (cards.length === 0) return null

  return (
    <BentoCard aria-label="거시경제 시계열 추이 스파크라인">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <FiTrendingUp size={14} />
          <BentoCardTitle>거시경제 핵심 추이</BentoCardTitle>
          <BentoCardBadge>{cards.length}개 지표</BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" onClick={onOpenDataManager}>
            시계열 편집
          </BentoActionBtn>
          <BentoActionBtn type="button" $accent onClick={onOpenEconomics}>
            전체 지표 차트 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <SparkGrid $cols={cards.length}>
        {cards.map((card) => (
          <SparkCardBtn key={card.key} type="button" onClick={card.onClick}>
            <SparkHeadRow>
              <SparkTitle>{card.label}</SparkTitle>
              {card.delta ? <DeltaChip>{card.delta}</DeltaChip> : null}
            </SparkHeadRow>
            <SparkBigNum>
              {card.latestText}
              <SparkYear>{card.subText}</SparkYear>
            </SparkBigNum>
            <MiniSvgSparkline
              points={card.points}
              color={card.color}
              height={56}
              showZeroLine={card.zeroLine}
            />
          </SparkCardBtn>
        ))}
      </SparkGrid>
    </BentoCard>
  )
}

/* ─── 4. Demographics & Mini Population Pyramid Bento Card ───────────────── */

export function DemographicsBentoCard({
  demographicIndicators,
  ethnicityCount,
  onOpenPyramid,
  onOpenEthnicity,
  onOpenDataManager,
}: {
  demographicIndicators: DemographicIndicator[]
  ethnicityCount: number
  onOpenPyramid: () => void
  onOpenEthnicity: () => void
  onOpenDataManager: () => void
}) {
  const theme = useTheme()

  const { latestDemo, latestPyramid, ageShareSlices } = useMemo(() => {
    const sorted = [...demographicIndicators].sort((a, b) => b.year - a.year)
    const latest = sorted[0] ?? null
    const withPyr = sorted.find((row) => toPyramidRows(row).length > 0) ?? null
    const pyrRows = withPyr ? toPyramidRows(withPyr) : []

    let young = 0
    let working = 0
    let senior = 0
    pyrRows.forEach((r, idx) => {
      if (idx <= 1) young += r.total
      else if (idx <= 5) working += r.total
      else senior += r.total
    })
    const slices: SegmentSlice[] =
      young + working + senior > 0
        ? [
            {
              key: 'young',
              label: '유소년 (0–19)',
              value: young,
              color: theme.mode === 'dark' ? '#38bdf8' : '#0284c7',
            },
            {
              key: 'working',
              label: '생산연령 (20–59)',
              value: working,
              color: ledgerAccent(theme.mode),
            },
            {
              key: 'senior',
              label: '고령 (60+)',
              value: senior,
              color: theme.mode === 'dark' ? '#fbbf24' : '#d97706',
            },
          ]
        : []

    return {
      latestDemo: latest,
      latestPyramid: withPyr ? { year: withPyr.year, rows: pyrRows } : null,
      ageShareSlices: slices,
    }
  }, [demographicIndicators, theme.mode])

  if (!latestDemo && !latestPyramid && ethnicityCount === 0) return null

  const maxSide = latestPyramid
    ? Math.max(
        1,
        ...latestPyramid.rows.flatMap((r) => [r.male, r.female]),
      )
    : 1

  const tfr =
    latestDemo?.fertilityRate != null &&
    Number.isFinite(Number(latestDemo.fertilityRate))
      ? Number(latestDemo.fertilityRate)
      : null
  const lifeExp =
    latestDemo?.lifeExpectancy != null &&
    Number.isFinite(Number(latestDemo.lifeExpectancy))
      ? Number(latestDemo.lifeExpectancy)
      : null
  const medianAge =
    latestDemo?.medianAge != null &&
    Number.isFinite(Number(latestDemo.medianAge))
      ? Number(latestDemo.medianAge)
      : null
  const urbanRate =
    latestDemo?.urbanizationRate != null &&
    Number.isFinite(Number(latestDemo.urbanizationRate))
      ? Number(latestDemo.urbanizationRate)
      : null

  return (
    <BentoCard aria-label="인구 구조 및 연령 피라미드 인포그래픽">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>인구 구조 · 연령 피라미드</BentoCardTitle>
          {latestPyramid ? (
            <BentoCardBadge>{latestPyramid.year}년</BentoCardBadge>
          ) : latestDemo ? (
            <BentoCardBadge>{latestDemo.year}년</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {ethnicityCount > 0 ? (
            <BentoActionBtn type="button" onClick={onOpenEthnicity}>
              민족 {ethnicityCount} <FiArrowUpRight size={11} />
            </BentoActionBtn>
          ) : null}
          <BentoActionBtn type="button" $accent onClick={onOpenPyramid}>
            인구 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {latestPyramid ? (
          <MiniPyramidWrap onClick={onOpenPyramid} role="button" tabIndex={0}>
            <PyramidLegendRow>
              <span className="male">◀ 남성</span>
              <span>연령대</span>
              <span className="female">여성 ▶</span>
            </PyramidLegendRow>
            <PyramidRows>
              {[...latestPyramid.rows].reverse().map((row) => {
                const mPct = Math.round((row.male / maxSide) * 100)
                const fPct = Math.round((row.female / maxSide) * 100)
                return (
                  <PyramidLine key={row.bracket}>
                    <PyramidHalf $align="right">
                      <PyramidBarMale style={{ width: `${mPct}%` }} />
                    </PyramidHalf>
                    <PyramidBracket>{row.bracket}</PyramidBracket>
                    <PyramidHalf $align="left">
                      <PyramidBarFemale style={{ width: `${fPct}%` }} />
                    </PyramidHalf>
                  </PyramidLine>
                )
              })}
            </PyramidRows>
          </MiniPyramidWrap>
        ) : (
          <EmptyInlinePrompt type="button" onClick={onOpenDataManager}>
            <FiPlus size={12} /> 연령대별 인구 피라미드 데이터 입력하기
          </EmptyInlinePrompt>
        )}

        {ageShareSlices.length > 0 ? (
          <StackedSegmentBar slices={ageShareSlices} height={8} showPercent />
        ) : null}

        {(tfr != null ||
          lifeExp != null ||
          medianAge != null ||
          urbanRate != null) && (
          <DemoMetricsRow>
            {tfr != null ? (
              <DemoMetricBox>
                <span>합계출산율</span>
                <strong>{tfr.toFixed(2)}명</strong>
                <small>{tfr >= 2.1 ? '대체수준 이상' : '대체(2.1) 미달'}</small>
              </DemoMetricBox>
            ) : null}
            {lifeExp != null ? (
              <DemoMetricBox>
                <span>기대수명</span>
                <strong>{lifeExp.toFixed(1)}세</strong>
              </DemoMetricBox>
            ) : null}
            {medianAge != null ? (
              <DemoMetricBox>
                <span>중위연령</span>
                <strong>{medianAge.toFixed(1)}세</strong>
              </DemoMetricBox>
            ) : null}
            {urbanRate != null ? (
              <DemoMetricBox>
                <span>도시화율</span>
                <strong>{urbanRate.toFixed(1)}%</strong>
              </DemoMetricBox>
            ) : null}
          </DemoMetricsRow>
        )}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 5. Trade Balance & Corporate Ecosystem Bento Card ──────────────────── */

export function TradeAndIndustryBentoCard({
  exportImports,
  companyCount,
  companiesBySector,
  onOpenTrade,
  onOpenCompanies,
}: {
  exportImports: ExportImport[]
  companyCount: number
  companiesBySector: Array<{ label: string; count: number }>
  onOpenTrade: () => void
  onOpenCompanies: () => void
}) {
  const theme = useTheme()

  const latestTrade = useMemo(() => {
    const sorted = [...exportImports].sort((a, b) => b.year - a.year)
    return sorted[0] ?? null
  }, [exportImports])

  const exportComp = useMemo(() => {
    if (!latestTrade) return null
    const expItems = (latestTrade.items ?? []).filter(
      (i) => i.direction === 'EXPORT',
    )
    if (expItems.length === 0) return null
    return buildComposition(
      expItems,
      latestTrade.exportValue != null ? Number(latestTrade.exportValue) : null,
      theme.mode === 'dark',
    )
  }, [latestTrade, theme.mode])

  if (!latestTrade && companyCount === 0) return null

  const expVal =
    latestTrade?.exportValue != null ? Number(latestTrade.exportValue) : 0
  const impVal =
    latestTrade?.importValue != null ? Number(latestTrade.importValue) : 0
  const maxTrade = Math.max(1, expVal, impVal)
  const balance = expVal - impVal

  const sectorSlices: SegmentSlice[] = companiesBySector
    .slice(0, 5)
    .map((s, idx) => ({
      key: s.label,
      label: s.label,
      value: s.count,
      color: PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length],
    }))

  return (
    <BentoCard aria-label="대외 교역 수지 및 기업 산업군 분포">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>교역 수지 · 주력 품목 · 기업</BentoCardTitle>
          {latestTrade ? (
            <BentoCardBadge>{latestTrade.year}년 교역</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {companyCount > 0 ? (
            <BentoActionBtn type="button" onClick={onOpenCompanies}>
              기업 {companyCount} <FiArrowUpRight size={11} />
            </BentoActionBtn>
          ) : null}
          <BentoActionBtn type="button" $accent onClick={onOpenTrade}>
            교역 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {latestTrade ? (
          <TradeBalanceBox onClick={onOpenTrade} role="button" tabIndex={0}>
            <TradeDirRow>
              <TradeDirLabel>수출</TradeDirLabel>
              <TradeBarTrack>
                <TradeBarFill
                  $tone="export"
                  style={{ width: `${Math.max(4, (expVal / maxTrade) * 100)}%` }}
                />
              </TradeBarTrack>
              <TradeDirVal>{formatMetricValue(expVal, 'USD')}</TradeDirVal>
            </TradeDirRow>

            <TradeDirRow>
              <TradeDirLabel>수입</TradeDirLabel>
              <TradeBarTrack>
                <TradeBarFill
                  $tone="import"
                  style={{ width: `${Math.max(4, (impVal / maxTrade) * 100)}%` }}
                />
              </TradeBarTrack>
              <TradeDirVal>{formatMetricValue(impVal, 'USD')}</TradeDirVal>
            </TradeDirRow>

            <BalanceCallout $surplus={balance >= 0}>
              <span>{balance >= 0 ? '무역흑자' : '무역적자'}</span>
              <strong>
                {balance >= 0 ? '+' : '−'}
                {formatMetricValue(Math.abs(balance), 'USD')}
              </strong>
            </BalanceCallout>
          </TradeBalanceBox>
        ) : null}

        {exportComp && exportComp.slices.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 6 }}>
              <span>주력 수출 품목 구성</span>
              {exportComp.coverage != null ? (
                <span>분류 커버리지 {Math.round(exportComp.coverage)}%</span>
              ) : null}
            </BentoSubLabel>
            <StackedSegmentBar
              slices={exportComp.slices.slice(0, 5).map((sl) => ({
                key: sl.key,
                label: sl.name,
                value: sl.pct,
                color: sl.color,
                meta: `${sl.pct.toFixed(1)}%`,
              }))}
              height={10}
            />
          </div>
        ) : null}

        {sectorSlices.length > 0 ? (
          <>
            {latestTrade ? <BentoDivider /> : null}
            <div>
              <BentoSubLabel style={{ marginBottom: 6 }}>
                <span>등록 기업 업종·상태 분포 ({companyCount}개사)</span>
              </BentoSubLabel>
              <StackedSegmentBar slices={sectorSlices} height={8} />
            </div>
          </>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 6. Lineage Spine + Century Event Rhythm + Military Force Card ──────── */

export function ModernHistoryForceBentoCard({
  countryName,
  historicalCountries,
  eventCount,
  centuryBuckets,
  domainBreakdown,
  militaryCount,
  highCommandCount,
  militaryBranchBreakdown,
  warSummary,
  onOpenHistoricalTab,
  onSelectHistoricalCountry,
  onSelectCentury,
  onOpenEvents,
  onOpenMilitary,
}: {
  countryName: string
  historicalCountries: NonNullable<UnifiedCountry['historicalCountries']>
  eventCount: number
  centuryBuckets: CenturyDomainBucket[]
  domainBreakdown: Array<{ domain: string; count: number }>
  militaryCount: number
  highCommandCount: number
  militaryBranchBreakdown: MilitaryBranchSummary[]
  warSummary: WarOutcomeSummary
  onOpenHistoricalTab: () => void
  onSelectHistoricalCountry: (id: string) => void
  onSelectCentury: (century: number) => void
  onOpenEvents: () => void
  onOpenMilitary: () => void
}) {
  const lineageChain = useMemo(() => {
    const preds = historicalCountries.filter(
      (h) => h.linkKind === 'PREDECESSOR',
    )
    const pool = preds.length > 0 ? preds : historicalCountries
    return [...pool]
      .sort((a, b) => {
        const rA = getCountryYearRange(a)
        const rB = getCountryYearRange(b)
        return (rA.start ?? 9999) - (rB.start ?? 9999)
      })
      .slice(-6)
  }, [historicalCountries])

  if (
    lineageChain.length === 0 &&
    centuryBuckets.length === 0 &&
    militaryCount === 0
  ) {
    return null
  }

  return (
    <BentoCard aria-label="통사 국가 계보 및 사건·군사 리듬">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>통사 계보 · 세기별 사건 · 군사력</BentoCardTitle>
          {eventCount > 0 ? (
            <BentoCardBadge>사건 {eventCount}건</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {historicalCountries.length > 0 ? (
            <BentoActionBtn type="button" onClick={onOpenHistoricalTab}>
              과거국가 {historicalCountries.length}{' '}
              <FiArrowUpRight size={11} />
            </BentoActionBtn>
          ) : null}
          <BentoActionBtn type="button" $accent onClick={onOpenEvents}>
            사건 연표 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {/* 1. 직계 전신 → 현대 국가 타임라인 스파인 */}
        {lineageChain.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 7 }}>
              <span>국가 계승 스파인</span>
              {historicalCountries.length > lineageChain.length ? (
                <span>최근 {lineageChain.length}대 표시</span>
              ) : null}
            </BentoSubLabel>
            <LineageSpineRow>
              {lineageChain.map((hc) => (
                <React.Fragment key={hc.id}>
                  <LineageNodePill
                    type="button"
                    onClick={() => onSelectHistoricalCountry(hc.id)}
                  >
                    <strong>{hc.name}</strong>
                    <small>{formatCountryPeriod(hc)}</small>
                  </LineageNodePill>
                  <SpineArrow aria-hidden="true">→</SpineArrow>
                </React.Fragment>
              ))}
              <LineageCurrentPill>{countryName}</LineageCurrentPill>
            </LineageSpineRow>
          </div>
        ) : null}

        {/* 2. 세기별 사건 도메인 스택 히스토그램 */}
        {centuryBuckets.length > 0 ? (
          <>
            {lineageChain.length > 0 ? <BentoDivider /> : null}
            <div>
              <BentoSubLabel style={{ marginBottom: 4 }}>
                <span>세기별 역사 사건 밀도 · 분야 분포</span>
                <span>막대 클릭 시 세기 필터</span>
              </BentoSubLabel>
              <StackedCenturyDomainChart
                buckets={centuryBuckets}
                domainBreakdown={domainBreakdown}
                onSelectCentury={onSelectCentury}
              />
            </div>
          </>
        ) : null}

        {/* 3. 군사 전력 · 참전 요약 */}
        {militaryCount > 0 || warSummary.totalMilitaryEvents > 0 ? (
          <>
            {lineageChain.length > 0 || centuryBuckets.length > 0 ? (
              <BentoDivider />
            ) : null}
            <MilitaryForceInfographicBlock
              militaryCount={militaryCount}
              highCommandCount={highCommandCount}
              branchBreakdown={militaryBranchBreakdown}
              warSummary={warSummary}
              onOpenMilitary={onOpenMilitary}
            />
          </>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 7. Clean Compact Locator Map & Administrative Divisions Card ───────── */

export function CompactGeoBentoCard({
  country,
  cityCount,
  onOpenRegions,
}: {
  country: UnifiedCountry
  cityCount: number
  onOpenRegions: (divisionId?: string) => void
}) {
  const [layer, setLayer] = useState<'roadmap' | 'hybrid'>('roadmap')

  const divisionsQuery = useQuery({
    queryKey: ['administrative-divisions-top-preview', country.id],
    queryFn: () =>
      cityApi.getAdministrativeDivisions(
        country.type === 'historical'
          ? { historicalCountryId: country.id }
          : { countryId: country.id },
      ),
    staleTime: 1000 * 60 * 5,
  })

  const topDivisions = useMemo(() => {
    const raw = divisionsQuery.data ?? []
    return raw.slice(0, 8)
  }, [divisionsQuery.data])

  const validCoord = clampValidWgs84(country.latitude, country.longitude)
  const mapSpec = useMemo(
    () =>
      buildHeadquartersGoogleMapsSpec({
        headquarters: country.capital || country.fullName || country.name,
        latitude: validCoord?.lat ?? null,
        longitude: validCoord?.lng ?? null,
        countryName: country.enName || country.name,
        zoom: validCoord ? 5 : 5,
        mapLayer: layer,
      }),
    [country, validCoord, layer],
  )

  return (
    <BentoCard aria-label="지리 위치 및 최상위 행정구역">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <FiGlobe size={13.5} />
          <BentoCardTitle>지리 위치 · 광역 행정구역</BentoCardTitle>
          {cityCount > 0 ? (
            <BentoCardBadge>{cityCount}곳</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn
            type="button"
            onClick={() =>
              setLayer((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
            }
          >
            {layer === 'roadmap' ? '위성' : '일반'}
          </BentoActionBtn>
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => onOpenRegions()}
          >
            지리·행정구역 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <MapIframeWrap>
        {mapSpec ? (
          <>
            <iframe
              title={`${country.name} 위치 지도`}
              src={mapSpec.embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <ExternalMapAnchor
              href={mapSpec.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Google 지도 새 탭에서 열기"
            >
              Google 지도 <FiExternalLink size={10.5} />
            </ExternalMapAnchor>
          </>
        ) : null}
      </MapIframeWrap>

      <BentoCardBody style={{ gap: 8, paddingTop: 12 }}>
        <BentoSubLabel>
          <span>
            <FiMapPin size={11} style={{ marginRight: 3, verticalAlign: -1 }} />
            {country.capital ? `수도: ${country.capital}` : '광역 행정구역'}
          </span>
          {topDivisions.length > 0 ? (
            <span>상위 {topDivisions.length}개 표시</span>
          ) : null}
        </BentoSubLabel>

        {topDivisions.length > 0 ? (
          <DivisionChipsWrap>
            {topDivisions.map((div) => (
              <DivisionChipBtn
                key={div.id}
                type="button"
                onClick={() => onOpenRegions(div.id)}
              >
                {div.name}
              </DivisionChipBtn>
            ))}
          </DivisionChipsWrap>
        ) : (
          <ScaleCellSub>
            지리·행정구역 탭에서 광역 주·도·행정구역과 자연 지리를 관리할 수 있습니다.
          </ScaleCellSub>
        )}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── Styled Components ──────────────────────────────────────────────────── */

const OverviewProseBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const OverviewProseText = styled.p<{ $clamped: boolean }>`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  ${({ $clamped }) =>
    $clamped
      ? `
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `
      : ''}
`

const OverviewProseFoot = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const TextActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const EmptyInlinePrompt = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BadgeCluster = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const ArchBadge = styled.span`
  padding: 2.5px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
`

const PeriodSpan = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const HeadsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
`

const HeadCardBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  text-align: left;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const HeadAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const HeadMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const HeadRole = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeadName = styled.strong`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeadSince = styled.span`
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const ElectionBarBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const ElectionBarLeft = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  .kind {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const ScaleCellsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  flex: 1;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ScaleCellBtn = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  padding: 13px 15px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;

  &:nth-child(2n) {
    border-right: none;
  }

  &:nth-last-child(-n + 2) {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ScaleCellLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ScaleCellValue = styled.div<{ $muted?: boolean }>`
  font-size: 16.5px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const ScaleCellSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const SparkGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => Math.min(4, $cols)}, minmax(0, 1fr));

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const SparkCardBtn = styled.button`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 16px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const SparkHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

const SparkTitle = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DeltaChip = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const SparkBigNum = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const SparkYear = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MiniPyramidWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
`

const PyramidLegendRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;

  .male {
    text-align: right;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#60a5fa' : '#2563eb')};
  }
  .female {
    text-align: left;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f472b6' : '#db2777')};
  }
`

const PyramidRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const PyramidLine = styled.div`
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  align-items: center;
  gap: 4px;
`

const PyramidHalf = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  height: 9px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  border-radius: 2px;
  overflow: hidden;
`

const PyramidBarMale = styled.div`
  height: 100%;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#60a5fa' : '#3b82f6')};
  border-radius: 2px 0 0 2px;
`

const PyramidBarFemale = styled.div`
  height: 100%;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#f472b6' : '#ec4899')};
  border-radius: 0 2px 2px 0;
`

const PyramidBracket = styled.span`
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const DemoMetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 6px;
`

const DemoMetricBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};

  span {
    font-size: 10px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    font-size: 13px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }
  small {
    font-size: 9.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const TradeBalanceBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  cursor: pointer;
`

const TradeDirRow = styled.div`
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 8px;
`

const TradeDirLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TradeBarTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const TradeBarFill = styled.div<{ $tone: 'export' | 'import' }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $tone }) =>
    $tone === 'export'
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? '#94a3b8'
        : '#64748b'};
`

const TradeDirVal = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const BalanceCallout = styled.div<{ $surplus: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  background: ${({ theme, $surplus }) =>
    $surplus
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.14)'
        : 'rgba(16, 185, 129, 0.09)'
      : theme.mode === 'dark'
        ? 'rgba(244, 63, 94, 0.14)'
        : 'rgba(244, 63, 94, 0.09)'};
  color: ${({ theme, $surplus }) =>
    $surplus
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.mode === 'dark'
        ? '#fda4af'
        : '#be123c'};

  strong {
    font-weight: 800;
    ${DIGIT_DISPLAY}
  }
`

const LineageSpineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

const LineageNodePill = styled.button`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  cursor: pointer;

  strong {
    font-size: 11.5px;
    font-weight: 700;
  }
  small {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const SpineArrow = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageCurrentPill = styled.span`
  padding: 6px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 12px;
  font-weight: 800;
`

const MapIframeWrap = styled.div`
  position: relative;
  width: 100%;
  height: 204px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
`

const ExternalMapAnchor = styled.a`
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 10.5px;
  font-weight: 600;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DivisionChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const DivisionChipBtn = styled.button`
  padding: 2.5px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`
