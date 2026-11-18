import { useEffect, useState } from 'react'

import { FiEdit2 } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  BentoActionBtn,
  BentoCard,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoSubLabel,
} from '@/entities/event/ui/bento-primitives'
import { SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  UnderlineTabButton,
  UnderlineTabNav,
} from '@/shared/ui/underline-tabs'

import { CountryDataManagerModal } from './country-data-manager/country-data-manager-modal'
import { RecordsPanel } from './country-data-manager/records-panel'
import { countryTabCanvasPadding } from './country-ledger-primitives'
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
    desc: '경제(8종)·인구(8종)·발전(7종) 핵심 스파크라인 및 연도별 추이 시각화',
  },
  {
    key: 'pyramid',
    label: '인구 피라미드',
    desc: '연도별 연령대(9구간) × 성별 인구 구조 비교 시각화',
  },
  {
    key: 'bonds',
    label: '국채 금리',
    desc: '연도·만기별 국채 수익률 곡선 및 장단기 스프레드 분석',
  },
  {
    key: 'records',
    label: '국가 연혁 메모',
    desc: '연도별 주요 정책·경제·사회 기록 노트 관리',
  },
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
 * 인포그래픽 읽기 화면과 원장 데이터 편집 모달(`CountryDataManagerModal`)을 분리하여,
 * 거시·인구·발전 지표(23종), 연령·성별 인구 피라미드, 국채 수익률 곡선을 쾌적하게 탐색한다.
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
  const [managerOpen, setManagerOpen] = useState(false)

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
        variant="plain"
        title="경제·통계"
        description={`${countryName} · ${activeMeta.desc}`}
        rightSlot={
          <BentoActionBtn
            type="button"
            $accent
            onClick={() => setManagerOpen(true)}
          >
            <FiEdit2 size={13} />
            데이터 편집
          </BentoActionBtn>
        }
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
        </TabBody>
      )}

      {subTab === 'pyramid' && (
        <TabBody>
          <PopulationPyramidSection
            countryId={countryId}
            countryName={countryName}
            embeddedInTab
          />
        </TabBody>
      )}

      {subTab === 'bonds' && (
        <TabBody>
          <BondYieldSection
            countryId={countryId}
            countryName={countryName}
            embeddedInTab
          />
        </TabBody>
      )}

      {subTab === 'records' && (
        <TabBody>
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitleGroup>
                <BentoCardTitle>국가 연혁 메모 원장</BentoCardTitle>
                <BentoSubLabel>
                  정치·경제·사회·외교 등 정형 수치로 담기 어려운 연도별 핵심 기록을 관리합니다.
                </BentoSubLabel>
              </BentoCardTitleGroup>
            </BentoCardHeader>
            <BentoCardBody>
              <RecordsPanel countryId={countryId} />
            </BentoCardBody>
          </BentoCard>
        </TabBody>
      )}

      <CountryDataManagerModal
        countryId={countryId}
        countryName={countryName}
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        initialTab={subTab}
      />
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  ${countryTabCanvasPadding}
  box-sizing: border-box;
`

const TabBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`
