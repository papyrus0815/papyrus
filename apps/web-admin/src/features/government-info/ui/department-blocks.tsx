import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { GOV_BRAND } from '@/features/government-info/ui/government-ledger.styles'
import type {
  AdministrationDepartmentEvent,
  AdministrationDepartmentEventRole,
  AdministrationDepartmentTenureItem,
} from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import type { EventPickerSelection } from '@/shared/ui/event-picker-modal/event-picker-modal'
import { EventPickerModal } from '@/shared/ui/event-picker-modal/event-picker-modal'
import { InstitutionAppointmentModal } from '@/shared/ui/institution-appointment-modal'
import { notify } from '@/shared/ui/toast'

function formatStructuredOrIsoDate(
  parts: {
    era?: string | null
    year?: number | null
    month?: number | null
    day?: number | null
  },
  iso: string | null | undefined,
): string {
  if (parts.year != null && parts.year > 0) {
    const prefix = parts.era === 'BC' ? 'BC ' : ''
    const monthStr =
      parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
    const dayStr =
      parts.month != null && parts.day != null
        ? `.${String(parts.day).padStart(2, '0')}`
        : ''
    return `${prefix}${parts.year}${monthStr}${dayStr}`
  }
  if (!iso) return '—'
  if (iso.startsWith('-')) {
    const bcMatch = iso.match(/^-(\d{1,6})-(\d{2})-(\d{2})/)
    if (bcMatch) return `BC ${Number(bcMatch[1])}`
  }
  return iso.slice(0, 10).replace(/-/g, '.')
}

function getBlockTokens(isDark: boolean) {
  return {
    hairline: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.06)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(20, 19, 34, 0.1)',
    text: isDark ? '#f1f5f9' : '#0f172a',
    textSub: isDark ? '#94a3b8' : '#64748b',
    textFaint: isDark ? '#64748b' : '#94a3b8',
    chipBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(20, 19, 34, 0.045)',
    subtleBg: isDark ? 'rgba(255, 255, 255, 0.025)' : '#f8fafc',
    accent: isDark ? '#93c5fd' : GOV_BRAND.primary,
    accentSoft: isDark ? GOV_BRAND.primarySoftDark : GOV_BRAND.primarySoft,
  }
}

/**
 * 부처에 연결된 역대 장관(재임) 원장 목록 + 인라인 임명/수정
 */
