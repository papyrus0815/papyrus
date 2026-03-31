/**
 * 행정부 상세 — 상단 툴바(뒤로·브레드크럼·각료 편집)
 */
import React from 'react'

import { FiChevronLeft, FiEdit2, FiTrash2 } from 'react-icons/fi'

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
  setAddMinisterCabinet: (cab: unknown) => void
  setPersonSelectOpen: (open: boolean) => void
  handleDeleteCabinet: (cabinetId: string, e: React.MouseEvent) => void
  /** 행정부 메타·수반 재임 수정 모달 (상단 툴바) */
  onEditCabinet?: () => void
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
  setAddMinisterCabinet,
  setPersonSelectOpen,
  handleDeleteCabinet,
  onEditCabinet,
}: CabinetDetailChromeProps) {
  const cabinetSubtitle =
    selectedCabinet &&
    typeof selectedCabinet.name === 'string' &&
    selectedCabinet.name.trim()
      ? selectedCabinet.name.trim()
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
                    )}
                  </CabS.CabDetailBackBtn>
                ) : (
                  <CabS.CabDetailCrumbText>
                    {formatCabinetHeadBreadcrumbLabel(
                      selectedCabinet.headTenure,
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
          {selectedMinisterId &&
            !selectedHistoryId &&
            (() => {
              const minister = (
                sortedVisibleMinisters as {
                  id: string
                  title?: string | null
                  startDate?: string | null
                  endDate?: string | null
                  termNumber?: number | null
                  administrationDepartmentId?: string | null
                  positionDefinition?: { id?: string | null } | null
                }[]
              ).find((row) => row.id === selectedMinisterId) as
                | {
                    id: string
                    title?: string | null
                    startDate?: string | null
                    endDate?: string | null
                    termNumber?: number | null
                    administrationDepartmentId?: string | null
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
                    setMinisterFormPositionDefId(
                      minister.positionDefinition?.id ?? null,
                    )
                    setMinisterFormTitle(minister.title ?? '')
                    setMinisterFormStartDate(
                      minister.startDate ? minister.startDate.slice(0, 10) : '',
                    )
                    setMinisterFormEndDate(
                      minister.endDate ? minister.endDate.slice(0, 10) : '',
                    )
                    setMinisterFormTermNumber(
                      minister.termNumber != null
                        ? String(minister.termNumber)
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
              onClick={(e) => handleDeleteCabinet(selectedCabinet.id, e)}
            >
              <FiTrash2 size={17} strokeWidth={2} />
            </DetailHeaderIconBtn>
          )}
        </DetailToolbar>
      </CabS.CabDetailTopBar>
    </>
  )
}
