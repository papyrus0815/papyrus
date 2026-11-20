/**
 * 참여 탭 쓰기 — 인물·국가의 추가·수정·삭제·순서를 한 곳에서.
 *
 * 화면(행 컴포넌트 · 잇기 모달)은 '무엇을 바꿨나'만 말하고 저장 방식은 모른다.
 *
 * - **줄 고치기**(역할·서술·비고·참여 국가)는 행 단위 머지(`relatedPersonsPatch`·`relatedCountriesPatch`) —
 *   고친 줄·고친 필드만 보낸다.
 * - **잇기 모달(`upsertPerson`·`upsertCountry`)**은 이미 연결된 대상이면 행 단위 머지 patch로 고치고,
 *   새 대상이면 모든 참여 메타데이터(역할·진영·소속국·한 일·비고)를 한 번의 요청에 실어 연결한다.
 *   '연결하고 계속' 연속 저장 시 직전 PUT 응답이 오기 전에도 앞선 항목이 유실되지 않도록 대기열에 보존한다.
 * - **진영 탭도 이 훅으로 쓴다**(`assignPersonsToSide`). 예전엔 진영 탭이 참여 인물 전체 배열을 따로
 *   보냈다. 그래서 다른 탭이 그새 고친 역할·비고를 옛값으로 덮거나, 아직 응답 전인 새 인물을 지울 수 있었다.
 * - **인물 진영은 소속국 진영과 다를 때만 저장한다.** 같은 값이면 null(소속국 따름)로 접는다. 하드카피하면
 *   나중에 나라를 다른 진영으로 옮겨도 인물이 따라가지 않는다(actors.lib `effectivePersonSide`).
 */
import { useEffect, useMemo, useRef } from 'react'

import { type EventCountryRole } from '@/entities/event/model'
import { type StructuredPoint } from '@/shared/api/evidence'
import { type UpdateEventDto } from '@/shared/api/events'
import { type CountryPickerPick } from '@/shared/ui/country-picker'

import { type EventDetail } from '../../use-event-detail'
import { type PatchOptions } from '../../use-undoable-patch'
import {
  buildCountryRows,
  type CountryRowData,
  countryRowKey,
  countrySideMapOf,
  delegationKeyOf,
  effectivePersonSide,
  type PersonPayload,
  personNameOf,
  toCountryPayload,
  toPersonPayload,
} from './actors.lib'

type CountryPayload = NonNullable<UpdateEventDto['relatedCountries']>[number]

export type CountryPatch = {
  role?: EventCountryRole
  roleDescription?: string
  note?: string
  sideId?: string | null
  participation?: 'FULL' | 'LIMITED' | 'INDIRECT' | 'NON_COMBATANT' | null
  join?: StructuredPoint | null
  joinReason?: string | null
  withdraw?: StructuredPoint | null
  withdrawReason?: string | null
}

export interface AddPersonContext {
  role?: string | null
  note?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  sideId?: string | null
  savedLabel?: string
}

export interface UpsertPersonInput {
  personId: string
  personName: string
  role?: string | null
  note?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  sideId?: string | null
}

export interface UpsertCountryInput {
  id: string
  isHistorical: boolean
  name: string
  role: EventCountryRole
  roleDescription?: string | null
  note?: string | null
  sideId?: string | null
  participation?: 'FULL' | 'LIMITED' | 'INDIRECT' | 'NON_COMBATANT' | null
  join?: StructuredPoint | null
  withdraw?: StructuredPoint | null
}

export interface AddCountriesContext {
  sideId?: string | null
  role?: EventCountryRole | null
  savedLabel?: string
}

