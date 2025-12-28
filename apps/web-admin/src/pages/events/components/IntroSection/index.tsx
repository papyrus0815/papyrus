/**
 * IntroSection Component
 * 페이지 상단 소개 섹션 (통계 + 카테고리 요약)
 */
import React from 'react'

import { FiFileText } from 'react-icons/fi'

import {
  CATEGORY_ICON_MAP,
  CATEGORY_LABEL,
} from '../../create/events.constants'
import type { HistoricalEventCategory } from '../../create/events.types'
import { CATEGORY_COLORS } from '../../styles/theme'
import * as S from './IntroSection.styles'

interface IntroSectionProps {
  isLoading: boolean
  centuriesCount: number
  eventsCount: number
  totalNations: number
  uniqueTagCount: number
  categoryCounts: Record<HistoricalEventCategory, number>
}

export const IntroSection: React.FC<IntroSectionProps> = ({
  isLoading,
  centuriesCount,
  eventsCount,
  totalNations,
  uniqueTagCount,
  categoryCounts,
}) => {
  return (
    <S.Container>
      <S.HighlightRow>
        {isLoading ? (
          <>
            {[...Array(4)].map((_, index) => (
              <S.SkeletonHighlight key={index}>
                <S.SkeletonText $width="50%" />
                <S.SkeletonText $width="70%" />
              </S.SkeletonHighlight>
            ))}
          </>
        ) : (
          <>
            <S.Highlight>
              <strong>{centuriesCount}</strong>
              <span>세기 범위</span>
            </S.Highlight>
            <S.Highlight>
              <strong>{eventsCount}</strong>
              <span>수록 사건</span>
            </S.Highlight>
            <S.Highlight>
              <strong>{totalNations}</strong>
              <span>누적 참여국</span>
            </S.Highlight>
            <S.Highlight>
              <strong>{uniqueTagCount}</strong>
              <span>연관 태그</span>
            </S.Highlight>
          </>
        )}
      </S.HighlightRow>

      <S.CategoryGrid>
        {isLoading
          ? [...Array(5)].map((_, index) => (
              <S.SkeletonCategoryCard key={index}>
                <S.SkeletonIconBubble />
                <div style={{ flex: 1 }}>
                  <S.SkeletonText $width="60%" />
                  <div style={{ marginTop: '8px' }}>
                    <S.SkeletonText $width="40%" />
                  </div>
                </div>
              </S.SkeletonCategoryCard>
            ))
          : (Object.keys(CATEGORY_LABEL) as HistoricalEventCategory[]).map(
              (category) => {
                const Icon = CATEGORY_ICON_MAP[category] || FiFileText
                const theme = CATEGORY_COLORS[category]

                return (
                  <S.CategoryCard key={category}>
                    <S.IconBubble $category={category}>
                      <Icon />
                    </S.IconBubble>
                    <S.CategoryContent>
                      <S.CategoryTitle>
                        {CATEGORY_LABEL[category] || category}
                      </S.CategoryTitle>
                      <S.CategoryCount>
                        {categoryCounts[category] ?? 0}건
                      </S.CategoryCount>
                      <S.CategoryTagline>
                        {theme?.tagline || ''}
                      </S.CategoryTagline>
                    </S.CategoryContent>
                  </S.CategoryCard>
                )
              },
            )}
      </S.CategoryGrid>
    </S.Container>
  )
}
