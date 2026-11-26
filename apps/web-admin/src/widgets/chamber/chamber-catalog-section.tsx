/**
 * 의회 — 원(院) 카탈로그 섹션. 정체 탭 아래에서 그 나라의 원과 정원 이력을 보고 고친다(B7).
 *
 * 원은 선거·정체·정당 의석이 가리키는 정본이다. 정원은 원에 붙은 이력 — 선거법이 바뀔 때마다 한 줄.
 *
 * 모양은 바로 위 헌정 체제 연혁과 같은 문법 — 왼쪽 연도 칸(개원 크게 · 폐지 작게), 본문은 넓으면 두 칸
 * (원 이름 · 구성 | 정원 이력), 행 사이는 가는 선. 원 이름이 위 체제 이름과 같은 세로줄에 선다.
 * 예전엔 굵은 검은 밑줄 머리 · 행마다 연필/휴지통 아이콘이 따로 놀았다 — 고치기·정원 추가·지우기는 ⋯ 안에.
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCornerDownRight, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { DIGIT_DISPLAY, ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import { GovMorePopover } from '@/features/government-info/ui/gov-more-popover'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  CHAMBER_COMPOSITION_OPTIONS,
  CHAMBER_ROLE_OPTIONS,
  type ChamberComposition,
  type ChamberDto,
  type ChamberInput,
  type ChamberRole,
  type ChamberSizeDto,
  type ChamberSizeInput,
  chamberApi,
  chamberKeys,
  labelChamberComposition,
  labelChamberRole,
} from '@/shared/api/chamber'
import {
  EMPTY_PERIOD_DATE,
  type PeriodDateFormValue,
  formatPeriodLabel,
  isPeriodFormInverted,
  periodDateFormError,
  periodDateFormValue,
  structuredInputOf,
} from '@/shared/lib/party-dates'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import * as FormS from '@/widgets/country/country-detail/ui/military-unit-form/styles'
import { FactBadge, FactNote, ModalFooter, PeriodPair } from '@/widgets/political-party/party-sidecar-parts'

const ROLE_ORDER: Record<ChamberRole, number> = { UNICAMERAL: 0, LOWER: 1, UPPER: 2, ADVISORY: 3, OTHER: 4 }

const signedYear = (era: string | null | undefined, year: number | null | undefined) =>
  year == null ? null : era === 'BC' ? -year : year

/** 원이 언제부터인가 — 개원, 모르면 가장 이른 정원 이력, 그것도 없으면 맨 뒤 */
export function chamberSinceKey(chamber: Pick<ChamberDto, 'startEra' | 'startYear' | 'sizes'>): number {
  const own = signedYear(chamber.startEra, chamber.startYear)
  if (own != null) return own
  const fromSizes = chamber.sizes
    .map((size) => signedYear(size.startEra, size.startYear))
    .filter((year): year is number => year != null)
  return fromSizes.length > 0 ? Math.min(...fromSizes) : Number.POSITIVE_INFINITY
}

const yearLabel = (era: string | null | undefined, year: number | null | undefined) =>
  year == null ? null : era === 'BC' ? `기원전 ${year}` : String(year)

/**
 * 연도 칸 — 원 자신의 개원·폐지. 개원을 모르면 가장 이른 정원 이력의 시작,
 * 폐지를 모르면 정원 이력이 모두 끝났을 때만 그 마지막 끝(하나라도 열려 있으면 비운다 — '현재'라고 단정하지 않는다).
 */
function chamberYearSpan(chamber: ChamberDto): { start: string | null; end: string | null } {
  const bySignedStart = [...chamber.sizes]
    .filter((size) => size.startYear != null)
    .sort((left, right) => (signedYear(left.startEra, left.startYear) ?? 0) - (signedYear(right.startEra, right.startYear) ?? 0))
  const start =
    yearLabel(chamber.startEra, chamber.startYear) ??
    (bySignedStart[0] ? yearLabel(bySignedStart[0].startEra, bySignedStart[0].startYear) : null)

  let end = yearLabel(chamber.endEra, chamber.endYear)
  if (!end && chamber.sizes.length > 0 && chamber.sizes.every((size) => size.endYear != null)) {
    const latest = [...chamber.sizes].sort(
      (left, right) => (signedYear(right.endEra, right.endYear) ?? 0) - (signedYear(left.endEra, left.endYear) ?? 0),
    )[0]
    end = yearLabel(latest.endEra, latest.endYear)
  }
  return { start, end }
}

