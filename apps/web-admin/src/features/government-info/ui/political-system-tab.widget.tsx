import { useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  usePoliticalSystems,
  useCreatePoliticalSystem,
  useDeletePoliticalSystem,
  useUpdatePoliticalSystem,
  type PoliticalSystem,
} from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  LEGISLATURE_TYPE_LABEL,
  PARTY_SYSTEM_LABEL,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
} from '@/entities/political-system/model/political-system'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { PoliticalSystemFormModal } from './political-system-form.modal'

interface Props {
  /** 현대 국가 ID — 주면 연결된 과거 국가의 정체까지 함께 온다 */
  countryId?: string
  /** 과거 국가 ID */
  historicalCountryId?: string
  /** 새로 등록할 때 어느 국가에 붙일지. 보통 위 둘 중 채워진 쪽 */
  countryName?: string
}

/**
 * 정체 탭 — 대통령제/의원내각제, 단원제/양원제를 시대별로.
 *
 * 국가에 붙은 한 값이 아니라 **기간을 가진 여러 줄**이다. 프랑스라면 제3·4·5공화국이
 * 세 줄로 놓이고, 시간순으로 읽으면 그 나라 정치 체제의 내력이 된다.
 */
export function PoliticalSystemTab({
  countryId,
  historicalCountryId,
  countryName,
}: Props) {
  const scope = { countryId, historicalCountryId }
  const query = usePoliticalSystems(scope)
  const createMutation = useCreatePoliticalSystem()
  const updateMutation = useUpdatePoliticalSystem()
  const deleteMutation = useDeletePoliticalSystem()

  const [editing, setEditing] = useState<PoliticalSystem | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const systems = useMemo(
    () => [...(query.data ?? [])].sort(comparePoliticalSystems),
    [query.data],
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (system: PoliticalSystem) => {
    setEditing(system)
    setFormOpen(true)
  }

  const handleDelete = async (system: PoliticalSystem) => {
    const label = system.name || formatPeriod(system)
    if (
      !(await confirm({
        title: '정체 삭제',
        message: `「${label}」 정체 기록을 삭제할까요?`,
        danger: true,
      }))
    )
      return
    try {
      await deleteMutation.mutateAsync(system.id)
      notify.success('삭제됨')
    } catch {
      notify.error('삭제 실패')
    }
  }

  return (
    <div>
      <HeaderRow>
        <HeaderText>
          정체는 바뀝니다. 헌법이 바뀔 때마다 한 줄씩 남기면 “언제 무엇이었나”가 됩니다.
        </HeaderText>
        <AddButton type="button" onClick={openCreate}>
          + 정체 추가
        </AddButton>
      </HeaderRow>

      {query.isLoading ? (
        <Hint>불러오는 중…</Hint>
      ) : systems.length === 0 ? (
        <Hint>
          등록된 정체가 없습니다. 대통령제인지 의원내각제인지, 단원제인지 양원제인지를
          기간과 함께 남겨보세요.
        </Hint>
      ) : (
        <List>
          {systems.map((system) => (
            <Row key={system.id}>
              <Period>{formatPeriod(system)}</Period>

              <Body>
                <TitleLine>
                  {system.name && <Name>{system.name}</Name>}
                  {/* 어느 국가의 정체인지 — 현대 국가 지면에는 과거 국가 것도 섞여 온다 */}
                  {historicalCountryId == null &&
                    system.historicalCountryId != null && (
                      <PastChip>
                        {system.historicalCountry?.name ?? '과거 국가'}
                      </PastChip>
                    )}
                  {system.isCurrent && <CurrentChip>현행</CurrentChip>}
                </TitleLine>

                <Tags>
                  {system.governmentForm && (
                    <Tag $tone="form">
                      {GOVERNMENT_FORM_LABEL[system.governmentForm]}
                    </Tag>
                  )}
                  {system.legislatureType && (
                    <Tag $tone="legislature">
                      {LEGISLATURE_TYPE_LABEL[system.legislatureType]}
                    </Tag>
                  )}
                  {system.stateStructure && (
                    <Tag>{STATE_STRUCTURE_LABEL[system.stateStructure]}</Tag>
                  )}
                  {system.partySystem && (
                    <Tag>{PARTY_SYSTEM_LABEL[system.partySystem]}</Tag>
                  )}
                </Tags>

                <Facts>
                  {system.lowerHouseName && (
                    <Fact>
                      <FactKey>
                        {primaryHouseLabel(system.legislatureType)}
                      </FactKey>
                      <FactValue>
                        {system.lowerHouseName}
                        {system.lowerHouseSeats != null &&
                          ` ${system.lowerHouseSeats.toLocaleString()}석`}
                      </FactValue>
                    </Fact>
                  )}
                  {system.legislatureType === 'BICAMERAL' &&
                    system.upperHouseName && (
                      <Fact>
                        <FactKey>상원</FactKey>
                        <FactValue>
                          {system.upperHouseName}
                          {system.upperHouseSeats != null &&
                            ` ${system.upperHouseSeats.toLocaleString()}석`}
                        </FactValue>
                      </Fact>
                    )}
                  {system.headOfStateTitle && (
                    <Fact>
                      <FactKey>국가원수</FactKey>
                      <FactValue>
                        {system.headOfStateTitle}
                        {system.headOfStateHasPower === false && (
                          <Muted> (상징)</Muted>
                        )}
                      </FactValue>
                    </Fact>
                  )}
                  {system.headOfGovernmentTitle && (
                    <Fact>
                      <FactKey>정부수반</FactKey>
                      <FactValue>
                        {system.headOfGovernmentTitle}
                        {system.headOfGovernmentHasPower === false && (
                          <Muted> (상징)</Muted>
                        )}
                      </FactValue>
                    </Fact>
                  )}
                </Facts>

                {system.notes && <Notes>{system.notes}</Notes>}
              </Body>

              <RowActions>
                <IconBtn type="button" onClick={() => openEdit(system)}>
                  수정
                </IconBtn>
                <IconBtn
                  type="button"
                  $danger
                  onClick={() => handleDelete(system)}
                >
                  삭제
                </IconBtn>
              </RowActions>
            </Row>
          ))}
        </List>
      )}

      <PoliticalSystemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        countryName={countryName}
        onSubmit={async (dto) => {
          if (editing) {
            await updateMutation.mutateAsync({ id: editing.id, dto })
            notify.success('정체가 수정되었습니다')
          } else {
            await createMutation.mutateAsync({
              ...dto,
              countryId: countryId ?? null,
              historicalCountryId: historicalCountryId ?? null,
            })
            notify.success('정체가 추가되었습니다')
          }
          setFormOpen(false)
        }}
      />
    </div>
  )
}

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`

const HeaderText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AddButton = styled.button`
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const Hint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  padding: 36px 0;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
`

/** 기간 열을 고정폭으로 세워 세로로 훑히게 한다 (연대표와 같은 조판) */
const Row = styled.div`
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 16px 4px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};

  &:first-child {
    border-top: none;
  }
`

const Period = styled.div`
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
  padding-top: 1px;
`

const Body = styled.div`
  min-width: 0;
`

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const Name = styled.span`
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const chip = `
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
`

const PastChip = styled.span`
  ${chip}
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
`

const CurrentChip = styled.span`
  ${chip}
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
`

const Tag = styled.span<{ $tone?: 'form' | 'legislature' }>`
  ${chip}
  height: 22px;
  font-size: 11.5px;
  background: ${({ $tone, theme }) =>
    $tone === 'form'
      ? 'rgba(79, 70, 229, 0.12)'
      : $tone === 'legislature'
        ? 'rgba(14, 165, 233, 0.12)'
        : theme.colors.hover};
  color: ${({ $tone, theme }) =>
    $tone === 'form'
      ? '#4338ca'
      : $tone === 'legislature'
        ? '#0369a1'
        : theme.colors.text.secondary};
`

const Facts = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
  margin: 9px 0 0;
`

const Fact = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
`

const FactKey = styled.dt`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FactValue = styled.dd`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Notes = styled.p`
  margin: 9px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  color: ${({ $danger, theme }) =>
    $danger ? '#dc2626' : theme.colors.text.secondary};

  &:hover {
    text-decoration: underline;
  }
`
