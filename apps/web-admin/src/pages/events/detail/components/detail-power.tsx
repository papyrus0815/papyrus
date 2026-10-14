/**
 * 권력 교체·선거 — "이 사건으로 누가 자리에 올랐고, 표는 어떻게 나뉘었나".
 *
 * 정치 사건(58건)에는 전용 칸이 없었다. 그런데 연결할 그릇은 이미 있었다
 * (docs/event-category-features-review.md §3 정치):
 *  - 재임·재위의 accessionEventId(이 사건으로 취임·즉위) — 인물 쪽 폼에서만 쓸 수 있어 실DB 0건
 *  - Election.eventId(이 선거의 서사 사건) — 선거 쪽에서만 쓸 수 있어 실DB 0건
 * 이 섹션은 두 연결을 **사건 쪽에서** 걸고 보여 준다. 새로 저장하는 표는 없다.
 *
 * - 취임·즉위: 한 줄 = 전임자 → 이 사람. 전임자는 인물 상세 '같은 국가 전/후 재위'와 같은
 *   reign-adjacency를 쓴다(승계 축 = 국가원수⊥정부수반 분리가 이미 거기 있다).
 *   후보는 서버가 좁힌다 — 이 사건의 참여 인물 중 사건 연도 ±1년에 시작한 기록만.
 * - 선거: 정당 의석(없으면 득표율) 막대 + 당선자. 결과 정본은 선거(GET /elections/:id)다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerHairlineStrong, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import {
  type ElectionDetailDto,
  type ElectionPartyResultDto,
  getElection,
  getElections,
  updateElection,
} from '@/shared/api/election'
import { eventKeys } from '@/shared/api/event-query-keys'
import { type EventAccession, getEventAccessionCandidates } from '@/shared/api/events'
import { invalidateTenureQueries } from '@/shared/api/invalidate-tenure'
import { personCareerApi } from '@/shared/api/person-career'
import {
  type AdjacencyNeighbor,
  getPersonReignAdjacency,
  personReignAdjacencyKeys,
} from '@/shared/api/person-reign-adjacency'
import { formatCountryYearShort } from '@/shared/lib/country-period'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

interface DetailPowerProps {
  event: EventDetail
  /** 정치 사건 — 비어 있어도 섹션을 띄워 연결을 안내한다 */
  expectPower: boolean
  onPersonClick: (personId: string) => void
}

const ELECTION_TYPE_LABEL: Record<string, string> = {
  PRESIDENTIAL_OR_HEAD: '대통령·수반 직선',
  PARLIAMENTARY_CONSTITUENCY: '의회 지역구',
  PARLIAMENTARY_PROPORTIONAL: '의회 비례대표',
  LOCAL: '지방선거',
  BY_ELECTION: '보궐·중간선거',
  PRIMARY: '경선·예비선거',
  REFERENDUM_OR_PLEBISCITE: '국민투표',
  OTHER: '기타',
}

/** 앞 기록이 끝난 해와 이 사람이 시작한 해가 이보다 벌어지면 직전 전임자로 보지 않는다 */
const PREDECESSOR_MAX_GAP = 1

/** 막대에 그릴 정당 수 — 나머지는 '기타'로 접는다 */
const PARTY_BAR_LIMIT = 6
const FALLBACK_PARTY_COLORS = ['#64748b', '#94a3b8', '#475569', '#cbd5e1', '#334155', '#a8b3c4']

const yearLabel = (year: number | null) => formatCountryYearShort(year) ?? '?'
const spanLabel = (start: number | null, end: number | null) =>
  start == null && end == null ? null : `${yearLabel(start)}–${end == null ? '' : yearLabel(end)}`

export function hasPowerData(event: EventDetail): boolean {
  return (event.accessions?.length ?? 0) > 0 || (event.elections?.length ?? 0) > 0
}

