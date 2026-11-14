/**
 * 사이드 패널(SidePanel) 내부에서 사건 등록 모달(`EventRegisterModal` + `event-create.styles.ts`)의
 * 플랫 폼 디자인을 그대로 구현하기 위한 공용 스타일 키트.
 *
 * 핵심 규칙:
 * - 우측 슬라이드 드로어(`SidePanel`)는 그대로 유지한다.
 * - 중첩 회색 카드 박스를 없애고, 좌측 라벨(136px) · 우측 컨트롤의 1px 헤어라인 행(`FlatFormRow`)으로 통일한다.
 * - 입력창·날짜·드롭다운 높이는 38px, radius 8px, 포커스 링 0 0 0 3px로 맞춘다.
 * - 헤더 우측에는 컨텍스트 배지 + 알약형 섹션 점프 내비게이션(`SectionJumpNav`)을 둔다.
 * - 하단 고정 푸터에는 필수 누락 항목 점프 버튼 / 등록 준비 완료 배지 + ⌘↵ 단축키 힌트를 표시한다.
 */
import styled from 'styled-components'

const BRAND_BLUE = '#2563eb'
const BRAND_BLUE_HOVER = '#1d4ed8'

export const PanelHeaderActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const PanelHeaderContextBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.045)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 720px) {
    display: none;
  }
`

export const SectionJumpNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(15, 23, 42, 0.04)'};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  @media (max-width: 640px) {
    display: none;
  }
`

export const SectionJumpBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 999px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : '#ffffff'
      : 'transparent'};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '0 1px 2px rgba(0, 0, 0, 0.35)'
        : '0 1px 2px rgba(15, 23, 42, 0.08)'
      : 'none'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
  letter-spacing: -0.01em;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.12)'
          : '#ffffff'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(255, 255, 255, 0.72)'};
  }
`

export const SectionJumpBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#93c5fd' : BRAND_BLUE};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(96, 165, 250, 0.16)'
      : 'rgba(37, 99, 235, 0.1)'};
`

export const SectionJumpDone = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#34d399' : '#059669')};
`

/** 모바일 전용 상단 섹션 점프 스트립 */
export const MobileSectionStrip = styled.div`
  display: none;
  @media (max-width: 640px) {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 10px;
    margin-bottom: 4px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

export const FlatFormStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const FlatFormSection = styled.section`
  display: flex;
  flex-direction: column;
  scroll-margin-top: 12px;
`

export const FlatSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 0 8px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.1)'};
`

export const FlatSectionTitle = styled.h3`
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const FlatSectionHint = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 사건 생성 폼 FormRow 동일 규격 — 136px 라벨 + 우측 컨트롤, 1px 헤어라인 구분 */
export const FlatFormRow = styled.div`
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr);
  column-gap: 20px;
  align-items: start;
  padding: 13px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    row-gap: 6px;
    padding: 11px 0;
  }
`

export const FlatFormLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#a1a1aa' : '#64748b'};
  padding-top: 9px;
  margin: 0;

  @media (max-width: 640px) {
    padding-top: 0;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const FlatRequired = styled.span`
  color: #ef4444;
  font-weight: 600;
  margin-left: 2px;
`

export const FlatFieldControl = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
`

export const FlatTwoColGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

export const FlatNameAbbrGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

/** 38px / 8px radius — EventBasicForm 입력창과 1:1 치수 */
export const FlatInput = styled.input`
  width: 100%;
  height: 38px;
  padding: 0 12px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  transition:
    border-color 0.14s ease,
    box-shadow 0.14s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1'};
  }

  &:focus {
    border-color: ${BRAND_BLUE};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.2)'
          : 'rgba(37, 99, 235, 0.12)'};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const FlatSelect = styled.select`
  height: 38px;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    box-shadow 0.14s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1'};
  }

  &:focus {
    border-color: ${BRAND_BLUE};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.2)'
          : 'rgba(37, 99, 235, 0.12)'};
  }
`

