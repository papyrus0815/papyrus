/**
 * Flat Ledger Skeleton Primitives — 전 도메인 공용 장부형 스켈레톤 시스템
 *
 * 원칙:
 * 1. 무네온 · 무리퀴드글라스 — `ledger-tokens`의 표면·구분선(`ledgerSubtleFill`, `ledgerHairline`, `ledgerInkLine`, `RADIUS`)만 사용한다.
 * 2. 라이트 · 다크 완벽 대응 — 테마 모드(`theme.mode`)에 따라 잉크 농도를 자동 조절한다.
 * 3. 기하학 1:1 일치 — 실제 장부 테이블·KPI 스트립·2단 마스터-디테일·벤토 카드와 동일한 높이와 간격을 유지해 CLS(레이아웃 점프)를 원천 차단한다.
 * 4. 접근성 준수 — `aria-busy="true"` 및 `@media (prefers-reduced-motion: reduce)` 대응.
 */
import React from 'react'

import styled, { css, keyframes } from 'styled-components'

import {
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerInkLine,
  ledgerSubtleFill,
  ledgerSurface,
  type Mode,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

const ledgerPulse = keyframes`
  0%, 100% {
    opacity: 0.48;
  }
  50% {
    opacity: 0.86;
  }
`

const pulseMotion = css`
  animation: ${ledgerPulse} 1.6s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.68;
  }
`

const resolveMode = (mode?: string): Mode => (mode === 'dark' ? 'dark' : 'light')

const toneFill = (mode: Mode, tone: 'subtle' | 'strong' = 'subtle') =>
  tone === 'strong'
    ? mode === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(15, 23, 42, 0.075)'
    : ledgerSubtleFill(mode)

export const LedgerSkeletonBar = styled.div<{
  $w?: string
  $h?: string
  $radius?: string
  $tone?: 'subtle' | 'strong'
}>`
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '12px'};
  border-radius: ${({ $radius }) => $radius ?? RADIUS.XS};
  background: ${({ theme, $tone }) =>
    toneFill(resolveMode(theme?.mode), $tone ?? 'subtle')};
  flex-shrink: 0;
  ${pulseMotion}
`

export const LedgerSkeletonCircle = styled.div<{
  $size?: number
  $radius?: string
}>`
  width: ${({ $size }) => `${$size ?? 28}px`};
  height: ${({ $size }) => `${$size ?? 28}px`};
  border-radius: ${({ $radius }) => $radius ?? RADIUS.SM};
  background: ${({ theme }) => toneFill(resolveMode(theme?.mode), 'subtle')};
  flex-shrink: 0;
  ${pulseMotion}
`

export const LedgerSkeletonCard = styled.div`
  border-radius: ${RADIUS.MD};
  border: 1px solid
    ${({ theme }) => ledgerHairlineStrong(resolveMode(theme?.mode))};
  background: ${({ theme }) => ledgerSurface(resolveMode(theme?.mode))};
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

/* ── KPI Strip Skeleton ── */

export interface LedgerKpiStripSkeletonProps {
  cells?: number
}

export const LedgerKpiStripSkeleton: React.FC<LedgerKpiStripSkeletonProps> = ({
  cells = 4,
}) => (
  <KpiStrip aria-hidden="true">
    {Array.from({ length: cells }).map((_, idx) => (
      <KpiCell key={idx}>
        <LedgerSkeletonBar $w="46%" $h="10px" />
        <LedgerSkeletonBar $w="64%" $h="18px" $tone="strong" />
      </KpiCell>
    ))}
  </KpiStrip>
)

const KpiStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  border-top: 1px solid ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};
  border-bottom: 1px solid
    ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};
`

const KpiCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 14px;

  & + & {
    border-left: 1px solid
      ${({ theme }) => ledgerHairline(resolveMode(theme?.mode))};
  }
`

/* ── Toolbar Skeleton ── */

export interface LedgerToolbarSkeletonProps {
  pills?: number
}

export const LedgerToolbarSkeleton: React.FC<LedgerToolbarSkeletonProps> = ({
  pills = 3,
}) => (
  <ToolbarRow aria-hidden="true">
    <LedgerSkeletonBar $w="220px" $h="32px" $radius={RADIUS.SM} />
    <ToolbarPills>
      {Array.from({ length: pills }).map((_, idx) => (
        <LedgerSkeletonBar
          key={idx}
          $w={`${56 + ((idx * 14) % 28)}px`}
          $h="26px"
          $radius={RADIUS.SM}
        />
      ))}
    </ToolbarPills>
    <ToolbarSpacer />
    <LedgerSkeletonBar $w="88px" $h="30px" $radius={RADIUS.SM} $tone="strong" />
  </ToolbarRow>
)

const ToolbarRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
`

const ToolbarPills = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const ToolbarSpacer = styled.div`
  flex: 1;
`

/* ── Flat Ledger Table Skeleton ── */

export interface LedgerTableSkeletonProps {
  rows?: number
  columns?: number
  showKpi?: boolean
  showToolbar?: boolean
  label?: string
}

const COL_WIDTHS = ['38%', '24%', '18%', '14%', '12%']

export const LedgerTableSkeleton: React.FC<LedgerTableSkeletonProps> = ({
  rows = 7,
  columns = 4,
  showKpi = false,
  showToolbar = true,
  label = '장부 목록을 불러오는 중',
}) => {
  const safeCols = Math.max(2, Math.min(columns, 5))
  return (
    <TableWrap role="status" aria-busy="true" aria-label={label}>
      {showKpi ? <LedgerKpiStripSkeleton cells={4} /> : null}
      {showToolbar ? <LedgerToolbarSkeleton /> : null}

      <TableSurface aria-hidden="true">
        <TableHeadRow>
          {Array.from({ length: safeCols }).map((_, cIdx) => (
            <TableHeadCell key={cIdx} $flex={cIdx === 0 ? 2.2 : 1}>
              <LedgerSkeletonBar
                $w={cIdx === 0 ? '34%' : '52%'}
                $h="10px"
              />
            </TableHeadCell>
          ))}
        </TableHeadRow>

        {Array.from({ length: rows }).map((_, rIdx) => (
          <TableBodyRow key={rIdx}>
            {Array.from({ length: safeCols }).map((__, cIdx) => {
              const baseW = COL_WIDTHS[cIdx % COL_WIDTHS.length]
              const variedW =
                cIdx === 0
                  ? `${48 + ((rIdx * 13) % 34)}%`
                  : cIdx === safeCols - 1
                    ? '46%'
                    : baseW
              return (
                <TableBodyCell key={cIdx} $flex={cIdx === 0 ? 2.2 : 1}>
                  {cIdx === 0 ? (
                    <PrimaryCellStack>
                      <LedgerSkeletonBar
                        $w={variedW}
                        $h="12.5px"
                        $tone="strong"
                      />
                      {rIdx % 2 === 0 ? (
                        <LedgerSkeletonBar
                          $w={`${28 + ((rIdx * 9) % 24)}%`}
                          $h="9.5px"
                        />
                      ) : null}
                    </PrimaryCellStack>
                  ) : (
                    <LedgerSkeletonBar $w={variedW} $h="11px" />
                  )}
                </TableBodyCell>
              )
            })}
          </TableBodyRow>
        ))}
      </TableSurface>
    </TableWrap>
  )
}

const TableWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`

const TableSurface = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};
`

const TableHeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 10px;
  border-bottom: 1px solid
    ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};
