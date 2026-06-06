/**
 * 게이미피케이션 등급 메타데이터 (백엔드 gradeCode와 1:1).
 * 임계값/등급 추가 시 백엔드 point.policy.ts와 함께 갱신.
 */
export type GradeCode = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'

export interface GradeMeta {
  code: GradeCode
  /** 한글 표기 */
  label: string
  /** 뱃지 메인 색 */
  color: string
  /** 뱃지 배경(연한) 색 */
  bg: string
}

const GRADE_META: Record<GradeCode, GradeMeta> = {
  BRONZE: { code: 'BRONZE', label: '브론즈', color: '#B06A2C', bg: 'rgba(205, 127, 50, 0.14)' },
  SILVER: { code: 'SILVER', label: '실버', color: '#7E8794', bg: 'rgba(148, 163, 184, 0.18)' },
  GOLD: { code: 'GOLD', label: '골드', color: '#C99A06', bg: 'rgba(245, 179, 11, 0.16)' },
  PLATINUM: { code: 'PLATINUM', label: '플래티넘', color: '#1AA3B8', bg: 'rgba(34, 197, 215, 0.15)' },
  DIAMOND: { code: 'DIAMOND', label: '다이아몬드', color: '#3B82F6', bg: 'rgba(96, 165, 250, 0.16)' },
}

const FALLBACK: GradeMeta = GRADE_META.BRONZE

/** gradeCode 문자열 → 메타 (알 수 없으면 브론즈 폴백) */
export function gradeMeta(code: string | null | undefined): GradeMeta {
  if (!code) return FALLBACK
  return GRADE_META[code as GradeCode] ?? FALLBACK
}

/** 숫자 천단위 포맷 (null/undefined·NaN은 0으로 — 구버전 API 응답 누락 방어) */
export function fmtNum(n: number | null | undefined): string {
  return (typeof n === 'number' && Number.isFinite(n) ? n : 0).toLocaleString()
}
