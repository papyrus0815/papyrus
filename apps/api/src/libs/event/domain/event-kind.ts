/**
 * 사건 종류(단일/묶음) 규칙의 정본.
 *
 *  - 단일 사건(SINGLE)     전투·회담·조약 체결·선언. 본문에 배경·전개·여파를 모두 쓴다.
 *                          하위 사건을 가질 수 없다.
 *  - 묶음 사건(COLLECTION) 전쟁·위기·운동·정책. 하위 사건을 거느리고, **전개는 하위 사건이
 *                          맡는다** — 본문 단락은 배경·여파만.
 *
 * 전환은 명시 동작뿐이다. 하위를 붙인다고 저절로 묶음이 되지 않는다(예전 파생 앵커 판정은
 * 하위 하나를 붙이는 순간 지위가 바뀌어 본문이 규칙 밖으로 밀려났다).
 *   - 단일 → 묶음: POST /events/:id/split — 전개 단락을 하위 사건·배경·여파로 나누며 한 번에.
 *   - 묶음 → 단일: 하위가 하나도 없을 때만.
 */
import { BadRequestException, ConflictException } from '@nestjs/common'

export type EventKind = 'SINGLE' | 'COLLECTION'

/** 묶음 사건이 가질 수 있는 본문 단락 유형 — 전체에만 속하는 배경·여파 */
export const COLLECTION_SECTION_TYPES = ['background', 'aftermath'] as const

/**
 * 전개 단락인가. 레거시 값('content'·'process'·'narrative'·null)이 섞여 있어
 * *배경도 여파도 아닌 것* 전부를 전개로 본다(프론트 narrative-sections.lib와 같은 규칙).
 */
export const isDevelopmentSectionType = (sectionType?: string | null): boolean =>
  sectionType !== 'background' && sectionType !== 'aftermath'

export const assertSingleHasNoChildren = (kind: EventKind, childCount: number): void => {
  if (kind === 'SINGLE' && childCount > 0) {
    throw new BadRequestException(
      '단일 사건은 하위 사건을 가질 수 없습니다 — 먼저 묶음 사건으로 나누세요.',
    )
  }
}

export const assertCollectionSections = (
  kind: EventKind,
  sections: ReadonlyArray<{ sectionType?: string | null }> | undefined,
): void => {
  if (kind !== 'COLLECTION' || !sections) return
  if (sections.some((section) => isDevelopmentSectionType(section.sectionType))) {
    throw new BadRequestException(
      '묶음 사건에는 전개 단락을 쓸 수 없습니다 — 전개는 하위 사건으로 등록하세요(본문은 배경·여파만).',
    )
  }
}

/** 상위로 지정하려는 사건들이 모두 묶음인가 */
export const assertParentsAreCollections = (
  parents: ReadonlyArray<{ id: string; title: string; kind: EventKind }>,
): void => {
  const single = parents.find((parent) => parent.kind !== 'COLLECTION')
  if (single) {
    throw new BadRequestException(
      `'${single.title}'은(는) 단일 사건이라 하위를 둘 수 없습니다 — 먼저 묶음 사건으로 나누세요.`,
    )
  }
}

/** 묶음 → 단일 전환 가능 여부 */
export const assertCanBecomeSingle = (liveChildCount: number): void => {
  if (liveChildCount > 0) {
    throw new ConflictException(
      `하위 사건 ${liveChildCount}건이 남아 있어 단일 사건으로 바꿀 수 없습니다 — 하위를 먼저 떼어 내세요.`,
    )
  }
}

/** 단일 → 묶음 전환 가능 여부(전개 단락이 남아 있으면 나누기로 보낸다) */
export const assertCanBecomeCollection = (developmentSectionCount: number): void => {
  if (developmentSectionCount > 0) {
    throw new ConflictException(
      `전개 단락 ${developmentSectionCount}개가 있습니다 — '하위 사건으로 나누기'로 하위·배경·여파로 옮긴 뒤 묶음이 됩니다.`,
    )
  }
}

/** 나누기 — 전개 단락 하나를 어디로 보낼지 */
export type SplitTarget = 'CHILD' | 'BACKGROUND' | 'AFTERMATH' | 'DROP'

export interface SplitSectionPlan {
  sectionId: string
  to: SplitTarget
  /** CHILD일 때 새 하위 사건 제목(생략하면 단락 제목) */
  title?: string
  /** CHILD일 때 새 하위 사건 날짜 — 구조화(era/year/month/day) + 저장 가능하면 date */
  start?: { date: Date | null; era: 'BC' | 'AD'; year: number; month: number; day: number }
  startDatePrecision?: string
  end?: { date: Date | null; era: 'BC' | 'AD'; year: number; month: number; day: number }
  endDatePrecision?: string
}
