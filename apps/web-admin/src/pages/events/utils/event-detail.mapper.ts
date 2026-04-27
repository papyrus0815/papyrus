/**
 * API EventResponseDto → 상세 페이지용 HistoricalEvent 변환
 * 대시보드/목록에서 클릭한 사건(API ID)을 상세 페이지에서 표시할 때 사용
 */
import type { EventResponseDto } from '@/shared/api/events'

import type {
  EventCountryRelation,
  EventHierarchyNode,
  EventMapMarker,
  EventTheater,
  EventVisualAsset,
  HistoricalEvent,
} from '../create/events.types'

const EMPTY_STATS = {
  casualties: { total: 0, civilians: 0, military: 0 },
  participatingNations: 0,
  theaters: 0,
  durationInYears: 0,
}

const EMPTY_QUICK_FACTS = {
  commandStructure: '',
  decisiveTechnology: '',
  intelligenceNotes: '',
  logisticalScale: '',
}

function toHierarchyNode(dto: EventResponseDto): EventHierarchyNode {
  return {
    id: dto.id,
    title: dto.title,
    summary: dto.description ?? '',
    period: {
      start: dto.startDate ?? '',
      end: dto.endDate,
    },
    importance: 'major',
    children: dto.childEvents?.length
      ? dto.childEvents.map((child) => toHierarchyNode(child))
      : undefined,
  }
}

function toVisuals(dto: EventResponseDto): HistoricalEvent['visuals'] {
  const gallery: EventVisualAsset[] =
    dto.eventImages?.map((img, i) => ({
      id: img.id,
      title: img.caption ?? `이미지 ${i + 1}`,
      url: img.imageUrl,
      caption: img.caption,
      source: img.source,
    })) ?? []
  const heroUrl =
    dto.eventImages?.find((img) => img.isPrimary)?.imageUrl ??
    dto.thumbnail ??
    dto.eventImages?.[0]?.imageUrl ??
    ''
  return {
    heroImageUrl: heroUrl,
    thumbnailUrl: dto.thumbnail ?? heroUrl ?? '',
    gallery,
  }
}

function toCountries(dto: EventResponseDto): EventCountryRelation[] {
  const list: EventCountryRelation[] = []
  dto.relatedCountries?.forEach((c) => {
    list.push({
      id: c.id,
      name: c.name,
      role: 'support',
      classification: 'Allies',
    })
  })
  dto.relatedHistoricalCountries?.forEach((c) => {
    list.push({
      id: c.id,
      name: c.name,
      role: 'support',
      classification: 'Neutral',
    })
  })
  return list
}

/** EventResponseDto → 상세 페이지용 HistoricalEvent */
export function mapEventResponseToHistoricalEvent(
  dto: EventResponseDto,
): HistoricalEvent {
  const category = dto.category?.name ?? 'military'
  return {
    id: dto.id,
    title: dto.title,
    type: 'political-shift',
    category,
    description: dto.description ?? '',
    startDate: dto.startDate ?? '',
    startDatePrecision: dto.startDatePrecision ?? null,
    endDate: dto.endDate,
    endDatePrecision: dto.endDatePrecision ?? null,
    location: dto.location,
    tags: dto.keywords ?? [],
    background: dto.background ?? '',
    aftermath: dto.aftermath ?? '',
    stats: EMPTY_STATS,
    hierarchy: toHierarchyNode(dto),
    timeline: [],
    theaters: [] as EventTheater[],
    keyFigures: Array.isArray(dto.relatedPersons)
      ? dto.relatedPersons.map((rp: any) => {
          const fullName = [rp.person?.surname, rp.person?.name]
            .filter((s: unknown) => s != null && String(s).trim())
            .join(' ')
            .trim()
          return {
            id: rp.id,
            personId: rp.person?.id ?? rp.personId,
            name: fullName || '이름 없음',
            role: rp.role ?? '',
            nation: '',
            portraitUrl: rp.person?.profileImageUrl ?? undefined,
            // 인물 시점의 사건 서술 (PersonEvent.note, 장문)
            contribution: rp.note ?? '',
          }
        })
      : [],
    countries: toCountries(dto),
    influence: [],
    visuals: toVisuals(dto),
    sources: [],
    map: {
      summary: dto.location ?? '',
      markers: [] as EventMapMarker[],
    },
    quickFacts: EMPTY_QUICK_FACTS,
    parentEventId: dto.parentEventId ?? undefined,
    sectionTitles: dto.eventSections?.map((s) => s.title),
    eventSections: dto.eventSections,
    eventImages: dto.eventImages,
    relatedCountries: dto.relatedCountries,
    relatedHistoricalCountries: dto.relatedHistoricalCountries,
    keywords: dto.keywords,
  }
}
