import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCalendar, FiPlus, FiSave, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  EVENT_DOMAIN_ORDER,
  EVENT_DOMAINS,
  type EventDomainKey,
} from '@/entities/event/model/event-domain'
import {
  EVENT_TYPES,
  type EventTypeKey,
  subtypesForDomain,
} from '@/entities/event/model/event-type-registry'
import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerOverlay,
  ledgerScrim,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getApiConnection } from '@/shared/api/client'
import { getAllCountries } from '@/shared/api/countries'
import {
  CADENCE_PRESETS,
  createEventSeries,
  type EventSeriesCadenceKind,
  type EventSeriesDetail,
  type EventSeriesItem,
  type EventSeriesNextState,
  type EventSeriesStatus,
  updateEventSeries,
} from '@/shared/api/event-series'
import { getOrganizations, ORGANIZATION_TYPE_LABEL } from '@/shared/api/organizations'
import { Z_INDEX } from '@/shared/styles/z-index'
import { notify } from '@/shared/ui/toast'

interface EventSeriesFormModalProps {
  initialSeries?: EventSeriesItem | null
  defaultOrganizationId?: string | null
  defaultTitle?: string
  defaultDomain?: EventDomainKey
  defaultEventType?: EventTypeKey | null
  onClose: () => void
  onSaved: (saved: EventSeriesDetail) => void
}

const NEXT_STATE_OPTIONS: Array<{
  value: EventSeriesNextState
  label: string
  hint: string
}> = [
  {
    value: 'AUTO',
    label: '주기 규칙으로 자동 추산',
    hint: '가장 최근 회차와 개최 주기(매년·2년마다·연 2회 등)를 바탕으로 다음 개최 시점을 자동 계산합니다.',
  },
  {
    value: 'CONFIRMED',
    label: '차기 일정·개최지 확정',
    hint: '공동성명·사무국 발표로 다음 개최 연·월·의장국이 확정된 경우 직접 지정합니다.',
  },
  {
    value: 'POSTPONED',
    label: '차기 회의 연기',
    hint: '원래 예정 시점에서 연기되었음을 안내합니다.',
  },
  {
    value: 'TBD',
    label: '차기 일정 미정 (TBD)',
    hint: '개최 시점·장소가 아직 정해지지 않았음을 표시합니다.',
  },
]

const STATUS_OPTIONS: Array<{ value: EventSeriesStatus; label: string }> = [
  { value: 'ACTIVE', label: '운영 중' },
  { value: 'SUSPENDED', label: '일시 중단' },
  { value: 'ENDED', label: '폐지·종료' },
]

