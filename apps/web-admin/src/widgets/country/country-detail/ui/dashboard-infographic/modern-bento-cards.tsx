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

import {
  type AdministrativeDivision,
  useAdministrativeDivisions,
} from '@/entities/country/api.administrative-divisions'
import { useInfrastructures } from '@/entities/country/api.infrastructure'
import { useNaturalFeatures } from '@/entities/country/api.natural-feature'
import type { ExportImport } from '@/entities/country/api.trade'
import { toPyramidRows } from '@/entities/country/model/population-pyramid'
import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  formatTradeValue,
  VALUE_SCALE_MULTIPLIER,
} from '@/entities/trade/vocab'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'
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
import type {
  BondYield,
  DemographicIndicator,
  DevelopmentIndicator,
  EconomicIndicator,
} from '@/shared/api/country-indicators'
import { getElection, labelElectionType } from '@/shared/api/election'
import {
  POLITICAL_POSITION_COLOR,
  POLITICAL_POSITION_LABEL,
  type PoliticalParty,
  type PoliticalPosition,
} from '@/shared/api/political-party'
import type { PoliticalSystem } from '@/shared/api/political-system'
import {
  TREATY_TYPE_LABELS,
  treatyTypeTone,
  type TreatyType,
} from '@/shared/api/treaty'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  formatCountryPeriod,
  getCountryYearRange,
} from '@/shared/lib/country-period'
import { formatPopulationKo } from '@/shared/lib/number-format'
import {
  buildHeadquartersGoogleMapsSpec,
  clampValidWgs84,
} from '@/shared/ui/headquarters-location-field/headquarters-google-map.lib'

