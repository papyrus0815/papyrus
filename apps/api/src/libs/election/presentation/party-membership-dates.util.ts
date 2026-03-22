import { BadRequestException } from '@nestjs/common'

/** ISO 문자열 또는 null/빈 값 → Date | null | undefined (필드 미포함은 undefined) */
export function membershipInputToDate(
  value: string | null | undefined,
  wasInBody: boolean,
): Date | null | undefined {
  if (!wasInBody) return undefined
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('날짜 형식이 올바르지 않습니다.')
  }
  return d
}

export function assertMembershipStartBeforeEnd(
  start: Date | null | undefined,
  end: Date | null | undefined,
): void {
  if (start != null && end != null && end.getTime() < start.getTime()) {
    throw new BadRequestException('종료일은 시작일 이후여야 합니다.')
  }
}
