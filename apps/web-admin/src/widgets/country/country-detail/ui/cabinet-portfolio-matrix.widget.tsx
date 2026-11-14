import { useMemo, useState } from 'react'
import {
  FiArrowUpRight,
  FiBriefcase,
  FiEdit2,
  FiLayers,
  FiPlus,
  FiUser,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  type AdministrationDepartment,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
import type { GovernmentCabinetTenureItem } from '@/shared/api/person-career'
import { findDepartmentForMember } from '@/shared/lib/ministry-department/department-cabinet-matcher'

import {
  calcTenureDuration,
  formatDate,
  getPersonName,
} from './cabinets-section.helpers'

export interface CabinetPortfolioMatrixProps {
  departments: AdministrationDepartment[]
  ministers: GovernmentCabinetTenureItem[]
  selectedMinisterId: string | null
  isDark: boolean
  onSelectMinister: (tenureId: string) => void
  onEditMinister?: (tenure: GovernmentCabinetTenureItem) => void
  onAppointForDepartment: (department: AdministrationDepartment | null) => void
  onOpenDepartmentDetail?: (departmentId: string) => void
  onOpenMinistriesTab?: () => void
}

export function CabinetPortfolioMatrix({
  departments,
  ministers,
  selectedMinisterId,
  isDark: _isDark,
  onSelectMinister,
  onEditMinister,
  onAppointForDepartment,
  onOpenDepartmentDetail,
  onOpenMinistriesTab,
}: CabinetPortfolioMatrixProps) {
  const [includeSubAgencies, setIncludeSubAgencies] = useState(false)

  const { portfolioRows, unassignedMinisters, filledDeptCount } =
    useMemo(() => {
      const assignedByDeptId = new Map<string, GovernmentCabinetTenureItem[]>()
      const unmatchedList: GovernmentCabinetTenureItem[] = []

      for (const ministerItem of ministers) {
        const matchedDept = findDepartmentForMember(
          {
            title:
              ministerItem.title ??
              ministerItem.positionDefinition?.title ??
              null,
            administrationDepartmentId:
              ministerItem.administrationDepartmentId ??
              ministerItem.positionDefinition?.administrationDepartmentId ??
              null,
            administrationDepartment:
              ministerItem.administrationDepartment ?? null,
            positionDefinition: ministerItem.positionDefinition ?? null,
          },
          departments,
        )

        if (matchedDept) {
          const existing = assignedByDeptId.get(matchedDept.id) ?? []
          existing.push(ministerItem)
          assignedByDeptId.set(matchedDept.id, existing)
        } else {
          unmatchedList.push(ministerItem)
        }
      }

      const visibleDepts = departments.filter((deptItem) => {
        if (assignedByDeptId.has(deptItem.id)) return true
        if (includeSubAgencies) return true
        const deptKind = deptItem.kind ?? 'MINISTRY'
        return deptKind === 'MINISTRY' && !deptItem.parentId
      })

      const sortedDepts = [...visibleDepts].sort((leftDept, rightDept) => {
        const leftFilled = assignedByDeptId.has(leftDept.id) ? 0 : 1
        const rightFilled = assignedByDeptId.has(rightDept.id) ? 0 : 1
        if (leftFilled !== rightFilled) return leftFilled - rightFilled
        return leftDept.name.localeCompare(rightDept.name, 'ko')
      })

      const rows = sortedDepts.map((deptItem) => ({
        department: deptItem,
        holders: assignedByDeptId.get(deptItem.id) ?? [],
      }))

      const filledCount = rows.filter(
        (rowItem) => rowItem.holders.length > 0,
      ).length

      return {
        portfolioRows: rows,
        unassignedMinisters: unmatchedList,
        filledDeptCount: filledCount,
      }
    }, [departments, ministers, includeSubAgencies])

  const hasNonMinistryDepts = useMemo(
    () =>
      departments.some(
        (deptItem) =>
          (deptItem.kind ?? 'MINISTRY') !== 'MINISTRY' ||
          Boolean(deptItem.parentId),
      ),
    [departments],
  )

  if (departments.length === 0) {
    return (
      <EmptyMatrixCard>
        <EmptyIconCircle>
          <FiBriefcase size={22} />
        </EmptyIconCircle>
        <EmptyMatrixTitle>
          이 정권 시기에 매칭되는 중앙부처 편제가 아직 없습니다
        </EmptyMatrixTitle>
        <EmptyMatrixDesc>
          중앙부처·국가기관 탭에서 부처(예: 외무부, 재무부, 국방부, 6조 등)를
          등록하면 내각 편제표에서 부처별 장관 재임과 공석 현황을 한눈에 관리할
          수 있습니다.
        </EmptyMatrixDesc>
        <EmptyActionsRow>
          {onOpenMinistriesTab ? (
            <PrimaryJumpBtn type="button" onClick={onOpenMinistriesTab}>
              <FiBriefcase size={13} />
              <span>중앙부처 편제 등록하러 가기</span>
              <FiArrowUpRight size={13} />
            </PrimaryJumpBtn>
          ) : null}
          <SecondaryActionBtn
            type="button"
            onClick={() => onAppointForDepartment(null)}
          >
            <FiPlus size={13} />
            <span>부처 없이 각료 바로 임명</span>
          </SecondaryActionBtn>
        </EmptyActionsRow>
      </EmptyMatrixCard>
    )
  }

  const vacantCount = Math.max(0, portfolioRows.length - filledDeptCount)

  return (
    <MatrixWrap>
      <MatrixSummaryBar>
        <SummaryMetrics>
          <MetricChip $tone="neutral">
            대상 기관 <strong>{portfolioRows.length}</strong>곳
          </MetricChip>
          <MetricChip $tone="filled">
            임명 완료 <strong>{filledDeptCount}</strong>곳
          </MetricChip>
          <MetricChip $tone="vacant">
            미임명(공석) <strong>{vacantCount}</strong>곳
          </MetricChip>
        </SummaryMetrics>

        <SummaryRightControls>
          {hasNonMinistryDepts ? (
            <FilterToggleBtn
              type="button"
              $active={includeSubAgencies}
              onClick={() => setIncludeSubAgencies((prev) => !prev)}
            >
              <FiLayers size={12} />
              <span>
                {includeSubAgencies ? '외청·산하 포함 중' : '중앙부처만 표시'}
              </span>
            </FilterToggleBtn>
          ) : null}
          {onOpenMinistriesTab ? (
            <FilterToggleBtn
              type="button"
              $active={false}
              onClick={onOpenMinistriesTab}
            >
              <span>중앙부처 관리</span>
              <FiArrowUpRight size={12} />
            </FilterToggleBtn>
          ) : null}
        </SummaryRightControls>
      </MatrixSummaryBar>

      <PortfolioGrid>
        {portfolioRows.map(({ department, holders }) => {
          const isVacant = holders.length === 0
          const kindLabel =
            department.kind && department.kind !== 'MINISTRY'
              ? DEPARTMENT_KIND_LABEL[department.kind]
              : null

          return (
            <PortfolioRow key={department.id} $vacant={isVacant}>
              <DeptHeaderCol>
                <DeptTitleLine>
                  {onOpenDepartmentDetail ? (
                    <DeptNameBtn
                      type="button"
                      onClick={() => onOpenDepartmentDetail(department.id)}
                      title={`${department.name} 중앙부처 상세로 이동`}
                    >
                      <span>{department.name}</span>
                      <FiArrowUpRight size={12} />
                    </DeptNameBtn>
                  ) : (
                    <DeptNameStatic>{department.name}</DeptNameStatic>
                  )}
                  {department.abbreviation?.trim() ? (
                    <DeptSubBadge>({department.abbreviation.trim()})</DeptSubBadge>
                  ) : null}
                </DeptTitleLine>

                <DeptMetaLine>
                  {department.historicalCountry?.name ? (
                    <DeptSmallTag>
                      🏛️ {department.historicalCountry.name}
                    </DeptSmallTag>
                  ) : null}
                  {kindLabel ? <DeptSmallTag>{kindLabel}</DeptSmallTag> : null}
                  {department.category?.name ? (
                    <DeptSmallTag>{department.category.name}</DeptSmallTag>
                  ) : null}
                </DeptMetaLine>
              </DeptHeaderCol>

              <HoldersCol>
                {isVacant ? (
                  <VacantSlotRow>
                    <VacantLabel>등록된 재임 각료 없음</VacantLabel>
                    <AppointSlotBtn
                      type="button"
                      onClick={() => onAppointForDepartment(department)}
                    >
                      <FiPlus size={12.5} />
                      <span>수장 · 장관 임명</span>
                    </AppointSlotBtn>
                  </VacantSlotRow>
                ) : (
                  <HolderList>
                    {holders.map((holderItem) => {
                      const holderName = getPersonName(holderItem.person)
                      const holderRole =
                        holderItem.title ??
                        holderItem.positionDefinition?.title ??
                        '장관'
                      const startStr = holderItem.startDate
                        ? formatDate(holderItem.startDate)
                        : '—'
                      const endStr = holderItem.endDate
                        ? formatDate(holderItem.endDate)
                        : '현재'
                      const durationStr = calcTenureDuration(
                        holderItem.startDate,
                        holderItem.endDate,
                      )
                      const thumbUrl =
                        holderItem.person?.profileImageUrl ?? null

                      return (
                        <HolderChipCard
                          key={holderItem.id}
                          $selected={selectedMinisterId === holderItem.id}
                          onClick={() => onSelectMinister(holderItem.id)}
                        >
                          <HolderAvatar>
                            {thumbUrl ? (
                              <img src={thumbUrl} alt={holderName} />
                            ) : (
                              <FiUser size={14} />
                            )}
                          </HolderAvatar>

                          <HolderBody>
                            <HolderTopRow>
                              <HolderName>{holderName}</HolderName>
                              <HolderRoleBadge>{holderRole}</HolderRoleBadge>
                              {holderItem.party?.name ? (
                                <HolderPartyTag>
                                  {holderItem.party.shortName ||
                                    holderItem.party.name}
                                </HolderPartyTag>
                              ) : null}
                            </HolderTopRow>
                            <HolderPeriod>
                              {startStr} – {endStr}
                              {durationStr ? ` (${durationStr})` : ''}
                            </HolderPeriod>
                          </HolderBody>

                          {onEditMinister ? (
                            <HolderIconAction
                              type="button"
                              title="각료 정보 수정"
                              onClick={(clickEvent) => {
                                clickEvent.stopPropagation()
                                onEditMinister(holderItem)
                              }}
                            >
                              <FiEdit2 size={12.5} />
                            </HolderIconAction>
                          ) : null}
                        </HolderChipCard>
                      )
                    })}

                    <InlineAddAnotherBtn
                      type="button"
                      onClick={() => onAppointForDepartment(department)}
                      title={`${department.name} 후임·차관 추가 임명`}
                    >
                      <FiPlus size={11.5} />
                      <span>후임·차관 추가</span>
                    </InlineAddAnotherBtn>
                  </HolderList>
                )}
              </HoldersCol>
            </PortfolioRow>
          )
        })}
      </PortfolioGrid>

      {unassignedMinisters.length > 0 ? (
        <UnassignedBlock>
          <UnassignedHeader>
            <span>
              무임소 · 직속 · 부처 미매칭 각료 ({unassignedMinisters.length}명)
            </span>
          </UnassignedHeader>
          <UnassignedGrid>
            {unassignedMinisters.map((ministerItem) => {
              const personLabel = getPersonName(ministerItem.person)
              const roleLabel =
                ministerItem.title ??
                ministerItem.positionDefinition?.title ??
                '각료'
              const startStr = ministerItem.startDate
                ? formatDate(ministerItem.startDate)
                : '—'
              const endStr = ministerItem.endDate
                ? formatDate(ministerItem.endDate)
                : '현재'
              return (
                <HolderChipCard
                  key={ministerItem.id}
                  $selected={selectedMinisterId === ministerItem.id}
                  onClick={() => onSelectMinister(ministerItem.id)}
                >
                  <HolderAvatar>
                    {ministerItem.person?.profileImageUrl ? (
                      <img
                        src={ministerItem.person.profileImageUrl}
                        alt={personLabel}
                      />
                    ) : (
                      <FiUser size={14} />
                    )}
                  </HolderAvatar>
                  <HolderBody>
                    <HolderTopRow>
                      <HolderName>{personLabel}</HolderName>
                      <HolderRoleBadge>{roleLabel}</HolderRoleBadge>
                    </HolderTopRow>
                    <HolderPeriod>
                      {startStr} – {endStr}
                    </HolderPeriod>
                  </HolderBody>
                  {onEditMinister ? (
                    <HolderIconAction
                      type="button"
                      title="부처 연결 및 정보 수정"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation()
                        onEditMinister(ministerItem)
                      }}
                    >
                      <FiEdit2 size={12.5} />
                    </HolderIconAction>
                  ) : null}
                </HolderChipCard>
              )
            })}
          </UnassignedGrid>
        </UnassignedBlock>
      ) : null}
    </MatrixWrap>
  )
}

const MatrixWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const MatrixSummaryBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SummaryMetrics = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const MetricChip = styled.span<{ $tone: 'neutral' | 'filled' | 'vacant' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ $tone, theme }) =>
    $tone === 'filled'
      ? theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.16)'
        : '#ecfdf5'
      : $tone === 'vacant'
        ? theme.mode === 'dark'
          ? 'rgba(245, 158, 11, 0.14)'
          : '#fffbeb'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : '#ffffff'};
  color: ${({ $tone, theme }) =>
    $tone === 'filled'
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : $tone === 'vacant'
        ? theme.mode === 'dark'
          ? '#fcd34d'
          : '#b45309'
        : theme.colors.text.secondary};
  border: 1px solid
    ${({ $tone, theme }) =>
      $tone === 'filled'
        ? theme.mode === 'dark'
          ? 'rgba(16, 185, 129, 0.3)'
          : '#a7f3d0'
        : $tone === 'vacant'
          ? theme.mode === 'dark'
            ? 'rgba(245, 158, 11, 0.28)'
            : '#fde68a'
          : theme.colors.border.light};
`

const SummaryRightControls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const FilterToggleBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.45)'
          : 'rgba(37, 99, 235, 0.35)'
        : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : '#2563eb'
      : theme.colors.text.secondary};
`

