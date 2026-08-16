/**
 * TenureReignList 렌더 테스트 — 재임·재위 통합 카드(레일 앤 킥커 리디자인).
 * 킥커(kind·서수·연임)·팩트라인·정의 그리드의 조건부 조합과 ol/li 시맨틱,
 * embedInModal 수정 버튼 게이트, 빈 상태를 회귀 방지.
 */
import { renderWithTheme } from '@/shared/test/render-with-theme'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import { getTheme } from '@/shared/styles/theme'

// upload/person-career → client.ts(import.meta)를 끊는다 — 렌더 경로에서 미호출
jest.mock('@/shared/api/upload', () => ({
  getUploadImageUrl: (url: string) => url,
}))
jest.mock('@/shared/api/person-career', () => ({
  personCareerApi: {},
}))
// EventPickerModal은 업적 폼 열 때만 필요 — 모듈 체인이 무거워 스텁으로 대체
jest.mock('@/shared/ui/event-picker-modal/event-picker-modal', () => ({
  EventPickerModal: () => null,
}))
// styles 파일의 BioContent=styled(RichTextReadView)가 react-router-dom(TextEncoder)까지
// 끌고 온다 — 이 스펙은 전기 뷰 미사용이라 styled() 가능한 더미로 대체
jest.mock('@/shared/ui/rich-text-read-view', () => ({
  RichTextReadView: () => null,
}))

import { TenureReignList } from './tenure-reign-list'
import type { CombinedTenureItem, TenureLikeRecord } from './types'

function makeItem(overrides: {
  kind: 'tenure' | 'reign'
  record?: Partial<TenureLikeRecord>
  ordinalNum?: number | null
  isReappointment?: boolean
}): CombinedTenureItem {
  return {
    kind: overrides.kind,
    data: {
      id: overrides.record?.id ?? 'rec-1',
      ...overrides.record,
    },
    ordinalNum: overrides.ordinalNum ?? null,
    isReappointment: overrides.isReappointment ?? false,
  }
}

const baseProps = {
  birthYear: 1638,
  birthMonth: 9,
  birthDay: 5,
  birthEra: null,
  deathDateStr: '',
  isDeceased: false,
  embedInModal: false,
  dynastyName: '부르봉',
  currentPersonId: 'person-1',
  onPersonClick: jest.fn(),
  adjacencyByRecordId: undefined,
  onEditTenure: jest.fn(),
  onEditReign: jest.fn(),
  onPlayClick: jest.fn(),
  onAchievementChanged: jest.fn(),
}

