/**
 * Filter Bar Styled Components
 * 사건 카탈로그 상단 필터 바(트리거 그룹 · 계층 토글) + 표시 옵션(정렬) 스타일.
 *
 * ## 이 파일의 두 규약 (검토 배치 5)
 *
 * 1. **형태는 자기 컴포넌트가 말한다.** 예전엔 `FilterGroup`이 `& button, & select { … !important }`로
 *    자손의 배경·보더·radius·높이를 통째로 덮어써서, `FilterTriggerButton`이 선언한 것 중
 *    살아남는 건 `color` 하나뿐이었다. 그 결과 활성 표시도 포커스 링도 "새 `!important`를
 *    달아야만" 보였고, 다음 사람이 또 같은 벽을 만났다(검토 VIS-11).
 *    지금은 그룹이 **사이(divider)와 껍데기(외곽 보더·radius·클리핑)** 만 그리고,
 *    컨트롤은 `$inGroup` variant로 '그룹 안에서의 자기 형태'를 여기서 직접 표현한다.
 *
 * 2. **색은 토큰으로.** 중립 표면 8값은 `CONTROL`, 브랜드 색은 `BRAND` 경유(검토 VIS-1).
 *
 * ⚠️ 죽은 표면 22개 export(세기 버튼 리스트·칩·체크박스·리셋 버튼 등)는 이 배치에서 제거했다.
 * 유일한 소비처였던 `widgets/event-list/ui/filter-panel.tsx`가 참조 0의 고아 위젯이었다(검토 VIS-10).
 */
import styled, { css } from 'styled-components'

import {
  BRAND,
  CONTROL,
  MOTION,
  focusRingInset,
  toolbarControlHeight,
  toolbarControlSquare,
} from './theme'

