/**
 * 사이드바 목록 한 행 — 모든 도메인 공용.
 *
 * 좌측 썸네일(없으면 대체 배지) · 이름(+표식) · 둘째 줄 메타 · 우측 핀/수치.
 * 조판은 shared/ui/sidebar-list, 값은 EntitySidebarItem 계약만 본다.
 */
import React from 'react'

import { FaRegStar, FaStar } from 'react-icons/fa'
import { useTheme } from 'styled-components'

import * as S from '@/shared/ui/sidebar-list'

import type { EntitySidebarItem } from '../model/types'

interface EntitySidebarRowProps {
  item: EntitySidebarItem
  /** 빠른 접근 그룹의 행인지 — 통상 그룹과 앵커 id가 겹치지 않게 한다 */
  isQuickAccess: boolean
  /** 행 앵커 id 접두어 — 선택 항목 스크롤용 (`${idPrefix}-${item.id}`) */
  idPrefix: string
  selectedId: string | null
  accentColor: string
  rowIndex: number
  /** roving tabindex — 목록의 단일 Tab 진입점이면 true */
  isTabStop: boolean
  pinned?: boolean
  onSelect: (id: string) => void
  onTogglePin?: (id: string) => void
}

function EntitySidebarRowBase({
  item,
  isQuickAccess,
  idPrefix,
  selectedId,
  accentColor,
  rowIndex,
  isTabStop,
  pinned,
  onSelect,
  onTogglePin,
}: EntitySidebarRowProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  // 빈 조각을 먼저 걸러야 점 구분자가 값 없이 뜨지 않는다
  const metaParts = (item.meta ?? []).filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  )
  const hasMetric =
    item.metric !== null &&
    item.metric !== undefined &&
    item.metric !== '' &&
    item.metric !== 0

  return (
    <S.ListRow
      id={isQuickAccess ? undefined : `${idPrefix}-${item.id}`}
      role="option"
      tabIndex={isTabStop ? 0 : -1}
      data-row-index={rowIndex}
      aria-selected={item.id === selectedId}
      $active={item.id === selectedId}
      $accentColor={accentColor}
      onClick={() => onSelect(item.id)}
    >
      <S.RowTop>
        <S.RowLeft>
          {item.thumbnailUrl ? (
            <S.ThumbnailAvatar>
              <img src={item.thumbnailUrl} alt={item.name} loading="lazy" />
            </S.ThumbnailAvatar>
          ) : (
            <S.AvatarBadge
              style={{
                background: S.withAlpha(accentColor, 0.14),
                color: S.getBadgeTextColor(accentColor, isDark),
              }}
              aria-hidden
            >
              {item.badgeIcon ?? item.badgeText ?? item.name.slice(0, 1)}
            </S.AvatarBadge>
          )}
          <S.TextStack>
            <S.CodeText $unread={false} title={item.name}>
              {item.name}
              {item.mark}
            </S.CodeText>
            {metaParts.length > 0 && (
              <S.SubMeta>
                {metaParts.map((part, index) => (
                  <React.Fragment key={`${part}-${index}`}>
                    {index > 0 && <span className="dot" />}
                    <span>{part}</span>
                  </React.Fragment>
                ))}
              </S.SubMeta>
            )}
          </S.TextStack>
        </S.RowLeft>
        <S.RowRight>
          {onTogglePin && (
            <S.PinButton
              type="button"
              $pinned={pinned}
              aria-label={pinned ? '고정 해제' : '고정'}
              title={pinned ? '고정 해제' : '고정'}
              onClick={(event) => {
                event.stopPropagation()
                onTogglePin(item.id)
              }}
            >
              {pinned ? <FaStar size={11} /> : <FaRegStar size={11} />}
            </S.PinButton>
          )}
          {hasMetric && <S.RowMetricBadge>{item.metric}</S.RowMetricBadge>}
        </S.RowRight>
      </S.RowTop>
    </S.ListRow>
  )
}

export const EntitySidebarRow = React.memo(EntitySidebarRowBase)
