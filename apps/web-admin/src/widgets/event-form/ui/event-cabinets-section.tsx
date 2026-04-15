/**
 * 사건 편집 페이지의 "관련 행정부 (N:M)" 섹션
 *
 * 이 사건과 직접 연결된 행정부 목록을 관리한다 (CabinetEvent 피벗).
 * - 사건의 관련 국가에 속한 행정부들을 후보로 보여줌
 * - 역할(발단/당사자/중재자/영향받음) 선택 후 연결
 * - 인라인 역할 변경 / 연결 해제
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { FiBriefcase, FiLink, FiTrash2, FiX } from 'react-icons/fi'
import {
  CABINET_EVENT_ROLE_LABELS,
  CabinetEventLink,
  CabinetEventRole,
  linkCabinetToEvent,
  listCabinetsForEvent,
  unlinkCabinetFromEvent,
  updateCabinetEventLink,
} from '@/shared/api/cabinet-events'
import { personCareerApi, CabinetListItemDto } from '@/shared/api/person-career'
import {
  EmptyStateSimple,
  EmptyStateSpotlight,
} from '@/shared/ui/empty-state/empty-state'

const ROLE_OPTIONS: CabinetEventRole[] = ['ORIGIN', 'PARTY', 'MEDIATOR', 'AFFECTED']

const Section = styled.section`
  margin-top: 24px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
`
const Header = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
`
const Title = styled.h3`
  margin: 0; font-size: 14px; font-weight: 700; color: #111827;
`
const Count = styled.span`font-size: 12px; color: #6b7280;`
const AddBtn = styled.button`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 10px; background: #f3f4f6; border: 1px solid #e5e7eb;
  border-radius: 6px; color: #374151; font-size: 12px; font-weight: 600;
  cursor: pointer;
  &:hover { background: #e5e7eb; }
`
const List = styled.ul`
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
`
const Card = styled.li`
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
`
const CardBody = styled.div`flex: 1; min-width: 0;`
const CardTitle = styled.div`
  font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 2px;
`
const CardMeta = styled.div`font-size: 11px; color: #6b7280;`
const RoleSelect = styled.select`
  padding: 4px 6px; font-size: 11px; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; color: #374151;
`
const IconBtn = styled.button`
  padding: 6px; background: transparent; border: none; color: #9ca3af;
  cursor: pointer; border-radius: 4px;
  &:hover { color: #ef4444; background: #fef2f2; }
`

// modal
const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1100;
`
const Modal = styled.div`
  background: #fff; border-radius: 12px; width: min(520px, 92vw);
  max-height: 84vh; display: flex; flex-direction: column; overflow: hidden;
`
const MHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid #e5e7eb;
`
const MTitle = styled.h4`margin: 0; font-size: 15px; font-weight: 700; color: #111827;`
const CloseBtn = styled.button`background: transparent; border: none; cursor: pointer; color: #6b7280; padding: 4px;`
const MBody = styled.div`padding: 14px 18px; overflow-y: auto;`
const MFooter = styled.div`
  padding: 12px 18px; border-top: 1px solid #e5e7eb;
  display: flex; justify-content: flex-end; gap: 8px;
`
const FieldLabel = styled.label`
  display: block; font-size: 12px; font-weight: 600; color: #374151;
  margin: 12px 0 6px;
`
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

export interface EventCabinetsSectionProps {
  eventId: string
  /** 사건 폼의 관련 국가들. 후보 행정부 검색에 사용. */
  relatedCountryIds?: string[]
  relatedHistoricalCountryIds?: string[]
}

