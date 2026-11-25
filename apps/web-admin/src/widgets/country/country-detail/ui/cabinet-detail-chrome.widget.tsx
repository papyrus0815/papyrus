/**
 * 행정부 상세 — 상단 툴바(뒤로·브레드크럼·전후임/개각 탐색·다국 묶음·각료 편집)
 */
import React from 'react'

import {
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiGlobe,
  FiLayers,
  FiLink2,
  FiPrinter,
  FiTrash2,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
} from '@/entities/event/ui/ledger-tokens'
import { GovMorePopover } from '@/features/government-info/ui/gov-more-popover'
import { parseSignedDateParts } from '@/shared/lib/tenure-person-utils'
import { pathKeys } from '@/shared/router'

import {
  formatCabinetHeadBreadcrumbLabel,
  getPersonName,
} from './cabinets-section.helpers'
import * as CabS from './cabinets-section.styled'
import {
  DetailHeaderIconBtn,
  DetailToolbar,
} from './country-politics-tab.styles'

export type CabinetNavTarget = {
  id: string
  label: string
  period?: string | null
}

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
  handleDeleteCabinet: (cabinetId: string, e: React.MouseEvent) => void
  /** 각료 수정(1스텝 임명 모달) */
  onEditMinister?: (minister: unknown) => void
  /** 행정부 메타·수반 재임 수정 모달 (상단 툴바) */
  onEditCabinet?: () => void
  /** 다국 행정부 묶기 모달 열기 */
  onOpenLinkageModal?: () => void
  linkedPeerCount?: number
  /** 전임·후임 내각 빠른 이동 */
  prevCabinet?: CabinetNavTarget | null
  nextCabinet?: CabinetNavTarget | null
  cabinetPositionBadge?: string | null
  /** 동일 수반 산하 개각 내각 목록(2건 이상일 때 탭 표시) */
  siblingCabinets?: CabinetNavTarget[]
  onNavigateCabinet?: (cabinetId: string) => void
  /** 현재 화면(행정부 상세·재임 기록) 인쇄 */
  onPrint?: () => void
  /** 목록으로 돌아갈 때 URL 쿼리 정리 등 추가 동기화 */
  onBackToList?: () => void
  /** 취임 연도 기준 전 국가 동시대 내각 비교 허브로 이동 */
  onCompareContemporary?: (signedYear: number) => void
  /**
   * 수반 머리 카드가 보이는 동안 true — 머리 카드가 내각 이름을 보이고 전임·후임 이동도 머리 오른쪽에 두므로
   * 여기서는 경로 아래 내각 이름 줄과 전임·후임 막대를 그리지 않는다(같은 말 세 번 · 이동 막대가 머리보다 먼저).
   * 동일 임기 개각 탭은 그대로 둔다.
   */
  heroCarriesIdentity?: boolean
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
  handleDeleteCabinet,
  onEditMinister,
  onEditCabinet,
  onOpenLinkageModal,
  linkedPeerCount = 0,
  prevCabinet = null,
  nextCabinet = null,
  cabinetPositionBadge = null,
  siblingCabinets = [],
  onNavigateCabinet,
  onPrint,
  onBackToList,
  onCompareContemporary,
  heroCarriesIdentity = false,
}: CabinetDetailChromeProps) {
  const navigate = useNavigate()
  const cabinetSubtitle =
    selectedCabinet &&
    typeof selectedCabinet.name === 'string' &&
    selectedCabinet.name.trim()
      ? selectedCabinet.name.trim()
      : null

  const startDateParts = parseSignedDateParts(
    selectedCabinet?.startDate ?? selectedCabinet?.headTenure?.startDate,
  )
  const contemporarySignedYear = startDateParts?.signedYear ?? null
  const contemporaryYearLabel = startDateParts
    ? startDateParts.era === 'BC'
      ? `기원전 ${startDateParts.absYear}`
      : String(startDateParts.absYear)
    : null

  const isTenureHistoryArticleDetail =
    !!selectedHeadHistoryId || (!!selectedMinisterId && !!selectedHistoryId)
  const showCabinetContinuityStrip =
    Boolean(selectedCabinet) &&
    !selectedMinisterId &&
    !isTenureHistoryArticleDetail &&
    Boolean(onNavigateCabinet) &&
    ((!heroCarriesIdentity && (Boolean(prevCabinet) || Boolean(nextCabinet))) ||
      siblingCabinets.length > 1)

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
                if (selectedMinisterId) {
                  setSelectedMinisterId(null)
                  setSelectedHistoryId(null)
                  setSelectedHeadHistoryId(null)
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
              {isTenureHistoryArticleDetail
                ? '재임 기록 목록'
                : selectedMinisterId
                  ? '내각 상세로'
                  : '행정부 목록'}
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
          {!selectedMinisterId && !heroCarriesIdentity && cabinetSubtitle ? (
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
            onEditMinister &&
            (() => {
              const minister = (
                sortedVisibleMinisters as { id: string }[]
              ).find((row) => row.id === selectedMinisterId)
              if (!minister) return null
              return (
                <DetailHeaderIconBtn
                  type="button"
                  aria-label="각료 수정"
                  title="각료 수정"
                  onClick={() => onEditMinister(minister)}
                >
                  <FiEdit2 size={15} strokeWidth={2} />
                </DetailHeaderIconBtn>
              )
            })()}
          {!selectedMinisterId &&
          selectedCabinet &&
          onEditCabinet &&
          !selectedHeadHistoryId ? (
            <EditCabinetPillBtn
              type="button"
              aria-label="행정부 수정"
              title="행정부 정보 수정"
              onClick={() => onEditCabinet()}
            >
              <FiEdit2 size={13} strokeWidth={2} />
              <span>수정</span>
            </EditCabinetPillBtn>
          ) : null}
          {selectedCabinet ? (
            <GovMorePopover
              triggerSize="sm"
              ariaLabel="행정부 상세 더보기 메뉴"
              title="비교 · 묶기 · 인쇄 · 삭제"
              hasActiveIndicator={linkedPeerCount > 0}
              actions={[
                ...(!selectedMinisterId &&
                !selectedHeadHistoryId &&
                onOpenLinkageModal
                  ? [
                      {
                        key: 'linkage',
                        label: '다국 행정부 묶기',
                        icon: <FiLink2 size={13.5} />,
                        badge:
                          linkedPeerCount > 0
                            ? String(linkedPeerCount)
                            : undefined,
                        onClick: () => onOpenLinkageModal(),
                      },
                    ]
                  : []),
                ...(!selectedMinisterId &&
                !selectedHeadHistoryId &&
                contemporarySignedYear != null &&
                onCompareContemporary
                  ? [
                      {
                        key: 'compare-contemporary',
                        label: `동시대 타국 비교 (${contemporaryYearLabel}년)`,
                        icon: <FiGlobe size={13.5} />,
                        onClick: () =>
                          onCompareContemporary(contemporarySignedYear),
                      },
                    ]
                  : []),
                ...(!selectedMinisterId &&
                !selectedHeadHistoryId &&
                selectedCabinet.id
                  ? [
                      {
                        key: 'standalone-detail',
                        label: '전용 상세 지면 열기 ↗',
                        icon: <FiArrowUpRight size={13.5} />,
                        onClick: () =>
                          navigate(
                            pathKeys.government.cabinetDetail(
                              String(selectedCabinet.id),
                            ),
                          ),
                      },
                    ]
                  : []),
                ...(onPrint
                  ? [
                      {
                        key: 'print',
                        label: '화면 인쇄',
                        icon: <FiPrinter size={13.5} />,
                        onClick: () => onPrint(),
                      },
                    ]
                  : []),
                ...(!selectedMinisterId && !selectedHeadHistoryId
                  ? [
                      {
                        key: 'delete-cabinet',
                        label: '행정부 삭제',
                        icon: <FiTrash2 size={13.5} />,
                        danger: true,
                        onClick: (
                          mouseEvent: React.MouseEvent<HTMLButtonElement>,
                        ) => handleDeleteCabinet(selectedCabinet.id, mouseEvent),
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}
        </DetailToolbar>
      </CabS.CabDetailTopBar>

      {showCabinetContinuityStrip && onNavigateCabinet ? (
        <ContinuityStripWrap aria-label="전임·후임 행정부 및 개각 연속 이동">
          {heroCarriesIdentity ? null : (
          <ContinuityNavRow>
            <ContinuityNavBtn
              type="button"
              disabled={!prevCabinet}
              onClick={() => prevCabinet && onNavigateCabinet(prevCabinet.id)}
              title={
                prevCabinet
                  ? `전임 내각: ${prevCabinet.label}`
                  : '기록된 전임 내각이 없습니다'
              }
            >
              <FiChevronLeft size={14} />
              <ContinuityNavTextGroup>
                <ContinuityNavCaption>전임 내각</ContinuityNavCaption>
                <ContinuityNavTitle>
                  {prevCabinet ? prevCabinet.label : '이전 내각 없음'}
                </ContinuityNavTitle>
              </ContinuityNavTextGroup>
            </ContinuityNavBtn>

            {cabinetPositionBadge ? (
              <ContinuityIndexPill>{cabinetPositionBadge}</ContinuityIndexPill>
            ) : null}

            <ContinuityNavBtn
              type="button"
              $alignRight
              disabled={!nextCabinet}
              onClick={() => nextCabinet && onNavigateCabinet(nextCabinet.id)}
              title={
                nextCabinet
                  ? `후임 내각: ${nextCabinet.label}`
                  : '기록된 후임 내각이 없습니다'
              }
            >
              <ContinuityNavTextGroup $alignRight>
                <ContinuityNavCaption>후임 내각</ContinuityNavCaption>
                <ContinuityNavTitle>
                  {nextCabinet ? nextCabinet.label : '후속 내각 없음'}
                </ContinuityNavTitle>
              </ContinuityNavTextGroup>
              <FiChevronRight size={14} />
            </ContinuityNavBtn>
          </ContinuityNavRow>
          )}

          {siblingCabinets.length > 1 ? (
            <ReshuffleSiblingBar role="tablist" aria-label="동일 수반 개각 내각 전환">
              <ReshuffleLabel>
                <FiLayers size={12} />
                <span>동일 임기 개각</span>
              </ReshuffleLabel>
              <ReshufflePills>
                {siblingCabinets.map((sib) => {
                  const isCurrent = sib.id === selectedCabinet?.id
                  return (
                    <ReshufflePillBtn
                      key={sib.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      $active={isCurrent}
                      onClick={() => {
                        if (!isCurrent) onNavigateCabinet(sib.id)
                      }}
                    >
                      <span>{sib.label}</span>
                      {sib.period ? (
                        <ReshufflePillPeriod>{sib.period}</ReshufflePillPeriod>
                      ) : null}
                    </ReshufflePillBtn>
                  )
                })}
              </ReshufflePills>
            </ReshuffleSiblingBar>
          ) : null}
        </ContinuityStripWrap>
      ) : null}
    </>
  )
}

const EditCabinetPillBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#f8fafc'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ContinuityStripWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc'};
`

const ContinuityNavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const ContinuityNavBtn = styled.button<{ $alignRight?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 42%;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: ${({ $alignRight }) => ($alignRight ? 'right' : 'left')};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  &:disabled {
    opacity: 0.42;
    cursor: default;
  }

  @media (max-width: 640px) {
    max-width: 46%;
  }
`

const ContinuityNavTextGroup = styled.span<{ $alignRight?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $alignRight }) => ($alignRight ? 'flex-end' : 'flex-start')};
  min-width: 0;
`

const ContinuityNavCaption = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ContinuityNavTitle = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ContinuityIndexPill = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ReshuffleSiblingBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 7px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ReshuffleLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ReshufflePills = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const ReshufflePillBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? ledgerAccentBorder(theme.mode) : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`

const ReshufflePillPeriod = styled.span`
  font-size: 10.5px;
  opacity: 0.78;
`
