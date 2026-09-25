/**
 * 배경·전개가 **한 배열(eventSections)을 나눠 쓰는** 구조의 계약을 고정한다.
 *
 * 서버는 PUT마다 eventSections를 통째로 delete-and-recreate한다 — 그래서 여기서
 * 가장 위험한 회귀는 "배경 단락을 고쳤더니 전개 단락이 통째로 사라지는" 것이다.
 * 아래 테스트는 그 한 줄(두 묶음을 항상 합쳐 보낸다)을 잠근다.
 */
import {
  BACKGROUND_TYPE,
  isBackgroundSection,
  mergeSectionPayload,
  NARRATIVE_TYPE,
  type SectionRow,
  syncRowsWithServer,
} from './narrative-sections.lib'

const row = (over: Partial<SectionRow> = {}): SectionRow => ({
  key: `k-${Math.random()}`,
  title: '제목',
  content: '<p>본문</p>',
  ...over,
})

describe('배경/전개 분류', () => {
  it("sectionType이 'background'일 때만 배경이다", () => {
    expect(isBackgroundSection(BACKGROUND_TYPE)).toBe(true)
    expect(isBackgroundSection(NARRATIVE_TYPE)).toBe(false)
  })

  /* 레거시 값 — 등록 폼은 'content'로, 아주 예전 행은 null로 저장했다. 둘 다 전개다. */
  it('레거시 sectionType(content·null)은 전개로 본다', () => {
    expect(isBackgroundSection('content')).toBe(false)
    expect(isBackgroundSection(null)).toBe(false)
    expect(isBackgroundSection(undefined)).toBe(false)
  })
})

describe('mergeSectionPayload', () => {
  it('배경 한 단락만 고쳐도 전개 단락이 payload에 그대로 실린다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '배경1', sectionType: BACKGROUND_TYPE })],
      [
        row({ title: '전개1', sectionType: NARRATIVE_TYPE }),
        row({ title: '전개2', sectionType: NARRATIVE_TYPE }),
      ],
    )
    expect(merged.map((section) => section.title)).toEqual([
      '배경1',
      '전개1',
      '전개2',
    ])
  })

  it('order는 배경 → 전개 순 통산 — 다음 GET의 분리·정렬을 되돌린다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '배경1' }), row({ title: '배경2' })],
      [row({ title: '전개1' })],
    )
    expect(merged.map((section) => section.order)).toEqual([0, 1, 2])
    expect(merged.map((section) => section.sectionType)).toEqual([
      BACKGROUND_TYPE,
      BACKGROUND_TYPE,
      NARRATIVE_TYPE,
    ])
  })

  it('sectionType이 없는 row는 자기 묶음의 타입을 받는다', () => {
    const merged = mergeSectionPayload(
      [row({ sectionType: undefined })],
      [row({ sectionType: undefined })],
    )
    expect(merged[0].sectionType).toBe(BACKGROUND_TYPE)
    expect(merged[1].sectionType).toBe(NARRATIVE_TYPE)
  })

  it('"+추가"만 누른 빈 row는 서버로 새지 않는다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '배경1' }), row({ title: '', content: '' })],
      [],
    )
    expect(merged).toHaveLength(1)
  })

  it('제목이 비어도 본문이 있으면 그대로 보낸다 — 빈 제목을 대체하지 않는다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '   ', content: '<p>내용</p>' })],
      [],
    )
    expect(merged).toEqual([
      {
        title: '',
        content: '<p>내용</p>',
        order: 0,
        sectionType: BACKGROUND_TYPE,
      },
    ])
  })
})

describe('syncRowsWithServer', () => {
  const nextKey = () => 'new-key'

  it('길이가 같으면 키를 보존한다 — 편집 중 input이 remount되지 않도록', () => {
    const prev = [row({ key: 'a', title: '1', serverId: 'srv-1' })]
    const next = syncRowsWithServer(
      prev,
      [{ id: 'srv-1', title: '1', content: '<p>본문</p>', sectionType: null }],
      nextKey,
    )
    expect(next[0].key).toBe('a')
  })

  /* delete-and-recreate라 응답마다 id가 새로 발급된다 — 사용자가 막 친 값이
     이전 상태를 담은 in-flight 응답으로 덮이면 안 된다. */
  it('사용자가 막 친 값은 이전 상태를 담은 응답에 덮이지 않는다', () => {
    const prev = [row({ key: 'a', title: '새로 친 제목', serverId: 'srv-1' })]
    const next = syncRowsWithServer(
      prev,
      [{ id: 'srv-2', title: '옛 제목', content: '<p>본문</p>' }],
      nextKey,
    )
    expect(next[0].title).toBe('새로 친 제목')
    expect(next[0].serverId).toBe('srv-2')
  })

  it('아직 commit되지 않은 빈 tail row는 유실되지 않는다', () => {
    const prev = [
      row({ key: 'a', title: '1', serverId: 'srv-1' }),
      row({ key: 'b', title: '', content: '' }),
    ]
    const next = syncRowsWithServer(
      prev,
      [{ id: 'srv-1', title: '1', content: '<p>본문</p>' }],
      nextKey,
    )
    expect(next).toHaveLength(2)
    expect(next[1].key).toBe('b')
  })
})
