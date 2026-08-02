/**
 * 부모 클릭 시 떠오르는 역사 국가 popover (말풍선).
 *
 * - chevron 클릭 시 anchorRect 기준 우측에 떠오름
 * - 좌측 말꼬리(arrow)가 부모 행을 가리킴
 * - 외부 클릭 / ESC / 자식 선택 / 다른 부모 chevron → 닫힘
 * - 화면 우측 끝이면 자동으로 좌측으로 flip
 * - 화면 하단 넘어가면 위로 정렬
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { FaLandmark } from 'react-icons/fa'
import styled, { useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getUploadImageUrl } from '@/shared/api/upload'
import { formatCountryPeriod } from '@/shared/lib/country-period'
import { Z_INDEX } from '@/shared/styles/z-index'

import { getBadgeTextColor, withAlpha } from '../model/continent-colors'
import * as S from './country-list.styles'

const POPOVER_WIDTH = 240
const POPOVER_GAP = 18 // anchor와 popover 사이 간격 (말풍선 꼬리 + 여백)
const POPOVER_MAX_HEIGHT = 480 // popover 최대 높이 — 더 길면 내부 스크롤
const ROW_HEIGHT = 46 // 자식 행 + 헤더 추정 — max-height 계산용
const HEADER_HEIGHT = 70

/** anchor의 가장 가까운 스크롤 가능한 조상 element */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el || typeof window === 'undefined') return null
  let p: HTMLElement | null = el.parentElement
  while (p) {
    const overflow = window.getComputedStyle(p).overflowY
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
      return p
    }
    p = p.parentElement
  }
  return null
}

interface CountryListChildrenPopoverProps {
  parent: UnifiedCountry
  /** chevron 버튼 element — 스크롤 시 popover 위치 추적용 */
  anchorEl: HTMLElement
  selectedId: string | null
  accentColor?: string
  onSelect: (id: string) => void
  onClose: () => void
  onContextMenu?: (country: UnifiedCountry, e: React.MouseEvent) => void
}

const isoBadgeStyle = (color?: string, isDark = false) =>
  color
    ? {
        background: withAlpha(color, 0.14),
        color: getBadgeTextColor(color, isDark),
      }
    : undefined

