import { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { compareByCountryStart } from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'

import { formatRelativeTime } from '../lib/relative-time'
import { useCountryDashboardStats } from '../model/use-country-dashboard-stats'
import {
  IconArea,
  IconCalendar,
  IconChart,
  IconCity,
  IconClock,
  IconGlobe,
  IconHistory,
  IconLandmark,
  IconMilitary,
  IconPin,
  IconRefresh,
  IconScroll,
  IconUserCheck,
  IconUsers,
  IconVote,
} from './country-detail-dashboard.icons'
import * as S from './country-detail-dashboard.styles'
import { ActivityFeed } from './dashboard-panels/activity-feed'
import { ClickableStatCard } from './dashboard-panels/clickable-stat-card'
import { CompareLine } from './dashboard-panels/compare-line'
import { CompletenessPanel } from './dashboard-panels/completeness-panel'
import { CurrentHeadsPanel } from './dashboard-panels/current-heads-panel'
import { ElectionCard } from './dashboard-panels/election-card'
import {
  formatAreaValue,
  formatPopulation,
  parsePopulation,
} from './dashboard-panels/format'
import { GovernmentCard } from './dashboard-panels/government-card'
import { GovernmentFlowSection } from './dashboard-panels/government-flow-section'
import { IndicatorTrendsSection } from './dashboard-panels/indicator-trends-section'
import { LineageFlow } from './dashboard-panels/lineage-flow'
import { PopulationPyramidSection } from './dashboard-panels/population-pyramid-section'

/** 대시보드 계보 요약에 한 번에 보여줄 과거 국가 수 */
const LINEAGE_SUMMARY_LIMIT = 12

export interface CountryDetailDashboardProps {
  country: UnifiedCountry
  onEdit?: (country: UnifiedCountry) => void
}

export function CountryDetailDashboard({
  country,
  onEdit,
}: CountryDetailDashboardProps) {
  const navigate = useNavigate()
  const stats = useCountryDashboardStats(country)

  const totalRegistered =
    stats.personCount +
    stats.militaryCount +
    stats.eventCount +
    stats.administrationCount +
    stats.cityCount

  const popNum = parsePopulation(country.population)
  const areaNum = country.areaSqKm != null ? Number(country.areaSqKm) : null
  const densityText =
    popNum != null &&
    areaNum != null &&
    areaNum > 0 &&
    Number.isFinite(popNum) &&
    Number.isFinite(areaNum)
      ? `${(popNum / areaNum).toFixed(1)} 명/km²`
      : null

  const goEvents = () => navigate(pathKeys.countryEvents(country.id))
  const goEventsCreate = () =>
    navigate(pathKeys.countryEvents(country.id, 'create'))
  const goGovernment = () =>
    navigate(pathKeys.countryGovernment(country.id))
  const goRegions = () => navigate(pathKeys.countryRegions(country.id))
  // 인물은 이제 국가 지면 안에 탭이 있다 — 대시보드에서 밖으로 내보내지 않는다
  const goPersons = () => navigate(pathKeys.countryPersons(country.id))
  const goElections = () => navigate(pathKeys.countryElections(country.id))
  const goTreaty = () => navigate(pathKeys.countryTreaty(country.id))
  const goHistorical = () => navigate(pathKeys.countryHistorical(country.id))

  const totalActivity = stats.recentActivity.length
  // 서버가 linkKind로 전신을 구분해주면 대시보드 요약엔 직계 전신선만 보인다
  // (독일 47 → 12). 구분이 없으면(데이터 부족·구버전 API) 전체를 그대로 보여준다.
  const lineageAll = country.historicalCountries ?? []
  const lineagePredecessors = lineageAll.filter(
    (hc) => hc.linkKind === 'PREDECESSOR',
  )
  const lineage =
    lineagePredecessors.length > 0 ? lineagePredecessors : lineageAll

  /**
   * 계보 요약 상한 — linkKind(PREDECESSOR)가 채워지지 않은 국가에서는 전체가 그대로 나온다.
   * 독일이 47개라 대시보드 첫 화면의 절반을 계보가 먹었다.
   *
   * 자를 위치는 의도적이어야 한다. 계보는 시간순으로 이어지는 흐름이라 **정렬 전 배열을 자르면
   * 임의의 조각**이 나온다(실제로 그랬다). 먼저 존속 시작순으로 세우고 **가장 최근 전신 쪽**을
   * 남긴다 — 이 국가가 무엇에서 곧바로 이어졌는지가 요약에서 제일 궁금한 것이라서다.
   * 접힌 앞부분은 목록 위에 '이전 N개'로 드러낸다.
   */
  const lineageSorted = useMemo(
    () => [...lineage].sort(compareByCountryStart),
    [lineage],
  )
  const [lineageExpanded, setLineageExpanded] = useState(false)
  const lineageVisible = lineageExpanded
    ? lineageSorted
    : lineageSorted.slice(-LINEAGE_SUMMARY_LIMIT)
  const lineageHidden = lineageSorted.length - lineageVisible.length

  // 정치 섹션은 데이터 로드 중이거나 셋 중 하나라도 있을 때만 노출.
  const politicsHasData =
    !!stats.currentCabinet || !!stats.nextElection || !!stats.recentElection
  const politicsLoading = stats.loading.cabinets || stats.loading.elections
  const showPolitics = politicsHasData || politicsLoading

  return (
    <S.DashboardRoot>
      {/*
        구성 원칙 — 위에서부터 "이 나라가 어떤 나라인가"로 답한다.
        예전 배치는 데이터 완성도·등록 현황(관리 지표)이 첫 화면을 차지하고, 이 국가에서
        가장 특징적인 자산인 **계보(연결된 과거국가)** 가 2,500px 아래 맨 끝에 있었다.
        순서를 뒤집는다: 규모 → 계보 → 지금의 통치 → 기록 입구 → 활동/보완.
      */}

      {/* 1. 규모 — 인구·면적·밀도·수도·ISO를 한 줄 지표 바로 */}
      <S.FactBar aria-label="국가 규모">
        <S.Fact>
          <S.FactLabel>인구</S.FactLabel>
          <S.FactValue>
            {formatPopulation(country.population)}
            {popNum != null && <S.FactUnit>명</S.FactUnit>}
          </S.FactValue>
          <CompareLine
            comparison={stats.continentComparison}
            metric="population"
          />
        </S.Fact>
        <S.Fact>
          <S.FactLabel>면적</S.FactLabel>
          <S.FactValue>
            {formatAreaValue(country.areaSqKm)}
            {country.areaSqKm != null && <S.FactUnit>km²</S.FactUnit>}
          </S.FactValue>
          <CompareLine comparison={stats.continentComparison} metric="area" />
        </S.Fact>
        <S.Fact>
          <S.FactLabel>인구 밀도</S.FactLabel>
          <S.FactValue>{densityText ?? '—'}</S.FactValue>
        </S.Fact>
        <S.Fact>
          <S.FactLabel>수도</S.FactLabel>
          <S.FactValue>
            {(country.capital && String(country.capital).trim()) || '—'}
          </S.FactValue>
        </S.Fact>
        <S.Fact>
          <S.FactLabel>ISO</S.FactLabel>
          <S.FactValue>{country.isoCode || '—'}</S.FactValue>
        </S.Fact>
      </S.FactBar>

      {/* 2. 계보 — 이 국가의 시간축. 예전엔 맨 아래에 있어 사실상 보이지 않았다. */}
      {lineage.length > 0 && (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="amber">
              <IconHistory />
            </S.SectionTitleIcon>
            <S.SectionTitleText>계보</S.SectionTitleText>
            <S.SectionCountChip>과거 국가 {lineage.length}개</S.SectionCountChip>
            <S.SectionLink type="button" onClick={goHistorical}>
              전체 보기
            </S.SectionLink>
          </S.SectionTitleRow>
          {lineageHidden > 0 && (
            <S.LineageMoreRow>
              <S.SectionLink
                type="button"
                onClick={() => setLineageExpanded(true)}
              >
                ← 이전 {lineageHidden}개 펼치기
              </S.SectionLink>
            </S.LineageMoreRow>
          )}
          <LineageFlow historicalCountries={lineageVisible} />
        </S.Section>
      )}

      {/* 3. 지금 — 현임 수반 · 현 내각 · 선거 */}
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon $accent="rose">
            <IconVote />
          </S.SectionTitleIcon>
          <S.SectionTitleText>지금</S.SectionTitleText>
        </S.SectionTitleRow>
        <S.NowRow>
          <CurrentHeadsPanel
            isLoading={stats.loading.tenures}
            heads={stats.currentHeads}
            onSelect={(personId) =>
              navigate(pathKeys.personsTimelineDetail(personId))
            }
            onRegister={goGovernment}
          />
          <GovernmentCard
            cabinet={stats.currentCabinet}
            isLoading={stats.loading.cabinets}
            onOpen={goGovernment}
          />
          <ElectionCard
            next={stats.nextElection}
            recent={stats.recentElection}
            isLoading={stats.loading.elections}
            onOpen={goElections}
          />
        </S.NowRow>
      </S.Section>

      {/* 4. 기록 — 각 탭으로 가는 입구. 숫자가 곧 링크다. */}
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon $accent="violet">
            <IconChart />
          </S.SectionTitleIcon>
          <S.SectionTitleText>기록</S.SectionTitleText>
          <S.SectionCountChip>
            총 {totalRegistered.toLocaleString('ko-KR')}건
          </S.SectionCountChip>
        </S.SectionTitleRow>
        <S.StatsGrid>
          <ClickableStatCard
            accent="violet"
            label="인물"
            unit="명"
            value={stats.personCount}
            delta={stats.deltaCounts.person}
            isLoading={stats.loading.persons}
            icon={<IconUserCheck />}
            onClick={goPersons}
          />
          <ClickableStatCard
            accent="amber"
            label="사건"
            unit="건"
            value={stats.eventCount}
            delta={stats.deltaCounts.event}
            isLoading={stats.loading.events}
            icon={<IconCalendar />}
            onClick={goEvents}
            sparkline={stats.monthlyEventCounts}
            sparklineSrLabel="사건 발생"
          />
          <ClickableStatCard
            accent="sky"
            label="행정조직"
            unit="개"
            value={stats.administrationCount}
            delta={stats.deltaCounts.administration}
            isLoading={stats.loading.administration}
            icon={<IconLandmark />}
            onClick={goGovernment}
          />
          <ClickableStatCard
            accent="emerald"
            label="행정구역"
            unit="개"
            value={stats.cityCount}
            delta={stats.deltaCounts.city}
            isLoading={stats.loading.cities}
            icon={<IconCity />}
            onClick={goRegions}
          />
          <ClickableStatCard
            accent="indigo"
            label="조약"
            unit="건"
            value={stats.treatyCount}
            delta={0}
            isLoading={stats.loading.treaties}
            icon={<IconScroll />}
            onClick={goTreaty}
          />
          <ClickableStatCard
            accent="rose"
            label="군대"
            unit="개"
            value={stats.militaryCount}
            delta={0}
            isLoading={stats.loading.military}
            icon={<IconMilitary />}
            onClick={null}
            badge="준비 중"
          />
        </S.StatsGrid>
        {totalRegistered === 0 && !stats.isLoading && (
          <S.EmptyHint>
            아직 이 국가에 등록된 기록이 없습니다. 위 카드를 눌러 각 탭에서
            인물·사건·행정조직을 등록해보세요.
          </S.EmptyHint>
        )}
      </S.Section>

      {/*
       * 5. 지표 — 나라 자체에 대한 이야기라 '활동/보완'(기록 관리용)보다 위다.
       * 아래에 두었더니 뷰포트 3화면 아래로 밀려 "그런 기능 없는데?"가 됐다.
       */}
      {country.type === 'modern' && (
        <>
          {/* 계보(국가가 어떻게 이어졌나) 다음에 정부 변천(그 안에서 정부 형태가 어떻게 뒤집혔나) */}
          <GovernmentFlowSection
            countryId={country.id}
            countryName={country.name}
          />
          <PopulationPyramidSection
            countryId={country.id}
            countryName={country.name}
          />
          <IndicatorTrendsSection
            countryId={country.id}
            countryName={country.name}
          />
        </>
      )}

      {/* 6. 활동과 보완 — 관리용 지표는 여기로 내린다 */}
      <S.BottomRow>
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="amber">
              <IconClock />
            </S.SectionTitleIcon>
            <S.SectionTitleText>최근 활동</S.SectionTitleText>
            {totalActivity > 0 && (
              <S.SectionCountChip>{totalActivity}건</S.SectionCountChip>
            )}
            {stats.lastUpdatedAt && (
              <S.LastUpdatedHint>
                <IconRefresh /> {formatRelativeTime(stats.lastUpdatedAt)} 갱신
              </S.LastUpdatedHint>
            )}
          </S.SectionTitleRow>
          <S.FeedPanel>
            <ActivityFeed
              items={stats.recentActivity}
              isLoading={stats.loading.activity}
              onPersonClick={(personId) =>
                navigate(pathKeys.personsTimelineDetail(personId))
              }
              onEventClick={goEvents}
            />
          </S.FeedPanel>
        </S.Section>

        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="emerald">
              <IconGlobe />
            </S.SectionTitleIcon>
            <S.SectionTitleText>더 채울 것</S.SectionTitleText>
          </S.SectionTitleRow>
          <CompletenessPanel
            filled={stats.completeness.filled}
            total={stats.completeness.total}
            missing={stats.completeness.missing}
            onEditMissing={onEdit ? () => onEdit(country) : null}
          />
        </S.Section>
      </S.BottomRow>

    </S.DashboardRoot>
  )
}
