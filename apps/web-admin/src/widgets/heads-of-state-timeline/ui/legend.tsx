import styled, { useTheme } from 'styled-components'

import { CATEGORY_TOKENS } from '../lib/category-tokens'
import type { PositionTypeCategory } from '../lib/normalize-tenures'

const ORDER: PositionTypeCategory[] = ['MONARCH', 'PRESIDENT', 'PM', 'POPE', 'OTHER']

interface Props {
  /** 필터 모드 — chip 클릭 시 해당 카테고리 토글, 비활성화된 카테고리는 dim */
  enabled?: Set<PositionTypeCategory>
  onToggle?: (c: PositionTypeCategory) => void
  isAllEnabled?: boolean
  onReset?: () => void
}

/** 직책 카테고리 색상 범례 — 막대 카드와 동일한 톤(flat fill + border)으로 시각 일관성 유지.
 *  필터 모드(props.onToggle 제공 시)에선 클릭으로 카테고리를 켜고 끌 수 있다. */
export function Legend({ enabled, onToggle, isAllEnabled = true, onReset }: Props) {
  const theme = useTheme()
  const isDark = theme?.mode === 'dark'
  const filterable = onToggle != null
  return (
    <Wrap>
      <SectionLabel>{filterable ? '필터' : '카테고리'}</SectionLabel>
      {ORDER.map((id) => {
        const t = CATEGORY_TOKENS[id]
        const tone = t.bar[isDark ? 'dark' : 'light']
        const active = enabled?.has(id) ?? true
        return (
          <Chip
            key={id}
            as={filterable ? 'button' : 'span'}
            type={filterable ? 'button' : undefined}
            $clickable={filterable}
            $dim={filterable && !active}
            onClick={filterable ? () => onToggle!(id) : undefined}
            aria-pressed={filterable ? active : undefined}
            style={{
              background: tone.background,
              borderColor: tone.border,
              color: tone.color,
            }}
          >
            <Glyph>{t.glyph}</Glyph>
            <span>{t.label}</span>
          </Chip>
        )
      })}
      {filterable && !isAllEnabled && onReset && (
        <ResetBtn type="button" onClick={onReset}>
          전체 보기
        </ResetBtn>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const SectionLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 4px;
`

const Chip = styled.span<{ $clickable: boolean; $dim: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  opacity: ${({ $dim }) => ($dim ? 0.35 : 1)};
  transition: opacity 0.15s, transform 0.15s;
  &:hover {
    transform: ${({ $clickable }) => ($clickable ? 'translateY(-1px)' : 'none')};
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
`

const Glyph = styled.span`
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
`

const ResetBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;
  &:hover {
    text-decoration: underline;
  }
`
