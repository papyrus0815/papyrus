/**
 * 사건 상세의 섹션 구성 — 어떤 섹션이 **내용을 갖고 있는가**, 목차에 무엇을 세우는가.
 *
 * 왜 따로 두나. 예전엔 섹션 10개가 비어 있어도 전부 렌더됐다. 실DB 362건 중 인물 연결
 * 15%·이미지 7%·여파 23%·조약 0건이라, 대부분의 사건은 본문이 끝난 뒤 '조약 만들기 ·
 * 상위 사건 지정 · 이미지 업로드…' 같은 빈 편집 블록이 화면 1/3을 차지했고, 목차도 빈
 * 섹션까지 '이 문서에 있다'고 광고했다.
 *
 * 이제 빈 섹션은 본문·목차에서 빠지고, 본문 끝의 '더 채울 수 있는 것' 한 줄로 접힌다
 * (누르면 그 섹션이 펼쳐진다). 그 판정의 단일 출처가 여기다 — 페이지·목차·개요 장부가
 * 같은 판정을 써야 서로 다른 말을 하지 않는다.
 */
import { isVisuallyEmptyRichText } from '@/shared/lib/rich-text-empty'

import { type SectionKind, sectionKindOf } from './narrative-sections.lib'

/** 내용이 없으면 접히는 섹션들 — 모듈·댓글은 대상이 아니다(모듈은 이미 있을 때만 뜬다). */
export type FoldableSectionId =
  | 'background'
  | 'narrative'
  | 'aftermath'
  | 'actors'
  | 'treaties'
  | 'network'
  | 'appendix'

/**
 * 접히는 섹션 — 배열 순서가 본문 순서이고, 접힌 섹션을 펼치는 버튼의 순서다.
 * `fillLabel`은 '무엇을 하면 채워지는가'로 쓴다(섹션 이름이 아니라 행동).
 */
export const FOLDABLE_SECTIONS: ReadonlyArray<{
  id: FoldableSectionId
  label: string
  fillLabel: string
}> = [
  { id: 'background', label: '배경', fillLabel: '배경 쓰기' },
  { id: 'narrative', label: '전개', fillLabel: '전개 쓰기' },
  { id: 'aftermath', label: '여파', fillLabel: '여파 쓰기' },
  { id: 'actors', label: '참여 행위자', fillLabel: '참여 인물·국가' },
  { id: 'treaties', label: '조약', fillLabel: '조약 연결' },
  { id: 'network', label: '연관', fillLabel: '상위·하위·관련 사건' },
  { id: 'appendix', label: '이미지', fillLabel: '이미지 추가' },
]

/** 판정에 필요한 사건 필드만 — 테스트가 EventDetail 전체를 만들 필요가 없게. */
export interface SectionFillSource {
  background?: string | null
  aftermath?: string | null
  eventSections?: Array<{
    sectionType: string
    title?: string | null
    order?: number
  }>
  relatedPersons?: unknown[]
  relatedCountries?: unknown[]
  relatedHistoricalCountries?: unknown[]
  treaties?: unknown[]
  parentEvent?: unknown
  extraParents?: unknown[]
  childEvents?: unknown[]
  extraChildren?: unknown[]
  keywords?: string[] | null
  eventImages?: unknown[]
}

/** 태그를 걷어낸 실제 글자가 있는가 — 빈 `<p></p>`는 내용이 아니다. */
export function hasRichText(value?: string | null): boolean {
  // 글자뿐 아니라 지도·이미지·표 같은 시각 콘텐츠도 내용이다 — 지도만 넣은 요약이 '빈 섹션'으로
  // 접히던 것(태그를 걷어낸 글자만 봤다). 판정은 읽기 뷰와 같은 단일 출처.
  return !isVisuallyEmptyRichText(value)
}

/**
 * 섹션별 '내용이 있는가'.
 * @param relatedCount 관련 사건 수 — 상세 응답 밖의 별도 리소스라 호출부가 넘긴다.
 */
export function filledSections(
  event: SectionFillSource,
  relatedCount: number,
): Record<FoldableSectionId, boolean> {
  const sections = event.eventSections ?? []
  const rowsOf = (kind: SectionKind) =>
    sections.filter((section) => sectionKindOf(section.sectionType) === kind).length
  const count = (list?: unknown[] | null) => list?.length ?? 0

  return {
    background: hasRichText(event.background) || rowsOf('background') > 0,
    narrative: rowsOf('narrative') > 0,
    aftermath: hasRichText(event.aftermath) || rowsOf('aftermath') > 0,
    actors:
      count(event.relatedPersons) +
        count(event.relatedCountries) +
        count(event.relatedHistoricalCountries) >
      0,
    treaties: count(event.treaties) > 0,
    network:
      Boolean(event.parentEvent) ||
      count(event.extraParents) +
        count(event.childEvents) +
        count(event.extraChildren) +
        count(event.keywords) +
        relatedCount >
        0,
    appendix: count(event.eventImages) > 0,
  }
}

export interface OutlineItem {
  id: string
  label: string
  /** 번호 단락 — 긴 섹션(한국전쟁 '전개'는 10,800px) 안에서 길을 잃지 않게. */
  children?: Array<{ id: string; label: string }>
}

/**
 * 번호 단락의 목차 항목. 앵커는 NarrativeSectionList의 `${anchorPrefix}-${ordinal}`과
 * 같은 규칙이다(서버 order 순 = 화면 순). 제목이 빈 단락은 'N단락'으로 세운다.
 */
export function paragraphOutline(
  event: SectionFillSource,
  kind: SectionKind,
): Array<{ id: string; label: string }> {
  return (event.eventSections ?? [])
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .filter((section) => sectionKindOf(section.sectionType) === kind)
    .map((section, index) => ({
      id: `${kind}-${index + 1}`,
      label: section.title?.trim() || `${index + 1}단락`,
    }))
}
