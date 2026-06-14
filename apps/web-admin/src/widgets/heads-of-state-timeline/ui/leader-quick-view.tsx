/**
 * 수장 비교 타임라인 — 막대 클릭 시 뜨는 가벼운 업적 빠른보기 카드.
 *
 * 헤더(이름·직위·대수·기간)는 이미 들고 있는 TenureBar에서 바로 그리고, 업적만
 * `with-achievements` 엔드포인트로 지연 로드한다(전체 인물 상세를 불러오지 않음).
 * '인물 상세 보기'로 기존 PersonDetailModal을 한 번에 열 수 있다.
 */
import { useQuery } from '@tanstack/react-query'

import { FiArrowRight, FiAward, FiCalendar } from 'react-icons/fi'
import styled from 'styled-components'

import { personCareerApi } from '@/shared/api/person-career'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'

import type { PositionTypeCategory, TenureBar } from '../lib/normalize-tenures'

const CATEGORY_LABEL: Record<PositionTypeCategory, string> = {
  MONARCH: '군주',
  PRESIDENT: '대통령',
  PM: '총리',
  POPE: '교황',
  OTHER: '기타',
}

/** ISO → "YYYY년 M월 D일" (BC면 "기원전 N년 …") — 타임존 안전 파서 사용 */
function formatAchDate(iso: string | null | undefined): string {
  const parts = parseIsoDateParts(iso)
  if (!parts) return ''
  const era = parts.year < 0 ? '기원전 ' : ''
  return `${era}${Math.abs(parts.year)}년 ${parts.month}월 ${parts.day}일`
}

/** 리치텍스트 설명을 미리보기용 평문으로 축약 */
function plainPreview(html: string | null | undefined, max = 160): string {
  if (!html) return ''
  const plain = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

interface AchievementRow {
  id: string
  title?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
}

export function LeaderQuickView({
  bar,
  onClose,
  onOpenPerson,
}: {
  bar: TenureBar | null
  onClose: () => void
  onOpenPerson: (personId: string) => void
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['heads-of-state', 'tenure-achievements', bar?.recordKind, bar?.id],
    queryFn: () => {
      if (!bar) return null
      return bar.recordKind === 'SOVEREIGN_REIGN'
        ? personCareerApi.getSovereignReignWithAchievements(bar.id)
        : personCareerApi.getTenureWithAchievements(bar.id)
    },
    enabled: !!bar,
    staleTime: 60_000,
  })

  const achievements: AchievementRow[] = Array.isArray(data?.achievements)
    ? data.achievements
    : []

  const titleText = bar?.regnalName?.trim() || bar?.personName || '이름 없음'
  const headerBits = bar
    ? [
        CATEGORY_LABEL[bar.positionCategory],
        bar.positionTitle,
        bar.ordinal != null ? `제${bar.ordinal}대` : null,
        `${formatAchDate(bar.startDate) || '?'} – ${
          bar.endDate ? formatAchDate(bar.endDate) : '현재'
        }`,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <Modal
      isOpen={!!bar}
      onClose={onClose}
      size="narrow"
      title={titleText}
      subtitle={headerBits}
    >
      <ModalBody>
        <SectionLabel>
          <FiAward size={13} aria-hidden />
          업적·한일
          {achievements.length > 0 ? ` (${achievements.length})` : ''}
        </SectionLabel>
        {isLoading ? (
          <Muted>불러오는 중…</Muted>
        ) : isError ? (
          <Muted>업적을 불러오지 못했습니다.</Muted>
        ) : achievements.length === 0 ? (
          <Muted>등록된 업적·한일이 없습니다.</Muted>
        ) : (
          <List>
            {achievements.map((ach) => {
              const start = formatAchDate(ach.startDate)
              const end = ach.endDate ? formatAchDate(ach.endDate) : ''
              const period = start ? `${start}${end ? ` – ${end}` : ''}` : ''
              const desc = plainPreview(ach.description)
              return (
                <Item key={ach.id}>
                  <ItemTitle>{ach.title}</ItemTitle>
                  {period && (
                    <ItemDate>
                      <FiCalendar size={9} aria-hidden />
                      {period}
                    </ItemDate>
                  )}
                  {desc && <ItemDesc>{desc}</ItemDesc>}
                </Item>
              )
            })}
          </List>
        )}
      </ModalBody>
      <ModalFooter>
        {bar?.personId ? (
          <PersonButton
            type="button"
            onClick={() => {
              const personId = bar.personId
              if (!personId) return
              onClose()
              onOpenPerson(personId)
            }}
          >
            인물 상세 보기
            <FiArrowRight size={13} aria-hidden />
          </PersonButton>
        ) : (
          <Muted>연결된 인물 정보가 없습니다.</Muted>
        )}
      </ModalFooter>
    </Modal>
  )
}

const SectionLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 10px;
`

const Muted = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Item = styled.li`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const ItemTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ItemDate = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ItemDesc = styled.p`
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PersonButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`
