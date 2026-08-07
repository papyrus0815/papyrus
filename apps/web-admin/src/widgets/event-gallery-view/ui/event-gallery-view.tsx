/**
 * Event Gallery View — heroImage 기반 비주얼 카드 그리드.
 *
 * - heroImageUrl이 있는 사건은 이미지 카드로, 없는 사건은 카테고리 색의 placeholder.
 * - 가로 스캔 시 *비주얼 발견* 강함. 이미지 등록률에 따라 가치 변동.
 * - 카드 hover 시 제목·summary overlay.
 * - 클릭 → 사건 선택.
 *
 * 데이터 미흡 시 안내 + 이미지 등록 진입점 (각 카드 placeholder도 클릭 가능).
 */
import React, { useMemo } from 'react'

import { FiImage } from 'react-icons/fi'
import styled from 'styled-components'

import { getCategoryName } from '@/features/event-list/lib'
import { CatalogViewEmpty } from '@/features/event-list/ui/catalog-view-empty'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import { CategoryDot } from '@/shared/ui/category-dot/category-dot'
import { CountryFlags } from '@/shared/ui/country-flags/country-flags'
import { ImportancePill } from '@/shared/ui/importance-pill/importance-pill'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

import { CATEGORY_BADGE_COLORS } from '../../../pages/events/styles/theme'
import type {
  EventHierarchyNode,
  HistoricalEvent,
} from '../../../pages/events/create/events.types'

/** useEventHierarchy 출력 계약 단일화 — 각 뷰의 중복 선언 제거 */
type FlatItem = import('@/features/event-hierarchy/model').FlattenedHierarchyItem

interface Props {
  /** ⚠️ 필터를 만족한 행만 담긴 배열이어야 한다(검토 GAP-1) — 문맥 부모는 카드가 아니다. */
  flattenedHierarchy: FlatItem[]
  events: HistoricalEvent[]
  selectedEventId: string | null
  dbCategories: EventCategoryDto[]
  onSelectEvent: (id: string) => void
  /** 빈 상태 3분기(로딩·필터0건·데이터0건) 판정용 — 검토 GAP-3 */
  isLoading?: boolean
  hasMoreData?: boolean
  hasActiveFilters?: boolean
  onResetFilters?: () => void
}

export const EventGalleryView: React.FC<Props> = ({
  flattenedHierarchy,
  events,
  selectedEventId,
  dbCategories,
  onSelectEvent,
  isLoading = false,
  hasMoreData = false,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  const cards = useMemo(() => {
    const eventById = new Map<string, HistoricalEvent>()
    for (const e of events) eventById.set(e.id, e)

    const seen = new Set<string>()
    const out: Array<{ event: HistoricalEvent; node: EventHierarchyNode }> = []
    for (const item of flattenedHierarchy) {
      if (item.depth !== 0) continue
      if (seen.has(item.node.id)) continue
      seen.add(item.node.id)
      const evt = eventById.get(item.node.id)
      if (!evt) continue
      out.push({ event: evt, node: item.node })
    }
    return out
  }, [flattenedHierarchy, events])

  const hasImageCount = useMemo(
    () => cards.filter((c) => !!c.event.visuals?.heroImageUrl).length,
    [cards],
  )

  if (cards.length === 0) {
    return (
      <CatalogViewEmpty
        icon={<FiImage size={28} />}
        title="표시할 사건이 없습니다"
        description="사건을 등록하면 카드가 채워집니다."
        isLoading={isLoading}
        hasMoreData={hasMoreData}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
      />
    )
  }

  return (
    <Host>
      <Bar>
        <Stat>
          <strong>{cards.length.toLocaleString()}</strong>건 ·{' '}
          <Strong $accent>{hasImageCount.toLocaleString()}</Strong>건 이미지
          있음
        </Stat>
      </Bar>

      <Grid>
        {cards.map(({ event, node }) => {
          const yp = parseIsoDateParts(node.period.start)
          const startYear = yp
            ? yp.year < 0
              ? `기원전 ${Math.abs(yp.year)}`
              : `${yp.year}`
            : '연도 미상'
          const heroUrl = event.visuals?.heroImageUrl
          const catColor =
            CATEGORY_BADGE_COLORS[
              event.category as keyof typeof CATEGORY_BADGE_COLORS
            ] ?? '#94a3b8'
          const isActive = selectedEventId === node.id
          return (
            <Card
              key={node.id}
              type="button"
              onClick={() => onSelectEvent(node.id)}
              $active={isActive}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${startYear} ${node.title}`}
              data-event-id={node.id}
            >
              {heroUrl ? (
                <CardImage
                  src={heroUrl}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <CardPlaceholder $color={catColor} aria-hidden="true">
                  <FiImage size={28} />
                </CardPlaceholder>
              )}
              <CardOverlay>
                <CardYear>{startYear}</CardYear>
                <CardTitle>{node.title}</CardTitle>
                <CardCountriesRow>
                  <CountryFlags
                    modern={event.relatedCountries}
                    historical={event.relatedHistoricalCountries}
                    max={3}
                    size="sm"
                    tone="overlay"
                  />
                </CardCountriesRow>
                <CardMeta>
                  <CategoryDot color={catColor} size={6} />
                  <span>{getCategoryName(event.category, dbCategories)}</span>
                  <ImpMarkWrap>
                    <ImportancePill
                      tier={node.importance}
                      size="sm"
                      tone="overlay"
                    />
                  </ImpMarkWrap>
                </CardMeta>
              </CardOverlay>
            </Card>
          )
        })}
      </Grid>
    </Host>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const Host = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 4px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
      : `background: #fff; border: 1px solid rgba(15,23,42,0.06);`}
`

const Stat = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const Strong = styled.strong<{ $accent?: boolean }>`
  ${({ $accent }) =>
    $accent &&
    `
      color: #2563eb !important;
    `}
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
`

/* aspect-ratio 고정 제거 — 종횡비 다양한 hero 이미지 자연스럽게 표현.
 * min-height로 placeholder도 일정 크기 보장. object-fit: cover는 유지. */
const Card = styled.button<{ $active: boolean }>`
  position: relative;
  display: block;
  border: none;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  min-height: 180px;
  aspect-ratio: 4 / 3;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9'};
  outline: ${({ $active }) =>
    $active ? '2px solid #2563eb' : '1px solid transparent'};
  outline-offset: ${({ $active }) => ($active ? '2px' : '0')};
  transition: outline 0.15s, transform 0.15s;

  /* aspect-ratio 미지원 브라우저(아주 옛날) 대비 — 주요 브라우저는 모두 지원 */
  @supports not (aspect-ratio: 1) {
    height: 200px;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const CardPlaceholder = styled.div<{ $color: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `linear-gradient(135deg, ${$color}22, ${$color}55)`};
  color: ${({ $color }) => $color};

  svg {
    opacity: 0.6;
  }
`

const CardOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 텍스트 가독성 — 그라데이션 어두움 */
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0) 0%,
    rgba(15, 23, 42, 0.7) 60%,
    rgba(15, 23, 42, 0.85) 100%
  );
  color: #ffffff;
`

const CardYear = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.85);
`

const CardTitle = styled.span`
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);

  span {
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`

/* ImportancePill을 우측 끝으로 밀어내기 위한 wrapper */
const ImpMarkWrap = styled.span`
  margin-left: auto;
`

/* Gallery 카드 overlay에 국가 chip이 들어가는 줄 — 작은 시각 단서 */
const CardCountriesRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 2px;
`
