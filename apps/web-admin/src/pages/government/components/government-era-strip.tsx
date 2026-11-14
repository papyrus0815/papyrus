import React, { useMemo, useState } from 'react'

import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerChipFill,
  ledgerHairline,
  ledgerHoverFill,
  ledgerSurface,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { formatCenturyLabel } from '@/shared/lib/iso-date'

export interface GovernmentCenturyBucket {
  key: string
  century: number | null
  count: number
}

export interface GovernmentDecadeBucket {
  key: string
  decadeStartYear: number
  centuryKey: string
  count: number
}

export interface GovernmentEraStripProps {
  buckets: GovernmentCenturyBucket[]
  decadeBuckets?: GovernmentDecadeBucket[]
  activeCenturyKey: string | null
  onJumpToCentury: (centuryKey: string) => void
  onJumpToDecade?: (decadeBucket: GovernmentDecadeBucket) => void
  activeYearValue: string
  currentOnly: boolean
  showCurrentToggle: boolean
  onSelectPresetYear: (presetYear: number) => void
  onToggleCurrentOnly: () => void
  undatedCount: number
}

const SNAPSHOT_YEAR_PRESETS: readonly number[] = [1914, 1939, 1945, 1991, 2025]

function formatDecadeShortTick(decadeStartYear: number): string {
  if (decadeStartYear < 0) {
    return `BC${Math.abs(decadeStartYear)}s`
  }
  return `${decadeStartYear}s`
}