function parsePositiveIntOrNull(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function EventSeriesFormModal({
  initialSeries = null,
  defaultOrganizationId = null,
  defaultTitle = '',
  defaultDomain = 'DIPLOMACY',
  defaultEventType = 'SUMMIT',
  onClose,
  onSaved,
}: EventSeriesFormModalProps) {
  const isEdit = Boolean(initialSeries)
  const queryClient = useQueryClient()

  const [title, setTitle] = useState(initialSeries?.title ?? defaultTitle)
  const [shortTitle, setShortTitle] = useState(initialSeries?.shortTitle ?? '')
  const [organizationId, setOrganizationId] = useState(
    initialSeries?.organizationId ?? defaultOrganizationId ?? '',
  )
  const [domain, setDomain] = useState<EventDomainKey>(
    initialSeries?.defaultDomain ?? defaultDomain,
  )
  const [eventType, setEventType] = useState<EventTypeKey | ''>(
    initialSeries?.defaultEventType ?? defaultEventType ?? 'SUMMIT',
  )
  const [cadenceKind, setCadenceKind] = useState<EventSeriesCadenceKind>(
    initialSeries?.cadenceKind ?? 'PERIODIC',
  )
  const [intervalMonths, setIntervalMonths] = useState<string>(
    initialSeries?.intervalMonths != null
      ? String(initialSeries.intervalMonths)
      : '12',
  )
  const [typicalMonth, setTypicalMonth] = useState<string>(
    initialSeries?.typicalMonth != null ? String(initialSeries.typicalMonth) : '',
  )
  const [typicalMonthSecondary, setTypicalMonthSecondary] = useState<string>(
    initialSeries?.typicalMonthSecondary != null
      ? String(initialSeries.typicalMonthSecondary)
      : '',
  )
  const [hostRotationRule, setHostRotationRule] = useState(
    initialSeries?.hostRotationRule ?? '',
  )
  const [hostRotationEnabled, setHostRotationEnabled] = useState<boolean>(
    Boolean(initialSeries?.hostRotationEnabled),
  )
  const [hostRotationCountryIds, setHostRotationCountryIds] = useState<
    string[]
  >(initialSeries?.hostRotationCountryIds ?? [])
  const [status, setStatus] = useState<EventSeriesStatus>(
    initialSeries?.status ?? 'ACTIVE',
  )
  const [startedYear, setStartedYear] = useState(
    initialSeries?.startedYear != null ? String(initialSeries.startedYear) : '',
  )
  const [endedYear, setEndedYear] = useState(
    initialSeries?.endedYear != null ? String(initialSeries.endedYear) : '',
  )
  const [description, setDescription] = useState(
    initialSeries?.description ?? '',
  )

  // 차기 일정 안내·오버라이드
  const [nextScheduleState, setNextScheduleState] =
    useState<EventSeriesNextState>(initialSeries?.nextScheduleState ?? 'AUTO')
  const [nextEditionNumber, setNextEditionNumber] = useState(
    initialSeries?.nextEditionNumber != null
      ? String(initialSeries.nextEditionNumber)
      : '',
  )
  const [nextYear, setNextYear] = useState(
    initialSeries?.nextYear != null ? String(initialSeries.nextYear) : '',
  )
  const [nextMonth, setNextMonth] = useState(
    initialSeries?.nextMonth != null ? String(initialSeries.nextMonth) : '',
  )
  const [nextDay, setNextDay] = useState(
    initialSeries?.nextDay != null ? String(initialSeries.nextDay) : '',
  )
  const [nextHostCountryId, setNextHostCountryId] = useState(
    initialSeries?.nextHostCountryId ?? '',
  )
  const [nextLocation, setNextLocation] = useState(
    initialSeries?.nextLocation ?? '',
  )
  const [nextNote, setNextNote] = useState(initialSeries?.nextNote ?? '')

  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'for-event-series-modal'],
    queryFn: () =>
      getOrganizations(getApiConnection(), { excludeCompanies: true }),
    staleTime: 60_000,
  })

  const countriesQuery = useQuery({
    queryKey: ['countries-all', 'for-event-series-modal'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const parsedInterval = parsePositiveIntOrNull(intervalMonths)
  const subtypeChoices = (() => {
    const { primary, rest } = subtypesForDomain(domain)
    return [...primary, ...rest]
  })()

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        shortTitle: shortTitle.trim() || null,
        description: description.trim() || null,
        organizationId: organizationId || null,
        defaultDomain: domain,
        defaultEventType: (eventType || null) as EventTypeKey | null,
        cadenceKind,
        intervalMonths:
          cadenceKind === 'PERIODIC' ? (parsedInterval ?? 12) : null,
        typicalMonth:
          cadenceKind === 'PERIODIC' ? parsePositiveIntOrNull(typicalMonth) : null,
        typicalMonthSecondary:
          cadenceKind === 'PERIODIC' && parsedInterval === 6
            ? parsePositiveIntOrNull(typicalMonthSecondary)
            : null,
        hostRotationRule: hostRotationRule.trim() || null,
        hostRotationEnabled,
        hostRotationCountryIds:
          hostRotationEnabled && hostRotationCountryIds.length > 0
            ? hostRotationCountryIds
            : null,
        status,
        startedEra: parsePositiveIntOrNull(startedYear) ? ('AD' as const) : null,
        startedYear: parsePositiveIntOrNull(startedYear),
        endedEra: parsePositiveIntOrNull(endedYear) ? ('AD' as const) : null,
        endedYear: parsePositiveIntOrNull(endedYear),
        nextScheduleState,
        nextEditionNumber: parsePositiveIntOrNull(nextEditionNumber),
        nextYear: parsePositiveIntOrNull(nextYear),
        nextMonth: parsePositiveIntOrNull(nextMonth),
        nextDay: parsePositiveIntOrNull(nextDay),
        nextHostCountryId: nextHostCountryId || null,
        nextLocation: nextLocation.trim() || null,
        nextNote: nextNote.trim() || null,
      }
      return isEdit && initialSeries
        ? updateEventSeries(initialSeries.id, payload)
        : createEventSeries(payload)
    },
    onSuccess: (saved) => {
      notify.success(
        isEdit
          ? `‘${saved.title}’ 정기 시리즈 설정을 저장했습니다.`
          : `‘${saved.title}’ 정기 시리즈를 등록했습니다.`,
      )
      void queryClient.invalidateQueries({ queryKey: ['event-series'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      onSaved(saved)
    },
    onError: (err) =>
      notify.error(
        err instanceof Error ? err.message : '정기 시리즈 저장에 실패했습니다.',
      ),
  })

  const activePresetHint =
    CADENCE_PRESETS.find(
      (preset) =>
        preset.cadenceKind === cadenceKind &&
        preset.intervalMonths === (cadenceKind === 'PERIODIC' ? parsedInterval : null),
    )?.hint ?? '개최 주기를 지정하면 마지막 회차 이후 다음 개최 예상 시점을 자동으로 안내합니다.'

  const activeNextStateHint =
    NEXT_STATE_OPTIONS.find((opt) => opt.value === nextScheduleState)?.hint ?? ''

  return createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <FiCalendar size={17} />
            {isEdit ? '정기 회의·행사 시리즈 설정' : '새 정기 회의·행사 시리즈 등록'}
          </Title>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </CloseBtn>
        </Header>

        <Body>
          <Field>
            <FieldLabel>시리즈 공식 명칭 *</FieldLabel>
            <BigInput
              aria-label="시리즈 공식 명칭"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 아세안 정상회의, APEC 정상회의, 쿼드 정상회의, WTO 각료회의"
              autoFocus
            />
          </Field>

          <CondRow>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                약칭 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={shortTitle}
                onChange={(e) => setShortTitle(e.target.value)}
                placeholder="예: ASEAN Summit, ASEM"
              />
            </Field>
            <Field style={{ flex: 1.4, minWidth: 200 }}>
              <FieldLabel>
                주관 국제기구·다자협의체 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigSelect
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                <option value="">미지정 (단독 시리즈)</option>
                {(organizationsQuery.data ?? []).map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                    {org.shortName ? ` (${org.shortName})` : ''} ·{' '}
                    {ORGANIZATION_TYPE_LABEL[org.type] ?? org.type}
                  </option>
                ))}
              </BigSelect>
            </Field>
          </CondRow>

          <SectionDivider>개최 주기 · 의장국 규칙</SectionDivider>

          <Field>
            <FieldLabel>개최 주기 선택</FieldLabel>
            <ChipRow>
              {CADENCE_PRESETS.map((preset) => {
                const active =
                  preset.cadenceKind === cadenceKind &&
                  (preset.cadenceKind === 'IRREGULAR' ||
                    preset.intervalMonths === parsedInterval)
                return (
                  <PresetChip
                    key={preset.label}
                    type="button"
                    $active={active}
                    onClick={() => {
                      setCadenceKind(preset.cadenceKind)
                      if (preset.intervalMonths != null) {
                        setIntervalMonths(String(preset.intervalMonths))
                      } else {
                        setIntervalMonths('')
                      }
                    }}
                  >
                    {preset.label}
                  </PresetChip>
                )
              })}
            </ChipRow>
            <HintText>{activePresetHint}</HintText>
          </Field>

          {cadenceKind === 'PERIODIC' && (
            <CondRow>
              <Field style={{ flex: 1, minWidth: 130 }}>
                <FieldLabel>주기 (개월 단위 직접 조정)</FieldLabel>
                <BigInput
                  type="number"
                  min={1}
                  max={1200}
                  value={intervalMonths}
                  onChange={(e) => setIntervalMonths(e.target.value)}
                  placeholder="예: 24 (=2년마다)"
                />
              </Field>
              <Field style={{ flex: 1, minWidth: 130 }}>
                <FieldLabel>
                  {parsedInterval === 6 ? '상반기 통상 개최월' : '통상 개최월'}{' '}
                  <Muted>(선택)</Muted>
                </FieldLabel>
                <BigSelect
                  value={typicalMonth}
                  onChange={(e) => setTypicalMonth(e.target.value)}
                >
                  <option value="">미지정</option>
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      {m}월경
                    </option>
                  ))}
                </BigSelect>
              </Field>
              {parsedInterval === 6 && (
                <Field style={{ flex: 1, minWidth: 130 }}>
                  <FieldLabel>
                    하반기 통상 개최월 <Muted>(선택)</Muted>
                  </FieldLabel>
                  <BigSelect
                    value={typicalMonthSecondary}
                    onChange={(e) => setTypicalMonthSecondary(e.target.value)}
                  >
                    <option value="">미지정</option>
                    {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                      <option key={m} value={String(m)}>
                        {m}월경
                      </option>
                    ))}
                  </BigSelect>
                </Field>
              )}
            </CondRow>
          )}

          <CondRow>
            <Field style={{ flex: 1.5, minWidth: 200 }}>
              <FieldLabel>
                의장국·개최지 순번 규칙 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={hostRotationRule}
                onChange={(e) => setHostRotationRule(e.target.value)}
                placeholder="예: 회원국 영문 알파벳 순 의장국 수임 / 아시아·유럽 교차 개최"
              />
            </Field>
            <Field style={{ flex: 0.8, minWidth: 120 }}>
              <FieldLabel>운영 상태</FieldLabel>
              <BigSelect
                value={status}
                onChange={(e) => setStatus(e.target.value as EventSeriesStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </BigSelect>
            </Field>
          </CondRow>

          <RotationToggleBox>
            <RotationCheckLabel>
              <input
                type="checkbox"
                checked={hostRotationEnabled}
                onChange={(e) => setHostRotationEnabled(e.target.checked)}
              />
              <span>
                순환 의장국 자동 추론 켜기{' '}
                <Muted>
                  (직전 개최국 다음 순번 국가를 차기 예상 의장국으로 자동 안내)
                </Muted>
              </span>
            </RotationCheckLabel>

            {hostRotationEnabled && (
              <RotationQueueWrap>
                <HintText>
                  아래 순번을 비워 두면 주관 기구의 창립국·정회원국 등록 순서를 자동으로 따릅니다. (연 2회 개최 시리즈는 같은 해 상·하반기에 동일 의장국을 유지하고 이듬해 다음 국가로 순환)
                </HintText>
                <RotationQueueChips>
                  {hostRotationCountryIds.map((cid, idx) => {
                    const country = (countriesQuery.data ?? []).find(
                      (c) => c.id === cid,
                    )
                    return (
                      <RotationChip key={cid}>
                        <span>
                          {idx + 1}. {country?.flagEmoji ? `${country.flagEmoji} ` : ''}
                          {country?.name ?? cid}
                        </span>
                        <RotationChipRemove
                          type="button"
                          aria-label={`${country?.name ?? '국가'} 순번 제거`}
                          onClick={() =>
                            setHostRotationCountryIds((prev) =>
                              prev.filter((item) => item !== cid),
                            )
                          }
                        >
                          ×
                        </RotationChipRemove>
                      </RotationChip>
                    )
                  })}
                  <BigSelect
                    aria-label="의장국 순번 국가 추가"
                    value=""
                    onChange={(e) => {
                      const picked = e.target.value
                      if (!picked) return
                      setHostRotationCountryIds((prev) =>
                        prev.includes(picked) ? prev : [...prev, picked],
                      )
                    }}
                    style={{ height: 30, fontSize: 12, maxWidth: 210 }}
                  >
                    <option value="">
                      {hostRotationCountryIds.length === 0
                        ? '+ 커스텀 순번 국가 지정 (선택)…'
                        : '+ 다음 순번 국가 추가…'}
                    </option>
                    {(countriesQuery.data ?? [])
                      .filter((c) => !hostRotationCountryIds.includes(c.id))
                      .map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                          {country.name}
                        </option>
                      ))}
                  </BigSelect>
                </RotationQueueChips>
              </RotationQueueWrap>
            )}
          </RotationToggleBox>

          <SectionDivider>차기 개최 안내 · 수동 확정 (선택)</SectionDivider>

          <Field>
            <FieldLabel>다음 회차 안내 방식</FieldLabel>
            <ChipRow>
              {NEXT_STATE_OPTIONS.map((opt) => (
                <PresetChip
                  key={opt.value}
                  type="button"
                  $active={nextScheduleState === opt.value}
                  onClick={() => setNextScheduleState(opt.value)}
                >
                  {opt.label}
                </PresetChip>
              ))}
            </ChipRow>
            <HintText>{activeNextStateHint}</HintText>
          </Field>

          <CondRow>
            <Field style={{ flex: 0.8, minWidth: 100 }}>
              <FieldLabel>
                차기 회차 번호 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                type="number"
                min={1}
                value={nextEditionNumber}
                onChange={(e) => setNextEditionNumber(e.target.value)}
                placeholder="자동 (+1)"
              />
            </Field>
            <Field style={{ flex: 0.9, minWidth: 110 }}>
              <FieldLabel>
                차기 연도 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                type="number"
                min={1}
                max={9999}
                value={nextYear}
                onChange={(e) => setNextYear(e.target.value)}
                placeholder="예: 2027"
              />
            </Field>
            <Field style={{ flex: 0.7, minWidth: 95 }}>
              <FieldLabel>
                차기 월 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigSelect
                value={nextMonth}
                onChange={(e) => setNextMonth(e.target.value)}
              >
                <option value="">미정</option>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                  <option key={m} value={String(m)}>
                    {m}월
                  </option>
                ))}
              </BigSelect>
            </Field>
            <Field style={{ flex: 0.7, minWidth: 85 }}>
              <FieldLabel>
                차기 일 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                type="number"
                min={1}
                max={31}
                value={nextDay}
                onChange={(e) => setNextDay(e.target.value)}
                placeholder="일"
              />
            </Field>
          </CondRow>

          <CondRow>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                차기 주최·의장국 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigSelect
                value={nextHostCountryId}
                onChange={(e) => setNextHostCountryId(e.target.value)}
              >
                <option value="">미정</option>
                {(countriesQuery.data ?? []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.flagEmoji ? `${country.flagEmoji} ` : ''}
                    {country.name}
                  </option>
                ))}
              </BigSelect>
            </Field>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                차기 개최 도시·장소 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                value={nextLocation}
                onChange={(e) => setNextLocation(e.target.value)}
                placeholder="예: 싱가포르, 마닐라, 경주"
              />
            </Field>
          </CondRow>

          <Field>
            <FieldLabel>
              차기 일정 안내 메모 <Muted>(선택 — 연기 사유·개최지 예고 등)</Muted>
            </FieldLabel>
            <BigInput
              value={nextNote}
              onChange={(e) => setNextNote(e.target.value)}
              placeholder="예: 2025년 정상선언에서 2027년 상반기 개최 합의"
            />
          </Field>

          <SectionDivider>신규 회차 사건 등록 기본값</SectionDivider>

          <CondRow>
            <Field style={{ flex: 1, minWidth: 150 }}>
              <FieldLabel>기본 분야</FieldLabel>
              <BigSelect
                value={domain}
                onChange={(e) => setDomain(e.target.value as EventDomainKey)}
              >
                {EVENT_DOMAIN_ORDER.map((dKey) => (
                  <option key={dKey} value={dKey}>
                    {EVENT_DOMAINS[dKey].label}
                  </option>
                ))}
              </BigSelect>
            </Field>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>기본 세부 분야</FieldLabel>
              <BigSelect
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventTypeKey | '')}
              >
                <option value="">세부 없음</option>
                {subtypeChoices.map((tKey) => (
                  <option key={tKey} value={tKey}>
                    {EVENT_TYPES[tKey].label}
                  </option>
                ))}
              </BigSelect>
            </Field>
            <Field style={{ flex: 0.7, minWidth: 95 }}>
              <FieldLabel>
                첫 개최 연도 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigInput
                type="number"
                min={1}
                max={9999}
                value={startedYear}
                onChange={(e) => setStartedYear(e.target.value)}
                placeholder="예: 1976"
              />
            </Field>
            {status === 'ENDED' && (
              <Field style={{ flex: 0.7, minWidth: 95 }}>
                <FieldLabel>종료 연도</FieldLabel>
                <BigInput
                  type="number"
                  min={1}
                  max={9999}
                  value={endedYear}
                  onChange={(e) => setEndedYear(e.target.value)}
                  placeholder="예: 2020"
                />
              </Field>
            )}
          </CondRow>

          <Field>
            <FieldLabel>
              시리즈 설명 <Muted>(선택)</Muted>
            </FieldLabel>
            <BigTextarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="시리즈 출범 배경, 의제 범위, 참가 대상 등"
            />
          </Field>

          <PrimaryBtn
            type="button"
            disabled={!title.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {isEdit ? <FiSave size={15} /> : <FiPlus size={15} />}
            {isEdit ? '시리즈 설정 저장' : '정기 시리즈 만들기'}
          </PrimaryBtn>
        </Body>
      </Modal>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: ${({ theme }) => ledgerScrim(theme.mode)};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const Modal = styled.div`
  width: min(640px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerOverlay(theme.mode)};
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 13px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const Title = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px;
  border-radius: ${RADIUS.SM};
  display: inline-flex;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SectionDivider = styled.div`
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const CondRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const FieldLabel = styled.label`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const PresetChip = styled.button<{ $active: boolean }>`
  padding: 4px 10px;
  border-radius: ${RADIUS.SM};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  transition: border-color 0.12s, color 0.12s, background 0.12s;
  &:hover {
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const HintText = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.45;
`

const BigInput = styled.input`
  height: 35px;
  padding: 0 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BigSelect = styled.select`
  height: 35px;
  padding: 0 9px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BigTextarea = styled.textarea`
  padding: 9px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const PrimaryBtn = styled.button`
  margin-top: 6px;
  height: 38px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#0e0f12' : '#ffffff')};
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const RotationToggleBox = styled.div`
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.secondary};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RotationCheckLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  input {
    cursor: pointer;
  }
`

const RotationQueueWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 6px;
  border-top: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const RotationQueueChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const RotationChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const RotationChipRemove = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  opacity: 0.75;
  &:hover {
    opacity: 1;
  }
`