`

const TableHeadCell = styled.div<{ $flex: number }>`
  flex: ${({ $flex }) => $flex};
  min-width: 0;
`

const TableBodyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 10px;
  border-bottom: 1px solid
    ${({ theme }) => ledgerHairline(resolveMode(theme?.mode))};
`

const TableBodyCell = styled.div<{ $flex: number }>`
  flex: ${({ $flex }) => $flex};
  min-width: 0;
`

const PrimaryCellStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

/* ── Split Master-Detail Ledger Skeleton (행정구역 · 군사 · 부처 등 2단 뷰용) ── */

export interface LedgerSplitPaneSkeletonProps {
  rows?: number
  label?: string
}

export const LedgerSplitPaneSkeleton: React.FC<
  LedgerSplitPaneSkeletonProps
> = ({ rows = 7, label = '상세 장부를 불러오는 중' }) => (
  <SplitWrap role="status" aria-busy="true" aria-label={label}>
    <SplitMasterPane aria-hidden="true">
      <LedgerSkeletonBar $w="100%" $h="32px" $radius={RADIUS.SM} />
      <MasterRows>
        {Array.from({ length: rows }).map((_, idx) => (
          <MasterRow key={idx}>
            <LedgerSkeletonCircle $size={22} $radius={RADIUS.XS} />
            <MasterRowLines>
              <LedgerSkeletonBar
                $w={`${52 + ((idx * 11) % 30)}%`}
                $h="11.5px"
                $tone={idx === 0 ? 'strong' : 'subtle'}
              />
              <LedgerSkeletonBar $w={`${30 + ((idx * 7) % 22)}%`} $h="9px" />
            </MasterRowLines>
          </MasterRow>
        ))}
      </MasterRows>
    </SplitMasterPane>

    <SplitDetailPane aria-hidden="true">
      <DetailHeroBlock>
        <LedgerSkeletonBar $w="110px" $h="10px" />
        <LedgerSkeletonBar $w="42%" $h="22px" $tone="strong" />
        <LedgerSkeletonBar $w="68%" $h="12px" />
      </DetailHeroBlock>
      <LedgerKpiStripSkeleton cells={3} />
      <LedgerTableSkeleton rows={5} columns={3} showToolbar={false} />
    </SplitDetailPane>
  </SplitWrap>
)

