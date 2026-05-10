/**
 * 인물 등록 뷰의 styled 정의 — 컴포넌트 본체에서 분리해 가독성 ↑.
 * 컴포넌트는 person-register-view.tsx에서 import.
 */
import styled, { keyframes } from 'styled-components'

import {
  FieldControl,
  FieldLabel,
  FieldRow,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

// ─── Profile hero (thumbnail + 이름 미리보기 + 메타칩) ──────────────────────
// "데이터 입력"이 아니라 "사람을 만든다"는 인상으로 상단 hero 격상.
// 좌: 원형 썸네일(드롭존) / 우: namePreview + 국가·향년 칩 + 업로드 hint·삭제

export const ThumbnailHero = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 4px 0 6px;
  flex-wrap: wrap;
`

export const ThumbnailCircle = styled.label<{
  $hasImage?: boolean
  $dragOver?: boolean
}>`
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : 'linear-gradient(145deg, #f8fafc 0%, #eef2ff 100%)'};
  border: 1.5px ${({ $hasImage }) => ($hasImage ? 'solid' : 'dashed')}
    ${({ $dragOver, $hasImage, theme }) =>
      $dragOver
        ? theme.colors.primary
        : $hasImage
          ? theme.colors.border.medium
          : theme.mode === 'dark'
            ? 'rgba(255,255,255,0.18)'
            : '#cbd5e1'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(99,102,241,0.14)'
          : 'rgba(99,102,241,0.08)'};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* 빈 상태 placeholder — 옅은 사람 실루엣 */
  > svg.placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    width: 30px;
    height: 30px;
    opacity: 0.55;
  }

  /* hover/drag-over 카메라 오버레이 — 클릭/드롭 액션 신호 */
  > .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.5);
    color: #fff;
    opacity: ${({ $dragOver }) => ($dragOver ? 1 : 0)};
    transition: opacity 0.15s ease;
    border-radius: 50%;
  }

  &:hover > .overlay {
    opacity: 1;
  }
`

export const ThumbnailUploadInput = styled.input`
  display: none;
`

export const ThumbnailHeroBody = styled.div`
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const ThumbnailHeroName = styled.div<{ $empty: boolean }>`
  font-size: ${({ $empty }) => ($empty ? '14px' : '18px')};
  font-weight: ${({ $empty }) => ($empty ? '400' : '600')};
  color: ${({ $empty, theme }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.primary};
  letter-spacing: -0.01em;
  line-height: 1.25;
`

export const ThumbnailHeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

export const HeroMetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border-radius: 999px;
  letter-spacing: -0.005em;
  font-variant-numeric: tabular-nums;
`

export const ThumbnailHeroHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`

export const ThumbnailHeroRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.12s;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// ─── Inline grouping ────────────────────────────────────────────────────────

export const OriginalNameInputWrap = styled.div`
  max-width: 480px;
  width: 100%;
`

/** 상단 정렬 라벨 패턴. 행 구분은 PersonFormLayoutWrap의 border-top 규칙으로. */
export const FieldRowMulti = styled.div`
  display: block;
  padding: 18px 0;
`

