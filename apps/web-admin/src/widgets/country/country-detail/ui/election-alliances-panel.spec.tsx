import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import type { ElectionAllianceDto, ElectionPartyResultDto } from '@/shared/api/election'
import { renderWithTheme } from '@/shared/test/render-with-theme'

import { ElectionAllianceFormModal, summarizeAlliances } from './election-alliances-panel'
import { ElectionResultHemicycle, sortBySeatingOrderGrouped } from './election-result-hemicycle'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))

const partyResult = (partyId: string, seatsWon: number, allianceId: string | null = null): ElectionPartyResultDto => ({
  id: `row-${partyId}`,
  electionId: 'election-1907',
  partyId,
  seatsWon,
  voteSharePercent: String(seatsWon / 4),
  allianceId,
  party: { id: partyId, name: partyId },
})

const bloc: ElectionAllianceDto = { id: 'bloc', electionId: 'election-1907', name: '뷜로 블록', sortOrder: 0 }
const partyInfo = (partyId: string) => ({ name: partyId, fill: `#${partyId.length}0${partyId.length}0${partyId.length}0` })

describe('선거 연합 — 좌석 배치', () => {
  it('연합 소속은 붙여 앉히고, 연합 자리는 소속의 의석 가중 평균 이념 위치', () => {
    const seated = sortBySeatingOrderGrouped([
      { key: 'SPD', positionRank: 1, seats: 43, allianceKey: null },
      { key: 'DKP', positionRank: 5, seats: 60, allianceKey: 'bloc' },
      { key: 'Zentrum', positionRank: 3, seats: 105, allianceKey: null },
      { key: 'FrVP', positionRank: 2, seats: 28, allianceKey: 'bloc' },
      { key: 'NLP', positionRank: 4, seats: 54, allianceKey: 'bloc' },
    ])
    /* 블록 가중 평균 = (5·60 + 2·28 + 4·54) / 142 ≈ 4.03 → 중앙당(3) 오른쪽, 소속끼리는 좌→우 */
    expect(seated.map((item) => item.key)).toEqual(['SPD', 'Zentrum', 'FrVP', 'NLP', 'DKP'])
  })

  it('연합 요약 — 의석 합·색(지정 없으면 가장 큰 소속 정당 색)', () => {
    const [summary] = summarizeAlliances(
      [bloc],
      [partyResult('DKP', 60, 'bloc'), partyResult('NLP', 54, 'bloc'), partyResult('SPD', 43)],
      partyInfo,
      '#999999',
    )
    expect(summary.seats).toBe(114)
    expect(summary.members.map((row) => row.partyId)).toEqual(['DKP', 'NLP'])
    expect(summary.fill).toBe(partyInfo('DKP').fill)
  })

  it('반원 범례에 연합 머리와 합산 의석이 나온다', () => {
    renderWithTheme(
      <ElectionResultHemicycle
        kicker="의석 지형"
        totalSeats={397}
        alliances={[{ key: 'bloc', label: '뷜로 블록', fill: '#1F4E8C' }]}
        onSelectSegment={() => undefined}
        segments={[
          { key: 'DKP', label: 'DKP', subLabel: '60석', fill: '#111111', share: 0.3, seats: 60, allianceKey: 'bloc', partyId: 'DKP', personId: null },
          { key: 'NLP', label: 'NLP', subLabel: '54석', fill: '#222222', share: 0.27, seats: 54, allianceKey: 'bloc', partyId: 'NLP', personId: null },
          { key: 'SPD', label: 'SPD', subLabel: '43석', fill: '#333333', share: 0.21, seats: 43, partyId: 'SPD', personId: null },
        ]}
      />,
    )
    /* 범례 머리 + 바깥 묶음 호의 <title> */
    expect(screen.getAllByText('뷜로 블록')).toHaveLength(2)
    expect(screen.getByText('114석 · 2개 정당')).toBeInTheDocument()
  })
})

describe('선거 연합 등록 모달', () => {
  it('명칭과 소속 정당을 골라 저장한다 — 다른 연합 소속은 옮김 안내', () => {
    const onSubmit = jest.fn()
    renderWithTheme(
      <ElectionAllianceFormModal
        mode="create"
        alliances={[{ ...bloc, id: 'other', name: '좌파 연대' }]}
        partyResults={[partyResult('DKP', 60), partyResult('FrVP', 28, 'other')]}
        partyInfo={partyInfo}
        saving={false}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    )
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/명칭/), { target: { value: '  뷜로 블록 ' } })
    fireEvent.click(screen.getByText('DKP'))
    fireEvent.click(screen.getByText('FrVP'))
    expect(screen.getByText('좌파 연대에서 옮김')).toBeInTheDocument()
    expect(screen.getByText('2개 정당 · 88석')).toBeInTheDocument()
    fireEvent.click(save)
    expect(onSubmit).toHaveBeenCalledWith({
      name: '뷜로 블록',
      shortName: null,
      color: null,
      notes: null,
      memberPartyIds: ['DKP', 'FrVP'],
    })
  })

  it('같은 선거에 같은 이름이면 저장을 막는다', () => {
    renderWithTheme(
      <ElectionAllianceFormModal
        mode="create"
        alliances={[bloc]}
        partyResults={[]}
        partyInfo={partyInfo}
        saving={false}
        onClose={() => undefined}
        onSubmit={jest.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText(/명칭/), { target: { value: '뷜로 블록' } })
    expect(screen.getByText('이 선거에 같은 이름의 연합이 있습니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
