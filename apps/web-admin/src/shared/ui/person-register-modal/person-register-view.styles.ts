/**
 * 인물 등록 뷰의 styled 정의 — 컴포넌트 본체에서 분리해 가독성 ↑.
 * 컴포넌트는 person-register-view.tsx에서 import.
 */
import styled, { keyframes } from 'styled-components'

import {
  FieldControl,
  FieldHint,
  FieldLabel,
  FieldRow,
  FormSectionInner,
  Required,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

import {
  AdvancedBody,
  AdvancedSection,
  FONT,
  InlineFields,
  RADIUS,
} from './_form-primitives'

// 중복 제거 — disclosure 카드·InlineFields·FieldError는 단일 정의(_form-primitives)에서
// re-export. person-register-view.tsx의 기존 import 경로를 유지하기 위함.
export {
  AdvancedBody,
  AdvancedSection,
  AdvancedToggle,
  AdvancedToggleBody,
  AdvancedToggleDesc,
  AdvancedToggleIcon,
  AdvancedToggleTitle,
  FieldError,
  InlineFields,
} from './_form-primitives'

// ─── 프로필 사진 ────────────────────────────────────────────────────────────
// 모양은 사건 등록 폼 썸네일 칸(register-form-kit KitUpload*)을 그대로 쓴다. 여기엔 파일 입력만.

/**
 * 시각적으로 숨기되 포커스 가능(sr-only) — display:none이면 Tab 순서에서 빠져 키보드로
 * 사진을 못 올린다. '이미지 업로드' 버튼·칸 클릭이 이 입력을 연다.
 */
export const ThumbnailUploadInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

// ─── Inline grouping ────────────────────────────────────────────────────────

export const OriginalNameInputWrap = styled.div`
  max-width: 480px;
  width: 100%;
`


/**
 * 짧은 코어 컨트롤(성별·국적)을 가로 2열로 묶어 세로 길이를 줄인다.
 * FieldRow가 아니라 자체 margin-top을 가지며, 좁은 화면(<640px)에선 1열로 떨어진다.
 * 폭 상한은 두지 않는다 — 폼 전체가 한 측정폭(PersonFormLayoutWrap)을 공유한다.
 */
export const CoreFieldPair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
  align-items: start;
  /* 이름 묶음과 같은 '기본 정보' 안의 하위 묶음 — 구분선·머리글 없이 간격만 */
  margin-top: 24px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 18px;
  }
`

/** CoreFieldPair 안의 라벨+컨트롤 셀 — FieldRow 한 칸과 동일한 세로 스택. */
export const CoreFieldCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

/**
 * 코어 블록 구분선 — 이름 / 신원 / 생몰을 옅은 hairline으로 끊어 "서류 항목" 리듬.
 * 섹션 헤더 없이 divider만으로 그룹 경계를 만들어 과하지 않게.
 */
export const CoreDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.light};
  margin: 28px 0 24px;
`

/**
 * 블록 머리글(이름/신원/생몰/생애 상세/소속/가족) — 폼의 유일한 섹션 마커.
 * 예전엔 11px 대문자 eyebrow(tertiary)였는데, 한글엔 대문자·자간이 먹지 않아 작은 회색 글자만
 * 남았고(대비 2.5:1) 필드 라벨(13px)보다 **약해** 섹션 경계가 읽히지 않았다.
 * 이제 필드 라벨(13/500 secondary)보다 한 단 위(15/700 primary)로 둔다 — 마커 종류는 여전히 하나.
 */
export const CoreSectionLabel = styled.h3`
  /* UA margin-top을 0으로 눌러 CoreDivider 리듬을 보호. */
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 성·이름·중간이름·국적·성별 등 인라인 서브 셀 — 칸마다 자기 라벨을 위에 둔다. */
export const NameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

/** 표시 순서 우측에 조합된 전체 성명을 실시간으로 보여주는 배지 */
export const NamePreviewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 4px 10px;
  border-radius: ${RADIUS.pill};
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6'};

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 접힌 상세 토글 안에 이미 입력된 값이 있을 때 표시하는 보조 배지 */
export const AdvancedToggleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: ${RADIUS.pill};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
`

