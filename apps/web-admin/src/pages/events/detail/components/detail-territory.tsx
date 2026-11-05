import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent, ledgerHairlineStrong } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  type TerritoryTransfer,
  getEventTerritoryTransfers,
  syncEventTerritoryTransfers,
  territoryMethodLabel,
  territoryTransferKeys,
  toTerritoryInput,
} from '@/shared/api/territory-transfers'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import {
  type TerritoryParty,
  effectiveLabel,
  formatArea,
  formatPopulation,
  partyKey,
  partyName,
  summarizeTerritory,
} from './territory-transfer.lib'
import {
  type TerritoryDraft,
  TerritoryTransferModal,
  draftToInput,
  emptyTerritoryDraft,
} from './territory-transfer-modal'

/**
 * 영토 이전 — "이 사건으로 어느 땅이 누구에게서 누구에게로" (docs/event-territory-transfer-review.md).
 *
 * 예전엔 참여국 역할 설명(자유 글)에 '영토 약 21만km² 상실'처럼만 있어 누가 얼마를 가져갔는지 한눈에 볼 수 없었다.
 * 위는 나라별 합계(받은 쪽 막대 · 내준 쪽 한 줄), 아래는 받은 나라별로 묶은 줄. 쓰기는 줄 단위 창(목록 동기화 PUT).
 */
interface DetailTerritoryProps {
  event: EventDetail
  /** 세부가 영토 변경이면 비어 있어도 보인다(빈 상태가 곧 첫 줄 안내) */
  expectTerritory: boolean
  readOnly?: boolean
  onCountryClick?: (countryId: string) => void
}

