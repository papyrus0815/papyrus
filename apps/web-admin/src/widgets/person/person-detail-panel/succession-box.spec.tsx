/**
 * SuccessionBox 렌더 테스트 — 같은 국가 전/후 재위(승계) 박스.
 * 선대/후대 칩 렌더·클릭 이동·본인(isSelf)·타계정(isOwned=false) 비활성·한쪽 빈 상태를
 * 회귀 방지 (검토서 docs/person-reign-neighbors-review.md §3.3).
 */
import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import type {
  AdjacencyNeighbor,
  ReignAdjacencyEntry,
} from '@/shared/api/person-reign-adjacency'

// upload → client.ts(import.meta)를 끊는다 — 아바타는 profileImageUrl=null이라 미사용
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))

import { SuccessionBox } from './succession-box'

function neighbor(overrides: {
  relation: 'PREDECESSOR' | 'SUCCESSOR'
  id: string
  name: string
  startYear: number
  endYear: number | null
  isSelf?: boolean
  isOwned?: boolean
  overlapsAnchor?: boolean
  polity?: string | null
}): AdjacencyNeighbor {
  return {
    relation: overrides.relation,
    person: {
      id: overrides.id,
      name: overrides.name,
      surname: null,
      middleName: null,
      nameDisplayOrder: null,
      country: null,
      profileImageUrl: null,
      templeName: null,
      regnalName: null,
      isAlive: false,
      deathYear: overrides.endYear,
      isOwned: overrides.isOwned ?? true,
    },
    record: {
      recordId: `rec-${overrides.id}`,
      recordKind: 'SOVEREIGN_REIGN',
      positionType: 'HEAD_OF_STATE',
      title: '국왕',
      appointmentMethod: null,
      regnalName: overrides.name,
      regnalNumber: null,
      termNumber: null,
      startYear: overrides.startYear,
      endYear: overrides.endYear,
      startDate: `${overrides.startYear}-01-01T00:00:00.000Z`,
      endDate: overrides.endYear ? `${overrides.endYear}-01-01T00:00:00.000Z` : null,
      startDatePrecision: null,
      country: null,
      historicalCountry:
        overrides.polity !== undefined
          ? overrides.polity
            ? { id: 'hc', name: overrides.polity }
            : null
          : { id: 'joseon', name: '러시아 제국' },
    },
    overlapsAnchor: overrides.overlapsAnchor ?? false,
    coBoundary: false,
    isSelf: overrides.isSelf ?? false,
  }
}

function entry(overrides: Partial<ReignAdjacencyEntry> = {}): ReignAdjacencyEntry {
  return {
    subjectRecordId: 'anchor-1',
    subjectRecordKind: 'SOVEREIGN_REIGN',
    scope: { countryId: null, historicalCountryId: 'joseon', degradedToStrict: false },
    predecessors: [],
    successors: [],
    omittedCoBoundaryCount: 0,
    ...overrides,
  }
}

