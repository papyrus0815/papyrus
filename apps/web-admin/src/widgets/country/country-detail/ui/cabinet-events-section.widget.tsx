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
      reload()
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
          excludeEventIds={new Set(links.map((l) => l.eventId))}
          onClose={() => setShowModal(false)}
          onAttached={async () => {
            setShowModal(false)
            await reload()
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
  const fmt = (d?: string | null) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    return `${dt.getUTCFullYear()}`
  }
  const s = fmt(start)
  const e = fmt(end)
  if (s && e) return s === e ? s : `${s}–${e}`
  return s || e
}
