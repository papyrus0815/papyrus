/**
 * 사건 검색 + 다중 선택 모달.
 * 핀 검색 모달과 동일한 UX(검색·체크박스·"N개 추가") — getAllEvents로 페이지 단위 fetch.
 */
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { FiCheck, FiSearch, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getAllEvents } from '@/shared/api/events'
import { Z_INDEX } from '@/shared/styles/z-index'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** 이미 추가된 사건 ID — disabled 표시 */
  alreadyAddedIds: string[]
  onAddMany: (ids: string[]) => void
}

interface EventLite {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
  categoryName: string | null
}

export function EventSearchModal({ isOpen, onClose, alreadyAddedIds, onAddMany }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['heads-of-state', 'events-overlay-list'],
    queryFn: () => getAllEvents({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  })

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelected(new Set())
    }
  }, [isOpen])

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

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  const list: EventLite[] = useMemo(() => {
    return (data ?? [])
      .filter((e: any) => !!e?.startDate)
      .map((e: any) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate ?? null,
        endDate: e.endDate ?? null,
        categoryName: e?.category?.name ?? e?.eventCategory?.name ?? null,
      }))
      .sort((a, b) =>
        (a.startDate ?? '').localeCompare(b.startDate ?? ''),
      )
  }, [data])

  const categories = useMemo(() => {
    const set = new Map<string, number>()
    list.forEach((e) => {
      const name = e.categoryName ?? '미분류'
      set.set(name, (set.get(name) ?? 0) + 1)
    })
    return Array.from(set.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [list])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((e) => {
      if (categoryFilter !== 'ALL') {
        const evCat = e.categoryName ?? '미분류'
        if (evCat !== categoryFilter) return false
      }
      if (!q) return true
      return e.title.toLowerCase().includes(q) || (e.startDate ?? '').includes(q)
    })
  }, [list, query, categoryFilter])

  const alreadySet = useMemo(() => new Set(alreadyAddedIds), [alreadyAddedIds])

  const toggle = (id: string) => {
    if (alreadySet.has(id)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    if (selected.size === 0) return
    onAddMany(Array.from(selected))
    onClose()
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
        transition={{ duration: 0.18 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Header>
          <HeaderTitle>사건 오버레이 추가</HeaderTitle>
          <HeaderHint>
            timeline 위에 회색 띠로 표시할 사건을 골라 주세요.
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
            placeholder="사건명·시작일 (예: 1차 세계대전, 1914)"
            autoFocus
          />
        </SearchRow>

        {categories.length > 1 && (
          <FilterRow>
            <FilterChip
              type="button"
              $active={categoryFilter === 'ALL'}
              onClick={() => setCategoryFilter('ALL')}
            >
              전체 ({list.length})
            </FilterChip>
            {categories.slice(0, 8).map((c) => (
              <FilterChip
                key={c.name}
                type="button"
                $active={categoryFilter === c.name}
                onClick={() => setCategoryFilter(c.name)}
              >
                {c.name} ({c.count})
              </FilterChip>
            ))}
          </FilterRow>
        )}

        <ListBody>
          {isLoading ? (
            <Empty>
              <EmptyIcon>⏳</EmptyIcon>
              <EmptyTitle>불러오는 중…</EmptyTitle>
            </Empty>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyIcon>🔍</EmptyIcon>
              <EmptyTitle>{query ? '검색 결과 없음' : '사건이 없습니다'}</EmptyTitle>
            </Empty>
          ) : (
            filtered.map((ev) => {
              const already = alreadySet.has(ev.id)
              const isSel = selected.has(ev.id)
              return (
                <Row
                  key={ev.id}
                  type="button"
                  onClick={() => toggle(ev.id)}
                  $disabled={already}
                  $selected={isSel}
                  disabled={already}
                >
                  <Checkbox $checked={isSel || already} $disabled={already}>
                    {(isSel || already) && <FiCheck size={12} />}
                  </Checkbox>
                  <RowMain>
                    <RowName>
                      <span>{ev.title}</span>
                      {ev.categoryName && <CategoryBadge>{ev.categoryName}</CategoryBadge>}
                    </RowName>
                    <RowMeta>
                      {already
                        ? '이미 추가됨'
                        : `${(ev.startDate ?? '').slice(0, 10)}${
                            ev.endDate ? ` ~ ${ev.endDate.slice(0, 10)}` : ''
                          }`}
                    </RowMeta>
                  </RowMain>
                </Row>
              )
            })
          )}
        </ListBody>

        <Footer>
          <FooterCount>
            {selected.size > 0 ? `${selected.size}개 선택됨` : '사건을 선택하세요'}
          </FooterCount>
          <FooterActions>
            <CancelBtn type="button" onClick={onClose}>
              취소
            </CancelBtn>
            <ConfirmBtn
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
            >
              추가{selected.size > 0 ? ` (${selected.size})` : ''}
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
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 22px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
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

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  margin-left: 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 10px;
  font-weight: 600;
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

const Checkbox = styled.span<{ $checked: boolean; $disabled: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid
    ${({ $checked, $disabled, theme }) =>
      $disabled
        ? theme.colors.border.medium
        : $checked
        ? theme.colors.primary
        : theme.colors.border.medium};
  background: ${({ $checked, $disabled, theme }) =>
    $disabled
      ? theme.colors.border.light
      : $checked
      ? theme.colors.primary
      : 'transparent'};
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
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
