import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { motion } from 'framer-motion'
import { FiPlus, FiSettings, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { personKeys } from '@/entities/person/api'
import { useHistoricalCountries } from '@/entities/historical-country/api'
import { useCountries } from '@/features/country/api'
import { dynastyApi } from '@/shared/api/dynasty'
import { getAllPersons } from '@/shared/api/persons'
import { pathKeys } from '@/shared/router'
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
  min-height: 100%;
  position: relative;
`

/** 패딩 간격 건들지마라. */
const PersonTabContentWrap = styled.div`
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

// ─── Country filter styled components ────────────────────────────────────────

const CountryFilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
`

const ModernCountryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const ModernCountryChip = styled.button<{ $active?: boolean; $hasFilter?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid ${$active ? 'rgba(99,106,242,0.6)' : 'rgba(255,255,255,0.1)'};
          background: ${$active ? 'rgba(99,106,242,0.18)' : 'rgba(255,255,255,0.05)'};
          color: ${$active ? '#a5b4fc' : theme.colors.text.secondary};
          &:hover {
            border-color: rgba(99,106,242,0.5);
            background: rgba(99,106,242,0.12);
            color: #a5b4fc;
          }
        `
      : css`
          border: 1px solid ${$active ? '#6366f1' : theme.colors.border.default};
          background: ${$active ? '#eef2ff' : theme.colors.background.secondary};
          color: ${$active ? '#4f46e5' : '#374151'};
          &:hover {
            border-color: #6366f1;
            background: #eef2ff;
            color: #4f46e5;
          }
        `}
`

const ActiveFilterDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
  margin-left: 2px;
`

const HistoricalCountryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        `}
`

const HistoricalCountryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid ${$active ? 'rgba(99,106,242,0.5)' : 'rgba(255,255,255,0.08)'};
          background: ${$active ? 'rgba(99,106,242,0.15)' : 'rgba(255,255,255,0.04)'};
          color: ${$active ? '#a5b4fc' : theme.colors.text.secondary};
          &:hover {
            border-color: rgba(99,106,242,0.4);
            background: rgba(99,106,242,0.1);
            color: #a5b4fc;
          }
        `
      : css`
          border: 1px solid ${$active ? '#6366f1' : '#d1d5db'};
          background: ${$active ? '#eef2ff' : '#ffffff'};
          color: ${$active ? '#4f46e5' : '#374151'};
          &:hover {
            border-color: #6366f1;
            background: #eef2ff;
            color: #4f46e5;
          }
        `}
`

const HistChipName = styled.span`
  font-weight: 500;
  line-height: 1.3;
`

const HistChipYear = styled.span`
  font-size: 10.5px;
  opacity: 0.65;
  margin-top: 1px;
`

const ClearFilterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: transparent;
          color: ${theme.colors.text.secondary};
          &:hover {
            background: rgba(255, 255, 255, 0.06);
            color: ${theme.colors.text.primary};
          }
        `
      : css`
          border: 1px solid #d1d5db;
          background: transparent;
          color: #6b7280;
          &:hover {
            background: #f3f4f6;
            color: #374151;
          }
        `}
`

// ─────────────────────────────────────────────────────────────────────────────

export type PersonDashboardTab = 'stats' | 'list' | 'heads'