export function DetailPower({ event, expectPower, onPersonClick }: DetailPowerProps) {
  const queryClient = useQueryClient()
  const accessions = useMemo(() => event.accessions ?? [], [event.accessions])
  const elections = useMemo(() => event.elections ?? [], [event.elections])
  const eventYear = parseIsoDateParts(event.startDate ?? null)?.year ?? null

  const [accessionPickerOpen, setAccessionPickerOpen] = useState(false)
  const [electionPickerOpen, setElectionPickerOpen] = useState(false)

  const refreshEvent = () => void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })

  /* ── 취임·즉위 ── */
  const { data: accessionCandidates = [], isLoading: accessionCandidatesLoading } = useQuery({
    queryKey: [...eventKeys.detail(event.id), 'accession-candidates'],
    queryFn: () => getEventAccessionCandidates(event.id),
    enabled: accessionPickerOpen,
    staleTime: 30_000,
  })

  const setAccessionMutation = useMutation({
    mutationFn: async ({ record, eventId }: { record: EventAccession; eventId: string | null }) => {
      const dto = { accessionEventId: eventId }
      if (record.recordKind === 'TENURE') await personCareerApi.updateGovernmentPositionTenure(record.recordId, dto)
      else await personCareerApi.updateSovereignReign(record.recordId, dto)
      return record
    },
    onSuccess: (record, variables) => {
      notify.success(variables.eventId ? `${record.personName}의 취임·즉위를 이 사건에 연결했습니다` : '연결을 해제했습니다')
      invalidateTenureQueries(queryClient, { personId: record.personId })
      void queryClient.invalidateQueries({ queryKey: [...eventKeys.detail(event.id), 'accession-candidates'] })
      refreshEvent()
    },
    onError: () => notify.error('취임·즉위 연결을 바꾸지 못했습니다'),
  })

  const accessionOptions = accessionCandidates.map((record) => ({
    value: `${record.recordKind}:${record.recordId}`,
    label: `${record.regnalName ?? record.personName}${record.title ? ` · ${record.title}` : ''}`,
    description: [
      record.countryName,
      spanLabel(record.startYear, record.endYear),
      record.accessionEventId ? '다른 사건에 연결됨 — 고르면 이 사건으로 옮김' : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }))

  const unlinkAccession = async (record: EventAccession) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `${record.regnalName ?? record.personName}의 ${record.title ?? '재임·재위'} 기록에서 '이 사건으로 취임' 표시만 지웁니다. 기록 자체는 남습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) setAccessionMutation.mutate({ record, eventId: null })
  }

  /* ── 선거 ── */
  const electionDetails = useQueries({
    queries: elections.map((election) => ({
      queryKey: ['election', election.id] as const,
      queryFn: () => getElection(election.id),
      staleTime: 60_000,
    })),
  })

  const { data: allElections = [], isLoading: electionsLoading } = useQuery({
    queryKey: ['elections', 'event-link-candidates'],
    queryFn: () => getElections(),
    enabled: electionPickerOpen,
    staleTime: 60_000,
  })

  const electionOptions = useMemo(() => {
    const linked = new Set(elections.map((election) => election.id))
    const yearOf = (iso: string) => parseIsoDateParts(iso)?.year ?? null
    return allElections
      .filter((election) => !linked.has(election.id))
      .sort((left, right) => {
        if (eventYear == null) return right.pollDate.localeCompare(left.pollDate)
        const distance = (iso: string) => Math.abs((yearOf(iso) ?? 0) - eventYear)
        return distance(left.pollDate) - distance(right.pollDate)
      })
      .map((election) => ({
        value: election.id,
        label: election.name,
        description: [ELECTION_TYPE_LABEL[election.electionType] ?? election.electionType, election.pollDate.slice(0, 10)]
          .filter(Boolean)
          .join(' · '),
      }))
  }, [allElections, elections, eventYear])

  const setElectionMutation = useMutation({
    mutationFn: ({ electionId, eventId }: { electionId: string; eventId: string | null }) =>
      updateElection(electionId, { eventId }),
    onSuccess: (_result, variables) => {
      notify.success(variables.eventId ? '선거를 이 사건에 연결했습니다' : '연결을 해제했습니다')
      void queryClient.invalidateQueries({ queryKey: ['election', variables.electionId] })
      void queryClient.invalidateQueries({ queryKey: ['elections'] })
      refreshEvent()
    },
    onError: () => notify.error('선거 연결을 바꾸지 못했습니다'),
  })

  const unlinkElection = async (electionId: string, name: string) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `「${name}」과 이 사건의 연결만 끊습니다. 선거 결과는 그대로 남습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) setElectionMutation.mutate({ electionId, eventId: null })
  }

  if (!expectPower && accessions.length === 0 && elections.length === 0) return null

  return (
    <S.Section id="power">
      <S.SectionHeader>
        <S.SectionTitle>권력 교체·선거</S.SectionTitle>
      </S.SectionHeader>

      {accessions.length > 0 && (
        <Rows aria-label="취임·즉위">
          {accessions.map((record) => (
            <AccessionRow
              key={`${record.recordKind}:${record.recordId}`}
              record={record}
              onPersonClick={onPersonClick}
              onUnlink={() => void unlinkAccession(record)}
            />
          ))}
        </Rows>
      )}

      {elections.length > 0 && (
        <Rows aria-label="선거">
          {elections.map((election, index) => (
            <ElectionRow
              key={election.id}
              name={election.name}
              detail={electionDetails[index]?.data}
              onPersonClick={onPersonClick}
              onUnlink={() => void unlinkElection(election.id, election.name)}
            />
          ))}
        </Rows>
      )}

      {accessions.length === 0 && elections.length === 0 && (
        <S.HelperText>
          이 사건으로 취임·즉위한 기록이나 이 사건의 선거를 연결하면 전임자에서 후임자로 넘어간 자리와
          정당별 결과가 여기 모입니다.
        </S.HelperText>
      )}

      <Actions>
        <ActionButton type="button" onClick={() => setAccessionPickerOpen(true)}>
          <FiPlus size={14} /> 취임·즉위 연결
        </ActionButton>
        <ActionButton type="button" onClick={() => setElectionPickerOpen(true)}>
          <FiPlus size={14} /> 선거 연결
        </ActionButton>
      </Actions>

      <SelectModal
        isOpen={accessionPickerOpen}
        onClose={() => setAccessionPickerOpen(false)}
        title="이 사건으로 취임·즉위한 기록"
        options={accessionOptions}
        isLoading={accessionCandidatesLoading}
        headerExtra={
          <PickerNote>
            {!accessionCandidatesLoading && accessionOptions.length === 0
              ? '이 사건의 참여 인물 중 사건 연도 ±1년에 시작한 재임·재위가 없습니다. 참여 인물을 먼저 추가하세요.'
              : '이 사건의 참여 인물 중 사건 연도 ±1년에 시작한 재임·재위만 보입니다.'}
          </PickerNote>
        }
        onSelect={(value) => {
          setAccessionPickerOpen(false)
          const record = accessionCandidates.find(
            (candidate) => `${candidate.recordKind}:${candidate.recordId}` === value,
          )
          if (record) setAccessionMutation.mutate({ record, eventId: event.id })
        }}
      />

      <SelectModal
        isOpen={electionPickerOpen}
        onClose={() => setElectionPickerOpen(false)}
        title="이 사건의 선거"
        options={electionOptions}
        isLoading={electionsLoading}
        searchable
        searchPlaceholder="선거 이름으로 검색..."
        onSelect={(electionId) => {
          setElectionPickerOpen(false)
          setElectionMutation.mutate({ electionId, eventId: event.id })
        }}
      />
    </S.Section>
  )
}

