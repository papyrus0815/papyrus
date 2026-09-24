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

import { metaPartText, type EntitySidebarItem } from '../model/types'

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
  /** 이름 줄 수 — 2 이상이면 말줄임 대신 접는다 (제목이 문장인 도메인) */
  titleLines?: number
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
  titleLines,
  onSelect,
  onTogglePin,
}: EntitySidebarRowProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  // 행 accent가 있으면 배지만 그 색을 쓴다 — 좌측 strip은 '어느 그룹의 선택인지'라는
  // 원래 의미를 지켜야 하므로 그룹 색 그대로다.
  const badgeAccent = item.accentColor ?? accentColor

  // 빈 조각을 먼저 걸러야 점 구분자가 값 없이 뜨지 않는다
  const metaParts = (item.meta ?? [])
    .map((part) => ({
      text: metaPartText(part).trim(),
      shrink: typeof part === 'object' && !!part && !!part.shrink,
      tone: typeof part === 'object' && !!part ? part.tone : undefined,
    }))
    .filter((part) => part.text.length > 0)
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
      aria-label={item.ariaLabel}
      $active={item.id === selectedId}
      $accentColor={accentColor}
      onClick={() => onSelect(item.id)}
    >
      <S.RowTop>
        <S.RowLeft>
          {item.lead !== undefined && item.lead !== null ? (
            <S.RowLead aria-hidden>{item.lead}</S.RowLead>
          ) : item.thumbnailUrl ? (
            <S.ThumbnailAvatar>
              <img src={item.thumbnailUrl} alt={item.name} loading="lazy" />
            </S.ThumbnailAvatar>
          ) : item.noBadge ? null : (
            <S.AvatarBadge
              style={{
                background: S.withAlpha(badgeAccent, 0.14),
                color: S.getBadgeTextColor(badgeAccent, isDark),
              }}
              aria-hidden
            >
              {item.badgeIcon ?? item.badgeText ?? item.name.slice(0, 1)}
            </S.AvatarBadge>
          )}
          <S.TextStack>
            <S.CodeText $unread={false} $lines={titleLines} title={item.name}>
              {item.name}
              {item.mark}
            </S.CodeText>
            {metaParts.length > 0 && (
              <S.SubMeta>
                {metaParts.map((part, index) => (
                  <React.Fragment key={`${part.text}-${index}`}>
                    {index > 0 && <span className="dot" />}
                    {part.shrink ? (
                      <S.SubMetaText
                        title={part.text}
                        style={part.tone ? { color: part.tone } : undefined}
                      >
                        {part.text}
                      </S.SubMetaText>
                    ) : (
                      <span style={part.tone ? { color: part.tone } : undefined}>
                        {part.text}
                      </span>
                    )}
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
