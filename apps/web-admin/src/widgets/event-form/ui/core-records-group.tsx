/**
 * 등록 모달 — **'기록' 묶음**: 고른 유형의 핵심 기록을 등록하는 자리에서 바로 받는다.
 *
 * 무엇을 받을지는 유형 레지스트리의 `core`가 정한다(전투 → 진영·참여국, 조약 체결 → 맺어진 조약,
 * 건국·멸망 → 세워지거나 무너진 나라, 즉위·취임 → 취임한 인물, 기업 → 기업·조직 …). 참여국 자체는
 * 위 '연결' 묶음의 칸을 그대로 쓰고, 여기서는 그 참여국 위에 얹는 기록(진영 소속·성립/소멸 역할)을 단다.
 * 수치·작전 정보처럼 출처와 함께 적어야 하는 것은 등록 뒤 상세에서 — 무엇을 어디서 적는지만 안내한다.
 *
 * 받은 값은 초안(RegisterFacetDrafts)이고, 저장은 사건이 생긴 뒤 commitRegisterFacets가 각 정본 API로 한다.
 */
import { useMemo, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  EVENT_TYPES,
  type EventFacetKey,
  type EventTypeKey,
  FACET_LABEL,
} from '@/entities/event/model/event-type-registry'
import {
  type EventCountryParticipant,
  participantKey,
} from '@/entities/event/model/country-participant'
import { ORGANIZATION_ROLE_OPTIONS } from '@/features/event-facets/model/organization-roles'
import {
  type PickedPerson,
  type RegisterFacetDrafts,
  type SideSlot,
  suggestSideAssignment,
} from '@/features/event-facets/model/register-facets'
import { treatyNameFromEventTitle } from '@/features/event-facets/model/treaty-from-event'
import * as S from '@/pages/events/create/event-create.styles'
import { getElections } from '@/shared/api/election'
import type { EventOrganizationRole } from '@/shared/api/events'
import { getOrganizations } from '@/shared/api/organizations'
import { searchPersons } from '@/shared/api/persons'
import { treatyApi } from '@/shared/api/treaty'
import { nestiaApiService } from '@/shared/api/api.service'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import {
  KitAddButton,
  KitChipGroup,
  KitChoiceChip,
  KitOptionalTag,
  KitRemoveButton,
  KitSelectedItem,
  KitSelectedItems,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'

/** 등록 뒤 상세에서 적는 기록 — 출처·진영별 값이 필요해 등록 칸으로는 받지 않는다 */
const DETAIL_ONLY: EventFacetKey[] = ['metrics', 'military', 'cabinets']

type PickerKind = 'persons' | 'power' | 'organizations' | 'treaty' | 'election'

interface CoreRecordsGroupProps {
  type: EventTypeKey
  drafts: RegisterFacetDrafts
  onDraftsChange: (next: RegisterFacetDrafts) => void
  /** 위 '연결'의 참여국 줄 — 진영 소속·성립/소멸이 이 위에 얹힌다 */
  participants: EventCountryParticipant[]
  participantName: (row: EventCountryParticipant) => string
  /** 나라를 이 역할로 넣는다 — 성립·소멸 칸(국가 선택 모달을 역할을 정한 채로 연다) */
  onAddCountryWithRole: (role: 'FOUNDED' | 'DISSOLVED') => void
  onRemoveParticipant: (key: string) => void
  eventTitle: string
  playClickSound: () => void
}

export function CoreRecordsGroup({
  type,
  drafts,
  onDraftsChange,
  participants,
  participantName,
  onAddCountryWithRole,
  onRemoveParticipant,
  eventTitle,
  playClickSound,
}: CoreRecordsGroupProps) {
  const def = EVENT_TYPES[type]
  const [picker, setPicker] = useState<PickerKind | null>(null)
  const update = (patch: Partial<RegisterFacetDrafts>) => onDraftsChange({ ...drafts, ...patch })

  const fieldFacets = def.core.filter((facet) => facet !== 'participants' && !DETAIL_ONLY.includes(facet))
  const detailFacets = [...def.core, ...def.optional].filter((facet) => DETAIL_ONLY.includes(facet))

  return (
    <>
      {fieldFacets.includes('sides') && (
        <SidesField
          drafts={drafts}
          update={update}
          participants={participants}
          participantName={participantName}
          playClickSound={playClickSound}
        />
      )}

      {fieldFacets.includes('statehood') && (
        <StatehoodField
          participants={participants}
          participantName={participantName}
          onAdd={onAddCountryWithRole}
          onRemove={onRemoveParticipant}
          playClickSound={playClickSound}
        />
      )}

      {fieldFacets.includes('treaty') && (
        <TreatyField drafts={drafts} update={update} eventTitle={eventTitle} onPick={() => setPicker('treaty')} />
      )}

      {fieldFacets.includes('power') && (
        <PersonListField
          label="취임·즉위한 인물"
          hint="등록하면 이 인물의 재임·재위 중 사건 시기에 시작한 기록을 이 사건에 잇습니다(하나로 정해질 때)."
          people={drafts.power}
          onChange={(power) => update({ power })}
          onAdd={() => setPicker('power')}
          addLabel="인물 고르기"
        />
      )}

      {fieldFacets.includes('election') && (
        <S.FormRow>
          <S.FormLabel as="span">선거</S.FormLabel>
          <S.FormField>
            {drafts.election ? (
              <KitSelectedItems>
                <KitSelectedItem>
                  <span>{drafts.election.name}</span>
                  <KitRemoveButton type="button" aria-label="선거 빼기" onClick={() => update({ election: null })}>
                    <FiX size={14} />
                  </KitRemoveButton>
                </KitSelectedItem>
              </KitSelectedItems>
            ) : (
              <KitAddButton type="button" onClick={() => setPicker('election')}>
                <FiPlus size={15} />
                선거 고르기
              </KitAddButton>
            )}
            <S.Hint>선거 기록이 없으면 등록 뒤 선거 지면에서 만들어 이 사건에 이을 수 있습니다.</S.Hint>
          </S.FormField>
        </S.FormRow>
      )}

      {fieldFacets.includes('organizations') && (
        <S.FormRow>
          <S.FormLabel as="span">기업·조직</S.FormLabel>
          <S.FormField>
            {drafts.organizations.length > 0 && (
              <RowList>
                {drafts.organizations.map((organization) => (
                  <Row key={organization.id}>
                    <RowName>{organization.name}</RowName>
                    <RowSelect
                      aria-label={`${organization.name}의 역할`}
                      value={organization.role}
                      onChange={(change) =>
                        update({
                          organizations: drafts.organizations.map((item) =>
                            item.id === organization.id
                              ? { ...item, role: change.target.value as EventOrganizationRole }
                              : item,
                          ),
                        })
                      }
                    >
                      {ORGANIZATION_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </RowSelect>
                    <KitRemoveButton
                      type="button"
                      aria-label={`${organization.name} 빼기`}
                      onClick={() =>
                        update({ organizations: drafts.organizations.filter((item) => item.id !== organization.id) })
                      }
                    >
                      <FiX size={14} />
                    </KitRemoveButton>
                  </Row>
                ))}
              </RowList>
            )}
            <KitAddButton type="button" onClick={() => setPicker('organizations')}>
              <FiPlus size={15} />
              {drafts.organizations.length > 0 ? '조직 더 추가' : '기업·조직 고르기'}
            </KitAddButton>
          </S.FormField>
        </S.FormRow>
      )}

      {fieldFacets.includes('persons') && (
        <PersonListField
          label="참여 인물"
          hint="이 사건에서 한 일을 한 줄로 적어 두면 인물 상세의 사건 탭에도 그대로 실립니다."
          people={drafts.persons}
          onChange={(persons) => update({ persons })}
          onAdd={() => setPicker('persons')}
          addLabel={drafts.persons.length > 0 ? '인물 더 추가' : '인물 고르기'}
          withRole
        />
      )}

      {detailFacets.length > 0 && (
        <S.FormRow>
          <S.FormLabel as="span">
            등록 뒤 상세에서<KitOptionalTag>(선택)</KitOptionalTag>
          </S.FormLabel>
          <S.FormField>
            <S.Hint>
              {detailFacets
                .map((facet) =>
                  facet === 'metrics' && def.metrics.presets.length > 0 ? def.metrics.menuLabel : FACET_LABEL[facet],
                )
                .join(' · ')}{' '}
              — 출처와 함께 적어야 해서 등록 뒤 상세의 &lsquo;진영·수치&rsquo; 탭에서 기록합니다.
            </S.Hint>
          </S.FormField>
        </S.FormRow>
      )}

      <RecordPickers
        kind={picker}
        onClose={() => setPicker(null)}
        drafts={drafts}
        update={update}
      />
    </>
  )
}

// ─── 진영 ───────────────────────────────────────────────────────────────

function SidesField({
  drafts,
  update,
  participants,
  participantName,
  playClickSound,
}: {
  drafts: RegisterFacetDrafts
  update: (patch: Partial<RegisterFacetDrafts>) => void
  participants: EventCountryParticipant[]
  participantName: (row: EventCountryParticipant) => string
  playClickSound: () => void
}) {
  const { names, assignment } = drafts.sides
  const placeholderOf = (slot: SideSlot) => {
    const first = participants.find((row) => assignment[participantKey(row)] === slot)
    return first ? `${participantName(first)} 측` : slot === 'A' ? '진영 1' : '진영 2'
  }
  const setSlot = (key: string, slot: SideSlot | null) => {
    const next = { ...assignment }
    if (slot) next[key] = slot
    else delete next[key]
    update({ sides: { names, assignment: next } })
  }
  const canSuggest = participants.some((row) =>
    ['INITIATOR', 'ALLY', 'TARGET', 'ADVERSARY', 'VICTIM'].includes(row.role ?? ''),
  )
  return (
    <S.FormRow>
      <S.FormLabel as="span">진영</S.FormLabel>
      <S.FormField>
        {participants.length === 0 ? (
          <S.Hint>위 &lsquo;연결&rsquo;의 참여국에 나라를 넣으면 여기서 편을 가릅니다.</S.Hint>
        ) : (
          <>
            <SideNames>
              {(['A', 'B'] as const).map((slot, index) => (
                <SideNameInput
                  key={slot}
                  aria-label={`${index + 1}번 진영 이름`}
                  placeholder={placeholderOf(slot)}
                  value={names[index]}
                  onChange={(change) => {
                    const next: [string, string] = [...names]
                    next[index] = change.target.value
                    update({ sides: { names: next, assignment } })
                  }}
                />
              ))}
            </SideNames>
            <RowList>
              {participants.map((row) => {
                const key = participantKey(row)
                const slot = assignment[key] ?? null
                return (
                  <Row key={key}>
                    <RowName>{participantName(row)}</RowName>
                    <KitChipGroup role="radiogroup" aria-label={`${participantName(row)}의 진영`}>
                      {(['A', 'B', null] as const).map((value) => (
                        <SmallChip
                          key={value ?? 'none'}
                          type="button"
                          role="radio"
                          aria-checked={slot === value}
                          $selected={slot === value}
                          onClick={() => {
                            playClickSound()
                            setSlot(key, value)
                          }}
                        >
                          {value === 'A' ? names[0] || placeholderOf('A') : value === 'B' ? names[1] || placeholderOf('B') : '어느 편도 아님'}
                        </SmallChip>
                      ))}
                    </KitChipGroup>
                  </Row>
                )
              })}
            </RowList>
            {canSuggest && (
              <TextButton
                type="button"
                onClick={() =>
                  update({ sides: { names, assignment: suggestSideAssignment(participants, assignment) } })
                }
              >
                참여국 역할로 나누기 (주도·동맹 / 대상·적대·피해)
              </TextButton>
            )}
          </>
        )}
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 성립·소멸 ───────────────────────────────────────────────────────────

function StatehoodField({
  participants,
  participantName,
  onAdd,
  onRemove,
  playClickSound,
}: {
  participants: EventCountryParticipant[]
  participantName: (row: EventCountryParticipant) => string
  onAdd: (role: 'FOUNDED' | 'DISSOLVED') => void
  onRemove: (key: string) => void
  playClickSound: () => void
}) {
  const slots: Array<{ role: 'FOUNDED' | 'DISSOLVED'; label: string; add: string }> = [
    { role: 'FOUNDED', label: '세워진 나라', add: '세워진 나라 고르기' },
    { role: 'DISSOLVED', label: '무너진 나라', add: '무너진 나라 고르기' },
  ]
  return (
    <S.FormRow>
      <S.FormLabel as="span">성립·소멸</S.FormLabel>
      <S.FormField>
        <StatehoodGrid>
          {slots.map((slot) => {
            const rows = participants.filter((row) => row.role === slot.role)
            return (
              <div key={slot.role}>
                <SlotLabel>{slot.label}</SlotLabel>
                <KitSelectedItems>
                  {rows.map((row) => (
                    <KitSelectedItem key={participantKey(row)}>
                      <span>{participantName(row)}</span>
                      <KitRemoveButton
                        type="button"
                        aria-label={`${participantName(row)} 빼기`}
                        onClick={() => onRemove(participantKey(row))}
                      >
                        <FiX size={14} />
                      </KitRemoveButton>
                    </KitSelectedItem>
                  ))}
                  <KitAddButton
                    type="button"
                    onClick={() => {
                      playClickSound()
                      onAdd(slot.role)
                    }}
                  >
                    <FiPlus size={15} />
                    {slot.add}
                  </KitAddButton>
                </KitSelectedItems>
              </div>
            )
          })}
        </StatehoodGrid>
        <S.Hint>병합이면 무너진 나라(병합된 쪽)와 그대로 남는 나라를 함께 넣습니다. 고른 나라는 참여국에도 들어갑니다.</S.Hint>
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 조약 ────────────────────────────────────────────────────────────────

function TreatyField({
  drafts,
  update,
  eventTitle,
  onPick,
}: {
  drafts: RegisterFacetDrafts
  update: (patch: Partial<RegisterFacetDrafts>) => void
  eventTitle: string
  onPick: () => void
}) {
  const treaty = drafts.treaty
  const suggested = treatyNameFromEventTitle(eventTitle.trim())
  return (
    <S.FormRow>
      <S.FormLabel as="span">맺어진 조약</S.FormLabel>
      <S.FormField>
        <KitChipGroup role="radiogroup" aria-label="조약 기록 방법">
          {(
            [
              ['create', '이 사건으로 새 조약 만들기'],
              ['link', '이미 있는 조약 잇기'],
              ['none', '나중에'],
            ] as const
          ).map(([mode, label]) => (
            <KitChoiceChip
              key={mode}
              type="button"
              role="radio"
              aria-checked={treaty.mode === mode}
              $selected={treaty.mode === mode}
              onClick={() => {
                if (mode === 'create') update({ treaty: { mode: 'create', name: '' } })
                else if (mode === 'link') onPick()
                else update({ treaty: { mode: 'none' } })
              }}
            >
              {label}
            </KitChoiceChip>
          ))}
        </KitChipGroup>
        {treaty.mode === 'create' && (
          <>
            <S.Input
              aria-label="새 조약 이름"
              placeholder={suggested || '조약 이름'}
              value={treaty.name}
              onChange={(change) => update({ treaty: { mode: 'create', name: change.target.value } })}
            />
            <S.Hint>비워 두면 사건명에서 &lsquo;체결·조인&rsquo;을 뗀 이름으로 만들고, 참여국을 서명국으로 옮깁니다.</S.Hint>
          </>
        )}
        {treaty.mode === 'link' && (
          <KitSelectedItems>
            <KitSelectedItem>
              <span>{treaty.treatyName}</span>
              <KitRemoveButton type="button" aria-label="조약 빼기" onClick={() => update({ treaty: { mode: 'none' } })}>
                <FiX size={14} />
              </KitRemoveButton>
            </KitSelectedItem>
          </KitSelectedItems>
        )}
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 인물 ────────────────────────────────────────────────────────────────

function PersonListField({
  label,
  hint,
  people,
  onChange,
  onAdd,
  addLabel,
  withRole = false,
}: {
  label: string
  hint: string
  people: PickedPerson[]
  onChange: (next: PickedPerson[]) => void
  onAdd: () => void
  addLabel: string
  withRole?: boolean
}) {
  return (
    <S.FormRow>
      <S.FormLabel as="span">{label}</S.FormLabel>
      <S.FormField>
        {people.length > 0 && (
          <RowList>
            {people.map((person) => (
              <Row key={person.personId}>
                <RowName>{person.name}</RowName>
                {withRole ? (
                  <RowInput
                    aria-label={`${person.name}이(가) 한 일`}
                    placeholder="한 일 (선택)"
                    value={person.role ?? ''}
                    onChange={(change) =>
                      onChange(
                        people.map((item) =>
                          item.personId === person.personId ? { ...item, role: change.target.value } : item,
                        ),
                      )
                    }
                  />
                ) : (
                  <span />
                )}
                <KitRemoveButton
                  type="button"
                  aria-label={`${person.name} 빼기`}
                  onClick={() => onChange(people.filter((item) => item.personId !== person.personId))}
                >
                  <FiX size={14} />
                </KitRemoveButton>
              </Row>
            ))}
          </RowList>
        )}
        <KitAddButton type="button" onClick={onAdd}>
          <FiPlus size={15} />
          {addLabel}
        </KitAddButton>
        <S.Hint>{hint}</S.Hint>
      </S.FormField>
    </S.FormRow>
  )
}

// ─── 고르기 창 ───────────────────────────────────────────────────────────

const PICKER_TITLE: Record<PickerKind, string> = {
  persons: '참여 인물 고르기',
  power: '취임·즉위한 인물 고르기',
  organizations: '기업·조직 고르기',
  treaty: '조약 고르기',
  election: '선거 고르기',
}

/**
 * 기록마다 후보를 찾는 창 — 하나의 SelectModal을 종류만 바꿔 쓴다. 인물·조약은 서버 검색, 조직·선거는
 * 목록을 받아 이름으로 거른다(서버 검색 파라미터가 없다).
 */
function RecordPickers({
  kind,
  onClose,
  drafts,
  update,
}: {
  kind: PickerKind | null
  onClose: () => void
  drafts: RegisterFacetDrafts
  update: (patch: Partial<RegisterFacetDrafts>) => void
}) {
  const [term, setTerm] = useState('')
  const debounced = useDebouncedValue(term, 250, kind ?? '')
  const query = useQuery({
    queryKey: ['register-record-candidates', kind, kind === 'persons' || kind === 'power' || kind === 'treaty' ? debounced : ''],
    enabled: Boolean(kind),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async (): Promise<SelectOption[]> => {
      if (kind === 'persons' || kind === 'power') {
        if (!debounced.trim()) return []
        const people = await searchPersons(debounced.trim(), 30)
        return people.map((person) => ({ value: person.id, label: getPersonDisplayName(person) }))
      }
      if (kind === 'treaty') {
        const list = await treatyApi.getAll({ search: debounced.trim() || undefined, take: 50 })
        return list.items.map((treaty) => ({ value: treaty.id, label: treaty.name, description: treaty.signDate?.slice(0, 10) }))
      }
      if (kind === 'organizations') {
        const organizations = await getOrganizations(nestiaApiService.getConnection())
        return organizations.map((organization) => ({ value: organization.id, label: organization.name }))
      }
      if (kind === 'election') {
        const elections = await getElections()
        return elections.map((election) => ({
          value: election.id,
          label: election.name,
          description: election.pollDate?.slice(0, 10),
        }))
      }
      return []
    },
  })
  const options = useMemo(() => {
    const all = query.data ?? []
    // 서버 검색이 아닌 목록은 이름으로 거른다
    if (kind === 'organizations' || kind === 'election') {
      const needle = term.trim().toLowerCase()
      return needle ? all.filter((option) => String(option.label).toLowerCase().includes(needle)) : all
    }
    return all
  }, [query.data, kind, term])

  if (!kind) return null
  const close = () => {
    setTerm('')
    onClose()
  }
  const labelOf = (value: string) => String(options.find((option) => option.value === value)?.label ?? '')
  const multiple = kind === 'persons' || kind === 'power' || kind === 'organizations'
  const selectedValues =
    kind === 'persons'
      ? drafts.persons.map((person) => person.personId)
      : kind === 'power'
        ? drafts.power.map((person) => person.personId)
        : kind === 'organizations'
          ? drafts.organizations.map((organization) => organization.id)
          : []

  const onSelect = (value: string) => {
    if (kind === 'persons' || kind === 'power') {
      const list = kind === 'persons' ? drafts.persons : drafts.power
      const next = list.some((person) => person.personId === value)
        ? list.filter((person) => person.personId !== value)
        : [...list, { personId: value, name: labelOf(value) }]
      update(kind === 'persons' ? { persons: next } : { power: next })
      return
    }
    if (kind === 'organizations') {
      const next = drafts.organizations.some((organization) => organization.id === value)
        ? drafts.organizations.filter((organization) => organization.id !== value)
        : [...drafts.organizations, { id: value, name: labelOf(value), role: 'PRINCIPAL' as const }]
      update({ organizations: next })
      return
    }
    if (kind === 'treaty') update({ treaty: { mode: 'link', treatyId: value, treatyName: labelOf(value) } })
    if (kind === 'election') update({ election: { id: value, name: labelOf(value) } })
    close()
  }

  return (
    <SelectModal
      isOpen
      onClose={close}
      title={PICKER_TITLE[kind]}
      options={options}
      multiple={multiple}
      selectedValues={multiple ? selectedValues : undefined}
      onSelect={onSelect}
      searchable
      searchPlaceholder={kind === 'persons' || kind === 'power' ? '인물 이름으로 검색' : '이름으로 검색'}
      onQueryChange={setTerm}
      isLoading={query.isLoading}
      isSearching={query.isFetching || term !== debounced}
      hasError={query.isError}
      onRetry={() => void query.refetch()}
    />
  )
}

// ─── 스타일 ──────────────────────────────────────────────────────────────

const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1.6fr) 28px;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 12px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.light};
  border-radius: 10px;
  background: ${({ theme }) => S.getC(theme).background.section};

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr) 28px;
    > :nth-child(2) {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
`

const RowName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const rowControl = `
  height: 34px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
`

const RowInput = styled.input`
  ${rowControl}
  min-width: 0;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const RowSelect = styled.select`
  ${rowControl}
  padding: 0 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const SmallChip = styled(KitChoiceChip)`
  min-height: 30px;
  padding: 0 11px;
  font-size: 12.5px;
`

const SideNames = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const SideNameInput = styled.input`
  ${rowControl}
  padding: 0 10px;
  border: 1px solid ${({ theme }) => S.getC(theme).border.default};
  background: ${({ theme }) => S.getC(theme).background.content};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => S.getC(theme).border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => S.getC(theme).border.focusHalo};
  }
`

const TextButton = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
`

const StatehoodGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const SlotLabel = styled.div`
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`