/* ───────────────────────── 취임·즉위 ───────────────────────── */

function AccessionRow({
  record,
  onPersonClick,
  onUnlink,
}: {
  record: EventAccession
  onPersonClick: (personId: string) => void
  onUnlink: () => void
}) {
  /* 인물 상세 '같은 국가 전/후 재위'와 같은 캐시 — 같은 인물이면 한 번만 읽는다 */
  const { data: adjacency } = useQuery({
    queryKey: personReignAdjacencyKeys.byPerson(record.personId, { scope: 'instance' }),
    queryFn: () => getPersonReignAdjacency(record.personId, { scope: 'instance' }),
    staleTime: 60_000,
  })
  const entry = adjacency?.entries.find((candidate) => candidate.subjectRecordId === record.recordId)
  /* 같은 경계의 공동 선대(공동군주)는 함께 — 본인의 이전 단계(복위)는 전임자가 아니다 */
  const predecessors = (entry?.predecessors ?? []).filter((neighbor) => !neighbor.isSelf)
  const nearest = predecessors.filter(
    (neighbor) => neighbor.record.startYear === predecessors[0]?.record.startYear,
  )
  /*
   * 기록이 듬성하면 '가장 가까운 앞 기록'이 수백 년 전일 수 있다(트럼프 2기의 앞이 DB상 조지
   * 워싱턴). 앞 기록이 끝난 해와 이 사람이 시작한 해 사이가 벌어지면 직전 전임자로 부르지 않는다.
   */
  const gap =
    nearest.length > 0 && record.startYear != null
      ? record.startYear - (nearest[0].record.endYear ?? nearest[0].record.startYear)
      : null
  const direct = gap != null && gap <= PREDECESSOR_MAX_GAP

  return (
    <Row>
      <Head>
        <Handover>
          {direct ? (
            <>
              {nearest.map((neighbor) => (
                <PredecessorName key={neighbor.record.recordId} neighbor={neighbor} onPersonClick={onPersonClick} />
              ))}
              <Arrow aria-hidden>→</Arrow>
            </>
          ) : entry ? (
            <NoPredecessor>직전 전임 기록 없음 →</NoPredecessor>
          ) : null}
          <SubjectButton type="button" onClick={() => onPersonClick(record.personId)}>
            {record.regnalName ?? record.personName}
          </SubjectButton>
        </Handover>
        <UnlinkButton type="button" onClick={onUnlink} aria-label={`${record.personName} 취임 연결 해제`}>
          <FiX />
        </UnlinkButton>
      </Head>
      {!direct && nearest.length > 0 && gap != null && (
        <Meta>
          가장 가까운 앞 기록은 {nearest[0].record.regnalName ?? getPersonDisplayName({ ...nearest[0].person, name: nearest[0].person.name ?? '' })}
          ({spanLabel(nearest[0].record.startYear, nearest[0].record.endYear)}) — {gap}년 비어 있습니다.
        </Meta>
      )}
      <Meta>
        {[
          record.recordKind === 'SOVEREIGN_REIGN' ? '즉위' : '취임',
          record.title,
          record.countryName,
          spanLabel(record.startYear, record.endYear),
        ]
          .filter(Boolean)
          .join(' · ')}
      </Meta>
    </Row>
  )
}

