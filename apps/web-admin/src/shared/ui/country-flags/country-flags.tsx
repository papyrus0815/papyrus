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
  /**
   * 폭이 모자랄 때 **글리프 중간에서 잘리지 않게** 한다(기본 false = 기존 동작).
   *
   * 기본 동작에서는 Wrap·Item이 둘 다 flex-shrink:0이라 부모가 좁으면 박스가 칩을
   * 직각으로 자른다 — 실측 641px에서 '이탈'·'그레이트' 같은 **실재하지 않는 국가명**이
   * 만들어졌고, '+5'는 DOM 마지막이라 가장 먼저 잘려 8개국 사건이 2개국으로 보였다.
   * 부모에 overflow-x:hidden이 걸려 있어 사용자가 손실을 알아챌 수단도 없었다.
   *
   * 옵트인인 이유: 이 컴포넌트는 shared/ui이고 소비처가 목록·트리·격자·갤러리 4개다.
   */
  fit?: boolean
  className?: string
}

export const CountryFlags: React.FC<Props> = ({
  modern = [],
  historical = [],
  max = 2,
  size = 'md',
  tone = 'inline',
  fit = false,
  className,
}) => {
  // 표시 우선순위: modern 먼저(flag 있어 컴팩트), 그 다음 historical
  const all: Array<{
    id: string
    name: string
    flagEmoji?: string
    historical: boolean
  }> = [
    ...modern.map((item) => ({ ...item, historical: false })),
    ...historical.map((item) => ({ ...item, historical: true })),
  ]
  if (all.length === 0) return null

  const visible = all.slice(0, max)
  const remaining = all.length - visible.length

  // SR용 종합 라벨
  const allNames = all.map((item) => item.name).join(', ')
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
      $fit={fit}
    >
      {/* fit 모드에서는 칩 묶음과 '+N'을 두 트랙으로 나눈다 — 폭이 모자라면 줄어드는 건
          칩 트랙뿐이고 '+N'은 절대 잘리지 않는다. 잘림은 마지막 칩의 말줄임(…)으로
          드러나므로 '더 있음'이 신호로 남는다. */}
      <Chips $size={size} $fit={fit}>
        {visible.map((country) => (
          <Item
            key={country.id}
            $tone={tone}
            $size={size}
            $fit={fit}
            aria-hidden="true"
            title={country.name}
          >
            {/* flag emoji 있으면 그것만, 없으면 name 텍스트 */}
            {country.flagEmoji && !country.historical ? (
              <FlagText $size={size}>{country.flagEmoji}</FlagText>
            ) : (
              <NameText $size={size}>{country.name}</NameText>
            )}
          </Item>
        ))}
      </Chips>
      {remaining > 0 && (
        <More $tone={tone} $size={size} aria-hidden="true">
          +{remaining}
        </More>
      )}
    </Wrap>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const Wrap = styled.span<{
  $size: 'sm' | 'md'
  $tone: 'inline' | 'overlay'
  $fit?: boolean
}>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => ($size === 'sm' ? '3px' : '4px')};
  min-width: 0;
  ${({ $fit }) =>
    $fit
      ? css`
          /* 칩 트랙은 줄어들고 '+N'은 고정 — 순서가 아니라 트랙이 보장한다. */
          display: grid;
          grid-template-columns: minmax(0, auto) auto;
          max-width: 100%;
        `
      : css`
          flex-shrink: 0;
        `}
`

/** fit 모드에서 칩만 담는 트랙 — 여기만 줄어든다. */
const Chips = styled.span<{ $size: 'sm' | 'md'; $fit?: boolean }>`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: ${({ $size }) => ($size === 'sm' ? '3px' : '4px')};
  ${({ $fit }) =>
    $fit &&
    css`
      overflow: hidden;
    `}
`

type ChipProps = {
  $size: 'sm' | 'md'
  $tone: 'inline' | 'overlay'
  $fit?: boolean
}

const chipMixin = css<ChipProps>`
  display: inline-flex;
  align-items: center;
  /* fit 모드에서는 칩이 줄어들 수 있어야 안쪽 NameText의 말줄임이 작동한다.
     min-width:0이 없으면 flex 자식의 기본 min-width:auto가 축소를 막아, 결국
     박스가 글리프 중간에서 잘린다. */
  ${({ $fit }) =>
    $fit
      ? css`
          min-width: 0;
          flex-shrink: 1;
        `
      : css`
          flex-shrink: 0;
        `}
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

/**
 * 이모지 국기는 **시스템 컬러 폰트**라 앱의 색 토큰과 조율할 수 없다 — 목록의 색 예산을
 * 정하는 주체가 둘이 되고, 어떤 튜닝을 해도 행 우측의 채도는 통제되지 않는다.
 * 정지 상태에서만 채도를 회수하고 hover/선택 행에서는 원색으로 되돌린다(정보는 유지).
 */
const FlagText = styled.span<{ $size: 'sm' | 'md' }>`
  filter: saturate(0.75);
  transition: filter 0.12s;

  [data-event-id]:hover &,
  [data-event-id][data-active='true'] & {
    filter: none;
  }

  /* flag emoji는 이모지 폰트로 — 시스템 emoji color font 사용 */
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
    sans-serif;
  font-size: ${({ $size }) => ($size === 'sm' ? '12px' : '14px')};
  line-height: 1;
`

const NameText = styled.span<{ $size: 'sm' | 'md' }>`
  /* 10px 단은 목록 타입 3단(제목/메타/칩)에 없던 유령 단이었다 — 칩 단으로 합류. */
  font-size: ${({ $size }) => ($size === 'sm' ? '10.5px' : '11px')};
  font-weight: 600;
  letter-spacing: 0;
  min-width: 0;
  max-width: var(--flag-name-max, 80px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const More = styled.span<ChipProps>`
  ${chipMixin}
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  ${({ theme, $tone }) =>
    $tone === 'inline' &&
    css`
      /* 누락 고지가 행에서 가장 안 보이는 토큰이면 도입 목적이 무효다 —
         text.tertiary는 라이트 2.29:1로 AA 미달이었다. */
      color: ${theme.mode === 'dark' ? '#a1a1aa' : '#6b7280'};
    `}
`
