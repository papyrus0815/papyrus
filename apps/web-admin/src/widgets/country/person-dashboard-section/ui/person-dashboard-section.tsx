import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { FiCheck, FiFilter, FiPlus, FiSettings, FiX } from 'react-icons/fi'
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
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #f8f9fc;
          border: 1px solid #e8eaf0;
        `}
`

const FilterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const FilterLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`color: rgba(255,255,255,0.3);`
      : css`color: #9ca3af;`}
`

const ActiveCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99,106,242,0.3);
          color: #a5b4fc;
        `
      : css`
          background: #e0e7ff;
          color: #4f46e5;
        `}
`

const ModernCountryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const ModernCountryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 10px;
  border-radius: 22px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  position: relative;

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid ${$active ? 'rgba(99,106,242,0.55)' : 'rgba(255,255,255,0.1)'};
          background: ${$active ? 'rgba(99,106,242,0.2)' : 'rgba(255,255,255,0.05)'};
          color: ${$active ? '#c7d2fe' : theme.colors.text.secondary};
          box-shadow: ${$active ? '0 0 0 3px rgba(99,106,242,0.12)' : 'none'};
          &:hover {
            border-color: rgba(99,106,242,0.45);
            background: rgba(99,106,242,0.14);
            color: #c7d2fe;
          }
        `
      : css`
          border: 1px solid ${$active ? '#818cf8' : '#e2e4ea'};
          background: ${$active ? '#eef2ff' : '#ffffff'};
          color: ${$active ? '#4338ca' : '#4b5563'};
          box-shadow: ${$active
            ? '0 0 0 3px rgba(99,102,241,0.1)'
            : '0 1px 2px rgba(0,0,0,0.05)'};
          &:hover {
            border-color: #818cf8;
            background: #f0f3ff;
            color: #4338ca;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
          }
        `}
`

const ChipFlag = styled.span`
  font-size: 15px;
  line-height: 1;
  flex-shrink: 0;
`

const ChipCountBadge = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 700;
  margin-left: 2px;
  transition: all 0.15s ease;

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(99,106,242,0.35)' : 'rgba(255,255,255,0.1)'};
          color: ${$active ? '#a5b4fc' : 'rgba(255,255,255,0.4)'};
        `
      : css`
          background: ${$active ? '#dde4ff' : '#f0f0f5'};
          color: ${$active ? '#4338ca' : '#9ca3af'};
        `}
`

const HistoricalCountryRow = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  margin-top: 2px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.06);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e2e4ea;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        `}
`

const HistoricalCountryChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border-radius: 9px;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid ${$active ? 'rgba(99,106,242,0.5)' : 'rgba(255,255,255,0.07)'};
          background: ${$active ? 'rgba(99,106,242,0.18)' : 'rgba(255,255,255,0.04)'};
          color: ${$active ? '#a5b4fc' : theme.colors.text.secondary};
          &:hover {
            border-color: rgba(99,106,242,0.4);
            background: rgba(99,106,242,0.12);
            color: #c7d2fe;
          }
        `
      : css`
          border: 1px solid ${$active ? '#818cf8' : '#e5e7eb'};
          background: ${$active ? '#eef2ff' : '#f9fafb'};
          color: ${$active ? '#4338ca' : '#374151'};
          &:hover {
            border-color: #818cf8;
            background: #f0f3ff;
            color: #4338ca;
          }
        `}
`

const HistChipInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
`

const HistChipName = styled.span`
  font-weight: 500;
  line-height: 1.2;
  font-size: 12.5px;
`

const HistChipYear = styled.span`
  font-size: 10px;
  opacity: 0.55;
  line-height: 1;
`

const HistChipCheck = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.15s ease;

  ${({ theme, $active }) =>
    theme.mode === 'dark'
      ? css`
          background: ${$active ? 'rgba(99,106,242,0.4)' : 'rgba(255,255,255,0.08)'};
          color: ${$active ? '#a5b4fc' : 'rgba(255,255,255,0.2)'};
          border: 1px solid ${$active ? 'rgba(99,106,242,0.5)' : 'rgba(255,255,255,0.1)'};
        `
      : css`
          background: ${$active ? '#6366f1' : '#f3f4f6'};
          color: ${$active ? '#ffffff' : '#d1d5db'};
          border: 1px solid ${$active ? '#6366f1' : '#e5e7eb'};
        `}
`

const ClearFilterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 22px;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-left: 2px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: rgba(255,255,255,0.3);
          &:hover {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255,255,255,0.6);
            border-color: rgba(255,255,255,0.15);
          }
        `
      : css`
          border: 1px solid #e5e7eb;
          background: transparent;
          color: #9ca3af;
          &:hover {
            background: #f3f4f6;
            color: #6b7280;
            border-color: #d1d5db;
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
    const hcIds = (historicalByModern[modernId] ?? []).map((hc) => hc.id)
    const allSelected = hcIds.length > 0 && hcIds.every((id) => filterHistIds.includes(id))
    if (allSelected) {
      // 전체 해제 + 접기
      setFilterHistIds((prev) => prev.filter((id) => !hcIds.includes(id)))
      setExpandedModernId((prev) => (prev === modernId ? null : prev))
    } else {
      // 전체 선택 + 펼치기
      setFilterHistIds((prev) => [...prev.filter((id) => !hcIds.includes(id)), ...hcIds])
      setExpandedModernId(modernId)
    }
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
            <FilterHeader>
              <FilterLabel>
                <FiFilter size={10} />
                국가별 보기
              </FilterLabel>
              {filterHistIds.length > 0 && (
                <ClearFilterBtn type="button" onClick={handleClearFilter}>
                  <FiX size={11} />
                  초기화
                </ClearFilterBtn>
              )}
            </FilterHeader>

            <ModernCountryRow>
              {modernCountriesWithHistory.map((mc) => {
                const hcList = historicalByModern[mc.id] ?? []
                const hasActive = hcList.some((hc) => filterHistIds.includes(hc.id))
                const personCount = hcList.reduce(
                  (sum, hc) => sum + personList.filter((p) => p.countryId === hc.id).length,
                  0,
                )
                return (
                  <ModernCountryChip
                    key={mc.id}
                    type="button"
                    $active={hasActive}
                    onClick={() => handleModernChipClick(mc.id)}
                  >
                    {(mc as any).flagEmoji && <ChipFlag>{(mc as any).flagEmoji}</ChipFlag>}
                    {mc.name}
                    <ChipCountBadge $active={hasActive}>{personCount}</ChipCountBadge>
                  </ModernCountryChip>
                )
              })}
            </ModernCountryRow>

            <AnimatePresence initial={false}>
              {expandedModernId && (historicalByModern[expandedModernId]?.length ?? 0) > 0 && (
                <HistoricalCountryRow
                  key={expandedModernId}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
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
                          <HistChipCheck $active={isActive}>
                            {isActive && <FiCheck size={10} />}
                          </HistChipCheck>
                          <HistChipInfo>
                            <HistChipName>{hc.name}</HistChipName>
                            {yearRange && <HistChipYear>{yearRange}</HistChipYear>}
                          </HistChipInfo>
                        </HistoricalCountryChip>
                      )
                    })}
                </HistoricalCountryRow>
              )}
            </AnimatePresence>
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