// ─── Layout wrapper — 사건 등록 폼과 같은 옆 라벨 행 ─────────────────────────
// 라벨 열 200px(14/600 primary) | 간격 24 | 필드 열(상한 680px).
// 격자 규칙 — 라벨(또는 라벨을 품은 머리 줄)은 1열 1행에 못박고, 나머지 자식은 전부 2열.

const SIDE_LABEL_COLUMN = '200px'
const FIELD_MAX_WIDTH = '680px'

export const PersonFormLayoutWrap = styled.div`
  /* 모달 셸의 스크롤 여백(28px)과 겹쳐 머리글 아래 56px 빈 띠가 생기던 것 — 셸 여백만 남긴다. */
  ${FormSectionInner} {
    padding-top: 0;
  }

  /* 필수 표식 — 사건 등록 폼과 같은 붉은 '*' (5px 점은 기준선 아래로 떨어져 오탈자처럼 보였다) */
  ${Required} {
    display: inline;
    width: auto;
    height: auto;
    margin-left: 4px;
    border-radius: 0;
    background: none;
    overflow: visible;
    font-size: 14px;
    font-weight: 400;
    vertical-align: baseline;
    color: #ef4444;
  }

  /* ── 행 ── */
  ${FieldRow},
  ${CoreFieldCell} {
    display: grid;
    grid-template-columns: ${SIDE_LABEL_COLUMN} minmax(0, 1fr);
    gap: 8px 24px;
    align-items: start;
    margin: 0;
    /* 행 사이 hairline 없음 — 선은 장(章) 경계(CoreDivider)에만. */
    padding: 10px 0;
    border-bottom: none;
  }
  ${FieldRow} > *,
  ${CoreFieldCell} > * {
    grid-column: 2;
    min-width: 0;
    max-width: ${FIELD_MAX_WIDTH};
  }
  /* 라벨 — 맨 라벨이든, 라벨+보조버튼을 묶은 머리 줄(사망지 '출생지와 동일')이든 1열 */
  ${FieldRow} > ${FieldLabel},
  ${CoreFieldCell} > ${FieldLabel},
  ${FieldRow} > :has(> ${FieldLabel}) {
    grid-column: 1;
    grid-row: 1;
    align-self: start;
  }
  ${FieldRow} > :has(> ${FieldLabel}) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  ${FieldLabel} {
    display: block;
    margin: 0;
    padding-top: 10px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /* 두 칸 묶음 호환 */
  ${CoreFieldPair} {
    display: contents;
  }

  /* 성·이름·중간이름·국적·성별 서브 셀 머리 — 사건 폼 기간 행 '시작일·종료일'(DateRangeLabel)과 같은 11/700 */
  ${NameCell} ${Required} {
    font-size: 11px;
    font-weight: 700;
  }
  ${NameCell} > ${FieldLabel} {
    padding-top: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* 도움말 — 사건 등록 폼 Hint(12px · muted #94a3b8 / 다크 #71717a) */
  ${FieldHint} {
    margin-top: 0;
    font-size: 12px;
    line-height: 1.5;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
  }

  /* 컨트롤 폭 — 필드 열(680)을 채운다 */
  ${FieldControl} {
    width: 100%;
    max-width: ${FIELD_MAX_WIDTH};
  }
  ${InlineFields},
  ${OriginalNameInputWrap} {
    max-width: none;
  }

  /* 2차 disclosure(이름 상세·생애 상세·추가 소속·가족) — 토글 버튼만 컨트롤 열에 맞춰 들이고,
     펼쳐진 본문(AdvancedBody) 안의 FieldRow는 기본 2열(라벨 200px + 컨트롤 680px) 격자를 그대로 유지 */
  ${AdvancedSection} {
    margin: 0;
    padding: 2px 0 4px;
    border-bottom: none;
  }
  ${AdvancedSection} > button {
    margin-left: calc(${SIDE_LABEL_COLUMN} + 24px);
  }
  ${AdvancedBody} {
    padding: 4px 0 2px;
  }

  /* 장 경계선 */
  ${CoreDivider} {
    height: 1px;
    margin: 16px 0 18px;
    background: ${({ theme }) => theme.colors.border.light};
  }
  /* 장 머리글 바로 아래 첫 행은 행 padding(10px)이 간격을 준다 */
  ${CoreSectionLabel} {
    margin-bottom: 4px;
  }

  /* 사건 폼과 같은 단계: 좁은 화면은 라벨 열 160, 모바일은 한 열 */
  @media (max-width: 1024px) {
    ${FieldRow},
    ${CoreFieldCell} {
      grid-template-columns: 160px minmax(0, 1fr);
      column-gap: 16px;
    }
    ${AdvancedSection} > button {
      margin-left: 176px;
    }
  }
  @media (max-width: 768px) {
    ${FieldRow},
    ${CoreFieldCell} {
      grid-template-columns: minmax(0, 1fr);
      padding: 10px 0;
    }
    ${FieldRow} > *,
    ${CoreFieldCell} > *,
    ${FieldRow} > ${FieldLabel},
    ${CoreFieldCell} > ${FieldLabel},
    ${FieldRow} > :has(> ${FieldLabel}) {
      grid-column: 1;
      grid-row: auto;
    }
    ${FieldLabel} {
      padding-top: 0;
    }
    ${AdvancedSection} > button {
      margin-left: 0;
    }
  }
`

