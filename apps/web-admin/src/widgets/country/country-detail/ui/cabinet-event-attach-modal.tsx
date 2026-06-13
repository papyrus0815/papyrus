/**
 * 행정부에 사건을 연결하는 공용 모달
 *
 * 두 가지 모드:
 * 1. 기존 사건에서 검색·선택해 연결
 * 2. 새 사건을 만들어 즉시 연결 (제목·기간만 입력)
 *
 * 사용처:
 * - 행정부 상세 "관련 사건" 섹션
 * - 재임 등록 패널 (현재 cabinetId 자동 전달)
 */
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { FiX } from 'react-icons/fi'
import {
  CABINET_EVENT_ROLE_LABELS,
  CabinetEventRole,
  linkCabinetToEvent,
} from '@/shared/api/cabinet-events'
import { createEvent, getAllEvents, EventResponseDto } from '@/shared/api/events'
import { notify } from '@/shared/ui/toast'

const ROLE_OPTIONS: CabinetEventRole[] = ['ORIGIN', 'PARTY', 'MEDIATOR', 'AFFECTED']

const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1100;
`
const Modal = styled.div`
  background: #fff; border-radius: 12px; width: min(560px, 92vw);
  max-height: 86vh; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.25);
`
const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid #e5e7eb;
`
const Title = styled.h4`margin: 0; font-size: 15px; font-weight: 700; color: #111827;`
const CloseBtn = styled.button`background: transparent; border: none; cursor: pointer; color: #6b7280; padding: 4px;`
const Body = styled.div`padding: 14px 18px; overflow-y: auto;`
const Footer = styled.div`
  padding: 12px 18px; border-top: 1px solid #e5e7eb;
  display: flex; justify-content: flex-end; gap: 8px;
`
const Tabs = styled.div`display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid #e5e7eb;`
const Tab = styled.button<{ $active?: boolean }>`
  padding: 8px 14px; background: transparent; border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? '#2563eb' : 'transparent')};
  color: ${(p) => (p.$active ? '#2563eb' : '#6b7280')};
  font-size: 13px; font-weight: 600; cursor: pointer;
`
const Input = styled.input`
  width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 13px; box-sizing: border-box;
`
const ResultList = styled.ul`
  list-style: none; padding: 0; margin: 12px 0 0; max-height: 240px; overflow-y: auto;
  border: 1px solid #e5e7eb; border-radius: 6px;
`
const ResultItem = styled.li<{ $selected?: boolean }>`
  padding: 10px 12px; font-size: 12px; cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  background: ${(p) => (p.$selected ? '#eff6ff' : 'transparent')};
  &:hover { background: #f9fafb; }
`
const Empty = styled.div`
  padding: 24px; text-align: center; color: #9ca3af; font-size: 13px;
  border: 1px dashed #e5e7eb; border-radius: 8px; margin-top: 12px;
`
const FieldLabel = styled.label`
  display: block; font-size: 12px; font-weight: 600; color: #374151;
  margin: 14px 0 6px;
`
const Row = styled.div`display: flex; gap: 8px;`
const Select = styled.select`
  width: 100%; padding: 9px 10px; font-size: 13px;
  border: 1px solid #d1d5db; border-radius: 6px; background: #fff;
`
const PrimaryBtn = styled.button`
  padding: 8px 14px; background: #2563eb; color: #fff; border: none;
  border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
  &:disabled { background: #9ca3af; cursor: not-allowed; }
`
const GhostBtn = styled.button`
  padding: 8px 14px; background: transparent; border: 1px solid #d1d5db;
  border-radius: 6px; color: #374151; font-size: 13px; cursor: pointer;
`

export interface CabinetEventAttachModalProps {
  cabinetId: string
  /** 이미 연결돼 있어 검색 결과에서 제외할 eventId 집합 */
  excludeEventIds?: Set<string>
  onClose: () => void
  onAttached: () => void | Promise<void>
}

type Mode = 'existing' | 'new'