/* FilterBlock — toolbar 아이템들이 직접 flex로 배치되는 row. */
export const FilterBlock = styled.div`
  display: inline-flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

/**
 * FilterGroup — 연관된 filter 트리거 4개를 한 묶음 border로.
 *
 * 외곽 1px border 1개 + 내부 hairline divider → 한 *그룹* 인상(Linear/Notion 데이터 툴바 패턴).
 *
 * `$overflowing`: 우측 페이드 마스크를 **실제로 넘칠 때만** 건다(검토 VIS-7).
 * 예전엔 ≤768px이면 상시 적용이라, 넘치지 않는 폭에서도 그룹의 우측 모서리와 보더가
 * 항상 흐렸다. 선례(RWD-4, ViewSegmented)는 '마스크 삭제'였지만 여기는 다르다 —
 * 375~400px 폰 대역에서는 트리거 4개가 **실제로 넘치고**, 그때 페이드가 없으면
 * "오른쪽에 더 있다"는 유일한 어포던스가 사라진다. 그래서 삭제가 아니라 조건화다.
 * 측정은 `widgets/event-filters-panel`이 ResizeObserver로 한다(CSS만으로는 판정 불가).
 */
export const FilterGroup = styled.div<{ $overflowing?: boolean }>`
  display: inline-flex;
  align-items: stretch;
  ${toolbarControlHeight}
  border-radius: 8px;
  overflow: hidden;
  transition: border-color ${MOTION.fast};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${CONTROL.bgDark};
          border: 1px solid ${CONTROL.borderDark};
        `
      : css`
          background: ${CONTROL.bgLight};
          border: 1px solid ${CONTROL.borderLight};
        `}

  /* 형제 **사이**의 hairline — '사이'는 컨테이너의 관심사라 여기 남는다.
   * 자손 결합자도 !important도 필요 없다: 직속 자식(PopoverWrap)은 자기 보더가 없다. */
  & > * + * {
    border-left: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? CONTROL.dividerDark : CONTROL.dividerLight};
  }

  &:hover {
    border-color: ${BRAND.primaryBorder};
  }

  /**
   * 포커스는 **개별 컨트롤**이 inset outline으로 말한다(focusRingInset 토큰).
   * 그룹까지 halo를 그리면 "그룹 어딘가"와 "이 컨트롤"이 동시에 켜져 서로 경합하고,
   * 어차피 그 halo는 아래 overflow:hidden에 상·하가 잘려 반쪽만 보였다.
   * 그룹은 테두리 색만 거들어 '이 묶음이 활성'까지만 말한다(검토 VIS-2/A11Y-7).
   */
  &:focus-within {
    border-color: ${BRAND.primaryBorderHover};
  }

  /* 좁은 폭 — 트리거 4개 합폭이 뷰포트를 넘으면 우측이 overflow:hidden으로 잘려
   * 접근 불가하던 문제. 가로 스크롤로 전부 접근 가능하게. */
  @media (max-width: 768px) {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar {
      display: none;
    }
    & > * {
      flex-shrink: 0;
    }
    ${({ $overflowing }) =>
      $overflowing &&
      css`
        mask-image: linear-gradient(
          to right,
          #000 calc(100% - 14px),
          transparent
        );
        -webkit-mask-image: linear-gradient(
          to right,
          #000 calc(100% - 14px),
          transparent
        );
      `}
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * 필터 축 트리거 — 그룹 안(`$inGroup`)과 밖 두 형태를 **자기 파일에서** 표현한다.
 *
 * 활성 표시는 `data-active` 속성을 소비한다(검토 IA-8/INT-7/VIS-3/A11Y-6).
 * 이 속성은 위젯이 예전부터 내보내고 있었는데 레포 전체에 소비하는 CSS가 0개였다 —
 * 즉 활성/비활성 트리거의 유일한 차이가 **라벨 문자열**이었다. 색 단독은 금지라
 * ⑴ 값 굵기(700) ⑵ 좌측 3px 인디케이터 ⑶ 색·배경 **3중 인코딩**으로 낸다.
 */
export const FilterTriggerButton = styled.button<{ $inGroup?: boolean }>`
  /* 활성 좌측 인디케이터(::before)의 기준 */
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    color ${MOTION.fast};

  svg {
    color: ${BRAND.primary};
    flex-shrink: 0;
  }

  ${({ $inGroup, theme }) =>
    $inGroup
      ? css`
          /* 껍데기(보더·radius·배경)는 그룹이 그린다 — 여기서는 비운다.
           * 폭 슬롯 고정(검토 VIS-4): 값이 붙어도 트리거가 요동하지 않게 하한을 준다.
           * 터치 대역은 그룹이 가로 스크롤이라 하한을 걸면 스크롤만 길어져 제외. */
          height: 100%;
          min-width: 112px;
          border: none;
          border-radius: 0;
          background: transparent;
          color: ${theme.mode === 'dark'
            ? CONTROL.textDark
            : CONTROL.textLight};

          @media (max-width: 768px) {
            min-width: 0;
          }

          &:hover {
            background: ${theme.mode === 'dark'
              ? CONTROL.insetHoverDark
              : CONTROL.insetHoverLight};
          }

          /* 바깥 spread 링은 그룹의 overflow:hidden에 잘린다 — 안쪽으로 그린다. */
          &:focus-visible {
            ${focusRingInset}
          }
        `
      : css`
          ${toolbarControlHeight}
          border-radius: 8px;
          background: ${theme.mode === 'dark'
            ? CONTROL.bgDark
            : CONTROL.bgLight};
          border: 1px solid
            ${theme.mode === 'dark' ? CONTROL.borderDark : CONTROL.borderLight};
          color: ${theme.mode === 'dark'
            ? CONTROL.textDark
            : CONTROL.textLight};

          &:hover {
            border-color: ${BRAND.primaryBorder};
            background: ${theme.mode === 'dark'
              ? CONTROL.bgHoverDark
              : CONTROL.bgHoverLight};
          }

          &:focus-visible {
            outline: none;
            border-color: ${BRAND.primaryBorderHover};
            box-shadow: ${BRAND.focusRing};
          }
        `}

  /* ── 활성(필터 적용 중) ─────────────────────────────────────────────
   * variant 블록 뒤에 와야 배경·색이 이긴다(속성 선택자라 특이도도 한 단계 위). */
  &[data-active='true'] {
    color: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primaryTextOnDark : BRAND.primaryHover};
    /* 라이트는 0.12 — 그룹 배경(#f8fafc)이 이미 밝아 0.06 tint는 눈에 안 잡힌다.
     * 활성 칩(rgba(37,99,235,0.12))과 같은 값이라 '활성'의 시각 어휘가 한 벌이 된다. */
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primarySoftDark : BRAND.primarySoftHover};

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: ${BRAND.primary};
    }
  }

  &[data-active='true']:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? BRAND.primaryFillDark : BRAND.primaryFill};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/**
 * 트리거 라벨은 `필드명 · 값` **2요소**다(검토 VIS-4).
 *
 * 예전엔 값이 필드명을 *치환*했다. 그래서 '연합군 점령하 오스트리아' 하나로 트리거가
 * ≈80 → ≈210px가 되고 오른쪽 컨트롤이 전부 밀려 액션 줄이 새 줄로 내려갔다.
 * 동시에 값이 걸린 축은 **축 이름이 화면에서 사라져** 무슨 필터인지도 알 수 없었다.
 * 두 문제 다 '치환'이 원인이라 슬롯을 둘로 나눈다 — 필드명은 상시, 값은 폭 상한.
 */