export function PersonDashboardSection() {
  const navigate = useNavigate()
  const [personInnerTab, setPersonInnerTab] =
    useState<PersonDashboardTab>('list')
  const [listShowingDetail, setListShowingDetail] = useState(false)
  const [categoryCrudModalOpen, setCategoryCrudModalOpen] = useState(false)
  const [registerTrigger, setRegisterTrigger] = useState(0)

  // Country filter state
  const [filterHistIds, setFilterHistIds] = useState<string[]>([])
  const [expandedModernId, setExpandedModernId] = useState<string | null>(null)

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
  const { data: modernCountries = [] } = useCountries()
  const { data: historicalCountries = [] } = useHistoricalCountries()

  const personList = Array.isArray(persons) ? persons : []

  // Historical countries grouped by modern country ID
  const historicalByModern = useMemo(() => {
    const map: Record<string, typeof historicalCountries> = {}
    historicalCountries.forEach((hc) => {
      ;(hc as any).parentModernCountryIds?.forEach((mid: string) => {
        if (!map[mid]) map[mid] = []
        map[mid].push(hc)
      })
    })
    return map
  }, [historicalCountries])

  // Only show modern countries that have at least one historical country
  const modernCountriesWithHistory = useMemo(
    () => modernCountries.filter((mc) => (historicalByModern[mc.id]?.length ?? 0) > 0),
    [modernCountries, historicalByModern],
  )

  // Filtered person list
  const filteredPersonList = useMemo(() => {
    if (filterHistIds.length === 0) return personList
    return personList.filter(
      (p) => p.countryId != null && filterHistIds.includes(p.countryId as string),
    )
  }, [personList, filterHistIds])

  const handleModernChipClick = (modernId: string) => {
    setExpandedModernId((prev) => (prev === modernId ? null : modernId))
  }

  const handleHistChipClick = (histId: string) => {
    setFilterHistIds((prev) =>
      prev.includes(histId) ? prev.filter((id) => id !== histId) : [...prev, histId],
    )
  }

  const handleClearFilter = () => {
    setFilterHistIds([])
    setExpandedModernId(null)
  }

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

        {/* 탭 네비게이션 */}
        <CountryDetailStyles.PersonInnerPillNav role="tablist" aria-label="인물 메뉴">
          <CountryDetailStyles.PersonInnerPillBtn
            type="button"
            role="tab"
            aria-selected={personInnerTab === 'stats'}
            $active={personInnerTab === 'stats'}
            onClick={() => { setPersonInnerTab('stats'); setListShowingDetail(false) }}
          >
            통계·최근 인물
          </CountryDetailStyles.PersonInnerPillBtn>
          <CountryDetailStyles.PersonInnerPillBtn
            type="button"
            role="tab"
            aria-selected={personInnerTab === 'list'}
            $active={personInnerTab === 'list'}
            onClick={() => { setPersonInnerTab('list'); setListShowingDetail(false) }}
          >
            인물 리스트
          </CountryDetailStyles.PersonInnerPillBtn>
          <CountryDetailStyles.PersonInnerPillBtn
            type="button"
            role="tab"
            aria-selected={personInnerTab === 'heads'}
            $active={personInnerTab === 'heads'}
            onClick={() => { setPersonInnerTab('heads'); setListShowingDetail(false) }}
          >
            역대 수반
          </CountryDetailStyles.PersonInnerPillBtn>
        </CountryDetailStyles.PersonInnerPillNav>

        {/* Country filter — list 탭에서만 표시 */}
        {personInnerTab === 'list' && modernCountriesWithHistory.length > 0 && (
          <CountryFilterSection>
            <ModernCountryRow>
              {modernCountriesWithHistory.map((mc) => {
                const hcList = historicalByModern[mc.id] ?? []
                const hasActive = hcList.some((hc) => filterHistIds.includes(hc.id))
                const isExpanded = expandedModernId === mc.id
                return (
                  <ModernCountryChip
                    key={mc.id}
                    type="button"
                    $active={isExpanded}
                    $hasFilter={hasActive}
                    onClick={() => handleModernChipClick(mc.id)}
                  >
                    {(mc as any).flagEmoji && <span>{(mc as any).flagEmoji}</span>}
                    {mc.name}
                    {hasActive && <ActiveFilterDot />}
                  </ModernCountryChip>
                )
              })}
              {filterHistIds.length > 0 && (
                <ClearFilterBtn type="button" onClick={handleClearFilter}>
                  <FiX size={12} />
                  필터 초기화
                </ClearFilterBtn>
              )}
            </ModernCountryRow>
            {expandedModernId && (historicalByModern[expandedModernId]?.length ?? 0) > 0 && (
              <HistoricalCountryRow>
                {(historicalByModern[expandedModernId] ?? [])
                  .slice()
                  .sort((a, b) => {
                    const ay =
                      (a as any).startEra === 'BC'
                        ? -((a as any).startYear ?? 0)
                        : ((a as any).startYear ?? 9999)
                    const by_ =
                      (b as any).startEra === 'BC'
                        ? -((b as any).startYear ?? 0)
                        : ((b as any).startYear ?? 9999)
                    return ay - by_
                  })
                  .map((hc) => {
                    const isActive = filterHistIds.includes(hc.id)
                    const startYear = (hc as any).startYear
                    const endYear = (hc as any).endYear
                    const startEra = (hc as any).startEra
                    const endEra = (hc as any).endEra
                    const yearRange = startYear
                      ? `${startEra === 'BC' ? 'BC ' : ''}${startYear}${endYear ? ` ~ ${endEra === 'BC' ? 'BC ' : ''}${endYear}` : ' ~'}`
                      : null
                    return (
                      <HistoricalCountryChip
                        key={hc.id}
                        type="button"
                        $active={isActive}
                        onClick={() => handleHistChipClick(hc.id)}
                      >
                        <HistChipName>{hc.name}</HistChipName>
                        {yearRange && <HistChipYear>{yearRange}</HistChipYear>}
                      </HistoricalCountryChip>
                    )
                  })}
              </HistoricalCountryRow>
            )}
          </CountryFilterSection>
        )}

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
            persons={filteredPersonList}
            dynasties={dynasties.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            }))}
            invalidateKeys={[...personKeys.all]}
            title="인물 리스트"
            emptyMessage="등록된 인물이 없습니다."
            emptyFilterMessage="검색·필터 조건에 맞는 인물이 없습니다."
            onViewChange={(view) => setListShowingDetail(view === 'detail')}
            onPersonClick={(id) => navigate(pathKeys.history.dashboardPersonDetail(id))}
            hideMainHeader
            hideCreateButton
            registerTrigger={registerTrigger}
            enableCountryFilter={false}
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
