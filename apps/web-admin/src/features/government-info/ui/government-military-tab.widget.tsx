import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiSearch, FiShield, FiTrash2, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  militaryUnitApi,
  type MilitaryUnit,
  type MilitaryUnitType,
} from '@/shared/api/military-unit'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { notify } from '@/shared/ui/toast'

export interface GovernmentMilitaryTabProps {
  country?: UnifiedCountry
  effectiveCountryId: string | undefined
  onCreateUnit: () => void
  onEditUnit: (unitId: string) => void
}

const UNIT_TYPE_LABELS: Record<MilitaryUnitType, string> = {
  FIELD_ARMY: '야전군',
  CORPS: '군단',
  DIVISION: '사단',
  BRIGADE: '여단',
  REGIMENT: '연대',
  BATTALION: '대대',
  COMPANY: '중대',
  PLATOON: '소대',
  SQUAD: '분대',
  FLEET: '함대',
  SQUADRON: '전대',
  WING: '비행단',
  SPECIAL_FORCES: '특수부대',
  DETACHMENT: '파견대',
  OTHER: '기타',
}

const BRANCH_LABELS: Record<string, string> = {
  ARMY: '육군',
  NAVY: '해군',
  AIR_FORCE: '공군',
  MARINE_CORPS: '해병대',
  COAST_GUARD: '해안경비대',
  SPACE_FORCE: '우주군',
  JOINT: '합동',
  OTHER: '기타',
}

type ExtendedMilitaryUnit = MilitaryUnit & {
  branch?: string | null
  nickname?: string | null
  motto?: string | null
  garrison?: string | null
  strength?: string | null
  administrationDepartment?: { id: string; name: string } | null
}