export function DepartmentTenuresBlock({
  departmentId,
  countryId,
  historicalCountryId,
  departmentName,
  departmentKind,
}: {
  departmentId: string
  countryId?: string
  historicalCountryId?: string | null
  departmentName?: string
  departmentKind?: string | null
}) {
  const queryClient = useQueryClient()
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [editingTenure, setEditingTenure] =
    useState<AdministrationDepartmentTenureItem | null>(null)

  const closeAppointmentModal = () => {
    setAppointmentOpen(false)
    setEditingTenure(null)
  }

  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const tokens = getBlockTokens(isDark)

  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['administration-department-tenures', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getTenuresByDepartmentId(departmentId),
    enabled: !!departmentId,
  })
  const { data: availableCabinets = [] } = useQuery({
    queryKey: [
      'cabinets-by-country',
      countryId ?? '',
      historicalCountryId ?? '',
    ],
    queryFn: () =>
      personCareerApi.getCabinets({
        ...(countryId ? { countryId } : {}),
        ...(historicalCountryId ? { historicalCountryId } : {}),
      }),
    enabled:
      Boolean(appointmentOpen || editingTenure) &&
      Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })

  const handleDeleteTenure = async (
    tenure: AdministrationDepartmentTenureItem,
  ) => {
    const label =
      tenure.title ?? tenure.positionDefinition?.title ?? '재임 기록'
    const ok = await confirm({
      title: '재임 기록 삭제',
      message: `"${label}" 재임 기록을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    try {
      await personCareerApi.deleteGovernmentPositionTenure(tenure.id)
      invalidateTenureQueries(queryClient, {
        personId: tenure.personId ?? tenure.person?.id ?? null,
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
      })
      notify.success('재임 기록을 삭제했습니다.')
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '재임 기록 삭제에 실패했습니다.',
      )
    }
  }

  if (isLoading) return null

  const formatName = (
    personObj: {
      name?: string
      surname?: string
      middleName?: string
      nameDisplayOrder?: string | null
      country?: { defaultNameDisplayOrder?: string | null } | null
    } | null,
  ) => {
    if (!personObj) return '—'
    return (
      getPersonDisplayName({
        name: personObj.name ?? '',
        surname: personObj.surname,
        middleName: personObj.middleName,
        nameDisplayOrder: personObj.nameDisplayOrder ?? null,
        country: personObj.country ?? undefined,
      }) ||
      personObj.name ||
      '—'
    )
  }

  const appointButtonLabel =
    departmentKind === 'COLONIAL_GOVERNMENT'
      ? '+ 총독·인사 임명'
      : departmentKind === 'AGENCY' || departmentKind === 'ROYAL_HOUSEHOLD'
        ? '+ 수장·인사 임명'
        : '+ 장관·수장 임명'

  return (
    <div
      style={{
        padding: '15px 20px',
        borderBottom: `1px solid ${tokens.hairline}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: tokens.textSub,
          }}
        >
          역대 수장 · 주요 인사
        </span>
        <span
          style={{
            padding: '1px 6px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: tokens.chipBg,
            color: tokens.textSub,
          }}
        >
          {tenures.length}
        </span>
        <button
          type="button"
          onClick={() => {
            setEditingTenure(null)
            setAppointmentOpen(true)
          }}
          style={{
            marginLeft: 'auto',
            height: 28,
            padding: '0 10px',
            borderRadius: 6,
            border: `1px solid ${tokens.border}`,
            background: 'transparent',
            color: tokens.accent,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {appointButtonLabel}
        </button>
      </div>

      {tenures.length === 0 ? (
        <div
          style={{
            padding: '10px 0 2px',
            fontSize: 12.5,
            color: tokens.textFaint,
          }}
        >
          등록된 수장·인사 재임 기록이 없습니다.
        </div>
      ) : (
        <>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {tenures.slice(0, 20).map((tenure, index) => {
              const startLabel = formatStructuredOrIsoDate(
                {
                  era: tenure.startEra,
                  year: tenure.startYear,
                  month: tenure.startMonth,
                  day: tenure.startDay,
                },
                tenure.startDate,
              )
              const endLabel = formatStructuredOrIsoDate(
                {
                  era: tenure.endEra,
                  year: tenure.endYear,
                  month: tenure.endMonth,
                  day: tenure.endDay,
                },
                tenure.endDate,
              )
              const canEdit = Boolean(tenure.personId || tenure.person?.id)
              const personIdVal = tenure.person?.id ?? tenure.personId
              const displayPersonName = formatName(
                tenure.person
                  ? {
                      name: tenure.person.name,
                      surname: tenure.person.surname ?? undefined,
                      middleName: tenure.person.middleName ?? undefined,
                      country: tenure.person.country ?? undefined,
                    }
                  : null,
              )
              return (
                <li
                  key={tenure.id}
                  style={{
                    fontSize: 13,
                    color: tokens.text,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 7,
                    alignItems: 'center',
                    padding: '8px 0',
                    borderTop:
                      index === 0 ? 'none' : `1px solid ${tokens.hairline}`,
                  }}
                >
                  {tenure.ordinal != null && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: tokens.accent,
                        background: tokens.accentSoft,
                        padding: '1px 6px',
                        borderRadius: 5,
                      }}
                    >
                      제{tenure.ordinal}대
                    </span>
                  )}
                  {personIdVal ? (
                    <Link
                      to={`/persons-timeline/${encodeURIComponent(personIdVal)}/`}
                      style={{
                        fontWeight: 700,
                        color: tokens.text,
                        textDecoration: 'none',
                      }}
                    >
                      {displayPersonName}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 700 }}>{displayPersonName}</span>
                  )}
                  <span style={{ color: tokens.textSub, fontWeight: 500 }}>
                    {tenure.title ?? tenure.positionDefinition?.title ?? ''}
                  </span>
                  {tenure.rankTitle ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: tokens.chipBg,
                        color: tokens.textSub,
                      }}
                    >
                      {tenure.rankTitle}
                    </span>
                  ) : null}
                  {tenure.party ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 999,
                        border: `1px solid ${tenure.party.brandColor || tokens.border}`,
                        color: tokens.textSub,
                      }}
                    >
                      {tenure.party.shortName || tenure.party.name}
                    </span>
                  ) : null}
                  <span
                    style={{
                      color: tokens.textSub,
                      fontSize: 12,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {startLabel} – {endLabel === '—' ? '재임·미상' : endLabel}
                  </span>
                  <div
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingTenure(tenure)}
                        style={{
                          padding: '2px 7px',
                          fontSize: 11,
                          borderRadius: 5,
                          border: `1px solid ${tokens.border}`,
                          background: 'transparent',
                          color: tokens.textSub,
                          cursor: 'pointer',
                        }}
                      >
                        수정
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDeleteTenure(tenure)}
                      style={{
                        padding: '2px 7px',
                        fontSize: 11,
                        borderRadius: 5,
                        border: `1px solid ${tokens.border}`,
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {tenures.length > 20 && (
            <div
              style={{
                fontSize: 12,
                color: tokens.textSub,
                marginTop: 6,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              외 {tenures.length - 20}명
            </div>
          )}
        </>
      )}

      <InstitutionAppointmentModal
        isOpen={appointmentOpen || Boolean(editingTenure)}
        onClose={closeAppointmentModal}
        contextType="DEPARTMENT"
        countryId={countryId ?? null}
        historicalCountryId={historicalCountryId ?? null}
        departmentId={departmentId}
        departmentName={departmentName ?? null}
        departmentKind={departmentKind ?? null}
        availableCabinets={availableCabinets}
        editingTenure={
          editingTenure
            ? {
                id: editingTenure.id,
                personId: editingTenure.person?.id ?? editingTenure.personId,
                personName: formatName(
                  editingTenure.person
                    ? {
                        name: editingTenure.person.name,
                        surname: editingTenure.person.surname ?? undefined,
                        middleName:
                          editingTenure.person.middleName ?? undefined,
                        country: editingTenure.person.country ?? undefined,
                      }
                    : null,
                ),
                positionType:
                  editingTenure.positionDefinition?.positionType ?? null,
                positionDefinitionId:
                  editingTenure.positionDefinition?.id ?? null,
                title:
                  editingTenure.title ??
                  editingTenure.positionDefinition?.title ??
                  '',
                rankTitle: editingTenure.rankTitle ?? null,
                ordinal: editingTenure.ordinal ?? null,
                partyId: editingTenure.partyId ?? null,
                administrationDepartmentId: departmentId,
                cabinetId: editingTenure.cabinetId ?? null,
                cabinetIds: editingTenure.cabinets?.map((cab) => cab.id),
                startDate: editingTenure.startDate,
                endDate: editingTenure.endDate,
                startEra: editingTenure.startEra,
                startYear: editingTenure.startYear,
                startMonth: editingTenure.startMonth,
                startDay: editingTenure.startDay,
                endEra: editingTenure.endEra,
                endYear: editingTenure.endYear,
                endMonth: editingTenure.endMonth,
                endDay: editingTenure.endDay,
              }
            : null
        }
      />
    </div>
  )
}