export function CountryListChildrenPopover({
  parent,
  anchorEl,
  selectedId,
  accentColor,
  onSelect,
  onClose,
  onContextMenu,
}: CountryListChildrenPopoverProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    top: number
    left: number
    flipped: boolean
    arrowTop: number
  }>(() => ({
    top: -9999, // 첫 layout 전엔 화면 밖
    left: -9999,
    flipped: false,
    arrowTop: 16,
  }))

  const children =
    parent.type === 'modern' ? (parent.historicalCountries ?? []) : []

  // 위치 계산 — anchor element의 현재 rect 기준. 스크롤·리사이즈 시 매번 재계산.
  const updatePosition = React.useCallback(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const popH = Math.min(
      POPOVER_MAX_HEIGHT,
      vh - 40,
      HEADER_HEIGHT + Math.max(1, children.length) * ROW_HEIGHT + 24,
    )

    let left = rect.right + POPOVER_GAP
    let flipped = false
    if (left + POPOVER_WIDTH > vw - 12) {
      left = rect.left - POPOVER_GAP - POPOVER_WIDTH
      flipped = true
    }

    let top = rect.top + rect.height / 2 - popH / 2
    top = Math.max(12, Math.min(top, vh - popH - 12))

    const arrowCenterAbs = rect.top + rect.height / 2
    // arrow가 popover 둥근 모서리(14px) 안으로 너무 들어가지 않게 18px 보정
    const arrowTop = Math.max(18, Math.min(popH - 18, arrowCenterAbs - top))

    setPos({ top, left, flipped, arrowTop })
  }, [anchorEl, children.length])

  // 마운트 시 한 번 + dep 변경 시 재계산
  useLayoutEffect(() => {
    updatePosition()
  }, [updatePosition])

  // 스크롤·리사이즈 시 popover 위치 추적 (닫지 않음, anchor 따라감)
  useEffect(() => {
    const handler = () => updatePosition()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [updatePosition])

  // anchor가 사이드바 안에서 스크롤로 가려지거나 viewport 밖으로 나가면 자동 닫힘.
  // scroll 부모(사이드바 스크롤 영역)를 IntersectionObserver root로 → 사이드바 안 가려짐 감지.
  useEffect(() => {
    if (!anchorEl || typeof IntersectionObserver === 'undefined') return
    const scrollParent = findScrollParent(anchorEl)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            onClose()
            return
          }
        }
      },
      { root: scrollParent, threshold: 0.01 },
    )
    observer.observe(anchorEl)
    return () => observer.disconnect()
  }, [anchorEl, onClose])

  // 외부 클릭 / ESC 닫힘
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        // anchor 자체 클릭은 toggle로 처리되므로 popover에서 닫지 않음
        if (anchorEl && anchorEl.contains(e.target as Node)) return
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, anchorEl])

  return createPortal(
    <Pop
      ref={popRef}
      role="dialog"
      aria-label={`${parent.name}의 역사 국가`}
      $flipped={pos.flipped}
      style={{ top: pos.top, left: pos.left }}
    >
      <Arrow $flipped={pos.flipped} style={{ top: pos.arrowTop }}>
        <svg
          width="12"
          height="20"
          viewBox="0 0 12 20"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M12 0 L0 10 L12 20 Z"
            fill="var(--pop-bg)"
            stroke="var(--pop-border)"
            strokeWidth="1"
            strokeLinejoin="miter"
          />
          {/* Inner 테두리와 만나는 우측 모서리 — 1px 흰 선으로 stroke 가림 */}
          <line
            x1="12"
            y1="0"
            x2="12"
            y2="20"
            stroke="var(--pop-bg)"
            strokeWidth="2"
          />
        </svg>
      </Arrow>
      <Inner>
      <S.ChildrenHeader>
        <S.ChildrenHeaderTopRow>
          {parent.thumbnailUrl ? (
            <S.ThumbnailAvatar>
              <img
                src={getUploadImageUrl(parent.thumbnailUrl)}
                alt={parent.name}
              />
            </S.ThumbnailAvatar>
          ) : (
            <S.IsoBadge style={isoBadgeStyle(accentColor, isDark)} aria-hidden>
              {parent.type === 'modern' && parent.isoCode
                ? parent.isoCode
                : parent.name.slice(0, 2)}
            </S.IsoBadge>
          )}
          <S.ChildrenHeaderName title={parent.name}>
            {parent.name}
          </S.ChildrenHeaderName>
        </S.ChildrenHeaderTopRow>
        <S.ChildrenHeaderMeta>
          역사 국가
          <span className="count">{children.length}</span>
        </S.ChildrenHeaderMeta>
      </S.ChildrenHeader>
      <S.ChildrenScroll>
        {children.length === 0 ? (
          <S.ChildrenEmpty>등록된 역사 국가가 없습니다.</S.ChildrenEmpty>
        ) : (
          children.map((historical) => {
            // BC-safe 존속기간 — 원시 연도 출력은 BC를 AD로 오독시킨다(F6)
            const periodText = formatCountryPeriod(historical, {
              variant: 'short',
            })
            return (
            <S.ListRow
              key={historical.id}
              role="option"
              tabIndex={-1}
              aria-selected={historical.id === selectedId}
              $active={historical.id === selectedId}
              $historicalActive={historical.id === selectedId}
              $accentColor={accentColor}
              $compact
              onClick={() => {
                onSelect(historical.id)
                onClose()
              }}
              onContextMenu={(e) =>
                onContextMenu?.(
                  {
                    ...historical,
                    type: 'historical',
                  } as unknown as UnifiedCountry,
                  e,
                )
              }
            >
              <S.RowTop>
                <S.RowLeft>
                  {historical.thumbnailUrl ? (
                    <S.ThumbnailAvatar $size="sm">
                      <img
                        src={getUploadImageUrl(historical.thumbnailUrl)}
                        alt={historical.name}
                      />
                    </S.ThumbnailAvatar>
                  ) : (
                    <S.IsoBadge
                      $size="sm"
                      style={isoBadgeStyle(accentColor, isDark)}
                      aria-hidden
                    >
                      <FaLandmark />
                    </S.IsoBadge>
                  )}
                  <S.TextStack>
                    <S.CodeText $unread={false} title={historical.name}>
                      {historical.name}
                    </S.CodeText>
                    <S.SubMeta>
                      {periodText && <span>{periodText}</span>}
                    </S.SubMeta>
                  </S.TextStack>
                </S.RowLeft>
              </S.RowTop>
            </S.ListRow>
            )
          })
        )}
      </S.ChildrenScroll>
      </Inner>
    </Pop>,
    document.body,
  )
}

const Pop = styled.div<{ $flipped: boolean }>`
  position: fixed;
  width: ${POPOVER_WIDTH}px;
  max-height: min(${POPOVER_MAX_HEIGHT}px, calc(100vh - 24px));
  z-index: ${Z_INDEX.DROPDOWN};
  /* overflow visible — arrow가 Pop 밖으로 나갈 수 있게. 둥근 모서리는 Inner가 처리 */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.06))
    drop-shadow(0 14px 30px rgba(0, 0, 0, 0.18));
  animation: popoverIn 0.16s cubic-bezier(0.34, 1.4, 0.64, 1);
  /* flipped 시 우측에서 등장하므로 origin도 right로 */
  transform-origin: ${({ $flipped }) =>
    $flipped ? 'right center' : 'left center'};
  /* Arrow SVG에서 fill/stroke 사용 */
  --pop-bg: ${({ theme }) => theme.colors.background.primary};
  --pop-border: ${({ theme }) => theme.colors.border.default};

  @keyframes popoverIn {
    from {
      opacity: 0;
      transform: scale(0.92);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`

const Inner = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: min(${POPOVER_MAX_HEIGHT}px, calc(100vh - 24px));
  /* height: 100% 제거 — 자식 적을 땐 콘텐츠 기반으로 자연스럽게 줄어듦 */
`

/** 말풍선 꼬리 — SVG path 삼각형. flipped 시 좌우 반전 */
const Arrow = styled.div<{ $flipped: boolean }>`
  position: absolute;
  width: 12px;
  height: 20px;
  pointer-events: none;
  margin-top: -10px;
  ${({ $flipped }) =>
    $flipped
      ? `right: -12px; transform: scaleX(-1);`
      : `left: -12px;`}

  > svg {
    display: block;
    width: 100%;
    height: 100%;
  }
`