const PortfolioGrid = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 12px;
  overflow: hidden;
`

const PortfolioRow = styled.div<{ $vacant: boolean }>`
  display: grid;
  grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ $vacant, theme }) =>
    $vacant
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.01)'
        : 'rgba(248, 250, 252, 0.65)'
      : 'transparent'};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const DeptHeaderCol = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 12px 14px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 720px) {
    border-right: none;
    border-bottom: 1px dashed ${({ theme }) => theme.colors.border.light};
  }
`

const DeptTitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

const DeptNameBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
  }
`

const DeptNameStatic = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DeptSubBadge = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DeptMetaLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
`

const DeptSmallTag = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HoldersCol = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 14px;
  min-width: 0;
`

const VacantSlotRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;
`

const VacantLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AppointSlotBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(96, 165, 250, 0.4)'
        : 'rgba(37, 99, 235, 0.35)'};
  background: transparent;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#93c5fd' : '#2563eb')};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.14)'
        : 'rgba(37, 99, 235, 0.06)'};
  }
`

const HolderList = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
`

const HolderChipCard = styled.div<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected
        ? '#2563eb'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(15, 23, 42, 0.1)'};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.07)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#ffffff'};

  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.5)' : '#93c5fd'};
  }
`

const HolderAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
`

const HolderBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const HolderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const HolderName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HolderRoleBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HolderPartyTag = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HolderPeriod = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HolderIconAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const InlineAddAnotherBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const UnassignedBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const UnassignedHeader = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const UnassignedGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const EmptyMatrixCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding: 32px 20px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const EmptyIconCircle = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyMatrixTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyMatrixDesc = styled.p`
  margin: 0;
  max-width: 480px;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
`

const PrimaryJumpBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #1d4ed8;
  }
`

const SecondaryActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`
