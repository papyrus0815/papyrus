import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { compareByCountryStart } from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'

import { formatRelativeTime } from '../lib/relative-time'
import type { CompletenessField } from '../model/use-country-dashboard-stats'
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
import {
  RecordLedger,
  type RecordLedgerRow,
} from './dashboard-panels/record-ledger'
import { CompareLine } from './dashboard-panels/compare-line'
import { CompletenessPanel } from './dashboard-panels/completeness-panel'
import { CurrentCabinetPanel } from './dashboard-panels/current-cabinet-panel'
import { CurrentHeadsPanel } from './dashboard-panels/current-heads-panel'
import { ChartEmpty } from './dashboard-panels/chart-empty'
import { SectionEmpty } from './dashboard-panels/section-empty'
import { ElectionCard } from './dashboard-panels/election-card'
import {
  formatAreaValue,
  formatPopulation,
  parsePopulation,
} from './dashboard-panels/format'
import { BondYieldSection } from './dashboard-panels/bond-yield-section'
import { IndicatorTrendsSection } from './dashboard-panels/indicator-trends-section'
import { CountryDataManagerModal } from './country-data-manager/country-data-manager-modal'
import { CountryCompaniesSection } from './dashboard-panels/country-companies-section'
import { EventCalendarPanel } from './dashboard-panels/event-calendar-panel'
import { EventCenturyStrip } from './dashboard-panels/event-century-strip'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { LineageFlow } from './dashboard-panels/lineage-flow'
import { PoliticalSystemPanel } from './dashboard-panels/political-system-panel'
import { PopulationPyramidSection } from './dashboard-panels/population-pyramid-section'
import { TradeSection } from './dashboard-panels/trade-section'

/** 대시보드 계보 요약에 한 번에 보여줄 과거 국가 수 */
const LINEAGE_SUMMARY_LIMIT = 12

export interface CountryDetailDashboardProps {
  country: UnifiedCountry
  /**
   * 국가 히어로(국기 썸네일·국가명). 대시보드 탭에서만 뜨므로 셸 좌측 칼럼 안에서
   * 렌더한다 — 그래야 우측 관리 레일이 썸네일 줄부터 시작한다.
   */
  header?: ReactNode
}

