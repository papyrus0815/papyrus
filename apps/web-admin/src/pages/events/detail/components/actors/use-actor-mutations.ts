/**
 * 참여 탭 쓰기 — 인물·국가의 추가·수정·삭제·순서를 한 곳에서.
 *
 * 화면(행 컴포넌트)은 '무엇을 바꿨나'만 말하고 저장 방식은 모른다. 저장 방식(배열 통째 PATCH
 * → 행 단위 요청)을 바꿀 때 이 훅만 고치면 된다.
 */
import { useMemo } from 'react'

import { type EventCountryRole } from '@/entities/event/model'
import { type UpdateEventDto } from '@/shared/api/events'
import { type CountryPickerPick } from '@/shared/ui/country-picker'

import { type EventDetail } from '../../use-event-detail'
import { type PatchOptions } from '../../use-undoable-patch'
import {
  buildCountryRows,
  type CountryRowData,
  countryRowKey,
  type PersonPayload,
  personNameOf,
  toCountryPayload,
  toPersonPayload,
} from './actors.lib'

export type CountryPatch = { role?: EventCountryRole; roleDescription?: string; note?: string }

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

  /* ── 인물 ── */
  const patchPersons = (next: PersonPayload[], options?: PatchOptions) =>
    onPatch({ relatedPersons: next }, options)

  const updatePerson = (personId: string, patch: { role?: string; note?: string }) =>
    patchPersons(
      persons.map((person) => {
        if (person.personId !== personId) return toPersonPayload(person)
        return {
          personId: person.personId,
          role: patch.role !== undefined ? patch.role.trim() || undefined : (person.role ?? undefined),
          note: patch.note !== undefined ? patch.note.trim() || undefined : (person.note ?? undefined),
        }
      }),
    )

  /**
   * 참여 자격 국가 — 사건 참여국 중 하나('h:역사국id' | 'c:현대국id') 또는 'none'(비우기).
   * 고른 쪽만 채우고 다른 쪽은 비운다(현대·역사를 둘 다 잡고 있으면 어느 자격인지 흐려진다).
   */
  const setParticipationCountry = (personId: string, value: string) => {
    const [kind, targetId] = value && value !== 'none' ? value.split(':') : ['', '']
    patchPersons(
      persons.map((person) =>
        person.personId !== personId
          ? toPersonPayload(person)
          : {
              ...toPersonPayload(person),
              countryId: kind === 'c' ? targetId : null,
              historicalCountryId: kind === 'h' ? targetId : null,
            },
      ),
    )
  }

  const removePerson = (personId: string) => {
    const removed = persons.find((person) => person.personId === personId)
    patchPersons(
      persons.filter((person) => person.personId !== personId).map(toPersonPayload),
      { savedLabel: `행위자 제거 · ${removed ? personNameOf(removed) : '인물'}` },
    )
  }

  /** 순서 이동 — 서버는 배열 순서를 그대로 보존한다. 경계에서는 보내지 않는다 */
  const movePerson = (personId: string, direction: -1 | 1) => {
    const index = persons.findIndex((person) => person.personId === personId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= persons.length) return
    const next = persons.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    patchPersons(next.map(toPersonPayload))
  }

  /** 인물 추가 — 중복은 모달이 거르지만 한 번 더 막는다. @returns 실제로 더했는가 */
  const addPerson = (personId: string): boolean => {
    if (persons.some((person) => person.personId === personId)) return false
    patchPersons([...persons.map(toPersonPayload), { personId }])
    return true
  }

  /* ── 국가 ── */
  /** 서버가 자연키로 머지하므로 보내지 않은 필드(역할·서술·비고)는 그대로 살아남는다 */
  const patchCountries = (next: CountryRowData[], options?: PatchOptions) =>
    onPatch({ relatedCountries: next.map(toCountryPayload) }, options)

  const updateCountry = (rowKey: string, patch: CountryPatch) =>
    patchCountries(
      countryRows.map((row) => (countryRowKey(row) === rowKey ? { ...row, ...patch } : row)),
    )

  const removeCountry = (rowKey: string) => {
    const removed = countryRows.find((row) => countryRowKey(row) === rowKey)
    patchCountries(
      countryRows.filter((row) => countryRowKey(row) !== rowKey),
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

  /**
   * 피커에서 고른 국가들을 **한 번의 patch**로 더한다 — '되돌리기' 한 번이 방금 더한 묶음 전체를 되돌린다.
   */
  const addCountries = (picks: CountryPickerPick[]) => {
    const existingKeys = new Set(countryRows.map(countryRowKey))
    const fresh = picks.filter(
      (country) => !existingKeys.has(country.isHistorical ? `h:${country.id}` : `m:${country.id}`),
    )
    if (fresh.length === 0) return
    patchCountries(
      [
        ...countryRows,
        ...fresh.map((country, index) => ({
          id: country.id,
          name: '',
          flagEmoji: null,
          isHistorical: country.isHistorical,
          role: null,
          roleDescription: null,
          note: null,
          sortOrder: countryRows.length + index,
          existenceWarning: null,
          sideId: null,
        })),
      ],
      {
        savedLabel: fresh.length === 1 ? `관련국 추가 · ${fresh[0].name}` : `관련국 ${fresh.length}개 추가`,
      },
    )
  }

  return {
    persons,
    countryRows,
    updatePerson,
    setParticipationCountry,
    removePerson,
    movePerson,
    addPerson,
    updateCountry,
    removeCountry,
    moveCountry,
    addCountries,
  }
}