const DEPT_EVENT_ROLE_LABEL: Record<AdministrationDepartmentEventRole, string> =
  {
    ISSUER: '발령·하달',
    RECIPIENT: '수명·이행',
    PRINCIPAL: '주도·주관',
    PARTICIPANT: '참여·관여',
    OTHER: '기타',
  }

const DEPT_EVENT_ROLE_KEYS: AdministrationDepartmentEventRole[] = [
  'PRINCIPAL',
  'ISSUER',
  'RECIPIENT',
  'PARTICIPANT',
  'OTHER',
]

/** 부처별 관련 사건(EventDepartmentRelation) — 플랫 원장 섹션 */
export function DepartmentEventsBlock({
  departmentId,
}: {
  departmentId: string
}) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const tokens = getBlockTokens(isDark)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['administration-department-events', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getDepartmentEvents(departmentId),
    enabled: !!departmentId,
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<EventPickerSelection | null>(
    null,
  )
  const [editingLink, setEditingLink] =
    useState<AdministrationDepartmentEvent | null>(null)
  const [role, setRole] =
    useState<AdministrationDepartmentEventRole>('PRINCIPAL')
  const [roleDescription, setRoleDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['administration-department-events', departmentId],
    })

  const resetForm = () => {
    setPendingEvent(null)
    setEditingLink(null)
    setRole('PRINCIPAL')
    setRoleDescription('')
  }

  const handleSaveLink = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (editingLink) {
        await administrationDepartmentApi.updateDepartmentEventLink(
          editingLink.event.id,
          editingLink.relationId,
          {
            role,
            roleDescription: roleDescription.trim() || null,
          },
        )
        notify.success('사건 연결 역할이 수정되었습니다.')
      } else if (pendingEvent) {
        await administrationDepartmentApi.linkDepartmentEvent(pendingEvent.id, {
          departmentId,
          role,
          roleDescription: roleDescription.trim() || null,
        })
        notify.success(`'${pendingEvent.title}' 사건을 연결했습니다.`)
      }
      await invalidate()
      resetForm()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '15px 20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: tokens.textSub,
            }}
          >
            관련 사건 · 정책
          </span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              background: tokens.chipBg,
              color: tokens.textSub,
            }}
          >
            {events.length}
          </span>
        </div>
        {!pendingEvent && !editingLink ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{
              height: 28,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: 600,
              color: tokens.accent,
              background: 'transparent',
              border: `1px solid ${tokens.border}`,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            + 사건 연결
          </button>
        ) : null}
      </div>

      {pendingEvent && (
        <div
          style={{
            padding: 12,
            background: tokens.subtleBg,
            borderRadius: 8,
            border: `1px solid ${tokens.border}`,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: tokens.text,
              marginBottom: 8,
            }}
          >
            연결할 사건: {pendingEvent.title}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 5,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            {DEPT_EVENT_ROLE_KEYS.map((roleKey) => {
              const active = role === roleKey
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setRole(roleKey)}
                  style={{
                    padding: '4px 9px',
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    borderRadius: 6,
                    border: `1px solid ${active ? GOV_BRAND.primary : tokens.border}`,
                    background: active ? tokens.accentSoft : 'transparent',
                    color: active ? tokens.accent : tokens.textSub,
                    cursor: 'pointer',
                  }}
                >
                  {DEPT_EVENT_ROLE_LABEL[roleKey]}
                </button>
              )
            })}
          </div>
          <input
            value={roleDescription}
            onChange={(changeEvent) =>
              setRoleDescription(changeEvent.target.value)
            }
            placeholder="역할 설명 (선택 — 예: 총통 지령 기안·하달)"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 8,
              padding: '7px 10px',
              border: `1px solid ${tokens.border}`,
              borderRadius: 7,
              fontSize: 12.5,
              background: 'transparent',
              color: tokens.text,
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => void handleSaveLink()}
              disabled={busy}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                background: GOV_BRAND.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {busy ? '연결 중…' : '연결'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                border: `1px solid ${tokens.border}`,
                borderRadius: 6,
                background: 'transparent',
                color: tokens.textSub,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ fontSize: 12, color: tokens.textFaint }}>
          불러오는 중…
        </div>
      ) : events.length === 0 ? (
        !pendingEvent && (
          <div style={{ fontSize: 12.5, color: tokens.textFaint }}>
            연결된 사건이 없습니다.
          </div>
        )
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {events.map((deptEvent, index) => {
            const isEditing = editingLink?.relationId === deptEvent.relationId
            const dateLabel = formatStructuredOrIsoDate(
              {
                era: deptEvent.event.startEra,
                year: deptEvent.event.startYear,
                month: deptEvent.event.startMonth,
                day: deptEvent.event.startDay,
              },
              null,
            )
            const roleLabel =
              DEPT_EVENT_ROLE_LABEL[
                deptEvent.role as AdministrationDepartmentEventRole
              ] ?? deptEvent.role

            return (
              <li
                key={deptEvent.relationId}
                style={{
                  fontSize: 12.5,
                  color: tokens.text,
                  padding: '9px 0',
                  borderTop:
                    index === 0 ? 'none' : `1px solid ${tokens.hairline}`,
                }}
              >
                {isEditing ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {deptEvent.event.title}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {DEPT_EVENT_ROLE_KEYS.map((roleKey) => {
                        const active = role === roleKey
                        return (
                          <button
                            key={roleKey}
                            type="button"
                            onClick={() => setRole(roleKey)}
                            style={{
                              padding: '4px 9px',
                              fontSize: 11.5,
                              fontWeight: active ? 700 : 500,
                              borderRadius: 6,
                              border: `1px solid ${active ? GOV_BRAND.primary : tokens.border}`,
                              background: active
                                ? tokens.accentSoft
                                : 'transparent',
                              color: active ? tokens.accent : tokens.textSub,
                              cursor: 'pointer',
                            }}
                          >
                            {DEPT_EVENT_ROLE_LABEL[roleKey]}
                          </button>
                        )
                      })}
                    </div>
                    <input
                      value={roleDescription}
                      onChange={(changeEvent) =>
                        setRoleDescription(changeEvent.target.value)
                      }
                      placeholder="역할 설명"
                      style={{
                        padding: '6px 10px',
                        border: `1px solid ${tokens.border}`,
                        borderRadius: 7,
                        fontSize: 12,
                        background: 'transparent',
                        color: tokens.text,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => void handleSaveLink()}
                        disabled={busy}
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: GOV_BRAND.primary,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        disabled={busy}
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          border: `1px solid ${tokens.border}`,
                          borderRadius: 6,
                          background: 'transparent',
                          color: tokens.textSub,
                          cursor: 'pointer',
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <Link
                      to={`/events/${deptEvent.event.id}`}
                      style={{
                        fontWeight: 600,
                        color: tokens.text,
                        textDecoration: 'underline',
                        textUnderlineOffset: 2,
                      }}
                      title={`${deptEvent.event.title} 사건 상세 보기`}
                    >
                      {deptEvent.event.title}
                    </Link>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: tokens.textSub,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {dateLabel}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: tokens.chipBg,
                        color: tokens.textSub,
                      }}
                    >
                      {roleLabel}
                    </span>
                    {deptEvent.roleDescription ? (
                      <span
                        style={{
                          fontSize: 11.5,
                          color: tokens.textSub,
                        }}
                      >
                        · {deptEvent.roleDescription}
                      </span>
                    ) : null}
                    <div
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        gap: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLink(deptEvent)
                          setPendingEvent(null)
                          setRole(
                            (deptEvent.role as AdministrationDepartmentEventRole) ||
                              'PRINCIPAL',
                          )
                          setRoleDescription(deptEvent.roleDescription ?? '')
                        }}
                        style={{
                          padding: '2px 7px',
                          fontSize: 11,
                          border: `1px solid ${tokens.border}`,
                          borderRadius: 5,
                          background: 'transparent',
                          color: tokens.textSub,
                          cursor: 'pointer',
                        }}
                      >
                        역할 수정
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: '연결 해제',
                              message: `'${deptEvent.event.title}' 사건과의 연결을 해제하시겠습니까?`,
                              danger: true,
                            })
                          ) {
                            await administrationDepartmentApi
                              .unlinkDepartmentEvent(
                                deptEvent.event.id,
                                deptEvent.relationId,
                              )
                              .then(invalidate)
                          }
                        }}
                        style={{
                          padding: '2px 7px',
                          fontSize: 11,
                          border: `1px solid ${tokens.border}`,
                          borderRadius: 5,
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        해제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <EventPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="기관에 연결할 사건 찾기"
        onSelect={(picked) => {
          setPickerOpen(false)
          setEditingLink(null)
          setPendingEvent(picked)
          setRole('PRINCIPAL')
          setRoleDescription('')
        }}
      />
    </div>
  )
}