// Disclosure 카드(AdvancedSection·Toggle·Body 등)는 _form-primitives에서 정의·re-export.

// ─── 필수/선택 시임(OptionalSeam) ────────────────────────────────────────────
// 접기(MoreToggle)를 없애며 사라진 '여기까지면 등록 끝' 경계를 캡션 얹은 hairline으로 복원.
// 좌측정렬 eyebrow 라벨을 쓰면 섹션 마커(CoreSectionLabel)와 겹쳐 섹션으로 오독되므로,
// 반드시 중앙 정렬 hairline + 보조 톤 캡션으로만 둔다(새 섹션 헤더가 아님을 시각으로 못박음).

export const OptionalSeam = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 30px 0;
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
  text-align: center;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border.light};
  }

  /* 좁은 폰: 긴 캡션이 hairline을 0으로 밀어내지 않도록 세로 스택(pseudo는 전폭). */
  @media (max-width: 640px) {
    flex-direction: column;
    gap: 8px;
    &::before,
    &::after {
      flex: none;
      width: 100%;
    }
  }
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
  border-radius: ${RADIUS.card};
  font-size: ${FONT.label};
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
  border-radius: ${RADIUS.control};
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
  font-size: ${FONT.meta};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: none;
  border-radius: ${RADIUS.control};
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
  font-size: ${FONT.meta};
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: ${RADIUS.control};
  cursor: pointer;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
  }
`

// FieldError는 _form-primitives에서 정의·re-export.

// ─── Loading ────────────────────────────────────────────────────────────────

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
  font-size: ${FONT.meta};
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

/**
 * 409 충돌 배너의 '최신 내용 불러오기' 액션 — 스테일 폼을 서버 최신으로 재하이드레이션.
 * 낙관적 동시성 충돌 후 토큰만 갱신하고 저장을 다시 허용하면 상대 세션 변경을 덮어쓰므로,
 * 사용자가 명시적으로 최신을 불러온 뒤에만 진행하도록 강제하는 유일한 진행 경로.
 */
export const ConflictReloadBtn = styled.button`
  flex-shrink: 0;
  margin-left: auto;
  align-self: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.alert.danger.border};
  border-radius: ${RADIUS.control};
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.06)'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
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
  font-size: ${FONT.meta};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
`
