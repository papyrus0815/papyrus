/**
 * 인물 묶음 유형 공용 UI — 칩 그리드(선택)·배지(표시).
 * list/detail/create-modal/manage-modal/section 중복 제거용 단일 소스.
 */
import styled from 'styled-components'

import {
  GROUP_TONE,
  PERSON_GROUP_TYPE_META,
  PERSON_GROUP_TYPE_ORDER,
  type GroupTone,
  type PersonGroupType,
} from '@/shared/api/person-groups'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

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