export const FlatTextarea = styled.textarea`
  width: 100%;
  padding: 9px 12px;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.55;
  resize: vertical;
  min-height: 76px;
  outline: none;
  transition:
    border-color 0.14s ease,
    box-shadow 0.14s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1'};
  }

  &:focus {
    border-color: ${BRAND_BLUE};
    box-shadow: 0 0 0 3px
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(59, 130, 246, 0.2)'
          : 'rgba(37, 99, 235, 0.12)'};
  }
`

export const FlatHint = styled.span`
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/** 사건 생성 폼 CategoryGrid + CategoryCard(알약 칩) 그대로 계승 */
export const PillChoiceRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const PillChoiceChip = styled.button<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 13px 0 9px;
  border-radius: 999px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected
        ? BRAND_BLUE
        : theme.mode === 'dark'
          ? '#2a2a2a'
          : '#e2e8f0'};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.08)'
      : theme.mode === 'dark'
        ? '#1a1a1a'
        : '#ffffff'};
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : BRAND_BLUE_HOVER
      : theme.colors.text.primary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: ${({ $selected }) => ($selected ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;

  &:hover {
    border-color: ${({ $selected, theme }) =>
      $selected
        ? BRAND_BLUE
        : theme.mode === 'dark'
          ? '#3f3f46'
          : '#cbd5e1'};
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(37, 99, 235, 0.22)'
          : 'rgba(37, 99, 235, 0.1)'
        : theme.mode === 'dark'
          ? '#242424'
          : '#f8fafc'};
  }
`

export const PillChoiceIcon = styled.span<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-size: 12px;
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(96, 165, 250, 0.2)'
        : 'rgba(37, 99, 235, 0.12)'
      : theme.mode === 'dark'
        ? '#262626'
        : '#f1f5f9'};
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : BRAND_BLUE
      : theme.colors.text.secondary};
`

/** 작은 보조 프리셋/시대 알약 */
export const QuickPresetChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? BRAND_BLUE
        : theme.mode === 'dark'
          ? '#2a2a2a'
          : '#e2e8f0'};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(37, 99, 235, 0.18)'
        : 'rgba(37, 99, 235, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.03)'
        : '#f8fafc'};
  color: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? '#93c5fd'
        : BRAND_BLUE_HOVER
      : theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${BRAND_BLUE};
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : BRAND_BLUE_HOVER};
  }
`

/** 문장·휘장 인라인 업로드 스트립 (EventBasicForm KitUploadStrip 톤) */
export const CompactUploadStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? '#333333' : '#cbd5e1'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafbfc'};
`

export const CompactUploadThumb = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.tertiary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/** 구조화 연/월/일 인라인 행 */
export const InlineDateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

export const InlineIconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 38px;
  min-width: 38px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${({ $danger, theme }) =>
    $danger ? '#ef4444' : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: ${({ $danger, theme }) =>
      $danger
        ? '#ef4444'
        : theme.mode === 'dark'
          ? '#3f3f46'
          : '#cbd5e1'};
    color: ${({ $danger, theme }) =>
      $danger ? '#dc2626' : theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/** 연결된 전신·후신·지휘관 등 플랫 행 아이템 (SelectedItem 계승) */
export const LinkedRecordRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fafbfc'};
`

export const OutlineAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  align-self: flex-start;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? '#242424' : '#f8fafc'};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/* ─── EventRegisterModal 과 동일한 하단 고정 검증·단축키 푸터 ─── */

export const EventStyleFooterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
`

export const FooterHintArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 640px) {
    display: none;
  }
`

export const FooterJumpBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.28)'
        : 'rgba(217, 119, 6, 0.24)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(251, 191, 36, 0.08)'
      : 'rgba(254, 243, 199, 0.65)'};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#fcd34d' : '#b45309'};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.15)'
        : 'rgba(254, 243, 199, 0.95)'};
  }
`

export const FooterReadyGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

export const FooterReadyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#34d399' : '#059669')};
`

export const FooterReadyDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
`

export const FooterShortcutText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const FooterKbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.4;
`

export const FooterActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

export const FooterCancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 15px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const FooterSubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: ${BRAND_BLUE};
  color: #ffffff;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.14s ease, opacity 0.14s ease;

  &:hover:not(:disabled) {
    background: ${BRAND_BLUE_HOVER};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`
