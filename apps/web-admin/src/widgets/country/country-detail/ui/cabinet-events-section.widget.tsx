/**
 * 행정부 상세에서 "관련 사건" 섹션 (CabinetEvent N:M)
 *
 * - 이 행정부에 연결된 사건 목록 표시
 * - "사건 연결" 버튼 → 모달에서 사건 검색·역할 선택 후 연결
 * - 각 사건 카드에서 역할 변경/연결 해제 가능
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { FiArrowUpRight, FiCalendar, FiLink, FiTrash2 } from 'react-icons/fi'
import {
  CABINET_EVENT_ROLE_LABELS,
  CabinetEventLink,
  CabinetEventRole,
  listEventsForCabinet,
  unlinkCabinetFromEvent,
  updateCabinetEventLink,
} from '@/shared/api/cabinet-events'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { CabinetEventAttachModal } from './cabinet-event-attach-modal'
import { CABINET_SECTION_MAIN as MAIN } from './cabinets-section.constants'
import * as CabS from './cabinets-section.styled'
import { SubsectionAddBtn } from './country-politics-tab.styles'

const ROLE_OPTIONS: CabinetEventRole[] = ['ORIGIN', 'PARTY', 'MEDIATOR', 'AFFECTED']

// ────────────────────────────────────────────────────────────────────────────
// styles
// ────────────────────────────────────────────────────────────────────────────
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
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border: 1.5px solid
    ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').borderHairline};
  border-radius: 10px;
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyRowBg};
  transition: border-color 0.15s ease;
`
const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`
const CardTitleLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
  margin-bottom: 3px;
  word-break: keep-all;
  text-decoration: none;

  &:hover {
    color: ${MAIN};
    text-decoration: underline;
  }
`
const CardTitle = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').treatyTitleText};
  margin-bottom: 3px;
  word-break: keep-all;
`
const CardMeta = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').textMuted};
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`
const RoleSelect = styled.select`
  padding: 5px 8px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid
    ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').borderMid};
  border-radius: 7px;
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').inputBg};
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').text};
  cursor: pointer;
  outline: none;
  &:focus {
    border-color: ${MAIN};
  }
`

// ────────────────────────────────────────────────────────────────────────────
// component
// ────────────────────────────────────────────────────────────────────────────
export interface CabinetEventsSectionProps {
  cabinetId: string
  countryId?: string | null
  historicalCountryId?: string | null
}

export function CabinetEventsSection({
  cabinetId,
  countryId,
  historicalCountryId,
}: CabinetEventsSectionProps) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: links = [], isPending: loading } = useQuery({
    queryKey: ['cabinet-linked-events', cabinetId],
    queryFn: () => listEventsForCabinet(cabinetId),
    enabled: Boolean(cabinetId),
    staleTime: 60_000,
  })

  const invalidateCabinetEventCaches = () => {
    void queryClient.invalidateQueries({
      queryKey: ['cabinet-linked-events', cabinetId],
    })
    void queryClient.invalidateQueries({ queryKey: ['cabinets-by-country'] })
    void queryClient.invalidateQueries({ queryKey: ['cabinets'] })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinet-detail'] })
    void queryClient.invalidateQueries({ queryKey: ['cabinet-overview'] })
  }

  const onChangeRole = async (link: CabinetEventLink, role: CabinetEventRole | '') => {
    try {
      await updateCabinetEventLink(link.eventId, link.cabinetId, {
        role: role === '' ? null : role,
      })
      invalidateCabinetEventCaches()
    } catch (e) {
      console.error(e)
      notify.error('역할 변경에 실패했습니다.')
    }
  }

  const onUnlink = async (link: CabinetEventLink) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 사건과의 연결을 해제할까요?',
        danger: true,
      }))
    )
      return
    try {
      await unlinkCabinetFromEvent(link.eventId, link.cabinetId)
      invalidateCabinetEventCaches()
    } catch (e) {
      console.error(e)
      notify.error('연결 해제에 실패했습니다.')
    }
  }

  return (
    <CabS.CabDetailSubSection id="cab-detail-events">
      <CabS.CabDetailMinistersSectionHeader>
        <FiCalendar
          size={15}
          strokeWidth={2}
          aria-hidden
          style={{ color: MAIN, flexShrink: 0 }}
        />
        <CabS.CabDetailMinistersSectionTitle>
          관련 사건
        </CabS.CabDetailMinistersSectionTitle>
        <CabS.CabResultCount style={{ marginLeft: 4 }}>
          {links.length}건
        </CabS.CabResultCount>
        <div style={{ flex: 1 }} />
        <SubsectionAddBtn type="button" onClick={() => setShowModal(true)}>
          <FiLink size={14} strokeWidth={2.25} />
          사건 연결
        </SubsectionAddBtn>
      </CabS.CabDetailMinistersSectionHeader>

      {loading ? (
        <CabS.CabMinistersLoadingBox aria-busy="true" aria-live="polite">
          사건 불러오는 중…
        </CabS.CabMinistersLoadingBox>
      ) : links.length === 0 ? (
        <CabS.CabDetailEmptyStack $padding="24px 0 28px">
          <CabS.CabDetailPartyEmptyIconWrap aria-hidden>
            <FiCalendar size={26} strokeWidth={1.5} />
          </CabS.CabDetailPartyEmptyIconWrap>
          <CabS.CabDetailEmptyText>
            연결된 사건이 없습니다.
          </CabS.CabDetailEmptyText>
        </CabS.CabDetailEmptyStack>
      ) : (
        <List>
          {links.map((link) => {
            const ev = link.event ?? {}
            const targetEventId = (ev as { id?: string }).id ?? link.eventId
            const period = formatPeriod(ev.startDate, ev.endDate)
            return (
              <Card key={link.id}>
                <CardBody>
                  {targetEventId ? (
                    <CardTitleLink to={`/events/${encodeURIComponent(targetEventId)}`}>
                      <span>{ev.title ?? '(제목 없음)'}</span>
                      <FiArrowUpRight size={13} aria-hidden />
                    </CardTitleLink>
                  ) : (
                    <CardTitle>{ev.title ?? '(제목 없음)'}</CardTitle>
                  )}
                  <CardMeta>
                    {period && <span>{period}</span>}
                    {ev.category?.name && <span>· {ev.category.name}</span>}
                    {link.note?.trim() ? <span>· {link.note.trim()}</span> : null}
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
                <CabS.CabDetailPartyRemoveBtn
                  type="button"
                  onClick={() => onUnlink(link)}
                  aria-label="연결 해제"
                  title="연결 해제"
                >
                  <FiTrash2 size={14} />
                </CabS.CabDetailPartyRemoveBtn>
              </Card>
            )
          })}
        </List>
      )}

      {showModal && (
        <CabinetEventAttachModal
          cabinetId={cabinetId}
          countryId={countryId}
          historicalCountryId={historicalCountryId}
          excludeEventIds={new Set(links.map((l) => l.eventId))}
          onClose={() => setShowModal(false)}
          onAttached={async () => {
            setShowModal(false)
            invalidateCabinetEventCaches()
          }}
        />
      )}
    </CabS.CabDetailSubSection>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// utils
// ────────────────────────────────────────────────────────────────────────────
function formatPeriod(start?: string | null, end?: string | null): string {
  const fmt = (dateValue?: string | null) => {
    if (!dateValue?.trim()) return ''
    const parts = parseIsoDateParts(dateValue)
    if (parts) {
      return parts.year < 0 ? `BC ${-parts.year}` : `${parts.year}`
    }
    const dt = new Date(dateValue)
    if (isNaN(dt.getTime())) return ''
    return `${dt.getUTCFullYear()}`
  }
  const startLabel = fmt(start)
  const endLabel = fmt(end)
  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`
  }
  return startLabel || endLabel
}