describe('SuccessionBox', () => {
  it('선대·후대 칩을 렌더하고 클릭 시 onPersonClick(personId) 호출', () => {
    const onPersonClick = jest.fn()
    renderWithTheme(
      <SuccessionBox
        entry={entry({
          predecessors: [
            neighbor({ relation: 'PREDECESSOR', id: 'cat2', name: '예카테리나 2세', startYear: 1762, endYear: 1796 }),
          ],
          successors: [
            neighbor({ relation: 'SUCCESSOR', id: 'alex1', name: '알렉산드르 1세', startYear: 1801, endYear: 1825 }),
          ],
        })}
        anchorLabel="파벨 1세 · 국왕"
        anchorPolity="러시아 제국"
        onPersonClick={onPersonClick}
      />,
    )
    // 선대/후대 칩이 클릭 가능한 버튼으로 존재
    const predButton = screen.getByRole('button', { name: /예카테리나 2세 — 선대/ })
    const succButton = screen.getByRole('button', { name: /알렉산드르 1세 — 후대/ })
    fireEvent.click(predButton)
    expect(onPersonClick).toHaveBeenCalledWith('cat2')
    fireEvent.click(succButton)
    expect(onPersonClick).toHaveBeenCalledWith('alex1')
  })

  it('person.regnalName 원문("Nicholas")은 라벨로 쓰지 않는다 — 표시명 폴백', () => {
    const nicholas = neighbor({
      relation: 'PREDECESSOR',
      id: 'nick',
      name: '니콜라이',
      startYear: 1894,
      endYear: 1917,
    })
    nicholas.record.regnalName = null
    nicholas.person.regnalName = 'Nicholas'
    renderWithTheme(
      <SuccessionBox
        entry={entry({ predecessors: [nicholas] })}
        anchorLabel="앵커"
        anchorPolity="러시아 제국"
        onPersonClick={jest.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: /니콜라이 — 선대/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nicholas')).toBeNull()
  })

  it('본인(isSelf)·타계정(isOwned=false) 이웃은 비클릭(버튼 아님)으로 렌더', () => {
    const onPersonClick = jest.fn()
    renderWithTheme(
      <SuccessionBox
        entry={entry({
          predecessors: [
            neighbor({ relation: 'PREDECESSOR', id: 'self', name: '본인복위', startYear: 1796, endYear: 1801, isSelf: true }),
          ],
          successors: [
            neighbor({ relation: 'SUCCESSOR', id: 'foreign', name: '타계정왕', startYear: 1801, endYear: 1810, isOwned: false }),
          ],
        })}
        anchorLabel="앵커"
        anchorPolity="러시아 제국"
        onPersonClick={onPersonClick}
      />,
    )
    // 클릭 가능한 버튼이 하나도 없어야 한다
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    // 라벨은 여전히 보인다
    expect(screen.getByText('본인복위')).toBeInTheDocument()
    expect(screen.getByText('타계정왕')).toBeInTheDocument()
  })

  it('한쪽만 있으면 반대편은 "기록 없음" 안내', () => {
    renderWithTheme(
      <SuccessionBox
        entry={entry({
          successors: [
            neighbor({ relation: 'SUCCESSOR', id: 'next', name: '다음왕', startYear: 1480, endYear: 1500 }),
          ],
        })}
        anchorLabel="초대 군주"
        anchorPolity="러시아 제국"
        onPersonClick={jest.fn()}
      />,
    )
    expect(screen.getByText('이전 재위 기록 없음')).toBeInTheDocument()
    expect(screen.getByText('다음왕')).toBeInTheDocument()
  })

  it('이웃 정체가 앵커와 다르면 정체 태그를 노출(왕정→공화정 전환)', () => {
    renderWithTheme(
      <SuccessionBox
        entry={entry({
          successors: [
            neighbor({ relation: 'SUCCESSOR', id: 'pres', name: '초대 대통령', startYear: 1871, endYear: 1873, polity: '프랑스 제3공화국' }),
          ],
        })}
        anchorLabel="마지막 왕"
        anchorPolity="프랑스 제2제국"
        onPersonClick={jest.fn()}
      />,
    )
    expect(screen.getByText('프랑스 제3공화국')).toBeInTheDocument()
  })

  it('재임(TENURE) 앵커는 전임/후임 어휘 — 초대 총리 카드가 군주 말투로 말하지 않는다', () => {
    renderWithTheme(
      <SuccessionBox
        entry={entry({
          subjectRecordKind: 'TENURE',
          successors: [
            neighbor({ relation: 'SUCCESSOR', id: 'goremykin', name: '고레미킨', startYear: 1906, endYear: 1906 }),
          ],
        })}
        anchorLabel="비테 · 총리"
        anchorPolity="러시아 제국"
        onPersonClick={jest.fn()}
      />,
    )
    expect(screen.getByText('이전 재임 기록 없음')).toBeInTheDocument()
    expect(screen.queryByText('이전 재위 기록 없음')).toBeNull()
    expect(
      screen.getByRole('button', { name: /고레미킨 — 후임/ }),
    ).toBeInTheDocument()
  })

  it('양쪽 이웃이 모두 없으면 박스 자체를 렌더하지 않는다', () => {
    const { container } = renderWithTheme(
      <SuccessionBox
        entry={entry()}
        anchorLabel="앵커"
        anchorPolity={null}
        onPersonClick={jest.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
