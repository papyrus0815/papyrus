import { useNavigate } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
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
import { IndicatorTrendsSection } from './dashboard-panels/indicator-trends-section'
import { LineageFlow } from './dashboard-panels/lineage-flow'

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
  const goPersons = () =>
    navigate(
      `${pathKeys.personsTimeline()}?countries=${encodeURIComponent(country.id)}`,
    )
  const goElections = () =>
    navigate(pathKeys.countryElections(country.id))

  const totalActivity = stats.recentActivity.length
  // 서버가 linkKind로 전신을 구분해주면 대시보드 요약엔 직계 전신선만 보인다
  // (독일 47 → 12). 구분이 없으면(데이터 부족·구버전 API) 전체를 그대로 보여준다.
  const lineageAll = country.historicalCountries ?? []
  const lineagePredecessors = lineageAll.filter(
    (hc) => hc.linkKind === 'PREDECESSOR',
  )
  const lineage =
    lineagePredecessors.length > 0 ? lineagePredecessors : lineageAll

  // 정치 섹션은 데이터 로드 중이거나 셋 중 하나라도 있을 때만 노출.
  const politicsHasData =
    !!stats.currentCabinet || !!stats.nextElection || !!stats.recentElection
  const politicsLoading = stats.loading.cabinets || stats.loading.elections
  const showPolitics = politicsHasData || politicsLoading

  return (
    <S.DashboardRoot>
      <S.QuickActionsBar role="toolbar" aria-label="빠른 작업">
        <S.QuickActionButton type="button" $accent="violet" onClick={goPersons}>
          인물 목록
        </S.QuickActionButton>
        <S.QuickActionButton
          type="button"
          $accent="amber"
          onClick={goEventsCreate}
        >
          사건 추가
        </S.QuickActionButton>
        <S.QuickActionButton
          type="button"
          $accent="sky"
          onClick={goGovernment}
        >
          행정조직
        </S.QuickActionButton>
        <S.QuickActionButton
          type="button"
          $accent="emerald"
          onClick={goRegions}
        >
          지역
        </S.QuickActionButton>
      </S.QuickActionsBar>

      <S.TwoColRow>
        <CompletenessPanel
          filled={stats.completeness.filled}
          total={stats.completeness.total}
          missing={stats.completeness.missing}
          onEditMissing={onEdit ? () => onEdit(country) : null}
        />
        <CurrentHeadsPanel
          isLoading={stats.loading.tenures}
          heads={stats.currentHeads}
          onSelect={(personId) => navigate(pathKeys.persons.detail(personId))}
          onRegister={goGovernment}
        />
      </S.TwoColRow>

      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon $accent="indigo">
            <IconGlobe />
          </S.SectionTitleIcon>
          <S.SectionTitleText>국가 정보</S.SectionTitleText>
        </S.SectionTitleRow>
        <S.HighlightInfoGrid>
          <S.HighlightCard $accent="indigo">
            <S.HighlightIconBox $accent="indigo">
              <IconUsers />
            </S.HighlightIconBox>
            <S.HighlightLabel>인구</S.HighlightLabel>
            <S.HighlightValue>
              {formatPopulation(country.population)}
              {popNum != null && <S.HighlightUnit>명</S.HighlightUnit>}
            </S.HighlightValue>
            <CompareLine
              comparison={stats.continentComparison}
              metric="population"
            />
          </S.HighlightCard>
          <S.HighlightCard $accent="sky">
            <S.HighlightIconBox $accent="sky">
              <IconArea />
            </S.HighlightIconBox>
            <S.HighlightLabel>면적</S.HighlightLabel>
            <S.HighlightValue>
              {formatAreaValue(country.areaSqKm)}
              {country.areaSqKm != null && (
                <S.HighlightUnit>km²</S.HighlightUnit>
              )}
            </S.HighlightValue>
            <CompareLine comparison={stats.continentComparison} metric="area" />
          </S.HighlightCard>
          <S.HighlightCard $accent="emerald">
            <S.HighlightIconBox $accent="emerald">
              <IconPin />
            </S.HighlightIconBox>
            <S.HighlightLabel>수도</S.HighlightLabel>
            <S.HighlightValue>
              {(country.capital && String(country.capital).trim()) || '—'}
            </S.HighlightValue>
          </S.HighlightCard>
        </S.HighlightInfoGrid>
        {(densityText || country.isoCode) && (
          <S.MetaInline>
            {densityText && (
              <S.MetaInlineItem>
                <S.MetaInlineLabel>인구 밀도</S.MetaInlineLabel>
                <S.MetaInlineValue>{densityText}</S.MetaInlineValue>
              </S.MetaInlineItem>
            )}
            {country.isoCode && (
              <S.MetaInlineItem>
                <S.MetaInlineLabel>ISO</S.MetaInlineLabel>
                <S.MetaInlineValue>{country.isoCode}</S.MetaInlineValue>
              </S.MetaInlineItem>
            )}
          </S.MetaInline>
        )}
      </S.Section>

      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon $accent="violet">
            <IconChart />
          </S.SectionTitleIcon>
          <S.SectionTitleText>등록 현황</S.SectionTitleText>
          <S.SectionCountChip>
            총 {totalRegistered.toLocaleString('ko-KR')}건
          </S.SectionCountChip>
        </S.SectionTitleRow>
        <S.StatsGrid>
          <ClickableStatCard
            accent="violet"
            label="재임자"
            unit="명"
            value={stats.personCount}
            delta={stats.deltaCounts.person}
            isLoading={stats.loading.persons}
            icon={<IconUserCheck />}
            onClick={goPersons}
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
          <ClickableStatCard
            accent="amber"
            label="주요 사건"
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
            label="지역(도시)"
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
            onClick={null}
          />
        </S.StatsGrid>
        {totalRegistered === 0 && !stats.isLoading && (
          <S.EmptyHint>
            등록된 인물·군대·사건·행정조직·지역이 없습니다. 각 탭에서 데이터를
            등록하면 여기에 집계됩니다.
          </S.EmptyHint>
        )}
      </S.Section>

      {country.type === 'modern' && (
        <IndicatorTrendsSection
          countryId={country.id}
          countryName={country.name}
        />
      )}

      {showPolitics && (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="rose">
              <IconVote />
            </S.SectionTitleIcon>
            <S.SectionTitleText>정치</S.SectionTitleText>
          </S.SectionTitleRow>
          <S.PoliticsRow>
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
          </S.PoliticsRow>
        </S.Section>
      )}

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
              navigate(pathKeys.persons.detail(personId))
            }
            onEventClick={goEvents}
          />
        </S.FeedPanel>
      </S.Section>

      {lineage.length > 0 && (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="amber">
              <IconHistory />
            </S.SectionTitleIcon>
            <S.SectionTitleText>관련 역사국가</S.SectionTitleText>
            <S.SectionCountChip>{lineage.length}개</S.SectionCountChip>
          </S.SectionTitleRow>
          <LineageFlow historicalCountries={lineage} />
        </S.Section>
      )}
    </S.DashboardRoot>
  )
}
