/**
 * 가문 와이드 행 — 1행 1가문, 인라인 확장 + 시대축 타임라인 막대.
 */
import { AnimatePresence, motion } from 'framer-motion'
import styled, { css } from 'styled-components'

import type { Dynasty } from '@/shared/api/dynasty'
import { getUploadImageUrl } from '@/shared/api/upload'

import { primarySoft } from './dynasty.styles'

export interface DynastyDerived {
  dynasty: Dynasty
  startYear: number | null
  endYear: number | null
  /** 존속 기간(년). 시작년 없으면 null. 종료년 없으면 현재년 기준. */
  duration: number | null
  /** 종료년 미상이지만 시작년 있을 때 true */
  ongoing: boolean
}

interface Props {
  derived: DynastyDerived
  /** 모든 행이 공유하는 전체 시대 범위 */
  axisMin: number
  axisMax: number
  isExpanded: boolean
  isDeleting: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onShowMembers: () => void
}

const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transition: 'transform 0.2s', transform: `rotate(${open ? 180 : 0}deg)` }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)
const IconOrigin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconFounder = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconQuote = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9.17 6C5.83 6.67 4 9.17 4 13v5h5v-5H6.5c0-2 .83-3.33 2.67-4L9.17 6zm9 0c-3.34.67-5.17 3.17-5.17 7v5h5v-5h-2.5c0-2 .83-3.33 2.67-4L18.17 6z"/>
  </svg>
)
const IconUsers = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

function pctOnAxis(year: number, axisMin: number, axisMax: number): number {
  const range = axisMax - axisMin
  if (range <= 0) return 50
  const pct = ((year - axisMin) / range) * 100
  return Math.max(0, Math.min(100, pct))
}

export function DynastyRow({
  derived,
  axisMin,
  axisMax,
  isExpanded,
  isDeleting,
  onToggleExpand,
  onEdit,
  onDelete,
  onShowMembers,
}: Props) {
  const { dynasty, startYear, endYear, duration, ongoing } = derived
  const initial = dynasty.name?.trim().slice(0, 1) || '·'
  // 행 좌측 아이콘: crest(문장) 우선, 없으면 thumbnail 로 폴백
  const symbolUrl = dynasty.crestImageUrl ?? dynasty.thumbnailUrl ?? null
  const symbolType: 'crest' | 'thumbnail' | null =
    dynasty.crestImageUrl
      ? 'crest'
      : dynasty.thumbnailUrl
        ? 'thumbnail'
        : null
  const memberCount = dynasty.memberCount ?? 0

  // 타임라인 위치 계산
  const effectiveStart = startYear ?? axisMin
  const effectiveEnd = endYear ?? new Date().getFullYear()
  const leftPct = pctOnAxis(effectiveStart, axisMin, axisMax)
  const rightPct = pctOnAxis(effectiveEnd, axisMin, axisMax)
  const widthPct = Math.max(2, Math.min(100 - leftPct, rightPct - leftPct))
  const knownStart = startYear != null
  const knownEnd = endYear != null

  const eraText =
    startYear || endYear
      ? `${startYear ?? '?'} – ${endYear ?? '현재'}`
      : '연도 미상'

  const timelineTitle = (() => {
    if (startYear == null && endYear == null) return '시기 정보 없음'
    const left = startYear != null ? String(startYear) : '?'
    const right = endYear != null ? String(endYear) : ongoing ? '현재' : '?'
    const dur = duration != null ? ` · ${duration.toLocaleString()}년${ongoing ? '+' : ''}` : ''
    return `${left} – ${right}${dur}`
  })()

  return (
    <Row $expanded={isExpanded}>
      <RowMain
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={`${dynasty.name} ${isExpanded ? '접기' : '펼치기'}`}
      >
        <TopLine>
          <Crest $contain={symbolType === 'crest'}>
            {symbolUrl ? (
              <img
                src={getUploadImageUrl(symbolUrl)}
                alt={
                  symbolType === 'crest'
                    ? `${dynasty.name} 가문 상징(문장)`
                    : `${dynasty.name} 썸네일`
                }
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <CrestInitial aria-hidden>{initial}</CrestInitial>
            )}
          </Crest>

          <PrimaryCol>
            <NameRow>
              <Name>{dynasty.name}</Name>
              {duration != null && (
                <DurationChip>{duration.toLocaleString()}년{ongoing ? '+' : ''}</DurationChip>
              )}
              {memberCount > 0 && (
                <MemberCountChip
                  title={`인물 ${memberCount.toLocaleString()}명 등록됨`}
                  aria-label={`인물 ${memberCount.toLocaleString()}명`}
                >
                  <IconUsers />
                  {memberCount.toLocaleString()}
                </MemberCountChip>
              )}
            </NameRow>
            <MetaLine>
              <MetaEra>{eraText}</MetaEra>
              {dynasty.originPlace && (
                <MetaItem>
                  <IconOrigin />
                  {dynasty.originPlace}
                </MetaItem>
              )}
              {dynasty.founderText && (
                <MetaItem>
                  <IconFounder />
                  {dynasty.founderText}
                </MetaItem>
              )}
            </MetaLine>
          </PrimaryCol>

          <ChevronWrap aria-hidden>
            <IconChevron open={isExpanded} />
          </ChevronWrap>
        </TopLine>

        <TimelineRow title={timelineTitle} aria-hidden>
          <TimelineTrack>
            <TimelineBar
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              $known={knownStart && knownEnd}
              $dashed={!knownStart || !knownEnd}
            />
          </TimelineTrack>
          <TimelineYears>
            <span>{startYear ?? '?'}</span>
            <span>{endYear ?? (ongoing ? '현재' : '?')}</span>
          </TimelineYears>
        </TimelineRow>
      </RowMain>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <ExpandPanel
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ExpandInner>
              {dynasty.motto && (
                <Motto>
                  <IconQuote />
                  <span>{dynasty.motto}</span>
                </Motto>
              )}
              {dynasty.description && (
                <Description>{dynasty.description}</Description>
              )}
              <ActionRow>
                <MembersBtn type="button" onClick={onShowMembers}>
                  구성원 인포그래픽
                  {memberCount > 0 && ` · ${memberCount.toLocaleString()}명`}
                </MembersBtn>
                <ActionGroup>
                  <ActionBtn type="button" onClick={onEdit}>수정</ActionBtn>
                  <ActionBtn
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting}
                    $danger
                  >
                    삭제
                  </ActionBtn>
                </ActionGroup>
              </ActionRow>
            </ExpandInner>
          </ExpandPanel>
        )}
      </AnimatePresence>
    </Row>
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const Row = styled.div<{ $expanded: boolean }>`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  ${({ $expanded, theme }) =>
    $expanded &&
    css`
      border-color: ${theme.colors.primary};
      box-shadow: 0 6px 18px ${theme.colors.shadow.sm};
    `}

  &:hover {
    border-color: ${({ theme, $expanded }) =>
      $expanded ? theme.colors.primary : theme.colors.border.medium};
  }
`

