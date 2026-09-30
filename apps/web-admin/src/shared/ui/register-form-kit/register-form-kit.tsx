/**
 * 등록 폼 키트 — **사건 등록 폼(pages/events/create/event-create.styles · event-register-modal)의
 * 컨트롤을 그대로** 떠 온 공용 부품. 국가·역사 국가·인물 등록 모달이 쓴다.
 *
 * 왜 따로 있나: 사건 폼의 부품은 페이지 계층(pages/events) 안에 있어 shared·widgets에서 import할
 * 수 없다. 그래서 같은 등록 모달 셸 안인데도 국가·인물 폼은 제 부품(정사각 썸네일, 라디오 카드,
 * 회색 트레이 세그먼트, 점선 꼬마 추가 버튼, BC|AD+년월일 칸…)을 따로 키웠고, 나란히 열면 딴
 * 제품처럼 보였다. 치수·색은 사건 폼 값과 **같게 유지**한다 — 한쪽을 바꾸면 다른 쪽도 바꿀 것.
 *
 * - 선택 칩(ChoiceChips) = 사건 카테고리 칩(CategoryCard): 36px 알약, 고르면 옅은 면 + 안쪽 링
 * - 추가 버튼(KitAddButton) = AddButton: 34px 흰 바탕 테 버튼 13/600
 * - 고른 항목(KitSelectedItem) = SelectedItem + RemoveButton
 * - 기간(KitDateRange*) = DateRangeRow/Column/Label: 두 칸 + 칸마다 11/700 머리
 * - 날짜 칸 모양(kitDateTriggerCss) = DateInputWrapper
 * - 이미지(KitUpload*) = ThumbnailUploadArea / ThumbnailPreview / UploadButton
 * - 선택 버튼 모양(kitSelectTriggerCss) = FormInput(41px·r8·옅은 회색 면)과 같은 칸
 * - 저장 중 띠(KitBusyBar)·불러오는 중(KitFormLoading) = 사건 모달 BusyBar·EventFormLoading
 */
import React, { useRef } from 'react'

import styled, { css, type DefaultTheme, keyframes } from 'styled-components'

// ─── 색 — 사건 폼 getC(LIGHT_COLORS / DARK_COLORS)와 같은 값 ──────────────────

export const kitC = (theme: DefaultTheme) => {
  const dark = theme.mode === 'dark'
  return {
    content: dark ? '#1a1a1a' : '#ffffff',
    section: dark ? '#212121' : '#fafbfc',
    border: dark ? '#2a2a2a' : '#e2e8f0',
    borderHover: dark ? '#3f3f46' : '#cbd5e1',
    focus: theme.colors.primary,
    focusHalo: dark ? 'rgba(99, 106, 242, 0.20)' : 'rgba(99, 102, 241, 0.12)',
    textPrimary: dark ? '#f5f5f5' : '#1e293b',
    textSecondary: dark ? '#a1a1aa' : '#64748b',
    textMuted: dark ? '#71717a' : '#94a3b8',
  }
}

/** 앱 primary(#6366f1)의 rgb — 선택 칩 면·테 알파 계산용(사건 칩의 --cat-rgb 자리) */
const PRIMARY_RGB = '99, 102, 241'

// ─── 라벨 꼬리표 ────────────────────────────────────────────────────────────

/** 선택(비필수) 라벨 꼬리표 — 사건 등록 폼 OptionalTag '(선택)' */
export const KitOptionalTag = styled.span`
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 선택 칩 ────────────────────────────────────────────────────────────────

export const KitChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

/** 사건 카테고리 칩(CategoryCard)에서 아이콘 원만 뺀 것 — 높이는 아이콘 칩과 같은 36px */
export const KitChoiceChip = styled.button<{ $selected: boolean; $error?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-sizing: border-box;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid
    ${({ $selected, $error, theme }) =>
      $selected
        ? `rgba(${PRIMARY_RGB}, 0.6)`
        : $error
          ? theme.colors.alert.danger.fg
          : kitC(theme).border};
  border-radius: 999px;
  background: ${({ $selected, theme }) =>
    $selected
      ? `rgba(${PRIMARY_RGB}, ${theme.mode === 'dark' ? 0.2 : 0.09})`
      : kitC(theme).content};
  /* 선택은 색만으로 말하지 않는다 — 테를 한 겹 더 두껍게(안쪽 링) */
  box-shadow: ${({ $selected }) =>
    $selected ? `inset 0 0 0 1px rgba(${PRIMARY_RGB}, 0.6)` : 'none'};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textSecondary};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $selected }) =>
      $selected ? `rgba(${PRIMARY_RGB}, 0.75)` : `rgba(${PRIMARY_RGB}, 0.45)`};
    background: ${({ $selected, theme }) =>
      $selected
        ? `rgba(${PRIMARY_RGB}, ${theme.mode === 'dark' ? 0.26 : 0.13})`
        : `rgba(${PRIMARY_RGB}, ${theme.mode === 'dark' ? 0.1 : 0.04})`};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => kitC(theme).focus};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/** 칩 묶음 머리 — 사건 폼 기간 행의 '시작일·종료일'(DateRangeLabel)과 같은 11/700 */
export const KitGroupLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
`

const ChipGroupStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const ChipGroupBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export interface ChoiceChipOption<Value extends string = string> {
  value: Value
  label: React.ReactNode
  /** 마우스 오버 설명(사건 칩엔 없던 부가 설명 — 예: 국가 형태 풀이) */
  title?: string
  disabled?: boolean
}

export interface ChoiceChipGroupDef<Value extends string = string> {
  label: string
  options: ChoiceChipOption<Value>[]
}

interface ChoiceChipsProps<Value extends string = string> {
  value: Value | '' | null | undefined
  onChange: (value: Value | '') => void
  /** 평평한 목록 — groups와 둘 중 하나 */
  options?: ChoiceChipOption<Value>[]
  /** 묶음 목록 — 묶음마다 11/700 머리 + 칩 한 줄 흐름 */
  groups?: ChoiceChipGroupDef<Value>[]
  /** 고른 칩을 다시 누르면 해제('') — 사건 카테고리 칩과 같은 동작 */
  allowDeselect?: boolean
  ariaLabel: string
  ariaDescribedBy?: string
  error?: boolean
  /** 필수 진척 점프 대상(data-jump-target) */
  jumpTarget?: string
}

/**
 * 한 개 고르기 칩 — 라디오그룹 의미(방향키 이동, 선택 항목만 탭 정지).
 * 화살표는 **포커스만** 옮긴다(사건 칩처럼 누르기 전엔 값이 안 바뀌게) — Space/Enter가 선택.
 */
export function ChoiceChips<Value extends string = string>({
  value,
  onChange,
  options,
  groups,
  allowDeselect = false,
  ariaLabel,
  ariaDescribedBy,
  error,
  jumpTarget,
}: ChoiceChipsProps<Value>) {
  const flat: ChoiceChipOption<Value>[] =
    options ?? (groups ?? []).flatMap((group) => group.options)
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = flat.findIndex((option) => option.value === value)
  const firstEnabled = flat.findIndex((option) => !option.disabled)
  const tabStop = selectedIndex >= 0 ? selectedIndex : firstEnabled

  const focusAt = (from: number, direction: 1 | -1) => {
    const count = flat.length
    let next = from
    for (let step = 0; step < count; step += 1) {
      next = (next + direction + count) % count
      if (!flat[next].disabled) {
        buttonsRef.current[next]?.focus()
        return
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = buttonsRef.current.findIndex(
      (button) => button === document.activeElement,
    )
    if (current < 0) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      focusAt(current, 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusAt(current, -1)
    }
  }

  let runningIndex = 0
  const renderChip = (option: ChoiceChipOption<Value>) => {
    const index = runningIndex
    runningIndex += 1
    const selected = option.value === value
    return (
      <KitChoiceChip
        key={option.value}
        ref={(element) => {
          buttonsRef.current[index] = element
        }}
        type="button"
        role="radio"
        aria-checked={selected}
        tabIndex={index === tabStop ? 0 : -1}
        title={option.title}
        disabled={option.disabled}
        $selected={selected}
        $error={error && !value}
        onClick={() =>
          onChange(selected && allowDeselect ? '' : option.value)
        }
      >
        {option.label}
      </KitChoiceChip>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={error || undefined}
      data-jump-target={jumpTarget}
      data-field-error={error ? 'true' : undefined}
      tabIndex={jumpTarget ? -1 : undefined}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}
    >
      {groups ? (
        <ChipGroupStack>
          {groups.map((group) => (
            <ChipGroupBlock key={group.label}>
              <KitGroupLabel>{group.label}</KitGroupLabel>
              <KitChipGroup>{group.options.map(renderChip)}</KitChipGroup>
            </ChipGroupBlock>
          ))}
        </ChipGroupStack>
      ) : (
        <KitChipGroup>{flat.map(renderChip)}</KitChipGroup>
      )}
    </div>
  )
}

// ─── 추가 버튼 · 고른 항목 ──────────────────────────────────────────────────

/** 사건 폼 AddButton — '+ 상위 사건 선택', '+ 국가 추가' */
export const KitAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${({ theme }) => kitC(theme).content};
  color: ${({ theme }) => kitC(theme).textSecondary};
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => kitC(theme).section};
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => kitC(theme).focus};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** 사건 폼 SelectedItemsContainer — 고른 항목 칩 + 추가 버튼이 한 줄로 흐른다 */
export const KitSelectedItems = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

/** 사건 폼 SelectedItem */
export const KitSelectedItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(167, 139, 250, 0.14)' : 'rgba(99, 102, 241, 0.08)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(167, 139, 250, 0.30)' : 'rgba(99, 102, 241, 0.2)'};
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => kitC(theme).textPrimary};
`

/** 사건 폼 RemoveButton */
export const KitRemoveButton = styled.button`
  border: none;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px;
  border-radius: 6px;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
  }
