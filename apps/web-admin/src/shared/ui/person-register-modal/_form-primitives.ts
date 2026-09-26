/**
 * 인물 등록 모달 공용 디자인 토큰 + primitive 정의.
 *
 * 배경: 같은 InlineFields/FieldError/SelectBtn/Advanced* disclosure 카드가
 * person-register-view.styles.ts·life-section·affiliation-section 에 각각
 * 미묘하게 다른 값(예: FieldError font-weight 400 vs 500, radius 6/8/10 혼재)으로
 * 중복 정의돼 모달이 "중구난방"으로 보였다. 여기서 단일 정의로 모으고,
 * radius·font를 토큰으로 고정해 위계를 통일한다.
 *
 * 사용처는 모두 이 파일에서 import — 값 변경은 한 곳에서만.
 */
import styled, { css } from 'styled-components'

import type { DefaultTheme } from 'styled-components'

// ─── 디자인 토큰 (이 모달 전용 canon) ────────────────────────────────────────

/** 반경 — 컨트롤 8 / 카드 12 / pill 999 / 원형 50% 4단계로만. (이전: 6·8·9·10·12 혼재) */
export const RADIUS = {
  control: '8px', // input·button·chip·select·date 버튼
  card: '12px', // 카드·섹션·배너·disclosure·멤버 카드
  pill: '999px', // meta chip·둥근 액션
  round: '50%', // 아바타·badge
} as const

/** 타이포 — 반픽셀(11.5·12.5·13.5)·16·17 제거하고 5단계로만. */
export const FONT = {
  eyebrow: '11px', // 대문자 그룹 라벨
  meta: '12px', // hint·desc·meta·error·보조 버튼
  label: '13px', // 필드 라벨·chip·세그먼트
  body: '14px', // 인풋 값·본문
  hero: '18px', // hero 이름
} as const

/**
 * 토글/세그먼트/칩 단일 규약 — 모달 내 모든 "한 줄 선택" 컨트롤(성별·표시순서·
 * 생존/사망/미상·출생일 미상·사망유형)이 같은 시각 언어를 쓰도록 한 곳에 모음.
 * 이전엔 컨트롤마다 active가 indigo 보더 / indigo 솔리드 채움+흰글자 / 흰 트레이+
 * 그림자로 제각각이라 "조잡"했다 → active = 연한 indigo 채움(activeLight) + indigo
 * 텍스트/보더 한 가지로 통일, radius·font·focus는 토큰으로 고정.
 */