export function useActorMutations({
  event,
  onPatch,
}: {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: PatchOptions) => void
}) {
  const persons = useMemo(() => event.relatedPersons ?? [], [event.relatedPersons])
  const countryRows = useMemo(
    () => buildCountryRows(event.relatedCountries ?? [], event.relatedHistoricalCountries ?? []),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  const countrySideByKey = useMemo(
    () => countrySideMapOf(event.relatedCountries, event.relatedHistoricalCountries),
    [event.relatedCountries, event.relatedHistoricalCountries],
  )

  /** 저장할 인물 진영 — 소속국 진영과 같으면 null(따름). 소속국은 인물 줄의 참여 자격 국가 */
  const ownSideIdFor = (
    participation: { countryId?: string | null; historicalCountryId?: string | null },
    sideId: string | null | undefined,
  ): string | null => {
    if (!sideId) return null
    const key = delegationKeyOf(participation)
    if (key && countrySideByKey.get(key) === sideId) return null
    return sideId
  }
  const participationOf = (personId: string) =>
    persons.find((person) => person.personId === personId) ??
    pendingAddedPersonsRef.current.get(personId)?.payload ??
    {}

  /**
   * 모달 '연결하고 계속' 등 연속 저장 시 직전 PUT 응답이 도착하기 전이라도
   * 방금 추가한 인물·국가가 덮여 사라지지 않도록 대기열에 보존한다.
   */
  const pendingAddedPersonsRef = useRef<
    Map<string, { payload: PersonPayload; addedAt: number }>
  >(new Map())

  const pendingAddedCountriesRef = useRef<
    Map<string, { payload: CountryPayload; addedAt: number }>
  >(new Map())

  useEffect(() => {
    const confirmedIds = new Set(persons.map((person) => person.personId))
    for (const key of pendingAddedPersonsRef.current.keys()) {
      if (confirmedIds.has(key)) {
        pendingAddedPersonsRef.current.delete(key)
      }
    }
  }, [persons])

  useEffect(() => {
    const confirmedKeys = new Set(countryRows.map(countryRowKey))
    for (const key of pendingAddedCountriesRef.current.keys()) {
      if (confirmedKeys.has(key)) {
        pendingAddedCountriesRef.current.delete(key)
      }
    }
  }, [countryRows])

  const getMergedBasePersons = (): PersonPayload[] => {
    const now = Date.now()
    const base = persons.map(toPersonPayload)
    const seen = new Set(base.map((entry) => entry.personId))
    for (const [personId, entry] of pendingAddedPersonsRef.current.entries()) {
      if (now - entry.addedAt > 8_000) {
        pendingAddedPersonsRef.current.delete(personId)
        continue
      }
      if (!seen.has(personId)) {
        seen.add(personId)
        base.push(entry.payload)
      }
    }
    return base
  }

  const getMergedBaseCountries = (): Array<{ key: string; payload: CountryPayload }> => {
    const now = Date.now()
    const base: Array<{ key: string; payload: CountryPayload }> = countryRows.map((row) => ({
      key: countryRowKey(row),
      payload: toCountryPayload(row),
    }))
    const seen = new Set(base.map((entry) => entry.key))
    for (const [rowKey, entry] of pendingAddedCountriesRef.current.entries()) {
      if (now - entry.addedAt > 8_000) {
        pendingAddedCountriesRef.current.delete(rowKey)
        continue
      }
      if (!seen.has(rowKey)) {
        seen.add(rowKey)
        base.push({ key: rowKey, payload: entry.payload })
      }
    }
    return base
  }

  /* ── 인물 ── */
  const patchPersons = (next: PersonPayload[], options?: PatchOptions) =>
    onPatch({ relatedPersons: next }, options)

  const updatePerson = (
    personId: string,
    patch: { role?: string; note?: string; sideId?: string | null },
  ) =>
    onPatch({
      relatedPersonsPatch: [
        {
          personId,
          ...(patch.role !== undefined && { role: patch.role.trim() || null }),
          ...(patch.note !== undefined && { note: patch.note.trim() || null }),
          ...(patch.sideId !== undefined && {
            sideId: ownSideIdFor(participationOf(personId), patch.sideId),
          }),
        },
      ],
    })

  const setParticipationCountry = (personId: string, value: string) => {
    const [kind, targetId] = value && value !== 'none' ? value.split(':') : ['', '']
    onPatch({
      relatedPersonsPatch: [
        {
          personId,
          countryId: kind === 'c' ? targetId : null,
          historicalCountryId: kind === 'h' ? targetId : null,
        },
      ],
    })
  }

  const removePerson = (personId: string) => {
    pendingAddedPersonsRef.current.delete(personId)
    const removed = persons.find((person) => person.personId === personId)
    const remaining = getMergedBasePersons().filter((entry) => entry.personId !== personId)
    patchPersons(remaining, {
      savedLabel: `행위자 제거 · ${removed ? personNameOf(removed) : '인물'}`,
    })
  }

  const movePerson = (personId: string, direction: -1 | 1) => {
    const index = persons.findIndex((person) => person.personId === personId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= persons.length) return
    const next = persons.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    patchPersons(next.map(toPersonPayload))
  }

  const reorderPerson = (draggedPersonId: string, targetPersonId: string) => {
    if (draggedPersonId === targetPersonId) return
    const fromIndex = persons.findIndex((person) => person.personId === draggedPersonId)
    const toIndex = persons.findIndex((person) => person.personId === targetPersonId)
    if (fromIndex < 0 || toIndex < 0) return
    const next = persons.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    patchPersons(next.map(toPersonPayload))
  }

  const addPerson = (personId: string, context?: AddPersonContext): boolean => {
    const currentBase = getMergedBasePersons()
    if (currentBase.some((person) => person.personId === personId)) return false
    const payload: PersonPayload = {
      personId,
      ...(context?.role?.trim() ? { role: context.role.trim() } : {}),
      ...(context?.note?.trim() ? { note: context.note.trim() } : {}),
      ...(context?.countryId !== undefined ? { countryId: context.countryId } : {}),
      ...(context?.historicalCountryId !== undefined
        ? { historicalCountryId: context.historicalCountryId }
        : {}),
      ...(ownSideIdFor(context ?? {}, context?.sideId)
        ? { sideId: ownSideIdFor(context ?? {}, context?.sideId) }
        : {}),
    }
    pendingAddedPersonsRef.current.set(personId, { payload, addedAt: Date.now() })
    patchPersons(
      [...currentBase, payload],
      context?.savedLabel ? { savedLabel: context.savedLabel } : undefined,
    )
    return true
  }

  /** 잇기 모달 저장 — 이미 연결된 인물이면 patch, 새 인물이면 추가 */
  const upsertPerson = (input: UpsertPersonInput): 'added' | 'updated' => {
    const roleValue = input.role?.trim() || null
    const noteValue = input.note?.trim() || null
    const countryIdValue = input.countryId ?? null
    const historicalCountryIdValue = input.historicalCountryId ?? null
    const sideIdValue = ownSideIdFor(
      { countryId: countryIdValue, historicalCountryId: historicalCountryIdValue },
      input.sideId,
    )

    const alreadyConfirmed = persons.some((entry) => entry.personId === input.personId)
    const alreadyPending = pendingAddedPersonsRef.current.has(input.personId)

    if (alreadyConfirmed || alreadyPending) {
      if (alreadyPending) {
        pendingAddedPersonsRef.current.set(input.personId, {
          payload: {
            personId: input.personId,
            role: roleValue ?? undefined,
            note: noteValue ?? undefined,
            countryId: countryIdValue,
            historicalCountryId: historicalCountryIdValue,
            sideId: sideIdValue,
          },
          addedAt: Date.now(),
        })
      }
      onPatch(
        {
          relatedPersonsPatch: [
            {
              personId: input.personId,
              role: roleValue,
              note: noteValue,
              countryId: countryIdValue,
              historicalCountryId: historicalCountryIdValue,
              sideId: sideIdValue,
            },
          ],
        },
        { savedLabel: `참여 인물 수정 · ${input.personName}` },
      )
      return 'updated'
    }

    const currentBase = getMergedBasePersons()
    const payload: PersonPayload = {
      personId: input.personId,
      ...(roleValue ? { role: roleValue } : {}),
      ...(noteValue ? { note: noteValue } : {}),
      ...(countryIdValue ? { countryId: countryIdValue } : {}),
      ...(historicalCountryIdValue ? { historicalCountryId: historicalCountryIdValue } : {}),
      ...(sideIdValue ? { sideId: sideIdValue } : {}),
    }
    pendingAddedPersonsRef.current.set(input.personId, { payload, addedAt: Date.now() })
    patchPersons([...currentBase, payload], {
      savedLabel: `참여 인물 연결 · ${input.personName}`,
    })
    return 'added'
  }

  const addPersonsBatch = (
    items: Array<{
      personId: string
      role?: string | null
      countryId?: string | null
      historicalCountryId?: string | null
      sideId?: string | null
    }>,
    savedLabel?: string,
  ): number => {
    const currentBase = getMergedBasePersons()
    const existingIds = new Set(currentBase.map((person) => person.personId))
    const fresh: PersonPayload[] = []
    const now = Date.now()
    for (const item of items) {
      if (existingIds.has(item.personId)) continue
      existingIds.add(item.personId)
      const payload: PersonPayload = {
        personId: item.personId,
        role: item.role?.trim() || undefined,
        ...(item.countryId !== undefined ? { countryId: item.countryId } : {}),
        ...(item.historicalCountryId !== undefined
          ? { historicalCountryId: item.historicalCountryId }
          : {}),
        ...(ownSideIdFor(item, item.sideId) ? { sideId: ownSideIdFor(item, item.sideId) } : {}),
      }
      pendingAddedPersonsRef.current.set(item.personId, { payload, addedAt: now })
      fresh.push(payload)
    }
    if (fresh.length === 0) return 0
    patchPersons(
      [...currentBase, ...fresh],
      savedLabel ? { savedLabel } : undefined,
    )
    return fresh.length
  }

  /* ── 국가 ── */
  const patchCountries = (next: CountryRowData[], options?: PatchOptions) =>
    onPatch({ relatedCountries: next.map(toCountryPayload) }, options)

  const updateCountry = (rowKey: string, patch: CountryPatch) => {
    const row = countryRows.find((candidate) => countryRowKey(candidate) === rowKey)
    if (!row) return
    onPatch({
      relatedCountriesPatch: [
        {
          ...(row.isHistorical ? { historicalCountryId: row.id } : { countryId: row.id }),
          ...(patch.role !== undefined && { role: patch.role }),
          ...(patch.roleDescription !== undefined && { roleDescription: patch.roleDescription.trim() || null }),
          ...(patch.note !== undefined && { note: patch.note.trim() || null }),
          ...(patch.sideId !== undefined && { sideId: patch.sideId || null }),
          ...(patch.participation !== undefined && { participation: patch.participation || null }),
          ...(patch.join !== undefined && { join: patch.join }),
          ...(patch.joinReason !== undefined && { joinReason: patch.joinReason?.trim() || null }),
          ...(patch.withdraw !== undefined && { withdraw: patch.withdraw }),
          ...(patch.withdrawReason !== undefined && { withdrawReason: patch.withdrawReason?.trim() || null }),
        },
      ],
    })
  }

  const replaceCountry = (
    oldRowKey: string,
    replacement: { id: string; name: string; isHistorical: boolean },
  ) => {
    const oldRow = countryRows.find((row) => countryRowKey(row) === oldRowKey)
    if (!oldRow) return
    const nextKey = replacement.isHistorical ? `h:${replacement.id}` : `m:${replacement.id}`
    if (countryRows.some((row) => countryRowKey(row) === nextKey)) return
    onPatch(
      {
        relatedCountries: countryRows.map((row) =>
          countryRowKey(row) === oldRowKey
            ? {
                ...(replacement.isHistorical
                  ? { historicalCountryId: replacement.id }
                  : { countryId: replacement.id }),
                role: (row.role ?? undefined) as EventCountryRole | undefined,
                roleDescription: row.roleDescription?.trim() ? row.roleDescription : null,
                note: row.note?.trim() ? row.note : null,
                sideId: row.sideId ?? null,
                participation: row.participation ?? null,
                join: row.join ?? null,
                joinReason: row.joinReason ?? null,
                withdraw: row.withdraw ?? null,
                withdrawReason: row.withdrawReason ?? null,
              }
            : toCountryPayload(row),
        ),
      },
      { savedLabel: `관련국 교체 · ${oldRow.name} → ${replacement.name}` },
    )
  }

  const removeCountry = (rowKey: string) => {
    pendingAddedCountriesRef.current.delete(rowKey)
    const removed = countryRows.find((row) => countryRowKey(row) === rowKey)
    const remaining = getMergedBaseCountries()
      .filter((entry) => entry.key !== rowKey)
      .map((entry) => entry.payload)
    onPatch(
      { relatedCountries: remaining },
      { savedLabel: `관련국 제거 · ${removed?.name ?? '국가'}` },
    )
  }

  const moveCountry = (rowKey: string, direction: -1 | 1) => {
    const index = countryRows.findIndex((row) => countryRowKey(row) === rowKey)
    const target = index + direction
    if (index < 0 || target < 0 || target >= countryRows.length) return
    const next = countryRows.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    patchCountries(next)
  }

  const reorderCountry = (draggedRowKey: string, targetRowKey: string) => {
    if (draggedRowKey === targetRowKey) return
    const fromIndex = countryRows.findIndex((row) => countryRowKey(row) === draggedRowKey)
    const toIndex = countryRows.findIndex((row) => countryRowKey(row) === targetRowKey)
    if (fromIndex < 0 || toIndex < 0) return
    const next = countryRows.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    patchCountries(next)
  }

  const addCountries = (picks: CountryPickerPick[], context?: AddCountriesContext) => {
    const currentBase = getMergedBaseCountries()
    const existingKeys = new Set(currentBase.map((entry) => entry.key))
    const fresh = picks.filter(
      (country) => !existingKeys.has(country.isHistorical ? `h:${country.id}` : `m:${country.id}`),
    )
    if (fresh.length === 0) return
    const now = Date.now()
    const freshPayloads = fresh.map((country) => {
      const rowKey = country.isHistorical ? `h:${country.id}` : `m:${country.id}`
      const payload: CountryPayload = {
        ...(country.isHistorical
          ? { historicalCountryId: country.id }
          : { countryId: country.id }),
        ...(context?.role ? { role: context.role } : {}),
        ...(context?.sideId ? { sideId: context.sideId } : {}),
      }
      pendingAddedCountriesRef.current.set(rowKey, { payload, addedAt: now })
      return payload
    })
    onPatch(
      {
        relatedCountries: [
          ...currentBase.map((entry) => entry.payload),
          ...freshPayloads,
        ],
      },
      {
        savedLabel:
          context?.savedLabel ??
          (fresh.length === 1 ? `관련국 추가 · ${fresh[0].name}` : `관련국 ${fresh.length}개 추가`),
      },
    )
  }

  /** 잇기 모달 저장 — 이미 연결된 국가면 patch, 새 국가면 모든 메타데이터와 함께 추가 */
  const upsertCountry = (input: UpsertCountryInput): 'added' | 'updated' => {
    const rowKey = input.isHistorical ? `h:${input.id}` : `m:${input.id}`
    const roleDescriptionValue = input.roleDescription?.trim() || null
    const noteValue = input.note?.trim() || null
    const sideIdValue = input.sideId || null
    const participationValue =
      input.participation && input.participation !== 'FULL' ? input.participation : null

    const alreadyConfirmed = countryRows.some((row) => countryRowKey(row) === rowKey)
    const alreadyPending = pendingAddedCountriesRef.current.has(rowKey)

    if (alreadyConfirmed || alreadyPending) {
      if (alreadyPending) {
        pendingAddedCountriesRef.current.set(rowKey, {
          payload: {
            ...(input.isHistorical
              ? { historicalCountryId: input.id }
              : { countryId: input.id }),
            role: input.role,
            roleDescription: roleDescriptionValue,
            note: noteValue,
            sideId: sideIdValue,
            participation: participationValue,
            join: input.join ?? null,
            withdraw: input.withdraw ?? null,
          },
          addedAt: Date.now(),
        })
      }
      onPatch(
        {
          relatedCountriesPatch: [
            {
              ...(input.isHistorical
                ? { historicalCountryId: input.id }
                : { countryId: input.id }),
              role: input.role,
              roleDescription: roleDescriptionValue,
              note: noteValue,
              sideId: sideIdValue,
              participation: participationValue,
              join: input.join ?? null,
              withdraw: input.withdraw ?? null,
            },
          ],
        },
        { savedLabel: `관련국 수정 · ${input.name}` },
      )
      return 'updated'
    }

    const currentBase = getMergedBaseCountries()
    const payload: CountryPayload = {
      ...(input.isHistorical
        ? { historicalCountryId: input.id }
        : { countryId: input.id }),
      role: input.role,
      ...(roleDescriptionValue ? { roleDescription: roleDescriptionValue } : {}),
      ...(noteValue ? { note: noteValue } : {}),
      ...(sideIdValue ? { sideId: sideIdValue } : {}),
      ...(participationValue ? { participation: participationValue } : {}),
      ...(input.join ? { join: input.join } : {}),
      ...(input.withdraw ? { withdraw: input.withdraw } : {}),
    }
    pendingAddedCountriesRef.current.set(rowKey, { payload, addedAt: Date.now() })
    onPatch(
      {
        relatedCountries: [...currentBase.map((entry) => entry.payload), payload],
      },
      { savedLabel: `관련국 연결 · ${input.name}` },
    )
    return 'added'
  }

  /**
   * 여러 인물을 한 진영에 — 진영 탭의 계파·기관 '소속 인물 불러오기'. 사건에 없던 인물은 참여 인물로
   * 들이고(전체 목록 + 대기열, `addPersonsBatch`), 이미 있는 인물은 고친 줄만 보낸다(행 단위 머지).
   * 이미 그 진영(실효 진영)에 선 인물은 건드리지 않는다. 반영한 인원을 돌려준다.
   */
  const assignPersonsToSide = (
    items: ReadonlyArray<{ personId: string; role?: string | null }>,
    sideId: string,
    savedLabel: string,
  ): number => {
    /* 같은 인물이 두 번 오면 앞의 것 — 서버 relatedPersons 접기와 같은 규칙 */
    const unique = new Map<string, { personId: string; role?: string | null }>()
    for (const item of items) if (!unique.has(item.personId)) unique.set(item.personId, item)
    const known = new Map(getMergedBasePersons().map((entry) => [entry.personId, entry]))
    const fresh: Array<{ personId: string; role?: string | null; sideId: string }> = []
    const moves: Array<{ personId: string; sideId: string | null }> = []
    for (const item of unique.values()) {
      const current = persons.find((entry) => entry.personId === item.personId) ?? known.get(item.personId)
      if (!current) {
        fresh.push({ personId: item.personId, role: item.role, sideId })
        continue
      }
      if (effectivePersonSide(current, countrySideByKey).sideId === sideId) continue
      moves.push({ personId: item.personId, sideId: ownSideIdFor(current, sideId) })
    }
    if (fresh.length > 0) addPersonsBatch(fresh, savedLabel)
    if (moves.length > 0) onPatch({ relatedPersonsPatch: moves }, { savedLabel })
    return fresh.length + moves.length
  }

  return {
    persons,
    countryRows,
    countrySideByKey,
    updatePerson,
    setParticipationCountry,
    removePerson,
    movePerson,
    reorderPerson,
    addPerson,
    upsertPerson,
    addPersonsBatch,
    assignPersonsToSide,
    updateCountry,
    replaceCountry,
    removeCountry,
    moveCountry,
    reorderCountry,
    addCountries,
    upsertCountry,
  }
}
