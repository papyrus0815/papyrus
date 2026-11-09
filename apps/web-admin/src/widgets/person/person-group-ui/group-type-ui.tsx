/**
 * 인물 묶음 유형 공용 UI — 칩 그리드(선택)·배지(표시).
 * list/detail/create-modal/manage-modal/section 중복 제거용 단일 소스.
 */
import styled from 'styled-components'

import type { Person } from '@/shared/api/person'
import {
  GROUP_TONE,
  PERSON_GROUP_TYPE_META,
  PERSON_GROUP_TYPE_ORDER,
  type GroupTone,
  type PersonGroupMember,
  type PersonGroupType,
} from '@/shared/api/person-groups'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

/**
 * 집단 소속 인물의 생몰년 또는 활동시기(floruit) 요약 라벨.
 * BC 연대 및 미상/생존 표기를 일관되게 처리한다.
 */
export function personLifespanLabel(p: Person): string {
  const fmtYear = (y: number | null | undefined, era?: string | null) =>
    y != null ? (era === 'BC' ? `BC ${y}` : String(y)) : null
  const by = fmtYear(p.birthYear, p.birthEra)
  const dy = fmtYear(p.deathYear, p.deathEra)
  if (by != null || dy != null) {
    const end = dy ?? (p.isAlive ? '현재' : '?')
    return `${by ?? '?'}–${end}`
  }
  if (p.floruitStartYear != null || p.floruitEndYear != null) {
    const pre = p.floruitEra === 'BC' ? 'BC ' : ''
    if (
      p.floruitStartYear != null &&
      p.floruitEndYear != null &&
      p.floruitStartYear !== p.floruitEndYear
    ) {
      return `활동 ${pre}${p.floruitStartYear}–${p.floruitEndYear}`
    }
    return `활동 ${pre}${p.floruitStartYear ?? p.floruitEndYear}`
  }
  return ''
}

/**
 * 집단 멤버 연대순 정렬용 대표 연도 (부호 연도, 미상은 +Infinity).
 */
export function personPrimarySortYear(p: Person): number {
  if (p.birthYear != null) {
    return p.birthEra === 'BC' ? -p.birthYear : p.birthYear
  }
  const fy = p.floruitStartYear ?? p.floruitEndYear
  if (fy != null) {
    return p.floruitEra === 'BC' ? -fy : fy
  }
  if (p.deathYear != null) {
    return p.deathEra === 'BC' ? -p.deathYear : p.deathYear
  }
  return Number.POSITIVE_INFINITY
}

/**
 * 집단 멤버 정렬:
 * 1) 중심 인물(centerPersonId) 최우선
 * 2) sortOrder 오름차순 (명시 지정된 순서)
 * 3) 출생/활동 연도 오름차순
 * 4) 표시 이름 가나다순
 */
export function sortGroupMembers(
  members: PersonGroupMember[],
  centerPersonId?: string | null,
): PersonGroupMember[] {
  return [...members].sort((a, b) => {
    const aCenter = centerPersonId && a.person.id === centerPersonId ? 0 : 1
    const bCenter = centerPersonId && b.person.id === centerPersonId ? 0 : 1
    if (aCenter !== bCenter) return aCenter - bCenter
    const sa = a.sortOrder ?? Number.POSITIVE_INFINITY
    const sb = b.sortOrder ?? Number.POSITIVE_INFINITY
    if (sa !== sb) return sa - sb
    const ya = personPrimarySortYear(a.person)
    const yb = personPrimarySortYear(b.person)
    if (ya !== yb) return ya - yb
    return getPersonDisplayName(a.person, true).localeCompare(
      getPersonDisplayName(b.person, true),
      'ko',
    )
  })
}

interface ChipsProps {
  value: PersonGroupType
  onChange: (t: PersonGroupType) => void
  /** 칩 크기 — 'lg'(생성/편집 폼), 'sm'(좁은 영역). 기본 lg */
  size?: 'lg' | 'sm'
}

export function GroupTypeChips({ value, onChange, size = 'lg' }: ChipsProps) {
  return (
    <Grid>
      {PERSON_GROUP_TYPE_ORDER.map((t) => {
        const meta = PERSON_GROUP_TYPE_META[t]
        return (
          <Chip
            key={t}
            type="button"
            $tone={meta.tone}
            $active={value === t}
            $sm={size === 'sm'}
            onClick={() => onChange(t)}
          >
            {meta.label}
          </Chip>
        )
      })}
    </Grid>
  )
}

export function GroupTypeBadge({ type }: { type: PersonGroupType }) {
  const meta = PERSON_GROUP_TYPE_META[type]
  return <Badge $tone={meta.tone}>{meta.label}</Badge>
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
  @media (max-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const Chip = styled.button<{ $tone: GroupTone; $active: boolean; $sm: boolean }>`
  padding: ${({ $sm }) => ($sm ? '10px 6px' : '12px 8px')};
  font-size: ${({ $sm }) => ($sm ? '13px' : '13.5px')};
  font-weight: 700;
  border-radius: ${({ $sm }) => ($sm ? '10px' : '12px')};
  cursor: pointer;
  transition: all 0.13s ease;
  border: 1.5px solid
    ${({ $active, $tone, theme }) =>
      $active
        ? isDark(theme.mode)
          ? GROUP_TONE[$tone].fgDark
          : GROUP_TONE[$tone].fgLight
        : theme.colors.border.default};
  background: ${({ $active, $tone, theme }) =>
    $active
      ? isDark(theme.mode)
        ? GROUP_TONE[$tone].bgDark
        : GROUP_TONE[$tone].bgLight
      : theme.colors.background.primary};
  color: ${({ $active, $tone, theme }) =>
    $active
      ? isDark(theme.mode)
        ? GROUP_TONE[$tone].fgDark
        : GROUP_TONE[$tone].fgLight
      : theme.colors.text.secondary};
  &:hover {
    border-color: ${({ $tone, theme }) =>
      isDark(theme.mode) ? GROUP_TONE[$tone].fgDark : GROUP_TONE[$tone].fgLight};
  }
`

const Badge = styled.span<{ $tone: GroupTone }>`
  padding: 3px 10px;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ $tone, theme }) =>
    isDark(theme.mode) ? GROUP_TONE[$tone].bgDark : GROUP_TONE[$tone].bgLight};
  color: ${({ $tone, theme }) =>
    isDark(theme.mode) ? GROUP_TONE[$tone].fgDark : GROUP_TONE[$tone].fgLight};
`
