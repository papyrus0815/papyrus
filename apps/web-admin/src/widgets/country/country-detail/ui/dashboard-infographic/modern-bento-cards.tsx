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

import { useAdministrativeDivisions } from '@/entities/country/api.administrative-divisions'
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

  if (!latestDemo && !latestPyramid && ethnicityCount === 0) {
    return (
      <EmptyBentoCard
        title="인구 구조"
        text="연령대·성별 인구나 출생률·기대수명 같은 인구 지표를 넣으면 인구 피라미드와 추이가 그려집니다."
        actionLabel="인구 자료 입력"
        onAction={onOpenDataManager}
      />
    )
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
    return (
      <EmptyBentoCard
        title="교역 · 기업"
        text="연도별 수출·수입이나 이 나라 기업을 등록하면 무역수지와 품목·업종 구성이 그려집니다."
        actionLabel="교역 자료 입력"
        onAction={onOpenTrade}
      />
    )
  }

  const expVal =
    latestTrade?.exportValue != null ? Number(latestTrade.exportValue) : 0
  const impVal =
    latestTrade?.importValue != null ? Number(latestTrade.importValue) : 0
  const maxTrade = Math.max(1, expVal, impVal)
  const balance = expVal - impVal

  const compSlices: SegmentSlice[] = activeComp
    ? activeComp.slices.slice(0, 5).map((sl) => ({
        key: sl.key,
        label: sl.name,
        value: sl.pct,
        color: sl.color,
        meta: `${sl.pct.toFixed(1)}%`,
      }))
    : []

  const sectorSlices: SegmentSlice[] = companiesBySector
    .slice(0, 5)
    .map((s, idx) => ({
      key: s.label,
      label: s.label,
      value: s.count,
      color: PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length],
    }))

  return (
    <BentoCard aria-label="대외 교역 수지 및 주력 품목 도넛 인포그래픽">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>교역 · 기업</BentoCardTitle>
          {latestTrade ? (
            <BentoCardBadge>{latestTrade.year}년</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {companyCount > 0 ? (
            <BentoActionBtn type="button" onClick={onOpenCompanies}>
              기업 {companyCount}
            </BentoActionBtn>
          ) : null}
          <BentoActionBtn type="button" $accent onClick={onOpenTrade}>
            교역 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {latestTrade ? (
          <TradeBalanceBtn type="button" onClick={onOpenTrade}>
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
          </TradeBalanceBtn>
        ) : null}

        {compSlices.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 7 }}>
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
                <span>커버리지 {Math.round(activeComp.coverage)}%</span>
              ) : null}
            </BentoSubLabel>
            <AgeCohortDonutRow>
              <MiniDonutRing
                slices={compSlices}
                size={64}
                strokeWidth={9}
                centerValue={
                  activeComp?.coverage != null
                    ? `${Math.round(activeComp.coverage)}%`
                    : `${compSlices.length}종`
                }
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <StackedSegmentBar slices={compSlices} height={8} />
              </div>
            </AgeCohortDonutRow>
          </div>
        ) : null}

        {sectorSlices.length > 0 ? (
          <>
            {latestTrade ? <BentoDivider /> : null}
            <div>
              <BentoSubLabel style={{ marginBottom: 6 }}>
                <span>등록 기업 현황 ({companyCount}개사)</span>
              </BentoSubLabel>
              <StackedSegmentBar slices={sectorSlices} height={7} />
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
  milestoneEvents = [],
  militaryCount,
  highCommandCount,
  militaryBranchBreakdown,
  warSummary,
  onOpenHistoricalTab,
  onSelectHistoricalCountry,
  onSelectCentury,
  onSelectCell,
  onSelectEvent,
  onOpenEvents,
  onOpenMilitary,
}: {
  countryName: string
  historicalCountries: NonNullable<UnifiedCountry['historicalCountries']>
  eventCount: number
  centuryBuckets: CenturyDomainBucket[]
  domainBreakdown: Array<{ domain: string; count: number }>
  milestoneEvents?: MilestoneEventItem[]
  militaryCount: number
  highCommandCount: number
  militaryBranchBreakdown: MilitaryBranchSummary[]
  warSummary: WarOutcomeSummary
  onOpenHistoricalTab: () => void
  onSelectHistoricalCountry: (id: string) => void
  onSelectCentury: (century: number) => void
  onSelectCell?: (century: number, domain: string) => void
  onSelectEvent?: (eventId: string) => void
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

  const lineageSpanBars = useMemo(() => {
    const nowYr = new Date().getFullYear()
    const withRange = lineageChain
      .map((hc) => {
        const r = getCountryYearRange(hc)
        if (r.start == null) return null
        const end = r.end ?? nowYr
        return {
          id: hc.id,
          name: hc.name,
          periodLabel: formatCountryPeriod(hc),
          start: r.start,
          end: Math.max(r.start + 1, end),
          years: Math.max(1, end - r.start),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    if (withRange.length === 0) return null
    const minY = Math.min(...withRange.map((w) => w.start))
    const maxY = Math.max(nowYr, ...withRange.map((w) => w.end))
    const totalSpan = Math.max(10, maxY - minY)
    return {
      minY,
      maxY,
      items: withRange.map((w) => ({
        ...w,
        leftPct: ((w.start - minY) / totalSpan) * 100,
        widthPct: Math.max(2.5, ((w.end - w.start) / totalSpan) * 100),
      })),
    }
  }, [lineageChain])

  if (
    lineageChain.length === 0 &&
    centuryBuckets.length === 0 &&
    milestoneEvents.length === 0 &&
    militaryCount === 0
  ) {
    return (
      <EmptyBentoCard
        title="역사 · 군사"
        text="사건, 과거 국가, 군 편제를 연결하면 국가 계보 막대와 세기별 사건 지도, 군사력이 여기 모입니다."
        actionLabel="사건 탭으로"
        onAction={onOpenEvents}
      />
    )
  }

  return (
    <BentoCard aria-label="통사 국가 계보 및 사건·군사 리듬">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>역사 · 군사</BentoCardTitle>
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
        {/* 1. 직계 전신 → 현대 국가 타임라인 스파인 & 비례 존속 스팬 바 */}
        {lineageChain.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 7 }}>
              <span>국가 계승 스파인 · 존속 연대기</span>
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

            {lineageSpanBars && lineageSpanBars.items.length >= 2 ? (
              <LineageGanttWrap>
                {lineageSpanBars.items.map((bar, idx) => (
                  <LineageGanttRowBtn
                    key={bar.id}
                    type="button"
                    onClick={() => onSelectHistoricalCountry(bar.id)}
                    title={`${bar.name} (${bar.periodLabel} · 약 ${bar.years}년)`}
                  >
                    <span className="nm">{bar.name}</span>
                    <div className="track">
                      <div
                        className="fill"
                        style={{
                          left: `${bar.leftPct.toFixed(2)}%`,
                          width: `${bar.widthPct.toFixed(2)}%`,
                          opacity: 0.55 + (idx / lineageSpanBars.items.length) * 0.45,
                        }}
                      />
                    </div>
                    <span className="dur">{bar.years}년</span>
                  </LineageGanttRowBtn>
                ))}
              </LineageGanttWrap>
            ) : null}
          </div>
        ) : null}

        {/* 2. 세기×분야 히트맵 매트릭스 & 분수령 사건 핀 */}
        {centuryBuckets.length > 0 || milestoneEvents.length > 0 ? (
          <>
            {lineageChain.length > 0 ? <BentoDivider /> : null}
            <CenturyEventMatrixAndMilestones
              buckets={centuryBuckets}
              domainBreakdown={domainBreakdown}
              milestones={milestoneEvents}
              onSelectCentury={onSelectCentury}
              onSelectCell={onSelectCell}
              onSelectEvent={onSelectEvent}
            />
          </>
        ) : null}

        {/* 3. 군사 전력 · 참전 요약 */}
        {militaryCount > 0 || warSummary.totalMilitaryEvents > 0 ? (
          <>
            {lineageChain.length > 0 ||
            centuryBuckets.length > 0 ||
            milestoneEvents.length > 0 ? (
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
  const theme = useTheme()
  const [geoMode, setGeoMode] = useState<'atlas' | 'roadmap' | 'hybrid'>('atlas')

  const divisionsQuery = useAdministrativeDivisions(
    country.type === 'historical'
      ? { historicalCountryId: country.id }
      : { countryId: country.id },
    null,
  )

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
        zoom: 5,
        mapLayer: geoMode === 'hybrid' ? 'hybrid' : 'roadmap',
      }),
    [country, validCoord, geoMode],
  )

  const svgPin = useMemo(() => {
    if (!validCoord) return { x: 180, y: 88, hasExact: false }
    // Equirectangular projection into 360 x 180 box
    const x = Math.max(18, Math.min(342, ((validCoord.lng + 180) / 360) * 360))
    const y = Math.max(16, Math.min(164, ((90 - validCoord.lat) / 180) * 180))
    return { x, y, hasExact: true }
  }, [validCoord])

  const coordLabel = validCoord
    ? `${Math.abs(validCoord.lat).toFixed(2)}°${validCoord.lat >= 0 ? 'N' : 'S'} · ${Math.abs(validCoord.lng).toFixed(2)}°${validCoord.lng >= 0 ? 'E' : 'W'}`
    : '좌표 미기재'

  return (
    <BentoCard aria-label="지리 위치 및 최상위 행정구역">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <FiGlobe size={13.5} />
          <BentoCardTitle>지리</BentoCardTitle>
          {cityCount > 0 ? (
            <BentoCardBadge>{cityCount}곳</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <MiniDirSwitch>
            <MiniDirBtn
              type="button"
              $active={geoMode === 'atlas'}
              onClick={() => setGeoMode('atlas')}
            >
              벡터
            </MiniDirBtn>
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
        {geoMode === 'atlas' ? (
          <VectorGeoAtlasBox onClick={() => onOpenRegions()}>
            <svg viewBox="0 0 360 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
              {[30, 60, 90, 120, 150].map((gy) => (
                <line
                  key={`lat-${gy}`}
                  x1="0"
                  y1={gy}
                  x2="360"
                  y2={gy}
                  stroke={
                    gy === 90
                      ? ledgerHairlineStrong(theme.mode)
                      : ledgerHairline(theme.mode)
                  }
                  strokeWidth={gy === 90 ? '1' : '0.7'}
                  strokeDasharray={gy === 90 ? undefined : '2.5 3.5'}
                />
              ))}
              {[60, 120, 180, 240, 300].map((gx) => (
                <line
                  key={`lng-${gx}`}
                  x1={gx}
                  y1="0"
                  x2={gx}
                  y2="180"
                  stroke={
                    gx === 180
                      ? ledgerHairlineStrong(theme.mode)
                      : ledgerHairline(theme.mode)
                  }
                  strokeWidth={gx === 180 ? '1' : '0.7'}
                  strokeDasharray={gx === 180 ? undefined : '2.5 3.5'}
                />
              ))}
              {/*
                좌표가 없으면 조준선·핀을 그리지 않는다 — 예전엔 좌표가 없어도 지도 한가운데(경도 0·적도 근처)에
                핀을 찍어, 독일·일본·케냐가 모두 같은 '위치'로 보였다. 위치는 '지도' 보기가 국가 이름으로 찾는다.
              */}
              {svgPin.hasExact ? (
                <>
                {/* Reticle crosshairs */}
                <line
                  x1={svgPin.x}
                  y1="0"
                  x2={svgPin.x}
                  y2="180"
                  stroke={ledgerAccent(theme.mode)}
                  strokeOpacity="0.45"
                  strokeWidth="0.9"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1={svgPin.y}
                  x2="360"
                  y2={svgPin.y}
                  stroke={ledgerAccent(theme.mode)}
                  strokeOpacity="0.45"
                  strokeWidth="0.9"
                  strokeDasharray="3 3"
                />
                {/* Surrounding division orbit nodes */}
                {topDivisions.slice(0, 6).map((div, idx, arr) => {
                  const ang = -Math.PI / 2 + (idx * 2 * Math.PI) / arr.length
                  const ox = Math.max(16, Math.min(344, svgPin.x + Math.cos(ang) * 34))
                  const oy = Math.max(16, Math.min(164, svgPin.y + Math.sin(ang) * 24))
                  return (
                    <g key={div.id}>
                      <line
                        x1={svgPin.x}
                        y1={svgPin.y}
                        x2={ox}
                        y2={oy}
                        stroke={ledgerAccent(theme.mode)}
                        strokeOpacity="0.28"
                        strokeWidth="0.9"
                      />
                      <circle
                        cx={ox}
                        cy={oy}
                        r="2.6"
                        fill={theme.mode === 'dark' ? '#38bdf8' : '#0284c7'}
                      />
                    </g>
                  )
                })}
                <circle
                  cx={svgPin.x}
                  cy={svgPin.y}
                  r="13"
                  fill={ledgerAccent(theme.mode)}
                  fillOpacity="0.16"
                  stroke={ledgerAccent(theme.mode)}
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
                <circle
                  cx={svgPin.x}
                  cy={svgPin.y}
                  r="4.5"
                  fill={ledgerAccent(theme.mode)}
                  stroke={ledgerBackground(theme.mode)}
                  strokeWidth="1.5"
                />
                </>
              ) : null}
            </svg>
            <VectorGeoHud>
              <span>
                <strong>{country.capital || country.name}</strong>
                {country.isoCode ? ` · ${country.isoCode}` : ''}
              </span>
              <span>
                {svgPin.hasExact
                  ? coordLabel
                  : '좌표 미기재 — ‘지도’에서 국가 이름으로 위치를 봅니다'}
              </span>
            </VectorGeoHud>
          </VectorGeoAtlasBox>
        ) : mapSpec ? (
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
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
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
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`

const MiniDirSwitch = styled.span`
  display: inline-flex;
  padding: 1.5px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const MiniDirBtn = styled.button<{ $active: boolean }>`
  height: 19px;
  padding: 0 7px;
  border: none;
  border-radius: 3.5px;
  background: ${({ theme, $active }) =>
    $active ? ledgerBackground(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`

const LineageGanttWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 9px;
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => ledgerHairline(theme.mode)};
`

const LineageGanttRowBtn = styled.button`
  display: grid;
  grid-template-columns: 112px 1fr 48px;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
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
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track {
    position: relative;
    height: 7px;
    border-radius: 999px;
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
    overflow: hidden;
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  .dur {
    text-align: right;
    font-size: 10.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

/* ─── 8. Modern Executive Reign Spectrum Card (MindMap Live Sync) ─────────── */

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
    const span = Math.max(4, maxY - minY)

    const eraBands = regimeEras
      .map((era, idx) => {
        const end = era.endYear ?? nowYr
        const dur = Math.max(0.8, end - era.startYear)
        const leftPct = Math.max(
          0,
          Math.min(98, ((era.startYear - minY) / span) * 100),
        )
        const widthPct = Math.max(2, Math.min(100 - leftPct, (dur / span) * 100))
        return {
          ...era,
          endResolved: end,
          leftPct,
          widthPct,
          even: idx % 2 === 0,
        }
      })
      .filter((b) => b.widthPct > 0)

    const mapTrack = (
      items: ExecutiveTimelineItem[],
      defaultDark: string,
      defaultLight: string,
    ) =>
      items.map((item, idx) => {
        const end = item.endYear ?? nowYr
        const dur = Math.max(0.8, end - item.startYear)
        const leftPct = Math.max(
          0,
          Math.min(98.2, ((item.startYear - minY) / span) * 100),
        )
        const widthPct = Math.max(1.8, Math.min(100 - leftPct, (dur / span) * 100))
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

    const ticks = [
      minY,
      Math.round(minY + span * 0.25),
      Math.round(minY + span * 0.5),
      Math.round(minY + span * 0.75),
      maxY,
    ]
    const uniqueTicks = [...new Set(ticks)]

    const recentChips = [...timeline]
      .sort((a, b) => (b.endYear ?? nowYr) - (a.endYear ?? nowYr) || b.startYear - a.startYear)
      .slice(0, 10)
      .reverse()

    return { minY, maxY, eraBands, tracks, ticks: uniqueTicks, recentChips }
  }, [timeline, regimeEras, theme.mode])

  if (!model) {
    return (
      <EmptyBentoCard
        title="역대 국가수반"
        text="대통령·총리·군주의 재임을 기록하면 역대 수반의 집권 기간이 한 줄 막대로 그려집니다."
        actionLabel="재임 기록하기"
        onAction={onOpenCabinets}
      />
    )
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
              <RegimeEraBar>
                {model.eraBands.map((band) => (
                  <RegimeEraSegBtn
                    key={band.id}
                    type="button"
                    $even={band.even}
                    style={{
                      left: `${band.leftPct.toFixed(2)}%`,
                      width: `${band.widthPct.toFixed(2)}%`,
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
                      onClick={() => onFocusTenure(seg.recordId)}
                      title={`${seg.ordinal != null ? `제${seg.ordinal}대 ` : ''}${seg.personName}${seg.partyName ? ` (${seg.partyName})` : ''} · ${seg.startYear}–${seg.endYear ?? '현직'} — 클릭 시 상단 마인드맵 전환`}
                    />
                  )
                })}
              </ExecSpectrumBar>
            </ExecTrackRow>
          ))}
          <ExecTickRow $indented={hasLabelCol}>
            {model.ticks.map((yr, i) => (
              <span key={`${yr}-${i}`}>
                {i === model.ticks.length - 1 ? `현재(${yr})` : `${yr}년`}
              </span>
            ))}
          </ExecTickRow>
        </ExecTracksStack>

        <ExecQuickChipsRow>
          {model.recentChips.map((chip) => {
            const isSelected = chip.recordId === activeTenureId
            const avatar = chip.profileImageUrl
              ? getUploadImageUrl(chip.profileImageUrl)
              : null
            return (
              <ExecChipGroup key={chip.recordId} $active={isSelected}>
                <ExecLeaderChipBtn
                  type="button"
                  $active={isSelected}
                  onClick={() => onFocusTenure(chip.recordId)}
                  title="클릭 시 상단 행정부 마인드맵 전환"
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
                  <small>{chip.startYear}</small>
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
  nextElection,
  recentElection,
  onOpenElections,
  onOpenPoliticalSystem,
  onOpenPartyCatalog,
}: {
  parties: PoliticalParty[]
  civicSnapshot: CivicInstitutionalSnapshot
  currentCabinet: CurrentCabinetSummary | null
  electionCount: number
  nextElection: ElectionSummary | null
  recentElection: ElectionSummary | null
  onOpenElections: (electionId?: string) => void
  onOpenPoliticalSystem: () => void
  onOpenPartyCatalog: () => void
}) {
  const theme = useTheme()
  const seatsInfo = civicSnapshot.activePolitySeats
  const latestLegId = civicSnapshot.latestLegislativeElectionId

  const latestLegQuery = useQuery({
    queryKey: ['election-detail-dashboard', latestLegId],
    queryFn: () => getElection(latestLegId!),
    enabled: Boolean(latestLegId),
    staleTime: 1000 * 60 * 5,
  })

  const partyMetaById = useMemo(
    () => new Map(parties.map((p) => [p.id, p])),
    [parties],
  )

  const activeParties = useMemo(
    () => parties.filter((p) => !p.dissolvedDate),
    [parties],
  )

  /*
   * 스펙트럼 모수 — 활동 중 정당이 3곳 이상이면 현재 지형, 아니면 역대 전체.
   * 예전엔 활동 정당이 1곳이라도 있으면 그것만 세서, 정당 13곳(해산 12)인 독일이 '좌파 1당' 한 색 막대가 됐다.
   */
  const spectrumUsesActive = activeParties.length >= 3
  const spectrumSlices = useMemo<SegmentSlice[]>(() => {
    const counts = new Map<string, number>()
    for (const p of spectrumUsesActive ? activeParties : parties) {
      const pos = p.position ?? 'UNCLASSIFIED'
      counts.set(pos, (counts.get(pos) ?? 0) + 1)
    }
    const list: SegmentSlice[] = []
    for (const pos of SPECTRUM_ORDER) {
      const c = counts.get(pos) ?? 0
      if (c > 0) {
        list.push({
          key: pos,
          label: POLITICAL_POSITION_LABEL[pos],
          value: c,
          color: POLITICAL_POSITION_COLOR[pos],
          meta: `${c}당`,
        })
      }
    }
    const unc = counts.get('UNCLASSIFIED') ?? 0
    if (unc > 0) {
      list.push({
        key: 'UNCLASSIFIED',
        label: '기타·미분류',
        value: unc,
        color: theme.mode === 'dark' ? '#64748b' : '#94a3b8',
        meta: `${unc}당`,
      })
    }
    return list
  }, [spectrumUsesActive, activeParties, parties, theme.mode])

  const { hemicycleSpec, governanceBalance } = useMemo(() => {
    const lowerSeats = seatsInfo?.lowerSeats ?? null
    const upperSeats = seatsInfo?.upperSeats ?? null
    const totalLegSeats = lowerSeats ?? upperSeats ?? null

    // 1순위: 최신 국회의원/의회 선거 실제 정당별 의석(seatsWon)
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
        .sort((a, b) => a.posWeight - b.posWeight || b.seats - a.seats)

      const sumWon = enriched.reduce((acc, r) => acc + r.seats, 0)
      const resolvedTotal = Math.max(
        sumWon,
        legDetail.totalSeats ?? totalLegSeats ?? sumWon,
      )
      const majority = Math.floor(resolvedTotal / 2) + 1

      // 여소야대 / 여대야소 판별 (내각 제1집권당 또는 내각 참여정당 기준)
      const rulingPartyIds = new Set(
        (currentCabinet?.partyDistribution ?? [])
          .map((pd) => pd.partyId)
          .filter((id): id is string => Boolean(id)),
      )
      let balanceBadge: {
        tone: 'majority' | 'divided' | 'plurality'
        text: string
      } | null = null

      if (rulingPartyIds.size > 0) {
        const rulingSeats = enriched
          .filter((r) => rulingPartyIds.has(r.partyId))
          .reduce((acc, r) => acc + r.seats, 0)
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
        const largest = [...enriched].sort((a, b) => b.seats - a.seats)[0]
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
          slices: enriched.map((r) => ({
            key: r.partyId,
            label: r.label,
            value: r.seats,
            color: r.color,
            meta: `${r.seats}석`,
          })),
          totalSeats: resolvedTotal,
          subCaption: `과반 ${majority}석 · ${legDetail.shortName || legDetail.name}`,
          showMajority: true,
        },
        governanceBalance: balanceBadge,
      }
    }

    if (currentCabinet && currentCabinet.partyDistribution.length > 0) {
      const slices: SegmentSlice[] = currentCabinet.partyDistribution.map(
        (pd, idx) => ({
          key: pd.partyId ?? `cab-${idx}`,
          label: pd.partyName,
          value: pd.count,
          color:
            pd.color ||
            PARTY_FALLBACK_PALETTE[idx % PARTY_FALLBACK_PALETTE.length],
          meta: `각료 ${pd.count}`,
        }),
      )
      return {
        hemicycleSpec: {
          slices,
          totalSeats: totalLegSeats ?? currentCabinet.ministerCount,
          subCaption: totalLegSeats
            ? `${seatsInfo?.lowerName || '의회'} 정원 (내각 정당비)`
            : `${currentCabinet.name} 각료`,
          showMajority: Boolean(totalLegSeats),
        },
        governanceBalance: null,
      }
    }

    if (spectrumSlices.length > 0) {
      return {
        hemicycleSpec: {
          slices: spectrumSlices,
          totalSeats:
            totalLegSeats ??
            (activeParties.length > 0 ? activeParties.length : parties.length),
          subCaption: totalLegSeats
            ? `과반 ${Math.floor(totalLegSeats / 2) + 1}석`
            : '등록 정당 분포',
          showMajority: Boolean(totalLegSeats),
        },
        governanceBalance: null,
      }
    }

    if (lowerSeats || upperSeats) {
      const houseSlices: SegmentSlice[] = []
      if (lowerSeats) {
        houseSlices.push({
          key: 'lower',
          label: seatsInfo?.lowerName || '하원·단원',
          value: lowerSeats,
          color: ledgerAccent(theme.mode),
          meta: `${lowerSeats}석`,
        })
      }
      if (upperSeats) {
        houseSlices.push({
          key: 'upper',
          label: seatsInfo?.upperName || '상원',
          value: upperSeats,
          color: theme.mode === 'dark' ? '#38bdf8' : '#0284c7',
          meta: `${upperSeats}석`,
        })
      }
      return {
        hemicycleSpec: {
          slices: houseSlices,
          totalSeats: (lowerSeats ?? 0) + (upperSeats ?? 0),
          subCaption: upperSeats && lowerSeats ? '양원 합계 의석' : '법정 의석 정원',
          showMajority: !(upperSeats && lowerSeats),
        },
        governanceBalance: null,
      }
    }

    return { hemicycleSpec: null, governanceBalance: null }
  }, [
    seatsInfo,
    latestLegQuery.data,
    partyMetaById,
    currentCabinet,
    spectrumSlices,
    activeParties.length,
    parties.length,
    theme.mode,
  ])

  const polityTags = useMemo(() => {
    if (!seatsInfo) return []
    const tags: string[] = []
    if (seatsInfo.governmentForm) {
      tags.push(
        GOVERNMENT_FORM_LABEL[
          seatsInfo.governmentForm as keyof typeof GOVERNMENT_FORM_LABEL
        ] ?? seatsInfo.governmentForm,
      )
    }
    if (seatsInfo.legislatureType) {
      tags.push(
        LEGISLATURE_TYPE_LABEL[
          seatsInfo.legislatureType as keyof typeof LEGISLATURE_TYPE_LABEL
        ] ?? seatsInfo.legislatureType,
      )
    }
    if (seatsInfo.partySystem) {
      tags.push(
        PARTY_SYSTEM_LABEL[
          seatsInfo.partySystem as keyof typeof PARTY_SYSTEM_LABEL
        ] ?? seatsInfo.partySystem,
      )
    }
    if (seatsInfo.stateStructure) {
      tags.push(
        STATE_STRUCTURE_LABEL[
          seatsInfo.stateStructure as keyof typeof STATE_STRUCTURE_LABEL
        ] ?? seatsInfo.stateStructure,
      )
    }
    return tags
  }, [seatsInfo])

  const featuredElection = nextElection ?? recentElection

  return (
    <BentoCard aria-label="의회 의석 아치 및 정당·선거 인포그래픽">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>의회 · 정당</BentoCardTitle>
          <BentoCardBadge>
            정당 {parties.length} · 선거 {electionCount}
          </BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" onClick={onOpenPoliticalSystem}>
            정체·의회
          </BentoActionBtn>
          <BentoActionBtn type="button" onClick={onOpenPartyCatalog}>
            정당 편람
          </BentoActionBtn>
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => onOpenElections()}
          >
            선거·정당 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {polityTags.length > 0 || governanceBalance ? (
          <BadgeCluster>
            {governanceBalance ? (
              <GovernanceBalanceChip $tone={governanceBalance.tone}>
                {governanceBalance.text}
              </GovernanceBalanceChip>
            ) : null}
            {polityTags.map((tg) => (
              <ArchBadge key={tg}>{tg}</ArchBadge>
            ))}
            {seatsInfo?.lowerSeats ? (
              <BentoPill>
                {seatsInfo.lowerName || '하원'} {seatsInfo.lowerSeats}석
              </BentoPill>
            ) : null}
            {seatsInfo?.upperSeats ? (
              <BentoPill>
                {seatsInfo.upperName || '상원'} {seatsInfo.upperSeats}석
              </BentoPill>
            ) : null}
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
                <BentoSubLabel style={{ marginBottom: 5 }}>
                  <span>
                    이념 스펙트럼 · {spectrumUsesActive ? '현재 활동' : '역대'}
                  </span>
                  <span>
                    활동 {activeParties.length} · 해산{' '}
                    {parties.length - activeParties.length}
                  </span>
                </BentoSubLabel>
                <StackedSegmentBar
                  slices={spectrumSlices}
                  height={8}
                />
              </div>
            ) : null}

            {civicSnapshot.turnoutSparkPoints.length > 0 ? (
              <div>
                <BentoSubLabel style={{ marginBottom: 4 }}>
                  <span>역대 선거 투표율 추이</span>
                  {civicSnapshot.avgTurnout != null ? (
                    <span>평균 {civicSnapshot.avgTurnout.toFixed(1)}%</span>
                  ) : null}
                </BentoSubLabel>
                <MiniSvgSparkline
                  points={civicSnapshot.turnoutSparkPoints}
                  color={theme.mode === 'dark' ? '#38bdf8' : '#0284c7'}
                  height={44}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              </div>
            ) : civicSnapshot.electionTypeCounts.length > 0 ? (
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
            ) : parties.length === 0 && electionCount === 0 ? (
              <EmptyInlinePrompt
                type="button"
                onClick={() => onOpenElections()}
              >
                <FiPlus size={12} /> 정당 · 역대 선거 기록 등록하기
              </EmptyInlinePrompt>
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

  const treatySlices = useMemo<SegmentSlice[]>(() => {
    const map = new Map<string, number>()
    for (const tr of civicSnapshot.recentTreaties) {
      map.set(tr.type, (map.get(tr.type) ?? 0) + 1)
    }
    return [...map.entries()].map(([type, count]) => ({
      key: type,
      label:
        TREATY_TYPE_LABELS[type as TreatyType] ?? type,
      value: count,
      color: treatyTypeTone(type as TreatyType, theme.mode),
      meta: `${count}건`,
    }))
  }, [civicSnapshot.recentTreaties, theme.mode])

  if (treatyCount === 0 && lawCount === 0 && ethnicityCount === 0) {
    return (
      <EmptyBentoCard
        title="조약 · 법령 · 민족"
        text="맺은 조약, 헌법·법률, 구성 민족을 등록하면 유형 분포와 주요 목록이 여기 모입니다."
        actionLabel="조약 등록"
        onAction={onOpenTreaties}
      />
    )
  }

  return (
    <BentoCard aria-label="외교 조약, 법령 및 구성 민족 현황">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>조약 · 법령 · 민족</BentoCardTitle>
          <BentoCardBadge>
            조약 {treatyCount} · 법령 {lawCount} · 민족 {ethnicityCount}
          </BentoCardBadge>
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" onClick={onOpenLaws}>
            법령 {lawCount}
          </BentoActionBtn>
          <BentoActionBtn type="button" onClick={onOpenEthnicity}>
            민족 {ethnicityCount}
          </BentoActionBtn>
          <BentoActionBtn type="button" $accent onClick={onOpenTreaties}>
            조약 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {treatySlices.length > 0 ? (
          <div>
            <BentoSubLabel style={{ marginBottom: 5 }}>
              <span>주요 체결 조약 유형 분포</span>
              <span>총 {treatyCount}건</span>
            </BentoSubLabel>
            <StackedSegmentBar slices={treatySlices} height={7} />
          </div>
        ) : null}

        {civicSnapshot.recentTreaties.length > 0 ? (
          <CivicLedgerList>
            {civicSnapshot.recentTreaties.slice(0, 4).map((tr) => {
              const tone = treatyTypeTone(tr.type as TreatyType, theme.mode)
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
        ) : null}

        {civicSnapshot.recentLaws.length > 0 ? (
          <>
            {civicSnapshot.recentTreaties.length > 0 ? <BentoDivider /> : null}
            <div>
              <BentoSubLabel style={{ marginBottom: 5 }}>
                <span>주요 헌법 · 제정 법령</span>
                <span>총 {lawCount}건</span>
              </BentoSubLabel>
              <CivicLedgerList>
                {civicSnapshot.recentLaws.slice(0, 3).map((lw) => (
                  <CivicLedgerRowBtn
                    key={lw.id}
                    type="button"
                    onClick={onOpenLaws}
                  >
                    <span className="tag law">법령</span>
                    <strong className="nm">{lw.title}</strong>
                    <span className="yr">{lw.yearLabel ?? '—'}</span>
                  </CivicLedgerRowBtn>
                ))}
              </CivicLedgerList>
            </div>
          </>
        ) : null}

        {civicSnapshot.ethnicGroups.length > 0 ? (
          <>
            {civicSnapshot.recentTreaties.length > 0 ||
            civicSnapshot.recentLaws.length > 0 ? (
              <BentoDivider />
            ) : null}
            <div>
              <BentoSubLabel style={{ marginBottom: 6 }}>
                <span>등록 구성 민족 ({ethnicityCount})</span>
              </BentoSubLabel>
              <DivisionChipsWrap>
                {civicSnapshot.ethnicGroups.map((eg) => (
                  <DivisionChipBtn
                    key={eg.id}
                    type="button"
                    onClick={onOpenEthnicity}
                  >
                    {eg.name}
                    {eg.nameLocal ? ` (${eg.nameLocal})` : ''}
                  </DivisionChipBtn>
                ))}
              </DivisionChipsWrap>
            </div>
          </>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: ${({ $indented }) => ($indented ? '70px' : '0')};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const ExecQuickChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const ExecLeaderChipBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 4px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerSubtleFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }

  .av {
    width: 18px;
    height: 18px;
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
  padding: 4px 6px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
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
  gap: 4px;
`

const CivicLedgerRowBtn = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 5.5px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
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
