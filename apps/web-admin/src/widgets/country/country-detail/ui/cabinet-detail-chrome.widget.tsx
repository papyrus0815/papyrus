/**
 * 행정부 상세 — 상단 툴바(뒤로·브레드크럼·각료 편집)·앵커 내비·히스토리 읽기 안내
 */
import React from 'react'

import { FiChevronLeft, FiEdit2, FiTrash2 } from 'react-icons/fi'

import {
  formatCabinetHeadBreadcrumbLabel,
  getPersonName,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'

export type CabinetDetailChromeProps = {
  cabDetailBackBtnRef: React.RefObject<HTMLButtonElement | null>
  /** 선택된 행정부 — 편집 모달 등에 그대로 전달 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedCabinet: any
  selectedMinisterId: string | null
  selectedHeadHistoryId: string | null
  sortedVisibleMinisters: unknown[]
  setCabinetView: (view: 'list' | 'detail') => void
  setSelectedCabinetId: (id: string | null) => void
  setSelectedMinisterId: (id: string | null) => void
  setSelectedHeadHistoryId: (id: string | null) => void
  setSelectedHistoryId: (id: string | null) => void
  setEditingHistoryContent: (editing: boolean) => void
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
  scrollToCabSection: (sectionId: string) => void
}

export function CabinetDetailChrome({
  cabDetailBackBtnRef,
  selectedCabinet,
  selectedMinisterId,
  selectedHeadHistoryId,
  sortedVisibleMinisters,
  setCabinetView,
  setSelectedCabinetId,
  setSelectedMinisterId,
  setSelectedHeadHistoryId,
  setSelectedHistoryId,
  setEditingHistoryContent,
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
  scrollToCabSection,
}: CabinetDetailChromeProps) {
  return (
    <>
      <CabS.CabDetailTopBar>
        <CabS.CabDetailTopBarRow>
          <CabS.CabDetailBackBtn
            ref={cabDetailBackBtnRef}
            type="button"
            onClick={() => {
              setCabinetView('list')
              setSelectedCabinetId(null)
              setSelectedMinisterId(null)
              setSelectedHeadHistoryId(null)
            }}
          >
            <FiChevronLeft size={14} />
            행정부 목록
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
                  }}
                >
                  {formatCabinetHeadBreadcrumbLabel(selectedCabinet.headTenure)}
                </CabS.CabDetailBackBtn>
              ) : (
                <CabS.CabDetailCrumbText>
                  {formatCabinetHeadBreadcrumbLabel(selectedCabinet.headTenure)}
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
        <CabS.CabDetailTopBarActions
          role="group"
          aria-label="행정부·각료 작업"
        >
          {selectedMinisterId &&
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
                <>
                  <CabS.DetailToolbarGhostBtn
                    onClick={() => {
                      setMinisterFormPositionDefId(
                        minister.positionDefinition?.id ?? null,
                      )
                      setMinisterFormTitle(minister.title ?? '')
                      setMinisterFormStartDate(
                        minister.startDate
                          ? minister.startDate.slice(0, 10)
                          : '',
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
                    <FiEdit2 size={14} />
                    각료 수정
                  </CabS.DetailToolbarGhostBtn>
                </>
              )
            })()}
          {!selectedMinisterId && selectedCabinet && onEditCabinet ? (
            <CabS.DetailToolbarGhostBtn onClick={() => onEditCabinet()}>
              <FiEdit2 size={14} />
              행정부 수정
            </CabS.DetailToolbarGhostBtn>
          ) : null}
          {!selectedMinisterId && selectedCabinet && (
            <CabS.CabDetailDeleteBtn
              onClick={(e) => handleDeleteCabinet(selectedCabinet.id, e)}
            >
              <FiTrash2 size={14} />
              삭제
            </CabS.CabDetailDeleteBtn>
          )}
        </CabS.CabDetailTopBarActions>
      </CabS.CabDetailTopBar>
      {!selectedMinisterId && selectedCabinet && (
        <CabS.CabDetailAnchorNav aria-label="아래쪽 본문 구역으로 스크롤 (탭 전환 아님)">
          <CabS.CabDetailAnchorBtn
            title="이 화면 안에서 수반 프로필 위치로 스크롤합니다"
            onClick={() => scrollToCabSection('cab-detail-profile')}
          >
            수반
          </CabS.CabDetailAnchorBtn>
          {!selectedHeadHistoryId && (
            <>
              <CabS.CabDetailAnchorBtn
                title="이 화면 안에서 집권·연정 정당 블록으로 스크롤합니다"
                onClick={() => scrollToCabSection('cab-detail-parties')}
              >
                정당
              </CabS.CabDetailAnchorBtn>
              <CabS.CabDetailAnchorBtn
                title="이 화면 안에서 취임·퇴임 정보 블록으로 스크롤합니다"
                onClick={() => scrollToCabSection('cab-detail-tenure')}
              >
                취임·퇴임
              </CabS.CabDetailAnchorBtn>
              <CabS.CabDetailAnchorBtn
                title="이 화면 안에서 각료 목록으로 스크롤합니다"
                onClick={() => scrollToCabSection('cab-detail-ministers')}
              >
                각료
              </CabS.CabDetailAnchorBtn>
              <CabS.CabDetailAnchorBtn
                title="이 화면 안에서 조약 섹션으로 스크롤합니다"
                onClick={() => scrollToCabSection('cab-detail-treaties')}
              >
                조약
              </CabS.CabDetailAnchorBtn>
            </>
          )}
        </CabS.CabDetailAnchorNav>
      )}
      {!selectedMinisterId && selectedCabinet && selectedHeadHistoryId && (
        <CabS.CabDetailHistoryHint>
          히스토리 읽기 중 — 목록으로 돌아가면 취임·퇴임·각료·조약이 다시
          표시됩니다.
        </CabS.CabDetailHistoryHint>
      )}
    </>
  )
}
