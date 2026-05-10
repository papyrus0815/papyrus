/**
 * 막대 클릭 시 뜨는 인물 프리뷰 — 어떤 국가의 어떤 직책을 맡았는지 한눈에.
 * stats-view의 PersonPreviewModal을 참고하되, AdaptedPerson 의존을 제거하고
 * TenureBar(이미 fetch된 재임 기록) + PinnedRow(국가 컨텍스트) + 옵션으로 가져온 Person 상세를 합쳐 표시한다.
 */
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FiArrowRight, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getPersonById } from '@/shared/api/persons'
import { Z_INDEX } from '@/shared/styles/z-index'

import { CATEGORY_TOKENS } from '../lib/category-tokens'
import { formatYear } from '../lib/format-year'
import type { TenureBar } from '../lib/normalize-tenures'
import { sortSegmentsChronologically } from '../lib/sort-segments'
import { toJulianYear } from '../lib/time-scale'
import type { PinnedRow } from '../model/types'

interface Props {
  bar: TenureBar | null
  /** 막대가 속한 행 — 어떤 국가의 직책인지 표시하기 위해 사용 */
  row: PinnedRow | null
  onClose: () => void
  onOpenDetail: (personId: string) => void
}

export function PersonPreviewModal({ bar, row, onClose, onOpenDetail }: Props) {
  // ESC 닫기 + Enter로 상세 열기 — capture 단계로 등록해 timeline-canvas의 ESC(가이드라인 해제)보다 먼저 잡는다
  useEffect(() => {
    if (!bar) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Enter' && bar.personId) {
        e.preventDefault()
        e.stopPropagation()
        onOpenDetail(bar.personId)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [bar, onClose, onOpenDetail])

  // 인물 추가 정보(생몰·바이오·프로필 이미지) — 모달이 열릴 때만 fetch
  const personQuery = useQuery({
    queryKey: ['heads-of-state', 'person', bar?.personId],
    queryFn: () => getPersonById(bar!.personId!),
    enabled: !!bar?.personId,
    staleTime: 5 * 60 * 1000,
  })

  /** 어떤 국가의 직책인지 — 막대의 startDate가 속한 segment를 우선 매칭 */
  const matchedSegment = useMemo(() => {
    if (!row || !bar) return null
    const ordered = sortSegmentsChronologically(row.segments)
    const startY = toJulianYear(bar.startDate)
    // 1) lifespan으로 정확 매칭
    for (const seg of ordered) {
      if (seg.lifespanStartYear == null) continue
      const start = seg.lifespanStartYear
      const end = seg.lifespanEndYear ?? Infinity
      if (startY >= start && startY <= end) return seg
    }
    // 2) lifespan 미상이거나 매칭 안 되면 — 현대국 우선, 없으면 첫 segment
    return ordered.find((s) => s.kind === 'COUNTRY') ?? ordered[0] ?? null
  }, [row, bar])

  if (!bar) return null

  const display = bar.regnalName ?? bar.personName ?? '미상'
  const titleLine = (() => {
    if (bar.positionTitle && bar.ordinal != null)
      return `${bar.ordinal}대 ${bar.positionTitle}`
    if (bar.positionTitle) return bar.positionTitle
    if (bar.ordinal != null) return `${bar.ordinal}대`
    return null
  })()
  const sd = bar.startDate?.slice(0, 10)
  const ed = bar.endDate?.slice(0, 10)
  const periodLine = sd && ed ? `${sd} ~ ${ed}` : sd ? `${sd} ~ 재임 중` : null

  const person = personQuery.data as any
  const profileImageUrl = person?.profileImageUrl ?? null
  const biography = person?.biography ?? null
  const birthYear = person?.birthYear
  const birthEra = person?.birthEra
  const deathYear = person?.deathYear
  const deathEra = person?.deathEra
  const lifeLine = formatLife(birthYear, birthEra, deathYear, deathEra)

  const tone = CATEGORY_TOKENS[bar.positionCategory]

  return createPortal(
    <Overlay
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${display} 인물 정보`}
    >
      <Card
        as={motion.div}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Close type="button" onClick={onClose} aria-label="닫기">
          <FiX size={18} />
        </Close>

        <Header>
          {profileImageUrl ? (
            <Avatar src={profileImageUrl} alt={display} />
          ) : (
            <AvatarPh
              style={{
                background: tone.bar.light.background,
                color: tone.bar.light.color,
                borderColor: tone.bar.light.border,
              }}
            >
              <Glyph>{tone.glyph}</Glyph>
            </AvatarPh>
          )}
          <HeaderText>
            {/* 어떤 국가의 ~ 인지 — 가장 강조하고 싶은 메시지를 상단에 */}
            {matchedSegment && (
              <CountryLine>
                {matchedSegment.flagEmoji && (
                  <span>{matchedSegment.flagEmoji}</span>
                )}
                <span>{matchedSegment.name}</span>
                <CountryLineSep>·</CountryLineSep>
                <CategoryBadge
                  style={{
                    background: tone.chip.light.background,
                    color: tone.chip.light.color,
                  }}
                >
                  <CategoryGlyph>{tone.glyph}</CategoryGlyph>
                  {tone.label}
                </CategoryBadge>
              </CountryLine>
            )}
            <Name>{display}</Name>
            {bar.regnalName && bar.personName && bar.regnalName !== bar.personName && (
              <NameSub>본명: {bar.personName}</NameSub>
            )}
            {titleLine && <TitleLine>{titleLine}</TitleLine>}
          </HeaderText>
        </Header>

        <MetaGrid>
          <MetaRow>
            <MetaKey>재임</MetaKey>
            <MetaVal>{periodLine ?? '미상'}</MetaVal>
          </MetaRow>
          {lifeLine && (
            <MetaRow>
              <MetaKey>생몰</MetaKey>
              <MetaVal>{lifeLine}</MetaVal>
            </MetaRow>
          )}
          {personQuery.isLoading && (
            <MetaRow>
              <MetaKey>—</MetaKey>
              <MetaValMuted>인물 정보 불러오는 중…</MetaValMuted>
            </MetaRow>
          )}
        </MetaGrid>

        {biography && <Bio>{biography}</Bio>}

        <Actions>
          <SecondaryBtn type="button" onClick={onClose}>
            닫기
          </SecondaryBtn>
          {bar.personId && (
            <PrimaryBtn
              type="button"
              onClick={() => onOpenDetail(bar.personId!)}
              autoFocus
            >
              상세 보기
              <FiArrowRight size={14} />
            </PrimaryBtn>
          )}
        </Actions>
      </Card>
    </Overlay>,
    document.body,
  )
}

function formatLife(
  by: number | null | undefined,
  be: string | null | undefined,
  dy: number | null | undefined,
  de: string | null | undefined,
): string | null {
  const toSigned = (y?: number | null, e?: string | null) =>
    y == null ? null : e === 'BC' ? -y : y
  const bi = toSigned(by, be)
  const di = toSigned(dy, de)
  if (bi == null && di == null) return null
  if (bi != null && di != null) {
    const age = computeAge(bi, di)
    const main = `${formatYear(bi)} – ${formatYear(di)}`
    return age != null ? `${main} (${age}세)` : main
  }
  if (bi != null) return `${formatYear(bi)} – ?`
  return `? – ${formatYear(di!)}`
}

function computeAge(bi: number, di: number): number | null {
  if (di < bi) return null
  return di - bi
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 460px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
  padding: 22px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

const Close = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Header = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
`

const Avatar = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  object-position: top center;
  flex-shrink: 0;
`

const AvatarPh = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
`

const Glyph = styled.span`
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
`

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const CountryLine = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 2px;
`

const CountryLineSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
`

const CategoryGlyph = styled.span`
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
`

const Name = styled.div`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const NameSub = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TitleLine = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
`

const MetaGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 10px;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
`

const MetaKey = styled.span`
  width: 56px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
`

const MetaVal = styled.span`
  flex: 1;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-variant-numeric: tabular-nums;
`

const MetaValMuted = styled(MetaVal)`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

const Bio = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const SecondaryBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const PrimaryBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover {
    filter: brightness(1.08);
  }
`
