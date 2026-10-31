import { useEffect, useState } from 'react'

import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import { BondYieldPanel } from './country-data-manager/bond-yield-panel'
import { INDICATOR_META, type IndicatorType } from './country-data-manager/field-configs'
import { IndicatorEditorPanel } from './country-data-manager/indicator-editor-panel'
import { PopulationPyramidPanel } from './country-data-manager/population-pyramid-panel'
import { RecordsPanel } from './country-data-manager/records-panel'
import { BondYieldSection } from './dashboard-panels/bond-yield-section'
import { IndicatorTrendsSection } from './dashboard-panels/indicator-trends-section'
import { PopulationPyramidSection } from './dashboard-panels/population-pyramid-section'

export type StatisticsSubTab = 'indicators' | 'pyramid' | 'bonds' | 'records'

interface CountryStatisticsSectionProps {
  countryId: string
  countryName: string
  initialSubTab?: StatisticsSubTab
}

const STAT_SUB_TABS: { key: StatisticsSubTab; label: string; desc: string }[] = [
  {
    key: 'indicators',
    label: '거시·발전 지표',
    desc: '경제(8종)·인구(8종)·발전(7종) 연도별 추이 시각화 및 원장 편집',
  },
  {
    key: 'pyramid',
    label: '인구 피라미드',
    desc: '연도별 연령대(9구간) × 성별 인구 구조 비교 및 원장 편집',
  },
  {
    key: 'bonds',
    label: '국채 금리',
    desc: '연도·만기별 국채 수익률 곡선, 장단기 스프레드 및 금리 원장 편집',
  },
  {
    key: 'records',
    label: '국가 연혁 메모',
    desc: '연도별 주요 정책·경제·사회 기록 노트 관리',
  },
]

const INDICATOR_TYPES: IndicatorType[] = [
  'economic',
  'demographic',
  'development',
]

function isValidSubTab(raw: string | null): raw is StatisticsSubTab {
  return (
    raw === 'indicators' ||
    raw === 'pyramid' ||
    raw === 'bonds' ||
    raw === 'records'
  )
}

/**
 * 국가 상세 「경제·통계」 전용 탭 (`/country/:countryId/statistics`).
 *
 * 대시보드에서 요약으로만 보이던 거시·인구·발전 지표(23종), 연령·성별 인구 피라미드,
 * 국채 수익률 곡선, 국가 연혁 메모를 풀페이지 차트 + 원장 편집 테이블로 통합 제공한다.
 */
export function CountryStatisticsSection({
  countryId,
  countryName,
  initialSubTab,
}: CountryStatisticsSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSub = searchParams.get('sub')
  const resolvedInitial: StatisticsSubTab = isValidSubTab(urlSub)
    ? urlSub
    : (initialSubTab ?? 'indicators')

  const [subTab, setSubTab] = useState<StatisticsSubTab>(resolvedInitial)
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('economic')

  useEffect(() => {
    if (isValidSubTab(urlSub)) {
      setSubTab(urlSub)
    } else if (initialSubTab) {
      setSubTab(initialSubTab)
    }
  }, [urlSub, initialSubTab])

  const handleSelectSubTab = (next: StatisticsSubTab) => {
    setSubTab(next)
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'indicators') {
      nextParams.delete('sub')
    } else {
      nextParams.set('sub', next)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const activeMeta =
    STAT_SUB_TABS.find((tabItem) => tabItem.key === subTab) ?? STAT_SUB_TABS[0]

  return (
    <Wrap>
      <SectionTabHeader
        title="경제·통계"
        subtitle={`${countryName} · ${activeMeta.desc}`}
      />

      <UnderlineTabNav aria-label="경제·통계 하위 탭">
        {STAT_SUB_TABS.map((tabItem) => (
          <UnderlineTabButton
            key={tabItem.key}
            type="button"
            $active={subTab === tabItem.key}
            onClick={() => handleSelectSubTab(tabItem.key)}
          >
            {tabItem.label}
          </UnderlineTabButton>
        ))}
      </UnderlineTabNav>

      {subTab === 'indicators' && (
        <TabBody>
          <IndicatorTrendsSection
            countryId={countryId}
            countryName={countryName}
            embeddedInTab
          />

          <LedgerCard>
            <LedgerHeader>
              <div>
                <LedgerTitle>지표 원장 및 연도별 데이터 편집</LedgerTitle>
                <LedgerSub>
                  분야를 선택해 연도별 지표를 추가·수정·삭제하면 상단 추이 차트와 대시보드에 즉시 반영됩니다.
                </LedgerSub>
              </div>
              <CategoryChips role="tablist" aria-label="지표 분야 선택">
                {INDICATOR_TYPES.map((typeKey) => (
                  <CategoryChip
                    key={typeKey}
                    type="button"
                    role="tab"
                    aria-selected={indicatorType === typeKey}
                    $active={indicatorType === typeKey}
                    onClick={() => setIndicatorType(typeKey)}
                  >
                    {INDICATOR_META[typeKey].label}
                    <ChipCount>
                      {INDICATOR_META[typeKey].fields.length}종
                    </ChipCount>
                  </CategoryChip>
                ))}
              </CategoryChips>
            </LedgerHeader>

            <IndicatorEditorPanel
              key={indicatorType}
              countryId={countryId}
              type={indicatorType}
            />
          </LedgerCard>
        </TabBody>
      )}

      {subTab === 'pyramid' && (
        <TabBody>
          <PopulationPyramidSection
            countryId={countryId}
            countryName={countryName}
            embeddedInTab
          />

          <LedgerCard>
            <LedgerHeader>
              <div>
                <LedgerTitle>연령·성별 인구 원장 및 편집</LedgerTitle>
                <LedgerSub>
                  연도별 9개 연령 구간(0–9세 ~ 80세 이상)의 남·여 인구를 입력·수정할 수 있습니다.
                </LedgerSub>
              </div>
            </LedgerHeader>
            <PopulationPyramidPanel countryId={countryId} />
          </LedgerCard>
        </TabBody>
      )}

      {subTab === 'bonds' && (
        <TabBody>
          <BondYieldSection
            countryId={countryId}
            countryName={countryName}
            embeddedInTab
          />

          <LedgerCard>
            <LedgerHeader>
              <div>
                <LedgerTitle>국채 금리 원장 및 만기별 수익률 편집</LedgerTitle>
                <LedgerSub>
                  연도별·만기별(3개월~30년) 국채 수익률(%)을 등록·수정하면 수익률 곡선과 장단기 스프레드가 계산됩니다.
                </LedgerSub>
              </div>
            </LedgerHeader>
            <BondYieldPanel countryId={countryId} />
          </LedgerCard>
        </TabBody>
      )}

      {subTab === 'records' && (
        <TabBody>
          <LedgerCard>
            <LedgerHeader>
              <div>
                <LedgerTitle>국가 연혁 메모 원장</LedgerTitle>
                <LedgerSub>
                  정치·경제·사회·외교 등 정형 수치로 담기 어려운 연도별 핵심 기록을 관리합니다.
                </LedgerSub>
              </div>
            </LedgerHeader>
            <RecordsPanel countryId={countryId} />
          </LedgerCard>
        </TabBody>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const TabBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const LedgerCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const LedgerHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LedgerTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LedgerSub = styled.p`
  margin: 4px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CategoryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const CategoryChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ChipCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  opacity: 0.75;
`
