/**
 * 사건 에디터 섹션 정의.
 *
 * - 섹션 = 좌측 sidebar nav 항목 1개 + 본문의 anchored 영역 1개
 * - 카테고리에 따라 일부 섹션(군사/회담)은 동적으로 노출/은닉된다.
 * - 섹션 등록 순서가 곧 본문 표시 순서.
 */

import type { EventEditorFormValues } from './schema'

export type EventEditorSectionId =
  | 'basic'
  | 'content'
  | 'images'
  | 'location'
  | 'relations'
  | 'military'
  | 'conference'

export interface EventEditorSectionDef {
  id: EventEditorSectionId
  label: string
  description?: string
  /** 카테고리 미선택 시에도 항상 보이는지 */
  alwaysVisible: boolean
  /**
   * 카테고리 이름(소문자) 매칭 — 하나라도 포함되면 노출.
   * alwaysVisible=true 인 섹션은 무시된다.
   */
  showWhenCategoryMatches?: string[]
  /** 폼값을 보고 "이 섹션이 채워졌는지" 판단하는 함수 (sidebar dot 표시용) */
  isFilled: (values: EventEditorFormValues) => boolean
}

export const EVENT_EDITOR_SECTIONS: EventEditorSectionDef[] = [
  {
    id: 'basic',
    label: '기본 정보',
    description: '제목·일시·카테고리·장소 등 사건의 핵심 정보.',
    alwaysVisible: true,
    isFilled: (v) => v.title.trim().length > 0,
  },
  {
    id: 'content',
    label: '본문',
    description: '배경·여파와 자유 형식의 본문 섹션.',
    alwaysVisible: true,
    isFilled: (v) =>
      Boolean(v.background?.trim()) ||
      Boolean(v.aftermath?.trim()) ||
      v.eventSections.length > 0,
  },
  {
    id: 'images',
    label: '이미지',
    description: '대표 이미지·갤러리.',
    alwaysVisible: true,
    isFilled: (v) => v.eventImages.length > 0,
  },
  {
    id: 'location',
    label: '위치',
    description: '도시·행정구역·역사적 국가 연결.',
    alwaysVisible: true,
    isFilled: (v) =>
      Boolean(v.cityId) ||
      Boolean(v.administrativeDivisionId) ||
      Boolean(v.historicalCountryId),
  },
  {
    id: 'relations',
    label: '관계',
    description: '인물·국가·하위 사건·키워드.',
    alwaysVisible: true,
    isFilled: (v) =>
      v.relatedPersons.length > 0 ||
      v.relatedCountryIds.length > 0 ||
      v.relatedHistoricalCountryIds.length > 0 ||
      v.childEventIds.length > 0 ||
      v.keywords.length > 0,
  },
  {
    id: 'military',
    label: '군사 정보',
    description: '교전 세력·전투 상세·피해 규모.',
    alwaysVisible: false,
    showWhenCategoryMatches: ['전쟁', '전투', '군사', 'war', 'battle', 'military'],
    isFilled: (v) =>
      Boolean(
        v.militaryEvent &&
          (v.militaryEvent.belligerentSides.length > 0 ||
            v.militaryEvent.casualties.length > 0 ||
            v.militaryEvent.warCost),
      ),
  },
  {
    id: 'conference',
    label: '회담·외교',
    description: '참여국·조약·합의 사항.',
    alwaysVisible: false,
    showWhenCategoryMatches: [
      '회담',
      '외교',
      '조약',
      '회의',
      'conference',
      'diplomatic',
      'treaty',
    ],
    isFilled: (v) =>
      Boolean(
        v.conferenceEvent &&
          (v.conferenceEvent.participants.length > 0 ||
            v.conferenceEvent.treaties.length > 0),
      ),
  },
]

/**
 * 현재 카테고리·폼 상태에서 표시할 섹션 목록을 계산.
 * 카테고리 이름은 categoryName 우선, 없으면 categoryId의 인접 메타에서
 * 외부에서 주입(EditorPage가 카테고리 목록을 알고 있을 때).
 */
export function resolveVisibleSections(
  values: EventEditorFormValues,
  categoryNameHint?: string,
): EventEditorSectionDef[] {
  const categoryName = (categoryNameHint ?? values.categoryName ?? '')
    .toLowerCase()
    .trim()

  return EVENT_EDITOR_SECTIONS.filter((s) => {
    if (s.alwaysVisible) return true
    if (!categoryName) return false
    return (s.showWhenCategoryMatches ?? []).some((kw) =>
      categoryName.includes(kw.toLowerCase()),
    )
  })
}
