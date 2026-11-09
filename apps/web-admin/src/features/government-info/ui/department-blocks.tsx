import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  AdministrationDepartmentEvent,
  AdministrationDepartmentEventRole,
  AdministrationDepartmentTenureItem,
} from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import type { EventPickerSelection } from '@/shared/ui/event-picker-modal/event-picker-modal'
import { EventPickerModal } from '@/shared/ui/event-picker-modal/event-picker-modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
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

/**
 * 부처에 연결된 역대 장관(재임) 목록 + **그 부처에 바로 장관 등록·수정**.
 *
 * 예전엔 읽기만 했고, 0건이면 블록 자체를 안 그렸다. 그래서 장관이 없는 부처는 "여기에
 * 장관을 넣는다"는 사실이 화면에 없었고, 넣으려면 역대 수반·인물 지면으로 건너가 부처를
 * 손으로 다시 골라야 했다. 부처가 이미 정해진 자리에서 끝나야 한다.
 */
export function DepartmentTenuresBlock({
  departmentId,
  countryId,
  historicalCountryId,
  departmentName,
}: {
  departmentId: string
  /** 등록 폼에 미리 채울 국가 */
  countryId?: string
  historicalCountryId?: string | null
  departmentName?: string
}) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [registerPersonId, setRegisterPersonId] = useState<string | null>(null)
  const [editingTenure, setEditingTenure] =
    useState<AdministrationDepartmentTenureItem | null>(null)

  const personsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })

  const closeRegister = () => {
    setRegisterPersonId(null)
    setEditingTenure(null)
    setPickerOpen(false)
  }

  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['administration-department-tenures', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getTenuresByDepartmentId(departmentId),
    enabled: !!departmentId,
  })
  if (isLoading) return null

  const formatName = (
    p: {
      name?: string
      surname?: string
      middleName?: string
      nameDisplayOrder?: string | null
      country?: { defaultNameDisplayOrder?: string | null } | null
    } | null,
  ) => {
    if (!p) return '—'
    return (
      getPersonDisplayName({
        name: p.name ?? '',
        surname: p.surname,
        middleName: p.middleName,
        nameDisplayOrder: p.nameDisplayOrder ?? null,
        country: p.country ?? undefined,
      }) ||
      p.name ||
      '—'
    )
  }

  const listEl = (
    <>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {tenures.slice(0, 12).map((tenure) => {
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
          return (
            <li
              key={tenure.id}
              style={{
                fontSize: 13,
                color: palette.sectionLabelTint,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {formatName(
                  tenure.person
                    ? {
                        name: tenure.person.name,
                        surname: tenure.person.surname ?? undefined,
                        middleName: tenure.person.middleName ?? undefined,
                        country:
                          (
                            tenure.person as {
                              country?: {
                                defaultNameDisplayOrder?: string | null
                              } | null
                            }
                          ).country ?? undefined,
                      }
                    : null,
                )}
              </span>
              <span style={{ color: palette.textMuted }}>
                {tenure.title ?? tenure.positionDefinition?.title ?? ''}
              </span>
              <span style={{ color: palette.textMuted, fontSize: 12 }}>
                {startLabel}–{endLabel}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditingTenure(tenure)}
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 7px',
                    fontSize: 11,
                    borderRadius: 6,
                    border: `1px solid ${palette.borderHairline}`,
                    background: palette.chipActionBg,
                    color: palette.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  수정
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {tenures.length > 12 && (
        <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 6 }}>
          외 {tenures.length - 12}명
        </div>
      )}
    </>
  )

  const activeTenurePersonId =
    editingTenure?.personId ??
    editingTenure?.person?.id ??
    registerPersonId ??
    null

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `1px solid ${isDark ? palette.border : palette.borderMid}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          fontWeight: 600,
          color: palette.textMuted,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        <span>소속 인사(재임)</span>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            borderRadius: 7,
            border: `1px solid ${palette.borderMid}`,
            background: 'transparent',
            color: palette.sectionLabelTint,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 0,
            textTransform: 'none',
            cursor: 'pointer',
          }}
        >
          + 장관 등록
        </button>
      </div>
      {tenures.length === 0 ? (
        <div style={{ fontSize: 12.5, color: palette.textMuted }}>
          이 부처에 등록된 인사가 없습니다.
        </div>
      ) : (
        listEl
      )}

      {pickerOpen && (
        <PersonSelectModal
          persons={personsQuery.data ?? []}
          selectedPersonId={registerPersonId ?? ''}
          loading={personsQuery.isLoading}
          title={`${departmentName ?? '부처'} 장관 등록 — 인물 선택`}
          searchPlaceholder="장관으로 등록할 인물을 검색..."
          defaultCountryId={countryId}
          onSelect={(personId) => {
            setRegisterPersonId(personId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {activeTenurePersonId && (
        <TenureRegisterPanel
          personId={activeTenurePersonId}
          tenureId={editingTenure?.id ?? null}
          open
          onClose={closeRegister}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['administration-department-tenures', departmentId],
            })
            closeRegister()
          }}
          initialCountryId={countryId}
          initialHistoricalCountryId={historicalCountryId ?? null}
          initialAdministrationDepartmentId={departmentId}
        />
      )}
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

/** 부처별 관련 사건(EventDepartmentRelation) — 사건 연결·역할 수정·연결 해제 */
export function DepartmentEventsBlock({
  departmentId,
}: {
  departmentId: string
}) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['administration-department-events', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getDepartmentEvents(departmentId),
    enabled: !!departmentId,
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingEvent, setPendingEvent] =
    useState<EventPickerSelection | null>(null)
  const [editingLink, setEditingLink] =
    useState<AdministrationDepartmentEvent | null>(null)
  const [role, setRole] = useState<AdministrationDepartmentEventRole>('PRINCIPAL')
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

  const outerStyle = {
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${isDark ? palette.border : palette.borderMid}`,
  } as const

  const addEventButton =
    !pendingEvent && !editingLink ? (
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: palette.accent,
          background: 'transparent',
          border: `1px solid ${palette.accent}`,
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        + 사건 연결
      </button>
    ) : null

  return (
    <div style={outerStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: palette.textMuted,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          관련 사건 · 정책
        </div>
        {addEventButton}
      </div>

      {pendingEvent && (
        <div
          style={{
            padding: 12,
            background: palette.bgSubtle,
            borderRadius: 10,
            border: `1px dashed ${isDark ? palette.borderHairline : palette.borderMid}`,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: palette.sectionLabelTint,
              marginBottom: 8,
            }}
          >
            연결할 사건: {pendingEvent.title}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
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
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    borderRadius: 7,
                    border: `1px solid ${active ? palette.accent : palette.borderMid}`,
                    background: active ? palette.accentBg : palette.chipActionBg,
                    color: active ? palette.accent : palette.sectionLabelTint,
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
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="역할 설명 (선택 — 예: 총통 지령 기안·하달)"
            style={{
              width: '100%',
              marginBottom: 8,
              padding: '7px 10px',
              border: `1px solid ${palette.borderMid}`,
              borderRadius: 8,
              fontSize: 12,
              background: palette.chipActionBg,
              color: isDark ? palette.text : 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleSaveLink()}
              disabled={busy}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: palette.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
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
                padding: '6px 14px',
                fontSize: 12,
                border: `1px solid ${palette.borderMid}`,
                borderRadius: 8,
                background: palette.chipActionBg,
                color: isDark ? palette.sectionLabelTint : 'inherit',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ fontSize: 12, color: palette.textMuted }}>불러오는 중…</div>
      ) : events.length === 0 ? (
        !pendingEvent && (
          <div style={{ fontSize: 12.5, color: palette.textMuted }}>
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
            gap: 8,
          }}
        >
          {events.map((deptEvent) => {
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
                  fontSize: 12,
                  color: palette.sectionLabelTint,
                  padding: '8px 10px',
                  background: palette.bgSubtle,
                  borderRadius: 8,
                  border: `1px solid ${isDark ? palette.border : palette.borderMid}`,
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
                    <div style={{ fontWeight: 600 }}>{deptEvent.event.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {DEPT_EVENT_ROLE_KEYS.map((roleKey) => {
                        const active = role === roleKey
                        return (
                          <button
                            key={roleKey}
                            type="button"
                            onClick={() => setRole(roleKey)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 11.5,
                              fontWeight: active ? 700 : 500,
                              borderRadius: 7,
                              border: `1px solid ${active ? palette.accent : palette.borderMid}`,
                              background: active
                                ? palette.accentBg
                                : palette.chipActionBg,
                              color: active
                                ? palette.accent
                                : palette.sectionLabelTint,
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
                      onChange={(e) => setRoleDescription(e.target.value)}
                      placeholder="역할 설명"
                      style={{
                        padding: '6px 10px',
                        border: `1px solid ${palette.borderMid}`,
                        borderRadius: 8,
                        fontSize: 12,
                        background: palette.chipActionBg,
                        color: isDark ? palette.text : 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => void handleSaveLink()}
                        disabled={busy}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: palette.accent,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
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
                          padding: '6px 12px',
                          fontSize: 12,
                          border: `1px solid ${palette.borderMid}`,
                          borderRadius: 8,
                          background: palette.chipActionBg,
                          color: isDark ? palette.sectionLabelTint : 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {deptEvent.event.title}
                      </span>
                      <span style={{ fontSize: 11, color: palette.textMuted }}>
                        {dateLabel}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: isDark
                            ? palette.btnHover
                            : palette.avatarBg,
                          color: palette.textMuted,
                        }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    {deptEvent.roleDescription && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: palette.textMuted,
                          lineHeight: 1.4,
                        }}
                      >
                        {deptEvent.roleDescription}
                      </div>
                    )}
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
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
                          padding: '4px 8px',
                          fontSize: 11,
                          border: `1px solid ${palette.borderHairline}`,
                          borderRadius: 6,
                          background: palette.chipActionBg,
                          color: isDark ? palette.sectionLabelTint : 'inherit',
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
                          padding: '4px 8px',
                          fontSize: 11,
                          border: `1px solid ${isDark ? 'rgba(225,29,72,0.4)' : '#fecaca'}`,
                          borderRadius: 6,
                          background: palette.dangerBg,
                          color: palette.danger,
                          cursor: 'pointer',
                        }}
                      >
                        연결 해제
                      </button>
                    </div>
                  </>
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
