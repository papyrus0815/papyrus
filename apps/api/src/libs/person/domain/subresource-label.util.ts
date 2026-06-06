import { dateYearRangePreview } from '../../shared/notification-preview.util'

/**
 * 인물 하위 항목(경력/학력/수상) 알림 preview용 라벨 빌더.
 * 응답 DTO(추가 시)와 Prisma 행(삭제 시) 둘 다 받을 수 있도록 필드는 모두 옵셔널.
 * 표시 제목 우선 → 없으면 직책/전문분야 등 → 끝에 연도 범위. "미국 대통령 · 1789 ~ 1797"
 */

interface CareerLike {
  timelineTitle?: string | null
  title?: string | null
  position?: string | null
  roleTitle?: string | null
  specialization?: string | null
  sport?: string | null
  genre?: string | null
  artField?: string | null
  department?: string | null
  beat?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface EducationLike {
  timelineTitle?: string | null
  degree?: string | null
  major?: string | null
  department?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
}

interface AwardLike {
  awardName?: string | null
  category?: string | null
  awardingBody?: string | null
  awardDate?: Date | string | null
}

function withPeriod(name: string | null, period: string | undefined): string | undefined {
  return [name, period].filter(Boolean).join(' · ') || undefined
}

export function careerItemLabel(c: CareerLike): string | undefined {
  const name =
    c.timelineTitle ||
    c.title ||
    c.position ||
    c.roleTitle ||
    c.specialization ||
    c.sport ||
    c.genre ||
    c.artField ||
    c.beat ||
    c.department ||
    null
  return withPeriod(name, dateYearRangePreview(c.startDate, c.endDate))
}

export function educationItemLabel(e: EducationLike): string | undefined {
  const name = [e.degree, e.major].filter(Boolean).join(' ') || e.timelineTitle || e.department || null
  return withPeriod(name, dateYearRangePreview(e.startDate, e.endDate))
}

export function awardItemLabel(a: AwardLike): string | undefined {
  const name = a.awardName || a.category || a.awardingBody || null
  return withPeriod(name, dateYearRangePreview(a.awardDate, null))
}