export function CountryDetailDashboard({
  country,
  header,
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
  const capitalText = country.capital ? String(country.capital).trim() : ''
  /*
   * 지표 세 섹션은 이제 자료가 없어도 자리를 지키므로 여기서 유무를 판단하지 않는다.
   * (각 섹션이 스스로 빈 자리를 그린다 — 판단이 두 곳에 있으면 어긋난다.)
   */
  const isModern = country.type === 'modern'
  const [dataManagerOpen, setDataManagerOpen] = useState(false)

  const hasAnyFact =
    popNum != null || country.areaSqKm != null || !!densityText || !!capitalText

  const goEvents = () => navigate(pathKeys.countryEvents(country.id))
  /** 연표 막대 → 사건 탭의 그 세기 묶음 */
  const goEventsCentury = (century: number) =>
    navigate(pathKeys.countryEvents(country.id, undefined, century))
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
  /* 행정조직의 '정체' 탭을 바로 연다 — countryGovernment로 보내면 역대 수반에 떨어진다 */
  const goPoliticalSystem = () =>
    navigate(pathKeys.countryPoliticalSystem(country.id))

  /** 기록 완성도 칩 → 그 축을 채우는 탭으로 */
  const goFillTarget = (field: CompletenessField) => {
    switch (field.target) {
      case 'government':
        return goGovernment()
      case 'persons':
        return goPersons()
      case 'events':
        return goEvents()
      case 'elections':
        return goElections()
      case 'historical':
        return goHistorical()
      case 'regions':
        return goRegions()
      case 'treaty':
        return goTreaty()
    }
  }

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
  /*
   * 캘린더에서 누른 사건 — 페이지로 튕기지 않고 모달로 먼저 보여준다. 대시보드는
   * '이 나라를 훑는' 자리라 사건 하나 때문에 지면을 떠나면 보던 맥락(달·연도 커서)이
   * 통째로 날아간다. 깊게 들어갈 사건만 모달 안 '사건 상세로 이동'으로 넘어간다.
   */
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)
  const lineageVisible = lineageExpanded
    ? lineageSorted
    : lineageSorted.slice(-LINEAGE_SUMMARY_LIMIT)
  const lineageHidden = lineageSorted.length - lineageVisible.length

  // 정치 섹션은 데이터 로드 중이거나 셋 중 하나라도 있을 때만 노출.
  const politicsHasData =
    !!stats.currentCabinet || !!stats.nextElection || !!stats.recentElection
  const politicsLoading = stats.loading.cabinets || stats.loading.elections

  // 기록 완성도는 여러 쿼리를 모수로 삼는다 — 하나라도 로딩 중이면 "비어 있다"고 말하지 않는다
  const completenessLoading =
    stats.loading.persons ||
    stats.loading.events ||
    stats.loading.tenures ||
    stats.loading.cabinets ||
    stats.loading.elections ||
    stats.loading.administration ||
    stats.loading.cities ||
    stats.loading.treaties
  const showPolitics = politicsHasData || politicsLoading

  /**
   * 기록 축 정의 — 값이 있는 축은 카드로, 0인 축은 아래 한 줄 칩으로 갈린다.
   * 로딩 중에는 '비어 있다'고 단정하지 않고 카드 쪽에 남긴다(스켈레톤이 그려진다).
   */
  const recordAxes: RecordLedgerRow[] = [
    {
      key: 'person',
      label: '인물',
      unit: '명',
      value: stats.personCount,
      delta: stats.deltaCounts.person,
      isLoading: stats.loading.persons,
      icon: <IconUserCheck />,
      onClick: goPersons,
    },
    {
      key: 'event',
      label: '사건',
      unit: '건',
      value: stats.eventCount,
      delta: stats.deltaCounts.event,
      isLoading: stats.loading.events,
      icon: <IconCalendar />,
      onClick: goEvents,
    },
    {
      key: 'administration',
      label: '행정조직',
      unit: '개',
      value: stats.administrationCount,
      delta: stats.deltaCounts.administration,
      isLoading: stats.loading.administration,
      icon: <IconLandmark />,
      onClick: goGovernment,
    },
    {
      key: 'city',
      label: '행정구역',
      unit: '개',
      value: stats.cityCount,
      delta: stats.deltaCounts.city,
      isLoading: stats.loading.cities,
      icon: <IconCity />,
      onClick: goRegions,
    },
    {
      key: 'treaty',
      label: '조약',
      unit: '건',
      value: stats.treatyCount,
      delta: 0,
      isLoading: stats.loading.treaties,
      icon: <IconScroll />,
      onClick: goTreaty,
    },
    {
      key: 'military',
      label: '군대',
      unit: '개',
      value: stats.militaryCount,
      delta: 0,
      isLoading: stats.loading.military,
      icon: <IconMilitary />,
      onClick: null,
      badge: '준비 중',
    },
  ]
  /* 행정부 묶음 — 규모 줄과 함께 아래 지면에서 한 번 쓴다 */
  const governmentSection = isModern ? (
    <CurrentCabinetPanel
      countryId={country.id}
      onOpen={goGovernment}
      onOpenElections={goElections}
      onSelectPerson={(personId) =>
        navigate(pathKeys.personsTimelineDetail(personId))
      }
    >
      {/* 위 '이 정권을 낳은 선거'와 같은 선거면 카드를 그리지 않는다 */}
      {(linkedElectionId) => (
        <ElectionCard
          next={stats.nextElection}
          recent={stats.recentElection}
          isLoading={stats.loading.elections}
          onOpen={goElections}
          hideElectionId={linkedElectionId}
        />
      )}
    </CurrentCabinetPanel>
  ) : (
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
      </S.NowRow>
    </S.Section>
  )

  /* 규모 줄은 빈 지면과 채워진 지면이 함께 쓴다 — 같은 JSX를 두 벌 두지 않는다 */
  const factBar = hasAnyFact ? (
    <S.FactBar aria-label="국가 규모">
      {popNum != null && (
        <S.Fact>
          <S.FactLabel>인구</S.FactLabel>
          <S.FactValue>
            {formatPopulation(country.population)}
            <S.FactUnit>명</S.FactUnit>
          </S.FactValue>
          <CompareLine
            comparison={stats.continentComparison}
            metric="population"
          />
        </S.Fact>
      )}
      {country.areaSqKm != null && (
        <S.Fact>
          <S.FactLabel>면적</S.FactLabel>
          <S.FactValue>
            {formatAreaValue(country.areaSqKm)}
            <S.FactUnit>km²</S.FactUnit>
          </S.FactValue>
          <CompareLine
            comparison={stats.continentComparison}
            metric="area"
          />
        </S.Fact>
      )}
      {densityText && (
        <S.Fact>
          <S.FactLabel>인구 밀도</S.FactLabel>
          <S.FactValue>{densityText}</S.FactValue>
        </S.Fact>
      )}
      {capitalText && (
        <S.Fact>
          <S.FactLabel>수도</S.FactLabel>
          <S.FactValue>{capitalText}</S.FactValue>
        </S.Fact>
      )}
    </S.FactBar>
  ) : null

  const managementPanels = (
    <>
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
            isLoading={completenessLoading}
            onFillMissing={goFillTarget}
          />
        </S.Section>
    </>
  )

  return (
    <>
      {header}
      <S.DashboardRoot>
      {/*
        구성 원칙 — 위에서부터 "이 나라가 어떤 나라인가"로 답한다.
        예전 배치는 데이터 완성도·등록 현황(관리 지표)이 첫 화면을 차지하고, 이 국가에서
        가장 특징적인 자산인 **계보(연결된 과거국가)** 가 2,500px 아래 맨 끝에 있었다.
        순서를 뒤집는다: 규모 → 계보 → 지금의 통치 → 기록 입구 → 활동/보완.
      */}

      {/*
        1. 규모 — 인구·면적·밀도·수도.

        ISO는 규모 지표가 아니라 식별자라 히어로 이름 옆 칩으로 옮겼다.
        값이 없는 칸은 아예 세우지 않는다 — 실DB에서 `capital`은 71개국 전부 비어 있어
        '수도 —'가 모든 국가에서 죽은 칸이었다. 빈 칸을 크게 보여주는 건 정보가 아니다.
      */}
      {factBar}

      {/* 2. 계보 — 이 국가의 시간축. 예전엔 맨 아래에 있어 사실상 보이지 않았다. */}
      {lineage.length === 0 ? (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="amber">
              <IconHistory />
            </S.SectionTitleIcon>
            <S.SectionTitleText>계보</S.SectionTitleText>
          </S.SectionTitleRow>
          <SectionEmpty
            text="이 국가로 이어지는 과거 국가가 아직 없습니다. 연결하면 언제부터 언제까지 어떤 나라였는지 시간축이 그려집니다."
            actionLabel="과거 국가 연결"
            onAction={goHistorical}
          />
        </S.Section>
      ) : (
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

      {/*
       * 3. 행정부 — 정권 카드로 고르고 그 정권의 수반·각료를 본다.
       *
       * 예전엔 '현임 정부 수반' 카드 · '현 정부'(각료 수와 정당 막대만) · '선거' 세 장이었고,
       * 정작 **누가 국무장관인지는 어디에도 없어** 행정조직 탭까지 들어가야 했다.
       * 별도로 있던 「정부 변천」(수반 승계 트랙)은 이 카드 슬라이더가 같은 축을 더 잘
       * 보여줘 제거했다 — 정체(대통령제/양원제)는 행정조직 → 정체 탭에 그대로 있다.
       * 각료 데이터가 없는 역사 국가는 옛 카드를 유지한다.
       */}
      {/*
        2-1. 정체 — "누가 수반인가"보다 "어떤 체제인가"가 먼저다. 행정조직 탭 순서와
        같은 판단이고, 그 탭 안에만 두었더니 세 번 눌러야 닿아 없는 기능처럼 읽혔다.
      */}
      <PoliticalSystemPanel
        countryId={isModern ? country.id : undefined}
        historicalCountryId={isModern ? undefined : country.id}
        countryName={country.name}
        onOpenAll={goPoliticalSystem}
      />

      {governmentSection}

      {/*
        4. 기록 — 각 탭으로 가는 입구. 숫자가 곧 링크다.

        카드에서 원장(막대 목록)으로 바꿨다. 카드는 축마다 제 상자를 가지므로 "인물 20"과
        "사건 39" 중 어느 쪽이 많은지 **눈으로 견줄 수가 없고**, 폭도 380px에서 멈춰
        본문 오른쪽이 통째로 비었다. 한 줄에 하나씩 막대로 세우면 순위가 즉시 읽히고
        폭도 자연히 다 쓴다.

        값이 0인 축은 막대를 그리지 않고 아래 한 줄로 접는다 — 실DB에서 조약은 전 국가
        0행, 군대는 country_id가 전부 비어 어떤 국가에서도 값이 생기지 않는다.
      */}
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
        <RecordLedger rows={recordAxes} />
        {/*
          사건 연표 — 숫자 하나로는 "이 나라에 사건이 몇 건"까지만 답한다. 어느 시대의
          나라인지는 분포가 말한다. 달력이 아니라 세기 막대인 이유는 한 나라의 사건이
          세기 단위로 흩어져 있어서다(미국 41건이 18~21세기).
        */}
        {stats.eventCenturyCounts.length > 0 && (
          <S.EventTimelineBlock>
            <S.EventTimelineLabel>사건 연표</S.EventTimelineLabel>
            <EventCenturyStrip
              counts={stats.eventCenturyCounts}
              onOpen={goEventsCentury}
            />
          </S.EventTimelineBlock>
        )}
        {totalRegistered === 0 && !stats.isLoading && (
          <S.EmptyHint>
            아직 이 국가에 등록된 기록이 없습니다. 위 항목을 눌러 각 탭에서
            인물·사건·행정조직을 등록해보세요.
          </S.EmptyHint>
        )}
      </S.Section>

      {/*
       * 5. 지표 — 나라 자체에 대한 이야기라 '활동/보완'(기록 관리용)보다 위다.
       * 아래에 두었더니 뷰포트 3화면 아래로 밀려 "그런 기능 없는데?"가 됐다.
       */}
      {/*
        4-1. 사건 캘린더 — 연표가 '어느 세기'를 말하면 달력은 '그 달 며칠'을 말한다.
        작은 상자에 점만 찍던 시절엔 "여기 뭔가 있다"까지만 말했다. 폭을 다 쓰고
        제목을 칸 안에 넣어 한눈에 읽히게 한다.
      */}
      {stats.calendarEvents.length === 0 ? (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="amber">
              <IconCalendar />
            </S.SectionTitleIcon>
            <S.SectionTitleText>사건 캘린더</S.SectionTitleText>
          </S.SectionTitleRow>
          {/* 달력 격자는 그대로 두고 칸만 빈다 — 자료가 들어오면 같은 자리에 사건이 앉는다 */}
          <ChartEmpty
            text="날짜가 있는 사건을 등록하면 여기 달력에 그 날짜로 앉습니다."
            actionLabel="사건 등록"
            onAction={goEventsCreate}
          >
            <EventCalendarPanel events={[]} onSelectEvent={() => {}} />
          </ChartEmpty>
        </S.Section>
      ) : (
        <S.Section>
          <S.SectionTitleRow>
            <S.SectionTitleIcon $accent="amber">
              <IconCalendar />
            </S.SectionTitleIcon>
            <S.SectionTitleText>사건 캘린더</S.SectionTitleText>
            <S.SectionLink type="button" onClick={goEvents}>
              연대표 전체 보기
            </S.SectionLink>
          </S.SectionTitleRow>
          <EventCalendarPanel
            events={stats.calendarEvents}
            onSelectEvent={setPreviewEventId}
          />
        </S.Section>
      )}

      {/*
        5. 기업 — 이 나라에 등록된 기업. 국가별 엔드포인트가 없어 전체 목록을 받아
        countryId로 거른다(실DB 5행). 없으면 아무것도 그리지 않는다.
      */}
      {country.type === 'modern' && (
        <CountryCompaniesSection countryId={country.id} />
      )}

      {/*
        인구 피라미드·지표 추이·교역은 **자료가 없어도 자리를 지킨다**.
        예전엔 셋을 통째로 감추고 한 줄 안내로 접었는데, 실DB에서 피라미드는 71개국 중
        1개국·경제 지표는 0행이라 거의 모든 국가에서 "그런 기능이 없다"로 읽혔다.
        각 섹션이 빈 자리에 무엇을 넣으면 무엇이 보이는지와 등록 버튼을 함께 낸다.
      */}
      {country.type === 'modern' && (
        <>
          <PopulationPyramidSection
            countryId={country.id}
            countryName={country.name}
          />
          <IndicatorTrendsSection
            countryId={country.id}
            countryName={country.name}
          />
          {/*
            국채 금리 — 성장률·인구 바로 아래에 둔다. 같은 '지표'지만 한 해에 값이
            여럿(만기별)이라 카드 두 장을 따로 쓰고, 추이만 보는 위 섹션과 달리
            그 해의 곡선 모양(장단기 역전)까지 말한다.
          */}
          <BondYieldSection
            countryId={country.id}
            countryName={country.name}
          />
          <TradeSection countryId={country.id} countryName={country.name} />
        </>
      )}
      {country.type === 'modern' && (
        <CountryDataManagerModal
          countryId={country.id}
          countryName={country.name}
          open={dataManagerOpen}
          onClose={() => setDataManagerOpen(false)}
          initialTab="pyramid"
        />
      )}

      {/* 캘린더에서 누른 사건 미리보기 — 섹션 조건 밖(루트)에 두어야 사건 수가
          바뀌어 캘린더가 빈 분기로 넘어가도 열린 모달이 사라지지 않는다 */}
      <EventInlineModal
        eventId={previewEventId}
        onClose={() => setPreviewEventId(null)}
        onNavigate={(eventId) => navigate(pathKeys.events.detail(eventId))}
      />

      {/*
       * 6. 활동과 보완 — 기록 관리 축이라 나라 이야기(본문)와 성격이 다르다.
       * 한때 넓은 화면에서 우측 레일로 뺐지만 레일을 걷어내면서 본문 아래로 되돌렸다.
       */}
      <S.BottomRow>{managementPanels}</S.BottomRow>

      </S.DashboardRoot>
    </>
  )
}