export function GovernmentMilitaryTab({
  country,
  effectiveCountryId,
  onCreateUnit,
  onEditUnit,
}: GovernmentMilitaryTabProps) {
  const queryClient = useQueryClient()
  const isHistorical = country?.type === 'historical'
  const targetId = effectiveCountryId ?? country?.id ?? ''

  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISBANDED'>('ALL')

  const linkedHistoricalIds = useMemo(() => {
    const idSet = new Set<string>()
    for (const item of country?.historicalCountries ?? []) {
      if (item.id) idSet.add(item.id)
    }
    return idSet
  }, [country?.historicalCountries])

  const unitsQuery = useQuery({
    queryKey: ['military-units', 'all'],
    queryFn: () => militaryUnitApi.getAll(),
    staleTime: 1000 * 60 * 2,
  })

  const countryUnits = useMemo<ExtendedMilitaryUnit[]>(() => {
    const all = (unitsQuery.data ?? []) as ExtendedMilitaryUnit[]
    if (!targetId) return []
    return all.filter((unitItem) => {
      if (isHistorical) {
        return unitItem.historicalCountryId === targetId
      }
      return (
        unitItem.countryId === targetId ||
        (unitItem.historicalCountryId != null &&
          linkedHistoricalIds.has(unitItem.historicalCountryId))
      )
    })
  }, [unitsQuery.data, targetId, isHistorical, linkedHistoricalIds])

  const branchCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const unitItem of countryUnits) {
      const branchKey = unitItem.branch || 'UNSPECIFIED'
      counts.set(branchKey, (counts.get(branchKey) ?? 0) + 1)
    }
    return counts
  }, [countryUnits])

  const filteredUnits = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    return countryUnits
      .filter((unitItem) => {
        if (branchFilter !== 'ALL') {
          const itemBranch = unitItem.branch || 'UNSPECIFIED'
          if (itemBranch !== branchFilter) return false
        }
        if (statusFilter === 'ACTIVE' && unitItem.isActive === false) return false
        if (statusFilter === 'DISBANDED' && unitItem.isActive !== false) return false
        if (!keyword) return true
        return (
          unitItem.name.toLowerCase().includes(keyword) ||
          (unitItem.nickname ?? '').toLowerCase().includes(keyword) ||
          (unitItem.garrison ?? '').toLowerCase().includes(keyword) ||
          (unitItem.description ?? '').toLowerCase().includes(keyword)
        )
      })
      .sort((left, right) => {
        const leftStart = signedYearFromIsoLike(left.establishedDate) ?? 999999
        const rightStart = signedYearFromIsoLike(right.establishedDate) ?? 999999
        if (leftStart !== rightStart) return leftStart - rightStart
        return left.name.localeCompare(right.name, 'ko')
      })
  }, [countryUnits, branchFilter, statusFilter, searchQuery])

  const deleteMutation = useMutation({
    mutationFn: (unitId: string) => militaryUnitApi.delete(unitId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['military-units'] })
      notify.success('군부대가 삭제되었습니다.')
    },
    onError: () => {
      notify.error('군부대 삭제에 실패했습니다.')
    },
  })

  const handleDelete = (unitItem: ExtendedMilitaryUnit) => {
    if (!window.confirm(`'${unitItem.name}' 부대를 삭제하시겠습니까?`)) return
    deleteMutation.mutate(unitItem.id)
  }

  return (
    <Wrap>
      <HeaderBar>
        <div>
          <HeaderTitleRow>
            <HeaderTitle>군사 조직 및 부대 편제</HeaderTitle>
            <CountBadge>{countryUnits.length}개 부대</CountBadge>
          </HeaderTitleRow>
          <HeaderDesc>
            육·해·공군 등 군종별 부대, 사령부, 함대, 특수부대를 부처 구분 없이 통합 조회하고 관리합니다.
          </HeaderDesc>
        </div>
        <PrimaryButton type="button" onClick={onCreateUnit}>
          <FiPlus size={15} />
          부대 등록
        </PrimaryButton>
      </HeaderBar>

      {countryUnits.length > 0 && (
        <Toolbar>
          <SearchBox>
            <FiSearch size={14} />
            <SearchInput
              type="text"
              placeholder="부대명, 별칭, 주둔지, 설명 검색..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <ClearButton
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                <FiX size={13} />
              </ClearButton>
            )}
          </SearchBox>

          <FilterGroup role="group" aria-label="군종 필터">
            <FilterChip
              type="button"
              $active={branchFilter === 'ALL'}
              onClick={() => setBranchFilter('ALL')}
            >
              전체 군종 ({countryUnits.length})
            </FilterChip>
            {Array.from(branchCounts.entries()).map(([branchKey, count]) => (
              <FilterChip
                key={branchKey}
                type="button"
                $active={branchFilter === branchKey}
                onClick={() => setBranchFilter(branchKey)}
              >
                {branchKey === 'UNSPECIFIED'
                  ? '군종 미지정'
                  : (BRANCH_LABELS[branchKey] ?? branchKey)}{' '}
                ({count})
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup role="group" aria-label="운용 상태 필터">
            <FilterChip
              type="button"
              $active={statusFilter === 'ALL'}
              onClick={() => setStatusFilter('ALL')}
            >
              전체
            </FilterChip>
            <FilterChip
              type="button"
              $active={statusFilter === 'ACTIVE'}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              현존·운용 중
            </FilterChip>
            <FilterChip
              type="button"
              $active={statusFilter === 'DISBANDED'}
              onClick={() => setStatusFilter('DISBANDED')}
            >
              해체·과거
            </FilterChip>
          </FilterGroup>
        </Toolbar>
      )}

      {unitsQuery.isLoading ? (
        <EmptyCard>불러오는 중…</EmptyCard>
      ) : countryUnits.length === 0 ? (
        <EmptyCard>
          <EmptyIcon>
            <FiShield size={24} />
          </EmptyIcon>
          <EmptyTitle>등록된 군사 조직·부대가 없습니다</EmptyTitle>
          <EmptyDesc>
            우측 상단 &apos;부대 등록&apos; 버튼을 눌러 야전군·군단·사단·함대·비행단 등 군사 편제를 등록해 보세요.
          </EmptyDesc>
          <PrimaryButton type="button" onClick={onCreateUnit}>
            <FiPlus size={15} />첫 부대 등록
          </PrimaryButton>
        </EmptyCard>
      ) : filteredUnits.length === 0 ? (
        <EmptyCard>조건에 맞는 부대가 없습니다.</EmptyCard>
      ) : (
        <UnitGrid>
          {filteredUnits.map((unitItem) => {
            const startYear = signedYearFromIsoLike(unitItem.establishedDate)
            const endYear = signedYearFromIsoLike(unitItem.disbandedDate)
            const periodLabel =
              startYear != null && endYear != null
                ? `${formatSignedYear(startYear)} – ${formatSignedYear(endYear)}`
                : startYear != null
                  ? `${formatSignedYear(startYear)} – ${unitItem.isActive === false ? '해체' : '현재'}`
                  : endYear != null
                    ? `? – ${formatSignedYear(endYear)}`
                    : null
            return (
              <UnitCard key={unitItem.id}>
                <CardTop>
                  <BadgeRow>
                    {unitItem.branch && (
                      <BranchBadge>
                        {BRANCH_LABELS[unitItem.branch] ?? unitItem.branch}
                      </BranchBadge>
                    )}
                    {unitItem.unitType && (
                      <TypeBadge>
                        {UNIT_TYPE_LABELS[unitItem.unitType] ?? unitItem.unitType}
                      </TypeBadge>
                    )}
                    <StatusDot $active={unitItem.isActive !== false}>
                      {unitItem.isActive === false ? '해체' : '운용 중'}
                    </StatusDot>
                  </BadgeRow>

                  <ActionGroup>
                    <IconButton
                      type="button"
                      onClick={() => onEditUnit(unitItem.id)}
                      title="부대 수정"
                      aria-label={`${unitItem.name} 수정`}
                    >
                      <FiEdit2 size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      $danger
                      onClick={() => handleDelete(unitItem)}
                      title="부대 삭제"
                      aria-label={`${unitItem.name} 삭제`}
                    >
                      <FiTrash2 size={14} />
                    </IconButton>
                  </ActionGroup>
                </CardTop>

                <UnitName onClick={() => onEditUnit(unitItem.id)}>
                  {unitItem.name}
                  {unitItem.nickname && (
                    <UnitNickname> · &ldquo;{unitItem.nickname}&rdquo;</UnitNickname>
                  )}
                </UnitName>

                <MetaList>
                  {periodLabel && <MetaItem>기간: {periodLabel}</MetaItem>}
                  {unitItem.parentUnit && (
                    <MetaItem>상위 부대: {unitItem.parentUnit.name}</MetaItem>
                  )}
                  {unitItem.garrison && (
                    <MetaItem>주둔지: {unitItem.garrison}</MetaItem>
                  )}
                  {unitItem.historicalCountry && !isHistorical && (
                    <MetaItem>
                      시대 소속: 🏛️ {unitItem.historicalCountry.name}
                    </MetaItem>
                  )}
                </MetaList>

                {unitItem.description && (
                  <UnitDesc>{unitItem.description}</UnitDesc>
                )}
              </UnitCard>
            )
          })}
        </UnitGrid>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const HeaderBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
`

const HeaderTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountBadge = styled.span`
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderDesc = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  flex: 1;
  max-width: 360px;
  padding: 7px 11px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;
`

const UnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
`

const UnitCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

const BranchBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.14);
  color: #6366f1;
`

const TypeBadge = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StatusDot = styled.span<{ $active: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#10b981' : theme.colors.text.tertiary};
`

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? '#ef4444' : theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ $danger, theme }) =>
      $danger ? '#dc2626' : theme.colors.text.primary};
  }
`

const UnitName = styled.button`
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const UnitNickname = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaItem = styled.span`
  font-variant-numeric: tabular-nums;
`

const UnitDesc = styled.p`
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const EmptyCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 24px;
  border-radius: 14px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13.5px;
`

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
`

const EmptyTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.p`
  margin: 0;
  max-width: 400px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`
