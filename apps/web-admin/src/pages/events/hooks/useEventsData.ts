/**
 * useEventsData Hook
 * 이벤트 데이터 페칭 및 변환 로직 (사건 + 사건 페이지 표시 업적)
 */
import { useEffect, useState } from 'react'

import { personCareerApi } from '@/shared/api/person-career'
import { getAllEvents } from '@/shared/api/events'

import type {
  HistoricalEvent,
  HistoricalEventCategory,
} from '../create/events.types'

/** 사건 페이지에 표시되는 업적 메타 (카드 부가 표시용) */
export interface TenureAchievementMeta {
  personName: string
  countryName?: string
  tenureTitle?: string
  achievementId: string
}

/**
 * 카테고리 매핑 (DB의 한글 카테고리명 -> 영문 타입)
 */
const CATEGORY_MAP: Record<string, HistoricalEventCategory> = {
  정치: 'political',
  경제: 'economic',
  '전쟁/군사': 'military',
  사회: 'social',
  '과학/기술': 'technological',
  과학기술: 'technological',
  문화: 'cultural',
  외교: 'diplomatic',
  회담: 'conference',
  종교: 'religious',
  기타: 'other',
}

/**
 * API 응답을 HistoricalEvent로 변환
 */
function convertToHistoricalEvent(event: any): HistoricalEvent {
  const category = event.category?.name
    ? CATEGORY_MAP[event.category.name] || 'other'
    : 'other'

  return {
    id: event.id,
    title: event.title,
    type: 'battle' as const,
    category,
    description: event.description || '',
    startDate: event.startDate || new Date().toISOString(),
    endDate: event.endDate,
    location: event.location,
    tags: [],
    background: event.background || '',
    aftermath: event.aftermath || '',
    stats: {
      casualties: {
        total: 0,
        civilians: 0,
        military: 0,
      },
      participatingNations: 0,
      theaters: 0,
      durationInYears: 0,
    },
    hierarchy: {
      id: event.id,
      title: event.title,
      summary: event.description || '',
      period: {
        start: event.startDate || new Date().toISOString(),
        end: event.endDate,
      },
      importance: 'notable' as const,
      children: event.childEvents?.map((child: any) => ({
        id: child.id,
        title: child.title,
        summary: child.description || '',
        period: {
          start: child.startDate || new Date().toISOString(),
          end: child.endDate,
        },
        importance: 'notable' as const,
      })),
    },
    timeline: [],
    theaters: [],
    keyFigures: [],
    countries: [],
    influence: [],
    visuals: {
      heroImageUrl: event.thumbnail || '',
      thumbnailUrl: event.thumbnail || '',
      gallery: [],
    },
    map: {
      summary: '',
      markers: [],
    },
    quickFacts: {
      commandStructure: '',
      decisiveTechnology: '',
      intelligenceNotes: '',
      logisticalScale: '',
    },
    sectionTitles: event.sectionTitles || [],
  }
}

/** 업적 API 응답을 HistoricalEvent 형태로 변환 (사건 페이지 목록용) */
function convertAchievementToEvent(achievement: any): HistoricalEvent & { __isTenureAchievement?: boolean; __achievementMeta?: TenureAchievementMeta } {
  const base = convertToHistoricalEvent({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description ?? '',
    startDate: achievement.startDate ?? achievement.createdAt,
    endDate: achievement.endDate,
    category: { name: '기타' },
    thumbnail: null,
    parentEventId: null,
    childEvents: [],
    sectionTitles: [],
  })
  const person = achievement.tenure?.person
  const personName = person
    ? [person.name, person.surname].filter(Boolean).join(' ').trim() || '이름 없음'
    : '—'
  const country = achievement.tenure?.country || achievement.tenure?.historicalCountry
  const countryName = country?.name
  const tenureTitle = achievement.tenure?.positionDefinition?.title ?? achievement.tenure?.title
  return {
    ...base,
    __isTenureAchievement: true,
    __achievementMeta: {
      achievementId: achievement.id,
      personName,
      countryName,
      tenureTitle,
    },
  }
}

export function useEventsData() {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [response, achievements] = await Promise.all([
          getAllEvents(),
          personCareerApi.getAchievementsForEventsPage().catch(() => []),
        ])

        const allEvents: (HistoricalEvent & { __isTenureAchievement?: boolean; __achievementMeta?: TenureAchievementMeta })[] = []

        response
          .filter((event: any) => !event.parentEventId)
          .forEach((event: any) => {
            const parentEventData = convertToHistoricalEvent(event)
            allEvents.push(parentEventData)
            if (event.childEvents?.length) {
              event.childEvents.forEach((child: any) => {
                allEvents.push(convertToHistoricalEvent(child))
              })
            }
          })

        achievements.forEach((a: any) => {
          allEvents.push(convertAchievementToEvent(a))
        })

        allEvents.sort((a, b) => {
          const tA = a.startDate ? new Date(a.startDate).getTime() : 0
          const tB = b.startDate ? new Date(b.startDate).getTime() : 0
          return tA - tB
        })

        setEvents(allEvents)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return { events, isLoading, error }
}
