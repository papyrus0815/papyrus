/**
 * 인물 대시보드 — 국가선택/인물 탭과 동일한 기능·디자인
 * 전체 국가 데이터 표시 (국가 선택 불필요)
 */
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { FiPlus } from 'react-icons/fi'

import { getAllPersons } from '@/shared/api/persons'
import { dynastyApi } from '@/shared/api/dynasty'
import { personKeys } from '@/entities/person/api'
import { PersonListContent } from '@/shared/ui/person-list-content'
import { useCountryListState } from '@/widgets/country/country-list/country-list-state.context'

import * as CountryDetailStyles from '@/widgets/country/country-detail/ui/CountryDetail.styles'
import { PersonStatsSection } from '@/widgets/country/country-detail/ui/person-stats-section.widget'
import { GlobalHeadsSection } from '@/widgets/country/global-heads-section'

const Wrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  padding: 36px 32px 48px;
  background: #ffffff;
  height: 100%;
  min-height: 0;
  position: relative;
`

const Header = styled.header`
  padding-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const HeaderDesc = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  color: #64748b;
  line-height: 1.55;
  max-width: 540px;
  font-weight: 500;
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.2s, background 0.2s;
  &:hover {
    border-color: #c7d2fe;
    background: rgba(99, 102, 241, 0.04);
  }
`

/** 국가 상세 인물 탭과 동일한 레이아웃. flex로 높이 전달 (역대 수반 탭 100% 채움) */
const PersonTabContentWrap = styled.div`
  margin-top: 12px;
  padding-left: 20px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

export type PersonDashboardTab = 'stats' | 'list' | 'heads'

export function PersonDashboardSection() {
  const { setShowPersonRegisterModal } = useCountryListState()
  const [personInnerTab, setPersonInnerTab] = useState<PersonDashboardTab>('stats')

  const { data: persons = [] } = useQuery({
    queryKey: personKeys.all,
    queryFn: () => getAllPersons(),
    staleTime: 1000 * 60 * 2,
  })
  const { data: dynasties = [] } = useQuery({
    queryKey: ['dynasties'],
    queryFn: () => dynastyApi.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  const personList = Array.isArray(persons) ? persons : []

  return (
    <Wrapper
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Header>
        <div>
          <HeaderTitle>인물</HeaderTitle>
          <HeaderDesc>
            전체 국가 인물을 확인하고 관리할 수 있습니다. 국가 상세 인물 탭과 동일한 기능·디자인입니다.
          </HeaderDesc>
        </div>
        <AddButton type="button" onClick={() => setShowPersonRegisterModal(true)}>
          <FiPlus size={16} />
          인물 등록
        </AddButton>
      </Header>

      <PersonTabContentWrap>
        <CountryDetailStyles.PersonInnerTabBar role="tablist" aria-label="인물 하위 메뉴">
          <CountryDetailStyles.PersonInnerTabButton
            role="tab"
            aria-selected={personInnerTab === 'stats'}
            $active={personInnerTab === 'stats'}
            onClick={() => setPersonInnerTab('stats')}
          >
            통계·최근 인물
          </CountryDetailStyles.PersonInnerTabButton>
          <CountryDetailStyles.PersonInnerTabButton
            role="tab"
            aria-selected={personInnerTab === 'list'}
            $active={personInnerTab === 'list'}
            onClick={() => setPersonInnerTab('list')}
          >
            인물 리스트
          </CountryDetailStyles.PersonInnerTabButton>
          <CountryDetailStyles.PersonInnerTabButton
            role="tab"
            aria-selected={personInnerTab === 'heads'}
            $active={personInnerTab === 'heads'}
            onClick={() => setPersonInnerTab('heads')}
          >
            역대 수반
          </CountryDetailStyles.PersonInnerTabButton>
        </CountryDetailStyles.PersonInnerTabBar>

        {personInnerTab === 'stats' && (
          <PersonStatsSection noOverlap />
        )}
        {personInnerTab === 'list' && (
          <PersonListContent
            persons={personList}
            dynasties={dynasties.map((d) => ({ id: d.id, name: d.name }))}
            invalidateKeys={personKeys.all as unknown[]}
            title="인물 리스트"
            emptyMessage="등록된 인물이 없습니다."
            emptyFilterMessage="검색·필터 조건에 맞는 인물이 없습니다."
          />
        )}
        {personInnerTab === 'heads' && (
          <GlobalHeadsSection embedded />
        )}
      </PersonTabContentWrap>
    </Wrapper>
  )
}
