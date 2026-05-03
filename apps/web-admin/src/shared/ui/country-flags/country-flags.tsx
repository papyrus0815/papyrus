/**
 * CountryFlags — 사건의 관련 국가를 컴팩트하게 표시.
 *
 * 데이터 형식
 *  - modern[]    : { id, name, flagEmoji? }  → flag 우선, 없으면 name
 *  - historical[]: { id, name }              → 항상 name (flag 없음)
 *
 * 표시 규칙
 *  - max(기본 2)개까지 노출, 나머지는 "+N" chip
 *  - flag emoji가 있으면 flag만, 없으면 name
 *  - tone='inline'(기본): 평소 row 안에 자연스럽게
 *  - tone='overlay': Gallery 카드의 어두운 오버레이 위에서 가독성 ↑
 *  - size='sm' | 'md'(기본)
 *
 * a11y
 *  - 전체 wrap에 aria-label로 모든 국가 이름 나열 ("관련 국가: 한국, 중국 외 2개")
 *  - 개별 chip은 aria-hidden (중복 노출 방지)
 *
 * Flag 폰트 미지원 OS(Windows 일부)에서는 flag가 사각형 코드로 보이는데,
 * 그건 OS 폰트의 문제 — fallback 없이 그대로 둠 (자연스러운 동작).
 */
import React from 'react'

import styled, { css } from 'styled-components'

interface ModernCountry {
  id: string
  name: string
  flagEmoji?: string
}

interface HistoricalCountry {
  id: string
  name: string
}

interface Props {
  modern?: ModernCountry[]
  historical?: HistoricalCountry[]
  /** 표시 최대 — 초과분은 "+N"으로 (기본 2) */
  max?: number
  size?: 'sm' | 'md'
  /** 'overlay'면 어두운 배경(Gallery 등)에서 가독성을 위해 흰색 톤 */
  tone?: 'inline' | 'overlay'
  className?: string
}

export const CountryFlags: React.FC<Props> = ({
  modern = [],
  historical = [],
  max = 2,
  size = 'md',
  tone = 'inline',
  className,
}) => {
  // 표시 우선순위: modern 먼저(flag 있어 컴팩트), 그 다음 historical
  const all: Array<{
    id: string
    name: string
    flagEmoji?: string
    historical: boolean
  }> = [
    ...modern.map((c) => ({ ...c, historical: false })),
    ...historical.map((c) => ({ ...c, historical: true })),
  ]
  if (all.length === 0) return null

  const visible = all.slice(0, max)
  const remaining = all.length - visible.length

  // SR용 종합 라벨
  const allNames = all.map((c) => c.name).join(', ')
  const ariaLabel =
    all.length > max
      ? `관련 국가: ${allNames} (총 ${all.length}개)`
      : `관련 국가: ${allNames}`

  return (
    <Wrap
      role="group"
      aria-label={ariaLabel}
      className={className}
      $size={size}
      $tone={tone}
    >
      {visible.map((c) => (
        <Item
          key={c.id}
          $tone={tone}
          $size={size}
          aria-hidden="true"
          title={c.name}
        >
          {/* flag emoji 있으면 그것만, 없으면 name 텍스트 */}
          {c.flagEmoji && !c.historical ? (
            <FlagText $size={size}>{c.flagEmoji}</FlagText>
          ) : (
            <NameText $size={size}>{c.name}</NameText>
          )}
        </Item>
      ))}
      {remaining > 0 && (
        <More $tone={tone} $size={size} aria-hidden="true">
          +{remaining}
        </More>
      )}
    </Wrap>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const Wrap = styled.span<{ $size: 'sm' | 'md'; $tone: 'inline' | 'overlay' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => ($size === 'sm' ? '3px' : '4px')};
  flex-shrink: 0;
  min-width: 0;
`

type ChipProps = { $size: 'sm' | 'md'; $tone: 'inline' | 'overlay' }

const chipMixin = css<ChipProps>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: ${({ $size }) => ($size === 'sm' ? '4px' : '5px')};
  padding: ${({ $size }) => ($size === 'sm' ? '0 4px' : '1px 5px')};
  height: ${({ $size }) => ($size === 'sm' ? '15px' : '18px')};
  font-size: ${({ $size }) => ($size === 'sm' ? '10.5px' : '11px')};
  font-weight: 600;
  letter-spacing: -0.005em;
  white-space: nowrap;
  ${({ $tone, theme }) =>
    $tone === 'overlay'
      ? css`
          color: rgba(255, 255, 255, 0.92);
          background: rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(2px);
        `
      : css`
          color: ${theme.colors.text.secondary};
          background: ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(15,23,42,0.05)'};
        `}
`

const Item = styled.span<ChipProps>`
  ${chipMixin}
`

const FlagText = styled.span<{ $size: 'sm' | 'md' }>`
  /* flag emoji는 이모지 폰트로 — 시스템 emoji color font 사용 */
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
    sans-serif;
  font-size: ${({ $size }) => ($size === 'sm' ? '12px' : '14px')};
  line-height: 1;
`

const NameText = styled.span<{ $size: 'sm' | 'md' }>`
  font-size: ${({ $size }) => ($size === 'sm' ? '10px' : '11px')};
  font-weight: 600;
  letter-spacing: -0.005em;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const More = styled.span<ChipProps>`
  ${chipMixin}
  font-variant-numeric: tabular-nums;
  ${({ theme, $tone }) =>
    $tone === 'inline' &&
    css`
      color: ${theme.colors.text.tertiary};
    `}
`