export function ChamberCatalogSection({
  countryId,
  historicalCountryId,
}: {
  countryId?: string | null
  historicalCountryId?: string | null
}) {
  const queryClient = useQueryClient()
  const scope = { countryId: historicalCountryId ? null : countryId, historicalCountryId }
  const listKey = chamberKeys.list(scope)
  const { data: chambers = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => chamberApi.list(scope),
    enabled: Boolean(countryId || historicalCountryId),
  })
  const [chamberModal, setChamberModal] = useState<{ mode: 'create' } | { mode: 'edit'; chamber: ChamberDto } | null>(null)
  const [sizeModal, setSizeModal] = useState<{ chamber: ChamberDto; size?: ChamberSizeDto } | null>(null)
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['chambers'] })
    void queryClient.invalidateQueries({ queryKey: ['political-systems'] })
  }

  const saveChamber = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ChamberInput }) =>
      id ? chamberApi.update(id, body) : chamberApi.create(body),
    onSuccess: (_row, variables) => {
      invalidate()
      setChamberModal(null)
      notify.success(variables.id ? '원을 고쳤습니다.' : '원을 추가했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const removeChamber = useMutation({
    mutationFn: (id: string) => chamberApi.remove(id),
    onSuccess: () => {
      invalidate()
      notify.success('원을 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const saveSize = useMutation({
    mutationFn: ({ chamberId, sizeId, body }: { chamberId: string; sizeId?: string; body: ChamberSizeInput }) =>
      sizeId ? chamberApi.updateSize(chamberId, sizeId, body) : chamberApi.createSize(chamberId, body),
    onSuccess: () => {
      invalidate()
      setSizeModal(null)
      notify.success('정원을 저장했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const removeSize = useMutation({
    mutationFn: ({ chamberId, sizeId }: { chamberId: string; sizeId: string }) => chamberApi.removeSize(chamberId, sizeId),
    onSuccess: () => {
      invalidate()
      setSizeModal(null)
      notify.success('정원 이력을 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  /* 연대순 — 원의 개원, 모르면 가장 이른 정원 이력. 같은 때면 하원 → 상원 */
  const sorted = useMemo(
    () =>
      [...chambers].sort(
        (left, right) =>
          chamberSinceKey(left) - chamberSinceKey(right) ||
          ROLE_ORDER[left.role] - ROLE_ORDER[right.role] ||
          left.name.localeCompare(right.name),
      ),
    [chambers],
  )
  const showPolity = new Set(chambers.map((chamber) => chamber.historicalCountryId ?? chamber.countryId)).size > 1

  return (
    <SectionRoot aria-labelledby="chamber-catalog-title">
      <SectionHead>
        <h3 id="chamber-catalog-title">
          의회 · 원(院)
          {sorted.length > 0 ? <span className="count">{sorted.length}</span> : null}
        </h3>
        <AddBtn type="button" onClick={() => setChamberModal({ mode: 'create' })}>
          <FiPlus size={14} aria-hidden />원 추가
        </AddBtn>
      </SectionHead>
      <SectionHint>선거·정체·정당 의석이 가리키는 원입니다. 정원은 선거법이 바뀔 때마다 한 줄씩 남깁니다.</SectionHint>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : sorted.length === 0 ? (
        <SectionHint>등록된 원이 없습니다.</SectionHint>
      ) : (
        <ChamberList aria-label="의회 원 목록">
          {sorted.map((chamber) => {
            const uses = (chamber._count?.elections ?? 0) + (chamber._count?.observations ?? 0)
            const span = chamberYearSpan(chamber)
            const subParts = [
              chamber.localName,
              chamber.composition ? labelChamberComposition(chamber.composition) : null,
              showPolity ? (chamber.historicalCountry?.name ?? chamber.country?.name ?? null) : null,
            ].filter((part): part is string => Boolean(part))
            const confirmRemove = async () => {
              const approved = await confirm({
                title: '원 지우기',
                message:
                  uses > 0
                    ? `「${chamber.name}」을 지울까요? 이 원을 가리키는 선거 ${chamber._count?.elections ?? 0}건·의석 기록 ${chamber._count?.observations ?? 0}건은 원 연결이 비워집니다.`
                    : `「${chamber.name}」을 지울까요? 정원 이력도 함께 지워집니다.`,
                confirmLabel: '지우기',
                danger: true,
              })
              if (approved) removeChamber.mutate(chamber.id)
            }
            return (
              <ChamberRow key={chamber.id}>
                <YearCol>
                  <span className="start">{span.start ?? '—'}</span>
                  {span.end ? <span className="end">– {span.end}</span> : null}
                </YearCol>
                <span aria-hidden />
                <ChamberBody>
                  <ChamberMain>
                    <span className="title-line">
                      <FactBadge>{labelChamberRole(chamber.role)}</FactBadge>
                      <strong className="title">{chamber.name}</strong>
                    </span>
                    {subParts.length > 0 ? <span className="sub">{subParts.join(' · ')}</span> : null}
                    {chamber.predecessor ? (
                      <span className="lineage">
                        <FiCornerDownRight size={11} aria-hidden />
                        전신 {chamber.predecessor.name}
                      </span>
                    ) : null}
                  </ChamberMain>
                  <ChamberSide>
                    {chamber.sizes.length > 0 ? (
                      <SizeLine aria-label="정원 이력">
                        {chamber.sizes.map((size) => (
                          <SizeChip
                            key={size.id}
                            type="button"
                            title="정원 이력 고치기"
                            onClick={() => setSizeModal({ chamber, size })}
                          >
                            <strong>{size.seats.toLocaleString('ko-KR')}석</strong>
                            {formatPeriodLabel(size) ? <span>{formatPeriodLabel(size)}</span> : null}
                          </SizeChip>
                        ))}
                      </SizeLine>
                    ) : (
                      <span className="muted">정원 이력 없음</span>
                    )}
                    {uses > 0 ? (
                      <span className="muted">
                        선거 {chamber._count?.elections ?? 0} · 의석 기록 {chamber._count?.observations ?? 0}
                      </span>
                    ) : null}
                    {chamber.note ? <FactNote>{chamber.note}</FactNote> : null}
                  </ChamberSide>
                  <RowMenu>
                    <GovMorePopover
                      triggerSize="sm"
                      ariaLabel={`${chamber.name} 관리 메뉴`}
                      title="원 고치기 · 정원 추가 · 지우기"
                      actions={[
                        {
                          key: 'edit-chamber',
                          label: '원 고치기',
                          icon: <FiEdit2 size={13.5} />,
                          onClick: () => setChamberModal({ mode: 'edit', chamber }),
                        },
                        {
                          key: 'add-size',
                          label: '정원 이력 추가',
                          icon: <FiPlus size={13.5} />,
                          onClick: () => setSizeModal({ chamber }),
                        },
                        {
                          key: 'remove-chamber',
                          label: '원 지우기',
                          icon: <FiTrash2 size={13.5} />,
                          danger: true,
                          disabled: removeChamber.isPending,
                          onClick: () => {
                            void confirmRemove()
                          },
                        },
                      ]}
                    />
                  </RowMenu>
                </ChamberBody>
              </ChamberRow>
            )
          })}
        </ChamberList>
      )}
      {chamberModal ? (
        <ChamberFormModal
          key={chamberModal.mode === 'edit' ? chamberModal.chamber.id : 'new'}
          initial={chamberModal.mode === 'edit' ? chamberModal.chamber : undefined}
          candidates={chambers}
          saving={saveChamber.isPending}
          onClose={() => setChamberModal(null)}
          onSubmit={(body) =>
            saveChamber.mutate({
              id: chamberModal.mode === 'edit' ? chamberModal.chamber.id : undefined,
              body:
                chamberModal.mode === 'edit'
                  ? body
                  : { ...body, countryId: historicalCountryId ? null : (countryId ?? null), historicalCountryId: historicalCountryId ?? null },
            })
          }
        />
      ) : null}
      {sizeModal ? (
        <ChamberSizeFormModal
          key={sizeModal.size?.id ?? 'new'}
          chamberName={sizeModal.chamber.name}
          initial={sizeModal.size}
          saving={saveSize.isPending || removeSize.isPending}
          onClose={() => setSizeModal(null)}
          onDelete={
            sizeModal.size
              ? () => removeSize.mutate({ chamberId: sizeModal.chamber.id, sizeId: sizeModal.size!.id })
              : undefined
          }
          onSubmit={(body) => saveSize.mutate({ chamberId: sizeModal.chamber.id, sizeId: sizeModal.size?.id, body })}
        />
      ) : null}
    </SectionRoot>
  )
}

export function ChamberFormModal({
  initial,
  candidates,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: ChamberDto
  /** 전신으로 고를 수 있는 원 — 같은 화면의 원들(자기 자신 제외) */
  candidates: ChamberDto[]
  saving: boolean
  onClose: () => void
  onSubmit: (body: ChamberInput) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [localName, setLocalName] = useState(initial?.localName ?? '')
  const [shortName, setShortName] = useState(initial?.shortName ?? '')
  const [role, setRole] = useState<ChamberRole>(initial?.role ?? 'LOWER')
  const [composition, setComposition] = useState<ChamberComposition | ''>(initial?.composition ?? '')
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [predecessorId, setPredecessorId] = useState(initial?.predecessorId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem = !name.trim()
    ? '필수: 원 이름'
    : startError
      ? `시작: ${startError}`
      : endError
        ? `끝: ${endError}`
        : inverted
          ? '끝이 시작보다 앞설 수 없습니다.'
          : null
  const predecessorOptions = candidates.filter((candidate) => candidate.id !== initial?.id)

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '원 고치기' : '원 추가'} maxWidth="min(760px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="chamber-form-title">
          <FormS.FormGroupTitle id="chamber-form-title">원</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-name">
              이름 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input id="chamber-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="대의원 · 서민원 · 국회" />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-local">
              원어<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="chamber-local"
                value={localName}
                onChange={(event) => setLocalName(event.target.value)}
                placeholder="Camera dei Deputati · House of Commons"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-short">
              약칭<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input id="chamber-short" value={shortName} onChange={(event) => setShortName(event.target.value)} />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-role">
              자리 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="chamber-role" value={role} onChange={(event) => setRole(event.target.value as ChamberRole)}>
                {CHAMBER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.hint ? ` — ${option.hint}` : ''}
                  </option>
                ))}
              </FormSelectNative>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-composition">
              구성<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative
                id="chamber-composition"
                value={composition}
                onChange={(event) => setComposition(event.target.value as ChamberComposition | '')}
              >
                <option value="">모름</option>
                {CHAMBER_COMPOSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.hint ? ` — ${option.hint}` : ''}
                  </option>
                ))}
              </FormSelectNative>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <PeriodPair
            start={start}
            end={end}
            onStart={setStart}
            onEnd={setEnd}
            startError={startError}
            endError={endError}
            inverted={inverted}
            startLabel="개원"
            endLabel="폐지"
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-predecessor">
              전신 원<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="chamber-predecessor" value={predecessorId} onChange={(event) => setPredecessorId(event.target.value)}>
                <option value="">없음</option>
                {predecessorOptions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                    {candidate.historicalCountry?.name ?? candidate.country?.name
                      ? ` · ${candidate.historicalCountry?.name ?? candidate.country?.name}`
                      : ''}
                  </option>
                ))}
              </FormSelectNative>
              <EventFormS.Hint>나라가 바뀌어도 같은 기관이 이어지면(그레이트브리튼 → 연합왕국 서민원) 전신으로 잇습니다.</EventFormS.Hint>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea id="chamber-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter
        problem={problem}
        saving={saving}
        onClose={onClose}
        onSubmit={() =>
          !problem &&
          onSubmit({
            name: name.trim(),
            localName: localName.trim() || null,
            shortName: shortName.trim() || null,
            role,
            composition: composition || null,
            start: structuredInputOf(start),
            end: structuredInputOf(end),
            predecessorId: predecessorId || null,
            note: note.trim() || null,
          })
        }
      />
    </RegisterModal>
  )
}