/**
 * 인라인 입력 그룹 — `$template` 우선. 미지정 시 `$cols`개 동등 col(이전 동작).
 * 의미적 폭 차등(예: 성<이름<중간이름)이 시각 비대칭을 줄여 한눈 파악 ↑.
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

// ─── Layout wrapper (Top-aligned modern form layout) ────────────────────────
// 상단 정렬 라벨 (Linear/Stripe/Notion 류) — 라벨이 위, 컨트롤이 아래.

export const PersonFormLayoutWrap = styled.div`
  ${FieldRow} {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0;
    border-bottom: none;
    margin-top: 18px;
  }

  ${FieldRowMulti} {
    margin-top: 18px;
  }

  ${ThumbnailHero} {
    margin-top: 0;
  }

  ${FieldRow}:first-child,
  ${FieldRowMulti}:first-child {
    margin-top: 0;
  }

  /* 라벨 — country/historical과 동일 (13px 500, secondary) */
  ${FieldLabel} {
    display: block;
    margin: 0;
    padding-top: 0;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* 컨트롤 — 모달 폭이 줄어 max-width 제거, 100% 활용 */
  ${FieldControl} {
    width: 100%;
  }

  ${InlineFields} {
    max-width: none;
  }

  ${OriginalNameInputWrap} {
    max-width: none;
  }
`

// ─── Section header ─────────────────────────────────────────────────────────

/**
 * 섹션 헤더 — 17px sentence-case + 1줄 설명.
 * scroll-spy용 data-form-section은 wrapper에 둔다.
 */
export const SectionHeader = styled.div`
  margin: 36px 0 12px;
  &:first-child {
    margin-top: 4px;
  }
`

export const SectionHeaderTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  line-height: 1.3;
`

export const SectionHeaderDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
`

// ─── Disclosure card (이름의 뜻·군주 호칭 등 옵셔널 입력 그룹) ────────────────

export const AdvancedSection = styled.section`
  margin-top: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'};
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`

export const AdvancedToggle = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
  }
  &:focus-visible {
    outline: none;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9'};
  }
`

export const AdvancedToggleIcon = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;
  transition: background 0.15s;
  svg {
    transition: transform 0.15s ease;
    transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  }
`

export const AdvancedToggleBody = styled.span`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const AdvancedToggleTitle = styled.span`
  font-size: 13.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.005em;
`

export const AdvancedToggleDesc = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
`

/** 펼친 본문 — 카드 내부 padding + 상단 light divider */
export const AdvancedBody = styled.div`
  padding: 14px 14px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

/** 페이지 모드 전용 sticky 푸터 — 모달 모드는 Shell이 푸터 담당 */
export const StickyFooter = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  margin-top: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

// ─── Draft restore banner ───────────────────────────────────────────────────

const draftBannerSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

/**
 * 카드형 draft 배너 — 좌측 2px line은 너무 약해 사용자가 못 보고 새로 입력할 위험.
 * 옅은 indigo 틴트 카드 + cloud icon으로 "임시 저장된 내용이 있다"는 신호를 강화.
 */
export const DraftBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin: 0 0 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.08)'
      : 'rgba(99, 102, 241, 0.05)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.22)'
        : 'rgba(99, 102, 241, 0.18)'};
  border-radius: 10px;
  font-size: 13px;
  animation: ${draftBannerSlideIn} 0.18s ease;

  & + div[role='alert'] {
    margin-top: 0;
  }
`

export const DraftBannerIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)'};
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`

export const DraftBannerText = styled.span`
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  letter-spacing: -0.005em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  > strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  > span {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-variant-numeric: tabular-nums;
  }
`

export const DraftBannerActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

/** 버리기 — 보조 액션이라 ghost 톤 */
export const DraftDiscardBtn = styled.button`
  padding: 5px 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s;
  &:hover {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.08)' : '#fef2f2'};
  }
`

/** 복원 — primary action. 카드 안에서 가장 시선 가도록 indigo fill. */
export const DraftRestoreBtn = styled.button`
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
  }
`

// ─── Field error ────────────────────────────────────────────────────────────

export const FieldError = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
  margin-top: 6px;
  line-height: 1.4;
  svg {
    flex-shrink: 0;
  }
`

// ─── Loading ────────────────────────────────────────────────────────────────

export const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  backdrop-filter: blur(2px);
  border-radius: 12px;
`

export const LoadingHost = styled.div`
  position: relative;
`

// ─── Undo toast (국가 변경 시 출생/사망지 자동 정리) ──────────────────────────

export const UndoToastBody = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const UndoToastButton = styled.button`
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.4)'
        : 'rgba(99,102,241,0.3)'};
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  &:hover {
    color: #fff;
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

// ─── Top-of-form alert (form-wide error, country stale) ─────────────────────

export const TopAlert = styled.div<{ $tone?: 'error' | 'warn' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 16px;
  padding: 6px 12px;
  border: none;
  border-left: 2px solid
    ${({ $tone, theme }) =>
      $tone === 'warn'
        ? theme.colors.alert.warning.border
        : theme.colors.alert.danger.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: ${({ $tone, theme }) =>
      $tone === 'warn'
        ? theme.colors.alert.warning.fg
        : theme.colors.alert.danger.fg};
  }
`

// ─── Person-not-found panel ─────────────────────────────────────────────────

export const NotFoundPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 64px 24px;
  text-align: center;
`

export const NotFoundIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.alert.warning.bg};
  color: ${({ theme }) => theme.colors.alert.warning.fg};
`

export const NotFoundTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const NotFoundDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
  line-height: 1.5;
`

/** 자동 저장 인디케이터 — sticky footer 좌측 secondary status. */
export const AutoSaveStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
`
