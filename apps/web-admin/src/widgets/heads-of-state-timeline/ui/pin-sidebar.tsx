import { useEffect, useMemo, useRef, useState } from 'react'

import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiLayers,
  FiLink,
  FiMove,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUserPlus,
  FiX,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import type { PinnedRow, PinnedSegment } from '../model/types'
import { sortSegmentsChronologically } from '../lib/sort-segments'
import { copyShareUrl } from '../model/use-url-sync'
import { useRowsLineage } from '../api/use-rows-lineage'
import { CountrySearchModal } from './country-search-modal'

interface Props {
  rows: PinnedRow[]
  onAddRow: (segment: Omit<PinnedSegment, 'segmentId'>) => void
  onAddManyRows: (segments: Omit<PinnedSegment, 'segmentId'>[]) => void
  onRemoveRow: (rowId: string) => void
  onMoveRow: (rowId: string, direction: 'up' | 'down') => void
  onReorderRow: (fromIndex: number, toIndex: number) => void
  onAddSegmentToRow: (
    rowId: string,
    segment: Omit<PinnedSegment, 'segmentId'>,
  ) => void
  onRemoveSegmentFromRow: (rowId: string, segmentId: string) => void
  onClearAll: () => void
  /** 이 행의 국가에 수반(재임)을 바로 등록 — 인물 선택 → 등록 패널 흐름을 부모가 연다 */
  onRegisterHead: (segment: PinnedSegment) => void
}

const EMPTY_HINT = '오른쪽 빈 화면의 추천 조합으로 시작하거나, 직접 추가할 수 있습니다.'

