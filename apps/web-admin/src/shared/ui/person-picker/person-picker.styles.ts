/**
 * 인물 고르기 스타일 — 표면(배경·테두리·그림자)은 공용 <Modal>(glassCardMixin)이 맡는다.
 * 여기서는 안쪽 조판만. 색은 테마 토큰(primary·text·border)만 쓴다.
 */
import styled, { css } from 'styled-components'

/** 몸통 — 높이를 고정한다. 결과 수에 따라 상자가 줄었다 늘었다 하며 화면 가운데서 출렁였다 */
export const Body = styled.div`
  display: flex;
  flex-direction: column;
  height: min(640px, calc(100dvh - 160px));
  min-height: 0;
  container: personpicker / inline-size;
`

export const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 20px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`

export const SearchBox = styled.label`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.colors.primary}26`};
    color: ${({ theme }) => theme.colors.primary};
  }
  /* 전역 input:focus 테두리·그림자를 끈다 — 상자(focus-within)가 이미 강조해 링이 두 겹이 됐다 */
  input,
  input:focus,
  input:focus-visible {
    flex: 1;
    min-width: 0;
    height: auto;
    padding: 0;
    border: none;
    outline: none;
    box-shadow: none;
    background: transparent;
    font: inherit;
    font-size: 15px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  input::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const ClearButton = styled.button`
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 6px;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  font: inherit;
  font-size: 13.5px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

export const GhostButton = styled.button`
  ${buttonBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const PrimaryButton = styled.button`
  ${buttonBase}
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }
`

/** 거르기 줄 — 국가·왕조·정렬. 좁으면 가로로 밀린다(세로로 쌓여 목록을 덮지 않게) */
export const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  > * {
    flex-shrink: 0;
  }
`

export const FilterSelect = styled.select<{ $active?: boolean }>`
  /* 글자 폭만큼 — 고정 폭이면 '모든 국가'에 200px을 썼다 */
  field-sizing: content;
  width: auto;
  min-width: 0;
  height: 32px;
  max-width: 200px;
  padding: 0 28px 0 12px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border.default)};
  border-radius: 999px;
  background-color: ${({ $active, theme }) =>
    $active ? `${theme.colors.primary}14` : theme.colors.background.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  cursor: pointer;
  text-overflow: ellipsis;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

export const FilterSpacer = styled.span`
  flex: 1 0 8px;
`

export const ResultCount = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
  strong {
    font-weight: 750;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const TextButton = styled.button`
  padding: 0 4px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`

/** 결과 목록 — 가상 스크롤 뷰포트 */
export const ListViewport = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 12px 12px;
  overscroll-behavior: contain;
`

/** 묶음 머리 — '이 사건 무렵 · 관련 나라 12' / '그 밖의 인물' */
export const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 8px 6px;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  span {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

export const Row = styled.button<{ $active: boolean; $selected: boolean; $added: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid
    ${({ $active, $selected, theme }) =>
      $selected ? theme.colors.primary : $active ? theme.colors.border.default : 'transparent'};
  border-radius: 12px;
  background: ${({ $active, $selected, theme }) =>
    $selected
      ? `${theme.colors.primary}14`
      : $active
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(15,23,42,0.035)'
        : 'transparent'};
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: ${({ $added }) => ($added ? 'default' : 'pointer')};
  opacity: ${({ $added }) => ($added ? 0.6 : 1)};
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

export const Avatar = styled.span<{ $hasImage: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ $hasImage, theme }) =>
    $hasImage ? 'transparent' : theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)'};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const RowMain = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const NameLine = styled.span`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  mark {
    padding: 0 1px;
    border-radius: 3px;
    color: inherit;
    background: ${({ theme }) => `${theme.colors.primary}2e`};
  }
`

export const OriginalName = styled.span`
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const MetaLine = styled.span`
  display: flex;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  > span {
    flex-shrink: 0;
  }
  > span:last-child {
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .years {
    font-variant-numeric: tabular-nums;
  }
  .office {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/** 오른쪽 상태 — 선택됨·추가됨·관련, 강조 행엔 Enter 안내 */
export const RowState = styled.span<{ $tone?: 'primary' | 'muted' | 'context' }>`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $tone, theme }) =>
    $tone === 'primary' ? theme.colors.primary : $tone === 'context' ? theme.colors.text.secondary : theme.colors.text.tertiary};
  background: ${({ $tone, theme }) =>
    $tone === 'primary'
      ? `${theme.colors.primary}1a`
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15,23,42,0.05)'};
`

export const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 20px;
  text-align: center;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

export const KeyHints = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  kbd {
    padding: 1px 6px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 5px;
    font: inherit;
    font-size: 11px;
  }
  @container personpicker (max-width: 560px) {
    display: none;
  }
`

/** 이번에 추가한 인물 칩 — 연속 추가에서 '무엇을 넣었나'가 보이게 */
export const AddedTray = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const AddedChip = styled.span`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}14`};
`

/* ── 새 인물 등록 ── */

export const CreateBody = styled.form`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 20px 20px;
`

export const CreateHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const CreateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  @container personpicker (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const CreateField = styled.div<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ $span }) => ($span === 2 ? 'grid-column: 1 / -1;' : '')}
`

export const CreateLabel = styled.label`
  font-size: 12.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const CreateInput = styled.input`
  height: 40px;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.colors.primary}26`};
  }
`

export const CreateYears = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  > input {
    flex: 1;
  }
  @container personpicker (max-width: 480px) {
    flex-wrap: wrap;
  }
`

export const Segment = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 10px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
`

export const SegmentItem = styled.button<{ $active: boolean }>`
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) => ($active ? theme.colors.background.primary : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(15,23,42,0.12)' : 'none')};
  font: inherit;
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`

export const CreateActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
`
