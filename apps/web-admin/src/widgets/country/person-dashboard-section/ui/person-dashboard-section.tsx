import React, { useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { motion } from 'framer-motion'
import { FiPlus, FiSettings } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { personKeys } from '@/entities/person/api'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllPersons } from '@/shared/api/persons'
import { PersonListContent } from '@/shared/ui/person-list-content/person-list-content'
import * as CountryDetailStyles from '@/widgets/country/country-detail/ui/country-detail.styles'
import { PersonStatsSection } from '@/widgets/country/country-detail/ui/person-stats-section.widget'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import { GlobalHeadsSection } from '@/widgets/country/global-heads-section/ui/global-heads-section'

const Wrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  padding: 0;
  background: transparent;
  height: 100%;
  min-height: 0;
  position: relative;
`

/** 패딩 간격 건들지마라. */
const PersonTabContentWrap = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 36px 32px 48px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const HeaderActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: ${theme.colors.text.primary};
          &:hover {
            background: rgba(99, 106, 242, 0.15);
            border-color: rgba(99, 106, 242, 0.4);
            color: #ffffff;
          }
        `
      : css`
          border: 1px solid ${theme.colors.border.default};
          background: ${theme.colors.background.primary};
          color: #374151;
          &:hover {
            background: ${theme.colors.background.secondary};
            border-color: ${theme.colors.border.medium};
          }
        `}
`

export type PersonDashboardTab = 'stats' | 'list' | 'heads'

export function PersonDashboardSection() {
  const [personInnerTab, setPersonInnerTab] =
    useState<PersonDashboardTab>('list')
  const [listShowingDetail, setListShowingDetail] = useState(false)
  const [categoryCrudModalOpen, setCategoryCrudModalOpen] = useState(false)
  const [registerTrigger, setRegisterTrigger] = useState(0)

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
      <PersonTabContentWrap>
        <CountryDetailStyles.PersonTabSharedHeader>
          <CountryDetailStyles.PersonTabSharedHeaderLeft>
            <CountryDetailStyles.PersonTabSharedTitle>
              {personInnerTab === 'stats'
                ? '인물 통계'
                : personInnerTab === 'list' && listShowingDetail
                  ? '인물 상세'
                  : personInnerTab === 'list'
                    ? '인물 리스트'
                    : '역대 수반'}
            </CountryDetailStyles.PersonTabSharedTitle>
            <CountryDetailStyles.PersonTabSharedDesc>
              {personInnerTab === 'stats'
                ? '총 인물 수, 역할·세기별 분포, 최근 등록 인물을 한눈에 볼 수 있습니다.'
                : personInnerTab === 'list' && listShowingDetail
                  ? '기본 정보, 가계도, 활동, 저작을 확인할 수 있습니다.'
                  : personInnerTab === 'list'
                    ? '이름·약력·가문 검색, 필터로 찾을 수 있습니다.'
                    : '국가원수·정부수반·군주 등 역대 수반 계보와 재임 목록을 확인할 수 있습니다.'}
            </CountryDetailStyles.PersonTabSharedDesc>
          </CountryDetailStyles.PersonTabSharedHeaderLeft>
          <CountryDetailStyles.PersonTabSharedHeaderRight>
            {personInnerTab === 'stats' && (
              <HeaderActionBtn
                type="button"
                onClick={() => setCategoryCrudModalOpen(true)}
                aria-label="관직 카테고리 관리"
                title="관직 카테고리 관리"
              >
                <FiSettings size={18} />
                관직 카테고리
              </HeaderActionBtn>
            )}
            {personInnerTab === 'list' && (
              <HeaderActionBtn
                type="button"
                onClick={() => setRegisterTrigger((r) => r + 1)}
                aria-label="인물 등록"
              >
                <FiPlus size={18} />
              </HeaderActionBtn>
            )}
          </CountryDetailStyles.PersonTabSharedHeaderRight>
        </CountryDetailStyles.PersonTabSharedHeader>
        <CountryDetailStyles.PersonInnerPillNav
          role="tablist"
          aria-label="인물 하위 메뉴"
        >
          <CountryDetailStyles.PersonInnerPillBtn
            type="button"
            role="tab"
            aria-selected={personInnerTab === 'list'}
            $active={personInnerTab === 'list'}
            onClick={() => setPersonInnerTab('list')}
          >
            인물 리스트
          </CountryDetailStyles.PersonInnerPillBtn>
          <CountryDetailStyles.PersonInnerPillBtn
            type="button"
            role="tab"
            aria-selected={personInnerTab === 'stats'}
            $active={personInnerTab === 'stats'}
            onClick={() => setPersonInnerTab('stats')}
          >
            통계·최근 인물
          </CountryDetailStyles.PersonInnerPillBtn>

          <CountryDetailStyles.PersonInnerPillBtn
            type="button"
            role="tab"
            aria-selected={personInnerTab === 'heads'}
            $active={personInnerTab === 'heads'}
            onClick={() => setPersonInnerTab('heads')}
          >
            역대 수반
          </CountryDetailStyles.PersonInnerPillBtn>
        </CountryDetailStyles.PersonInnerPillNav>
        {personInnerTab === 'stats' && (
          <PersonStatsSection
            noOverlap
            hideHeader
            categoryModalOpen={categoryCrudModalOpen}
            onCategoryModalOpenChange={setCategoryCrudModalOpen}
          />
        )}
        {personInnerTab === 'list' && (
          <PersonListContent
            persons={personList}
            dynasties={dynasties.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            }))}
            invalidateKeys={[...personKeys.all]}
            title="인물 리스트"
            emptyMessage="등록된 인물이 없습니다."
            emptyFilterMessage="검색·필터 조건에 맞는 인물이 없습니다."
            onViewChange={(view) => setListShowingDetail(view === 'detail')}
            hideMainHeader
            hideCreateButton
            registerTrigger={registerTrigger}
            renderRegisterModal={(props) => (
              <PersonRegisterViewModal
                isOpen={props.isOpen}
                onClose={props.onClose}
                initialCountryId={props.initialCountryId}
                editPersonId={props.editPersonId}
                onSuccess={props.onSuccess}
              />
            )}
          />
        )}
        {personInnerTab === 'heads' && <GlobalHeadsSection embedded />}
      </PersonTabContentWrap>
    </Wrapper>
  )
}
