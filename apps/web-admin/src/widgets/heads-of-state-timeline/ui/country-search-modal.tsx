/**
 * 국가 검색·다중 선택 모달.
 *
 * 기존 단일 SelectModal은 클릭 즉시 닫혀 다국 비교용으로는 한 번에 한 명만 핀하기 위해 N번 모달을 열어야 했다.
 * 이 모달은 검색·체크박스 다중 선택·"N개 추가" 푸터로 동작 — 한 번 열기로 여러 국가를 핀할 수 있다.
 */
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { FiCheck, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'

import {
  optionToSegment,
  useCountryOptions,
} from '../model/use-country-options'
import type { PinnedSegment } from '../model/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** 선택한 국가들을 일괄 추가 */
  onPickMany: (segments: Omit<PinnedSegment, 'segmentId'>[]) => void
  /** 모달 제목 — 신규 행 vs 한 행에 segment 추가 케이스 모두 지원 */
  title?: string
  /** 이미 핀한 옵션은 비활성 표시 ('C:<id>' / 'H:<id>') */
  alreadyPinnedOptionIds?: string[]
  /** 모달이 처음 닫힐 때까지의 옵션 fetch 지연 — 닫혀있는 동안엔 fetch 안 함 */
}

export function CountrySearchModal({
  isOpen,
  onClose,
  onPickMany,
  title = '국가 추가',
  alreadyPinnedOptionIds = [],
}: Props) {
  const { options, isLoading } = useCountryOptions(isOpen)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedIds(new Set())
    }
  }, [isOpen])

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [isOpen, onClose])

  const [kindFilter, setKindFilter] = useState<'ALL' | 'COUNTRY' | 'HISTORICAL'>('ALL')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = options.filter((opt) => {
      if (kindFilter !== 'ALL' && opt.kind !== kindFilter) return false
      if (!q) return true
      if (opt.searchKeywords.some((k) => k.includes(q))) return true
      if (opt.description?.toLowerCase().includes(q)) return true
      if (
        opt.lifespanStartYear != null &&
        String(opt.lifespanStartYear).includes(q)
      )
        return true
      return false
    })
    // 이미 핀된 항목은 항상 하단으로 — 새로 추가할 후보를 위로 띄움
    const pinnedSet = new Set(alreadyPinnedOptionIds)
    return matched.slice().sort((a, b) => {
      const ap = pinnedSet.has(a.optionId) ? 1 : 0
      const bp = pinnedSet.has(b.optionId) ? 1 : 0
      if (ap !== bp) return ap - bp
      return 0
    })
  }, [options, query, alreadyPinnedOptionIds, kindFilter])

  /** 그룹 헤더 — 현대/역사 자료 갯수 카운트 */
  const counts = useMemo(() => {
    const c = { COUNTRY: 0, HISTORICAL: 0 }
    options.forEach((o) => {
      c[o.kind]++
    })
    return c
  }, [options])

  /** 필터 결과를 group 별로 분리 — 정렬 안정성 위해 grouping 후 다시 합칠 때 핀 정렬 유지 */
  const groups = useMemo(() => {
    const modern = filtered.filter((o) => o.kind === 'COUNTRY')
    const historical = filtered.filter((o) => o.kind === 'HISTORICAL')
    return { modern, historical }
  }, [filtered])

  const alreadyPinnedSet = useMemo(
    () => new Set(alreadyPinnedOptionIds),
    [alreadyPinnedOptionIds],
  )

  const toggle = (optionId: string) => {
    if (alreadyPinnedSet.has(optionId)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) next.delete(optionId)
      else next.add(optionId)
      return next
    })
  }

  const handleConfirm = () => {
    const picked = options
      .filter((o) => selectedIds.has(o.optionId))
      .map(optionToSegment)
    if (picked.length === 0) return
    onPickMany(picked)
    onClose()
  }

  const renderRow = (opt: typeof options[number]) => {
    const isPinned = alreadyPinnedSet.has(opt.optionId)
    const isSelected = selectedIds.has(opt.optionId)
    return (
      <Row
        key={opt.optionId}
        type="button"
        onClick={() => toggle(opt.optionId)}
        $disabled={isPinned}
        $selected={isSelected}
        aria-pressed={isSelected}
        disabled={isPinned}
      >
        <Checkbox $checked={isSelected} $disabled={isPinned} $hide={isPinned}>
          {isSelected && !isPinned && <FiCheck size={12} />}
        </Checkbox>
        <RowMain>
          <RowName>
            {opt.flagEmoji && <FlagEmoji>{opt.flagEmoji}</FlagEmoji>}
            {opt.kind === 'HISTORICAL' && <KindMark>📜</KindMark>}
            <span>{opt.name}</span>
            {isPinned && <PinnedBadge>PINNED</PinnedBadge>}
          </RowName>
          <RowMeta>{opt.description ?? ''}</RowMeta>
        </RowMain>
      </Row>
    )
  }

  if (!isOpen) return null

  return createPortal(
    <Overlay
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Modal
        as={motion.div}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Header>
          <HeaderTitle>{title}</HeaderTitle>
          <HeaderHint>
            여러 개 한 번에 선택하고, 아래 「추가」를 누르세요.
          </HeaderHint>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </CloseBtn>
        </Header>

        <SearchRow>
          <FiSearch size={16} />
          <SearchInput
            type="search"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="국가명·시대·ISO·영문명 (예: 조선, USA, 1900)"
            autoFocus
          />
        </SearchRow>

        <FilterRow>
          <FilterChip $active={kindFilter === 'ALL'} onClick={() => setKindFilter('ALL')} type="button">
            전체 ({counts.COUNTRY + counts.HISTORICAL})
          </FilterChip>
          <FilterChip $active={kindFilter === 'COUNTRY'} onClick={() => setKindFilter('COUNTRY')} type="button">
            현대 ({counts.COUNTRY})
          </FilterChip>
          <FilterChip $active={kindFilter === 'HISTORICAL'} onClick={() => setKindFilter('HISTORICAL')} type="button">
            역사 ({counts.HISTORICAL})
          </FilterChip>
        </FilterRow>

        <ListBody>
          {isLoading ? (
            <Empty>
              <EmptyIcon>⏳</EmptyIcon>
              <EmptyTitle>불러오는 중…</EmptyTitle>
            </Empty>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyIcon>🔍</EmptyIcon>
              <EmptyTitle>
                {query ? '검색 결과 없음' : '선택 가능한 항목이 없습니다'}
              </EmptyTitle>
              <EmptyDesc>
                {query && `"${query}"에 해당하는 항목이 없습니다`}
              </EmptyDesc>
            </Empty>
          ) : (
            <>
              {groups.modern.length > 0 && (
                <GroupHeader>
                  <span>현대 국가</span>
                  <GroupCount>{groups.modern.length}</GroupCount>
                </GroupHeader>
              )}
              {groups.modern.map((opt) => renderRow(opt))}
              {groups.historical.length > 0 && (
                <GroupHeader>
                  <span>역사적 국가</span>
                  <GroupCount>{groups.historical.length}</GroupCount>
                </GroupHeader>
              )}
              {groups.historical.map((opt) => renderRow(opt))}
            </>
          )}
        </ListBody>

        <Footer>
          <FooterCount>
            {selectedIds.size > 0
              ? `${selectedIds.size}개 선택됨`
              : '국가를 선택하세요'}
          </FooterCount>
          <FooterActions>
            <CancelBtn type="button" onClick={onClose}>
              취소
            </CancelBtn>
            <ConfirmBtn
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
            >
              추가{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </ConfirmBtn>
          </FooterActions>
        </Footer>
      </Modal>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

const Modal = styled.div`
  width: min(560px, calc(100vw - 48px));
  max-height: min(720px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 16px;
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.28);
  z-index: ${Z_INDEX.MODAL_CONTENT};
  overflow: hidden;
`

const Header = styled.div`
  position: relative;
  padding: 18px 22px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderHint = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CloseBtn = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 0 22px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const GroupCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PinnedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  margin-left: 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ListBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px;
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 24px;
  text-align: center;
`

const EmptyIcon = styled.div`
  font-size: 28px;
  opacity: 0.7;
`

const EmptyTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Row = styled.button<{ $disabled: boolean; $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.activeLight : 'transparent'};
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  margin-bottom: 2px;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  &:hover {
    background: ${({ $disabled, $selected, theme }) =>
      $disabled
        ? 'transparent'
        : $selected
        ? theme.colors.activeLight
        : theme.colors.hover};
  }
`

const Checkbox = styled.span<{ $checked: boolean; $disabled: boolean; $hide?: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid
    ${({ $checked, theme }) =>
      $checked ? theme.colors.primary : theme.colors.border.medium};
  background: ${({ $checked, theme }) =>
    $checked ? theme.colors.primary : 'transparent'};
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  visibility: ${({ $hide }) => ($hide ? 'hidden' : 'visible')};
`

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RowName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const FlagEmoji = styled.span`
  font-size: 16px;
  line-height: 1;
`

const KindMark = styled.span`
  font-size: 12px;
  opacity: 0.7;
`

const RowMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const FooterCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FooterActions = styled.div`
  display: flex;
  gap: 8px;
`

const CancelBtn = styled.button`
  padding: 7px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const ConfirmBtn = styled.button`
  padding: 7px 16px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

