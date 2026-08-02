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
 *
 * 이 모달은 오랫동안 자체 Overlay를 들고 있어 Esc·포커스 트랩·스크롤락·포털이 전부
 * 없었고(모달 토대 규약 위반), 기간을 native `type="date"`로 받아 **BC·고대 사건을
 * 등록할 수 없었다**. 공용 `<Modal>` + `DatePickerModal`(BC 지원)로 옮겨 둘 다 해소.
 */
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { FiCalendar } from 'react-icons/fi'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { Modal } from '@/shared/ui/modal'
import { ModalBody, ModalFooter } from '@/shared/ui/modal/modal.styles'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  CABINET_EVENT_ROLE_LABELS,
  CabinetEventRole,
  linkCabinetToEvent,
} from '@/shared/api/cabinet-events'
import { createEvent, getAllEvents, EventResponseDto } from '@/shared/api/events'
import { notify } from '@/shared/ui/toast'
import { useThemeStore } from '@/shared/styles/theme.store'

const ROLE_OPTIONS: CabinetEventRole[] = ['ORIGIN', 'PARTY', 'MEDIATOR', 'AFFECTED']

const Tabs = styled.div`display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};`
const Tab = styled.button<{ $active?: boolean }>`
  padding: 8px 14px; background: transparent; border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? '#2563eb' : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#2563eb' : theme.mode === 'dark' ? '#a1a1aa' : '#6b7280')};
  font-size: 13px; font-weight: 600; cursor: pointer;
`
const Input = styled.input`
  width: 100%; padding: 9px 12px; border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#d1d5db')}; border-radius: 6px;
  font-size: 13px; box-sizing: border-box;
`
const ResultList = styled.ul`
  list-style: none; padding: 0; margin: 12px 0 0; max-height: 240px; overflow-y: auto;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')}; border-radius: 6px;
`
const ResultItem = styled.li<{ $selected?: boolean }>`
  padding: 10px 12px; font-size: 12px; cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f3f4f6')};
  background: ${({ $selected, theme }) =>
    $selected ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#eff6ff') : 'transparent'};
  &:hover { background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f9fafb')}; }
`
const Empty = styled.div`
  padding: 24px; text-align: center; color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#9ca3af')}; font-size: 13px;
  border: 1px dashed ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')}; border-radius: 8px; margin-top: 12px;
`
const FieldLabel = styled.label`
  display: block; font-size: 12px; font-weight: 600; color: ${({ theme }) => (theme.mode === 'dark' ? '#d1d5db' : '#374151')};
  margin: 14px 0 6px;
`
const Row = styled.div`display: flex; gap: 8px;`
const Select = styled.select`
  width: 100%; padding: 9px 10px; font-size: 13px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#d1d5db')}; border-radius: 6px; background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : '#fff')};
`
const PrimaryBtn = styled.button`
  padding: 8px 14px; background: #2563eb; color: #fff; border: none;
  border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
  &:disabled { background: #9ca3af; cursor: not-allowed; }
`
/** 날짜 피커를 여는 버튼 — native date input을 대체(BC 지원) */
const DateTrigger = styled.button`
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 9px 12px; border-radius: 6px; cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px; text-align: left;

  &:hover { border-color: ${({ theme }) => theme.colors.border.medium}; }
`

const GhostBtn = styled.button`
  padding: 8px 14px; background: transparent; border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#d1d5db')};
  border-radius: 6px; color: ${({ theme }) => (theme.mode === 'dark' ? '#d1d5db' : '#374151')}; font-size: 13px; cursor: pointer;
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
  const { mode: themeMode } = useThemeStore()
  const isDark = themeMode === 'dark'

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
  /** BC·고대 연도를 다루려면 native date로는 불가 — 공용 DatePickerModal을 쓴다 */
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [endPickerOpen, setEndPickerOpen] = useState(false)

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
    <Modal isOpen onClose={onClose} title="이 행정부에 사건 연결">
      <ModalBody>
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
                        <span style={{ color: isDark ? '#71717a' : '#9ca3af', marginLeft: 6 }}>
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
                <DateTrigger type="button" onClick={() => setStartPickerOpen(true)}>
                  <FiCalendar size={14} aria-hidden />
                  <span>{newStart ? formatDateLabel(newStart) : '시작일 선택'}</span>
                </DateTrigger>
                <DateTrigger type="button" onClick={() => setEndPickerOpen(true)}>
                  <FiCalendar size={14} aria-hidden />
                  <span>{newEnd ? formatDateLabel(newEnd) : '종료일 선택'}</span>
                </DateTrigger>
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
      </ModalBody>
      <ModalFooter>
        <GhostBtn type="button" onClick={onClose}>취소</GhostBtn>
        <PrimaryBtn type="button" onClick={onSubmit} disabled={!canSubmit}>
          {submitting ? '저장 중…' : mode === 'new' ? '만들어 연결' : '연결'}
        </PrimaryBtn>
      </ModalFooter>

      {/* 기간 선택 — BC/고대 지원. 포털 + 자체 Esc 캡처라 이 모달을 닫지 않는다. */}
      <DatePickerModal
        isOpen={startPickerOpen}
        onClose={() => setStartPickerOpen(false)}
        onSelect={(date) => {
          setNewStart(date)
          setStartPickerOpen(false)
        }}
        initialDate={newStart}
        maxDate={newEnd}
        title="시작 일자 선택"
      />
      <DatePickerModal
        isOpen={endPickerOpen}
        onClose={() => setEndPickerOpen(false)}
        onSelect={(date) => {
          setNewEnd(date)
          setEndPickerOpen(false)
        }}
        initialDate={newEnd || newStart}
        minDate={newStart}
        title="종료 일자 선택"
      />
    </Modal>
  )
}

/**
 * 연도 라벨 — `new Date()`는 BC/고대(`-0753-01-01`)에서 NaN이 되므로 부호 있는 연도
 * 파서를 쓴다. 음수면 '기원전 N'으로 읽힌다.
 */
function formatYear(value?: string | null): string {
  if (!value) return ''
  const signedYear = signedYearFromIsoLike(value)
  if (signedYear == null) return ''
  return signedYear < 0 ? `기원전 ${Math.abs(signedYear)}` : `${signedYear}`
}

/** 날짜 트리거 라벨 — 연도까지만(모달이 좁고, 기간의 해상도는 연 단위로 충분) */
function formatDateLabel(value: string): string {
  const year = formatYear(value)
  const rest = value.replace(/^-?\d{1,6}-/, '')
  return rest && rest !== value ? `${year}-${rest}` : year
}
