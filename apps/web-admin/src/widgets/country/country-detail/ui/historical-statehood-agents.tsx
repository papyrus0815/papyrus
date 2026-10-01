/**
 * 역사 국가의 건국·멸망 주체 — "누가 세웠나 / 누구에게 멸망했나".
 *
 * 건국·멸망 카드 한 줄의 값 칸이다. 주체는 인물·역사 국가·현대 국가·자유 입력 중 하나이고,
 * 한 검색 모달에서 셋을 함께 찾는다(없으면 '직접 입력'). 역할 메모(예: '사비성 함락')는
 * 칩을 눌러 고친다.
 *
 * 계승 관계(전신·후신)와 다르다 — 후신은 '뒤를 이은 나라', 이쪽은 '무너뜨린 쪽'이다.
 */
import { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { countryKeys } from '@/entities/country/api'
import { historicalCountryKeys } from '@/entities/historical-country/api'
import { personKeys } from '@/entities/person/api'
import { getAllCountries } from '@/shared/api/countries'
import {
  type StatehoodAgent,
  type StatehoodAgentSide,
  createStatehoodAgent,
  deleteStatehoodAgent,
  getAllHistoricalCountries,
  updateStatehoodAgent,
} from '@/shared/api/historical-countries'
import { getAllPersons } from '@/shared/api/persons'
import {
  formatCountryYearShort,
  toSignedYear,
} from '@/shared/lib/country-period'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

import { FillChip } from './founding-fill-chip.styles'
import {
  type PickerCandidate,
  type PickerFilter,
  StatehoodPickerModal,
} from './statehood-picker-modal'

/** 종류별 후보 상한 — 인물 전량(수백 명)을 다 그리면 모달이 무거워진다 */
const OPTION_LIMIT_PER_KIND = 40
/** 검색어 없을 때 '그 무렵' 창 — 인물 생몰·나라 존속이 기준 해 앞뒤 이만큼과 겹치면 */
const PERSON_NEAR_YEARS = 40
const COUNTRY_NEAR_YEARS = 100

/**
 * 필터 — 검색 전 '전체'에는 현대 국가를 넣지 않는다. 시대를 따질 수 없어 이름순 70여 개가
 * '그 무렵' 목록 꼬리에 통째로 붙기 때문이다. 검색하면 전체에도 섞인다.
 */
const filtersFor = (hasQuery: boolean): PickerFilter[] => [
  {
    key: 'all',
    label: '전체',
    kinds: hasQuery
      ? ['person', 'historicalCountry', 'country']
      : ['person', 'historicalCountry'],
  },
  { key: 'person', label: '인물', kinds: ['person'] },
  {
    key: 'historicalCountry',
    label: '역사 국가',
    kinds: ['historicalCountry'],
  },
  { key: 'country', label: '현대 국가', kinds: ['country'] },
]

interface HistoricalStatehoodAgentsProps {
  historicalCountryId: string
  side: StatehoodAgentSide
  agents: StatehoodAgent[]
  /** '건국'·'멸망'(정권이면 '성립'·'종료') — 안내 문구용 */
  title: string
  /** 기준 해(부호 연도) — '그 무렵' 후보를 앞세운다 */
  anchorYear: number | null
  /**
   * 주면 목록 없이 이 이름의 칩 하나만 그린다 — 카드 아래 '비어 있음' 줄에 들어갈 때.
   * (모달은 이 컴포넌트가 들고 있어서 칩도 여기서 그린다)
   */
  triggerLabel?: string
  /**
   * 모달 열림 알림 — 칩 모드에서 첫 주체를 추가하면 부모가 칩(=이 컴포넌트)을 내려 모달까지
   * 닫혀 버렸다. 부모는 열려 있는 동안 칩을 유지한다.
   */
  onPickerOpenChange?: (open: boolean) => void
}

interface LooseNamed {
  id: string
  name: string
  surname?: string | null
  middleName?: string | null
  nameDisplayOrder?: string | null
  enName?: string | null
  startEra?: string | null
  startYear?: number | null
  endEra?: string | null
  endYear?: number | null
  birthEra?: string | null
  birthYear?: number | null
  deathEra?: string | null
  deathYear?: number | null
  /** 인물의 주 국적 역사 국가 — 같은 나라 사람을 앞세우는 근거 */
  historicalCountryId?: string | null
}

function spanOf(
  startEra: string | null | undefined,
  startYear: number | null | undefined,
  endEra: string | null | undefined,
  endYear: number | null | undefined,
): string {
  const start = formatCountryYearShort(toSignedYear(startEra, startYear))
  const end = formatCountryYearShort(toSignedYear(endEra, endYear))
  if (!start && !end) return ''
  return `${start ?? '?'}–${end ?? ''}`
}

/** 구간 [start, end]와 기준 해의 거리 — 안에 있으면 0, 끝이 미상이면 한쪽만 본다 */
function distanceToSpan(
  anchor: number,
  start: number | null,
  end: number | null,
): number {
  if (start == null && end == null) return Number.POSITIVE_INFINITY
  const low = start ?? end!
  const high = end ?? start!
  if (anchor < low) return low - anchor
  if (anchor > high) return anchor - high
  return 0
}

/** '건국 당시 45세' / '건국 12년 전 사망' — 인물이 그 해와 어떤 사이였나 */
function personRelation(
  birth: number | null,
  death: number | null,
  anchor: number | null,
  subject: string,
): string | undefined {
  if (anchor == null || (birth == null && death == null)) return undefined
  if (birth != null && anchor < birth)
    return `${subject} ${birth - anchor}년 뒤 출생`
  if (death != null && anchor > death)
    return `${subject} ${anchor - death}년 전 사망`
  if (birth != null) return `${subject} 당시 ${anchor - birth}세`
  return undefined
}

/** '건국 당시 존속' / '건국 12년 전 멸망' — 나라가 그 해와 어떤 사이였나 */
function countryRelation(
  start: number | null,
  end: number | null,
  anchor: number | null,
  subject: string,
): string | undefined {
  if (anchor == null || (start == null && end == null)) return undefined
  if (start != null && anchor < start)
    return `${subject} ${start - anchor}년 뒤 성립`
  if (end != null && anchor > end) return `${subject} ${anchor - end}년 전 소멸`
  return `${subject} 당시 존속`
}

function includesFolded(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  if (!haystack) return false
  return haystack.toLowerCase().normalize('NFKD').includes(needle)
}

function agentLabel(agent: StatehoodAgent): string {
  // Person.regnalName은 오염 필드('Wilhelm')라 쓰지 않는다 — 왕명은 재위 기록 쪽 값이다
  if (agent.kind === 'person' && agent.person) {
    return getPersonDisplayName(agent.person, true) || agent.name
  }
  return agent.name
}

function agentHref(agent: StatehoodAgent): string | null {
  if (!agent.refId) return null
  if (agent.kind === 'person')
    return pathKeys.personsTimelineDetail(agent.refId)
  return pathKeys.countryDetail(agent.refId)
}

const KIND_LABEL: Record<StatehoodAgent['kind'], string> = {
  person: '인물',
  historicalCountry: '역사 국가',
  country: '현대 국가',
  name: '',
}

export function HistoricalStatehoodAgents({
  historicalCountryId,
  side,
  agents,
  title,
  anchorYear,
  triggerLabel,
  onPickerOpenChange,
}: HistoricalStatehoodAgentsProps) {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [addedThisSession, setAddedThisSession] = useState(0)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  useEffect(() => {
    onPickerOpenChange?.(pickerOpen)
  }, [pickerOpen, onPickerOpenChange])

  // 후보는 모달을 열었을 때만 받는다 — 다른 화면과 같은 키라 이미 받아 둔 게 있으면 그대로
  const personsQuery = useQuery({
    queryKey: personKeys.all,
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })
  const historicalQuery = useQuery({
    queryKey: historicalCountryKeys.all,
    queryFn: getAllHistoricalCountries,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })
  const modernQuery = useQuery({
    queryKey: countryKeys.all,
    queryFn: getAllCountries,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })

  const invalidate = () => {
    // 건국·멸망 카드와 목록 국가 모달이 같은 키(foundingSummaryKey)로 읽는다
    void queryClient.invalidateQueries({
      queryKey: [
        'historical-countries',
        historicalCountryId,
        'founding-summary',
      ],
    })
  }

  const createMutation = useMutation({
    mutationFn: (value: string) => {
      const separator = value.indexOf(':')
      const kind = value.slice(0, separator)
      const ref = value.slice(separator + 1)
      return createStatehoodAgent(historicalCountryId, {
        side,
        ...(kind === 'person' ? { personId: ref } : {}),
        ...(kind === 'hc' ? { agentHistoricalCountryId: ref } : {}),
        ...(kind === 'country' ? { agentCountryId: ref } : {}),
        ...(kind === 'name' ? { name: ref } : {}),
      })
    },
    onSuccess: (agent) => {
      setAddedThisSession((count) => count + 1)
      notify.success(
        `'${agentLabel(agent)}'을(를) ${title} 주체로 추가했습니다`,
      )
      invalidate()
    },
    onError: (error: Error) =>
      notify.error(error.message || '주체를 추가하지 못했습니다'),
  })

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => deleteStatehoodAgent(agentId),
    onSuccess: () => invalidate(),
    onError: () => notify.error('주체를 지우지 못했습니다'),
  })

  const noteMutation = useMutation({
    mutationFn: ({ agentId, note }: { agentId: string; note: string }) =>
      updateStatehoodAgent(agentId, { note: note.trim() || null }),
    onSuccess: () => {
      setEditingNoteId(null)
      invalidate()
    },
    onError: () => notify.error('역할 메모를 저장하지 못했습니다'),
  })

  const existing = useMemo(
    () =>
      new Set(
        agents.map((agent) =>
          agent.kind === 'person'
            ? `person:${agent.refId}`
            : agent.kind === 'historicalCountry'
              ? `hc:${agent.refId}`
              : agent.kind === 'country'
                ? `country:${agent.refId}`
                : `name:${agent.name}`,
        ),
      ),
    [agents],
  )

  const candidates = useMemo<PickerCandidate[]>(() => {
    const term = searchTerm.trim().toLowerCase().normalize('NFKD')
    const persons = (personsQuery.data ?? []) as unknown as LooseNamed[]
    const historicals = (historicalQuery.data ?? []) as unknown as LooseNamed[]
    const moderns = (modernQuery.data ?? []) as unknown as LooseNamed[]
    const result: PickerCandidate[] = []

    /*
     * 인물 — 검색어가 없으면 기준 해 앞뒤 40년 안에 살아 있던 사람을, 그 해에 가까운 순으로.
     * (건국자·멸망시킨 사람은 그 해에 살아 있었다 — 1871년 카드에 5세기 인물을 띄울 까닭이 없다)
     */
    const personRows = persons
      .map((person) => {
        const birth = toSignedYear(person.birthEra, person.birthYear)
        const death = toSignedYear(person.deathEra, person.deathYear)
        const display = getPersonDisplayName(person) || person.name
        return { person, birth, death, display }
      })
      .filter(({ person, display, birth, death }) =>
        term
          ? includesFolded(display, term) || includesFolded(person.name, term)
          : anchorYear != null &&
            distanceToSpan(anchorYear, birth, death) <= PERSON_NEAR_YEARS,
      )
      /*
       * 그 해에 살아 있던 사람은 거리가 모두 0이라 순서가 임의였다(독일 제국 건국자 후보 맨
       * 위에 일본 정치가). 거리가 같으면 이 나라 사람을 앞세운다.
       */
      .sort((left, right) => {
        const leftDistance =
          anchorYear == null
            ? 0
            : distanceToSpan(anchorYear, left.birth, left.death)
        const rightDistance =
          anchorYear == null
            ? 0
            : distanceToSpan(anchorYear, right.birth, right.death)
        const leftOwn =
          left.person.historicalCountryId === historicalCountryId ? 0 : 1
        const rightOwn =
          right.person.historicalCountryId === historicalCountryId ? 0 : 1
        return leftDistance - rightDistance || leftOwn - rightOwn
      })
      .slice(0, OPTION_LIMIT_PER_KIND)
    for (const { person, birth, death, display } of personRows) {
      const value = `person:${person.id}`
      result.push({
        value,
        kind: 'person',
        label: display,
        spanText:
          birth != null || death != null
            ? `${formatCountryYearShort(birth) ?? '?'}–${formatCountryYearShort(death) ?? ''}`
            : undefined,
        hint:
          [
            person.historicalCountryId === historicalCountryId
              ? '이 나라 인물'
              : null,
            personRelation(birth, death, anchorYear, title),
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        added: existing.has(value),
      })
    }

    const countryRows = historicals
      .filter((country) => country.id !== historicalCountryId)
      .map((country) => ({
        country,
        start: toSignedYear(country.startEra, country.startYear),
        end: toSignedYear(country.endEra, country.endYear),
      }))
      .filter(({ country, start, end }) =>
        term
          ? includesFolded(country.name, term) ||
            includesFolded(country.enName, term)
          : anchorYear != null &&
            distanceToSpan(anchorYear, start, end) <= COUNTRY_NEAR_YEARS,
      )
      .sort((left, right) =>
        anchorYear == null
          ? 0
          : distanceToSpan(anchorYear, left.start, left.end) -
            distanceToSpan(anchorYear, right.start, right.end),
      )
      .slice(0, OPTION_LIMIT_PER_KIND)
    for (const { country, start, end } of countryRows) {
      const value = `hc:${country.id}`
      result.push({
        value,
        kind: 'historicalCountry',
        label: country.name,
        spanText:
          spanOf(
            country.startEra,
            country.startYear,
            country.endEra,
            country.endYear,
          ) || undefined,
        hint: countryRelation(start, end, anchorYear, title),
        added: existing.has(value),
      })
    }

    // 현대 국가 — 시대를 따질 수 없어 검색했을 때만(또는 '현대 국가' 탭에서 이름순으로)
    const modernRows = (
      term
        ? moderns.filter((country) => includesFolded(country.name, term))
        : moderns
    )
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    for (const country of modernRows) {
      const value = `country:${country.id}`
      result.push({
        value,
        kind: 'country',
        label: country.name,
        added: existing.has(value),
      })
    }

    // 등록되지 않은 주체('훈족 연합', '반란군') — 검색어를 그대로 이름으로
    const freeName = searchTerm.trim()
    if (freeName && freeName.length <= 100) {
      result.push({
        value: `name:${freeName}`,
        kind: 'free',
        label: `'${freeName}' 이름 그대로 추가`,
        hint: '인물·나라로 등록되지 않은 주체',
        added: existing.has(`name:${freeName}`),
      })
    }
    return result
  }, [
    searchTerm,
    personsQuery.data,
    historicalQuery.data,
    modernQuery.data,
    existing,
    historicalCountryId,
    anchorYear,
    title,
  ])

  const isLoading =
    personsQuery.isLoading || historicalQuery.isLoading || modernQuery.isLoading
  const hasError =
    personsQuery.isError && historicalQuery.isError && modernQuery.isError

  return (
    <>
      {triggerLabel ? (
        <FillChip
          type="button"
          onClick={() => {
            setAddedThisSession(0)
            setPickerOpen(true)
          }}
        >
          <FiPlus aria-hidden /> {triggerLabel}
        </FillChip>
      ) : (
        <Stack>
          {agents.map((agent) => {
            const href = agentHref(agent)
            const label = agentLabel(agent)
            const span =
              agent.kind === 'historicalCountry'
                ? spanOf(
                    agent.startEra,
                    agent.startYear,
                    agent.endEra,
                    agent.endYear,
                  )
                : ''
            return (
              <AgentLine key={agent.id}>
                {href ? (
                  <AgentLink to={href}>{label}</AgentLink>
                ) : (
                  <AgentName>{label}</AgentName>
                )}
                {KIND_LABEL[agent.kind] && (
                  <Muted>{KIND_LABEL[agent.kind]}</Muted>
                )}
                {span && <Muted>{span}</Muted>}
                {editingNoteId === agent.id ? (
                  <NoteForm
                    onSubmit={(submitEvent) => {
                      submitEvent.preventDefault()
                      noteMutation.mutate({
                        agentId: agent.id,
                        note: noteDraft,
                      })
                    }}
                  >
                    <NoteInput
                      autoFocus
                      value={noteDraft}
                      maxLength={255}
                      placeholder={
                        side === 'FOUNDING'
                          ? '예: 위화도 회군 후 즉위'
                          : '예: 사비성 함락'
                      }
                      aria-label={`${label} 역할 메모`}
                      onChange={(changeEvent) =>
                        setNoteDraft(changeEvent.target.value)
                      }
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Escape') {
                          keyEvent.stopPropagation()
                          setEditingNoteId(null)
                        }
                      }}
                    />
                    <TextButton type="submit" disabled={noteMutation.isPending}>
                      저장
                    </TextButton>
                    <TextButton
                      type="button"
                      onClick={() => setEditingNoteId(null)}
                    >
                      취소
                    </TextButton>
                  </NoteForm>
                ) : (
                  <NoteButton
                    type="button"
                    $empty={!agent.note}
                    title="역할 메모 수정"
                    onClick={() => {
                      setNoteDraft(agent.note ?? '')
                      setEditingNoteId(agent.id)
                    }}
                  >
                    {agent.note || '역할 메모'}
                  </NoteButton>
                )}
                <RemoveButton
                  type="button"
                  aria-label={`'${label}'을(를) ${title} 주체에서 빼기`}
                  title="빼기"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(agent.id)}
                >
                  <FiX aria-hidden />
                </RemoveButton>
              </AgentLine>
            )
          })}
          <div>
            <AddButton
              type="button"
              onClick={() => {
                setAddedThisSession(0)
                setPickerOpen(true)
              }}
            >
              <FiPlus aria-hidden />{' '}
              {side === 'FOUNDING'
                ? '세운 인물·나라 추가'
                : '멸망시킨 인물·나라 추가'}
            </AddButton>
          </div>
        </Stack>
      )}

      <StatehoodPickerModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setSearchTerm('')
        }}
        title={
          side === 'FOUNDING' ? `누가 ${title}했나` : `누구에게 ${title}했나`
        }
        subtitle={
          anchorYear != null
            ? `${title} ${formatCountryYearShort(anchorYear)} — 인물·나라를 여럿 붙일 수 있습니다`
            : '인물·나라를 여럿 붙일 수 있습니다'
        }
        anchorYear={anchorYear}
        anchorLabel={title}
        candidates={candidates}
        filters={filtersFor(searchTerm.trim().length > 0)}
        query={searchTerm}
        onQueryChange={setSearchTerm}
        searchPlaceholder="인물·나라 이름으로 검색 — 없으면 입력한 이름 그대로 추가"
        isLoading={isLoading}
        isError={hasError}
        onRetry={() => {
          void personsQuery.refetch()
          void historicalQuery.refetch()
          void modernQuery.refetch()
        }}
        onPick={(candidate) => createMutation.mutate(candidate.value)}
        defaultHeading={
          anchorYear != null
            ? `${formatCountryYearShort(anchorYear)} 무렵 — 그 해에 가까운 순`
            : undefined
        }
        emptyText={
          searchTerm.trim()
            ? `'${searchTerm.trim()}'에 맞는 인물·나라가 없습니다.`
            : '이름으로 검색해 보세요.'
        }
        addedThisSession={addedThisSession}
      />
    </>
  )
}

// ─── Styled ─────────────────────────────────────────────────────────────────

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const AgentLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
`

const AgentLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const AgentName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Muted = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NoteButton = styled.button<{ $empty: boolean }>`
  padding: 0 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme, $empty }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.secondary};
  font-style: ${({ $empty }) => ($empty ? 'italic' : 'normal')};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const NoteForm = styled.form`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const NoteInput = styled.input`
  width: 200px;
  max-width: 100%;
  padding: 2px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TextButton = styled.button`
  padding: 2px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const RemoveButton = styled.button`
  align-self: center;
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
  }
  svg {
    width: 12px;
    height: 12px;
  }
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin-left: -6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`
