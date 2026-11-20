import { renderHook, act } from '@testing-library/react'

import { type UpdateEventDto } from '@/shared/api/events'

import { type EventDetail } from '../../use-event-detail'
import { useActorMutations } from './use-actor-mutations'

describe('useActorMutations', () => {
  const baseEvent: EventDetail = {
    id: 'event-1',
    title: '제1차 세계 대전',
    relatedPersons: [
      {
        id: 'rel-existing',
        personId: 'person-existing',
        role: '기존 대표',
        note: null,
        person: { id: 'person-existing', name: '기존 인물' },
      },
    ],
    relatedCountries: [],
    relatedHistoricalCountries: [
      {
        id: 'hist-de',
        name: '독일 제국',
        role: 'INITIATOR',
        sideId: 'side-central',
        sortOrder: 0,
      },
    ],
  }

  it('연속 인물 선택(multiSelect) 시 캐시 갱신 전이라도 앞선 선택이 유실되지 않는다', () => {
    const patches: UpdateEventDto[] = []
    const { result } = renderHook(() =>
      useActorMutations({
        event: baseEvent,
        onPatch: (patch) => patches.push(patch),
      }),
    )

    act(() => {
      result.current.addPerson('person-a', {
        historicalCountryId: 'hist-de',
        sideId: 'side-central',
      })
      result.current.addPerson('person-b', {
        historicalCountryId: 'hist-de',
        sideId: 'side-central',
      })
    })

    expect(patches).toHaveLength(2)
    /* 소속국(독일 제국)이 이미 side-central — 인물 진영은 복사하지 않고 '소속국 따름'(생략)으로 접는다 */
    expect(patches[1].relatedPersons).toEqual([
      { personId: 'person-existing', role: '기존 대표', note: undefined },
      {
        personId: 'person-a',
        countryId: undefined,
        historicalCountryId: 'hist-de',
      },
      {
        personId: 'person-b',
        countryId: undefined,
        historicalCountryId: 'hist-de',
      },
    ])
  })

  it('잇기 모달(upsertPerson)로 연속 저장해도 앞선 인물과 역할·행적이 모두 유지되고 기존 인물은 patch로 수정된다', () => {
    const patches: UpdateEventDto[] = []
    const { result } = renderHook(() =>
      useActorMutations({
        event: baseEvent,
        onPatch: (patch) => patches.push(patch),
      }),
    )

    let firstOutcome: 'added' | 'updated' | undefined
    let secondOutcome: 'added' | 'updated' | undefined
    let editOutcome: 'added' | 'updated' | undefined

    act(() => {
      firstOutcome = result.current.upsertPerson({
        personId: 'person-1',
        personName: '첫 인물',
        role: '수석대표',
        note: '조약 기안',
        historicalCountryId: 'hist-de',
        sideId: 'side-central',
      })
      secondOutcome = result.current.upsertPerson({
        personId: 'person-2',
        personName: '둘째 인물',
        role: '참모총장',
      })
      editOutcome = result.current.upsertPerson({
        personId: 'person-existing',
        personName: '기존 인물',
        role: '수정된 대표',
        note: '보충 비고',
      })
    })

    expect(firstOutcome).toBe('added')
    expect(secondOutcome).toBe('added')
    expect(editOutcome).toBe('updated')
    expect(patches).toHaveLength(3)
    expect(patches[1].relatedPersons).toEqual([
      { personId: 'person-existing', role: '기존 대표', note: undefined },
      {
        personId: 'person-1',
        role: '수석대표',
        note: '조약 기안',
        historicalCountryId: 'hist-de',
      },
      {
        personId: 'person-2',
        role: '참모총장',
      },
    ])
    expect(patches[2].relatedPersonsPatch).toEqual([
      {
        personId: 'person-existing',
        role: '수정된 대표',
        note: '보충 비고',
        countryId: null,
        historicalCountryId: null,
        sideId: null,
      },
    ])
  })

  it('잇기 모달(upsertCountry)로 연속 국가 연결 및 기존 국가 수정이 정확히 전송된다', () => {
    const patches: UpdateEventDto[] = []
    const { result } = renderHook(() =>
      useActorMutations({
        event: baseEvent,
        onPatch: (patch) => patches.push(patch),
      }),
    )

    act(() => {
      result.current.upsertCountry({
        id: 'hist-at',
        isHistorical: true,
        name: '오스트리아-헝가리 제국',
        role: 'INITIATOR',
        sideId: 'side-central',
        roleDescription: '세르비아 선전포고',
      })
      result.current.upsertCountry({
        id: 'hist-de',
        isHistorical: true,
        name: '독일 제국',
        role: 'INITIATOR',
        sideId: 'side-central',
        roleDescription: '서부전선 침공',
      })
    })

    expect(patches).toHaveLength(2)
    expect(patches[0].relatedCountries).toEqual([
      {
        historicalCountryId: 'hist-de',
        role: 'INITIATOR',
        roleDescription: null,
        note: null,
      },
      {
        historicalCountryId: 'hist-at',
        role: 'INITIATOR',
        sideId: 'side-central',
        roleDescription: '세르비아 선전포고',
      },
    ])
    expect(patches[1].relatedCountriesPatch).toEqual([
      {
        historicalCountryId: 'hist-de',
        role: 'INITIATOR',
        sideId: 'side-central',
        roleDescription: '서부전선 침공',
        note: null,
        participation: null,
        join: null,
        withdraw: null,
      },
    ])
  })

  it('진영 탭의 배정은 고친 줄만 보내고, 소속국 진영과 같은 값은 따름(null)으로 접는다', () => {
    const event: EventDetail = {
      ...baseEvent,
      relatedPersons: [
        {
          id: 'rel-kaiser',
          personId: 'person-kaiser',
          role: '황제',
          historicalCountryId: 'hist-de',
          person: { id: 'person-kaiser', name: '빌헬름' },
        },
        {
          id: 'rel-rebel',
          personId: 'person-rebel',
          role: '봉기 지도자',
          historicalCountryId: 'hist-de',
          sideId: 'side-rebel',
          person: { id: 'person-rebel', name: '카를' },
        },
      ],
    }
    const patches: UpdateEventDto[] = []
    const { result } = renderHook(() =>
      useActorMutations({ event, onPatch: (patch) => patches.push(patch) }),
    )

    act(() => {
      result.current.updatePerson('person-kaiser', { sideId: 'side-central' })
      result.current.updatePerson('person-kaiser', { sideId: 'side-rebel' })
    })
    expect(patches[0]).toEqual({ relatedPersonsPatch: [{ personId: 'person-kaiser', sideId: null }] })
    expect(patches[1]).toEqual({ relatedPersonsPatch: [{ personId: 'person-kaiser', sideId: 'side-rebel' }] })
    expect(patches.some((patch) => 'relatedPersons' in patch)).toBe(false)
  })

  it('계파·기관 불러오기(assignPersonsToSide) — 새 인물만 목록에 더하고, 있는 인물은 고친 줄만, 이미 그 편이면 건너뛴다', () => {
    const event: EventDetail = {
      ...baseEvent,
      relatedPersons: [
        {
          id: 'rel-kaiser',
          personId: 'person-kaiser',
          role: '황제',
          historicalCountryId: 'hist-de',
          person: { id: 'person-kaiser', name: '빌헬름' },
        },
        {
          id: 'rel-rebel',
          personId: 'person-rebel',
          role: '봉기 지도자',
          historicalCountryId: 'hist-de',
          sideId: 'side-rebel',
          person: { id: 'person-rebel', name: '카를' },
        },
      ],
    }
    const patches: UpdateEventDto[] = []
    const { result } = renderHook(() =>
      useActorMutations({ event, onPatch: (patch) => patches.push(patch) }),
    )

    let applied = 0
    act(() => {
      applied = result.current.assignPersonsToSide(
        [
          { personId: 'person-kaiser' },
          { personId: 'person-rebel' },
          { personId: 'person-new', role: '참모' },
          { personId: 'person-new', role: '중복' },
        ],
        'side-central',
        '계파 소속 인물 → 진영',
      )
    })

    /* 황제는 이미 소속국을 따라 side-central — 건너뛴다. 봉기 지도자는 따로 정한 진영을 풀어 따름으로 */
    expect(applied).toBe(2)
    expect(patches).toHaveLength(2)
    expect(patches[0].relatedPersons?.map((row) => row.personId)).toEqual([
      'person-kaiser',
      'person-rebel',
      'person-new',
    ])
    expect(patches[0].relatedPersons?.[2]).toEqual({ personId: 'person-new', role: '참모', sideId: 'side-central' })
    expect(patches[1]).toEqual({ relatedPersonsPatch: [{ personId: 'person-rebel', sideId: null }] })
  })
})