export function PinSidebar({
  rows,
  onAddRow,
  onAddManyRows,
  onRemoveRow,
  onMoveRow,
  onReorderRow,
  onAddSegmentToRow,
  onRemoveSegmentFromRow,
  onClearAll,
  onRegisterHead,
}: Props) {
  const [addRowModalOpen, setAddRowModalOpen] = useState(false)
  const [addSegmentRowId, setAddSegmentRowId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 900
  })
  const [userToggled, setUserToggled] = useState(false)
  const [query, setQuery] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLElement | null>(null)
  const { expandableForRow, collapsibleSegmentIdsForRow } = useRowsLineage(rows)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      if (userToggled) return
      setCollapsed(window.innerWidth < 900)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [userToggled])

  // 핀이 0이 됐다가 다시 추가될 때 query를 자동 클리어 — 검색 결과 빈 화면이 잠깐 보이는 것 방지
  const prevRowsLen = useRef(rows.length)
  useEffect(() => {
    if (prevRowsLen.current === 0 && rows.length > 0) setQuery('')
    prevRowsLen.current = rows.length
  }, [rows.length])

  const handleCopyUrl = async () => {
    const result = await copyShareUrl()
    if (result.ok) notify.success(result.message)
    else notify.error(result.message)
  }
  const handleClearAll = async () => {
    if (rows.length === 0) return
    const ok = await confirm({
      title: '삭제 확인',
      message: '핀한 모든 행을 비울까요?',
      danger: true,
    })
    if (!ok) return
    onClearAll()
  }

  const allPinnedOptionIds = useMemo(
    () =>
      rows.flatMap((r) =>
        r.segments.map((s) => `${s.kind === 'COUNTRY' ? 'C' : 'H'}:${s.countryId}`),
      ),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      row.segments.some((s) => s.name.toLowerCase().includes(q)),
    )
  }, [rows, query])

  if (collapsed) {
    return (
      <CollapsedWrap>
        <CollapsedToggle
          type="button"
          onClick={() => {
            setUserToggled(true)
            setCollapsed(false)
          }}
          aria-label="사이드바 펼치기"
          title="사이드바 펼치기"
        >
          <FiChevronRight size={16} />
        </CollapsedToggle>
        <CollapsedAdd
          type="button"
          onClick={() => setAddRowModalOpen(true)}
          aria-label="새 행 추가"
          title="새 행 추가"
        >
          <FiPlus size={14} />
        </CollapsedAdd>
        <CollapsedCount>{rows.length}행</CollapsedCount>
        <CountrySearchModal
          isOpen={addRowModalOpen}
          onClose={() => setAddRowModalOpen(false)}
          onPickMany={(segments) => onAddManyRows(segments)}
          title="새 행 — 비교할 국가 추가"
          alreadyPinnedOptionIds={allPinnedOptionIds}
        />
      </CollapsedWrap>
    )
  }

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDraggingId(id)
  }
  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    if (draggingId == null || draggingId === id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTargetId !== id) setDropTargetId(id)

    // 드래그 중 viewport 끝 가까이 있으면 자동 스크롤 — 행 많을 때 운영 편의
    const wrap = wrapperRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const EDGE = 36
    if (e.clientY - rect.top < EDGE) {
      wrap.scrollBy({ top: -10, behavior: 'auto' })
    } else if (rect.bottom - e.clientY < EDGE) {
      wrap.scrollBy({ top: 10, behavior: 'auto' })
    }
  }
  const handleDragLeave = () => {
    setDropTargetId(null)
  }
  const handleDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const fromId = draggingId
    setDraggingId(null)
    setDropTargetId(null)
    if (!fromId || fromId === id) return
    const fromIdx = rows.findIndex((r) => r.rowId === fromId)
    const toIdx = rows.findIndex((r) => r.rowId === id)
    if (fromIdx < 0 || toIdx < 0) return
    onReorderRow(fromIdx, toIdx)
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDropTargetId(null)
  }

  return (
    <Wrapper
      ref={wrapperRef as React.RefObject<HTMLElement>}
      data-print-hide
      aria-label="비교 핀 패널"
    >
      <Header>
        <HeaderTitle>비교 대상</HeaderTitle>
        <HeaderRight>
          <HeaderCount>
            {rows.length}행 · {rows.reduce((acc, r) => acc + r.segments.length, 0)}개국
          </HeaderCount>
          {rows.length > 0 && (
            <SmallIconButton
              type="button"
              onClick={() => setAddRowModalOpen(true)}
              aria-label="새 행 추가"
              title="새 행 추가"
            >
              <FiPlus size={14} />
            </SmallIconButton>
          )}
          <CollapseButton
            type="button"
            onClick={() => {
              setUserToggled(true)
              setCollapsed(true)
            }}
            aria-label="사이드바 접기"
            title="사이드바 접기"
          >
            <FiChevronLeft size={14} />
          </CollapseButton>
        </HeaderRight>
      </Header>

      <BulkActions>
        <BulkBtn
          type="button"
          onClick={handleCopyUrl}
          title="현재 비교 상태를 URL로 복사"
        >
          <FiLink size={12} /> 링크 복사
        </BulkBtn>
        <BulkBtn
          type="button"
          $danger
          onClick={handleClearAll}
          disabled={rows.length === 0}
          title="모든 행 제거"
        >
          <FiTrash2 size={12} /> 전체 비우기
        </BulkBtn>
      </BulkActions>

      {rows.length > 3 && (
        <SearchRow>
          <FiSearch size={12} />
          <SearchInput
            type="search"
            placeholder="핀에서 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <ClearSearch
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery('')}
            >
              <FiX size={12} />
            </ClearSearch>
          )}
        </SearchRow>
      )}

      {rows.length === 0 ? (
        <EmptyBox>
          <EmptyHint>{EMPTY_HINT}</EmptyHint>
          <AddBigButton type="button" onClick={() => setAddRowModalOpen(true)}>
            <FiPlus size={14} /> 직접 추가
          </AddBigButton>
        </EmptyBox>
      ) : (
        <List>
          {filteredRows.map((row) => (
            <RowCard
              key={row.rowId}
              draggable
              onDragStart={handleDragStart(row.rowId)}
              onDragOver={handleDragOver(row.rowId)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(row.rowId)}
              onDragEnd={handleDragEnd}
              $dragging={draggingId === row.rowId}
              $dropTarget={dropTargetId === row.rowId && draggingId !== row.rowId}
            >
              <RowHeader>
                <DragHandle
                  type="button"
                  aria-label="드래그하여 순서 변경 — ↑/↓ 키로도 가능"
                  title="드래그 또는 ↑/↓ 키로 순서 변경"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      onMoveRow(row.rowId, 'up')
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      onMoveRow(row.rowId, 'down')
                    }
                  }}
                >
                  <FiMove size={12} />
                </DragHandle>
                <RowSegments>
                  {sortSegmentsChronologically(row.segments).map((seg) => (
                    <SegmentChip key={seg.segmentId} $kind={seg.kind}>
                      {seg.flagEmoji && <span>{seg.flagEmoji}</span>}
                      <SegmentName>{seg.name}</SegmentName>
                      {seg.kind === 'HISTORICAL' && <KindTag>역사</KindTag>}
                      {row.segments.length > 1 && (
                        <ChipRemove
                          type="button"
                          aria-label="구간 제거"
                          onClick={() =>
                            onRemoveSegmentFromRow(row.rowId, seg.segmentId)
                          }
                        >
                          <FiX size={12} />
                        </ChipRemove>
                      )}
                    </SegmentChip>
                  ))}
                </RowSegments>
                <RowActions>
                  <SmallIconButton
                    type="button"
                    aria-label="이 국가에 수반 등록"
                    title="이 국가에 수반(재임) 등록"
                    onClick={() => {
                      const sorted = sortSegmentsChronologically(row.segments)
                      const target =
                        row.segments.find((seg) => seg.kind === 'COUNTRY') ??
                        sorted[sorted.length - 1] ??
                        row.segments[0]
                      if (target) onRegisterHead(target)
                    }}
                  >
                    <FiUserPlus size={14} />
                  </SmallIconButton>
                  <SmallIconButton
                    type="button"
                    aria-label="이 행에 계승국 추가"
                    title="이 행에 계승국 추가"
                    onClick={() => setAddSegmentRowId(row.rowId)}
                  >
                    <FiPlus size={14} />
                  </SmallIconButton>
                  <SmallIconButton
                    type="button"
                    aria-label="행 제거"
                    title="행 제거"
                    onClick={() => onRemoveRow(row.rowId)}
                  >
                    <FiX size={14} />
                  </SmallIconButton>
                </RowActions>
              </RowHeader>
              {(() => {
                const expandable = expandableForRow(row)
                const collapsibleIds = collapsibleSegmentIdsForRow(row)
                if (expandable.length === 0 && collapsibleIds.length === 0)
                  return null
                const names = expandable.map((s) => s.name).join(', ')
                return (
                  <LineageActions>
                    {expandable.length > 0 && (
                      <ExpandLineageButton
                        type="button"
                        title={`역사적 전신 국가 추가: ${names}`}
                        onClick={() => {
                          expandable.forEach((s) =>
                            onAddSegmentToRow(row.rowId, s),
                          )
                          notify.success(
                            `계보 ${expandable.length}개를 이 행에 추가했습니다`,
                          )
                        }}
                      >
                        <FiLayers size={12} /> 계보 펼치기 +{expandable.length}
                      </ExpandLineageButton>
                    )}
                    {collapsibleIds.length > 0 && (
                      <CollapseLineageButton
                        type="button"
                        title="펼친 역사 계보를 이 행에서 제거 (모던 국가는 유지)"
                        onClick={() => {
                          collapsibleIds.forEach((sid) =>
                            onRemoveSegmentFromRow(row.rowId, sid),
                          )
                          notify.info(
                            `계보 ${collapsibleIds.length}개를 닫았습니다`,
                          )
                        }}
                      >
                        <FiChevronsLeft size={12} /> 계보 닫기
                      </CollapseLineageButton>
                    )}
                  </LineageActions>
                )
              })()}
            </RowCard>
          ))}
          {filteredRows.length === 0 && rows.length > 0 && (
            <NoResult>「{query}」 검색 결과 없음</NoResult>
          )}
          <AddRowButton type="button" onClick={() => setAddRowModalOpen(true)}>
            <FiPlus size={14} /> 새 행 추가
          </AddRowButton>
        </List>
      )}

      <CountrySearchModal
        isOpen={addRowModalOpen}
        onClose={() => setAddRowModalOpen(false)}
        onPickMany={(segments) => onAddManyRows(segments)}
        title="새 행 — 비교할 국가 추가"
        alreadyPinnedOptionIds={allPinnedOptionIds}
      />
      <CountrySearchModal
        isOpen={addSegmentRowId !== null}
        onClose={() => setAddSegmentRowId(null)}
        onPickMany={(segments) => {
          if (addSegmentRowId)
            segments.forEach((s) => onAddSegmentToRow(addSegmentRowId, s))
        }}
        title="이 행에 계승국 추가"
        alreadyPinnedOptionIds={allPinnedOptionIds}
      />
    </Wrapper>
  )
}