function PredecessorName({
  neighbor,
  onPersonClick,
}: {
  neighbor: AdjacencyNeighbor
  onPersonClick: (personId: string) => void
}) {
  const name =
    neighbor.record.regnalName ??
    getPersonDisplayName({ ...neighbor.person, name: neighbor.person.name ?? '' })
  const span = spanLabel(neighbor.record.startYear, neighbor.record.endYear)
  /* 소유자가 아니면 인물 상세(:id)가 열리지 않는다 — 이름만 보인다 */
  return (
    <span>
      {neighbor.person.isOwned === false ? (
        <PredecessorText>{name}</PredecessorText>
      ) : (
        <PredecessorButton type="button" onClick={() => onPersonClick(neighbor.person.id)}>
          {name}
        </PredecessorButton>
      )}
      {span && <Sub>{span}</Sub>}
    </span>
  )
}

/* ───────────────────────── 선거 ───────────────────────── */

interface PartySlice {
  key: string
  label: string
  color: string
  seats: number | null
  share: number | null
  /** 막대 폭 기준 값(의석 또는 득표율) */
  weight: number
}

function partySlices(results: ElectionPartyResultDto[]): { slices: PartySlice[]; bySeats: boolean } {
  const bySeats = results.some((result) => (result.seatsWon ?? 0) > 0)
  const weighted = results
    .map((result, index) => {
      const share = result.voteSharePercent != null ? Number(result.voteSharePercent) : null
      return {
        key: result.partyId,
        label: result.party?.shortName ?? result.party?.name ?? '정당',
        color: result.party?.brandColor ?? FALLBACK_PARTY_COLORS[index % FALLBACK_PARTY_COLORS.length],
        seats: result.seatsWon ?? null,
        share: Number.isFinite(share) ? share : null,
        weight: bySeats ? (result.seatsWon ?? 0) : (Number.isFinite(share) ? (share as number) : 0),
      }
    })
    .filter((slice) => slice.weight > 0)
    .sort((left, right) => right.weight - left.weight)

  if (weighted.length <= PARTY_BAR_LIMIT) return { slices: weighted, bySeats }
  const head = weighted.slice(0, PARTY_BAR_LIMIT - 1)
  const rest = weighted.slice(PARTY_BAR_LIMIT - 1)
  const sum = (pick: (slice: PartySlice) => number | null) =>
    rest.every((slice) => pick(slice) == null) ? null : rest.reduce((total, slice) => total + (pick(slice) ?? 0), 0)
  return {
    slices: [
      ...head,
      {
        key: 'rest',
        label: `기타 ${rest.length}개`,
        color: '#cbd5e1',
        seats: sum((slice) => slice.seats),
        share: sum((slice) => slice.share),
        weight: rest.reduce((total, slice) => total + slice.weight, 0),
      },
    ],
    bySeats,
  }
}