export function ChamberSizeFormModal({
  chamberName,
  initial,
  saving,
  onClose,
  onDelete,
  onSubmit,
}: {
  chamberName: string
  initial?: ChamberSizeDto
  saving: boolean
  onClose: () => void
  onDelete?: () => void
  onSubmit: (body: ChamberSizeInput) => void
}) {
  const [seats, setSeats] = useState(initial ? String(initial.seats) : '')
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const seatCount = Number(seats.replace(/[,\s]/g, ''))
  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem = !Number.isInteger(seatCount) || seatCount < 1
    ? '필수: 정원(1 이상의 정수)'
    : startError
      ? `시작: ${startError}`
      : endError
        ? `끝: ${endError}`
        : inverted
          ? '끝이 시작보다 앞설 수 없습니다.'
          : null
  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      trapFocus={false}
      title={initial ? '정원 이력 고치기' : '정원 이력 추가'}
      maxWidth="min(720px, 96vw)"
    >
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="chamber-size-title">
          <FormS.FormGroupTitle id="chamber-size-title">{chamberName} · 정원</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-size-seats">
              정원 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input id="chamber-size-seats" inputMode="numeric" value={seats} onChange={(event) => setSeats(event.target.value)} placeholder="400" />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <PeriodPair
            start={start}
            end={end}
            onStart={setStart}
            onEnd={setEnd}
            startError={startError}
            endError={endError}
            inverted={inverted}
            startLabel="시작"
            endLabel="끝"
          />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="chamber-size-note">
              근거<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="chamber-size-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="예: 1928년 선거법"
              />
              {onDelete ? (
                <DeleteLink
                  type="button"
                  onClick={async () => {
                    const approved = await confirm({
                      title: '정원 이력 지우기',
                      message: `${chamberName}의 이 정원 이력을 지울까요?`,
                      confirmLabel: '지우기',
                      danger: true,
                    })
                    if (approved) onDelete()
                  }}
                >
                  이 정원 이력 지우기
                </DeleteLink>
              ) : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter
        problem={problem}
        saving={saving}
        onClose={onClose}
        onSubmit={() =>
          !problem &&
          onSubmit({ seats: seatCount, start: structuredInputOf(start), end: structuredInputOf(end), note: note.trim() || null })
        }
      />
    </RegisterModal>
  )
}

