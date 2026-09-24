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

import { shortenCountryName } from '@/shared/lib/country-short-name'

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
  /**
   * 칩 라벨을 **통용 약칭**으로 줄인다(기본 false = 정식 명칭 그대로).
   *
   * 좁은 메타 열(목록 행의 관련국 열) 전용이다. 정식 명칭은 폭이 아무리 넉넉해도
   * '그레이트브리튼 및 아일랜드 연합왕국'(153px)처럼 담기지 않는 것이 있고, 잘리면
   * 남는 글자가 국가를 특정하지 못한다(실측 521칩 중 190칩 말줄임).
   *
   * ⚠️ 약칭은 라벨에만 적용된다 — `title`·`aria-label`은 정식 명칭을 유지한다.
   */
  shorten?: boolean
  /**
   * 국기 이모지 **옆에 이름도** 적는다(기본 false = 이모지만).
   *
   * 이모지 국기는 폭을 거의 안 쓰는 대신, 비슷한 삼색기가 많아 한눈에 특정되지 않는다
   * (🇮🇹 🇮🇪 🇲🇽 / 🇫🇷 🇳🇱 🇷🇺). 좁은 열에서는 그 모호함을 감수하는 게 옳지만, 열이
   * 넓어지면 감수할 이유가 없다 — 목록 행의 관련국 열이 설명을 걷어낸 뒤 신축 트랙이
   * 되면서 이모지 3개가 500px짜리 칸에 떠 있게 됐다.
   *
   * ⚠️ 역사국가는 원래부터 이름 칩이라 이 플래그와 무관하다.
   */
  withName?: boolean
  className?: string
}

export const CountryFlags: React.FC<Props> = ({
  modern = [],
  historical = [],
  max = 2,
  size = 'md',
  tone = 'inline',
  fit = false,
  shorten = false,
  withName = false,
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
            /* 이모지 국기는 그 자체가 이미 색 있는 도형이라 담을 상자가 필요 없다.
               상자가 필요한 쪽은 **텍스트 칩**(역사국가)뿐이다 — 회색 면이 이름의
               경계를 대신한다. 어두운 배경 위(overlay)는 두 경우 모두 면이 있어야
               읽히므로 예외로 둔다. */
            $plain={Boolean(country.flagEmoji) && !country.historical}
            aria-hidden="true"
            title={country.name}
          >
            {/* flag emoji 있으면 그것만(withName이면 이름도), 없으면 name 텍스트 */}
            {country.flagEmoji && !country.historical ? (
              <>
                <FlagText $size={size}>{country.flagEmoji}</FlagText>
                {withName && (
                  <NameText $size={size}>
                    {shorten ? shortenCountryName(country.name) : country.name}
                  </NameText>
                )}
              </>
            ) : (
              <NameText $size={size}>
                {shorten ? shortenCountryName(country.name) : country.name}
              </NameText>
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
  /** 면 없는 칩 — 이모지 국기처럼 내용이 이미 자기 모양을 가진 경우 */
  $plain?: boolean
}

const chipMixin = css<ChipProps>`
  display: inline-flex;
  align-items: center;
  /* 국기 + 이름을 함께 쓸 때(withName)만 실제로 쓰이는 간격. 자식이 하나면 무해하다. */
  gap: ${({ $size }) => ($size === 'sm' ? '3px' : '4px')};
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
  /* 면 없는 칩은 패딩도 없다 — 상자가 사라진 뒤에도 좌우 4px이 남으면 묶음의 오른쪽
     끝이 트랙(과 열 머리글) 끝에서 4px 안쪽에 서서, 우측 정렬한 이유가 절반만 남는다.
     칩 사이 간격은 Wrap의 gap이 이미 맡고 있다. */
  padding: ${({ $size, $plain }) =>
    $plain ? '0' : $size === 'sm' ? '0 4px' : '1px 5px'};
  height: ${({ $size }) => ($size === 'sm' ? '15px' : '18px')};
  font-size: ${({ $size }) => ($size === 'sm' ? '10.5px' : '11px')};
  font-weight: 600;
  letter-spacing: -0.005em;
  white-space: nowrap;
  ${({ $tone, $plain, theme }) =>
    $tone === 'overlay'
      ? css`
          color: rgba(255, 255, 255, 0.92);
          background: rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(2px);
        `
      : $plain
        ? css`
            /* 면 없음 — 국기 이모지 하나를 회색 알약에 넣으면 행 우측에 데이터가 아니라
               상자가 늘어선다. 폭은 그대로 두어(패딩 유지) 칩 사이 리듬은 지킨다. */
            color: ${theme.colors.text.secondary};
            background: none;
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