export function DetailTerritory({ event, expectTerritory, readOnly = false, onCountryClick }: DetailTerritoryProps) {
  const queryClient = useQueryClient()
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: territoryTransferKeys.event(event.id),
    queryFn: () => getEventTerritoryTransfers(event.id),
    staleTime: 30_000,
  })
  const [editing, setEditing] = useState<TerritoryDraft | null>(null)

  const participants = useMemo<TerritoryParty[]>(
    () => [
      ...(event.relatedHistoricalCountries ?? []).map((country) => ({
        countryId: null,
        historicalCountryId: country.id,
        name: country.name,
      })),
      ...(event.relatedCountries ?? []).map((country) => ({
        countryId: country.id,
        historicalCountryId: null,
        name: country.name ?? null,
      })),
    ],
    [event.relatedCountries, event.relatedHistoricalCountries],
  )
  const treaties = useMemo(() => (event.treaties ?? []).map((treaty) => ({ id: treaty.id, name: treaty.name })), [event.treaties])

  const saveMutation = useMutation({
    mutationFn: (next: ReturnType<typeof toTerritoryInput>[]) => syncEventTerritoryTransfers(event.id, next),
    onSuccess: (saved) => {
      queryClient.setQueryData(territoryTransferKeys.event(event.id), saved)
      /* 참여국이 채워졌을 수 있다(내준 나라 = 피해국 · 받은 나라 = 수혜국) — 상세와 나라 쪽 영토 변천도 */
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
      void queryClient.invalidateQueries({ queryKey: [...territoryTransferKeys.all, 'party'] })
    },
    onError: (error) => {
      const text = error instanceof Error ? error.message : ''
      notify.error(text.includes('403') ? '본인이 등록한 사건만 고칠 수 있습니다' : '영토 이전을 저장하지 못했습니다')
    },
  })

  const saveDraft = async (draft: TerritoryDraft) => {
    const input = draftToInput(draft)
    const next = draft.id
      ? rows.map((row) => (row.id === draft.id ? input : toTerritoryInput(row)))
      : [...rows.map(toTerritoryInput), input]
    await saveMutation.mutateAsync(next)
    notify.success(draft.id ? '영토 이전을 고쳤습니다' : `‘${input.regionName}’ 줄을 더했습니다`)
    setEditing(null)
  }

  const removeRow = async (row: TerritoryTransfer) => {
    const ok = await confirm({
      title: '영토 이전 줄 지우기',
      message: `‘${row.regionName}’(${partyName(row.from)} → ${partyName(row.to)}) 줄을 지울까요?`,
      confirmLabel: '지우기',
      danger: true,
    })
    if (!ok) return
    await saveMutation.mutateAsync(rows.filter((other) => other.id !== row.id).map(toTerritoryInput))
    notify.success('줄을 지웠습니다')
  }

  const editRow = (row: TerritoryTransfer) =>
    setEditing({
      id: row.id,
      from: row.from,
      to: row.to,
      regionName: row.regionName,
      method: row.method,
      areaKm2: row.areaKm2 != null ? String(row.areaKm2) : '',
      population: row.population != null ? String(row.population) : '',
      treatyId: row.treaty?.id ?? null,
      effectiveEra: row.effectiveEra ?? 'AD',
      effectiveYear: row.effectiveYear != null ? String(row.effectiveYear) : '',
      effectiveMonth: row.effectiveMonth != null ? String(row.effectiveMonth) : '',
      effectiveDay: row.effectiveDay != null ? String(row.effectiveDay) : '',
      note: row.note ?? '',
    })

  /* 새 줄 — 직전 줄의 내준 나라·방식·근거 조약을 이어받는다(분할은 한 나라가 여러 줄을 내준다) */
  const addRow = () => {
    const last = rows[rows.length - 1]
    setEditing(
      emptyTerritoryDraft(
        last ? { from: last.from, method: last.method, treatyId: last.treaty?.id ?? null } : undefined,
      ),
    )
  }

  const { gained, lost } = useMemo(() => summarizeTerritory(rows), [rows])
  const maxGained = Math.max(1, ...gained.map((total) => total.areaKm2))
  const totalArea = lost.reduce((sum, total) => sum + total.areaKm2, 0)
  const groups = useMemo(() => {
    const byTo = new Map<string, { party: TerritoryParty; rows: TerritoryTransfer[] }>()
    for (const row of rows) {
      const key = partyKey(row.to) || 'none'
      const group = byTo.get(key) ?? { party: row.to, rows: [] }
      group.rows.push(row)
      byTo.set(key, group)
    }
    const order = new Map(gained.map((total, index) => [total.key, index]))
    return [...byTo.entries()]
      .sort(([left], [right]) => (order.get(left) ?? 99) - (order.get(right) ?? 99))
      .map(([key, group]) => ({ key, ...group }))
  }, [rows, gained])

  if (!expectTerritory && rows.length === 0) return null

  const partyLink = (party: TerritoryParty) =>
    (party.countryId || party.historicalCountryId) && onCountryClick ? (
      <PartyButton
        type="button"
        onClick={() => onCountryClick(party.countryId ?? party.historicalCountryId!)}
      >
        {partyName(party)}
      </PartyButton>
    ) : (
      <span>{partyName(party)}</span>
    )

  return (
    <S.Section id="territory">
      <S.SectionHeader>
        <S.SectionTitle>영토 이전</S.SectionTitle>
        {rows.length > 0 && (
          <S.SectionSubtitle>
            {rows.length}줄{totalArea > 0 ? ` · 넘어간 땅 ${formatArea(totalArea)}` : ''}
          </S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {isLoading ? (
        <S.HelperText>영토 이전을 불러오는 중…</S.HelperText>
      ) : isError ? (
        <S.HelperText>영토 이전을 불러오지 못했습니다.</S.HelperText>
      ) : rows.length === 0 ? (
        <S.HelperText>
          이 사건으로 어느 땅이 누구에게서 누구에게로 넘어갔는지 한 줄씩 적으면, 나라별로 얼마를 얻고 잃었는지가 여기 모이고
          각 나라의 ‘영토 변천’에도 이어집니다. 참여국에 없는 나라는 저장할 때 피해국·수혜국으로 채워집니다.
        </S.HelperText>
      ) : (
        <>
          {/* 합계 — 받은 쪽은 면적 막대(가장 큰 쪽 기준), 내준 쪽은 한 줄 */}
          <Summary aria-label="나라별 합계">
            {lost.map((total) => (
              <LostLine key={total.key}>
                <strong>{partyLink(total.party)}</strong>
                <span>
                  잃음 {total.hasArea ? formatArea(total.areaKm2) : '면적 미상'}
                  {total.hasPopulation ? ` · 인구 ${formatPopulation(total.population)}` : ''}
                </span>
              </LostLine>
            ))}
            {gained.map((total) => (
              <GainLine key={total.key}>
                <GainName>{partyLink(total.party)}</GainName>
                <Bar aria-hidden>
                  <span style={{ width: total.hasArea ? `${Math.max(2, (total.areaKm2 / maxGained) * 100)}%` : 0 }} />
                </Bar>
                <GainValue>
                  {total.hasArea ? formatArea(total.areaKm2) : '면적 미상'}
                  {total.hasPopulation ? ` · ${formatPopulation(total.population)}` : ''}
                </GainValue>
              </GainLine>
            ))}
          </Summary>

          {groups.map((group) => (
            <Group key={group.key} aria-label={`${partyName(group.party)}이(가) 받은 땅`}>
              <GroupHead>→ {partyName(group.party)}</GroupHead>
              <Rows>
                {group.rows.map((row) => {
                  const when = effectiveLabel(row)
                  return (
                    <Row key={row.id}>
                      <RowMain>
                        <Region>{row.regionName}</Region>
                        <MethodTag>{territoryMethodLabel(row.method)}</MethodTag>
                        <Meta>
                          ← {partyName(row.from)}
                          {row.areaKm2 != null && ` · ${formatArea(row.areaKm2)}`}
                          {row.population != null && ` · ${formatPopulation(row.population)}`}
                          {when && ` · ${when}`}
                          {row.treaty && ` · ${row.treaty.name}`}
                        </Meta>
                        {row.note && <Note>{row.note}</Note>}
                      </RowMain>
                      {!readOnly && (
                        <RowActions>
                          <IconButton type="button" onClick={() => editRow(row)} aria-label={`‘${row.regionName}’ 줄 고치기`}>
                            <FiEdit2 />
                          </IconButton>
                          <IconButton type="button" onClick={() => void removeRow(row)} aria-label={`‘${row.regionName}’ 줄 지우기`}>
                            <FiX />
                          </IconButton>
                        </RowActions>
                      )}
                    </Row>
                  )
                })}
              </Rows>
            </Group>
          ))}
        </>
      )}

      {!readOnly && (
        <AddButton type="button" onClick={addRow}>
          <FiPlus aria-hidden /> 영토 이전 줄 더하기
        </AddButton>
      )}

      {editing && (
        <TerritoryTransferModal
          isOpen
          onClose={() => setEditing(null)}
          initial={editing}
          participants={participants}
          treaties={treaties}
          saving={saveMutation.isPending}
          onSave={(draft) => void saveDraft(draft).catch(() => undefined)}
        />
      )}
    </S.Section>
  )
}

const Summary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 720px;
  margin-bottom: 16px;
`

const LostLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
  padding-bottom: 6px;
  margin-bottom: 2px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 13.5px;

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  > span {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#b91c1c')};
    font-weight: 600;
  }
`

const GainLine = styled.div`
  display: grid;
  grid-template-columns: minmax(96px, 180px) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  font-size: 13px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }
`

const GainName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Bar = styled.span`
  display: block;
  height: 8px;
  border-radius: 4px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};

  > span {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  @media (max-width: 560px) {
    grid-column: 1 / -1;
    order: 3;
  }
`

const GainValue = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const PartyButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 10px;
`

const GroupHead = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Rows = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li`
  position: relative;
  display: flex;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  &:last-child {
    border-bottom: none;
  }
`

const RowMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  flex: 1;
  min-width: 0;
`

const Region = styled.span`
  font-size: 14.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MethodTag = styled.span`
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)')};
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  color: ${metaText};
`

const Meta = styled.span`
  flex-basis: 100%;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Note = styled.span`
  flex-basis: 100%;
  font-size: 12.5px;
  color: ${metaText};
`

const RowActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s;

  ${Row}:hover &,
  ${Row}:focus-within & {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 0.6;
  }
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  margin-top: 10px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