import type {
  CenturyDomainBucket,
  CivicInstitutionalSnapshot,
  ContinentComparison,
  CurrentCabinetSummary,
  CurrentHead,
  ElectionSummary,
  ExecutiveTimelineItem,
  MilestoneEventItem,
  MilitaryBranchSummary,
  PeerCountryMetric,
  RegimeEraBand,
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
  CenturyEventMatrixAndMilestones,
  EmptyBentoCard,
  HdiScaleBar,
  MilitaryForceInfographicBlock,
  MiniDonutRing,
  MiniSvgSparkline,
  NationalRadarPolygonChart,
  ParliamentHemicycleSvg,
  PercentileBulletBar,
  type RadarAxisMetric,
  SemiCircleGauge,
  type SegmentSlice,
  SovereignYieldCurveSvg,
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

/* ─── 2B. Single-Row 4-Cell National Power & Macro Gauge Strip ───────────── */

export function NationalPowerGaugeStrip({
  popNum,
  popYearNote,
  areaNum,
  densityText,
  capitalText,
  cityCount,
  continentComparison,
  economicIndicators,
  developmentIndicators = [],
  bondYields,
  onOpenDemographics,
  onOpenRegions,
  onOpenEconomics,
  onOpenBonds,
  onOpenDataManager,
}: {
  popNum: number | null
  popYearNote: string | null
  areaNum: number | null
  densityText: string | null
  capitalText: string
  cityCount: number
  continentComparison: ContinentComparison
  economicIndicators: EconomicIndicator[]
  developmentIndicators?: DevelopmentIndicator[]
  bondYields: BondYield[]
  onOpenDemographics: () => void
  onOpenRegions: () => void
  onOpenEconomics: () => void
  onOpenBonds: () => void
  onOpenDataManager: () => void
}) {
  const theme = useTheme()

  const {
    gdpPts,
    latestGdpVal,
    latestGdpYear,
    gdpYoY,
    latestGdpPerCapVal,
    macroPts,
    macroLabel,
    macroLatestText,
    macroDelta,
    macroZeroLine,
    latestY10,
    hdiVal,
    hdiYear,
    hdiDelta,
  } = useMemo(() => {
    const sortedEco = [...economicIndicators].sort((a, b) => a.year - b.year)
    const gPts = sortedEco
      .filter((r) => r.gdp != null && Number.isFinite(Number(r.gdp)))
      .map((r) => ({ year: r.year, value: Number(r.gdp) }))
    const capPts = sortedEco
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
    const infPts = sortedEco
      .filter(
        (r) =>
          r.inflationRate != null && Number.isFinite(Number(r.inflationRate)),
      )
      .map((r) => ({ year: r.year, value: Number(r.inflationRate) }))

    const y10Pts = [...bondYields]
      .filter(
        (b) =>
          b.maturity === 'Y10' &&
          b.yieldRate != null &&
          Number.isFinite(Number(b.yieldRate)),
      )
      .sort((a, b) => a.year - b.year)
      .map((b) => ({ year: b.year, value: Number(b.yieldRate) }))

    const calcPctDelta = (pts: Array<{ year: number; value: number }>) => {
      if (pts.length < 2) return null
      const prev = pts[pts.length - 2].value
      const curr = pts[pts.length - 1].value
      if (prev === 0) return null
      const pct = ((curr - prev) / Math.abs(prev)) * 100
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
    }

    const calcDiffDelta = (pts: Array<{ year: number; value: number }>) => {
      if (pts.length < 2) return null
      const diff = pts[pts.length - 1].value - pts[pts.length - 2].value
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%p`
    }

    const activeMacro =
      growthPts.length > 0
        ? {
            pts: growthPts,
            label: '실질 경제성장률',
            latest: `${growthPts[growthPts.length - 1].value.toFixed(1)}%`,
            delta: calcDiffDelta(growthPts),
            zero: true,
          }
        : infPts.length > 0
          ? {
              pts: infPts,
              label: '소비자물가 상승률',
              latest: `${infPts[infPts.length - 1].value.toFixed(1)}%`,
              delta: calcDiffDelta(infPts),
              zero: true,
            }
          : y10Pts.length > 0
            ? {
                pts: y10Pts,
                label: '10년물 국채금리',
                latest: `${y10Pts[y10Pts.length - 1].value.toFixed(2)}%`,
                delta: calcDiffDelta(y10Pts),
                zero: false,
              }
            : null

    const sortedDev = [...developmentIndicators]
      .filter((d) => d.hdi != null && Number.isFinite(Number(d.hdi)))
      .sort((a, b) => a.year - b.year)
    const lastDev = sortedDev[sortedDev.length - 1] ?? null
    const prevDev =
      sortedDev.length >= 2 ? sortedDev[sortedDev.length - 2] : null
    const devDelta =
      lastDev?.hdi != null && prevDev?.hdi != null
        ? Number(lastDev.hdi) - Number(prevDev.hdi)
        : null

    return {
      gdpPts: gPts,
      latestGdpVal: gPts.length > 0 ? gPts[gPts.length - 1].value : null,
      latestGdpYear: gPts.length > 0 ? gPts[gPts.length - 1].year : null,
      gdpYoY: calcPctDelta(gPts),
      latestGdpPerCapVal:
        capPts.length > 0 ? capPts[capPts.length - 1].value : null,
      macroPts: activeMacro?.pts ?? [],
      macroLabel: activeMacro?.label ?? '거시 성장 · 금리',
      macroLatestText: activeMacro?.latest ?? null,
      macroDelta: activeMacro?.delta ?? null,
      macroZeroLine: activeMacro?.zero ?? false,
      latestY10: y10Pts.length > 0 ? y10Pts[y10Pts.length - 1] : null,
      hdiVal: lastDev?.hdi != null ? Number(lastDev.hdi) : null,
      hdiYear: lastDev?.year ?? null,
      hdiDelta:
        devDelta != null
          ? `${devDelta >= 0 ? '+' : ''}${devDelta.toFixed(3)}`
          : null,
    }
  }, [economicIndicators, developmentIndicators, bondYields])

  const hasYieldCurve = useMemo(() => {
    const byYear = new Map<number, Set<string>>()
    for (const row of bondYields) {
      if (row.yieldRate == null || !Number.isFinite(Number(row.yieldRate))) {
        continue
      }
      const s = byYear.get(row.year) ?? new Set<string>()
      s.add(row.maturity)
      byYear.set(row.year, s)
    }
    return [...byYear.values()].some((s) => s.size >= 2)
  }, [bondYields])

  const [cell3View, setCell3View] = useState<'curve' | 'macro'>('curve')
  const showCurveInCell3 =
    hasYieldCurve && (cell3View === 'curve' || macroPts.length === 0)

  const popRankTotal = continentComparison.populationRankTotal ?? 0
  const popTopPct =
    continentComparison.populationRank != null && popRankTotal > 1
      ? Math.max(
          5,
          Math.round(
            ((popRankTotal - continentComparison.populationRank + 1) /
              popRankTotal) *
              100,
          ),
        )
      : popNum != null
        ? 65
        : 0

  return (
    <BentoCard aria-label="국력 스케일 및 거시경제 한눈 계기판">
      <GaugeStripGrid>
        {/* 1. 인구 · 영토 반원 아크 게이지 */}
        <GaugeCellBtn
          type="button"
          onClick={onOpenDemographics}
          title={popNum != null ? `인구 ${formatPopulation(popNum)}명` : undefined}
        >
          <GaugeCellTop>
            <SparkTitle>인구 · 영토 스케일</SparkTitle>
            {continentComparison.populationRank != null && popRankTotal > 0 ? (
              <DeltaChip>
                대륙 {continentComparison.populationRank}/{popRankTotal}위
              </DeltaChip>
            ) : null}
          </GaugeCellTop>
          <GaugeRowInline>
            <SemiCircleGauge
              percent={popTopPct}
              // 84px 게이지 가운데에 8자리 숫자가 넘쳐 호와 겹쳤다 — '8,448만'처럼 규모로 줄이고 정확한 값은 툴팁
              centerValue={popNum != null ? formatPopulationKo(popNum) : '—'}
              subLabel={popYearNote ?? '인구'}
              size={84}
            />
            <GaugeSideStats>
              <div>
                <span>영토 면적</span>
                <strong>
                  {areaNum != null ? formatAreaValue(areaNum) : '미등록'}
                </strong>
              </div>
              <div>
                <span>인구 밀도</span>
                <strong>{densityText ?? '—'}</strong>
              </div>
            </GaugeSideStats>
          </GaugeRowInline>
        </GaugeCellBtn>

        {/* 2. 명목 GDP 스파크라인 + YoY + 1인당 GDP */}
        <GaugeCellBtn type="button" onClick={onOpenEconomics}>
          <GaugeCellTop>
            <SparkTitle>
              경제 규모 {latestGdpYear ? `(${latestGdpYear})` : ''}
            </SparkTitle>
            {gdpYoY ? <DeltaChip>{gdpYoY}</DeltaChip> : null}
          </GaugeCellTop>
          <SparkBigNum>
            {latestGdpVal != null ? (
              formatMetricValue(latestGdpVal, 'USD')
            ) : (
              <EmptyValueText>아직 없음</EmptyValueText>
            )}
            {latestGdpPerCapVal != null ? (
              <SparkYear>
                1인당 {formatMetricValue(latestGdpPerCapVal, 'USD_CAPITA')}
              </SparkYear>
            ) : null}
          </SparkBigNum>
          {gdpPts.length > 0 ? (
            <MiniSvgSparkline
              points={gdpPts}
              color={ledgerAccent(theme.mode)}
              height={46}
              formatValue={(v) => formatMetricValue(v, 'USD')}
            />
          ) : (
            <GaugeEmptyHint>클릭하여 경제 지표 확인 · 입력</GaugeEmptyHint>
          )}
        </GaugeCellBtn>

        {/* 3. 국채 수익률곡선(1M~30Y) / 성장률 · 물가 추이 */}
        <GaugeCellBtn
          as="div"
          role="button"
          tabIndex={0}
          onClick={
            showCurveInCell3 || (latestY10 && macroPts.length === 0)
              ? onOpenBonds
              : onOpenEconomics
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (showCurveInCell3 || (latestY10 && macroPts.length === 0)) {
                onOpenBonds()
              } else {
                onOpenEconomics()
              }
            }
          }}
        >
          <GaugeCellTop>
            <SparkTitle>
              {showCurveInCell3 ? '국채 수익률곡선' : macroLabel}
            </SparkTitle>
            {hasYieldCurve && macroPts.length > 0 ? (
              <MiniDirSwitch onClick={(e) => e.stopPropagation()}>
                <MiniDirBtn
                  type="button"
                  $active={cell3View === 'curve'}
                  onClick={() => setCell3View('curve')}
                >
                  곡선
                </MiniDirBtn>
                <MiniDirBtn
                  type="button"
                  $active={cell3View === 'macro'}
                  onClick={() => setCell3View('macro')}
                >
                  성장
                </MiniDirBtn>
              </MiniDirSwitch>
            ) : macroDelta ? (
              <DeltaChip>{macroDelta}</DeltaChip>
            ) : latestY10 ? (
              <DeltaChip>10Y {latestY10.value.toFixed(2)}%</DeltaChip>
            ) : null}
          </GaugeCellTop>
          {showCurveInCell3 ? (
            <>
              <SparkBigNum>
                {latestY10 ? `10Y ${latestY10.value.toFixed(2)}%` : '만기구조'}
                {macroLatestText ? (
                  <SparkYear>성장 {macroLatestText}</SparkYear>
                ) : null}
              </SparkBigNum>
              <SovereignYieldCurveSvg bondYields={bondYields} height={46} />
            </>
          ) : (
            <>
              <SparkBigNum>
                {macroLatestText ??
                  (latestY10 ? (
                    `${latestY10.value.toFixed(2)}%`
                  ) : (
                    <EmptyValueText>아직 없음</EmptyValueText>
                  ))}
                {latestY10 && macroLatestText ? (
                  <SparkYear>국채10Y {latestY10.value.toFixed(2)}%</SparkYear>
                ) : null}
              </SparkBigNum>
              {macroPts.length > 0 ? (
                <MiniSvgSparkline
                  points={macroPts}
                  color={theme.mode === 'dark' ? '#34d399' : '#059669'}
                  height={46}
                  showZeroLine={macroZeroLine}
                  formatValue={(v) => `${v.toFixed(2)}%`}
                />
              ) : (
                <GaugeEmptyHint>성장률 · 물가 · 금리 시계열</GaugeEmptyHint>
              )}
            </>
          )}
        </GaugeCellBtn>

        {/* 4. 인간개발지수(HDI) 4단계 스펙트럼 + 수도·행정구역 */}
        <GaugeCellBtn
          type="button"
          onClick={hdiVal != null ? onOpenEconomics : onOpenDataManager}
        >
          <GaugeCellTop>
            <SparkTitle>
              인간개발지수 {hdiYear ? `(${hdiYear})` : '(HDI)'}
            </SparkTitle>
            {hdiDelta ? <DeltaChip>{hdiDelta}</DeltaChip> : null}
          </GaugeCellTop>
          <SparkBigNum>
            {hdiVal != null ? (
              hdiVal.toFixed(3)
            ) : capitalText ? (
              capitalText
            ) : (
              <EmptyValueText>아직 없음</EmptyValueText>
            )}
            {hdiVal != null && capitalText ? (
              <SparkYear>수도 {capitalText}</SparkYear>
            ) : null}
          </SparkBigNum>
          {hdiVal != null ? (
            <HdiScaleBar hdi={hdiVal} />
          ) : (
            <GaugeEmptyHint>
              {cityCount > 0
                ? `광역 행정구역 ${cityCount}곳 등록 · HDI 입력`
                : 'HDI · 사회 발전 지표 입력'}
            </GaugeEmptyHint>
          )}
        </GaugeCellBtn>
      </GaugeStripGrid>
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
              color: theme.mode === 'dark' ? '#38bdf8' : '#0ea5e9',
              gradient: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
            },
            {
              key: 'working',
              label: '생산연령 (20–59)',
              value: working,
              color: theme.mode === 'dark' ? '#34d399' : '#10b981',
              gradient: 'linear-gradient(90deg, #10b981, #06b6d4)',
            },
            {
              key: 'senior',
              label: '고령 (60+)',
              value: senior,
              color: theme.mode === 'dark' ? '#fbbf24' : '#f59e0b',
              gradient: 'linear-gradient(90deg, #f59e0b, #fb7185)',
            },
          ]
        : []

    return {
      latestDemo: latest,
      latestPyramid: withPyr ? { year: withPyr.year, rows: pyrRows } : null,
      ageShareSlices: slices,
    }
  }, [demographicIndicators, theme.mode])

  if (!latestDemo && !latestPyramid) {
    return null
  }

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
          <BentoCardTitle>인구 구조</BentoCardTitle>
          {latestPyramid ? (
            <BentoCardBadge>{latestPyramid.year}년</BentoCardBadge>
          ) : latestDemo ? (
            <BentoCardBadge>{latestDemo.year}년</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenPyramid}>
            인구 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {latestPyramid ? (
          <MiniPyramidBtn type="button" onClick={onOpenPyramid}>
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
          </MiniPyramidBtn>
        ) : (
          <EmptyInlinePrompt type="button" onClick={onOpenDataManager}>
            <FiPlus size={12} /> 연령대별 인구 피라미드 데이터 입력하기
          </EmptyInlinePrompt>
        )}

        {ageShareSlices.length > 0 ? (
          <AgeCohortDonutRow>
            <MiniDonutRing
              slices={ageShareSlices}
              size={60}
              strokeWidth={8}
              centerValue={
                medianAge != null ? `${medianAge.toFixed(0)}세` : undefined
              }
              centerLabel={medianAge != null ? '중위' : undefined}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <StackedSegmentBar
                slices={ageShareSlices}
                height={7}
                showPercent
              />
            </div>
          </AgeCohortDonutRow>
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
  const [tradeDir, setTradeDir] = useState<'EXPORT' | 'IMPORT'>('EXPORT')

  const latestTrade = useMemo(() => {
    const sorted = [...exportImports].sort((a, b) => b.year - a.year)
    return sorted[0] ?? null
  }, [exportImports])

  const activeComp = useMemo(() => {
    if (!latestTrade) return null
    const dirItems = (latestTrade.items ?? []).filter(
      (i) => i.direction === tradeDir,
    )
    if (dirItems.length === 0) return null
    const totalVal =
      tradeDir === 'EXPORT'
        ? latestTrade.exportValue != null
          ? Number(latestTrade.exportValue)
          : null
        : latestTrade.importValue != null
          ? Number(latestTrade.importValue)
          : null
    return buildComposition(dirItems, totalVal, theme.mode === 'dark')
  }, [latestTrade, tradeDir, theme.mode])

  const hasImportItems = useMemo(
    () => Boolean(latestTrade?.items?.some((i) => i.direction === 'IMPORT')),
    [latestTrade],
  )

  if (!latestTrade && companyCount === 0) {
    return null
  }

  const rawExpVal =
    latestTrade?.exportValue != null ? Number(latestTrade.exportValue) : 0
  const rawImpVal =
    latestTrade?.importValue != null ? Number(latestTrade.importValue) : 0
  const scaleMult =
    latestTrade?.valueScale &&
    latestTrade.valueScale in VALUE_SCALE_MULTIPLIER
      ? VALUE_SCALE_MULTIPLIER[
          latestTrade.valueScale as keyof typeof VALUE_SCALE_MULTIPLIER
        ]
      : 1
  const expVal = rawExpVal * scaleMult
  const impVal = rawImpVal * scaleMult
  const isUsdTrade =
    !latestTrade?.currencyCode || latestTrade.currencyCode === 'USD'
  const formatScaledTrade = (scaledVal: number) => {
    if (isUsdTrade) return formatMetricValue(scaledVal, '$')
    const suffix = latestTrade?.currencyCode
      ? ` ${latestTrade.currencyCode}`
      : ''
    return `${formatTradeValue(scaledVal)}${suffix}`
  }
  const maxTrade = Math.max(1, expVal, impVal)
  const totalTradeVol = expVal + impVal
  const expSharePct =
    totalTradeVol > 0 ? Math.round((expVal / totalTradeVol) * 100) : 50
  const balance = expVal - impVal

  const VIBRANT_COMMODITY_PALETTE = [
    {
      solid: '#4f46e5',
      grad: 'linear-gradient(90deg, #4f46e5, #818cf8)',
    },
    {
      solid: '#0ea5e9',
      grad: 'linear-gradient(90deg, #0284c7, #38bdf8)',
    },
    {
      solid: '#f59e0b',
      grad: 'linear-gradient(90deg, #d97706, #fbbf24)',
    },
    {
      solid: '#10b981',
      grad: 'linear-gradient(90deg, #059669, #34d399)',
    },
    {
      solid: '#ec4899',
      grad: 'linear-gradient(90deg, #db2777, #f472b6)',
    },
  ]

  const compSlices: SegmentSlice[] = activeComp
    ? activeComp.slices.slice(0, 5).map((sl, idx) => {
        const pal =
          VIBRANT_COMMODITY_PALETTE[idx % VIBRANT_COMMODITY_PALETTE.length]
        return {
          key: sl.key,
          label: sl.name,
          value: sl.pct,
          color: pal.solid,
          gradient: pal.grad,
          meta: `${sl.pct.toFixed(1)}%`,
        }
      })
    : []
  const maxCompPct = Math.max(1, ...compSlices.map((sl) => sl.value))

  return (
    <BentoCard aria-label="대외 교역 수지 및 주력 품목 도넛 인포그래픽">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>교역 · 주력 산업</BentoCardTitle>
          {latestTrade ? (
            <BentoCardBadge>
              {latestTrade.year}년
              {companyCount > 0 ? ` · 기업 ${companyCount}` : ''}
            </BentoCardBadge>
          ) : companyCount > 0 ? (
            <BentoCardBadge>기업 {companyCount}개사</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn
            type="button"
            $accent
            onClick={latestTrade ? onOpenTrade : onOpenCompanies}
          >
            {latestTrade ? '교역 상세' : '기업 목록'}{' '}
            <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {latestTrade ? (
          <TradeBalanceBtn type="button" onClick={onOpenTrade}>
            <TradeDirRow>
              <TradeDirLabel style={{ color: '#059669' }}>수출</TradeDirLabel>
              <TradeBarTrack>
                <TradeBarFill
                  $tone="export"
                  style={{ width: `${Math.max(4, (expVal / maxTrade) * 100)}%` }}
                />
              </TradeBarTrack>
              <TradeDirVal>{formatScaledTrade(expVal)}</TradeDirVal>
            </TradeDirRow>

            <TradeDirRow>
              <TradeDirLabel style={{ color: '#e11d48' }}>수입</TradeDirLabel>
              <TradeBarTrack>
                <TradeBarFill
                  $tone="import"
                  style={{ width: `${Math.max(4, (impVal / maxTrade) * 100)}%` }}
                />
              </TradeBarTrack>
              <TradeDirVal>{formatScaledTrade(impVal)}</TradeDirVal>
            </TradeDirRow>

            <BalanceCallout $surplus={balance >= 0}>
              <span>
                {balance >= 0 ? '무역흑자' : '무역적자'} · 수출 비중 {expSharePct}%
              </span>
              <strong>
                {balance >= 0 ? '+' : '−'}
                {formatScaledTrade(Math.abs(balance))}
              </strong>
            </BalanceCallout>
          </TradeBalanceBtn>
        ) : null}

        {compSlices.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 8 }}>
              <span>
                {tradeDir === 'EXPORT' ? '주력 수출 품목' : '주력 수입 품목'}
              </span>
              {hasImportItems ? (
                <MiniDirSwitch>
                  <MiniDirBtn
                    type="button"
                    $active={tradeDir === 'EXPORT'}
                    onClick={() => setTradeDir('EXPORT')}
                  >
                    수출
                  </MiniDirBtn>
                  <MiniDirBtn
                    type="button"
                    $active={tradeDir === 'IMPORT'}
                    onClick={() => setTradeDir('IMPORT')}
                  >
                    수입
                  </MiniDirBtn>
                </MiniDirSwitch>
              ) : activeComp?.coverage != null ? (
                <span>비중 합계 {Math.round(activeComp.coverage)}%</span>
              ) : null}
            </BentoSubLabel>
            <AgeCohortDonutRow>
              <MiniDonutRing
                slices={compSlices}
                size={72}
                strokeWidth={9.5}
                centerValue={
                  activeComp?.coverage != null
                    ? `${Math.round(activeComp.coverage)}%`
                    : `${compSlices.length}종`
                }
                centerLabel="주력"
              />
              <CommodityBarsCol>
                {compSlices.map((sl) => (
                  <CommodityBarRow key={sl.key}>
                    <span className="lb">
                      <i style={{ background: sl.color }} />
                      {sl.label}
                    </span>
                    <div className="track">
                      <div
                        className="fill"
                        style={{
                          width: `${Math.max(8, Math.round((sl.value / maxCompPct) * 100))}%`,
                          background: sl.gradient ?? sl.color,
                        }}
                      />
                    </div>
                    <strong className="pct">{sl.meta}</strong>
                  </CommodityBarRow>
                ))}
              </CommodityBarsCol>
            </AgeCohortDonutRow>
          </div>
        ) : companiesBySector.length > 0 ? (
          <StackedSegmentBar
            slices={companiesBySector.slice(0, 5).map((secItem, idx) => ({
              key: secItem.label,
              label: secItem.label,
              value: secItem.count,
              color:
                PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length],
            }))}
            height={9}
          />
        ) : null}

        {companyCount > 0 ? (
          <SummaryLinkRow type="button" onClick={onOpenCompanies}>
            <span>등록 기업 · 법인</span>
            <strong>
              총 {companyCount.toLocaleString('ko-KR')}개사 보기{' '}
              <FiArrowUpRight size={11} />
            </strong>
          </SummaryLinkRow>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 6A. Zone 1 — Modern Country Identity & Key Facts Ledger Card ────────── */

export function ModernIdentityLedgerCard({
  description,
  activePolitySeats,
  currentHeads,
  currentCabinet,
  historicalHeadCount = 0,
  popNum,
  popYearNote,
  areaNum,
  densityText,
  capitalText,
  cityCount,
  continentComparison,
  economicIndicators,
  developmentIndicators = [],
  bondYields,
  onEditOverview,
  onOpenPoliticalSystem,
  onOpenCabinets,
  onOpenHeadsTab,
  onSelectPerson,
  onOpenDemographics,
  onOpenRegions,
  onOpenEconomics,
  onOpenBonds,
}: {
  description?: string | null
  activePolitySeats: CivicInstitutionalSnapshot['activePolitySeats']
  currentHeads: CurrentHead[]
  currentCabinet: CurrentCabinetSummary | null
  historicalHeadCount?: number
  popNum: number | null
  popYearNote: string | null
  areaNum: number | null
  densityText: string | null
  capitalText: string
  cityCount: number
  continentComparison: ContinentComparison
  economicIndicators: EconomicIndicator[]
  developmentIndicators?: DevelopmentIndicator[]
  bondYields: BondYield[]
  onEditOverview?: () => void
  onOpenPoliticalSystem: () => void
  onOpenCabinets: (cabinetId?: string | null) => void
  onOpenHeadsTab: () => void
  onSelectPerson: (personId: string) => void
  onOpenDemographics: () => void
  onOpenRegions: () => void
  onOpenEconomics: () => void
  onOpenBonds: () => void
}) {
  const [proseExpanded, setProseExpanded] = useState(false)
  const cleanDescription = description?.trim() ?? ''
  const plainPreview = useMemo(() => {
    if (!cleanDescription) return ''
    return cleanDescription
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [cleanDescription])

  const polityBadges = useMemo(() => {
    if (!activePolitySeats) return []
    const items: string[] = []
    if (activePolitySeats.stateStructure) {
      items.push(
        STATE_STRUCTURE_LABEL[
          activePolitySeats.stateStructure as keyof typeof STATE_STRUCTURE_LABEL
        ] ?? activePolitySeats.stateStructure,
      )
    }
    if (activePolitySeats.governmentForm) {
      items.push(
        GOVERNMENT_FORM_LABEL[
          activePolitySeats.governmentForm as keyof typeof GOVERNMENT_FORM_LABEL
        ] ?? activePolitySeats.governmentForm,
      )
    }
    if (activePolitySeats.legislatureType) {
      items.push(
        LEGISLATURE_TYPE_LABEL[
          activePolitySeats.legislatureType as keyof typeof LEGISLATURE_TYPE_LABEL
        ] ?? activePolitySeats.legislatureType,
      )
    }
    if (activePolitySeats.partySystem) {
      items.push(
        PARTY_SYSTEM_LABEL[
          activePolitySeats.partySystem as keyof typeof PARTY_SYSTEM_LABEL
        ] ?? activePolitySeats.partySystem,
      )
    }
    return items
  }, [activePolitySeats])

  const macroSummary = useMemo(() => {
    const sortedEco = [...economicIndicators].sort(
      (left, right) => right.year - left.year,
    )
    const gdpRow = sortedEco.find(
      (row) => row.gdp != null && Number.isFinite(Number(row.gdp)),
    )
    const capRow = sortedEco.find(
      (row) =>
        row.gdpPerCapita != null && Number.isFinite(Number(row.gdpPerCapita)),
    )
    const growthRow = sortedEco.find(
      (row) =>
        row.gdpGrowthRate != null && Number.isFinite(Number(row.gdpGrowthRate)),
    )
    const sortedDev = [...developmentIndicators]
      .filter((dev) => dev.hdi != null && Number.isFinite(Number(dev.hdi)))
      .sort((left, right) => right.year - left.year)
    const hdiRow = sortedDev[0] ?? null

    const y10Rows = [...bondYields]
      .filter(
        (bond) =>
          bond.maturity === 'Y10' &&
          bond.yieldRate != null &&
          Number.isFinite(Number(bond.yieldRate)),
      )
      .sort((left, right) => right.year - left.year)
    const latestY10 = y10Rows[0] ?? null

    const byYear = new Map<number, Set<string>>()
    for (const row of bondYields) {
      if (row.yieldRate == null || !Number.isFinite(Number(row.yieldRate))) {
        continue
      }
      const set = byYear.get(row.year) ?? new Set<string>()
      set.add(row.maturity)
      byYear.set(row.year, set)
    }
    const hasYieldCurve = [...byYear.values()].some((set) => set.size >= 2)

    return {
      gdpVal: gdpRow?.gdp != null ? Number(gdpRow.gdp) : null,
      gdpYear: gdpRow?.year ?? capRow?.year ?? null,
      gdpPerCapVal:
        capRow?.gdpPerCapita != null ? Number(capRow.gdpPerCapita) : null,
      growthVal:
        growthRow?.gdpGrowthRate != null
          ? Number(growthRow.gdpGrowthRate)
          : null,
      hdiVal: hdiRow?.hdi != null ? Number(hdiRow.hdi) : null,
      hdiYear: hdiRow?.year ?? null,
      y10Val: latestY10?.yieldRate != null ? Number(latestY10.yieldRate) : null,
      y10Year: latestY10?.year ?? null,
      hasYieldCurve,
    }
  }, [economicIndicators, developmentIndicators, bondYields])

  const hasEcoCol =
    macroSummary.gdpVal != null ||
    macroSummary.gdpPerCapVal != null ||
    macroSummary.growthVal != null
  const hasBondOrHdiCol =
    macroSummary.hdiVal != null ||
    macroSummary.y10Val != null ||
    macroSummary.hasYieldCurve

  const colCount = 3 + (hasEcoCol ? 1 : 0) + (hasBondOrHdiCol ? 1 : 0)

  const headCellLabel =
    activePolitySeats?.governmentForm === 'PRESIDENTIAL'
      ? '현직 대통령 · 행정부'
      : activePolitySeats?.governmentForm === 'PARLIAMENTARY' ||
          activePolitySeats?.governmentForm === 'CONSTITUTIONAL_MONARCHY'
        ? '현직 수반 · 내각'
        : '현직 수반 · 행정부'

  const primaryHead = currentHeads[0] ?? null
  const secondaryHead = currentHeads[1] ?? null
  const primaryHeadAvatar = primaryHead?.profileImageUrl
    ? getUploadImageUrl(primaryHead.profileImageUrl)
    : null

  const hasTopStrip =
    polityBadges.length > 0 ||
    Boolean(activePolitySeats?.lowerSeats) ||
    Boolean(activePolitySeats?.upperSeats) ||
    Boolean(plainPreview)

  return (
    <BentoCard aria-label="국가 핵심 제원 요약">
      {hasTopStrip ? (
        <IdentityTopBar>
          <IdentityTopBadges>
            {polityBadges.map((badge) => (
              <IdentityPolityBtn
                key={badge}
                type="button"
                onClick={onOpenPoliticalSystem}
              >
                {badge}
              </IdentityPolityBtn>
            ))}
            {activePolitySeats?.lowerSeats ? (
              <BentoPill>
                {activePolitySeats.lowerName ||
                  primaryHouseLabel(activePolitySeats.legislatureType ?? null)}{' '}
                {activePolitySeats.lowerSeats.toLocaleString('ko-KR')}석
              </BentoPill>
            ) : null}
            {activePolitySeats?.upperSeats ? (
              <BentoPill>
                {activePolitySeats.upperName || '상원'}{' '}
                {activePolitySeats.upperSeats.toLocaleString('ko-KR')}석
              </BentoPill>
            ) : null}
          </IdentityTopBadges>

          {plainPreview ? (
            <IdentityProseBlock>
              {proseExpanded ? (
                <div className="full">
                  {isLikelyRichTextHtml(cleanDescription) ? (
                    <RichTextReadView html={cleanDescription} />
                  ) : (
                    <p>{cleanDescription}</p>
                  )}
                </div>
              ) : (
                <p className="clamp">{plainPreview}</p>
              )}
              <div className="actions">
                {plainPreview.length > 110 ? (
                  <TextActionBtn
                    type="button"
                    onClick={() => setProseExpanded((prev) => !prev)}
                  >
                    {proseExpanded ? '접기' : '전문 보기'}
                  </TextActionBtn>
                ) : null}
                {onEditOverview ? (
                  <TextActionBtn type="button" onClick={onEditOverview}>
                    <FiEdit2 size={10.5} /> 소개 편집
                  </TextActionBtn>
                ) : null}
              </div>
            </IdentityProseBlock>
          ) : null}
        </IdentityTopBar>
      ) : null}

      <IdentityFactsGrid $cols={colCount}>
        {/* 1. 현직 수반 · 행정부 */}
        <IdentityFactCell
          type="button"
          onClick={() => {
            if (primaryHead?.personId) {
              onSelectPerson(primaryHead.personId)
            } else if (currentCabinet) {
              onOpenCabinets(currentCabinet.cabinetId)
            } else if (historicalHeadCount > 0) {
              onOpenHeadsTab()
            } else {
              onOpenCabinets(null)
            }
          }}
        >
          <IdentityFactTop>
            <SparkTitle>{headCellLabel}</SparkTitle>
            {currentCabinet ? (
              <DeltaChip>각료 {currentCabinet.ministerCount}명</DeltaChip>
            ) : null}
          </IdentityFactTop>
          {primaryHead ? (
            <IdentityLeaderInline>
              <HeadAvatar>
                {primaryHeadAvatar ? (
                  <img src={primaryHeadAvatar} alt="" />
                ) : (
                  <FiUser size={14} />
                )}
              </HeadAvatar>
              <div className="meta">
                <strong>{primaryHead.personName}</strong>
                <span>
                  {primaryHead.positionTitle}
                  {secondaryHead
                    ? ` · ${secondaryHead.positionTitle} ${secondaryHead.personName}`
                    : currentCabinet
                      ? ` · ${currentCabinet.name}`
                      : ''}
                </span>
              </div>
            </IdentityLeaderInline>
          ) : currentCabinet ? (
            <>
              <SparkBigNum>{currentCabinet.name}</SparkBigNum>
              <ScaleCellSub>내각·행정 상세 보기 →</ScaleCellSub>
            </>
          ) : (
            <>
              <SparkBigNum>
                <EmptyValueText>현직 미등록</EmptyValueText>
              </SparkBigNum>
              <ScaleCellSub>
                {historicalHeadCount > 0
                  ? `전신 국가 수반 ${historicalHeadCount}명 기록됨 →`
                  : '+ 현직 수반 · 행정부 등록'}
              </ScaleCellSub>
            </>
          )}
        </IdentityFactCell>

        {/* 2. 인구 규모 */}
        <IdentityFactCell
          type="button"
          onClick={onOpenDemographics}
          title={popNum != null ? `인구 ${formatPopulation(popNum)}명` : undefined}
        >
          <IdentityFactTop>
            <SparkTitle>인구 규모</SparkTitle>
            {continentComparison.populationRank != null &&
            continentComparison.populationRankTotal ? (
              <DeltaChip>
                대륙 {continentComparison.populationRank}/
                {continentComparison.populationRankTotal}위
              </DeltaChip>
            ) : null}
          </IdentityFactTop>
          <SparkBigNum>
            {popNum != null ? (
              `${formatPopulationKo(popNum)} 명`
            ) : (
              <EmptyValueText>미기재</EmptyValueText>
            )}
          </SparkBigNum>
          <ScaleCellSub>
            {popNum != null
              ? `${formatPopulation(popNum)}명${popYearNote ? ` · ${popYearNote}` : ''}`
              : '인구 지표 보기'}
          </ScaleCellSub>
        </IdentityFactCell>

        {/* 3. 영토 면적 · 밀도 · 수도 */}
        <IdentityFactCell type="button" onClick={onOpenRegions}>
          <IdentityFactTop>
            <SparkTitle>영토 면적 · 밀도</SparkTitle>
            {continentComparison.areaRank != null &&
            continentComparison.areaRankTotal ? (
              <DeltaChip>
                면적 {continentComparison.areaRank}/
                {continentComparison.areaRankTotal}위
              </DeltaChip>
            ) : null}
          </IdentityFactTop>
          <SparkBigNum>
            {areaNum != null ? (
              `${formatAreaValue(areaNum)} km²`
            ) : (
              <EmptyValueText>미기재</EmptyValueText>
            )}
          </SparkBigNum>
          <ScaleCellSub>
            {[
              densityText ? `밀도 ${densityText}` : null,
              capitalText
                ? `수도 ${capitalText}`
                : cityCount > 0
                  ? `행정구역 ${cityCount}곳`
                  : null,
            ]
              .filter(Boolean)
              .join(' · ') || '지리·행정구역 보기'}
          </ScaleCellSub>
        </IdentityFactCell>

        {/* 4. 경제 규모 (데이터가 있을 때만 표시) */}
        {hasEcoCol ? (
          <IdentityFactCell type="button" onClick={onOpenEconomics}>
            <IdentityFactTop>
              <SparkTitle>
                거시경제{macroSummary.gdpYear ? ` (${macroSummary.gdpYear})` : ''}
              </SparkTitle>
              {macroSummary.growthVal != null ? (
                <DeltaChip>
                  성장 {macroSummary.growthVal >= 0 ? '+' : ''}
                  {macroSummary.growthVal.toFixed(1)}%
                </DeltaChip>
              ) : null}
            </IdentityFactTop>
            <SparkBigNum>
              {macroSummary.gdpVal != null
                ? formatMetricValue(macroSummary.gdpVal, 'USD')
                : macroSummary.gdpPerCapVal != null
                  ? formatMetricValue(macroSummary.gdpPerCapVal, 'USD_CAPITA')
                  : `${macroSummary.growthVal?.toFixed(1)}%`}
            </SparkBigNum>
            <ScaleCellSub>
              {macroSummary.gdpVal != null && macroSummary.gdpPerCapVal != null
                ? `1인당 ${formatMetricValue(macroSummary.gdpPerCapVal, 'USD_CAPITA')}`
                : '경제 지표 상세 →'}
            </ScaleCellSub>
          </IdentityFactCell>
        ) : null}

        {/* 5. 국채 금리 · HDI (데이터가 있을 때만 표시) */}
        {hasBondOrHdiCol ? (
          <IdentityFactCell
            type="button"
            onClick={
              macroSummary.hasYieldCurve || macroSummary.y10Val != null
                ? onOpenBonds
                : onOpenEconomics
            }
          >
            <IdentityFactTop>
              <SparkTitle>
                {macroSummary.hasYieldCurve
                  ? '국채 수익률곡선'
                  : macroSummary.hdiVal != null
                    ? `인간개발지수${macroSummary.hdiYear ? ` (${macroSummary.hdiYear})` : ''}`
                    : '10년물 국채금리'}
              </SparkTitle>
              {macroSummary.hdiVal != null && macroSummary.hasYieldCurve ? (
                <DeltaChip>HDI {macroSummary.hdiVal.toFixed(3)}</DeltaChip>
              ) : macroSummary.y10Year ? (
                <DeltaChip>{macroSummary.y10Year}년</DeltaChip>
              ) : null}
            </IdentityFactTop>
            {macroSummary.hasYieldCurve ? (
              <>
                <SparkBigNum>
                  {macroSummary.y10Val != null
                    ? `10Y ${macroSummary.y10Val.toFixed(2)}%`
                    : '만기 구조'}
                </SparkBigNum>
                <SovereignYieldCurveSvg bondYields={bondYields} height={36} />
              </>
            ) : (
              <>
                <SparkBigNum>
                  {macroSummary.hdiVal != null
                    ? macroSummary.hdiVal.toFixed(3)
                    : `${macroSummary.y10Val!.toFixed(2)}%`}
                </SparkBigNum>
                <ScaleCellSub>
                  {macroSummary.hdiVal != null && macroSummary.y10Val != null
                    ? `국채 10Y ${macroSummary.y10Val.toFixed(2)}%`
                    : '통계 탭에서 보기 →'}
                </ScaleCellSub>
              </>
            )}
          </IdentityFactCell>
        ) : null}
      </IdentityFactsGrid>
    </BentoCard>
  )
}

/* ─── 6A-Hero. Top-Left Hero — Sovereign Polity Form & Executive Leaders ───── */

export function ModernGovernanceAndLeadersHeroCard({
  description,
  activePolitySeats,
  currentHeads,
  currentCabinet,
  historicalHeadCount = 0,
  timeline,
  regimeEras = [],
  activeTenureId,
  hideIncumbentHeads = false,
  onFocusTenure,
  onOpenPoliticalSystem,
  onOpenCabinets,
  onOpenHeadsTab,
  onSelectPerson,
}: {
  description?: string | null
  activePolitySeats: CivicInstitutionalSnapshot['activePolitySeats']
  currentHeads: CurrentHead[]
  currentCabinet: CurrentCabinetSummary | null
  historicalHeadCount?: number
  timeline: ExecutiveTimelineItem[]
  regimeEras?: RegimeEraBand[]
  activeTenureId?: string | null
  hideIncumbentHeads?: boolean
  onFocusTenure?: (tenureId: string) => void
  onEditOverview?: () => void
  onOpenPoliticalSystem: () => void
  onOpenCabinets: (cabinetId?: string | null) => void
  onOpenHeadsTab: () => void
  onSelectPerson: (personId: string) => void
}) {
  const cleanDescription = description?.trim() ?? ''
  const plainPreview = useMemo(() => {
    if (!cleanDescription) return ''
    return cleanDescription
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [cleanDescription])

  const polityCells = useMemo(() => {
    const structLabel = activePolitySeats?.stateStructure
      ? (STATE_STRUCTURE_LABEL[
          activePolitySeats.stateStructure as keyof typeof STATE_STRUCTURE_LABEL
        ] ?? activePolitySeats.stateStructure)
      : null
    const govLabel = activePolitySeats?.governmentForm
      ? (GOVERNMENT_FORM_LABEL[
          activePolitySeats.governmentForm as keyof typeof GOVERNMENT_FORM_LABEL
        ] ?? activePolitySeats.governmentForm)
      : null
    const legLabel = activePolitySeats?.legislatureType
      ? (LEGISLATURE_TYPE_LABEL[
          activePolitySeats.legislatureType as keyof typeof LEGISLATURE_TYPE_LABEL
        ] ?? activePolitySeats.legislatureType)
      : null
    const partySysLabel = activePolitySeats?.partySystem
      ? (PARTY_SYSTEM_LABEL[
          activePolitySeats.partySystem as keyof typeof PARTY_SYSTEM_LABEL
        ] ?? activePolitySeats.partySystem)
      : null

    const seatSubParts: string[] = []
    if (activePolitySeats?.lowerSeats) {
      seatSubParts.push(
        `${activePolitySeats.lowerName || primaryHouseLabel(activePolitySeats.legislatureType ?? null)} ${activePolitySeats.lowerSeats.toLocaleString('ko-KR')}석`,
      )
    }
    if (activePolitySeats?.upperSeats) {
      seatSubParts.push(
        `${activePolitySeats.upperName || '상원'} ${activePolitySeats.upperSeats.toLocaleString('ko-KR')}석`,
      )
    }

    return [
      {
        key: 'struct',
        kicker: '국가 구조',
        value: structLabel,
        sub: structLabel ? '주권 편제' : '미등록',
      },
      {
        key: 'gov',
        kicker: '정부 형태',
        value: govLabel,
        sub: govLabel ? '권력 분립' : '미등록',
      },
      {
        key: 'leg',
        kicker: '입법 의회',
        value: legLabel,
        sub: seatSubParts.length > 0 ? seatSubParts.join(' · ') : '정원 미기재',
      },
      {
        key: 'party',
        kicker: '정당 체제',
        value: partySysLabel,
        sub: partySysLabel ? '경쟁 구도' : '미등록',
      },
    ]
  }, [activePolitySeats])

  const modernHeadRecordsCount = useMemo(
    () => timeline.filter((row) => !row.isHistoricalPolity).length,
    [timeline],
  )
  const recentPastHeads = useMemo(() => {
    const incumbentIds = new Set(currentHeads.map((head) => head.tenureId))
    const incumbentPersonIds = new Set(
      currentHeads.map((head) => head.personId).filter(Boolean),
    )
    const sorted = [...timeline]
      .filter(
        (row) =>
          !row.isHistoricalPolity &&
          !incumbentIds.has(row.recordId) &&
          (!row.personId || !incumbentPersonIds.has(row.personId)),
      )
      .sort(
        (left, right) =>
          (right.endYear ?? right.startYear) -
            (left.endYear ?? left.startYear) ||
          right.startYear - left.startYear,
      )

    const mergedByPerson = new Map<
      string,
      ExecutiveTimelineItem & { mergedStartYear: number; mergedEndYear: number | null }
    >()
    for (const row of sorted) {
      const personKey = row.personId ?? row.personName
      const existing = mergedByPerson.get(personKey)
      if (!existing) {
        mergedByPerson.set(personKey, {
          ...row,
          mergedStartYear: row.startYear,
          mergedEndYear: row.endYear,
        })
      } else {
        existing.mergedStartYear = Math.min(existing.mergedStartYear, row.startYear)
        if (existing.mergedEndYear != null && row.endYear != null) {
          existing.mergedEndYear = Math.max(existing.mergedEndYear, row.endYear)
        } else {
          existing.mergedEndYear = null
        }
        if (row.ordinal != null && existing.ordinal != null) {
          existing.ordinal = Math.min(existing.ordinal, row.ordinal)
        }
      }
    }
    return [...mergedByPerson.values()].slice(0, 3)
  }, [timeline, currentHeads])
  const activeRegimeEra = useMemo(() => {
    if (regimeEras.length === 0) return null
    const openEra = [...regimeEras]
      .reverse()
      .find((era) => era.endYear == null)
    return openEra ?? regimeEras[regimeEras.length - 1]
  }, [regimeEras])

  return (
    <BentoCard aria-label="국가 형태 및 통치 체제 요약">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>국가 형태 · 국가수반</BentoCardTitle>
          {regimeEras.length > 0 ? (
            <BentoCardBadge>헌정 {regimeEras.length}기</BentoCardBadge>
          ) : modernHeadRecordsCount > 0 ? (
            <BentoCardBadge>현대 수반 {modernHeadRecordsCount}건</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn
            type="button"
            $accent
            onClick={onOpenPoliticalSystem}
          >
            정체·헌정 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      {/* 1. 국가 형태 4칸 헌정 매트릭스 */}
      <PolityMatrixGrid>
        {polityCells.map((cell) => (
          <PolityMatrixCell
            key={cell.key}
            type="button"
            $empty={!cell.value}
            onClick={onOpenPoliticalSystem}
          >
            <span className="kicker">{cell.kicker}</span>
            <strong className="val">{cell.value ?? '미기재'}</strong>
            <small className="sub">{cell.sub}</small>
          </PolityMatrixCell>
        ))}
      </PolityMatrixGrid>

      <BentoCardBody style={{ gap: 18 }}>
        {/* 국가 소개 요약(있을 때만 간결 표시, 펼치기·편집 버튼 제거) */}
        {plainPreview ? (
          <IdentityProseBlock>
            <p className="clamp">{plainPreview}</p>
          </IdentityProseBlock>
        ) : null}

        {/* 2. 현직 국가수반 스포트라이트 */}
        {!hideIncumbentHeads ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 8 }}>
              <span>현직 국가수반 · 행정부</span>
              {currentCabinet ? (
                <InlineCabinetLink
                  type="button"
                  onClick={() => onOpenCabinets(currentCabinet.cabinetId)}
                >
                  {currentCabinet.name} · 각료 {currentCabinet.ministerCount}명{' '}
                  <FiArrowUpRight size={10.5} />
                </InlineCabinetLink>
              ) : null}
            </BentoSubLabel>

            {currentHeads.length > 0 ? (
              <HeadsGrid>
                {currentHeads.slice(0, 2).map((head) => {
                  const avatar = head.profileImageUrl
                    ? getUploadImageUrl(head.profileImageUrl)
                    : null
                  return (
                    <HeadCardBtn
                      key={head.tenureId}
                      type="button"
                      onClick={() => {
                        if (onFocusTenure) onFocusTenure(head.tenureId)
                        if (head.personId) onSelectPerson(head.personId)
                        else onOpenHeadsTab()
                      }}
                    >
                      <HeadAvatar>
                        {avatar ? (
                          <img src={avatar} alt="" />
                        ) : (
                          <FiUser size={15} />
                        )}
                      </HeadAvatar>
                      <HeadMeta>
                        <HeadRole>{head.positionTitle}</HeadRole>
                        <HeadName>{head.personName}</HeadName>
                        {head.startDate ? (
                          <HeadSince>
                            {String(head.startDate).slice(0, 10)} 취임
                          </HeadSince>
                        ) : null}
                      </HeadMeta>
                    </HeadCardBtn>
                  )
                })}
              </HeadsGrid>
            ) : currentCabinet ? (
              <IncumbentEmptyStrip
                type="button"
                onClick={() => onOpenCabinets(currentCabinet.cabinetId)}
              >
                <strong>{currentCabinet.name}</strong>
                <span>각료 {currentCabinet.ministerCount}명 상세 보기 →</span>
              </IncumbentEmptyStrip>
            ) : (
              <IncumbentEmptyStrip
                type="button"
                onClick={() => onOpenCabinets(null)}
              >
                <span>현직 국가수반 미등록</span>
                <strong>+ 현직 수반 · 행정부 등록</strong>
              </IncumbentEmptyStrip>
            )}
          </div>
        ) : null}

        {/* 2-B. 최근 · 주요 전임 국가수반 (최대 3인, 마인드맵 연동) */}
        {recentPastHeads.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 8 }}>
              <span>이전 국가수반</span>
              <InlineCabinetLink type="button" onClick={onOpenHeadsTab}>
                역대 전체 ({modernHeadRecordsCount}) <FiArrowUpRight size={10.5} />
              </InlineCabinetLink>
            </BentoSubLabel>
            <PastHeadsRow>
              {recentPastHeads.map((past) => {
                const avatar = past.profileImageUrl
                  ? getUploadImageUrl(past.profileImageUrl)
                  : null
                const focused = activeTenureId === past.recordId
                const spanText = past.mergedEndYear
                  ? `${past.mergedStartYear}–${past.mergedEndYear}`
                  : `${past.mergedStartYear}–`
                return (
                  <PastHeadChipBtn
                    key={past.recordId}
                    type="button"
                    $active={focused}
                    onClick={() => {
                      if (onFocusTenure) {
                        onFocusTenure(past.recordId)
                      } else if (past.personId) {
                        onSelectPerson(past.personId)
                      } else {
                        onOpenHeadsTab()
                      }
                    }}
                  >
                    <PastHeadMiniAvatar>
                      {avatar ? (
                        <img src={avatar} alt="" />
                      ) : (
                        <FiUser size={12} />
                      )}
                    </PastHeadMiniAvatar>
                    <span className="meta">
                      <strong>{past.personName}</strong>
                      <small>
                        {past.ordinal ? `제${past.ordinal}대 · ` : ''}
                        {spanText}
                      </small>
                    </span>
                  </PastHeadChipBtn>
                )
              })}
            </PastHeadsRow>
          </div>
        ) : null}

        {/* 3. 현행 헌정 체제 & 수반 연표 1줄 앵커 요약 */}
        {activeRegimeEra || modernHeadRecordsCount > 0 || historicalHeadCount > 0 ? (
          <SummaryLinkRow
            type="button"
            onClick={
              modernHeadRecordsCount > 0 || historicalHeadCount > 0
                ? onOpenHeadsTab
                : onOpenPoliticalSystem
            }
          >
            <span>
              {activeRegimeEra
                ? `현행 체제: ${activeRegimeEra.label} (${activeRegimeEra.startYear}–${activeRegimeEra.endYear ?? '현재'})`
                : '역대 국가수반 · 정권 연표'}
            </span>
            <strong>
              {modernHeadRecordsCount > 0
                ? `현대 수반 ${modernHeadRecordsCount}건 연표`
                : historicalHeadCount > 0
                  ? `전신 국가 수반 ${historicalHeadCount}건`
                  : `헌정 ${regimeEras.length}기 보기`}{' '}
              <FiArrowUpRight size={11} />
            </strong>
          </SummaryLinkRow>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 6B. Zone 2 — Direct Lineage & Historical Polities Card ──────────────── */

export function ModernLineageCard({
  countryName,
  historicalCountries,
  onOpenHistoricalTab,
  onSelectHistoricalCountry,
}: {
  countryName: string
  historicalCountries: NonNullable<UnifiedCountry['historicalCountries']>
  onOpenHistoricalTab: () => void
  onSelectHistoricalCountry: (id: string) => void
}) {
  const { directPreds, otherPolities, spanBars } = useMemo(() => {
    const nowYr = new Date().getFullYear()
    const MINOR_SUBPOLITY_RE =
      /(공국|대공국|선제후국|변경백|백작령|주교후국|자유도시|제국도시|영지)/

    const sortChrono = (
      arr: NonNullable<UnifiedCountry['historicalCountries']>,
    ) =>
      [...arr].sort((left, right) => {
        const rA = getCountryYearRange(left)
        const rB = getCountryYearRange(right)
        return (
          (rA.start ?? 9999) - (rB.start ?? 9999) ||
          (rA.end ?? nowYr) - (rB.end ?? nowYr)
        )
      })

    const explicitPreds = historicalCountries.filter(
      (hist) => hist.linkKind === 'PREDECESSOR',
    )

    let displayPreds: NonNullable<UnifiedCountry['historicalCountries']>
    let others: NonNullable<UnifiedCountry['historicalCountries']>

    if (explicitPreds.length > 0) {
      const sortedExplicit = sortChrono(explicitPreds)
      displayPreds = sortedExplicit.slice(-5)
      const pickedIds = new Set(displayPreds.map((hist) => hist.id))
      others = [...historicalCountries]
        .filter((hist) => !pickedIds.has(hist.id))
        .sort((left, right) => {
          const rA = getCountryYearRange(left)
          const rB = getCountryYearRange(right)
          return (rB.end ?? rB.start ?? -9999) - (rA.end ?? rA.start ?? -9999)
        })
    } else {
      // 실DB에서 linkKind가 비어 내려오는 경우: 현대 국호 연관성·주권국 격·최근 종식 연도 순으로 핵심 계보 최대 5개 선정
      const coreKeyword = countryName.trim()
      const ranked = [...historicalCountries].sort((left, right) => {
        const rA = getCountryYearRange(left)
        const rB = getCountryYearRange(right)
        const endA = rA.end ?? rA.start ?? -9999
        const endB = rB.end ?? rB.start ?? -9999
        const nameMatchA =
          coreKeyword.length >= 2 && left.name.includes(coreKeyword) ? 1 : 0
        const nameMatchB =
          coreKeyword.length >= 2 && right.name.includes(coreKeyword) ? 1 : 0
        const minorPenaltyA = MINOR_SUBPOLITY_RE.test(left.name) ? 1 : 0
        const minorPenaltyB = MINOR_SUBPOLITY_RE.test(right.name) ? 1 : 0
        // 같은 시기(25년 이내)에 종식된 경우 국호 직계 정치체를 제후국·소공국보다 우선
        if (Math.abs(endA - endB) <= 25) {
          if (nameMatchA !== nameMatchB) return nameMatchB - nameMatchA
          if (minorPenaltyA !== minorPenaltyB) {
            return minorPenaltyA - minorPenaltyB
          }
        }
        if (endA !== endB) return endB - endA
        if (nameMatchA !== nameMatchB) return nameMatchB - nameMatchA
        if (minorPenaltyA !== minorPenaltyB) {
          return minorPenaltyA - minorPenaltyB
        }
        return (rB.start ?? -9999) - (rA.start ?? -9999)
      })

      const topPrimary = ranked.slice(0, 5)
      displayPreds = sortChrono(topPrimary)
      const pickedIds = new Set(displayPreds.map((hist) => hist.id))
      others = ranked.filter((hist) => !pickedIds.has(hist.id))
    }

    const withRange = displayPreds
      .map((hc) => {
        const range = getCountryYearRange(hc)
        if (range.start == null) return null
        const end = range.end ?? nowYr
        return {
          id: hc.id,
          name: hc.name,
          periodLabel: formatCountryPeriod(hc),
          start: range.start,
          end: Math.max(range.start + 1, end),
          years: Math.max(1, end - range.start),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    let bars: {
      minY: number
      maxY: number
      items: Array<
        (typeof withRange)[number] & { leftPct: number; widthPct: number }
      >
    } | null = null

    if (withRange.length >= 2) {
      const minY = Math.min(...withRange.map((item) => item.start))
      const maxY = Math.max(nowYr, ...withRange.map((item) => item.end))
      const totalSpan = Math.max(10, maxY - minY)
      bars = {
        minY,
        maxY,
        items: withRange.map((item) => ({
          ...item,
          leftPct: ((item.start - minY) / totalSpan) * 100,
          widthPct: Math.max(2.5, ((item.end - item.start) / totalSpan) * 100),
        })),
      }
    }

    return {
      directPreds: displayPreds,
      otherPolities: others,
      spanBars: bars,
    }
  }, [historicalCountries, countryName])

  if (historicalCountries.length === 0) return null

  return (
    <BentoCard aria-label="전신 국가 계보 및 관련 역사 정치체">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>국가 계보 · 과거 정치체</BentoCardTitle>
          <BentoCardBadge>{historicalCountries.length}개국</BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenHistoricalTab}>
            과거국가 전체 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {spanBars ? (
          <LineageGanttWrap>
            <BentoSubLabel style={{ marginBottom: 2 }}>
              <span>{spanBars.minY}년</span>
              <span>시대 계승 타임라인 →</span>
              <span>{spanBars.maxY}년</span>
            </BentoSubLabel>
            {spanBars.items.map((bar, idx) => {
              const LINEAGE_ERA_GRADIENTS = [
                'linear-gradient(90deg, #d97706, #fbbf24)',
                'linear-gradient(90deg, #e11d48, #fb7185)',
                'linear-gradient(90deg, #7c3aed, #a78bfa)',
                'linear-gradient(90deg, #0284c7, #38bdf8)',
                'linear-gradient(90deg, #059669, #34d399)',
              ]
              const LINEAGE_ERA_DOTS = [
                '#d97706',
                '#e11d48',
                '#7c3aed',
                '#0284c7',
                '#059669',
              ]
              const gradBg =
                LINEAGE_ERA_GRADIENTS[idx % LINEAGE_ERA_GRADIENTS.length]
              const dotHex = LINEAGE_ERA_DOTS[idx % LINEAGE_ERA_DOTS.length]
              return (
                <LineageGanttRowBtn
                  key={bar.id}
                  type="button"
                  onClick={() => onSelectHistoricalCountry(bar.id)}
                  title={`${bar.name} (${bar.periodLabel} · 약 ${bar.years}년)`}
                >
                  <span className="nm">
                    <i style={{ background: dotHex }} />
                    {bar.name}
                  </span>
                  <div className="track">
                    <div
                      className="fill"
                      style={{
                        left: `${bar.leftPct.toFixed(2)}%`,
                        width: `${Math.max(4, bar.widthPct).toFixed(2)}%`,
                        background: gradBg,
                      }}
                    />
                  </div>
                  <span className="dur">{bar.periodLabel}</span>
                </LineageGanttRowBtn>
              )
            })}
          </LineageGanttWrap>
        ) : directPreds.length > 0 ? (
          <LineageSpineRow>
            {directPreds.map((hc) => (
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
        ) : null}

        {otherPolities.length > 0 ? (
          <SummaryLinkRow type="button" onClick={onOpenHistoricalTab}>
            <span>기타 연관 · 구성 정치체</span>
            <strong>
              외 {otherPolities.length.toLocaleString('ko-KR')}개국 전체 보기{' '}
              <FiArrowUpRight size={11} />
            </strong>
          </SummaryLinkRow>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 6C. Zone 3 — Historical Events & Milestones Card ────────────────────── */

export function ModernEventsCard({
  eventCount,
  centuryBuckets,
  domainBreakdown,
  milestoneEvents = [],
  warSummary,
  onSelectCentury,
  onSelectCell,
  onSelectEvent,
  onOpenEvents,
}: {
  eventCount: number
  centuryBuckets: CenturyDomainBucket[]
  domainBreakdown: Array<{ domain: string; count: number }>
  milestoneEvents?: MilestoneEventItem[]
  warSummary?: WarOutcomeSummary
  onSelectCentury: (century: number) => void
  onSelectCell?: (century: number, domain: string) => void
  onSelectEvent?: (eventId: string) => void
  onOpenEvents: () => void
  onOpenMilitary?: () => void
}) {
  if (
    eventCount === 0 ||
    (centuryBuckets.length === 0 && milestoneEvents.length === 0)
  ) {
    return null
  }

  return (
    <BentoCard aria-label="역사 연표 및 시대별 핵심 사건 흐름">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>역사 연표 · 핵심 전환점</BentoCardTitle>
          <BentoCardBadge>수록 {eventCount.toLocaleString('ko-KR')}건</BentoCardBadge>
          {warSummary && warSummary.totalMilitaryEvents > 0 ? (
            <BentoPill>
              전쟁 {warSummary.wars} · 전투 {warSummary.battles}
            </BentoPill>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenEvents}>
            전체 연표 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <EventsCardSubtitle>
        국가에 기록된 사건들이 어떤 시대·분야에 집중되었는지와 연대기 순 결정적 전환점을 보여줍니다.
      </EventsCardSubtitle>

      <BentoCardBody>
        <CenturyEventMatrixAndMilestones
          buckets={centuryBuckets}
          domainBreakdown={domainBreakdown}
          milestones={milestoneEvents}
          onSelectCentury={onSelectCentury}
          onSelectCell={onSelectCell}
          onSelectEvent={onSelectEvent}
        />
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 6D. Zone 4 — Standalone Military Force Card ─────────────────────────── */

export function MilitaryForceBentoCard({
  militaryCount,
  highCommandCount,
  militaryBranchBreakdown,
  warSummary,
  onOpenMilitary,
}: {
  militaryCount: number
  highCommandCount: number
  militaryBranchBreakdown: MilitaryBranchSummary[]
  warSummary: WarOutcomeSummary
  onOpenMilitary: () => void
}) {
  if (militaryCount === 0 && warSummary.totalMilitaryEvents === 0) {
    return null
  }

  return (
    <BentoCard aria-label="군사 전력 및 참전 전적">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>군사 · 전적</BentoCardTitle>
          {militaryCount > 0 ? (
            <BentoCardBadge>편제 {militaryCount}</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenMilitary}>
            군사 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>
      <BentoCardBody>
        <MilitaryForceInfographicBlock
          militaryCount={militaryCount}
          highCommandCount={highCommandCount}
          branchBreakdown={militaryBranchBreakdown}
          warSummary={warSummary}
          onOpenMilitary={onOpenMilitary}
          hideSubHeader
        />
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 7. Clean Compact Locator Map & Administrative Divisions Card ───────── */

export interface GeoHeroScaleMetrics {
  popNum: number | null
  popYearNote?: string | null
  areaNum: number | null
  densityText: string | null
  continentComparison: ContinentComparison
  economicIndicators?: EconomicIndicator[]
  developmentIndicators?: DevelopmentIndicator[]
  bondYields?: BondYield[]
  onOpenDemographics: () => void
  onOpenEconomics: () => void
  onOpenBonds: () => void
}

export function CompactGeoBentoCard({
  country,
  cityCount,
  scaleMetrics,
  onOpenRegions,
}: {
  country: UnifiedCountry
  cityCount: number
  scaleMetrics?: GeoHeroScaleMetrics
  onOpenRegions: (divisionId?: string) => void
}) {
  const validCoord = clampValidWgs84(country.latitude, country.longitude)
  const [geoMode, setGeoMode] = useState<'roadmap' | 'hybrid'>('roadmap')

  React.useEffect(() => {
    setGeoMode('roadmap')
  }, [country.id])

  const divisionsQuery = useAdministrativeDivisions(
    country.type === 'historical'
      ? { historicalCountryId: country.id }
      : { countryId: country.id },
    null,
  )
  const { data: naturalFeatures = [] } = useNaturalFeatures(
    country.type === 'modern' ? country.id : undefined,
  )
  const { data: infrastructures = [] } = useInfrastructures(
    country.type === 'modern' ? country.id : undefined,
  )

  const { topDivisions, totalDivisionCount } = useMemo(() => {
    const raw = divisionsQuery.data ?? []
    const countTree = (nodes: AdministrativeDivision[]): number => {
      let total = 0
      for (const node of nodes) {
        total += 1
        if (node.children?.length) total += countTree(node.children)
      }
      return total
    }
    return {
      topDivisions: raw.slice(0, 8),
      totalDivisionCount: countTree(raw),
    }
  }, [divisionsQuery.data])

  const geoPoiChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = []
    for (const nf of naturalFeatures) {
      if (chips.length >= 8) break
      chips.push({ id: `nf-${nf.id}`, label: nf.name })
    }
    for (const infra of infrastructures) {
      if (chips.length >= 8) break
      chips.push({ id: `inf-${infra.id}`, label: infra.name })
    }
    return chips
  }, [naturalFeatures, infrastructures])

  const resolvedGeoCount =
    country.type === 'modern'
      ? totalDivisionCount + naturalFeatures.length + infrastructures.length ||
        cityCount
      : totalDivisionCount || cityCount

  const macroStats = useMemo(() => {
    if (!scaleMetrics) return null
    const eco = [...(scaleMetrics.economicIndicators ?? [])].sort(
      (left, right) => right.year - left.year,
    )
    const gdpRow = eco.find(
      (row) => row.gdp != null && Number.isFinite(Number(row.gdp)),
    )
    const capRow = eco.find(
      (row) =>
        row.gdpPerCapita != null && Number.isFinite(Number(row.gdpPerCapita)),
    )
    const growthRow = eco.find(
      (row) =>
        row.gdpGrowthRate != null && Number.isFinite(Number(row.gdpGrowthRate)),
    )
    const dev = [...(scaleMetrics.developmentIndicators ?? [])]
      .filter((row) => row.hdi != null && Number.isFinite(Number(row.hdi)))
      .sort((left, right) => right.year - left.year)
    const hdiRow = dev[0] ?? null

    const bonds = scaleMetrics.bondYields ?? []
    const y10Rows = [...bonds]
      .filter(
        (bond) =>
          bond.maturity === 'Y10' &&
          bond.yieldRate != null &&
          Number.isFinite(Number(bond.yieldRate)),
      )
      .sort((left, right) => right.year - left.year)
    const latestY10 = y10Rows[0] ?? null

    const byYear = new Map<number, Set<string>>()
    for (const row of bonds) {
      if (row.yieldRate == null || !Number.isFinite(Number(row.yieldRate))) {
        continue
      }
      const set = byYear.get(row.year) ?? new Set<string>()
      set.add(row.maturity)
      byYear.set(row.year, set)
    }
    const hasYieldCurve = [...byYear.values()].some((set) => set.size >= 2)

    return {
      gdpVal: gdpRow?.gdp != null ? Number(gdpRow.gdp) : null,
      gdpYear: gdpRow?.year ?? capRow?.year ?? null,
      gdpPerCapVal:
        capRow?.gdpPerCapita != null ? Number(capRow.gdpPerCapita) : null,
      growthVal:
        growthRow?.gdpGrowthRate != null
          ? Number(growthRow.gdpGrowthRate)
          : null,
      hdiVal: hdiRow?.hdi != null ? Number(hdiRow.hdi) : null,
      hdiYear: hdiRow?.year ?? null,
      y10Val: latestY10?.yieldRate != null ? Number(latestY10.yieldRate) : null,
      y10Year: latestY10?.year ?? null,
      hasYieldCurve,
      bonds,
    }
  }, [scaleMetrics])

  if (
    !scaleMetrics &&
    country.type === 'modern' &&
    !validCoord &&
    resolvedGeoCount === 0 &&
    topDivisions.length === 0
  ) {
    return null
  }
  const mapSpec = useMemo(
    () =>
      buildHeadquartersGoogleMapsSpec({
        headquarters: country.capital || country.fullName || country.name,
        latitude: validCoord?.lat ?? null,
        longitude: validCoord?.lng ?? null,
        countryName: country.enName || country.name,
        zoom: 5,
        mapLayer: geoMode === 'hybrid' ? 'hybrid' : 'roadmap',
      }),
    [country, validCoord, geoMode],
  )

  return (
    <BentoCard aria-label="지리 위치 및 최상위 행정구역">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>
            {scaleMetrics ? '지리 · 영토 · 핵심 제원' : '지리 · 행정구역'}
          </BentoCardTitle>
          {resolvedGeoCount > 0 ? (
            <BentoCardBadge>{resolvedGeoCount}건</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <MiniDirSwitch>
            <MiniDirBtn
              type="button"
              $active={geoMode === 'roadmap'}
              onClick={() => setGeoMode('roadmap')}
            >
              지도
            </MiniDirBtn>
            <MiniDirBtn
              type="button"
              $active={geoMode === 'hybrid'}
              onClick={() => setGeoMode('hybrid')}
            >
              위성
            </MiniDirBtn>
          </MiniDirSwitch>
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

      {scaleMetrics ? (
        <GeoScaleStripGrid>
          <GeoScaleCell
            type="button"
            onClick={scaleMetrics.onOpenDemographics}
            title={
              scaleMetrics.popNum != null
                ? `인구 ${formatPopulation(scaleMetrics.popNum)}명`
                : undefined
            }
          >
            <IdentityFactTop>
              <SparkTitle>인구 규모</SparkTitle>
              {scaleMetrics.continentComparison.populationRank != null &&
              scaleMetrics.continentComparison.populationRankTotal ? (
                <DeltaChip>
                  대륙 {scaleMetrics.continentComparison.populationRank}/
                  {scaleMetrics.continentComparison.populationRankTotal}위
                </DeltaChip>
              ) : null}
            </IdentityFactTop>
            <SparkBigNum>
              {scaleMetrics.popNum != null ? (
                `${formatPopulationKo(scaleMetrics.popNum)} 명`
              ) : (
                <EmptyValueText>미기재</EmptyValueText>
              )}
            </SparkBigNum>
            <ScaleCellSub>
              {scaleMetrics.popNum != null
                ? `${formatPopulation(scaleMetrics.popNum)}명${scaleMetrics.popYearNote ? ` · ${scaleMetrics.popYearNote}` : ''}`
                : '인구 지표 보기'}
            </ScaleCellSub>
          </GeoScaleCell>

          <GeoScaleCell type="button" onClick={() => onOpenRegions()}>
            <IdentityFactTop>
              <SparkTitle>영토 면적</SparkTitle>
              {scaleMetrics.continentComparison.areaRank != null &&
              scaleMetrics.continentComparison.areaRankTotal ? (
                <DeltaChip>
                  대륙 {scaleMetrics.continentComparison.areaRank}/
                  {scaleMetrics.continentComparison.areaRankTotal}위
                </DeltaChip>
              ) : null}
            </IdentityFactTop>
            <SparkBigNum>
              {scaleMetrics.areaNum != null ? (
                `${formatAreaValue(scaleMetrics.areaNum)} km²`
              ) : (
                <EmptyValueText>미기재</EmptyValueText>
              )}
            </SparkBigNum>
            <ScaleCellSub>
              {scaleMetrics.densityText
                ? `밀도 ${scaleMetrics.densityText}`
                : '지리·행정구역 보기'}
            </ScaleCellSub>
          </GeoScaleCell>

          {macroStats &&
          (macroStats.gdpVal != null ||
            macroStats.gdpPerCapVal != null ||
            macroStats.growthVal != null) ? (
            <GeoScaleCell
              type="button"
              $spanFull={
                !(
                  macroStats.hdiVal != null ||
                  macroStats.y10Val != null ||
                  macroStats.hasYieldCurve
                )
              }
              onClick={scaleMetrics.onOpenEconomics}
            >
              <IdentityFactTop>
                <SparkTitle>
                  거시경제{macroStats.gdpYear ? ` (${macroStats.gdpYear})` : ''}
                </SparkTitle>
                {macroStats.growthVal != null ? (
                  <DeltaChip>
                    성장 {macroStats.growthVal >= 0 ? '+' : ''}
                    {macroStats.growthVal.toFixed(1)}%
                  </DeltaChip>
                ) : null}
              </IdentityFactTop>
              <SparkBigNum>
                {macroStats.gdpVal != null
                  ? formatMetricValue(macroStats.gdpVal, 'USD')
                  : macroStats.gdpPerCapVal != null
                    ? formatMetricValue(macroStats.gdpPerCapVal, 'USD_CAPITA')
                    : `${macroStats.growthVal?.toFixed(1)}%`}
              </SparkBigNum>
              <ScaleCellSub>
                {macroStats.gdpVal != null && macroStats.gdpPerCapVal != null
                  ? `1인당 ${formatMetricValue(macroStats.gdpPerCapVal, 'USD_CAPITA')}`
                  : '경제 지표 상세 →'}
              </ScaleCellSub>
            </GeoScaleCell>
          ) : null}

          {macroStats &&
          (macroStats.hdiVal != null ||
            macroStats.y10Val != null ||
            macroStats.hasYieldCurve) ? (
            <GeoScaleCell
              type="button"
              $spanFull={
                !(
                  macroStats.gdpVal != null ||
                  macroStats.gdpPerCapVal != null ||
                  macroStats.growthVal != null
                )
              }
              onClick={
                macroStats.hasYieldCurve || macroStats.y10Val != null
                  ? scaleMetrics.onOpenBonds
                  : scaleMetrics.onOpenEconomics
              }
            >
              <IdentityFactTop>
                <SparkTitle>
                  {macroStats.hasYieldCurve
                    ? '국채 수익률곡선'
                    : macroStats.hdiVal != null
                      ? `인간개발지수${macroStats.hdiYear ? ` (${macroStats.hdiYear})` : ''}`
                      : '10년물 국채금리'}
                </SparkTitle>
                {macroStats.hdiVal != null && macroStats.hasYieldCurve ? (
                  <DeltaChip>HDI {macroStats.hdiVal.toFixed(3)}</DeltaChip>
                ) : macroStats.y10Year ? (
                  <DeltaChip>{macroStats.y10Year}년</DeltaChip>
                ) : null}
              </IdentityFactTop>
              {macroStats.hasYieldCurve ? (
                <>
                  <SparkBigNum>
                    {macroStats.y10Val != null
                      ? `10Y ${macroStats.y10Val.toFixed(2)}%`
                      : '만기 구조'}
                  </SparkBigNum>
                  <SovereignYieldCurveSvg
                    bondYields={macroStats.bonds}
                    height={34}
                  />
                </>
              ) : (
                <>
                  <SparkBigNum>
                    {macroStats.hdiVal != null
                      ? macroStats.hdiVal.toFixed(3)
                      : `${macroStats.y10Val!.toFixed(2)}%`}
                  </SparkBigNum>
                  <ScaleCellSub>
                    {macroStats.hdiVal != null && macroStats.y10Val != null
                      ? `국채 10Y ${macroStats.y10Val.toFixed(2)}%`
                      : '통계 탭에서 보기 →'}
                  </ScaleCellSub>
                </>
              )}
            </GeoScaleCell>
          ) : null}
        </GeoScaleStripGrid>
      ) : null}

      <BentoCardBody style={{ gap: 8, paddingTop: 10 }}>
        <SummaryLinkRow type="button" onClick={() => onOpenRegions()}>
          <span>
            <FiMapPin size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
            {[
              country.capital ? `수도 ${country.capital}` : null,
              totalDivisionCount > 0
                ? `행정구역 ${totalDivisionCount}곳`
                : null,
              naturalFeatures.length + infrastructures.length > 0
                ? `자연지리·시설 ${naturalFeatures.length + infrastructures.length}건`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || '광역 행정구역 · 지리 정보'}
          </span>
          <strong>
            지리 상세 <FiArrowUpRight size={11} />
          </strong>
        </SummaryLinkRow>
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
  gap: 10px;
`

const HeadCardBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background 0.16s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const HeadAvatar = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(129, 140, 248, 0.35)'
        : 'rgba(99, 102, 241, 0.22)'};
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
  padding: 9px 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(15, 23, 42, 0.032)'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease;

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

/** 빈 값 — 예전엔 '미등록'을 16px/800 큰 숫자 자리에 그대로 써서 빈 칸이 가장 크게 말했다 */
const EmptyValueText = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  height: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(15, 23, 42, 0.045)'};
  border-radius: 999px;
  overflow: hidden;
`

const PyramidBarMale = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #38bdf8 0%, #3b82f6 52%, #4f46e5 100%);
  border-radius: 999px 0 0 999px;
`

const PyramidBarFemale = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #f43f5e 0%, #ec4899 52%, #f472b6 100%);
  border-radius: 0 999px 999px 0;
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
  padding: 9px 11px;
  border-radius: 13px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.035)'
      : 'rgba(15, 23, 42, 0.028)'};

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
  height: 11px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.055)'};
  overflow: hidden;
`

const TradeBarFill = styled.div<{ $tone: 'export' | 'import' }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ $tone }) =>
    $tone === 'export'
      ? 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)'
      : 'linear-gradient(90deg, #6366f1 0%, #f43f5e 100%)'};
`

const CommodityBarsCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const CommodityBarRow = styled.div`
  display: grid;
  grid-template-columns: minmax(84px, 112px) 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 11px;

  .lb {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }

  .track {
    height: 7px;
    border-radius: 999px;
    overflow: hidden;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
  }

  .fill {
    height: 100%;
    border-radius: 999px;
  }

  .pct {
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    ${DIGIT_DISPLAY}
  }
`

const EventsCardSubtitle = styled.p`
  margin: -6px 0 0;
  padding: 0 0 12px 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  margin: 2px 0 4px;
  height: 208px;
  border-radius: 18px;
  overflow: hidden;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.09)'
      : 'inset 0 0 0 1px rgba(15, 23, 42, 0.08)'};

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
`

const ExternalMapAnchor = styled.a`
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.14)'
        : 'rgba(15, 23, 42, 0.08)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 23, 42, 0.84)'
      : 'rgba(255, 255, 255, 0.92)'};
  backdrop-filter: blur(6px);
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 10.5px;
  font-weight: 650;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const DivisionChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const DivisionChipBtn = styled.button`
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(15, 23, 42, 0.042)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

/* ─── NationalPowerGaugeStrip & Donut Atlas Styled Helpers ───────────────── */

const GaugeStripGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const GaugeCellBtn = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 13px 16px;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition: background 0.14s ease;

  & + & {
    border-left: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 1100px) and (min-width: 601px) {
    &:nth-child(2n + 1) {
      border-left: none;
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }

  @media (max-width: 600px) {
    & + & {
      border-left: none;
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const GaugeCellTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
`

const GaugeRowInline = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const GaugeSideStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  div {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  span {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  strong {
    font-size: 12px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${DIGIT_DISPLAY}
  }
`

const GaugeEmptyHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MiniPyramidBtn = styled.button`
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 11px 12px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.035)'
      : 'rgba(15, 23, 42, 0.028)'};
  font-family: inherit;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const AgeCohortDonutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const TradeBalanceBtn = styled.button`
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  padding: 11px 14px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.035)'
      : 'rgba(15, 23, 42, 0.028)'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const MiniDirSwitch = styled.span`
  display: inline-flex;
  padding: 2.5px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.045)'};
`

const MiniDirBtn = styled.button<{ $active: boolean }>`
  height: 21px;
  padding: 0 9px;
  border: none;
  border-radius: 999px;
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.28)'
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ theme, $active }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 3px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 550)};
  cursor: pointer;
`

const LineageGanttWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const LineageGanttRowBtn = styled.button`
  display: grid;
  grid-template-columns: minmax(112px, 160px) 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 3px 5px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  .nm {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }

  .track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.055)'
        : 'rgba(15, 23, 42, 0.05)'};
    overflow: hidden;
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .dur {
    text-align: right;
    white-space: nowrap;
    font-size: 10.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }

  @media (max-width: 560px) {
    grid-template-columns: 112px 1fr auto;
  }
`

/* ─── 8. Modern Executive Reign Spectrum Card (MindMap Live Sync) ─────────── */

interface BrokenAxisGap {
  fromYear: number
  toYear: number
  leftPct: number
  widthPct: number
}

interface BrokenYearAxis {
  toPct: (year: number) => number
  gaps: BrokenAxisGap[]
  ticks: Array<{ year: number; pct: number }>
}

/**
 * 기록이 없는 긴 공백을 접은 연도 축.
 *
 * 재임은 현대·역사 국가 두 칸을 다 채우므로 독일 연표에 카롤루스(768)부터 들어온다. 축을 그대로 두면 1038–1694의
 * 656년 공백이 막대의 절반을 차지해 근대 재임이 손톱만 해졌다. 그렇다고 앞을 자르면 헝가리처럼 기록 대부분이
 * 옛 시대인 나라는 거의 다 사라진다. 그래서 공백만 접는다 — 공백(앞 기록 끝 → 다음 기록 시작)이
 * max(60년, 전체의 12%)를 넘으면 그 구간을 좁은 사선 칸 하나로 줄이고, 나머지 폭을 기록 블록의 햇수대로 나눈다.
 */
function buildBrokenYearAxis(
  intervals: Array<{ start: number; end: number }>,
  minY: number,
  maxY: number,
): BrokenYearAxis {
  const GAP_SLOT_PCT = 3
  const MIN_BLOCK_PCT = 5
  const totalSpan = Math.max(4, maxY - minY)
  const gapThreshold = Math.max(60, Math.round(totalSpan * 0.12))

  const sorted = intervals
    .filter((iv) => Number.isFinite(iv.start))
    .map((iv) => ({ start: iv.start, end: Math.max(iv.start + 1, iv.end) }))
    .sort((left, right) => left.start - right.start)

  const blocks: Array<{ from: number; to: number }> = []
  for (const iv of sorted) {
    const last = blocks[blocks.length - 1]
    if (last && iv.start - last.to <= gapThreshold) {
      last.to = Math.max(last.to, iv.end)
    } else {
      blocks.push({ from: iv.start, to: iv.end })
    }
  }
  if (blocks.length === 0) blocks.push({ from: minY, to: maxY })
  blocks[blocks.length - 1].to = Math.max(blocks[blocks.length - 1].to, maxY)

  const usable = 100 - GAP_SLOT_PCT * (blocks.length - 1)
  const years = blocks.map((block) => Math.max(1, block.to - block.from))
  const yearSum = years.reduce((sum, value) => sum + value, 0)
  const rawWidths = years.map((value) => Math.max(MIN_BLOCK_PCT, (value / yearSum) * usable))
  const rawSum = rawWidths.reduce((sum, value) => sum + value, 0)
  const widths = rawWidths.map((value) => (value / rawSum) * usable)

  const laid: Array<{ from: number; to: number; left: number; width: number }> = []
  let cursor = 0
  blocks.forEach((block, idx) => {
    laid.push({ ...block, left: cursor, width: widths[idx] })
    cursor += widths[idx] + GAP_SLOT_PCT
  })

  const toPct = (year: number): number => {
    for (let idx = 0; idx < laid.length; idx += 1) {
      const block = laid[idx]
      if (year <= block.to || idx === laid.length - 1) {
        if (year < block.from) return block.left
        const ratio = (Math.min(year, block.to) - block.from) / Math.max(1, block.to - block.from)
        return Math.max(0, Math.min(100, block.left + ratio * block.width))
      }
    }
    return 100
  }

  const gaps: BrokenAxisGap[] = laid.slice(0, -1).map((block, idx) => ({
    fromYear: block.to,
    toYear: laid[idx + 1].from,
    leftPct: block.left + block.width,
    widthPct: GAP_SLOT_PCT,
  }))

  let ticks: Array<{ year: number; pct: number }>
  if (laid.length === 1) {
    const only = laid[0]
    const blockSpan = only.to - only.from
    ticks = [0, 0.25, 0.5, 0.75]
      .map((ratio) => Math.round(only.from + blockSpan * ratio))
      .map((year) => ({ year, pct: toPct(year) }))
  } else {
    /* 블록마다 시작 연도, 넓은 블록(40%+)은 안쪽 눈금 둘 더 — 너무 붙는 눈금(8% 이내)은 빼서 글자가 겹치지 않게 */
    ticks = []
    const pushTick = (year: number) => {
      const pct = toPct(year)
      const prev = ticks[ticks.length - 1]
      if (!prev || pct - prev.pct >= 8) ticks.push({ year, pct })
    }
    for (const block of laid) {
      pushTick(block.from)
      if (block.width >= 40) {
        const blockSpan = block.to - block.from
        pushTick(Math.round(block.from + blockSpan / 3))
        pushTick(Math.round(block.from + (blockSpan * 2) / 3))
      }
    }
  }
  ticks = ticks.filter((tick) => tick.pct <= 78)
  ticks.push({ year: maxY, pct: 100 })

  return { toPct, gaps, ticks }
}

export function ModernExecutiveSpectrumCard({
  timeline,
  regimeEras = [],
  activeTenureId,
  onFocusTenure,
  onSelectPerson,
  onOpenCabinets,
  onOpenPoliticalSystem,
  onOpenHeadsTab,
}: {
  timeline: ExecutiveTimelineItem[]
  regimeEras?: RegimeEraBand[]
  activeTenureId?: string | null
  onFocusTenure: (tenureId: string) => void
  onSelectPerson: (personId: string) => void
  onOpenCabinets: () => void
  onOpenPoliticalSystem?: () => void
  onOpenHeadsTab: () => void
}) {
  const theme = useTheme()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const model = useMemo(() => {
    if (timeline.length === 0) return null
    const nowYr = new Date().getFullYear()
    const stateItems = timeline.filter((t) => t.axis === 'HEAD_OF_STATE')
    const govItems = timeline.filter((t) => t.axis === 'HEAD_OF_GOVERNMENT')
    const allStarts = [
      ...timeline.map((t) => t.startYear),
      ...regimeEras.map((e) => e.startYear),
    ]
    const minY = Math.min(...allStarts)
    const maxY = Math.max(
      nowYr,
      ...timeline.map((t) => t.endYear ?? nowYr),
      ...regimeEras.map((e) => e.endYear ?? nowYr),
    )
    const axis = buildBrokenYearAxis(
      [
        ...timeline.map((t) => ({ start: t.startYear, end: t.endYear ?? nowYr })),
        ...regimeEras.map((e) => ({ start: e.startYear, end: e.endYear ?? nowYr })),
      ],
      minY,
      maxY,
    )

    /*
     * 같은 시기에 나란히 선 정체(헝가리 왕국 ∥ 오스트리아-헝가리 이중제국, 프로이센 ∥ 독일 제국, 서독 ∥ 동독)는
     * 한 줄에 겹쳐 그리면 이름 글자가 포개졌다 — 겹치는 것끼리는 아랫줄로 내린다(시작순 탐욕 배정).
     * 줄 비교는 연도로 한다 — 화면 %로 하면 짧은 체제의 최소 폭(2%)이 다음 체제에 살짝 닿는 것까지 겹침으로 세어
     * 독일이 4줄이 됐다(바이마르 14년 → 나치). 그런 칸은 이름을 안 그릴 만큼 좁아 닿아도 글자가 포개지지 않는다.
     */
    const laneEnds: number[] = []
    const eraBands = [...regimeEras]
      .sort((left, right) => left.startYear - right.startYear)
      .map((era, idx) => {
        const end = era.endYear ?? nowYr
        const dur = Math.max(0.8, end - era.startYear)
        const leftPct = Math.min(98, axis.toPct(era.startYear))
        const widthPct = Math.max(
          2,
          Math.min(100 - leftPct, axis.toPct(era.startYear + dur) - leftPct),
        )
        let lane = laneEnds.findIndex((laneEndYear) => laneEndYear <= era.startYear)
        if (lane === -1) {
          lane = laneEnds.length
          laneEnds.push(end)
        }
        laneEnds[lane] = end
        return {
          ...era,
          endResolved: end,
          leftPct,
          widthPct,
          lane,
          even: idx % 2 === 0,
        }
      })
      .filter((b) => b.widthPct > 0)
    const eraLaneCount = Math.max(1, laneEnds.length)

    const mapTrack = (
      items: ExecutiveTimelineItem[],
      defaultDark: string,
      defaultLight: string,
    ) =>
      items.map((item, idx) => {
        const end = item.endYear ?? nowYr
        const dur = Math.max(0.8, end - item.startYear)
        const leftPct = Math.min(98.2, axis.toPct(item.startYear))
        const widthPct = Math.max(
          1.8,
          Math.min(100 - leftPct, axis.toPct(item.startYear + dur) - leftPct),
        )
        const fallback = theme.mode === 'dark' ? defaultDark : defaultLight
        return {
          ...item,
          endResolved: end,
          leftPct,
          widthPct,
          barColor: item.partyColor || fallback,
          altAlpha: idx % 2 === 0 ? 0.92 : 0.68,
        }
      })

    const tracks: Array<{
      key: string
      label: string
      rows: ReturnType<typeof mapTrack>
    }> = []

    if (stateItems.length > 0) {
      tracks.push({
        key: 'state',
        label: govItems.length > 0 ? '국가원수' : '역대 수반',
        rows: mapTrack(stateItems, '#a5b4fc', '#4f46e5'),
      })
    }
    if (govItems.length > 0) {
      tracks.push({
        key: 'gov',
        label: '정부수반',
        rows: mapTrack(govItems, '#38bdf8', '#0284c7'),
      })
    }


    // 동일 인물(연임·겸직: 조지 워싱턴 1·2기, 프로이센 국왕+독일 황제 겸직 등)을 하나의 칩으로 병합 후 최근 10명 추출
    const byLeader = new Map<
      string,
      ExecutiveTimelineItem & {
        minStart: number
        maxEnd: number | null
        hasOpenEnd: boolean
        recordIds: string[]
      }
    >()
    for (const item of timeline) {
      const leaderKey = item.personId
        ? `pid:${item.personId}`
        : `nm:${item.personName.replace(/\s+/g, '')}`
      const existing = byLeader.get(leaderKey)
      if (!existing) {
        byLeader.set(leaderKey, {
          ...item,
          minStart: item.startYear,
          maxEnd: item.endYear,
          hasOpenEnd: item.endYear == null,
          recordIds: [item.recordId],
        })
      } else {
        existing.minStart = Math.min(existing.minStart, item.startYear)
        if (item.endYear == null) {
          existing.hasOpenEnd = true
          existing.maxEnd = null
        } else if (!existing.hasOpenEnd) {
          existing.maxEnd = Math.max(
            existing.maxEnd ?? item.endYear,
            item.endYear,
          )
        }
        existing.recordIds.push(item.recordId)
        // 더 최근 재임이거나 이미지·정당색이 있는 행의 메타를 우선 반영
        if (
          (item.endYear ?? nowYr) >= (existing.endYear ?? nowYr) ||
          (!existing.profileImageUrl && item.profileImageUrl)
        ) {
          existing.recordId = item.recordId
          existing.profileImageUrl =
            item.profileImageUrl ?? existing.profileImageUrl
          existing.partyColor = item.partyColor ?? existing.partyColor
          existing.partyName = item.partyName ?? existing.partyName
          existing.ordinal = item.ordinal ?? existing.ordinal
        }
      }
    }

    const recentChips = [...byLeader.values()]
      .sort(
        (left, right) =>
          (right.hasOpenEnd ? nowYr + 1 : (right.maxEnd ?? right.minStart)) -
            (left.hasOpenEnd ? nowYr + 1 : (left.maxEnd ?? left.minStart)) ||
          right.minStart - left.minStart,
      )
      .slice(0, 10)
      .reverse()

    return { minY, maxY, eraBands, eraLaneCount, tracks, axis, recentChips }
  }, [timeline, regimeEras, theme.mode])

  if (!model) {
    return null
  }

  const hoveredItem =
    timeline.find((t) => t.recordId === (hoveredId ?? activeTenureId)) ??
    timeline[timeline.length - 1]
  const hasLabelCol = model.tracks.length > 1 || model.eraBands.length > 0

  return (
    <BentoCard aria-label="역대 국가수반 재임 스펙트럼">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>역대 국가수반</BentoCardTitle>
          <BentoCardBadge>
            {model.minY}–현재 · {timeline.length}대 재임
          </BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {hoveredItem ? (
            <ExecHoverReadout>
              {hoveredItem.partyColor ? (
                <span
                  className="dot"
                  style={{ background: hoveredItem.partyColor }}
                />
              ) : null}
              <strong>
                {hoveredItem.ordinal != null ? `제${hoveredItem.ordinal}대 ` : ''}
                {hoveredItem.personName}
              </strong>
              <span>
                {hoveredItem.partyName ? `${hoveredItem.partyName} · ` : ''}
                {hoveredItem.startYear}–{hoveredItem.endYear ?? '현직'}
              </span>
            </ExecHoverReadout>
          ) : null}
          <BentoActionBtn type="button" onClick={onOpenCabinets}>
            역대 내각
          </BentoActionBtn>
          <BentoActionBtn type="button" $accent onClick={onOpenHeadsTab}>
            수반 연표 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody style={{ gap: 10 }}>
        <ExecTracksStack>
          {/* 상단 동기화 헌정 체제(PoliticalSystem) 시대 밴드 */}
          {model.eraBands.length > 0 ? (
            <ExecTrackRow $dual={hasLabelCol}>
              {hasLabelCol ? (
                <ExecTrackAxisLabel>헌정체제</ExecTrackAxisLabel>
              ) : null}
              <RegimeEraBar style={{ height: model.eraLaneCount * REGIME_LANE_PX + 2 }}>
                <AxisGapMarks gaps={model.axis.gaps} />
                {model.eraBands.map((band) => (
                  <RegimeEraSegBtn
                    key={band.id}
                    type="button"
                    $even={band.even}
                    style={{
                      left: `${band.leftPct.toFixed(2)}%`,
                      width: `${band.widthPct.toFixed(2)}%`,
                      top: band.lane * REGIME_LANE_PX,
                      height: REGIME_LANE_PX - (model.eraLaneCount > 1 ? 1 : 0),
                      bottom: 'auto',
                    }}
                    onClick={() => onOpenPoliticalSystem?.()}
                    title={`${band.label}${band.governmentFormLabel ? ` (${band.governmentFormLabel})` : ''} · ${band.startYear}–${band.endYear ?? '현재'}`}
                  >
                    {band.widthPct >= 9 ? <span>{band.label}</span> : null}
                  </RegimeEraSegBtn>
                ))}
              </RegimeEraBar>
            </ExecTrackRow>
          ) : null}

          {model.tracks.map((track) => (
            <ExecTrackRow key={track.key} $dual={hasLabelCol}>
              {hasLabelCol ? (
                <ExecTrackAxisLabel>{track.label}</ExecTrackAxisLabel>
              ) : null}
              <ExecSpectrumBar>
                <AxisGapMarks gaps={model.axis.gaps} />
                {track.rows.map((seg) => {
                  const isActive = seg.recordId === activeTenureId
                  return (
                    <ExecSegmentBtn
                      key={seg.recordId}
                      type="button"
                      $active={isActive}
                      style={{
                        left: `${seg.leftPct.toFixed(2)}%`,
                        width: `${seg.widthPct.toFixed(2)}%`,
                        background: seg.barColor,
                        opacity: isActive ? 1 : seg.altAlpha,
                      }}
                      onMouseEnter={() => setHoveredId(seg.recordId)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => {
                        onFocusTenure(seg.recordId)
                        if (seg.personId) onSelectPerson(seg.personId)
                      }}
                      title={`${seg.ordinal != null ? `제${seg.ordinal}대 ` : ''}${seg.personName}${seg.partyName ? ` (${seg.partyName})` : ''} · ${seg.startYear}–${seg.endYear ?? '현직'}`}
                    />
                  )
                })}
              </ExecSpectrumBar>
            </ExecTrackRow>
          ))}
          <ExecTickRow $indented={hasLabelCol}>
            <div className="rail">
              {model.axis.ticks.map((tick, tickIdx) => {
                const isLast = tickIdx === model.axis.ticks.length - 1
                return (
                  <span
                    key={`${tick.year}-${tickIdx}`}
                    className={tickIdx === 0 ? 'first' : isLast ? 'last' : undefined}
                    style={isLast ? undefined : { left: `${tick.pct.toFixed(2)}%` }}
                  >
                    {isLast ? `현재(${tick.year})` : `${tick.year}년`}
                  </span>
                )
              })}
            </div>
          </ExecTickRow>
        </ExecTracksStack>

        <ExecQuickChipsRow>
          {model.recentChips.map((chip) => {
            const isSelected = Boolean(
              activeTenureId && chip.recordIds.includes(activeTenureId),
            )
            const avatar = chip.profileImageUrl
              ? getUploadImageUrl(chip.profileImageUrl)
              : null
            const spanShort = chip.hasOpenEnd
              ? `${chip.minStart}–현직`
              : chip.maxEnd != null && chip.maxEnd !== chip.minStart
                ? `${chip.minStart}–${chip.maxEnd}`
                : `${chip.minStart}`
            return (
              <ExecChipGroup key={chip.recordId} $active={isSelected}>
                <ExecLeaderChipBtn
                  type="button"
                  $active={isSelected}
                  onClick={() => {
                    onFocusTenure(chip.recordId)
                    if (chip.personId) onSelectPerson(chip.personId)
                  }}
                  title={`${chip.personName} (${spanShort}) 인물 정보 보기`}
                >
                  <span className="av">
                    {avatar ? (
                      <img src={avatar} alt="" />
                    ) : (
                      <FiUser size={10} aria-hidden />
                    )}
                  </span>
                  {chip.partyColor ? (
                    <span
                      className="pdot"
                      style={{ background: chip.partyColor }}
                    />
                  ) : null}
                  <strong>
                    {chip.ordinal != null ? `${chip.ordinal}대 ` : ''}
                    {chip.personName}
                  </strong>
                  <small>{spanShort}</small>
                </ExecLeaderChipBtn>
                {chip.personId ? (
                  <ExecPersonPinBtn
                    type="button"
                    onClick={() => onSelectPerson(chip.personId!)}
                    title={`${chip.personName} 인물 상세 미리보기`}
                    aria-label={`${chip.personName} 인물 정보`}
                  >
                    <FiArrowUpRight size={10} />
                  </ExecPersonPinBtn>
                ) : null}
              </ExecChipGroup>
            )
          })}
        </ExecQuickChipsRow>
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 9. 6-Axis National Radar Profile & 10-Domain Density Card ──────────── */

export interface ModernDomainDensityItem {
  key: string
  label: string
  count: number
  unit?: string
  onClick: () => void
}

export function NationalRadarProfileCard({
  countryId,
  countryName,
  continentId,
  powerAxes,
  archiveAxes,
  peerCountries = [],
  domainItems,
  totalRecords,
}: {
  countryId: string
  countryName: string
  continentId?: string | null
  powerAxes: RadarAxisMetric[]
  archiveAxes: RadarAxisMetric[]
  peerCountries?: PeerCountryMetric[]
  domainItems: ModernDomainDensityItem[]
  totalRecords: number
}) {
  const [radarMode, setRadarMode] = useState<'power' | 'archive'>('power')
  const [compareId, setCompareId] = useState<string>('')

  const populated = domainItems.filter((d) => d.count > 0).length
  const maxCount = Math.max(1, ...domainItems.map((d) => d.count))

  const sortedPeers = useMemo(() => {
    const others = peerCountries.filter((p) => p.id !== countryId)
    return [...others].sort((a, b) => {
      const aSame = continentId && a.continentId === continentId ? 0 : 1
      const bSame = continentId && b.continentId === continentId ? 0 : 1
      if (aSame !== bSame) return aSame - bSame
      return (b.population ?? 0) - (a.population ?? 0)
    })
  }, [peerCountries, countryId, continentId])

  const selectedPeer = useMemo(
    () => sortedPeers.find((p) => p.id === compareId) ?? null,
    [sortedPeers, compareId],
  )

  const compareRadarAxes = useMemo<RadarAxisMetric[] | null>(() => {
    if (!selectedPeer || radarMode !== 'power') return null
    const popPeers = peerCountries
      .map((p) => p.population)
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b)
    const areaPeers = peerCountries
      .map((p) => p.areaSqKm)
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b)
    const densPeers = peerCountries
      .map((p) =>
        p.population && p.areaSqKm && p.areaSqKm > 0
          ? p.population / p.areaSqKm
          : null,
      )
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b)

    const pctRank = (arr: number[], val: number | null) => {
      if (val == null || val <= 0 || arr.length === 0) return 20
      let below = 0
      for (const item of arr) {
        if (item <= val) below += 1
      }
      return Math.max(14, Math.min(100, Math.round((below / arr.length) * 100)))
    }

    const peerDens =
      selectedPeer.population &&
      selectedPeer.areaSqKm &&
      selectedPeer.areaSqKm > 0
        ? selectedPeer.population / selectedPeer.areaSqKm
        : null
    const popScore = pctRank(popPeers, selectedPeer.population)
    const areaScore = pctRank(areaPeers, selectedPeer.areaSqKm)
    const densScore = pctRank(densPeers, peerDens)
    const scaleBlend = Math.round((popScore * 0.6 + areaScore * 0.4))

    return powerAxes.map((ax) => {
      if (ax.key === 'pop') {
        return {
          key: ax.key,
          label: ax.label,
          score: popScore,
          valueLabel:
            selectedPeer.population != null
              ? formatPopulation(selectedPeer.population)
              : '—',
        }
      }
      if (ax.key === 'area') {
        return {
          key: ax.key,
          label: ax.label,
          score: areaScore,
          valueLabel:
            selectedPeer.areaSqKm != null
              ? formatAreaValue(selectedPeer.areaSqKm)
              : '—',
        }
      }
      if (ax.key === 'density') {
        return {
          key: ax.key,
          label: ax.label,
          score: densScore,
          valueLabel: peerDens != null ? `${peerDens.toFixed(0)}명/km²` : '—',
        }
      }
      return {
        key: ax.key,
        label: ax.label,
        score: scaleBlend,
        valueLabel: `${selectedPeer.name} 추정`,
      }
    })
  }, [selectedPeer, radarMode, peerCountries, powerAxes])

  const selfPeer = useMemo(
    () => peerCountries.find((p) => p.id === countryId) ?? null,
    [peerCountries, countryId],
  )

  const activeAxes = radarMode === 'power' ? powerAxes : archiveAxes

  return (
    <BentoCard aria-label="6축 국가 역량 레이더 및 도메인 아카이브 밀도">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>국력 · 기록 밀도</BentoCardTitle>
          <BentoCardBadge>
            {populated}/{domainItems.length}축 ·{' '}
            {totalRecords.toLocaleString('ko-KR')}건
          </BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {radarMode === 'power' && sortedPeers.length > 0 ? (
            <ComparePeerSelect
              aria-label="레이더 비교 국가 선택"
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
            >
              <option value="">비교 국가 선택…</option>
              {sortedPeers.slice(0, 40).map((peer) => (
                <option key={peer.id} value={peer.id}>
                  {peer.flagEmoji ? `${peer.flagEmoji} ` : ''}
                  {peer.name}
                </option>
              ))}
            </ComparePeerSelect>
          ) : null}
          <MiniDirSwitch>
            <MiniDirBtn
              type="button"
              $active={radarMode === 'power'}
              onClick={() => setRadarMode('power')}
            >
              국력 백분위
            </MiniDirBtn>
            <MiniDirBtn
              type="button"
              $active={radarMode === 'archive'}
              onClick={() => setRadarMode('archive')}
            >
              사료 밀도
            </MiniDirBtn>
          </MiniDirSwitch>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {selectedPeer && radarMode === 'power' ? (
          <PeerComparisonStrip>
            <span>
              <strong>{countryName}</strong> vs{' '}
              <strong>
                {selectedPeer.flagEmoji ? `${selectedPeer.flagEmoji} ` : ''}
                {selectedPeer.name}
              </strong>
            </span>
            <span className="nums">
              {selfPeer?.population && selectedPeer.population
                ? `인구 ${(selfPeer.population / selectedPeer.population).toFixed(2)}배`
                : ''}
              {selfPeer?.population &&
              selectedPeer.population &&
              selfPeer?.areaSqKm &&
              selectedPeer.areaSqKm
                ? ' · '
                : ''}
              {selfPeer?.areaSqKm && selectedPeer.areaSqKm
                ? `면적 ${(selfPeer.areaSqKm / selectedPeer.areaSqKm).toFixed(2)}배`
                : ''}
            </span>
          </PeerComparisonStrip>
        ) : null}

        <RadarProfileSplit>
          <RadarChartCol>
            <NationalRadarPolygonChart
              axes={activeAxes}
              compareAxes={compareRadarAxes}
              primaryLabel={countryName}
              compareLabel={selectedPeer?.name ?? null}
            />
          </RadarChartCol>

          <DomainMatrixGrid>
            {domainItems.map((item) => {
              const pct =
                item.count > 0
                  ? Math.max(7, Math.round((item.count / maxCount) * 100))
                  : 0
              return (
                <DomainDensityBtn
                  key={item.key}
                  type="button"
                  $empty={item.count === 0}
                  onClick={item.onClick}
                >
                  <div className="top">
                    <span className="lb">{item.label}</span>
                    <strong className="val">
                      {item.count > 0
                        ? `${item.count.toLocaleString('ko-KR')}${item.unit ?? '건'}`
                        : '+ 입력'}
                    </strong>
                  </div>
                  <div className="bar">
                    {pct > 0 ? <div className="fill" style={{ width: `${pct}%` }} /> : null}
                  </div>
                </DomainDensityBtn>
              )
            })}
          </DomainMatrixGrid>
        </RadarProfileSplit>
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 10. Parliament Hemicycle + Party Spectrum + Turnout Bento Card ─────── */

const SPECTRUM_ORDER: PoliticalPosition[] = [
  'FAR_LEFT',
  'LEFT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'RIGHT',
  'FAR_RIGHT',
  'BIG_TENT',
]

const POSITION_SORT_WEIGHT: Record<string, number> = {
  FAR_LEFT: 1,
  LEFT: 2,
  CENTER_LEFT: 3,
  CENTER: 4,
  BIG_TENT: 5,
  CENTER_RIGHT: 6,
  RIGHT: 7,
  FAR_RIGHT: 8,
}

export function ParliamentAndPartyBentoCard({
  parties,
  civicSnapshot,
  currentCabinet,
  electionCount,
  modernElectionCount,
  historicalElectionCount = 0,
  nextElection,
  recentElection,
  polityScope = 'modern',
  onOpenElections,
  onOpenPoliticalSystem,
  onOpenPartyCatalog,
}: {
  parties: PoliticalParty[]
  civicSnapshot: CivicInstitutionalSnapshot
  currentCabinet: CurrentCabinetSummary | null
  electionCount: number
  modernElectionCount?: number
  historicalElectionCount?: number
  nextElection: ElectionSummary | null
  recentElection: ElectionSummary | null
  polityScope?: 'modern' | 'historical'
  onOpenElections: (electionId?: string) => void
  onOpenPoliticalSystem?: () => void
  onOpenPartyCatalog: () => void
}) {
  const theme = useTheme()
  const seatsInfo = civicSnapshot.activePolitySeats
  const latestLegId = civicSnapshot.latestLegislativeElectionId
  const resolvedModernElectionCount = modernElectionCount ?? electionCount

  const latestLegQuery = useQuery({
    queryKey: ['election-detail-dashboard', latestLegId],
    queryFn: () => getElection(latestLegId!),
    enabled: Boolean(latestLegId),
    staleTime: 1000 * 60 * 5,
  })

  const partyMetaById = useMemo(
    () => new Map(parties.map((party) => [party.id, party])),
    [parties],
  )

  const scopedParties = useMemo(
    () =>
      polityScope === 'historical'
        ? parties
        : parties.filter(
            (party) => !party.historicalCountryId || !party.dissolvedDate,
          ),
    [parties, polityScope],
  )

  const activeParties = useMemo(
    () => scopedParties.filter((party) => !party.dissolvedDate),
    [scopedParties],
  )

  const historicalPartyCount =
    polityScope === 'modern'
      ? Math.max(0, parties.length - scopedParties.length)
      : 0

  const spectrumSource =
    activeParties.length > 0 ? activeParties : scopedParties
  const spectrumSlices = useMemo<SegmentSlice[]>(() => {
    const counts = new Map<string, number>()
    for (const party of spectrumSource) {
      const pos = party.position ?? 'UNCLASSIFIED'
      counts.set(pos, (counts.get(pos) ?? 0) + 1)
    }
    const list: SegmentSlice[] = []
    for (const pos of SPECTRUM_ORDER) {
      const cnt = counts.get(pos) ?? 0
      if (cnt > 0) {
        list.push({
          key: pos,
          label: POLITICAL_POSITION_LABEL[pos],
          value: cnt,
          color: POLITICAL_POSITION_COLOR[pos],
          meta: `${cnt}당`,
        })
      }
    }
    const unc = counts.get('UNCLASSIFIED') ?? 0
    if (unc > 0) {
      list.push({
        key: 'UNCLASSIFIED',
        label: '기타·미분류',
        value: unc,
        color: theme.mode === 'dark' ? '#818cf8' : '#6366f1',
        meta: `${unc}당`,
      })
    }
    return list
  }, [spectrumSource, theme.mode])

  const { hemicycleSpec, governanceBalance } = useMemo(() => {
    const lowerSeats = seatsInfo?.lowerSeats ?? null
    const upperSeats = seatsInfo?.upperSeats ?? null
    const totalLegSeats = lowerSeats ?? upperSeats ?? null

    const legDetail = latestLegQuery.data
    const seatRows = (legDetail?.partyResults ?? []).filter(
      (pr) => (pr.seatsWon ?? 0) > 0,
    )
    if (legDetail && seatRows.length > 0) {
      const enriched = seatRows
        .map((pr, idx) => {
          const master = partyMetaById.get(pr.partyId)
          const pos = master?.position ?? null
          const color =
            pr.party?.brandColor ||
            master?.brandColor ||
            (pos ? POLITICAL_POSITION_COLOR[pos] : null) ||
            PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length]
          return {
            partyId: pr.partyId,
            label:
              pr.party?.shortName ||
              master?.shortName ||
              pr.party?.name ||
              master?.name ||
              '정당',
            seats: Number(pr.seatsWon ?? 0),
            color,
            posWeight: pos ? (POSITION_SORT_WEIGHT[pos] ?? 5) : 5.5,
          }
        })
        .sort(
          (left, right) =>
            left.posWeight - right.posWeight || right.seats - left.seats,
        )

      const sumWon = enriched.reduce((sumAcc, row) => sumAcc + row.seats, 0)
      const resolvedTotal = Math.max(
        sumWon,
        legDetail.totalSeats ?? totalLegSeats ?? sumWon,
      )
      const majority = Math.floor(resolvedTotal / 2) + 1

      const rulingPartyIds = new Set(
        (currentCabinet?.partyDistribution ?? [])
          .map((pd) => pd.partyId)
          .filter((pid): pid is string => Boolean(pid)),
      )
      let balanceBadge: {
        tone: 'majority' | 'divided' | 'plurality'
        text: string
      } | null = null

      if (rulingPartyIds.size > 0) {
        const rulingSeats = enriched
          .filter((row) => rulingPartyIds.has(row.partyId))
          .reduce((sumAcc, row) => sumAcc + row.seats, 0)
        if (rulingSeats >= majority) {
          balanceBadge = {
            tone: 'majority',
            text:
              rulingPartyIds.size > 1
                ? `여대야소 · 연정 과반 (${rulingSeats}/${resolvedTotal}석)`
                : `여대야소 · 여당 과반 (${rulingSeats}/${resolvedTotal}석)`,
          }
        } else if (rulingSeats > 0) {
          balanceBadge = {
            tone: 'divided',
            text: `여소야대 · 분점의회 (여권 ${rulingSeats}석 / 과반 ${majority}석)`,
          }
        }
      }
      if (!balanceBadge) {
        const largest = [...enriched].sort(
          (left, right) => right.seats - left.seats,
        )[0]
        if (largest) {
          balanceBadge = {
            tone: largest.seats >= majority ? 'majority' : 'plurality',
            text:
              largest.seats >= majority
                ? `${largest.label} 단독 과반 (${largest.seats}/${resolvedTotal}석)`
                : `원내 제1당 ${largest.label} (${largest.seats}/${resolvedTotal}석)`,
          }
        }
      }

      return {
        hemicycleSpec: {
          slices: enriched.map((row) => ({
            key: row.partyId,
            label: row.label,
            value: row.seats,
            color: row.color,
            meta: `${row.seats}석`,
          })),
          totalSeats: resolvedTotal,
          subCaption: `과반 ${majority}석 · ${legDetail.shortName || legDetail.name}`,
          showMajority: true,
        },
        governanceBalance: balanceBadge,
      }
    }

    // 정당별 선거 의석 집계가 미입력된 경우에도 헌정 의회 정원(양원/단원)을 반원 다이어그램으로 시각화
    if (lowerSeats && lowerSeats > 0) {
      const lowerLabel =
        seatsInfo?.lowerName ||
        primaryHouseLabel(seatsInfo?.legislatureType ?? null)
      if (upperSeats && upperSeats > 0) {
        const upperLabel = seatsInfo?.upperName || '상원'
        const lowerMajority = Math.floor(lowerSeats / 2) + 1
        return {
          hemicycleSpec: {
            slices: [
              {
                key: 'lower-house',
                label: lowerLabel,
                value: lowerSeats,
                color: '#4f46e5',
                meta: `${lowerSeats.toLocaleString('ko-KR')}석`,
              },
              {
                key: 'upper-house',
                label: upperLabel,
                value: upperSeats,
                color: '#0ea5e9',
                meta: `${upperSeats.toLocaleString('ko-KR')}석`,
              },
            ],
            totalSeats: lowerSeats + upperSeats,
            subCaption: `양원 정원 · ${lowerLabel} 과반 ${lowerMajority}석`,
            showMajority: false,
          },
          governanceBalance: null,
        }
      }
      const majority = Math.floor(lowerSeats / 2) + 1
      return {
        hemicycleSpec: {
          slices: [
            {
              key: 'majority-threshold',
              label: '과반 기준',
              value: majority,
              color: '#4f46e5',
              meta: `${majority.toLocaleString('ko-KR')}석`,
            },
            {
              key: 'remaining-seats',
              label: '잔여 정원',
              value: Math.max(1, lowerSeats - majority),
              color: '#0ea5e9',
              meta: `${Math.max(0, lowerSeats - majority).toLocaleString('ko-KR')}석`,
            },
          ],
          totalSeats: lowerSeats,
          subCaption: `과반 ${majority}석 · ${lowerLabel} 정원`,
          showMajority: true,
        },
        governanceBalance: null,
      }
    }

    return { hemicycleSpec: null, governanceBalance: null }
  }, [seatsInfo, latestLegQuery.data, partyMetaById, currentCabinet])

  const featuredElection = nextElection ?? recentElection

  if (
    scopedParties.length === 0 &&
    resolvedModernElectionCount === 0 &&
    !hemicycleSpec
  ) {
    return null
  }

  return (
    <BentoCard aria-label="의회 의석 아치 및 정당·선거 인포그래픽">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>의회 · 정당 · 선거</BentoCardTitle>
          <BentoCardBadge>
            {[
              scopedParties.length > 0 ? `정당 ${scopedParties.length}` : null,
              resolvedModernElectionCount > 0
                ? `선거 ${resolvedModernElectionCount}`
                : null,
              scopedParties.length === 0 &&
              resolvedModernElectionCount === 0 &&
              hemicycleSpec
                ? `${hemicycleSpec.totalSeats.toLocaleString('ko-KR')}석`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn
            type="button"
            $accent
            onClick={() =>
              scopedParties.length === 0 &&
              resolvedModernElectionCount === 0 &&
              onOpenPoliticalSystem
                ? onOpenPoliticalSystem()
                : onOpenElections()
            }
          >
            정당·선거 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {governanceBalance ? (
          <BadgeCluster>
            <GovernanceBalanceChip $tone={governanceBalance.tone}>
              {governanceBalance.text}
            </GovernanceBalanceChip>
          </BadgeCluster>
        ) : null}

        <ParliamentSplitGrid $hasHemicycle={Boolean(hemicycleSpec)}>
          {hemicycleSpec ? (
            <ParliamentLeftBox>
              <ParliamentHemicycleSvg
                slices={hemicycleSpec.slices}
                totalSeats={hemicycleSpec.totalSeats}
                subCaption={hemicycleSpec.subCaption}
                showMajorityLine={hemicycleSpec.showMajority}
              />
            </ParliamentLeftBox>
          ) : null}

          <ParliamentRightCol>
            {spectrumSlices.length > 0 ? (
              <div>
                <BentoSubLabel style={{ marginBottom: 6 }}>
                  <span>
                    이념 스펙트럼 ·{' '}
                    {polityScope === 'historical'
                      ? '당대 정당'
                      : activeParties.length > 0
                        ? '현재 활동'
                        : '등록 정당'}
                  </span>
                  <span>
                    {polityScope === 'historical'
                      ? `총 ${scopedParties.length}당`
                      : `활동 ${activeParties.length}${
                          scopedParties.length - activeParties.length > 0
                            ? ` · 해산 ${scopedParties.length - activeParties.length}`
                            : ''
                        }`}
                  </span>
                </BentoSubLabel>
                <StackedSegmentBar slices={spectrumSlices} height={10} />
              </div>
            ) : hemicycleSpec ? (
              <ScaleCellSub>
                등록된 원내 정당·선거 결과를 추가하면 정당별 의석 분포가 표시됩니다.
              </ScaleCellSub>
            ) : null}

            {spectrumSource.length <= 8 && spectrumSource.length > 0 ? (
              <DivisionChipsWrap>
                {spectrumSource.map((partyItem, idx) => {
                  const partyDotColor =
                    partyItem.brandColor ||
                    (partyItem.position
                      ? POLITICAL_POSITION_COLOR[partyItem.position]
                      : null) ||
                    PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length]
                  return (
                    <PartyColorChipBtn
                      key={partyItem.id}
                      type="button"
                      onClick={onOpenPartyCatalog}
                    >
                      <i style={{ background: partyDotColor }} />
                      {partyItem.shortName || partyItem.name}
                    </PartyColorChipBtn>
                  )
                })}
              </DivisionChipsWrap>
            ) : null}

            {civicSnapshot.turnoutSparkPoints.length > 0 ? (
              <div>
                <BentoSubLabel style={{ marginBottom: 5 }}>
                  <span>
                    {polityScope === 'historical'
                      ? '역대 선거 투표율 추이'
                      : '역대 현대 선거 투표율'}
                  </span>
                  {civicSnapshot.avgTurnout != null ? (
                    <span>평균 {civicSnapshot.avgTurnout.toFixed(1)}%</span>
                  ) : null}
                </BentoSubLabel>
                <MiniSvgSparkline
                  points={civicSnapshot.turnoutSparkPoints}
                  color={theme.mode === 'dark' ? '#38bdf8' : '#0284c7'}
                  height={48}
                  formatValue={(val) => `${val.toFixed(1)}%`}
                />
              </div>
            ) : civicSnapshot.electionTypeCounts.length > 0 &&
              resolvedModernElectionCount > 0 ? (
              <ElectionTypePills>
                {civicSnapshot.electionTypeCounts.slice(0, 4).map((et) => (
                  <BentoPill key={et.type}>
                    {labelElectionType(et.type)} · {et.count}회
                  </BentoPill>
                ))}
              </ElectionTypePills>
            ) : null}

            {featuredElection ? (
              <ElectionBarBtn
                type="button"
                onClick={() => onOpenElections(featuredElection.id)}
              >
                <ElectionBarLeft>
                  <FiCalendar size={12} />
                  <span className="kind">
                    {nextElection ? '예정 선거' : '최근 선거'}
                  </span>
                  <strong>{featuredElection.name}</strong>
                </ElectionBarLeft>
                <PeriodSpan>
                  {featuredElection.pollDate.slice(0, 10)}
                </PeriodSpan>
              </ElectionBarBtn>
            ) : null}

            {historicalPartyCount > 0 || historicalElectionCount > 0 ? (
              <ScaleCellSub>
                전신 국가 기록 별도 보관:{' '}
                {[
                  historicalPartyCount > 0
                    ? `과거 정당 ${historicalPartyCount}곳`
                    : null,
                  historicalElectionCount > 0
                    ? `과거 선거 ${historicalElectionCount}회`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </ScaleCellSub>
            ) : null}
          </ParliamentRightCol>
        </ParliamentSplitGrid>
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 11. Diplomacy (Treaties) · Laws · Ethnicities Atlas Card ───────────── */

export function DiplomacyTreatyLawBentoCard({
  treatyCount,
  lawCount,
  ethnicityCount,
  civicSnapshot,
  onOpenTreaties,
  onSelectTreaty,
  onOpenLaws,
  onOpenEthnicity,
}: {
  treatyCount: number
  lawCount: number
  ethnicityCount: number
  civicSnapshot: CivicInstitutionalSnapshot
  onOpenTreaties: () => void
  onSelectTreaty: (treatyId: string) => void
  onOpenLaws: () => void
  onOpenEthnicity: () => void
}) {
  const theme = useTheme()

  const docSlices = useMemo<SegmentSlice[]>(() => {
    const out: SegmentSlice[] = []
    if (lawCount > 0) {
      out.push({
        key: 'LAWS',
        label: '헌법·법령',
        value: lawCount,
        color: '#7c3aed',
        gradient: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
        meta: `${lawCount}건`,
      })
    }
    const map = new Map<string, number>()
    for (const tr of civicSnapshot.recentTreaties) {
      map.set(tr.type, (map.get(tr.type) ?? 0) + 1)
    }
    const TREATY_FALLBACK_COLORS = [
      '#0ea5e9',
      '#10b981',
      '#f59e0b',
      '#ec4899',
    ]
    let colorIdx = 0
    for (const [type, count] of map.entries()) {
      const baseTone = treatyTypeTone(type as TreatyType, theme.mode)
      const vividTone =
        type === 'OTHER'
          ? TREATY_FALLBACK_COLORS[colorIdx % TREATY_FALLBACK_COLORS.length]
          : baseTone
      colorIdx += 1
      out.push({
        key: type,
        label: TREATY_TYPE_LABELS[type as TreatyType] ?? type,
        value: count,
        color: vividTone,
        meta: `${count}건`,
      })
    }
    return out
  }, [civicSnapshot.recentTreaties, lawCount, theme.mode])

  if (treatyCount === 0 && lawCount === 0 && ethnicityCount === 0) {
    return null
  }

  const dynamicTitleParts = [
    lawCount > 0 ? '헌법·법령' : null,
    treatyCount > 0 ? '조약' : null,
    ethnicityCount > 0 ? '민족' : null,
  ].filter(Boolean)
  const dynamicBadgeParts = [
    lawCount > 0 ? `법령 ${lawCount}` : null,
    treatyCount > 0 ? `조약 ${treatyCount}` : null,
    ethnicityCount > 0 ? `민족 ${ethnicityCount}` : null,
  ].filter(Boolean)

  return (
    <BentoCard aria-label="헌법·법령, 외교 조약 및 구성 민족 현황">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>{dynamicTitleParts.join(' · ')}</BentoCardTitle>
          <BentoCardBadge>{dynamicBadgeParts.join(' · ')}</BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn
            type="button"
            $accent
            onClick={
              lawCount > 0
                ? onOpenLaws
                : treatyCount > 0
                  ? onOpenTreaties
                  : onOpenEthnicity
            }
          >
            {lawCount > 0 ? '법령 상세' : treatyCount > 0 ? '조약 상세' : '민족 구성'}{' '}
            <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {docSlices.length > 0 ? (
          <StackedSegmentBar slices={docSlices} height={9} />
        ) : null}

        <CivicLedgerList>
          {civicSnapshot.recentLaws.slice(0, 2).map((lw) => (
            <CivicLedgerRowBtn key={lw.id} type="button" onClick={onOpenLaws}>
              <span className="tag law">법령</span>
              <strong className="nm">{lw.title}</strong>
              <span className="yr">{lw.yearLabel ?? '—'}</span>
            </CivicLedgerRowBtn>
          ))}
          {civicSnapshot.recentTreaties.slice(0, 2).map((tr) => {
            const tone =
              tr.type === 'OTHER'
                ? '#0ea5e9'
                : treatyTypeTone(tr.type as TreatyType, theme.mode)
            const typeText =
              TREATY_TYPE_LABELS[tr.type as TreatyType] ?? tr.type
            return (
              <CivicLedgerRowBtn
                key={tr.id}
                type="button"
                onClick={() => onSelectTreaty(tr.id)}
              >
                <span className="tag" style={{ color: tone }}>
                  {typeText}
                </span>
                <strong className="nm">{tr.name}</strong>
                <span className="yr">{tr.yearLabel ?? '—'}</span>
              </CivicLedgerRowBtn>
            )
          })}
        </CivicLedgerList>

        {ethnicityCount > 0 ? (
          <SummaryLinkRow type="button" onClick={onOpenEthnicity}>
            <span>구성 민족</span>
            <strong>
              {ethnicityCount}개 집단 보기 <FiArrowUpRight size={11} />
            </strong>
          </SummaryLinkRow>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

const PartyColorChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(15, 23, 42, 0.07)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.045)'
      : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;

  i {
    width: 7.5px;
    height: 7.5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    transform: translateY(-0.5px);
  }
`

/* ─── Styled Helpers for Cards 8 ~ 11 ────────────────────────────────────── */

const ExecHoverReadout = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 760px) {
    display: none;
  }
`

const ExecTracksStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const ExecTrackRow = styled.div<{ $dual: boolean }>`
  display: grid;
  grid-template-columns: ${({ $dual }) => ($dual ? '62px 1fr' : '1fr')};
  align-items: center;
  gap: 8px;
`

const ExecTrackAxisLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ExecSpectrumBar = styled.div`
  position: relative;
  width: 100%;
  height: 20px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const ExecSegmentBtn = styled.button<{ $active: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerBackground(theme.mode)};
  padding: 0;
  cursor: pointer;
  z-index: ${({ $active }) => ($active ? 3 : 1)};
  box-shadow: ${({ theme, $active }) =>
    $active ? `inset 0 0 0 2px ${ledgerBackground(theme.mode)}, 0 0 0 1.5px ${ledgerAccent(theme.mode)}` : 'none'};

  &:hover {
    opacity: 1 !important;
    z-index: 4;
  }
`

const ExecTickRow = styled.div<{ $indented: boolean }>`
  padding-left: ${({ $indented }) => ($indented ? '70px' : '0')};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  /* 눈금은 축 좌표에 그대로 — 접힌 구간이 있으면 블록 시작마다 연도가 붙는다 */
  .rail {
    position: relative;
    height: 14px;
  }
  .rail > span {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    white-space: nowrap;
  }
  .rail > span.first {
    transform: none;
  }
  .rail > span.last {
    right: 0;
    transform: none;
  }
`

/** 접힌 연도 구간 — 사선 무늬로 '여기는 축을 접었다'를 막대마다 같은 자리에 표시 */
const AxisGapMark = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  cursor: help;
  background: repeating-linear-gradient(
    -55deg,
    transparent 0 3px,
    ${({ theme }) => ledgerHairlineStrong(theme.mode)} 3px 4px
  );
  border-left: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-right: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

function AxisGapMarks({ gaps }: { gaps: BrokenAxisGap[] }) {
  if (gaps.length === 0) return null
  return (
    <>
      {gaps.map((gap) => (
        <AxisGapMark
          key={gap.fromYear}
          aria-hidden
          title={`${gap.fromYear}–${gap.toYear}년 — 기록이 없어 축에서 접은 구간`}
          style={{ left: `${gap.leftPct.toFixed(2)}%`, width: `${gap.widthPct.toFixed(2)}%` }}
        />
      ))}
    </>
  )
}

const ExecQuickChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const ExecLeaderChipBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 5px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(15, 23, 42, 0.06)'};
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(15, 23, 42, 0.03)'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

  .av {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .pdot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  strong {
    font-weight: 700;
  }

  small {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

const RadarProfileSplit = styled.div`
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  align-items: center;
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const RadarChartCol = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
`

const DomainMatrixGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 8px;

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const DomainDensityBtn = styled.button<{ $empty: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5.5px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  opacity: ${({ $empty }) => ($empty ? 0.68 : 1)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    opacity: 1;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px;
  }

  /* 칸이 좁을 때 '정부·내각·부/처', '+ 입/력'처럼 글자 중간에서 끊겼다 — 이름은 낱말 단위로만 줄바꿈, 값은 줄바꿈 금지 */
  .lb {
    min-width: 0;
    word-break: keep-all;
    line-height: 1.3;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  .val {
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme, $empty }) =>
      $empty ? ledgerAccent(theme.mode) : theme.colors.text.primary};
    ${DIGIT_DISPLAY}
  }

  .bar {
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: ${({ theme }) => ledgerBackground(theme.mode)};
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: 999px;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ParliamentSplitGrid = styled.div<{ $hasHemicycle: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasHemicycle }) =>
    $hasHemicycle ? '210px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  align-items: center;
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ParliamentLeftBox = styled.div`
  padding: 6px 8px;
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.035)'
      : 'rgba(15, 23, 42, 0.026)'};
`

const ParliamentRightCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const ElectionTypePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const CivicLedgerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const CivicLedgerRowBtn = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.038)'
      : 'rgba(15, 23, 42, 0.028)'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.12)'
        : 'rgba(79, 70, 229, 0.055)'};
  }

  .tag {
    font-size: 10.5px;
    font-weight: 800;
    white-space: nowrap;
  }

  .tag.law {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  .nm {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .yr {
    font-size: 10.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

const VectorGeoAtlasBox = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 23, 42, 0.55)'
      : 'rgba(248, 250, 252, 0.85)'};

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`

const VectorGeoHud = styled.div`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 10.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RegimeEraBar = styled.div`
  position: relative;
  width: 100%;
  height: 18px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

/** 헌정 체제 띠 한 줄 높이 — 겹치는 정체가 있으면 줄 수만큼 띠가 자란다 */
const REGIME_LANE_PX = 16

const RegimeEraSegBtn = styled.button<{ $even: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0 4px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $even }) =>
    $even
      ? ledgerAccentSubtle(theme.mode)
      : ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ExecChipGroup = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: stretch;
  border-radius: 999px;
`

const ExecPersonPinBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  margin-left: -4px;
  padding: 0;
  border-radius: 0 999px 999px 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const ComparePeerSelect = styled.select`
  height: 23px;
  max-width: 132px;
  padding: 0 6px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
`

const PeerComparisonStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }

  .nums {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#38bdf8' : '#0284c7')};
    font-weight: 700;
  }
`

const GovernanceBalanceChip = styled.span<{
  $tone: 'majority' | 'divided' | 'plurality'
}>`
  padding: 2.5px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  ${DIGIT_DISPLAY}
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'majority'
        ? theme.mode === 'dark'
          ? 'rgba(52, 211, 153, 0.35)'
          : 'rgba(5, 150, 105, 0.28)'
        : $tone === 'divided'
          ? theme.mode === 'dark'
            ? 'rgba(251, 191, 36, 0.38)'
            : 'rgba(217, 119, 6, 0.3)'
          : ledgerAccentBorder(theme.mode)};
  background: ${({ theme, $tone }) =>
    $tone === 'majority'
      ? theme.mode === 'dark'
        ? 'rgba(52, 211, 153, 0.12)'
        : 'rgba(5, 150, 105, 0.08)'
      : $tone === 'divided'
        ? theme.mode === 'dark'
          ? 'rgba(251, 191, 36, 0.13)'
          : 'rgba(217, 119, 6, 0.08)'
        : ledgerAccentSubtle(theme.mode)};
  color: ${({ theme, $tone }) =>
    $tone === 'majority'
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#047857'
      : $tone === 'divided'
        ? theme.mode === 'dark'
          ? '#fbbf24'
          : '#b45309'
        : ledgerAccent(theme.mode)};
`

/* ─── Zone 1 Identity & Zone 2 Lineage Styled Helpers ────────────────────── */

const IdentityTopBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const IdentityTopBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const IdentityPolityBtn = styled.button`
  padding: 2.5px 8.5px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const IdentityProseBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  p.clamp {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    color: ${({ theme }) => theme.colors.text.secondary};
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .full {
    font-size: 13px;
    line-height: 1.65;
    color: ${({ theme }) => theme.colors.text.secondary};

    p {
      margin: 0;
      white-space: pre-wrap;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`

const IdentityFactsGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));

  @media (max-width: 1120px) {
    grid-template-columns: repeat(
      ${({ $cols }) => Math.min(3, $cols)},
      minmax(0, 1fr)
    );
  }

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 540px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const IdentityFactCell = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  padding: 13px 16px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition: background 0.14s ease;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  @media (max-width: 820px) and (min-width: 541px) {
    &:nth-child(2n) {
      border-right: none;
    }
    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }

  @media (max-width: 540px) {
    border-right: none;
    & + & {
      border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    }
  }
`

const IdentityFactTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
`

const IdentityLeaderInline = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  .meta {
    display: flex;
    flex-direction: column;
    gap: 1.5px;
    min-width: 0;
  }

  .meta strong {
    font-size: 14.5px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta span {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const RelatedPolitiesBlock = styled.div<{ $withDivider: boolean }>`
  ${({ $withDivider, theme }) =>
    $withDivider
      ? `
    padding-top: 10px;
    border-top: 1px dashed ${ledgerHairline(theme.mode)};
  `
      : ''}
`

const PolityMatrixGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 2px 0 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.065)'};

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 14px;
  }
`

const PolityMatrixCell = styled.button<{ $empty?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 4px 14px 4px 0;
  border: none;
  border-right: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.065)'};
  border-radius: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition: opacity 0.15s ease;

  &:not(:first-child) {
    padding-left: 14px;
  }

  &:last-child {
    border-right: none;
    padding-right: 0;
  }

  &:hover {
    opacity: 0.78;
  }

  @media (max-width: 720px) {
    padding: 0 10px 0 0;

    &:not(:first-child) {
      padding-left: 0;
    }

    &:nth-child(2n) {
      border-right: none;
      padding-left: 12px;
    }
  }

  .kicker {
    font-size: 11px;
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  .val {
    font-size: 15px;
    font-weight: 820;
    letter-spacing: -0.02em;
    color: ${({ theme, $empty }) =>
      $empty ? theme.colors.text.tertiary : theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .sub {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    ${DIGIT_DISPLAY}
  }
`

const PastHeadsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
`

const PastHeadChipBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(15, 23, 42, 0.07)'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 1.5px;
    min-width: 0;
  }

  .meta strong {
    font-size: 12.5px;
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta small {
    font-size: 10.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${DIGIT_DISPLAY}
  }
`

const PastHeadMiniAvatar = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const InlineCabinetLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  ${DIGIT_DISPLAY}

  &:hover {
    text-decoration: underline;
  }
`

const IncumbentEmptyStrip = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(248, 250, 252, 0.8)'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;

  strong {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-weight: 700;
  }

  &:hover {
    border-style: solid;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const GeoScaleStripGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  padding: 14px 0 4px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const GeoScaleCell = styled.button<{ $spanFull?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 5px;
  padding: 4px 0 12px;
  border: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.065)'};
  border-radius: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  grid-column: ${({ $spanFull }) => ($spanFull ? '1 / -1' : 'auto')};
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.78;
  }

  @media (max-width: 520px) {
    grid-column: auto;
  }
`

const SummaryLinkRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 12px 0 0;
  border: none;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.065)'};
  border-radius: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: opacity 0.15s ease;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  strong {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    font-weight: 700;
    ${DIGIT_DISPLAY}
  }

  &:hover {
    opacity: 0.8;
  }
`