const Wrapper = styled.aside`
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow-y: auto;
`

const Header = styled.div`
  padding: 16px 18px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const BulkActions = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const BulkBtn = styled.button<{ $danger?: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? '#b91c1c' : theme.colors.text.secondary};
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover:not(:disabled) {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239, 68, 68, 0.08)' : 'inherit'};
    border-color: ${({ $danger, theme }) =>
      $danger ? 'rgba(239, 68, 68, 0.4)' : theme.colors.border.medium};
    color: ${({ $danger, theme }) => ($danger ? '#991b1b' : theme.colors.text.primary)};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: 0.02em;
`

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const HeaderCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CollapseButton = styled.button`
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const CollapsedWrap = styled.aside`
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const CollapsedToggle = styled.button`
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const CollapsedAdd = styled(CollapsedToggle)`
  width: 24px;
  height: 24px;
`

const CollapsedCount = styled.span`
  writing-mode: vertical-rl;
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 14px 0;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ClearSearch = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  padding: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const EmptyBox = styled.div`
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const EmptyHint = styled.p`
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const NoResult = styled.div`
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AddBigButton = styled.button`
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const List = styled.div`
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RowCard = styled.div<{ $dragging: boolean; $dropTarget: boolean }>`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  padding: 10px 12px;
  transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s, transform 0.15s;
  cursor: grab;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  ${({ $dragging }) =>
    $dragging &&
    css`
      opacity: 0.4;
      cursor: grabbing;
    `}
  ${({ $dropTarget, theme }) =>
    $dropTarget &&
    css`
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 2px ${theme.colors.activeLight};
      transform: translateY(-1px);
    `}
`

const RowHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const LineageActions = styled.div`
  margin-top: 8px;
  display: flex;
  gap: 6px;
`

const ExpandLineageButton = styled.button`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const CollapseLineageButton = styled(ExpandLineageButton)`
  border-style: solid;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`

const DragHandle = styled.button`
  width: 18px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: grab;
  border-radius: 4px;
  flex-shrink: 0;
  &:active {
    cursor: grabbing;
  }
`

const RowSegments = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
`

const SegmentChip = styled.span<{ $kind: 'COUNTRY' | 'HISTORICAL' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  background: ${({ $kind, theme }) =>
    $kind === 'HISTORICAL'
      ? theme.colors.background.secondary
      : theme.colors.activeLight};
  color: ${({ $kind, theme }) =>
    $kind === 'HISTORICAL' ? theme.colors.text.secondary : theme.colors.primary};
  border: 1px solid
    ${({ $kind, theme }) =>
      $kind === 'HISTORICAL'
        ? theme.colors.border.light
        : 'transparent'};
`

const SegmentName = styled.span`
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const KindTag = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 1px 4px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
  &:hover {
    opacity: 1;
  }
`

const RowActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`

const SmallIconButton = styled.button`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

const AddRowButton = styled.button`
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`