/* 위 헌정 체제 연혁과 같은 연도·축 칸 폭 — 원 이름이 체제 이름과 같은 세로줄에 선다 */
const YEAR_COL_PX = 88
const AXIS_COL_PX = 22
const WIDE_PX = 860

const SectionRoot = styled.section`
  container-type: inline-size;
  margin-top: 36px;
`

/* 굵은 검은 밑줄 대신 위 목록과 같은 가는 선 — 이 섹션만 무게가 튀었다 */
const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  h3 {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .count {
    font-size: 12.5px;
    font-weight: 700;
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const SectionHint = styled.p`
  margin: 8px 0 4px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const ChamberList = styled.ol`
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
`

const ChamberRow = styled.li`
  display: grid;
  grid-template-columns: ${YEAR_COL_PX}px ${AXIS_COL_PX}px minmax(0, 1fr);
  column-gap: 12px;

  @container (max-width: 560px) {
    grid-template-columns: 58px 0 minmax(0, 1fr);
    column-gap: 8px;
  }
`

const YearCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: 15px;
  text-align: right;
  ${DIGIT_DISPLAY}

  .start {
    font-size: 16px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.text.secondary};
    word-break: keep-all;
  }
  .end {
    margin-top: 2px;
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    white-space: nowrap;
  }
`

const ChamberBody = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px 40px;
  min-width: 0;
  padding: 14px 40px 14px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  li:last-child > & {
    border-bottom: none;
  }

  @container (min-width: ${WIDE_PX}px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    align-items: start;
  }
`

const ChamberMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  .title-line {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 24px;
  }
  .title {
    font-size: 14.5px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub {
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
    word-break: keep-all;
  }
  .lineage {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ChamberSide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  @container (min-width: ${WIDE_PX}px) {
    padding-top: 1px;
  }

  .muted {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
`

const RowMenu = styled.div`
  position: absolute;
  top: 10px;
  right: 0;
`

const SizeLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

/* 정원 이력 — 누르면 그 줄을 고친다. 테두리 알약 대신 옅은 면 */
const SizeChip = styled.button`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)')};
  font: inherit;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  ${DIGIT_DISPLAY}

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const DeleteLink = styled.button`
  margin-top: 10px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.error};
  cursor: pointer;
  text-decoration: underline;
`