export function EventCabinetsSection({
  eventId,
  relatedCountryIds = [],
  relatedHistoricalCountryIds = [],
}: EventCabinetsSectionProps) {
  const [links, setLinks] = useState<CabinetEventLink[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const reload = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const rows = await listCabinetsForEvent(eventId)
      setLinks(rows)
    } catch (e) {
      console.error('[EventCabinetsSection] load failed', e)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { reload() }, [reload])

  const onChangeRole = async (link: CabinetEventLink, role: CabinetEventRole | '') => {
    try {
      await updateCabinetEventLink(eventId, link.cabinetId, { role: role === '' ? null : role })
      reload()
    } catch (e) { console.error(e); alert('역할 변경 실패') }
  }

  const onUnlink = async (link: CabinetEventLink) => {
    if (!confirm('이 행정부와의 연결을 해제할까요?')) return
    try {
      await unlinkCabinetFromEvent(eventId, link.cabinetId)
      reload()
    } catch (e) { console.error(e); alert('연결 해제 실패') }
  }

  return (
    <Section id="event-cabinets-section">
      <Header>
        <FiBriefcase size={15} strokeWidth={2} />
        <Title>관련 행정부</Title>
        <Count>{links.length}건</Count>
        <div style={{ flex: 1 }} />
        <AddBtn type="button" onClick={() => setShowModal(true)}>
          <FiLink size={13} strokeWidth={2.25} /> 행정부 연결
        </AddBtn>
      </Header>

      {loading ? (
        <EmptyStateSimple>불러오는 중…</EmptyStateSimple>
      ) : links.length === 0 ? (
        <EmptyStateSpotlight
          fill={false}
          icon={<FiBriefcase size={28} strokeWidth={1.5} />}
          title="연결된 행정부가 없습니다"
          description="헤센-카셀 위기처럼 여러 행정부가 관여한 사건이라면 여기서 묶을 수 있습니다."
          primaryAction={{
            label: '행정부 연결',
            icon: <FiLink size={14} strokeWidth={2.25} />,
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <List>
          {links.map((link) => {
            const cab: any = link.cabinet ?? {}
            const head = cab.headTenure
            const personName = head?.person?.name ?? '(이름 없음)'
            const countryName =
              head?.country?.name ?? head?.historicalCountry?.name ?? null
            return (
              <Card key={link.id}>
                <CardBody>
                  <CardTitle>
                    {cab.name ?? `${personName} 행정부`}
                  </CardTitle>
                  <CardMeta>
                    {countryName && <>{countryName} · </>}
                    {personName}
                  </CardMeta>
                </CardBody>
                <RoleSelect
                  value={link.role ?? ''}
                  onChange={(e) => onChangeRole(link, e.target.value as CabinetEventRole | '')}
                  aria-label="역할"
                >
                  <option value="">역할 미지정</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{CABINET_EVENT_ROLE_LABELS[r]}</option>
                  ))}
                </RoleSelect>
                <IconBtn type="button" onClick={() => onUnlink(link)} title="연결 해제">
                  <FiTrash2 size={14} />
                </IconBtn>
              </Card>
            )
          })}
        </List>
      )}

      {showModal && (
        <PickCabinetModal
          eventId={eventId}
          relatedCountryIds={relatedCountryIds}
          relatedHistoricalCountryIds={relatedHistoricalCountryIds}
          excludeCabinetIds={new Set(links.map((l) => l.cabinetId))}
          onClose={() => setShowModal(false)}
          onLinked={async () => { setShowModal(false); await reload() }}
        />
      )}
    </Section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// modal: pick cabinet from event's related countries
// ────────────────────────────────────────────────────────────────────────────
interface PickCabinetModalProps {
  eventId: string
  relatedCountryIds: string[]
  relatedHistoricalCountryIds: string[]
  excludeCabinetIds: Set<string>
  onClose: () => void
  onLinked: () => void | Promise<void>
}

function PickCabinetModal({
  eventId,
  relatedCountryIds,
  relatedHistoricalCountryIds,
  excludeCabinetIds,
  onClose,
  onLinked,
}: PickCabinetModalProps) {
  const [cabinets, setCabinets] = useState<CabinetListItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>('')
  const [role, setRole] = useState<CabinetEventRole | ''>('PARTY')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const all: Promise<CabinetListItemDto[]>[] = []
    for (const id of relatedCountryIds) {
      all.push(personCareerApi.getCabinets({ countryId: id }).catch(() => []))
    }
    for (const id of relatedHistoricalCountryIds) {
      all.push(personCareerApi.getCabinets({ historicalCountryId: id }).catch(() => []))
    }
    Promise.all(all)
      .then((arrs) => {
        if (cancelled) return
        const merged: CabinetListItemDto[] = []
        const seen = new Set<string>()
        for (const arr of arrs) {
          for (const c of arr) {
            if (!seen.has(c.id)) { seen.add(c.id); merged.push(c) }
          }
        }
        setCabinets(merged)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [relatedCountryIds, relatedHistoricalCountryIds])

  const candidates = useMemo(
    () => cabinets.filter((c) => !excludeCabinetIds.has(c.id)),
    [cabinets, excludeCabinetIds],
  )

  const onSubmit = async () => {
    if (!selectedCabinetId) return
    setSubmitting(true)
    try {
      await linkCabinetToEvent(eventId, selectedCabinetId, role === '' ? null : role, null)
      await onLinked()
    } catch (e) { console.error(e); alert('연결 실패') }
    finally { setSubmitting(false) }
  }

  const hasCountries =
    relatedCountryIds.length > 0 || relatedHistoricalCountryIds.length > 0

  return (
    <Overlay role="dialog" aria-modal="true" onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <MHeader>
          <MTitle>행정부 연결</MTitle>
          <CloseBtn type="button" onClick={onClose}><FiX size={18} /></CloseBtn>
        </MHeader>
        <MBody>
          {!hasCountries ? (
            <EmptyStateSpotlight
              fill={false}
              icon={<FiBriefcase size={28} strokeWidth={1.5} />}
              title="등록된 국가가 없습니다"
              description="먼저 사건에 관련 국가를 추가해 주세요. 그 국가들의 행정부에서 선택할 수 있습니다."
            />
          ) : loading ? (
            <EmptyStateSimple>불러오는 중…</EmptyStateSimple>
          ) : candidates.length === 0 ? (
            <EmptyStateSpotlight
              fill={false}
              icon={<FiBriefcase size={28} strokeWidth={1.5} />}
              title="등록된 행정부가 없습니다"
              description="관련 국가에 등록된 행정부가 없습니다. 인물 페이지에서 수반 재임을 먼저 등록해야 행정부가 생성됩니다."
            />
          ) : (
            <>
              <FieldLabel>행정부</FieldLabel>
              <Select
                value={selectedCabinetId}
                onChange={(e) => setSelectedCabinetId(e.target.value)}
              >
                <option value="">선택하세요</option>
                {candidates.map((c) => {
                  const head: any = (c as any).headTenure
                  const personName = head?.person?.name ?? '이름 없음'
                  const countryName = head?.country?.name ?? head?.historicalCountry?.name ?? ''
                  const label = c.name ?? `${personName} 행정부`
                  return (
                    <option key={c.id} value={c.id}>
                      {countryName ? `[${countryName}] ` : ''}{label}
                    </option>
                  )
                })}
              </Select>
            </>
          )}

          <FieldLabel>역할</FieldLabel>
          <Select value={role} onChange={(e) => setRole(e.target.value as CabinetEventRole | '')}>
            <option value="">미지정</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{CABINET_EVENT_ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </MBody>
        <MFooter>
          <GhostBtn type="button" onClick={onClose}>취소</GhostBtn>
          <PrimaryBtn type="button" onClick={onSubmit} disabled={!selectedCabinetId || submitting}>
            {submitting ? '저장 중…' : '연결'}
          </PrimaryBtn>
        </MFooter>
      </Modal>
    </Overlay>
  )
}