function ElectionRow({
  name,
  detail,
  onPersonClick,
  onUnlink,
}: {
  name: string
  detail: ElectionDetailDto | undefined
  onPersonClick: (personId: string) => void
  onUnlink: () => void
}) {
  const { slices, bySeats } = partySlices(detail?.partyResults ?? [])
  const total = slices.reduce((sum, slice) => sum + slice.weight, 0)
  const winners = (detail?.candidacies ?? []).filter((candidacy) => candidacy.result?.elected && candidacy.person)
  const turnout = detail?.voterTurnoutPercent != null ? Number(detail.voterTurnoutPercent) : null

  return (
    <Row>
      <Head>
        <ElectionName>{name}</ElectionName>
        <UnlinkButton type="button" onClick={onUnlink} aria-label={`${name} 연결 해제`}>
          <FiX />
        </UnlinkButton>
      </Head>
      {detail && (
        <Meta>
          {[
            ELECTION_TYPE_LABEL[detail.electionType] ?? detail.electionType,
            detail.pollDate?.slice(0, 10),
            detail.totalSeats ? `총 ${detail.totalSeats}석` : null,
            turnout != null && Number.isFinite(turnout) ? `투표율 ${turnout.toFixed(1)}%` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Meta>
      )}

      {winners.length > 0 && (
        <Facet>
          <FacetLabel>당선</FacetLabel>
          <Names>
            {winners.map((candidacy) => (
              <li key={candidacy.id}>
                <PredecessorButton type="button" onClick={() => onPersonClick(candidacy.person!.id)}>
                  {getPersonDisplayName(candidacy.person!)}
                </PredecessorButton>
                {candidacy.party && <Sub>{candidacy.party.shortName ?? candidacy.party.name}</Sub>}
                {candidacy.result?.voteSharePercent != null && (
                  <Sub>{Number(candidacy.result.voteSharePercent).toFixed(1)}%</Sub>
                )}
              </li>
            ))}
          </Names>
        </Facet>
      )}

      {slices.length > 0 && total > 0 && (
        <Facet>
          <FacetLabel>{bySeats ? '의석' : '득표'}</FacetLabel>
          <div>
            <PartyBar role="img" aria-label={slices.map((slice) => `${slice.label} ${bySeats ? `${slice.seats}석` : `${slice.share?.toFixed(1)}%`}`).join(', ')}>
              {slices.map((slice) => (
                <PartySegment key={slice.key} style={{ flexGrow: slice.weight, background: slice.color }} />
              ))}
            </PartyBar>
            <Legend>
              {slices.map((slice) => (
                <LegendItem key={slice.key}>
                  <Swatch style={{ background: slice.color }} aria-hidden />
                  <span>{slice.label}</span>
                  <Sub>
                    {[
                      slice.seats != null && bySeats ? `${slice.seats}석` : null,
                      slice.share != null ? `${slice.share.toFixed(1)}%` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Sub>
                </LegendItem>
              ))}
            </Legend>
          </div>
        </Facet>
      )}

      {detail && slices.length === 0 && winners.length === 0 && (
        <Meta>결과가 아직 기록되지 않은 선거입니다.</Meta>
      )}
    </Row>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 4px;
  }

  &:last-child {
    border-bottom: none;
  }
`

const Head = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
`

const Handover = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const buttonReset = `
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
`

const SubjectButton = styled.button`
  ${buttonReset}
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const PredecessorButton = styled.button`
  ${buttonReset}
  color: inherit;
  text-decoration: underline;
  text-decoration-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  text-underline-offset: 3px;

  &:hover,
  &:focus-visible {
    text-decoration-color: currentColor;
  }
`

const PredecessorText = styled.span``

const NoPredecessor = styled.span`
  font-size: 12.5px;
  color: ${metaText};
`

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionName = styled.span`
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Meta = styled.div`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const Sub = styled.span`
  margin-left: 5px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const Facet = styled.div`
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 6px;
  align-items: baseline;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const FacetLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

const Names = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

/* 의석 막대 — 한 줄 가로 띠. 칸 사이 1px 틈은 지면색으로(색이 맞붙어 경계가 사라지지 않게). */
const PartyBar = styled.div`
  display: flex;
  gap: 1px;
  height: 10px;
  border-radius: ${RADIUS.SM};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
`

const PartySegment = styled.span`
  flex-basis: 0;
  min-width: 2px;
`

const Legend = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LegendItem = styled.li`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
`

const Swatch = styled.span`
  align-self: center;
  width: 8px;
  height: 8px;
  border-radius: 2px;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PickerNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${metaText};
`

const UnlinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`
