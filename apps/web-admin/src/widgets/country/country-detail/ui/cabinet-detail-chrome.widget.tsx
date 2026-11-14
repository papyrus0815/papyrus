/**
 * 행정부 상세 — 상단 툴바(뒤로·브레드크럼·각료 편집)
 */
import React from 'react'

import {
  FiChevronLeft,
  FiEdit2,
  FiGlobe,
  FiPrinter,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'

import {
  formatCabinetHeadBreadcrumbLabel,
  getPersonName,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'
import {
  DetailHeaderIconBtn,
  DetailToolbar,
} from './country-politics-tab.styles'

export type CabinetDetailChromeProps = {
  cabDetailBackBtnRef: React.RefObject<HTMLButtonElement | null>
  /** 선택된 행정부 — 편집 모달 등에 그대로 전달 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedCabinet: any
  selectedMinisterId: string | null
  /** 재임 기록 상세(수반) */
  selectedHeadHistoryId: string | null
  /** 재임 기록 상세(각료) */
  selectedHistoryId: string | null
  sortedVisibleMinisters: unknown[]
  setCabinetView: (view: 'list' | 'detail') => void
  setSelectedCabinetId: (id: string | null) => void
  setSelectedMinisterId: (id: string | null) => void
  setSelectedHeadHistoryId: (id: string | null) => void
  setSelectedHistoryId: (id: string | null) => void
  setEditingHistoryContent: (editing: boolean) => void
  setEditingHistoryMeta: (editing: boolean) => void
  setMinisterFormPositionDefId: (id: string | null) => void
  setMinisterFormTitle: (title: string) => void
  setMinisterFormStartDate: (startDate: string) => void
  setMinisterFormEndDate: (endDate: string) => void
  setMinisterFormTermNumber: (termNumber: string) => void
  setMinisterFormDeptId: (id: string | null) => void
  setSelectedPersonIdForAdd: (id: string | null) => void
  setAddMinisterCabinet: (cab: unknown) => void
  setPersonSelectOpen: (open: boolean) => void
  handleDeleteCabinet: (cabinetId: string, e: React.MouseEvent) => void
  /** 각료 수정(1스텝 임명 모달) */
  onEditMinister?: (minister: unknown) => void
  /** 행정부 메타·수반 재임 수정 모달 (상단 툴바) */
  onEditCabinet?: () => void
  /** 현재 화면(행정부 상세·재임 기록) 인쇄 */
  onPrint?: () => void
  /** 목록으로 돌아갈 때 URL 쿼리 정리 등 추가 동기화 */
  onBackToList?: () => void
  /** 취임 연도 기준 전 국가 동시대 내각 비교 허브로 이동 */
  onCompareContemporary?: (signedYear: number) => void
}

export function CabinetDetailChrome({
  cabDetailBackBtnRef,
  selectedCabinet,
  selectedMinisterId,
  selectedHeadHistoryId,
  selectedHistoryId,
  sortedVisibleMinisters,
  setCabinetView,
  setSelectedCabinetId,
  setSelectedMinisterId,
  setSelectedHeadHistoryId,
  setSelectedHistoryId,
  setEditingHistoryContent,
  setEditingHistoryMeta,
  setMinisterFormPositionDefId,
  setMinisterFormTitle,
  setMinisterFormStartDate,
  setMinisterFormEndDate,
  setMinisterFormTermNumber,
  setMinisterFormDeptId,
  setSelectedPersonIdForAdd,
  setAddMinisterCabinet,
  setPersonSelectOpen,
  handleDeleteCabinet,
  onEditMinister,
  onEditCabinet,
  onPrint,
  onBackToList,
  onCompareContemporary,
}: CabinetDetailChromeProps) {
  const cabinetSubtitle =
    selectedCabinet &&
    typeof selectedCabinet.name === 'string' &&
    selectedCabinet.name.trim()
      ? selectedCabinet.name.trim()
      : null

  const startDateParts = parseSignedDateParts(
    selectedCabinet?.headTenure?.startDate ?? selectedCabinet?.startDate,
  )
  const contemporarySignedYear = startDateParts?.signedYear ?? null
  const contemporaryYearLabel = startDateParts
    ? startDateParts.era === 'BC'
      ? `기원전 ${startDateParts.absYear}`
      : String(startDateParts.absYear)
    : null

  const isTenureHistoryArticleDetail =
    !!selectedHeadHistoryId || (!!selectedMinisterId && !!selectedHistoryId)

  return (
    <>
      <CabS.CabDetailTopBar>
        <CabS.CabDetailTopBarMain>
          <CabS.CabDetailTopBarRow>
            <CabS.CabDetailBackBtn
              ref={cabDetailBackBtnRef}
              type="button"
              onClick={() => {
                if (isTenureHistoryArticleDetail) {
                  setSelectedHeadHistoryId(null)
                  setSelectedHistoryId(null)
                  setEditingHistoryContent(false)
                  setEditingHistoryMeta(false)
                  return
                }
                setCabinetView('list')
                setSelectedCabinetId(null)
                setSelectedMinisterId(null)
                setSelectedHeadHistoryId(null)
                onBackToList?.()
              }}
            >
              <FiChevronLeft size={14} />
              {isTenureHistoryArticleDetail ? '재임 기록 목록' : '행정부 목록'}
            </CabS.CabDetailBackBtn>
            {selectedCabinet && (
              <>
                <CabS.CabBreadcrumbSep>/</CabS.CabBreadcrumbSep>
                {selectedMinisterId ? (
                  <CabS.CabDetailBackBtn
                    type="button"
                    onClick={() => {
                      setSelectedMinisterId(null)
                      setSelectedHistoryId(null)
                      setSelectedHeadHistoryId(null)
                      setEditingHistoryContent(false)
                      setEditingHistoryMeta(false)
                    }}
                  >
                    {formatCabinetHeadBreadcrumbLabel(
                      selectedCabinet.headTenure,
                      selectedCabinet.name,
                    )}
                  </CabS.CabDetailBackBtn>
                ) : (
                  <CabS.CabDetailCrumbText>
                    {formatCabinetHeadBreadcrumbLabel(
                      selectedCabinet.headTenure,
                      selectedCabinet.name,
                    )}
                  </CabS.CabDetailCrumbText>
                )}
              </>
            )}
            {selectedMinisterId &&
              (() => {
                const ministerRow = (
                  sortedVisibleMinisters as { id: string; person?: unknown }[]
                ).find((row) => row.id === selectedMinisterId)
                const ministerName = ministerRow?.person
                  ? getPersonName(ministerRow.person as never)
                  : null
                if (!ministerName) return null
                return (
                  <>
                    <CabS.CabBreadcrumbSep>/</CabS.CabBreadcrumbSep>
                    <CabS.CabDetailCrumbText
                      title={ministerName}
                      aria-current="page"
                    >
                      {ministerName}
                    </CabS.CabDetailCrumbText>
                  </>
                )
              })()}
          </CabS.CabDetailTopBarRow>
          {!selectedMinisterId && cabinetSubtitle ? (
            <CabS.CabDetailTopBarSubtitle title={cabinetSubtitle}>
              {cabinetSubtitle}
            </CabS.CabDetailTopBarSubtitle>
          ) : null}
        </CabS.CabDetailTopBarMain>
        <DetailToolbar
          role="group"
          aria-label="행정부·각료 작업"
          style={{ flexShrink: 0, alignSelf: 'flex-start', paddingTop: 2 }}
        >
          {selectedCabinet &&
          !selectedMinisterId &&
          !selectedHeadHistoryId &&
          contemporarySignedYear != null &&
          onCompareContemporary ? (
            <ContemporaryCompareBtn
              type="button"
              onClick={() => onCompareContemporary(contemporarySignedYear)}
              title={`${contemporaryYearLabel}년 시점 전 세계 행정부·내각 비교 허브로 이동`}
            >
              <FiGlobe size={13} />
              <span>동시대 타국 비교 ({contemporaryYearLabel}년)</span>
            </ContemporaryCompareBtn>
          ) : null}
          {selectedCabinet && onPrint ? (
            <DetailHeaderIconBtn
              type="button"
              aria-label="인쇄"
              title="인쇄"
              onClick={() => onPrint()}
            >
              <FiPrinter size={17} strokeWidth={2} />
            </DetailHeaderIconBtn>
          ) : null}
          {selectedMinisterId &&
            !selectedHistoryId &&
            (() => {
              const minister = (
                sortedVisibleMinisters as {
                  id: string
                  personId?: string | null
                  person?: { id?: string | null } | null
                  title?: string | null
                  startDate?: string | null
                  endDate?: string | null
                  ordinal?: number | null
                  administrationDepartmentId?: string | null
                  positionDefinitionId?: string | null
                  positionDefinition?: { id?: string | null } | null
                }[]
              ).find((row) => row.id === selectedMinisterId) as
                | {
                    id: string
                    personId?: string | null
                    person?: { id?: string | null } | null
                    title?: string | null
                    startDate?: string | null
                    endDate?: string | null
                    ordinal?: number | null
                    administrationDepartmentId?: string | null
                    positionDefinitionId?: string | null
                    positionDefinition?: { id?: string | null } | null
                  }
                | undefined
              if (!minister) return null
              return (
                <DetailHeaderIconBtn
                  type="button"
                  aria-label="각료 수정"
                  title="각료 수정"
                  onClick={() => {
                    if (onEditMinister) {
                      onEditMinister(minister)
                      return
                    }
                    const defId =
                      minister.positionDefinition?.id ??
                      minister.positionDefinitionId ??
                      null
                    setSelectedPersonIdForAdd(
                      minister.personId ?? minister.person?.id ?? null,
                    )
                    setMinisterFormPositionDefId(
                      defId ?? (minister.title ? '__OTHER__' : null),
                    )
                    setMinisterFormTitle(defId ? '' : (minister.title ?? ''))
                    setMinisterFormStartDate(
                      minister.startDate ? minister.startDate.slice(0, 10) : '',
                    )
                    setMinisterFormEndDate(
                      minister.endDate ? minister.endDate.slice(0, 10) : '',
                    )
                    setMinisterFormTermNumber(
                      minister.ordinal != null
                        ? String(minister.ordinal)
                        : '',
                    )
                    setMinisterFormDeptId(
                      minister.administrationDepartmentId ?? null,
                    )
                    setAddMinisterCabinet({
                      ...selectedCabinet,
                      _editingTenureId: minister.id,
                    })
                    setPersonSelectOpen(true)
                  }}
                >
                  <FiEdit2 size={17} strokeWidth={2} />
                </DetailHeaderIconBtn>
              )
            })()}
          {!selectedMinisterId &&
          selectedCabinet &&
          onEditCabinet &&
          !selectedHeadHistoryId ? (
            <DetailHeaderIconBtn
              type="button"
              aria-label="행정부 수정"
              title="행정부 수정"
              onClick={() => onEditCabinet()}
            >
              <FiEdit2 size={17} strokeWidth={2} />
            </DetailHeaderIconBtn>
          ) : null}
          {!selectedMinisterId && selectedCabinet && !selectedHeadHistoryId && (
            <DetailHeaderIconBtn
              type="button"
              $variant="danger"
              aria-label="행정부 삭제"
              title="행정부 삭제"
              onClick={(clickEvent) =>
                handleDeleteCabinet(selectedCabinet.id, clickEvent)
              }
            >
              <FiTrash2 size={17} strokeWidth={2} />
            </DetailHeaderIconBtn>
          )}
        </DetailToolbar>
      </CabS.CabDetailTopBar>
    </>
  )
}

const ContemporaryCompareBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    opacity: 0.88;
  }
`
