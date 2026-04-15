/**
 * 행정부 상세에서 "관련 사건" 섹션 (CabinetEvent N:M)
 *
 * - 이 행정부에 연결된 사건 목록 표시
 * - "사건 연결" 버튼 → 모달에서 사건 검색·역할 선택 후 연결
 * - 각 사건 카드에서 역할 변경/연결 해제 가능
 */
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { FiCalendar, FiLink, FiTrash2 } from 'react-icons/fi'
import {
  CABINET_EVENT_ROLE_LABELS,
  CabinetEventLink,
  CabinetEventRole,
  listEventsForCabinet,
  unlinkCabinetFromEvent,
  updateCabinetEventLink,
} from '@/shared/api/cabinet-events'
import { CabinetEventAttachModal } from './cabinet-event-attach-modal'

const ROLE_OPTIONS: CabinetEventRole[] = ['ORIGIN', 'PARTY', 'MEDIATOR', 'AFFECTED']

// ────────────────────────────────────────────────────────────────────────────
// styles
// ────────────────────────────────────────────────────────────────────────────
const Section = styled.section`
  margin-top: 24px;
  padding: 0 4px;
`
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`
const Title = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 0;
`
const Count = styled.span`
  font-size: 12px;
  color: #6b7280;
`
const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #e5e7eb;
  }
`
const Empty = styled.div`
  padding: 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
`
const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
const Card = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
`
const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`
const CardTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
  word-break: keep-all;
`
const CardMeta = styled.div`
  font-size: 11px;
  color: #6b7280;
  display: flex;
  gap: 8px;
  align-items: center;
`
const RoleSelect = styled.select`
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: #374151;
`
const IconBtn = styled.button`
  padding: 6px;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  &:hover {
    color: #ef4444;
    background: #fef2f2;
  }
`

// modal
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`
const Modal = styled.div`
  background: #fff;
  border-radius: 12px;
  width: min(560px, 92vw);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
`
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #e5e7eb;
`
const ModalTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
`
const CloseBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
`
const ModalBody = styled.div`
  padding: 14px 18px;
  overflow-y: auto;
`
const ModalFooter = styled.div`
  padding: 12px 18px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`
const SearchInput = styled.input`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
`
const ResultList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`
const ResultItem = styled.li<{ $selected?: boolean }>`
  padding: 10px 12px;
  font-size: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  background: ${(p) => (p.$selected ? '#eff6ff' : 'transparent')};
  &:hover {
    background: #f9fafb;
  }
`
const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin: 12px 0 6px;
`
const PrimaryBtn = styled.button`
  padding: 8px 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`
const GhostBtn = styled.button`
  padding: 8px 14px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
`

// ────────────────────────────────────────────────────────────────────────────
// component
// ────────────────────────────────────────────────────────────────────────────
export interface CabinetEventsSectionProps {
  cabinetId: string
}

export function CabinetEventsSection({ cabinetId }: CabinetEventsSectionProps) {
  const [links, setLinks] = useState<CabinetEventLink[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const reload = useCallback(async () => {
    if (!cabinetId) return
    setLoading(true)
    try {
      const rows = await listEventsForCabinet(cabinetId)
      setLinks(rows)
    } catch (e) {
      console.error('[CabinetEventsSection] load failed', e)
    } finally {
      setLoading(false)
    }
  }, [cabinetId])

  useEffect(() => {
    reload()
  }, [reload])

  const onChangeRole = async (link: CabinetEventLink, role: CabinetEventRole | '') => {
    try {
      await updateCabinetEventLink(link.eventId, link.cabinetId, {
        role: role === '' ? null : role,
      })
      reload()
    } catch (e) {
      console.error(e)
      alert('역할 변경에 실패했습니다.')
    }
  }

  const onUnlink = async (link: CabinetEventLink) => {
    if (!confirm('이 사건과의 연결을 해제할까요?')) return
    try {
      await unlinkCabinetFromEvent(link.eventId, link.cabinetId)
      reload()
    } catch (e) {
      console.error(e)
      alert('연결 해제에 실패했습니다.')
    }
  }

  return (
    <Section id="cab-detail-events">
      <Header>
        <FiCalendar size={15} strokeWidth={2} />
        <Title>관련 사건</Title>
        <Count>{links.length}건</Count>
        <div style={{ flex: 1 }} />
        <AddBtn type="button" onClick={() => setShowModal(true)}>
          <FiLink size={13} strokeWidth={2.25} />
          사건 연결
        </AddBtn>
      </Header>

      {loading ? (
        <Empty>불러오는 중…</Empty>
      ) : links.length === 0 ? (
        <Empty>연결된 사건이 없습니다.</Empty>
      ) : (
        <List>
          {links.map((link) => {
            const ev = link.event ?? {}
            const period = formatPeriod(ev.startDate, ev.endDate)
            return (
              <Card key={link.id}>
                <CardBody>
                  <CardTitle>{ev.title ?? '(제목 없음)'}</CardTitle>
                  <CardMeta>
                    {period && <span>{period}</span>}
                    {ev.category?.name && <span>· {ev.category.name}</span>}
                  </CardMeta>
                </CardBody>
                <RoleSelect
                  value={link.role ?? ''}
                  onChange={(e) =>
                    onChangeRole(link, e.target.value as CabinetEventRole | '')
                  }
                  aria-label="역할"
                >
                  <option value="">역할 미지정</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {CABINET_EVENT_ROLE_LABELS[r]}
                    </option>
                  ))}
                </RoleSelect>
                <IconBtn
                  type="button"
                  onClick={() => onUnlink(link)}
                  aria-label="연결 해제"
                  title="연결 해제"
                >
                  <FiTrash2 size={14} />
                </IconBtn>
              </Card>
            )
          })}
        </List>
      )}

      {showModal && (
        <CabinetEventAttachModal
          cabinetId={cabinetId}
          excludeEventIds={new Set(links.map((l) => l.eventId))}
          onClose={() => setShowModal(false)}
          onAttached={async () => {
            setShowModal(false)
            await reload()
          }}
        />
      )}
    </Section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// utils
// ────────────────────────────────────────────────────────────────────────────
function formatPeriod(start?: string | null, end?: string | null): string {
  const fmt = (d?: string | null) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    return `${dt.getFullYear()}`
  }
  const s = fmt(start)
  const e = fmt(end)
  if (s && e) return s === e ? s : `${s}–${e}`
  return s || e
}
