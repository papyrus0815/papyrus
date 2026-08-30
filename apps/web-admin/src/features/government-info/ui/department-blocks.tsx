import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { AdministrationDepartmentEventType } from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'
import { getAllPersons } from '@/shared/api/persons'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { notify } from '@/shared/ui/toast'

/**
 * 부처에 연결된 역대 장관(재임) 목록 + **그 부처에 바로 장관 등록**.
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

  const personsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })

  const closeRegister = () => {
    setRegisterPersonId(null)
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
  const formatDate = (dateStr: string | null) =>
    dateStr ? dateStr.slice(0, 10).replace(/-/g, '.') : '—'
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
        {tenures.slice(0, 8).map((tenure) => (
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
              {tenure.positionDefinition?.title ?? tenure.title ?? ''}
            </span>
            <span style={{ color: palette.textMuted, fontSize: 12 }}>
              {formatDate(tenure.startDate)}–{formatDate(tenure.endDate)}
            </span>
          </li>
        ))}
      </ul>
      {tenures.length > 8 && (
        <div style={{ fontSize: 12, color: palette.textMuted, marginTop: 6 }}>
          외 {tenures.length - 8}명
        </div>
      )}
    </>
  )

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

      {registerPersonId && (
        <TenureRegisterPanel
          personId={registerPersonId}
          open
          onClose={closeRegister}
          onSuccess={() => {
            // 방금 넣은 장관이 이 목록에 바로 보이도록
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

const DEPT_EVENT_TYPE_LABEL: Record<string, string> = {
  PLAN: '계획',
  COORDINATION: '조율',
  POLICY: '정책',
  RESTRUCTURE: '개편',
  OTHER: '기타',
}

/** 부처별 기관 사건(몇 년 몇 월 몇 일 무슨 일) — API로 조회·등록·수정·삭제 */
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<
    | import('@/shared/api/administration-department').AdministrationDepartmentEvent
    | null
  >(null)
  const [eventForm, setEventForm] = useState<{
    title: string
    startDate: string | null
    endDate: string | null
    eventType: AdministrationDepartmentEventType
    description: string | null
  }>({
    title: '',
    startDate: null,
    endDate: null,
    eventType: 'OTHER',
    description: null,
  })
  const formatDate = (dateStr: string | null) =>
    dateStr ? dateStr.slice(0, 10).replace(/-/g, '.') : '—'
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['administration-department-events', departmentId],
    })

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      notify.error('제목을 입력해주세요.')
      return
    }
    try {
      if (editingEvent) {
        await administrationDepartmentApi.updateEvent(editingEvent.id, {
          title: eventForm.title.trim(),
          startDate: eventForm.startDate || null,
          endDate: eventForm.endDate || null,
          eventType: eventForm.eventType as AdministrationDepartmentEventType,
          description: eventForm.description?.trim() || null,
        })
        notify.success('수정되었습니다.')
      } else {
        await administrationDepartmentApi.createEvent({
          departmentId,
          title: eventForm.title.trim(),
          startDate: eventForm.startDate || null,
          endDate: eventForm.endDate || null,
          eventType: eventForm.eventType as AdministrationDepartmentEventType,
          description: eventForm.description?.trim() || null,
        })
        notify.success('등록되었습니다.')
      }
      invalidate()
      setShowAddForm(false)
      setEditingEvent(null)
      setEventForm({
        title: '',
        startDate: null,
        endDate: null,
        eventType: 'OTHER',
        description: null,
      })
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    }
  }

  const addEventButton =
    !showAddForm && !editingEvent ? (
      <button
        type="button"
        onClick={() => {
          setShowAddForm(true)
          setEventForm({
            title: '',
            startDate: null,
            endDate: null,
            eventType: 'OTHER',
            description: null,
          })
        }}
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
        + 사건 추가
      </button>
    ) : null

  const outerStyle = {
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${isDark ? palette.border : palette.borderMid}`,
  } as const

  const eventsBody = (
    <>
      {isLoading ? (
        <div style={{ fontSize: 12, color: palette.textMuted }}>불러오는 중…</div>
      ) : (
        <>
          {events.length > 0 && (
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
              {events.map((deptEvent) => (
                <li
                  key={deptEvent.id}
                  style={{
                    fontSize: 12,
                    color: palette.sectionLabelTint,
                    padding: '8px 10px',
                    background: palette.bgSubtle,
                    borderRadius: 8,
                    border: `1px solid ${isDark ? palette.border : palette.borderMid}`,
                  }}
                >
                  {editingEvent?.id === deptEvent.id ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <input
                        value={eventForm.title}
                        onChange={(changeEvent) =>
                          setEventForm((prevForm) => ({
                            ...prevForm,
                            title: changeEvent.target.value,
                          }))
                        }
                        placeholder="제목"
                        style={{
                          padding: '6px 10px',
                          border: `1px solid ${palette.borderMid}`,
                          borderRadius: 8,
                          fontSize: 13,
                          background: palette.chipActionBg,
                          color: isDark ? palette.text : 'inherit',
                        }}
                      />
                      <div
                        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                      >
                        <input
                          type="date"
                          value={eventForm.startDate ?? ''}
                          onChange={(changeEvent) =>
                            setEventForm((prevForm) => ({
                              ...prevForm,
                              startDate: changeEvent.target.value || null,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            border: `1px solid ${palette.borderMid}`,
                            borderRadius: 8,
                            fontSize: 12,
                            background: palette.chipActionBg,
                            color: isDark ? palette.text : 'inherit',
                          }}
                        />
                        <input
                          type="date"
                          value={eventForm.endDate ?? ''}
                          onChange={(changeEvent) =>
                            setEventForm((prevForm) => ({
                              ...prevForm,
                              endDate: changeEvent.target.value || null,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            border: `1px solid ${palette.borderMid}`,
                            borderRadius: 8,
                            fontSize: 12,
                            background: palette.chipActionBg,
                            color: isDark ? palette.text : 'inherit',
                          }}
                        />
                        <select
                          value={eventForm.eventType}
                          onChange={(changeEvent) =>
                            setEventForm((prevForm) => ({
                              ...prevForm,
                              eventType: changeEvent.target
                                .value as AdministrationDepartmentEventType,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            border: `1px solid ${palette.borderMid}`,
                            borderRadius: 8,
                            fontSize: 12,
                            background: palette.chipActionBg,
                            color: isDark ? palette.text : 'inherit',
                          }}
                        >
                          {Object.entries(DEPT_EVENT_TYPE_LABEL).map(
                            ([eventTypeKey, eventTypeLabel]) => (
                              <option key={eventTypeKey} value={eventTypeKey}>
                                {eventTypeLabel}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <textarea
                        value={eventForm.description ?? ''}
                        onChange={(changeEvent) =>
                          setEventForm((prevForm) => ({
                            ...prevForm,
                            description: changeEvent.target.value || null,
                          }))
                        }
                        placeholder="내용"
                        rows={2}
                        style={{
                          padding: '6px 10px',
                          border: `1px solid ${palette.borderMid}`,
                          borderRadius: 8,
                          fontSize: 12,
                          resize: 'vertical',
                          background: palette.chipActionBg,
                          color: isDark ? palette.text : 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleSaveEvent}
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
                          onClick={() => {
                            setEditingEvent(null)
                            setEventForm({
                              title: '',
                              startDate: null,
                              endDate: null,
                              eventType: 'OTHER',
                              description: null,
                            })
                          }}
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
                          {deptEvent.title}
                        </span>
                        <span style={{ fontSize: 11, color: palette.textMuted }}>
                          {formatDate(deptEvent.startDate)}–
                          {formatDate(deptEvent.endDate)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: isDark ? palette.btnHover : palette.avatarBg,
                            color: palette.textMuted,
                          }}
                        >
                          {DEPT_EVENT_TYPE_LABEL[deptEvent.eventType] ??
                            deptEvent.eventType}
                        </span>
                      </div>
                      {deptEvent.description && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: palette.textMuted,
                            lineHeight: 1.4,
                          }}
                        >
                          {deptEvent.description.slice(0, 80)}
                          {deptEvent.description.length > 80 ? '…' : ''}
                        </div>
                      )}
                      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(deptEvent)
                            setEventForm({
                              title: deptEvent.title,
                              startDate: deptEvent.startDate
                                ? deptEvent.startDate.slice(0, 10)
                                : null,
                              endDate: deptEvent.endDate
                                ? deptEvent.endDate.slice(0, 10)
                                : null,
                              eventType: deptEvent.eventType,
                              description: deptEvent.description,
                            })
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
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: '삭제 확인',
                                message: '이 사건을 삭제하시겠습니까?',
                                danger: true,
                              })
                            )
                              administrationDepartmentApi
                                .deleteEvent(deptEvent.id)
                                .then(invalidate)
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
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {(showAddForm || (events.length === 0 && !showAddForm)) &&
            showAddForm && (
              <div
                style={{
                  padding: 12,
                  background: palette.bgSubtle,
                  borderRadius: 10,
                  border: `1px dashed ${isDark ? palette.borderHairline : palette.borderMid}`,
                  marginTop: 8,
                }}
              >
                <input
                  value={eventForm.title}
                  onChange={(changeEvent) =>
                    setEventForm((prevForm) => ({
                      ...prevForm,
                      title: changeEvent.target.value,
                    }))
                  }
                  placeholder="제목 *"
                  style={{
                    width: '100%',
                    marginBottom: 8,
                    padding: '8px 12px',
                    border: `1px solid ${palette.borderMid}`,
                    borderRadius: 8,
                    fontSize: 13,
                    background: palette.chipActionBg,
                    color: isDark ? palette.text : 'inherit',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="date"
                    value={eventForm.startDate ?? ''}
                    onChange={(changeEvent) =>
                      setEventForm((prevForm) => ({
                        ...prevForm,
                        startDate: changeEvent.target.value || null,
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${palette.borderMid}`,
                      borderRadius: 8,
                      fontSize: 12,
                      background: palette.chipActionBg,
                      color: isDark ? palette.text : 'inherit',
                    }}
                  />
                  <input
                    type="date"
                    value={eventForm.endDate ?? ''}
                    onChange={(changeEvent) =>
                      setEventForm((prevForm) => ({
                        ...prevForm,
                        endDate: changeEvent.target.value || null,
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${palette.borderMid}`,
                      borderRadius: 8,
                      fontSize: 12,
                      background: palette.chipActionBg,
                      color: isDark ? palette.text : 'inherit',
                    }}
                  />
                  <select
                    value={eventForm.eventType}
                    onChange={(changeEvent) =>
                      setEventForm((prevForm) => ({
                        ...prevForm,
                        eventType: changeEvent.target
                          .value as AdministrationDepartmentEventType,
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${palette.borderMid}`,
                      borderRadius: 8,
                      fontSize: 12,
                      background: palette.chipActionBg,
                      color: isDark ? palette.text : 'inherit',
                    }}
                  >
                    {Object.entries(DEPT_EVENT_TYPE_LABEL).map(
                      ([eventTypeKey, eventTypeLabel]) => (
                        <option key={eventTypeKey} value={eventTypeKey}>
                          {eventTypeLabel}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <textarea
                  value={eventForm.description ?? ''}
                  onChange={(changeEvent) =>
                    setEventForm((prevForm) => ({
                      ...prevForm,
                      description: changeEvent.target.value || null,
                    }))
                  }
                  placeholder="내용 (몇 년 몇 월 몇 일 무슨 일)"
                  rows={2}
                  style={{
                    width: '100%',
                    marginBottom: 8,
                    padding: '8px 12px',
                    border: `1px solid ${palette.borderMid}`,
                    borderRadius: 8,
                    fontSize: 12,
                    resize: 'vertical',
                    background: palette.chipActionBg,
                    color: isDark ? palette.text : 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSaveEvent}
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
                    등록
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEventForm({
                        title: '',
                        startDate: null,
                        endDate: null,
                        eventType: 'OTHER',
                        description: null,
                      })
                    }}
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
        </>
      )}
    </>
  )

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
          기관 사건 (연월일·내용)
        </div>
        {addEventButton}
      </div>
      {eventsBody}
    </div>
  )
}
