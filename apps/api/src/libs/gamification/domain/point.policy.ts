import { AggregateType } from '@prisma/client'

/**
 * 게이미피케이션 점수·등급 정책 (코드 상수로 관리).
 * 설계 문서: docs/gamification-points-grade-design.md
 *
 * 임계값/배점을 바꾸려면 이 파일만 수정하면 됨. 기존 적립분은 ledger(PointEntry)에
 * 보존되며, Account.totalPoints/gradeCode는 ledger 합계로 재계산되므로
 * 배점 변경은 신규 적립부터 적용된다(소급 재계산은 별도 작업).
 */

export type GradeCode = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'

/** 등급 임계값 (누적 점수 내림차순) */
const GRADE_THRESHOLDS: ReadonlyArray<{ code: GradeCode; min: number }> = [
  { code: 'DIAMOND', min: 1500 },
  { code: 'PLATINUM', min: 700 },
  { code: 'GOLD', min: 300 },
  { code: 'SILVER', min: 100 },
  { code: 'BRONZE', min: 0 },
]

/** 누적 점수 → 등급 코드 */
export function gradeForPoints(points: number): GradeCode {
  const safe = Number.isFinite(points) ? points : 0
  for (const tier of GRADE_THRESHOLDS) {
    if (safe >= tier.min) return tier.code
  }
  return 'BRONZE'
}

/** 등급 진행도 요약 (현재 등급 구간 내 다음 등급까지 진행률) */
export interface GradeProgress {
  /** 현재 등급 코드 */
  gradeCode: GradeCode
  /** 다음 등급 코드 (최고 등급이면 null) */
  nextGradeCode: GradeCode | null
  /** 현재 등급 시작 점수 */
  currentGradeMin: number
  /** 다음 등급 시작 점수 (최고 등급이면 null) */
  nextGradeMin: number | null
  /** 다음 등급까지 남은 점수 (최고 등급이면 0) */
  pointsToNext: number
  /** 현재 등급 구간 내 진행률 0~1 (최고 등급이면 1) */
  progressRatio: number
}

/** 누적 점수 → 등급 진행도 요약 */
export function gradeProgressFor(points: number): GradeProgress {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0
  // 오름차순(낮은 등급 → 높은 등급)으로 변환
  const ascending = [...GRADE_THRESHOLDS].reverse()
  const idx = ascending.findIndex((t, i) => {
    const next = ascending[i + 1]
    return safe >= t.min && (!next || safe < next.min)
  })
  const current = ascending[idx] ?? ascending[0]
  const next = ascending[idx + 1] ?? null

  if (!next) {
    return {
      gradeCode: current.code,
      nextGradeCode: null,
      currentGradeMin: current.min,
      nextGradeMin: null,
      pointsToNext: 0,
      progressRatio: 1,
    }
  }

  const span = next.min - current.min
  const gained = safe - current.min
  return {
    gradeCode: current.code,
    nextGradeCode: next.code,
    currentGradeMin: current.min,
    nextGradeMin: next.min,
    pointsToNext: Math.max(0, next.min - safe),
    progressRatio: span > 0 ? Math.min(1, Math.max(0, gained / span)) : 0,
  }
}

/**
 * 콘텐츠 등록 시 기본 적립 점수 (ownerType별).
 * 여기에 없는 타입은 적립 대상이 아님(0점·미적립).
 */
const CREATE_POINTS: Partial<Record<AggregateType, number>> = {
  [AggregateType.PERSON]: 30,
  [AggregateType.COUNTRY]: 30,
  [AggregateType.HISTORICAL_COUNTRY]: 30,
  [AggregateType.EVENT]: 20,
}

/** 해당 콘텐츠 타입의 등록 적립 점수 (없으면 0) */
export function createPointsFor(ownerType: AggregateType): number {
  return CREATE_POINTS[ownerType] ?? 0
}

/**
 * 완성도 보너스 — 콘텐츠를 충실히 채울수록 추가 점수("대충 양산" 대신 질 좋은 등록 유도).
 * 도메인 서비스가 충족한 신호 개수를 세어 넘기면, 신호당 고정 점수로 환산한다.
 */
export const COMPLETENESS_SIGNAL_POINTS = 5

/** 신호 개수 → 완성도 보너스 점수 */
export function completenessBonus(signalCount: number): number {
  return Math.max(0, signalCount) * COMPLETENESS_SIGNAL_POINTS
}
