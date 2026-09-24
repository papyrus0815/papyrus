/**
 * 국가 리스트 한 행 (parent column 전용).
 *
 * - 자식(historical) 표시는 별도 컬럼(CountryListChildrenColumn)이 담당 — Finder 컬럼 뷰
 * - 행 클릭 → onSelect, 더블클릭 → onEditHistorical (역사 국가만)
 * - 별 버튼은 stopPropagation으로 행 선택과 분리
 * - 좌측: ISO 박스(현대) 또는 SVG fallback(역사) — flagEmoji 미사용
 * - 두 줄: 이름 + 부가(현대=수도·인구·면적 / 역사=영문명·존속기간)
 *   둘째 줄에서 **현재 정렬 기준**(인구순·면적순)에 해당하는 지표만 굵게 — 정렬을 바꿨는데
 *   근거가 화면에 없던 문제(면적순인데 면적 미표시)를 행 안에서 해소한다.
 * - 자식 있는 부모는 우측에 작은 chevron 표시 (현재 컬럼 active로 자식 컬럼 트리거)
 */
import React from 'react'

import { FaStar, FaRegStar, FaLandmark } from 'react-icons/fa'
import styled, { useTheme } from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { getUploadImageUrl } from '@/shared/api/upload'
import { formatCountryPeriod } from '@/shared/lib/country-period'

import { useCountryListState } from '../country-list-state.context'
import { getBadgeTextColor, withAlpha } from '../model/continent-colors'
import * as S from './country-list.styles'

/** 브리지(현대 국가 연결) 없는 역사국가 표식 — 저작 유도용 (F37) */
const UnlinkedBadge = styled.span`
  flex-shrink: 0;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 15px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(245,158,11,0.32)' : '#fde68a'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.14)' : '#fef3c7'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#92400e')};
`

/** 인구 한국어 단위 변환: ≥1억은 "1.4억", 만 단위는 "5,170만" */
function formatPopulation(people: number): string {
  if (people >= 100_000_000) {
    const eok = people / 100_000_000
    return `${eok >= 10 ? Math.round(eok).toLocaleString() : eok.toFixed(1)}억`
  }
  if (people >= 10_000) {
    return `${Math.round(people / 10_000).toLocaleString()}만`
  }
  return people.toLocaleString()
}

/** 면적 한국어 단위 변환: "1,710만 km²" / "4.2만 km²" / "2,586 km²" */
function formatArea(squareKm: number): string {
  if (squareKm >= 100_000) {
    return `${Math.round(squareKm / 10_000).toLocaleString()}만 km²`
  }
  if (squareKm >= 10_000) {
    return `${(squareKm / 10_000).toFixed(1)}만 km²`
  }
  return `${Math.round(squareKm).toLocaleString()} km²`
}

/** population은 BigInt 문자열로도 내려오므로(서버 규약) 수치로 정규화 */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

interface CountryListRowProps {
  country: UnifiedCountry
  isQuickAccess: boolean
  selectedId: string | null
  pinned: boolean
  /** 행 좌측 strip 색 — 대륙 색 (V2). 미지정 시 transparent */
  accentColor?: string
  /** 키보드 nav를 위한 행 인덱스 */
  rowIndex: number
  /** roving tabindex — 목록의 단일 Tab 진입점(선택 행, 없으면 첫 행)이면 true (F11) */
  isTabStop?: boolean
  /** chevron 클릭 시 부모 popover 호출 (M2) */
  childrenPopoverOpenForId?: string | null
  onShowChildren?: (country: UnifiedCountry, anchorEl: HTMLElement) => void
  onSelect: (id: string) => void
  onTogglePin: (id: string) => void
  onEditHistorical?: (country: UnifiedCountry) => void
  /** 우클릭 → 컨텍스트 메뉴 호출 */
  onContextMenu?: (country: UnifiedCountry, e: React.MouseEvent) => void
}