const RowMain = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
    border-radius: 12px;
  }
`

const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const Crest = styled.div<{ $contain: boolean }>`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    ${({ $contain }) =>
      $contain
        ? css`
            max-width: 80%;
            max-height: 80%;
            object-fit: contain;
          `
        : css`
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
  }
`

const CrestInitial = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PrimaryCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const NameRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const Name = styled.span`
  font-size: 15.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`

const DurationChip = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => primarySoft(theme.mode)};
  padding: 2px 8px;
  border-radius: 999px;
`

const MemberCountChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  padding: 2px 8px;
  border-radius: 999px;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const MetaLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  flex-wrap: wrap;
`

const MetaEra = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const TimelineRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 58px; /* crest 44px + gap 14px = 58px — primary 콘텐츠와 정렬 */

  @media (max-width: 640px) {
    padding-left: 0;
  }
`

const TimelineTrack = styled.div`
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  overflow: hidden;
`

const TimelineBar = styled.div<{ $known: boolean; $dashed: boolean }>`
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 999px;
  ${({ $dashed, theme }) =>
    $dashed
      ? css`
          background: repeating-linear-gradient(
            90deg,
            ${theme.colors.border.medium} 0,
            ${theme.colors.border.medium} 4px,
            transparent 4px,
            transparent 7px
          );
        `
      : css`
          background: ${theme.colors.primary};
          opacity: 0.85;
        `}
`

const TimelineYears = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChevronWrap = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ExpandPanel = styled(motion.div)`
  overflow: hidden;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ExpandInner = styled.div`
  padding: 16px 20px 18px 78px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 720px) {
    padding: 16px 18px;
  }
`

const Motto = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13.5px;
  font-style: italic;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    opacity: 0.7;
  }
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.55;
  white-space: pre-wrap;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
`

const ActionGroup = styled.div`
  display: flex;
  gap: 4px;
`

const MembersBtn = styled.button`
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 999px;
  background: ${({ theme }) => primarySoft(theme.mode)};
  color: ${({ theme }) => theme.colors.primary};
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,106,242,0.22)'
        : 'rgba(99,102,241,0.14)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const ActionBtn = styled.button<{ $danger?: boolean }>`
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    ${({ $danger, theme }) =>
      $danger
        ? css`
            color: ${theme.colors.error};
            background: ${theme.mode === 'dark'
              ? 'rgba(255,69,58,0.12)'
              : 'rgba(239,68,68,0.08)'};
          `
        : css`
            color: ${theme.colors.text.primary};
            background: ${theme.colors.background.tertiary};
          `}
  }
  &:focus-visible {
    outline: 2px solid
      ${({ $danger, theme }) =>
        $danger ? theme.colors.error : theme.colors.text.secondary};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`
