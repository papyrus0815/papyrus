/**
 * 시대 헤드라인 — 지도 하단에 띄우는 "그해 국제 정세" 띠.
 * 그해를 덮는 최상위 사건 하나를 제목으로, 같은 해의 다른 큰 사건을 칩으로 단다.
 */
import styled from 'styled-components'

import { richTextToPlainText } from '@/shared/lib/rich-text-plain'
import { formatScrubberYear } from '@/shared/ui/year-scrubber'

import type {
  EraHeadline as EraHeadlineData,
  EraHeadlineItem,
} from '../lib/atlas-model'

/** 설명은 첫 문장 정도만 — 지도를 가리지 않게 */
const DESCRIPTION_PREVIEW_CHARS = 130

interface Props {
  year: number
  headline: EraHeadlineData
  warCount: number
  allyCount: number
  isLoading: boolean
  onOpenEvent: (eventId: string) => void
}

function rangeText(item: EraHeadlineItem): string {
  return item.startYear === item.endYear
    ? formatScrubberYear(item.startYear)
    : `${formatScrubberYear(item.startYear)}~${formatScrubberYear(item.endYear)}`
}

function descriptionPreview(html: string | null | undefined): string | null {
  const text = richTextToPlainText(html).replace(/\s+/g, ' ').trim()
  if (!text) return null
  return text.length > DESCRIPTION_PREVIEW_CHARS
    ? `${text.slice(0, DESCRIPTION_PREVIEW_CHARS)}…`
    : text
}

export function EraHeadline({
  year,
  headline,
  warCount,
  allyCount,
  isLoading,
  onOpenEvent,
}: Props) {
  const { primary, others } = headline
  const description = primary
    ? descriptionPreview(primary.event.description)
    : null

  return (
    <Bar
      aria-label={`${formatScrubberYear(year)}년 국제 정세`}
      $hasWar={warCount > 0}
    >
      <Body>
        <Eyebrow>{formatScrubberYear(year)}년 국제 정세</Eyebrow>
        {isLoading ? (
          <Muted>사건을 불러오는 중…</Muted>
        ) : primary ? (
          <>
            <TitleButton
              type="button"
              onClick={() => onOpenEvent(primary.event.id)}
            >
              {primary.event.title}
              <small>({rangeText(primary)})</small>
            </TitleButton>
            {description && <Description>{description}</Description>}
            {others.length > 0 && (
              <Others>
                <span>같은 해</span>
                {others.map((item) => (
                  <OtherChip
                    key={item.event.id}
                    type="button"
                    onClick={() => onOpenEvent(item.event.id)}
                  >
                    {item.event.title}
                  </OtherChip>
                ))}
              </Others>
            )}
          </>
        ) : (
          <Muted>이 해를 덮는 기록된 사건이 없습니다.</Muted>
        )}
      </Body>
      <Legend>
        <LegendItem $tone="war">━ 교전 {warCount}</LegendItem>
        <LegendItem $tone="ally">┈ 동맹 {allyCount}</LegendItem>
      </Legend>
    </Bar>
  )
}

const Bar = styled.div<{ $hasWar: boolean }>`
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 900;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-left: 4px solid ${({ $hasWar }) => ($hasWar ? '#ef4444' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(12, 18, 32, 0.92)'
      : 'rgba(255, 255, 255, 0.94)'};
  backdrop-filter: blur(8px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const Eyebrow = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
`

const TitleButton = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  small {
    margin-left: 6px;
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-variant-numeric: tabular-nums;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Description = styled.p`
  margin: 0;
  max-width: 72ch;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  @media (max-width: 640px) {
    display: none;
  }
`

const Others = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  > span {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const OtherChip = styled.button`
  max-width: 220px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Muted = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Legend = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`

const LegendItem = styled.span<{ $tone: 'war' | 'ally' }>`
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $tone }) => ($tone === 'war' ? '#dc2626' : '#2563eb')};
  border: 1px solid
    ${({ $tone }) =>
      $tone === 'war' ? 'rgba(239,68,68,0.45)' : 'rgba(59,130,246,0.4)'};
  background: ${({ $tone }) =>
    $tone === 'war' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.07)'};
`
