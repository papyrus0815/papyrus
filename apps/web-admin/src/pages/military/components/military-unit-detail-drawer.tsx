import { useRef, useState } from 'react'

import {
  FiCompass,
  FiEdit2,
  FiExternalLink,
  FiGitCommit,
  FiGlobe,
  FiPlus,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { MILITARY_BRANCH_LABELS } from '@/entities/military-unit'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'
import { PopoverMenu } from '@/shared/ui/popover-menu'
import { SidePanel } from '@/shared/ui/side-panel'
import { LedgerToolbarButton } from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import {
  type CreateSubUnitDefaults,
  type MilitaryUnitDetailActionsHandle,
  MilitaryUnitDetailContent,
  type MilitaryUnitDetailResponse,
} from '@/widgets/military-unit-detail'

export interface MilitaryUnitDetailDrawerProps {
  unitId: string | null
  listSearch?: string
  scopedUnits?: MilitaryUnitDetailResponse[]
  onClose: () => void
  onSelectUnit: (nextUnitId: string) => void
  onEditUnit: (unitId: string) => void
  onCreateSubUnit?: (defaults: CreateSubUnitDefaults) => void
  onNavigateToDepartment?: (departmentId: string) => void
}

export function MilitaryUnitDetailDrawer({
  unitId,
  listSearch = '',
  scopedUnits,
  onClose,
  onSelectUnit,
  onEditUnit,
  onCreateSubUnit,
  onNavigateToDepartment,
}: MilitaryUnitDetailDrawerProps) {
  const navigate = useNavigate()
  const detailActionsRef = useRef<MilitaryUnitDetailActionsHandle | null>(null)
  const [unit, setUnit] = useState<MilitaryUnitDetailResponse | null>(null)

  const countryName =
    unit?.historicalCountry?.name ?? unit?.country?.name ?? null
  const countryIdForLink =
    unit?.historicalCountry?.id ?? unit?.country?.id ?? null

  return (
    <SidePanel
      isOpen={Boolean(unitId)}
      onClose={onClose}
      width="min(700px, 96vw)"
      title={unit ? unit.name : '사령부 · 부대 상세'}
      subtitle={
        unit
          ? [
              unit.unitType ? militaryUnitTypeLabelKo(unit.unitType) : null,
              unit.branch
                ? (MILITARY_BRANCH_LABELS[unit.branch] ?? unit.branch)
                : null,
              countryName,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      headerActions={
        unit ? (
          <DrawerHeaderActions>
            <LedgerToolbarButton
              type="button"
              $active
              onClick={() =>
                navigate(pathKeys.militaryUnitDetail(unit.id), {
                  state: { listSearch },
                })
              }
            >
              <FiExternalLink size={13} /> 단독 상세
            </LedgerToolbarButton>

            <PopoverMenu
              ariaLabel="부대 작업 및 설정 메뉴"
              title="부대 정보 수정 · 예하 추가 · 지휘관 임명 · 계보 · 삭제"
              items={[
                {
                  id: 'edit',
                  label: '사령부·부대 정보 수정',
                  icon: <FiEdit2 size={13} />,
                  onSelect: () => onEditUnit(unit.id),
                },
                ...(onCreateSubUnit
                  ? [
                      {
                        id: 'add-sub',
                        label: '예하 부대 추가',
                        icon: <FiPlus size={13} />,
                        onSelect: () =>
                          onCreateSubUnit({
                            parentUnitId: unit.id,
                            countryId: unit.countryId ?? null,
                            historicalCountryId:
                              unit.historicalCountryId ?? null,
                            administrationDepartmentId:
                              unit.administrationDepartmentId ??
                              unit.administrationDepartment?.id ??
                              null,
                            branch: unit.branch ?? null,
                          }),
                      },
                    ]
                  : []),
                {
                  id: 'appoint',
                  label: '지휘관 · 참모 임명',
                  icon: <FiUser size={13} />,
                  onSelect: () => detailActionsRef.current?.openAppointment(),
                },
                {
                  id: 'lineage',
                  label: '조직 개편 계보 추가',
                  icon: <FiGitCommit size={13} />,
                  onSelect: () => detailActionsRef.current?.openAddTransition(),
                },
                {
                  id: 'event',
                  label: '사건 · 지령 연결',
                  icon: <FiCompass size={13} />,
                  onSelect: () => detailActionsRef.current?.openEventPicker(),
                },
                ...(countryName && countryIdForLink
                  ? [
                      { type: 'divider' as const, id: 'div-country' },
                      {
                        id: 'country-tab',
                        label: `${countryName} 군사 탭 열기`,
                        icon: <FiGlobe size={13} />,
                        onSelect: () =>
                          navigate(
                            pathKeys.countryMilitary(countryIdForLink, unit.id),
                          ),
                      },
                    ]
                  : []),
                { type: 'divider', id: 'div-danger' },
                {
                  id: 'delete',
                  label: '부대 삭제',
                  icon: <FiTrash2 size={13} />,
                  danger: true,
                  onSelect: () =>
                    void detailActionsRef.current?.deleteCurrentUnit(),
                },
              ]}
            />
          </DrawerHeaderActions>
        ) : undefined
      }
    >
      {unitId ? (
        <DrawerBodyWrap>
          <MilitaryUnitDetailContent
            ref={detailActionsRef}
            unitId={unitId}
            variant="drawer"
            scopedUnits={scopedUnits}
            onUnitLoaded={setUnit}
            onSelectUnit={onSelectUnit}
            onEditUnit={onEditUnit}
            onCreateSubUnit={onCreateSubUnit}
            onNavigateToDepartment={onNavigateToDepartment}
            onDeleted={() => onClose()}
          />
        </DrawerBodyWrap>
      ) : null}
    </SidePanel>
  )
}

const DrawerHeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const DrawerBodyWrap = styled.div`
  padding: 4px 0 24px;
`
