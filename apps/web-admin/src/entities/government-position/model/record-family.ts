/**
 * 기록 가족(RecordFamily) — 하나의 직책 정의가 "어느 기록으로 등록되어야 하는가".
 *
 * `GovernmentPositionType`(권한 유형)과 `isMonarchical`(주권 칭호 여부)은 서로 다른 축인데,
 * 재임/재위 피커는 그동안 `isMonarchical !== true` 하나로만 걸러 왔다. 그 결과
 * ROYAL_NOBLE_TITLE(공작·백작·자작 등, 실측 17건 전부 isMonarchical=false)이
 * "관직 재임"(공직 임기) 목록에 그대로 섞여 나왔다 — 작위는 임기가 아니라 승계·상실이다.
 *
 * 세 가족:
 * - `SOVEREIGN`  국왕·황제·천황·술탄·번주 등 주권 칭호 → "군주 재위"로 등록
 * - `NOBLE_TITLE` 공작·후작·백작·자작·남작 등 작위 → 재임도 재위도 아닌 별도 성격
 * - `OFFICE`     대통령·총리·장관·차관·외교직 등 공직 → "관직 재임"
 *
 * ⚠️ `PositionCategory`(categorize.ts)와 혼동하지 말 것. 그쪽은 수반 비교 타임라인의
 * 색·범례·정렬에 묶인 표시용 분류라 값을 늘리면 파급이 크다. 기록 가족은 등록 경로를
 * 가르는 별개 축이라 컬럼·마이그레이션 없이 기존 두 필드에서 순수 파생한다.
 */

export type RecordFamily = 'SOVEREIGN' | 'NOBLE_TITLE' | 'OFFICE'

export interface RecordFamilyInput {
  positionType?: string | null
  isMonarchical?: boolean | null
}

/** 직책 정의(또는 그 형태의 객체)가 속한 기록 가족. */
export function getRecordFamily(input: RecordFamilyInput | null | undefined): RecordFamily {
  if (!input) return 'OFFICE'
  if (input.isMonarchical === true) return 'SOVEREIGN'
  if (input.positionType === 'ROYAL_NOBLE_TITLE') return 'NOBLE_TITLE'
  return 'OFFICE'
}

/** 피커 그룹 라벨 — 재임 패널·재위 패널이 같은 문구를 쓰도록 단일 출처로 둔다. */
export const RECORD_FAMILY_GROUP_LABELS: Record<RecordFamily, string> = {
  SOVEREIGN: '군주 칭호',
  NOBLE_TITLE: '작위·칭호',
  OFFICE: '관직',
}
