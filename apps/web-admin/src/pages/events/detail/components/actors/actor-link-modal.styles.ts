/**
 * 참여 주체 잇기 창(인물 · 국가 · 기관 · 정당 · 기구 · 기업) 공용 2단 레이아웃 스타일.
 *
 * 연관 탭의 `RelatedLinkModal`(`related-link-modal.tsx`)과 동일한 시각·인터랙션 문법을 공유한다:
 * - 왼쪽(`ListPane`): 검색창 + 거르기 알약 + '이은 것 숨기기' 체크박스 + 구획별 후보 목록(이미 연결된 항목은 우측 배지)
 * - 오른쪽(`ComposePane`): 고른 대상 요약 + 역할·진영·소속·서술 입력 + 한 줄 문장 미리보기(`Sentence`)
 *   + 하단 고정 액션 바(`연결 끊기` · `다른 대상 고르기` · `연결하고 계속` · `연결`/`고치기`)
 * - 좁은 화면(≤720px): 목록 ↔ 정하기 한 칸 전환(`← 목록`)
 */
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerBackground,
  ledgerSubtleFill,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

export type KoParticlePair = '을/를' | '이/가' | '과/와' | '은/는'

export function koParticle(word: string, pair: KoParticlePair): string {
  const [withFinal, withoutFinal] = pair.split('/')
  const core = word.replace(/\s*[([（][^)\]）]*[)\]）]\s*$/, '').trim()
  const code = core.charCodeAt(core.length - 1)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) {
    return `${withFinal}(${withoutFinal})`
  }
  return (code - 0xac00) % 28 === 0 ? withoutFinal : withFinal
}

export const Linked = styled.span`
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const UndoButton = styled.button`
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
`

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 0;
  height: min(600px, 66vh);

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
    height: min(640px, 76vh);

    &[data-picked] > :first-child {
      display: none;
    }
    &:not([data-picked]) > :last-child {
      display: none;
    }
  }
`

export const ListPane = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 4px 16px 0 4px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};

  @media (max-width: 720px) {
    padding-right: 4px;
    border-right: 0;
  }
`

export const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const SearchBox = styled.label`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  color: ${metaText};

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    box-shadow: none;
  }
  input:focus,
  input:focus-visible {
    outline: none;
    box-shadow: none;
  }
  &:focus-within {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const NewEntityBtn = styled.button`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 11px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  button {
    padding: 3px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    cursor: pointer;

    &[aria-pressed='true'] {
      border-color: ${({ theme }) => theme.colors.text.primary};
      color: ${({ theme }) => theme.colors.text.primary};
      font-weight: 700;
    }
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    font-size: 12px;
    color: ${metaText};
    cursor: pointer;
  }
`

export const ListScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
`

export const Section = styled.section`
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
`

export const SectionTitle = styled.h3`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  padding: 10px 2px 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(20,20,20,0.96)' : '#ffffff')};

  span {
    font-weight: 400;
    color: ${metaText};
  }
`

export const CandidateRow = styled.button`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  }
  &[aria-pressed='true'] {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.07)'};
    box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.primary};
    min-width: 0;
  }
  .title-sub {
    font-size: 12px;
    font-weight: 400;
    color: ${metaText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    font-size: 12px;
    line-height: 1.4;
    color: ${metaText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const CandidateThumb = styled.span<{ $hasImg?: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 7px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $hasImg }) =>
    $hasImg ? 'transparent' : ledgerSubtleFill(theme.mode)};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const Badge = styled.span`
  align-self: center;
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const MoreListButton = styled.button`
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

export const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 24px 4px;
  font-size: 13px;
  color: ${metaText};

  .note {
    font-size: 12px;
  }

  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
    cursor: pointer;
  }
`

export const CreateButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 6px 12px !important;
  border: 1px solid ${({ theme }) => theme.colors.border.default} !important;
  border-radius: 8px;
  text-decoration: none !important;
  color: ${({ theme }) => theme.colors.text.primary} !important;
  font-size: 12.5px;
  font-weight: 600;
`

export const ComposePane = styled.section`
  display: flex;
  flex-direction: column;
  gap: 13px;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 4px 4px 20px;

  @media (max-width: 720px) {
    padding-left: 4px;
  }
`

export const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 24px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
  color: ${metaText};

  strong {
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

export const BackButton = styled.button`
  display: none;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  @media (max-width: 720px) {
    display: inline-flex;
  }
`

export const Picked = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 11px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};

  .eyebrow {
    font-size: 11.5px;
    font-weight: 700;
    color: ${metaText};
  }
  strong {
    font-size: 17px;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12.5px;
    color: ${metaText};
  }
`

export const OpenLink = styled.a`
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 12px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover {
    text-decoration: underline;
  }
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  input[type='text'] {
    width: 100%;
    box-sizing: border-box;
    height: 36px;
    padding: 0 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};

    &:focus {
      outline: none;
      border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.primary};
    resize: vertical;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    }
  }
`

export const InlineTwoCol = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SegmentScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    width: max-content;
  }
`

export const ChoicePillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const ChoicePill = styled.button<{ $selected: boolean; $dotColor?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? ledgerAccent(theme.mode) : theme.colors.border.default};
  background: ${({ theme, $selected }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.14)'
        : 'rgba(79, 70, 229, 0.08)'
      : 'transparent'};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.text.primary : theme.colors.text.secondary};
  font: inherit;
  font-size: 12px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $dotColor }) => $dotColor || 'currentColor'};
    flex-shrink: 0;
  }
`

export const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${metaText};
`

export const Hint = styled.span`
  font-size: 12px;
  line-height: 1.45;
  color: ${metaText};
`

export const Sentence = styled.p`
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
`

export const Count = styled.span`
  align-self: flex-end;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

export const Actions = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding: 10px 0 2px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(20,20,20,0.96)' : '#ffffff')};

  button {
    padding: 7px 14px;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.text.primary};
    cursor: pointer;

    &[data-primary] {
      border-color: transparent;
      background: ${({ theme }) => ledgerAccent(theme.mode)};
      color: ${({ theme }) =>
        theme.mode === 'dark' ? ledgerBackground('dark') : '#ffffff'};
      font-weight: 700;
    }
    &[data-danger] {
      margin-right: auto;
      color: #dc2626;
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
`