export const TriggerAxis = styled.span`
  flex-shrink: 0;
`

/** 필드명과 값 사이 구분자 — 장식이라 접근 이름에서는 뺀다(`aria-hidden`) */
export const TriggerSeparator = styled.span`
  flex-shrink: 0;
  opacity: 0.45;
`

export const TriggerValue = styled.span`
  /* 12ch = 한글 6자 남짓. 이보다 길면 말줄임 — 폭은 여기서 끝난다. */
  max-width: 12ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* 활성 3중 인코딩 중 '굵기' — 굵어지는 건 값뿐이라 필드명은 자리를 안 옮긴다. */
  font-weight: 700;
`

/* FilterToggle — 컨테이너 박스 제거. 단순 inline group으로 toolbar의 다른
 * item들과 같은 평면에 배치. (이전엔 box-in-box-in-box 였음) */
export const FilterToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 4px;
  cursor: pointer;
  user-select: none;
`

/* 색은 라이트·다크 동일(#64748b) — 두 배경 모두에서 AA를 통과하는 값이라 분기가 없다.
 * 값을 바꾸는 치환은 이 배치의 범위 밖이므로 토큰화하지 않고 그대로 둔다. */
export const FilterToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  color: #64748b;
`

export const SortSelect = styled.select`
  border-radius: 8px;
  padding: 7px 10px;
  ${toolbarControlHeight}
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  min-width: 100px;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  &:focus {
    outline: none;
    border-color: ${BRAND.primaryBorderHover};
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${CONTROL.bgDark};
          border: 1px solid ${CONTROL.borderDark};
          color: #e2e8f0;
          option {
            background: #1e1e2e;
            color: #e2e8f0;
          }
          &:hover {
            background: ${CONTROL.bgHoverDark};
            border-color: ${BRAND.primaryBorder};
          }
        `
      : css`
          background: ${CONTROL.bgLight};
          border: 1px solid ${CONTROL.borderLight};
          color: ${CONTROL.textLight};
          option {
            background: #ffffff;
            color: #1f2937;
          }
          &:hover {
            background: ${CONTROL.bgHoverLight};
            border-color: ${BRAND.primaryBorder};
          }
        `}
`

/* SortButton — direction 토글 시 같은 아이콘을 transform rotate 180deg로 부드럽게.
 * 호출처는 $direction prop을 전달해 회전 상태를 제어. */
export const SortButton = styled.button<{ $direction?: 'asc' | 'desc' }>`
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  ${toolbarControlSquare}
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast};
  svg {
    color: ${BRAND.primary};
    transition: transform ${MOTION.base};
    transform: rotate(
      ${({ $direction }) => ($direction === 'asc' ? '180deg' : '0deg')}
    );
  }
  &:hover svg {
    color: ${BRAND.primaryHover};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: ${CONTROL.bgDark};
          border: 1px solid ${CONTROL.borderDark};
          color: #64748b;
          &:hover {
            background: ${CONTROL.bgHoverDark};
            border-color: ${BRAND.primaryBorder};
          }
        `
      : css`
          background: ${CONTROL.bgLight};
          border: 1px solid ${CONTROL.borderLight};
          color: #64748b;
          &:hover {
            background: ${CONTROL.bgHoverLight};
            border-color: ${BRAND.primaryBorder};
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    svg {
      transition: none;
    }
  }
`

/* Switch — admin 도구 톤. 30×18 콤팩트, accent border + subtle bg fill.
 * 흰 썸 + 그림자 → 둥근 색 점, 그림자 없음. iOS 토글 인상 제거.
 * focus 표식은 box-shadow halo로 통일 (클리핑 조상이 없어 잘리지 않는다). */
export const Switch = styled.button<{ $active?: boolean }>`
  position: relative;
  width: 30px;
  height: 18px;
  background: ${({ $active, theme }) =>
    $active
      ? BRAND.primarySoftDark
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(15, 23, 42, 0.06)'};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? BRAND.primaryBorderHover
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.12)'};
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  transition: background ${MOTION.base}, border-color ${MOTION.base};

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? BRAND.primaryFillDark
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(15, 23, 42, 0.1)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const SwitchThumb = styled.div<{ $active?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $active }) => ($active ? '14px' : '2px')};
  width: 12px;
  height: 12px;
  background: ${({ $active, theme }) =>
    $active
      ? BRAND.primary
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.55)'
        : 'rgba(15, 23, 42, 0.4)'};
  border-radius: 50%;
  transition: left ${MOTION.base}, background ${MOTION.base};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
