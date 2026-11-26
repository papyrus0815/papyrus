import { useCallback, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiArrowLeft,
  FiCompass,
  FiEdit2,
  FiGitCommit,
  FiGlobe,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerBackground,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
import { militaryUnitQueryKeys } from '@/entities/military-unit'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { goBackOr, pathKeys } from '@/shared/router'
import { PopoverMenu } from '@/shared/ui/popover-menu'
import { LedgerCompactAction } from '@/widgets/country/country-detail/ui/country-ledger-primitives'
import { MilitaryUnitFormModal } from '@/widgets/country/country-detail/ui/military-unit-form.modal'
import {
  type CreateSubUnitDefaults,
  type MilitaryUnitDetailActionsHandle,
  MilitaryUnitDetailContent,
  type MilitaryUnitDetailResponse,
} from '@/widgets/military-unit-detail'

export function MilitaryUnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const locationState = location.state as {
    listSearch?: string
    fromCountry?: {
      id: string
      name?: string | null
    }
  } | null
  const listSearch = locationState?.listSearch ?? ''
  const fromCountry = locationState?.fromCountry ?? null

  const detailActionsRef = useRef<MilitaryUnitDetailActionsHandle | null>(null)
  const [loadedUnit, setLoadedUnit] =
    useState<MilitaryUnitDetailResponse | null>(null)
  const [ancestorUnits, setAncestorUnits] = useState<
    Array<{ id: string; name: string; abbreviation?: string | null }>
  >([])

  const [unitFormOpen, setUnitFormOpen] = useState(false)
  const [unitFormEditingId, setUnitFormEditingId] = useState<string | null>(
    null,
  )
  const [unitFormDefaults, setUnitFormDefaults] =
    useState<CreateSubUnitDefaults>({})

  useDocumentTitle(
    loadedUnit ? `${loadedUnit.name} · 군사 편제 상세` : '군사 사령부·부대 상세',
  )

  const handleSelectUnit = useCallback(
    (nextUnitId: string) => {
      navigate(pathKeys.militaryUnitDetail(nextUnitId), {
        state: locationState ?? undefined,
      })
    },
    [navigate, locationState],
  )

  const handleEditUnit = useCallback((targetUnitId: string) => {
    setUnitFormEditingId(targetUnitId)
    setUnitFormDefaults({})
    setUnitFormOpen(true)
  }, [])

  const handleCreateSubUnit = useCallback((defaults: CreateSubUnitDefaults) => {
    setUnitFormEditingId(null)
    setUnitFormDefaults(defaults)
    setUnitFormOpen(true)
  }, [])

  const handleDeleted = useCallback(() => {
    if (fromCountry?.id) {
      navigate(pathKeys.countryMilitary(fromCountry.id), { replace: true })
      return
    }
    navigate(
      listSearch ? `${pathKeys.military()}${listSearch}` : pathKeys.military(),
      { replace: true },
    )
  }, [navigate, listSearch, fromCountry])

  if (!unitId) {
    return (
      <PageCanvas>
        <TopBar>
          <BackCrumbBtn
            type="button"
            onClick={() => goBackOr(navigate, pathKeys.military())}
          >
            <FiArrowLeft size={14} /> 이전 화면
          </BackCrumbBtn>
        </TopBar>
      </PageCanvas>
    )
  }

  const countryName =
    loadedUnit?.historicalCountry?.name ?? loadedUnit?.country?.name ?? null
  const countryIdForLink =
    loadedUnit?.historicalCountry?.id ?? loadedUnit?.country?.id ?? null

  return (
    <PageCanvas>
      <TopBar>
        <TopBarLeft>
          {fromCountry?.id ? (
            <BackCrumbBtn
              type="button"
              onClick={() => navigate(pathKeys.countryMilitary(fromCountry.id))}
            >
              <FiArrowLeft size={14} />
              <span>
                {fromCountry.name
                  ? `${fromCountry.name} 편제 · 사령부`
                  : '편제 · 사령부'}
              </span>
            </BackCrumbBtn>
          ) : listSearch ? (
            <BackCrumbBtn
              type="button"
              onClick={() => navigate(`${pathKeys.military()}${listSearch}`)}
            >
              <FiArrowLeft size={14} />
              <span>군사 총람</span>
            </BackCrumbBtn>
          ) : (
            <BackCrumbBtn
              type="button"
              onClick={() =>
                goBackOr(
                  navigate,
                  countryIdForLink
                    ? pathKeys.countryMilitary(countryIdForLink)
                    : pathKeys.military(),
                )
              }
            >
              <FiArrowLeft size={14} />
              <span>
                {countryName ? `${countryName} 편제 · 사령부` : '군사 총람'}
              </span>
            </BackCrumbBtn>
          )}

          {(ancestorUnits.length > 0
            ? ancestorUnits
            : loadedUnit?.parentUnit
              ? [loadedUnit.parentUnit]
              : []
          ).map((ancUnit) => (
            <span
              key={ancUnit.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <CrumbSep aria-hidden>/</CrumbSep>
              <ParentCrumbBtn
                type="button"
                onClick={() => handleSelectUnit(ancUnit.id)}
              >
                {ancUnit.name}
              </ParentCrumbBtn>
            </span>
          ))}
        </TopBarLeft>

        {loadedUnit ? (
          <TopBarRight>
            <LedgerCompactAction
              type="button"
              onClick={() =>
                handleCreateSubUnit({
                  parentUnitId: loadedUnit.id,
                  countryId: loadedUnit.countryId ?? null,
                  historicalCountryId: loadedUnit.historicalCountryId ?? null,
                  administrationDepartmentId:
                    loadedUnit.administrationDepartmentId ??
                    loadedUnit.administrationDepartment?.id ??
                    null,
                  branch: loadedUnit.branch ?? null,
                })
              }
            >
              <FiPlus size={12} /> 예하 추가
            </LedgerCompactAction>

            <LedgerCompactAction
              type="button"
              onClick={() => handleEditUnit(loadedUnit.id)}
            >
              <FiEdit2 size={12} /> 수정
            </LedgerCompactAction>

            <PopoverMenu
              size="sm"
              ariaLabel="부대 관리 및 이동 메뉴"
              title="예하 부대 추가 · 지휘관 임명 · 계보 · 이동 · 삭제"
              items={[
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
                { type: 'divider', id: 'div-nav' },
                ...(countryName && countryIdForLink
                  ? [
                      {
                        id: 'country-tab',
                        label: `${countryName} 편제·사령부 탭 열기`,
                        icon: <FiGlobe size={13} />,
                        onSelect: () =>
                          navigate(pathKeys.countryMilitary(countryIdForLink)),
                      },
                    ]
                  : []),
                {
                  id: 'catalog',
                  label: '군사 총람 전체 보기',
                  icon: <FiShield size={13} />,
                  onSelect: () => navigate(pathKeys.military()),
                },
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
          </TopBarRight>
        ) : null}
      </TopBar>

      <MilitaryUnitDetailContent
        ref={detailActionsRef}
        unitId={unitId}
        variant="page"
        onUnitLoaded={setLoadedUnit}
        onAncestorsResolved={setAncestorUnits}
        onSelectUnit={handleSelectUnit}
        onEditUnit={handleEditUnit}
        onCreateSubUnit={handleCreateSubUnit}
        onDeleted={handleDeleted}
      />

      <MilitaryUnitFormModal
        isOpen={unitFormOpen}
        onClose={() => {
          setUnitFormOpen(false)
          setUnitFormEditingId(null)
          setUnitFormDefaults({})
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({
            queryKey: militaryUnitQueryKeys.detail(unitId),
          })
          void queryClient.invalidateQueries({
            queryKey: militaryUnitQueryKeys.all,
          })
          void queryClient.invalidateQueries({
            queryKey: ['administration-departments'],
          })
        }}
        editingUnitId={unitFormEditingId}
        defaultCountryId={unitFormDefaults.countryId ?? null}
        defaultHistoricalCountryId={
          unitFormDefaults.historicalCountryId ?? null
        }
        defaultParentUnitId={unitFormDefaults.parentUnitId ?? null}
        defaultAdministrationDepartmentId={
          unitFormDefaults.administrationDepartmentId ?? null
        }
        defaultBranch={unitFormDefaults.branch ?? null}
      />
    </PageCanvas>
  )
}

const PageCanvas = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-height: 100%;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  padding: 28px clamp(22px, 3vw, 48px) 96px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 18px 16px 80px;
  }
`

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const TopBarLeft = styled.nav`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const BackCrumbBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px 0 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const CrumbSep = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.55;
  user-select: none;
`

const ParentCrumbBtn = styled.button`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const TopBarRight = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`