export function CabinetEventAttachModal({
  cabinetId,
  excludeEventIds,
  onClose,
  onAttached,
}: CabinetEventAttachModalProps) {
  const [mode, setMode] = useState<Mode>('existing')
  const [role, setRole] = useState<CabinetEventRole | ''>('PARTY')
  const [submitting, setSubmitting] = useState(false)

  // existing search state
  const [query, setQuery] = useState('')
  const [allEvents, setAllEvents] = useState<EventResponseDto[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // create new state
  const [newTitle, setNewTitle] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllEvents({ offset: 0, limit: 100 })
      .then((res: any) => {
        if (cancelled) return
        const list = Array.isArray(res) ? res : res?.events ?? res?.items ?? []
        setAllEvents(list)
      })
      .catch((e) => console.error('[CabinetEventAttachModal] load failed', e))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const exclude = excludeEventIds ?? new Set<string>()
    return allEvents
      .filter((e) => !exclude.has(e.id))
      .filter((e) => (q ? (e.title ?? '').toLowerCase().includes(q) : true))
      .slice(0, 50)
  }, [query, allEvents, excludeEventIds])

  const canSubmit =
    !submitting && (mode === 'existing' ? !!selectedId : newTitle.trim().length > 0)

  const onSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      let eventId = selectedId
      if (mode === 'new') {
        const created = await createEvent({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          startDate: newStart || undefined,
          endDate: newEnd || undefined,
        } as any)
        eventId = created.id
      }
      if (!eventId) throw new Error('eventId 없음')
      await linkCabinetToEvent(eventId, cabinetId, role === '' ? null : role, null)
      await onAttached()
    } catch (e) {
      console.error(e)
      notify.error('사건 연결에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay role="dialog" aria-modal="true" onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>이 행정부에 사건 연결</Title>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </CloseBtn>
        </Header>
        <Body>
          <Tabs>
            <Tab type="button" $active={mode === 'existing'} onClick={() => setMode('existing')}>
              기존 사건에서 선택
            </Tab>
            <Tab type="button" $active={mode === 'new'} onClick={() => setMode('new')}>
              새 사건 만들기
            </Tab>
          </Tabs>

          {mode === 'existing' ? (
            <>
              <Input
                placeholder="사건 제목 검색…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {loading ? (
                <Empty>불러오는 중…</Empty>
              ) : filtered.length === 0 ? (
                <Empty>일치하는 사건이 없습니다.</Empty>
              ) : (
                <ResultList>
                  {filtered.map((ev) => (
                    <ResultItem
                      key={ev.id}
                      $selected={selectedId === ev.id}
                      onClick={() => setSelectedId(ev.id)}
                    >
                      <strong>{ev.title}</strong>
                      {(ev.startDate || ev.endDate) && (
                        <span style={{ color: '#9ca3af', marginLeft: 6 }}>
                          {formatYear(ev.startDate)}
                          {ev.endDate && ev.endDate !== ev.startDate
                            ? `–${formatYear(ev.endDate)}`
                            : ''}
                        </span>
                      )}
                    </ResultItem>
                  ))}
                </ResultList>
              )}
            </>
          ) : (
            <>
              <FieldLabel>사건명 *</FieldLabel>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 헤센-카셀 위기"
                autoFocus
              />
              <FieldLabel>기간</FieldLabel>
              <Row>
                <Input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
                <Input
                  type="date"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </Row>
              <FieldLabel>개요 (선택)</FieldLabel>
              <Input
                as="textarea"
                rows={3}
                value={newDesc}
                onChange={(e: any) => setNewDesc(e.target.value)}
                placeholder="간단한 설명"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </>
          )}

          <FieldLabel>이 행정부의 역할</FieldLabel>
          <Select value={role} onChange={(e) => setRole(e.target.value as CabinetEventRole | '')}>
            <option value="">미지정</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {CABINET_EVENT_ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Body>
        <Footer>
          <GhostBtn type="button" onClick={onClose}>취소</GhostBtn>
          <PrimaryBtn type="button" onClick={onSubmit} disabled={!canSubmit}>
            {submitting ? '저장 중…' : mode === 'new' ? '만들어 연결' : '연결'}
          </PrimaryBtn>
        </Footer>
      </Modal>
    </Overlay>
  )
}

function formatYear(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '' : `${dt.getFullYear()}`
}