const SplitWrap = styled.div`
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  gap: 20px;
  width: 100%;
  min-height: 360px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const SplitMasterPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 16px;
  border-right: 1px solid
    ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};

  @media (max-width: 900px) {
    padding-right: 0;
    border-right: none;
  }
`

const MasterRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const MasterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 6px;
  border-radius: ${RADIUS.SM};
`

const MasterRowLines = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const SplitDetailPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`

const DetailHeroBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 4px;
`

/* ── Bento Card Skeleton (국가 종합 대시보드 카드용) ── */

export interface LedgerBentoCardSkeletonProps {
  rows?: number
  showMetric?: boolean
  minHeight?: number
}

export const LedgerBentoCardSkeleton: React.FC<
  LedgerBentoCardSkeletonProps
> = ({ rows = 3, showMetric = true, minHeight = 168 }) => (
  <BentoCardBox $minHeight={minHeight} aria-hidden="true">
    <BentoHead>
      <LedgerSkeletonBar $w="36%" $h="12px" $tone="strong" />
      <LedgerSkeletonBar $w="48px" $h="11px" />
    </BentoHead>
    {showMetric ? (
      <BentoMetricRow>
        <LedgerSkeletonBar $w="44%" $h="22px" $tone="strong" />
        <LedgerSkeletonBar $w="28%" $h="10px" />
      </BentoMetricRow>
    ) : null}
    <BentoList>
      {Array.from({ length: rows }).map((_, idx) => (
        <BentoListItem key={idx}>
          <LedgerSkeletonBar $w={`${54 + ((idx * 15) % 28)}%`} $h="11px" />
          <LedgerSkeletonBar $w="42px" $h="10px" />
        </BentoListItem>
      ))}
    </BentoList>
  </BentoCardBox>
)

const BentoCardBox = styled(LedgerSkeletonCard)<{ $minHeight: number }>`
  min-height: ${({ $minHeight }) => `${$minHeight}px`};
  justify-content: space-between;
`

const BentoHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const BentoMetricRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 0;
`

const BentoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid
    ${({ theme }) => ledgerHairline(resolveMode(theme?.mode))};
`

const BentoListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

/* ── Right Pane Route Suspense Fallback (ContentAreaShell <Outlet /> 전용) ── */

export const LedgerPaneSuspenseFallback: React.FC<{ label?: string }> = ({
  label = '화면을 불러오는 중',
}) => (
  <PaneFallbackRoot role="status" aria-busy="true" aria-label={label}>
    <PaneStickyBar aria-hidden="true">
      <LedgerSkeletonBar $w="140px" $h="14px" $tone="strong" />
      <PaneTabPills>
        {Array.from({ length: 6 }).map((_, idx) => (
          <LedgerSkeletonBar
            key={idx}
            $w={`${48 + ((idx * 11) % 24)}px`}
            $h="12px"
          />
        ))}
      </PaneTabPills>
    </PaneStickyBar>

    <PaneBody aria-hidden="true">
      <PaneHero>
        <PaneHeroIdentity>
          <LedgerSkeletonCircle $size={44} $radius={RADIUS.MD} />
          <PaneHeroTitles>
            <LedgerSkeletonBar $w="200px" $h="22px" $tone="strong" />
            <LedgerSkeletonBar $w="320px" $h="12px" />
          </PaneHeroTitles>
        </PaneHeroIdentity>
      </PaneHero>

      <LedgerKpiStripSkeleton cells={4} />

      <PaneBentoGrid>
        <LedgerBentoCardSkeleton rows={3} />
        <LedgerBentoCardSkeleton rows={3} />
        <LedgerBentoCardSkeleton rows={3} showMetric={false} />
      </PaneBentoGrid>
    </PaneBody>
  </PaneFallbackRoot>
)

const PaneFallbackRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  background: ${({ theme }) => ledgerBackground(resolveMode(theme?.mode))};
`

const PaneStickyBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 48px;
  padding: 0 28px;
  border-bottom: 1px solid
    ${({ theme }) => ledgerInkLine(resolveMode(theme?.mode))};
`

const PaneTabPills = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    display: none;
  }
`

const PaneBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 28px 48px;

  @media (max-width: 768px) {
    padding: 18px 16px 36px;
  }
`

const PaneHero = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`

const PaneHeroIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`

const PaneHeroTitles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PaneBentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`