export const GovernmentEraStrip: React.FC<GovernmentEraStripProps> = ({
  buckets,
  decadeBuckets = [],
  activeCenturyKey,
  onJumpToCentury,
  onJumpToDecade,
  activeYearValue,
  currentOnly,
  showCurrentToggle,
  onSelectPresetYear,
  onToggleCurrentOnly,
  undatedCount,
}) => {
  const [granularityOverride, setGranularityOverride] = useState<
    'auto' | 'century' | 'decade'
  >('auto')

  const { chronologicalBuckets, maxCenturyCount } = useMemo(() => {
    const datedOnly = buckets
      .filter(
        (bucketItem): bucketItem is GovernmentCenturyBucket & { century: number } =>
          bucketItem.century != null && bucketItem.count > 0,
      )
      .sort((leftBucket, rightBucket) => leftBucket.century - rightBucket.century)

    let highest = 1
    for (const item of datedOnly) {
      if (item.count > highest) highest = item.count
    }
    return {
      chronologicalBuckets: datedOnly,
      maxCenturyCount: highest,
    }
  }, [buckets])

  const { sortedDecadeBuckets, maxDecadeCount } = useMemo(() => {
    const sorted = [...decadeBuckets]
      .filter((decadeItem) => decadeItem.count > 0)
      .sort(
        (leftDecade, rightDecade) =>
          leftDecade.decadeStartYear - rightDecade.decadeStartYear,
      )
    let highest = 1
    for (const decadeItem of sorted) {
      if (decadeItem.count > highest) highest = decadeItem.count
    }
    return {
      sortedDecadeBuckets: sorted,
      maxDecadeCount: highest,
    }
  }, [decadeBuckets])

  const canShowDecadeMode =
    sortedDecadeBuckets.length > 1 && sortedDecadeBuckets.length <= 28
  const autoPrefersDecade =
    canShowDecadeMode &&
    chronologicalBuckets.length >= 1 &&
    chronologicalBuckets.length <= 2
  const effectiveMode: 'century' | 'decade' =
    granularityOverride === 'decade' && canShowDecadeMode
      ? 'decade'
      : granularityOverride === 'century'
        ? 'century'
        : autoPrefersDecade
          ? 'decade'
          : 'century'

  const parsedActiveYear = activeYearValue.trim()
    ? Number.parseInt(activeYearValue.trim(), 10)
    : Number.NaN

  if (chronologicalBuckets.length === 0 && !showCurrentToggle) {
    return null
  }

  return (
    <StripContainer role="navigation" aria-label="시대 분포 및 동시대 시점 탐색">
      <HistogramZone>
        <StripLabelGroup>
          <StripSectionLabel>
            {effectiveMode === 'decade' ? '10년 분포' : '시대 분포'}
          </StripSectionLabel>
          {canShowDecadeMode && chronologicalBuckets.length > 0 ? (
            <GranularityToggleGroup role="group" aria-label="분포 단위 전환">
              <GranularityBtn
                type="button"
                $active={effectiveMode === 'century'}
                onClick={() => setGranularityOverride('century')}
              >
                세기
              </GranularityBtn>
              <GranularityBtn
                type="button"
                $active={effectiveMode === 'decade'}
                onClick={() => setGranularityOverride('decade')}
              >
                10년
              </GranularityBtn>
            </GranularityToggleGroup>
          ) : null}
        </StripLabelGroup>

        {effectiveMode === 'decade' && sortedDecadeBuckets.length > 0 ? (
          <BarTrack>
            {sortedDecadeBuckets.map((decadeItem) => {
              const ratio = Math.sqrt(decadeItem.count / maxDecadeCount)
              const barHeightPx = Math.max(4, Math.round(ratio * 22))
              const isYearInDecade =
                Number.isFinite(parsedActiveYear) &&
                parsedActiveYear >= decadeItem.decadeStartYear &&
                parsedActiveYear <= decadeItem.decadeStartYear + 9
              const isHighlighted =
                isYearInDecade ||
                (!Number.isFinite(parsedActiveYear) &&
                  activeCenturyKey === decadeItem.centuryKey &&
                  chronologicalBuckets.length > 1)
              const tickLabel = formatDecadeShortTick(decadeItem.decadeStartYear)
              return (
                <CenturyBarBtn
                  key={decadeItem.key}
                  type="button"
                  $active={isHighlighted}
                  onClick={() => {
                    if (onJumpToDecade) {
                      onJumpToDecade(decadeItem)
                    } else {
                      onJumpToCentury(decadeItem.centuryKey)
                    }
                  }}
                  title={`${tickLabel} · ${decadeItem.count}건 (클릭 시 이동)`}
                >
                  <BarColumnWrap>
                    <BarFill
                      $active={isHighlighted}
                      style={{ height: `${barHeightPx}px` }}
                    />
                  </BarColumnWrap>
                  <BarTick $active={isHighlighted}>{tickLabel}</BarTick>
                </CenturyBarBtn>
              )
            })}
            {undatedCount > 0 ? (
              <UndatedJumpChip
                type="button"
                $active={activeCenturyKey === '__undated__'}
                onClick={() => onJumpToCentury('__undated__')}
                title={`연대 미상 ${undatedCount}건으로 이동`}
              >
                미상 {undatedCount}
              </UndatedJumpChip>
            ) : null}
          </BarTrack>
        ) : chronologicalBuckets.length > 0 ? (
          <BarTrack>
            {chronologicalBuckets.map((bucketItem) => {
              const ratio = Math.sqrt(bucketItem.count / maxCenturyCount)
              const barHeightPx = Math.max(4, Math.round(ratio * 22))
              const isSelected = activeCenturyKey === bucketItem.key
              const labelText = formatCenturyLabel(bucketItem.century)
              const shortTick =
                bucketItem.century < 0
                  ? `BC${Math.abs(bucketItem.century)}`
                  : `${bucketItem.century}c`
              return (
                <CenturyBarBtn
                  key={bucketItem.key}
                  type="button"
                  $active={isSelected}
                  onClick={() => onJumpToCentury(bucketItem.key)}
                  title={`${labelText} · ${bucketItem.count}건 (클릭 시 해당 세기로 이동)`}
                >
                  <BarColumnWrap>
                    <BarFill
                      $active={isSelected}
                      style={{ height: `${barHeightPx}px` }}
                    />
                  </BarColumnWrap>
                  <BarTick $active={isSelected}>{shortTick}</BarTick>
                </CenturyBarBtn>
              )
            })}
            {undatedCount > 0 ? (
              <UndatedJumpChip
                type="button"
                $active={activeCenturyKey === '__undated__'}
                onClick={() => onJumpToCentury('__undated__')}
                title={`연대 미상 ${undatedCount}건으로 이동`}
              >
                미상 {undatedCount}
              </UndatedJumpChip>
            ) : null}
          </BarTrack>
        ) : (
          <EmptyEraText>표시할 시대 분포 없음</EmptyEraText>
        )}
      </HistogramZone>

      <SnapshotZone>
        <StripSectionLabel>동시대 단면</StripSectionLabel>
        {showCurrentToggle ? (
          <SnapshotChip
            type="button"
            $active={currentOnly}
            onClick={onToggleCurrentOnly}
          >
            현직 정부
          </SnapshotChip>
        ) : null}
        {SNAPSHOT_YEAR_PRESETS.map((presetYear) => {
          const isYearActive =
            !currentOnly && activeYearValue.trim() === String(presetYear)
          return (
            <SnapshotChip
              key={presetYear}
              type="button"
              $active={isYearActive}
              onClick={() => onSelectPresetYear(presetYear)}
            >
              {presetYear}년
            </SnapshotChip>
          )
        })}
      </SnapshotZone>
    </StripContainer>
  )
}

const StripContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 6px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSurface(theme.mode)};
`

const HistogramZone = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const StripLabelGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const GranularityToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 1px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerChipFill(theme.mode)};
`

const GranularityBtn = styled.button<{ $active: boolean }>`
  padding: 1px 5px;
  border-radius: 3px;
  border: none;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const SnapshotZone = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  flex-wrap: wrap;
`

const StripSectionLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const BarTrack = styled.div`
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  padding: 2px 0;
`

const CenturyBarBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 26px;
  padding: 2px 4px;
  border-radius: ${RADIUS.XS};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : 'transparent'};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  cursor: pointer;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const BarColumnWrap = styled.div`
  height: 22px;
  width: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`

const BarFill = styled.div<{ $active: boolean }>`
  width: 10px;
  border-radius: 2px 2px 0 0;
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.45)'
        : 'rgba(100, 116, 139, 0.38)'};
  transition: height 0.16s ease, background 0.14s ease;
`

const BarTick = styled.span<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  font-size: 9.5px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  line-height: 1;
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const UndatedJumpChip = styled.button<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  align-self: center;
  margin-left: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
`

const SnapshotChip = styled.button<{ $active: boolean }>`
  ${DIGIT_DISPLAY}
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? ledgerAccentBorder(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : ledgerChipFill(theme.mode)};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme, $active }) =>
      $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  }
`

const EmptyEraText = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