`

// ─── 기간 · 날짜 칸 ─────────────────────────────────────────────────────────

/** 사건 폼 DateRangeRow — 시작 | 종료 두 칸 */
export const KitDateRangeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

/** 사건 폼 DateRangeColumn */
export const KitDateRangeColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

/** 사건 폼 DateRangeLabel — '시작일·종료일' */
export const KitDateRangeLabel = KitGroupLabel

/** 사건 폼 DateInputWrapper — 흰 바탕 한 칸 + 달력 아이콘, 열려 있거나 포커스면 링 */
export const kitDateTriggerCss = css<{ $error?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  /* 사건 날짜 칸 실측 36px(padding 9 + 14px 글 한 줄) */
  min-height: 36px;
  border: 1px solid
    ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : kitC(theme).border};
  border-radius: 8px;
  background: ${({ theme }) => kitC(theme).content};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : kitC(theme).borderHover};
  }
  &:focus-within,
  &[data-open] {
    border-color: ${({ $error, theme }) =>
      $error ? theme.colors.alert.danger.fg : kitC(theme).focus};
    box-shadow: 0 0 0 3px ${({ theme }) => kitC(theme).focusHalo};
  }
`

// ─── 선택 버튼(모달·드롭다운을 여는 칸) ──────────────────────────────────────

/**
 * 모달·목록을 여는 선택 칸 — 텍스트 입력(FormInput)과 **같은 칸**(41px·r8·옅은 회색 면).
 * 예전 38~39px·r6이라 입력칸과 나란히 두면 한 폼 안에서 칸 높이·모서리가 들쭉날쭉했다.
 */
export const kitSelectTriggerCss = css`
  box-sizing: border-box;
  min-height: 41px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
`

// ─── 이미지 업로드 ──────────────────────────────────────────────────────────

/** 사건 폼 ThumbnailUploadArea — 점선 칸 가운데 아이콘·안내·'이미지 업로드' */
export const KitUploadArea = styled.div<{ $dragOver?: boolean }>`
  box-sizing: border-box;
  border: 1px dashed
    ${({ $dragOver, theme }) =>
      $dragOver ? kitC(theme).focus : kitC(theme).borderHover};
  border-radius: 10px;
  padding: 24px;
  background: ${({ $dragOver, theme }) =>
    $dragOver ? kitC(theme).section : kitC(theme).content};
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: ${({ theme }) => kitC(theme).textMuted};
  width: 100%;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    background: ${({ theme }) => kitC(theme).section};
  }

  > svg {
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: ${({ theme }) => kitC(theme).textMuted};
  }
`

/** 사건 폼 ThumbnailPreview — 고른 이미지를 점선 칸 가운데, 누르면 바꾸기 */
export const KitUploadPreview = styled.div`
  box-sizing: border-box;
  border: 1px dashed ${({ theme }) => kitC(theme).borderHover};
  border-radius: 10px;
  padding: 20px;
  background: ${({ theme }) => kitC(theme).content};
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    background: ${({ theme }) => kitC(theme).section};
  }

  img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

/** 사건 폼 ThumbnailDeleteButton */
export const KitUploadDeleteButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`

/** 사건 폼 UploadButton */
export const KitUploadButton = styled.button`
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textSecondary};
  background: ${({ theme }) => kitC(theme).content};
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => kitC(theme).section};
    border-color: ${({ theme }) => kitC(theme).borderHover};
  }
`

// ─── 저장 중 · 불러오는 중 ──────────────────────────────────────────────────

/** 사건 등록 모달 BusyBar — 저장 요청 중 본문 맨 위 한 줄 */
export const KitBusyBar = styled.div`
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const loadingAppear = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const loadingSpin = keyframes`
  to { transform: rotate(360deg); }
`

const LoadingRoot = styled.div`
  flex: 1;
  /* 모달 본문(약 560px)의 세로 가운데에 오도록 — 스크롤 영역이 자식을 늘여 주지 않는다 */
  min-height: min(520px, 62vh);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  opacity: 0;
  animation: ${loadingAppear} 0.2s ease 0.15s forwards;
`

const LoadingSpinner = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'};
  border-top-color: ${({ theme }) => theme.colors.primary};
  animation: ${loadingSpin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }
`

const LoadingLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/**
 * 폼 불러오는 중 — 모달 본문 가운데 도는 링 + 한 줄 상태(사건 등록 모달 EventFormLoading과 동일).
 * 빠른 로드에서 번쩍이지 않게 150ms 뒤에 나타난다.
 */
export const KitFormLoading: React.FC<{ label?: string }> = ({
  label = '폼을 불러오는 중',
}) => (
  <LoadingRoot role="status" aria-live="polite">
    <LoadingSpinner aria-hidden="true" />
    <LoadingLabel>{label}</LoadingLabel>
  </LoadingRoot>
)
