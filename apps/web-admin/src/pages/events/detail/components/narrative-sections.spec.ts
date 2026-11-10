/**
 * 배경·전개가 **한 배열(eventSections)을 나눠 쓰는** 구조의 계약을 고정한다.
 *
 * 서버는 PUT마다 eventSections를 통째로 delete-and-recreate한다 — 그래서 여기서
 * 가장 위험한 회귀는 "배경 단락을 고쳤더니 전개 단락이 통째로 사라지는" 것이다.
 * 아래 테스트는 그 한 줄(두 묶음을 항상 합쳐 보낸다)을 잠근다.
 */
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'

import {
  AFTERMATH_TYPE,
  BACKGROUND_TYPE,
  backgroundLength,
  compactTimelinePeriod,
  extractTimelineSteps,
  isBackgroundSection,
  LONG_BACKGROUND_CHARS,
  mergeSectionPayload,
  NARRATIVE_TYPE,
  plainTextLength,
  sectionKindOf,
  shouldCollapseBackground,
  shouldCollapseLongSection,
  type SectionRow,
  splitTitlePeriod,
  syncRowsWithServer,
  addHeadingAnchors,
  extractProseHeadings,
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

describe('여파 분류', () => {
  /* 시드가 여파 장(章)을 'aftermath'로 쓴다 — 예전엔 전개로 떨어져 전개 단락 사이에 섞였다. */
  it("'aftermath'는 여파, 'process'는 전개다", () => {
    expect(sectionKindOf(AFTERMATH_TYPE)).toBe('aftermath')
    expect(sectionKindOf('process')).toBe('narrative')
    expect(sectionKindOf(BACKGROUND_TYPE)).toBe('background')
    expect(sectionKindOf(null)).toBe('narrative')
  })
})

describe('mergeSectionPayload', () => {
  it('전개를 고쳐도 여파 단락이 payload에 남고, order는 배경 → 전개 → 여파', () => {
    const merged = mergeSectionPayload(
      [row({ title: '배경1', sectionType: BACKGROUND_TYPE })],
      [row({ title: '전개1', sectionType: 'process' })],
      [row({ title: '여파1', sectionType: AFTERMATH_TYPE })],
    )
    expect(merged.map((section) => [section.title, section.order, section.sectionType])).toEqual([
      ['배경1', 0, BACKGROUND_TYPE],
      ['전개1', 1, 'process'],
      ['여파1', 2, AFTERMATH_TYPE],
    ])
  })

  it('배경 한 단락만 고쳐도 전개 단락이 payload에 그대로 실린다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '배경1', sectionType: BACKGROUND_TYPE })],
      [
        row({ title: '전개1', sectionType: NARRATIVE_TYPE }),
        row({ title: '전개2', sectionType: NARRATIVE_TYPE }),
      ],
      [],
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
      [],
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
      [row({ sectionType: undefined })],
    )
    expect(merged[0].sectionType).toBe(BACKGROUND_TYPE)
    expect(merged[1].sectionType).toBe(NARRATIVE_TYPE)
    expect(merged[2].sectionType).toBe(AFTERMATH_TYPE)
  })

  it('"+추가"만 누른 빈 row는 서버로 새지 않는다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '배경1' }), row({ title: '', content: '' })],
      [],
      [],
    )
    expect(merged).toHaveLength(1)
  })

  it('제목이 비어도 본문이 있으면 그대로 보낸다 — 빈 제목을 대체하지 않는다', () => {
    const merged = mergeSectionPayload(
      [row({ title: '   ', content: '<p>내용</p>' })],
      [],
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

describe('splitTitlePeriod', () => {
  it('제목 앞 날짜도 시기로 뗀다', () => {
    expect(splitTitlePeriod('1997년 7월 8일 NATO 정상회의 초청')).toEqual({
      title: 'NATO 정상회의 초청',
      period: '1997년 7월 8일',
    })
    expect(splitTitlePeriod('1872-10-14 개통식 — 천황 친림').period).toBe('1872-10-14')
    expect(splitTitlePeriod('1970년대: 투기꾼의 아수라장')).toEqual({ title: '투기꾼의 아수라장', period: '1970년대' })
    expect(splitTitlePeriod('1874~1880년 코베 측 확장').period).toBe('1874~1880년')
    expect(splitTitlePeriod('1867년 11월 9일(음력 10월 14일) 니조성 의식').title).toBe('니조성 의식')
  })

  it('낱말에 붙은 연도와 숫자로 시작하는 이름은 그대로', () => {
    expect(splitTitlePeriod('1949년의 위기').period).toBeNull()
    expect(splitTitlePeriod('1067mm 협궤 채택').period).toBeNull()
    expect(splitTitlePeriod('3대 조건').period).toBeNull()
  })

  it('제목 끝 연도 괄호를 시기로 뗀다', () => {
    expect(splitTitlePeriod('배경 — 국공내전 4년의 누적 (1945-1949)')).toEqual({
      title: '배경 — 국공내전 4년의 누적',
      period: '1945-1949',
    })
    expect(splitTitlePeriod('결렬 과정 (1912년 2월 말~3월)').period).toBe('1912년 2월 말~3월')
    expect(splitTitlePeriod('숙청과 건국 (서기 493년)').period).toBe('서기 493년')
    expect(splitTitlePeriod('스탈린의 분쟁(1945-08-15~22)')).toEqual({
      title: '스탈린의 분쟁',
      period: '1945-08-15~22',
    })
  })

  it('이름이 앞선 괄호·괄호뿐인 제목·괄호 없는 제목은 그대로', () => {
    const named = '제1차 디미트리아드(First Dymitriad, 1604~1606년)'
    expect(splitTitlePeriod(named)).toEqual({ title: named, period: null })
    expect(splitTitlePeriod('(1950)')).toEqual({ title: '(1950)', period: null })
    expect(splitTitlePeriod('개전 배경')).toEqual({ title: '개전 배경', period: null })
  })

  it('제목 뒤 대시(—)·콜론(:) 뒤 시기와 중간 연도 괄호·월일 표기도 시기로 뗀다', () => {
    expect(splitTitlePeriod('측량과 착공 — 1870-04 ~ 1872-09의 약 2년 6개월')).toEqual({
      title: '측량과 착공',
      period: '1870-04 ~ 1872-09의 약 2년 6개월',
    })
    expect(splitTitlePeriod('페리의 첫 내항 — 1853년 7월 8일 ~ 17일의 9일')).toEqual({
      title: '페리의 첫 내항',
      period: '1853년 7월 8일 ~ 17일의 9일',
    })
    expect(splitTitlePeriod('일미수호통상조약 체결(1858) — 칙허 없는 서명과 안세이 대옥')).toEqual({
      title: '일미수호통상조약 체결 — 칙허 없는 서명과 안세이 대옥',
      period: '1858',
    })
    expect(splitTitlePeriod('7-24 트루먼의 원폭 통보와 소련의 참전 앞당김')).toEqual({
      title: '트루먼의 원폭 통보와 소련의 참전 앞당김',
      period: '7-24',
    })
    expect(splitTitlePeriod('8월 15일 옥음방송과 관동군의 저항 지속')).toEqual({
      title: '옥음방송과 관동군의 저항 지속',
      period: '8월 15일',
    })
    expect(splitTitlePeriod('탈출 준비와 마지막 날의 연쇄 지연: 6월 20일 밤')).toEqual({
      title: '탈출 준비와 마지막 날의 연쇄 지연',
      period: '6월 20일 밤',
    })
    expect(splitTitlePeriod('4-12 1차 무스카트')).toEqual({
      title: '1차 무스카트',
      period: '4-12',
    })
    expect(splitTitlePeriod('1605년 1월 31일 (도브리니치 전투)')).toEqual({
      title: '도브리니치 전투',
      period: '1605년 1월 31일',
    })
    expect(splitTitlePeriod('2단계: 영웅 비두킨트의 등장과 격렬한 저항')).toEqual({
      title: '영웅 비두킨트의 등장과 격렬한 저항',
      period: '2단계',
    })
  })
})

describe('compactTimelinePeriod', () => {
  it('장황한 기간 부연·접두사를 걷어내고 균일한 숫자 점(YYYY.MM.DD) 형식으로 정돈한다', () => {
    expect(compactTimelinePeriod('1870-04 ~ 1872-09의 약 2년 6개월')).toBe('1870.04–1872.09')
    expect(compactTimelinePeriod('D-Day: 1950-06-25')).toBe('1950.06.25')
    expect(compactTimelinePeriod('1605년 5월~6월')).toBe('1605.05–06')
    expect(compactTimelinePeriod('1605년 1월 31일')).toBe('1605.01.31')
    expect(compactTimelinePeriod('4-12')).toBe('04.12')
  })
})

describe('extractTimelineSteps', () => {
  it('단일 전개 단락 안의 <ul>/<ol><li> 항목에서 시점과 제목만 발라내어 타임라인 마디로 승격한다', () => {
    const html = [
      '<ul>',
      '<li>4-12 1차 무스카트: 오만 외무장관 바드르 알부사이디 중재로 첫 간접 회담이 열렸다.</li>',
      '<li>4-19 2차 로마: 로마 주재 오만 대사관에서 4시간 동안 진행됐다.</li>',
      '<li>4-26 3차 무스카트: 전문가급 기술 협상이 처음으로 병행됐다.</li>',
      '</ul>',
    ].join('')
    expect(extractTimelineSteps(html, 'narrative-1')).toEqual([
      { id: 'narrative-1-s1', title: '1차 무스카트', period: '4-12' },
      { id: 'narrative-1-s2', title: '2차 로마', period: '4-19' },
      { id: 'narrative-1-s3', title: '3차 무스카트', period: '4-26' },
    ])
  })

  it('단독 <b> 단락 소제목에서도 시점과 제목을 발라낸다', () => {
    const html = [
      '<p><b>1604년 10월: 국경 도하와 초기 진격</b></p><p>본문 1</p>',
      '<p><b>1605년 1월 31일 (도브리니치 전투): 결정적 패배</b></p><p>본문 2</p>',
      '<p><b>1605년 5월~6월: 보리스의 급사와 모스크바 입성</b></p><p>본문 3</p>',
    ].join('')
    expect(extractTimelineSteps(html, 'narrative-1')).toEqual([
      { id: 'narrative-1-s1', title: '국경 도하와 초기 진격', period: '1604년 10월' },
      { id: 'narrative-1-s2', title: '도브리니치 전투 — 결정적 패배', period: '1605년 1월 31일' },
      { id: 'narrative-1-s3', title: '보리스의 급사와 모스크바 입성', period: '1605년 5월~6월' },
    ])
  })
})

describe('긴 배경 줄여 보기', () => {
  it('글자수는 태그를 걷고 공백을 접어 센다', () => {
    expect(plainTextLength('<p>가나&nbsp;다</p>\n<p>  라</p>')).toBe(6)
    expect(plainTextLength(null)).toBe(0)
    expect(plainTextLength('<p></p>')).toBe(0)
  })

  it('배경 길이 = 요약 + 단락 제목·본문', () => {
    expect(
      backgroundLength('<p>12345</p>', [
        row({ title: '개전', content: '<p>abc</p>' }),
        row({ title: '', content: '<p>de</p>' }),
      ]),
    ).toBe(5 + 2 + 3 + 2)
  })

  it('길어도 뒤에 읽을 본문이 없으면 줄이지 않는다(배경이 곧 본문 전부)', () => {
    expect(
      shouldCollapseBackground({ length: LONG_BACKGROUND_CHARS * 10, hasFollowingContent: false }),
    ).toBe(false)
  })

  it('길고 뒤에 본문이 있을 때만 줄인다', () => {
    expect(
      shouldCollapseBackground({ length: LONG_BACKGROUND_CHARS + 1, hasFollowingContent: true }),
    ).toBe(true)
    expect(
      shouldCollapseBackground({ length: LONG_BACKGROUND_CHARS, hasFollowingContent: true }),
    ).toBe(false)
  })
})

describe('전개·여파 처음 접힘', () => {
  it('전개는 5,000자 초과, 여파는 2,500자 초과일 때만', () => {
    expect(shouldCollapseLongSection('narrative', 5000)).toBe(false)
    expect(shouldCollapseLongSection('narrative', 5001)).toBe(true)
    expect(shouldCollapseLongSection('aftermath', 2501)).toBe(true)
    expect(shouldCollapseLongSection('aftermath', 2000)).toBe(false)
  })
})

describe('단락 소제목 앵커', () => {
  const html = '<h3>2.1 *모렐* 부임</h3><p>본문</p><h3><br></h3><h4 class="x">A &amp; B</h4>'

  it('빈 소제목을 건너뛰고 번호·라벨을 낸다', () => {
    expect(extractProseHeadings(html, 'narrative-2')).toEqual([
      { id: 'narrative-2-h1', label: '2.1 모렐 부임' },
      { id: 'narrative-2-h2', label: 'A & B' },
    ])
  })

  it('앵커 번호가 목차와 같고, 소독을 거쳐도 남는다', () => {
    const anchored = sanitizeRichTextHtml(addHeadingAnchors(html, 'narrative-2'))
    expect(anchored).toContain('id="narrative-2-h1"')
    expect(anchored).toContain('id="narrative-2-h2"')
  })

  it('전개(timeline) 모드에서는 소제목 시기 알약과 연표형 불릿 마커가 소독 뒤에도 유지된다', () => {
    const prose = [
      '<h3>1931년 9월 18일 밤 류탸오후 폭파</h3>',
      '<ul>',
      '<li><strong>07:00</strong> — 1차 포격 개시</li>',
      '<li><strong>09:30</strong> — 성문 돌파</li>',
      '</ul>',
    ].join('')
    const decorated = sanitizeRichTextHtml(addHeadingAnchors(prose, 'narrative-1', { timeline: true }))
    expect(decorated).toContain('data-type="tl-heading"')
    expect(decorated).toContain('data-type="tl-period"')
    expect(decorated).toContain('1931년 9월 18일 밤')
    expect(decorated).toContain('data-type="tl-list"')
    expect(decorated).toContain('data-type="tl-item"')
    expect(decorated).toContain('data-type="tl-time"')
  })
})