describe('TenureReignList', () => {
  it('빈 목록이면 빈 상태 문구를 보여준다', () => {
    renderWithTheme(<TenureReignList {...baseProps} items={[]} />)
    expect(
      screen.getByText(/등록된 재임·재위 기록이 없습니다/),
    ).toBeInTheDocument()
  })

  it('시맨틱 리스트(ol/li)로 렌더된다', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({ kind: 'reign', record: { id: 'r1', title: '국왕' } }),
          makeItem({ kind: 'tenure', record: { id: 't1', title: '총리' } }),
        ]}
      />,
    )
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })

  it('데이터가 풍부한 재위 카드 — 킥커 서수·왕명 제목·팩트라인·정의 그리드', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'reign',
            ordinalNum: 3,
            record: {
              id: 'r1',
              title: '프랑스 국왕',
              regnalName: '루이 14세',
              historicalCountry: { id: 'hc1', name: '프랑스 왕국' },
              dynastyOrdinal: 5,
              startDate: '1643-05-14T00:00:00.000Z',
              endDate: '1715-09-01T00:00:00.000Z',
              appointmentMethod: 'UNKNOWN_METHOD_RAW',
              appointmentDetail: '부왕 루이 13세의 사망으로 왕위를 이었다.',
              accessionEvent: { id: 'ev1', title: '랭스 대관식' },
              endReason: 'UNKNOWN_END_RAW',
              endReasonDetail: '괴저',
              notes: '태양왕.',
            },
          }),
        ]}
      />,
    )
    // 킥커: kind + 서수 (재위는 '3대' — '제' 접두 없음)
    expect(screen.getByText('재위')).toBeInTheDocument()
    expect(screen.getByText(/·\s*3대/)).toBeInTheDocument()
    // 제목: regnalName · posTitle 합성 유지 (정체성 앵커)
    expect(screen.getByText('루이 14세 · 프랑스 국왕')).toBeInTheDocument()
    // 팩트라인: 국가·왕조 서수·기간·나이
    expect(screen.getByText('프랑스 왕국')).toBeInTheDocument()
    expect(screen.getByText(/부르봉 5대/)).toBeInTheDocument()
    expect(screen.getByText(/1643년/)).toBeInTheDocument()
    expect(screen.getByText(/세에 즉위/)).toBeInTheDocument()
    expect(screen.getByText(/세에 퇴위/)).toBeInTheDocument()
    // 정의 그리드: 라벨 + 값 (미매핑 enum은 raw 폴백)
    expect(screen.getByText('즉위')).toBeInTheDocument()
    expect(screen.getByText('UNKNOWN_METHOD_RAW')).toBeInTheDocument()
    expect(screen.getByText('즉위식')).toBeInTheDocument()
    expect(screen.getByText('랭스 대관식')).toBeInTheDocument()
    expect(screen.getByText('경위')).toBeInTheDocument()
    expect(screen.getByText('퇴위')).toBeInTheDocument()
    // 분류 토큰과 서사는 별도 dd — 한 문자열로 잇지 않는다
    expect(screen.getByText('UNKNOWN_END_RAW')).toBeInTheDocument()
    expect(screen.getByText('괴저')).toBeInTheDocument()
    expect(screen.getByText('비고')).toBeInTheDocument()
    expect(screen.getByText('태양왕.')).toBeInTheDocument()
  })

  it('기간이 팩트라인 선두로 승격되고 길이가 함께 파생된다', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'reign',
            record: {
              id: 'r1',
              title: '프랑스 국왕',
              startDate: '1643-05-14T00:00:00.000Z',
              endDate: '1715-09-01T00:00:00.000Z',
            },
          }),
        ]}
      />,
    )
    expect(screen.getByText('기간')).toBeInTheDocument()
    expect(screen.getByText('약 72년 4개월')).toBeInTheDocument()
    // 마이크로 라벨은 자식 엘리먼트 — 기간 팩트의 직계 텍스트는 rangeLabel 그대로다
    expect(screen.getByText(/^1643년 5월 14일 – 1715년 9월 1일$/)).toBeInTheDocument()
  })

  it('BC·고대 기록은 길이를 파생하지 않는다(근사 오표기 방지)', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'reign',
            record: {
              id: 'r1',
              title: '황제',
              startDate: '-0221-01-01T00:00:00.000Z',
              endDate: '-0210-07-01T00:00:00.000Z',
            },
          }),
        ]}
      />,
    )
    expect(screen.queryByText(/^약 /)).not.toBeInTheDocument()
  })

  it("종료 사유가 OTHER인데 부연이 있으면 '기타' 토큰을 렌더하지 않는다", () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'tenure',
            record: {
              id: 't1',
              title: '공병 장교',
              endReason: 'OTHER',
              endReasonDetail: '1888년 1월 임기 만료로 귀국했다.',
            },
          }),
        ]}
      />,
    )
    expect(screen.queryByText(/기타/)).not.toBeInTheDocument()
    expect(
      screen.getByText('1888년 1월 임기 만료로 귀국했다.'),
    ).toBeInTheDocument()
  })

  it('재위의 재직 중 사망은 재임이 아니라 재위 목소리로 표기된다', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'reign',
            record: { id: 'r1', title: '국왕', endReason: 'DEATH_IN_OFFICE' },
          }),
        ]}
      />,
    )
    expect(screen.getByText('재위 중 사망')).toBeInTheDocument()
  })

  it('재임 서수는 초대/제N대·N기, 연임 스탬프 노출', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'tenure',
            ordinalNum: 1,
            record: { id: 't1', title: '대통령' },
          }),
          makeItem({
            kind: 'tenure',
            ordinalNum: 2,
            isReappointment: true,
            record: { id: 't2', title: '대통령', subTermNumber: 2 },
          }),
        ]}
      />,
    )
    expect(screen.getByText(/·\s*초대/)).toBeInTheDocument()
    expect(screen.getByText(/·\s*제2대 2기/)).toBeInTheDocument()
    expect(screen.getByText('연임')).toBeInTheDocument()
  })

  it('진행 중 재임 — 기간 팩트가 "– 현재"로 끝난다', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'tenure',
            record: {
              id: 't1',
              title: '총리',
              startDate: '2020-01-01T00:00:00.000Z',
            },
          }),
        ]}
      />,
    )
    expect(screen.getByText(/– 현재$/)).toBeInTheDocument()
  })

  it('데이터가 빈약한 카드(제목뿐)도 팩트라인·그리드 없이 렌더된다', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        birthYear={null}
        birthMonth={null}
        birthDay={null}
        items={[makeItem({ kind: 'tenure', record: { id: 't1', title: '재상' } })]}
      />,
    )
    expect(screen.getByText('재상')).toBeInTheDocument()
    // 나이·기간 파생 없음 — 잔여 팩트 텍스트가 남지 않는다
    expect(screen.queryByText(/세에 취임/)).not.toBeInTheDocument()
    expect(screen.queryByText(/– 현재/)).not.toBeInTheDocument()
  })

  it('다크 테마에서도 렌더된다 (kind 색·표면 다크 브랜치 스모크)', () => {
    render(
      <ThemeProvider theme={getTheme('dark')}>
        <TenureReignList
          {...baseProps}
          items={[
            makeItem({
              kind: 'reign',
              ordinalNum: 3,
              isReappointment: true,
              record: {
                id: 'r1',
                title: '국왕',
                regnalName: '루이 14세',
                historicalCountry: { id: 'hc1', name: '프랑스 왕국' },
                startDate: '1643-05-14T00:00:00.000Z',
                notes: '태양왕.',
              },
            }),
          ]}
        />
      </ThemeProvider>,
    )
    expect(screen.getByText('루이 14세 · 국왕')).toBeInTheDocument()
    expect(screen.getByText('연임')).toBeInTheDocument()
  })

  it('수정 버튼은 기본 노출, embedInModal이면 숨김 — 이름은 행 제목으로 파생', () => {
    const { rerender } = renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[makeItem({ kind: 'reign', record: { id: 'r1', title: '국왕' } })]}
      />,
    )
    // 15행이 전부 '수정'이면 버튼 목록에서 구분이 안 된다 → 제목 접두
    expect(screen.getByRole('button', { name: '국왕 수정' })).toBeInTheDocument()
    rerender(
      <TenureReignList
        {...baseProps}
        embedInModal
        items={[makeItem({ kind: 'reign', record: { id: 'r1', title: '국왕' } })]}
      />,
    )
    expect(
      screen.queryByRole('button', { name: /수정$/ }),
    ).not.toBeInTheDocument()
  })

  it('목록 역할과 행 헤딩이 명시된다 (CSS가 시맨틱을 지우지 못하게)', () => {
    renderWithTheme(
      <TenureReignList
        {...baseProps}
        items={[
          makeItem({
            kind: 'reign',
            record: { id: 'r1', title: '국왕', regnalName: '루이 14세' },
          }),
        ]}
      />,
    )
    expect(screen.getByRole('list')).toHaveAttribute('role', 'list')
    expect(
      screen.getByRole('heading', { level: 4, name: '루이 14세 · 국왕' }),
    ).toBeInTheDocument()
  })
})