export function CountryListRow({
  country,
  isQuickAccess,
  selectedId,
  pinned,
  accentColor,
  rowIndex,
  isTabStop = false,
  childrenPopoverOpenForId,
  onShowChildren,
  onSelect,
  onTogglePin,
  onEditHistorical,
  onContextMenu,
}: CountryListRowProps) {
  const { unlinkedHistoricalIds, sortBy } = useCountryListState()
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const hasChildren =
    !isQuickAccess &&
    country.type === 'modern' &&
    !!country.historicalCountries &&
    country.historicalCountries.length > 0
  // BC 국가가 AD로 오독되지 않도록 존속기간은 공용 포맷터를 경유 (F7/F37)
  const periodText =
    country.type === 'historical'
      ? formatCountryPeriod(country, { variant: 'short' })
      : ''
  const isUnlinked =
    country.type === 'historical' && unlinkedHistoricalIds.has(country.id)

  // 둘째 줄 지표 — 수도는 실데이터가 없어(0/71) 있을 때만, 인구·면적은 71/71 채워져 있다.
  const population = toFiniteNumber(country.population)
  const area = toFiniteNumber(country.areaSqKm)
  const metrics: { key: 'population' | 'area'; text: string }[] = []
  if (population !== null) {
    metrics.push({ key: 'population', text: formatPopulation(population) })
  }
  if (area !== null) {
    metrics.push({ key: 'area', text: formatArea(area) })
  }

  return (
    <>
      <S.ListRow
        id={isQuickAccess ? undefined : `country-${country.id}`}
        role="option"
        tabIndex={isTabStop ? 0 : -1}
        data-row-index={rowIndex}
        aria-selected={country.id === selectedId}
        $active={country.id === selectedId}
        $accentColor={accentColor}
        onClick={() => onSelect(country.id)}
        onContextMenu={(e) => onContextMenu?.(country, e)}
        onDoubleClick={() => {
          if (country.type === 'historical' && onEditHistorical) {
            onEditHistorical(country)
          }
        }}
      >
        <S.RowTop>
          <S.RowLeft>
            {country.thumbnailUrl ? (
              <S.ThumbnailAvatar>
                <img
                  src={getUploadImageUrl(country.thumbnailUrl)}
                  alt={country.name}
                />
              </S.ThumbnailAvatar>
            ) : (
              <S.IsoBadge
                style={
                  accentColor
                    ? {
                        background: withAlpha(accentColor, 0.14),
                        color: getBadgeTextColor(accentColor, isDark),
                      }
                    : undefined
                }
                aria-hidden
              >
                {country.type === 'modern' ? (
                  country.isoCode ? (
                    country.isoCode
                  ) : (
                    country.name.slice(0, 2)
                  )
                ) : (
                  <FaLandmark />
                )}
              </S.IsoBadge>
            )}
            <S.TextStack>
              <S.CodeText $unread={false} title={country.name}>
                {country.name}
              </S.CodeText>
              <S.SubMeta>
                {country.type === 'modern' ? (
                  <>
                    {country.capital && (
                      <S.SubMetaText>{country.capital}</S.SubMetaText>
                    )}
                    {country.capital && metrics.length > 0 && (
                      <span className="dot" />
                    )}
                    {metrics.map((metric, metricIndex) => (
                      <React.Fragment key={metric.key}>
                        {metricIndex > 0 && <span className="dot" />}
                        <S.SubMetric $emphasized={sortBy === metric.key}>
                          {metric.text}
                        </S.SubMetric>
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  <>
                    {country.enName && (
                      <S.SubMetaText>{country.enName}</S.SubMetaText>
                    )}
                    {country.enName && periodText && <span className="dot" />}
                    {periodText && <span>{periodText}</span>}
                    {isUnlinked && (
                      <UnlinkedBadge title="현대 국가에 연결되지 않음 — 현대 국가 행에서는 찾을 수 없습니다">
                        연결 안 됨
                      </UnlinkedBadge>
                    )}
                  </>
                )}
              </S.SubMeta>
            </S.TextStack>
          </S.RowLeft>
          <S.RowRight>
            <S.PinButton
              type="button"
              $pinned={pinned}
              aria-label={pinned ? '고정 해제' : '고정'}
              title={pinned ? '고정 해제' : '고정'}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(country.id)
              }}
            >
              {pinned ? <FaStar size={11} /> : <FaRegStar size={11} />}
            </S.PinButton>
            {hasChildren && (
              <S.HasChildrenChevron
                type="button"
                aria-label="역사 국가 보기"
                title="역사 국가 보기"
                aria-expanded={childrenPopoverOpenForId === country.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onShowChildren?.(country, e.currentTarget as HTMLButtonElement)
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </S.HasChildrenChevron>
            )}
          </S.RowRight>
        </S.RowTop>
      </S.ListRow>
    </>
  )
}
