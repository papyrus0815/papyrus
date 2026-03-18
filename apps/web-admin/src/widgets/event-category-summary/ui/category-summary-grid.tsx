/**
 * Category Summary Grid Widget
 * FSD: widgets/event-category-summary/ui
 */

import React, { useMemo } from 'react'
import { FiFileText } from 'react-icons/fi'

import { extractCategoryKey } from '@/features/event-create/lib'
import type { EventCategoryDto } from '@/shared/api/event-categories'

import { CATEGORY_ICON_MAP } from '../../../pages/events/create/events.constants'
import type {
  HistoricalEvent,
  HistoricalEventCategory,
} from '../../../pages/events/create/events.types'
import * as Skeleton from '../../../pages/events/styles/skeleton.styles'
import { CATEGORY_COLORS } from '../../../pages/events/styles/theme'

interface CategorySummaryGridProps {
  isLoading: boolean
  dbCategories: EventCategoryDto[]
  events: HistoricalEvent[]
}

export const CategorySummaryGrid: React.FC<CategorySummaryGridProps> = ({
  isLoading,
  dbCategories,
  events,
}) => {
  // 카테고리 카운트
  const categoryCounts = useMemo(() => {
    return events.reduce<Record<HistoricalEventCategory, number>>(
      (acc, event) => {
        acc[event.category] = (acc[event.category] ?? 0) + 1
        return acc
      },
      {
        military: 0,
        political: 0,
        economic: 0,
        social: 0,
        technological: 0,
        cultural: 0,
        diplomatic: 0,
        conference: 0,
        religious: 0,
        other: 0,
      },
    )
  }, [events])

  return (
    <Skeleton.CategorySummaryGrid>
      {isLoading
        ? [...Array(5)].map((_, index) => (
            <Skeleton.SkeletonCategorySummaryCard key={index}>
              <Skeleton.SkeletonIconBubble />
              <div style={{ flex: 1 }}>
                <Skeleton.SkeletonText $width="60%" />
                <div style={{ marginTop: '8px' }}>
                  <Skeleton.SkeletonText $width="40%" />
                </div>
              </div>
            </Skeleton.SkeletonCategorySummaryCard>
          ))
        : dbCategories.map((dbCat) => {
            const categoryKey = extractCategoryKey(dbCat.id)
            const Icon =
              CATEGORY_ICON_MAP[dbCat.name] ||
              CATEGORY_ICON_MAP[categoryKey] ||
              FiFileText

            return (
              <Skeleton.CategorySummaryCard
                key={dbCat.id}
                $category={categoryKey as HistoricalEventCategory}
              >
                <Skeleton.CategoryIconBubble
                  $category={categoryKey as HistoricalEventCategory}
                >
                  <Icon />
                </Skeleton.CategoryIconBubble>
                <Skeleton.CategorySummaryContent>
                  <Skeleton.CategorySummaryTitle>
                    {dbCat.name}
                  </Skeleton.CategorySummaryTitle>
                  <Skeleton.CategorySummaryCount>
                    {categoryCounts[categoryKey as HistoricalEventCategory] ??
                      0}
                    건
                  </Skeleton.CategorySummaryCount>
                  <Skeleton.CategorySummaryTagline
                    $category={categoryKey as HistoricalEventCategory}
                  >
                    {CATEGORY_COLORS[categoryKey]?.tagline ||
                      dbCat.description ||
                      ''}
                  </Skeleton.CategorySummaryTagline>
                </Skeleton.CategorySummaryContent>
              </Skeleton.CategorySummaryCard>
            )
          })}
    </Skeleton.CategorySummaryGrid>
  )
}