export function segmentToggleMixin(
  theme: DefaultTheme,
  active?: boolean,
  error?: boolean,
) {
  return css`
    padding: 7px 12px;
    font-size: ${FONT.label};
    font-weight: ${active ? 600 : 500};
    line-height: 1.2;
    border-radius: ${RADIUS.control};
    cursor: pointer;
    white-space: nowrap;
    outline: none;
    transition:
      background 0.12s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      box-shadow 0.12s ease;
    color: ${active ? theme.colors.active : theme.colors.text.secondary};
    background: ${active
      ? theme.colors.activeLight
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#f9fafb'};
    border: 1px solid
      ${error
        ? theme.colors.alert.danger.fg
        : active
          ? theme.colors.primary
          : theme.colors.border.default};

    &:hover:not(:disabled) {
      border-color: ${error
        ? theme.colors.alert.danger.fg
        : active
          ? theme.colors.primary
          : theme.colors.border.medium};
      color: ${theme.colors.text.primary};
    }
    &:focus-visible {
      border-color: ${theme.colors.primary};
      box-shadow: ${theme.colors.focusRing.primary};
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
}

/**
 * **이어 붙은 세그먼트**(배타 선택: 성별·표시 순서·AD|BC·생존|사망|일자 미상) — 테 하나 안에 항목이 놓인다.
 * 예전엔 항목마다 제 테를 둘러 한 화면에 테 두른 버튼이 스무 개 가까이 흩어졌다(어수선함의 주범).
 * 선택 표현은 segmentToggleMixin과 같은 언어(activeLight 면 + active 글자 + 600) — 테만 그룹이 가진다.
 * 독립 칩(사망 유형 13종처럼 여러 개 중 고르는 목록)은 계속 segmentToggleMixin.
 */
export function segmentGroupMixin(theme: DefaultTheme, error?: boolean) {
  return css`
    display: inline-flex;
    align-items: stretch;
    gap: 2px;
    padding: 2px;
    border: 1px solid
      ${error ? theme.colors.alert.danger.fg : theme.colors.border.default};
    border-radius: ${RADIUS.control};
    background: ${theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  `
}

export function segmentItemMixin(theme: DefaultTheme, active?: boolean) {
  return css`
    padding: 5px 12px;
    font-size: ${FONT.label};
    font-weight: ${active ? 600 : 500};
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    outline: none;
    border: none;
    border-radius: 6px;
    color: ${active ? theme.colors.active : theme.colors.text.secondary};
    background: ${active ? theme.colors.activeLight : 'transparent'};
    transition:
      background 0.12s ease,
      color 0.12s ease,
      box-shadow 0.12s ease;

    &:hover:not(:disabled) {
      color: ${active ? theme.colors.active : theme.colors.text.primary};
    }
    &:focus-visible {
      box-shadow: ${theme.colors.focusRing.primary};
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
}

/**
 * 켜고 끄는 단일 플래그(출생일 미상·추정) — 네이티브 체크박스 + 글. 테 두른 토글 버튼으로 두면
 * 배타 선택(세그먼트)과 모양이 같아 '셋 중 하나를 고르는 것'처럼 읽혔고 테만 늘렸다.
 * 가족의 '사생아·서출'과 같은 모양.
 */
export const CheckLabel = styled.label<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${FONT.label};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  user-select: none;

  input {
    width: 15px;
    height: 15px;
    margin: 0;
    cursor: inherit;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`

/**
 * iOS 줌 방지 — 폰트 <16px 입력에 포커스하면 사파리가 페이지를 확대하고 원복하지 않는다.
 * bespoke `<input>`/`<select>`(공용 FormInput 미사용 필드)가 제각각 이 가드를 빠뜨려
 * 모바일에서 필드 탭마다 화면이 튀었다 → 단일 정의로 모아 일괄 적용.
 */
export const mobileInputFontMixin = css`
  @media (max-width: 768px) {
    font-size: 16px;
  }
`

/**
 * 입력 포커스 링 — 공용 FormInput과 동일하게 `:focus`(비-visible)에서 primary 보더 + focusRing.
 * bespoke input/select가 border-color만 바꾸고 box-shadow 링을 빠뜨려 "절반만 링이 뜨는"
 * 키보드 포커스 비일관을 낳았다 → 이 믹스인으로 통일(링 색은 focusRing 토큰 경유, 하드코딩 금지).
 */
export function inputFocusMixin(theme: DefaultTheme) {
  return css`
    &:focus {
      outline: none;
      border-color: ${theme.colors.primary};
      box-shadow: ${theme.colors.focusRing.primary};
    }
  `
}

// ─── Inline 입력 그룹 ─────────────────────────────────────────────────────────

/**
 * 인라인 입력 그룹 — `$template` 우선, 미지정 시 `$cols`개 동등 col.
 * 의미적 폭 차등(예: 성<이름<중간이름)으로 시각 비대칭을 줄여 한눈 파악 ↑.
 */
export const InlineFields = styled.div<{ $cols?: number; $template?: string }>`
  display: grid;
  grid-template-columns: ${(p) =>
    p.$template ?? `repeat(${p.$cols ?? 3}, 1fr)`};
  gap: 10px;
  width: 100%;

  & > div {
    min-width: 0;
  }
  input,
  select,
  button {
    max-width: 100%;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

// ─── 필드 에러 ────────────────────────────────────────────────────────────────

export const FieldError = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: ${FONT.meta};
  font-weight: 500;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.alert.danger.fg};

  svg {
    flex-shrink: 0;
  }
`

// ─── 값 선택 버튼 (국가·가문·종교 등 모달 트리거) ──────────────────────────────
// FormInput과 동일 톤 — r8·채움 배경·hover시 흰 배경·focus시 primary ring.

export const SelectBtn = styled.button<{
  $hasValue?: boolean
  $error?: boolean
}>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  font-size: ${FONT.body};
  color: ${({ $hasValue, theme }) =>
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.default};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  text-align: left;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : theme.colors.border.medium};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  }
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff'};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

// ─── Disclosure 카드 (이름의 뜻·군주 호칭 등 옵셔널 입력 그룹) ─────────────────

/**
 * 2차 disclosure(이름의 뜻·군주 호칭) — 카드 보더/배경을 없앤 경량 텍스트 토글.
 * '더 입력' 카드 안에서 또 카드가 겹치던 '카드-인-카드' 조잡함을 1겹으로 낮춤.
 */
export const AdvancedSection = styled.section`
  margin-top: 8px;
`

export const AdvancedToggle = styled.button<{ $open: boolean }>`
  /* 글 한 줄 폭만 — 행 전체가 버튼이면 빈 오른쪽을 눌러도 열렸다 */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: ${RADIUS.control};
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

export const AdvancedToggleIcon = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 회색 네모 상자 없이 꺾쇠만 — 상자는 입력칸처럼 보여 '눌러야 할 것'이 하나 더 늘었다 */
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
  svg {
    transition: transform 0.15s ease;
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }
`

/** 제목 · 설명을 한 줄에(설명은 옅게) — 두 줄 제목+설명 블록이 필드 라벨처럼 무겁게 읽혔다. */
export const AdvancedToggleBody = styled.span`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 8px;
  min-width: 0;
`

export const AdvancedToggleTitle = styled.span`
  font-size: ${FONT.label};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: -0.005em;
`

export const AdvancedToggleDesc = styled.span`
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`

/** 펼친 본문 — 카드 제거에 맞춰 보더 없이 약간의 상하 여백만 */
export const AdvancedBody = styled.div`
  padding: 10px 0 4px;
`

// ─── 반복행 추가 버튼 (국가 소속·배우자 등 "행 추가" 어포던스 공용) ─────────────
/**
 * 반복행 추가 버튼 — 국가 소속·배우자 슬롯이 제각각(솔리드 indigo vs dashed primary)이라
 * 여기서 하나로 통일. ghost 톤(투명 + dashed border.default + pill)으로 필수 CTA(SubmitBtn)와
 * 위계 경쟁을 낮춰, 상시 노출되는 반복행 어포던스를 가볍게 한다.
 * 아이콘(FiPlus)+라벨은 사용처에서 children으로 넣는다.
 */
export const AddRowBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 테 없는 글 버튼 — 점선 알약 3개(별칭·소속·배우자)가 빈 폼에서 가장 시끄러운 테였다 */
  padding: 4px 6px;
  margin-left: -6px;
  font-size: ${FONT.label};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.active};
  background: transparent;
  border: none;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`
