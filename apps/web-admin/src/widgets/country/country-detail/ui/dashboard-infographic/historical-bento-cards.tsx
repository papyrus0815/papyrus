import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiEdit2,
  FiGlobe,
  FiMapPin,
  FiPlus,
  FiUser,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  resolveCurrentSystem,
  STATE_STRUCTURE_LABEL,
  toSignedYear,
} from '@/entities/political-system/model/political-system'
import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import type { Country } from '@/entities/country/api'
import type { PoliticalSystem } from '@/shared/api/political-system'
import {
  getHistoricalCountryTerritoryChanges,
  territoryMethodLabel,
  territoryTransferKeys,
} from '@/shared/api/territory-transfers'
import { getUploadImageUrl } from '@/shared/api/upload'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { formatSignedYear } from '@/shared/lib/lifespan-text'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextReadView } from '@/shared/ui/rich-text-read-view'

import type {
  HistoricalLineageNode,
  HistoricalRulerItem,
} from '../../model/use-historical-country-dashboard'
import {
  BentoActionBtn,
  BentoCard,
  BentoCardBadge,
  BentoCardBody,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardTitleGroup,
  BentoDivider,
  BentoHeaderActions,
  BentoPill,
  BentoSubLabel,
  NationalRadarPolygonChart,
  type RadarAxisMetric,
} from './bento-primitives'

/* ─── 1. Historical Polity Identity & Rise-and-Fall Flow Card ────────────── */

export function HistoricalHeroFlowCard({
  countryName,
  periodLabel,
  durationYears,
  stateTypeLabel,
  entityKindLabel,
  effectiveCapital,
  savedDescription,
  nameOrigin,
  historyText,
  isEditorOpen,
  isSaving,
  onEditorChange,
  onOpenEditor,
  onSaveEditor,
  onCancelEditor,
  onEditBasic,
  founding,
  rulersCount,
  rulers = [],
  activeTenureId,
  onFocusRulerTenure,
  onOpenRulersTab,
  politicalSystems,
  onOpenGovernment,
  onOpenSuccession,
  onSelectPerson,
  onSelectEvent,
}: {
  countryName: string
  periodLabel: string
  durationYears: number | null
  stateTypeLabel: string | null
  entityKindLabel: string | null
  effectiveCapital: string
  savedDescription: string | null | undefined
  nameOrigin: string | null | undefined
  historyText: string | null | undefined
  isEditorOpen: boolean
  isSaving: boolean
  onEditorChange: (val: string) => void
  onOpenEditor: () => void
  onSaveEditor: () => void
  onCancelEditor: () => void
  onEditBasic?: () => void
  founding: unknown
  rulersCount: number
  rulers?: HistoricalRulerItem[]
  activeTenureId?: string | null
  onFocusRulerTenure?: (tenureId: string) => void
  onOpenRulersTab?: () => void
  politicalSystems: PoliticalSystem[]
  onOpenGovernment: () => void
  onOpenSuccession: () => void
  onSelectPerson: (personId: string) => void
  onSelectEvent: (eventId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const {
    uniqueRulerCount,
    inferredFirstRuler,
    inferredLastRuler,
    longestReignInfo,
  } = useMemo(() => {
    const byPerson = new Map<
      string,
      HistoricalRulerItem & { minStart: number | null; maxEnd: number | null }
    >()
    for (const ruler of rulers) {
      const key = ruler.personId
        ? `pid:${ruler.personId}`
        : `nm:${ruler.personName.replace(/\s+/g, '')}`
      const existing = byPerson.get(key)
      if (!existing) {
        byPerson.set(key, {
          ...ruler,
          minStart: ruler.startYear,
          maxEnd: ruler.endYear,
        })
      } else {
        if (
          ruler.startYear != null &&
          (existing.minStart == null || ruler.startYear < existing.minStart)
        ) {
          existing.minStart = ruler.startYear
        }
        if (
          ruler.endYear != null &&
          (existing.maxEnd == null || ruler.endYear > existing.maxEnd)
        ) {
          existing.maxEnd = ruler.endYear
        }
        if (!existing.profileImageUrl && ruler.profileImageUrl) {
          existing.profileImageUrl = ruler.profileImageUrl
        }
      }
    }
    const allMerged = [...byPerson.values()]
    const hosPool = allMerged.filter((item) => item.axis === 'HEAD_OF_STATE')
    const anchorPool = (hosPool.length > 0 ? hosPool : allMerged).sort(
      (left, right) =>
        (left.minStart ?? 99999) - (right.minStart ?? 99999) ||
        (left.maxEnd ?? 99999) - (right.maxEnd ?? 99999),
    )

    let longest: { name: string; years: number } | null = null
    for (const item of anchorPool) {
      if (item.minStart != null && item.maxEnd != null) {
        const yrs = Math.max(0, item.maxEnd - item.minStart)
        if (yrs > 0 && (!longest || yrs > longest.years)) {
          longest = { name: item.personName, years: yrs }
        }
      }
    }

    return {
      uniqueRulerCount: allMerged.length,
      inferredFirstRuler: anchorPool[0] ?? null,
      inferredLastRuler:
        anchorPool.length >= 2 ? anchorPool[anchorPool.length - 1] : null,
      longestReignInfo: longest,
    }
  }, [rulers])

  const typedFounding = founding as {
    foundingNote?: string | null
    dissolutionNote?: string | null
    founders?: Array<{ personId?: string; name?: string }>
    dissolvers?: Array<{ personId?: string; name?: string }>
    firstRulers?: Array<{ personId?: string; name?: string; title?: string }>
    lastRulers?: Array<{ personId?: string; name?: string; title?: string }>
    foundedEvent?: { id: string; title: string } | null
    dissolvedEvent?: { id: string; title: string } | null
  } | null

  const currentSystem = useMemo(
    () => resolveCurrentSystem(politicalSystems),
    [politicalSystems],
  )
  const systemLabel = currentSystem?.governmentForm
    ? GOVERNMENT_FORM_LABEL[currentSystem.governmentForm]
    : stateTypeLabel

  const explicitFirst =
    typedFounding?.firstRulers?.find((r) => Boolean(r?.name)) ??
    typedFounding?.founders?.find((r) => Boolean(r?.name)) ??
    null
  const explicitLast =
    typedFounding?.lastRulers?.find((r) => Boolean(r?.name)) ??
    typedFounding?.dissolvers?.find((r) => Boolean(r?.name)) ??
    null

  const firstRuler =
    explicitFirst ??
    (inferredFirstRuler
      ? {
          personId: inferredFirstRuler.personId ?? undefined,
          name: inferredFirstRuler.personName,
          imageUrl: inferredFirstRuler.profileImageUrl,
        }
      : null)
  const lastRuler =
    explicitLast ??
    (inferredLastRuler
      ? {
          personId: inferredLastRuler.personId ?? undefined,
          name: inferredLastRuler.personName,
          imageUrl: inferredLastRuler.profileImageUrl,
        }
      : null)

  const startYearText = periodLabel.split(/[–~]/)[0]?.trim() || null
  const endYearText = /[–~]/.test(periodLabel)
    ? periodLabel.split(/[–~]/)[1]?.trim() || null
    : null

  const hasNarrative = Boolean(
    savedDescription?.trim() || nameOrigin?.trim() || historyText?.trim(),
  )

  return (
    <BentoCard aria-label={`${countryName} 국가 형태 및 통치 요약`}>
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>국가 형태 · 통치 요약</BentoCardTitle>
          {entityKindLabel ? (
            <BentoCardBadge>{entityKindLabel}</BentoCardBadge>
          ) : null}
          {effectiveCapital ? (
            <BentoPill>
              <FiMapPin size={10.5} /> 도성: {effectiveCapital}
            </BentoPill>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn
            type="button"
            $accent
            onClick={onOpenRulersTab ?? onOpenGovernment}
          >
            정부·통치자 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {/* 초대 통치자 ──▶ 존속·통치 요약(총 N대·최장 재위) ──▶ 마지막 통치자 3점 앵커 */}
        <MilestoneFlowGrid>
          <MilestoneStep>
            <MilestoneTag $tone="start">
              초대 · 건국{startYearText ? ` (${startYearText})` : ''}
            </MilestoneTag>
            <MilestoneMain>
              {firstRuler?.name ? (
                <InlinePersonBtn
                  type="button"
                  onClick={() =>
                    firstRuler.personId && onSelectPerson(firstRuler.personId)
                  }
                >
                  {'imageUrl' in firstRuler && firstRuler.imageUrl ? (
                    <AnchorMiniAvatar
                      src={getUploadImageUrl(firstRuler.imageUrl)}
                      alt=""
                    />
                  ) : (
                    <FiUser size={11.5} />
                  )}
                  {firstRuler.name}
                </InlinePersonBtn>
              ) : (
                <span>{startYearText || '시점 미상'}</span>
              )}
            </MilestoneMain>
            {typedFounding?.foundedEvent ? (
              <MilestoneSubBtn
                type="button"
                onClick={() => onSelectEvent(typedFounding.foundedEvent!.id)}
              >
                {typedFounding.foundedEvent.title}
              </MilestoneSubBtn>
            ) : typedFounding?.foundingNote ? (
              <MilestoneSubText>{typedFounding.foundingNote}</MilestoneSubText>
            ) : (
              <MilestoneSubText>창건 · 시조 기록</MilestoneSubText>
            )}
          </MilestoneStep>

          <FlowArrowBox aria-hidden="true">
            <FiArrowRight size={14} />
          </FlowArrowBox>

          <MilestoneStep
            $highlight
            onClick={onOpenRulersTab ?? onOpenGovernment}
            role="button"
            tabIndex={0}
          >
            <MilestoneTag $tone="mid">존속 · 통치 체제</MilestoneTag>
            <MilestoneMain>
              <strong>
                {durationYears != null
                  ? `${durationYears.toLocaleString('ko-KR')}년간 존속`
                  : periodLabel}
              </strong>
            </MilestoneMain>
            <MilestoneSubText>
              {[
                systemLabel,
                currentSystem?.stateStructure
                  ? STATE_STRUCTURE_LABEL[currentSystem.stateStructure]
                  : null,
                uniqueRulerCount > 0
                  ? `수반 총 ${uniqueRulerCount}명`
                  : rulersCount > 0
                    ? `수반 ${rulersCount}명`
                    : null,
                longestReignInfo
                  ? `최장 ${longestReignInfo.name}(${longestReignInfo.years}년)`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || periodLabel}
            </MilestoneSubText>
          </MilestoneStep>

          <FlowArrowBox aria-hidden="true">
            <FiArrowRight size={14} />
          </FlowArrowBox>

          <MilestoneStep onClick={onOpenSuccession} role="button" tabIndex={0}>
            <MilestoneTag $tone="end">
              마지막 · 종식{endYearText ? ` (${endYearText})` : ''}
            </MilestoneTag>
            <MilestoneMain>
              {lastRuler?.name ? (
                <InlinePersonBtn
                  type="button"
                  onClick={(evt) => {
                    evt.stopPropagation()
                    if (lastRuler.personId) onSelectPerson(lastRuler.personId)
                  }}
                >
                  {'imageUrl' in lastRuler && lastRuler.imageUrl ? (
                    <AnchorMiniAvatar
                      src={getUploadImageUrl(lastRuler.imageUrl)}
                      alt=""
                    />
                  ) : (
                    <FiUser size={11.5} />
                  )}
                  {lastRuler.name}
                </InlinePersonBtn>
              ) : (
                <span>{endYearText || '계승 상세'}</span>
              )}
            </MilestoneMain>
            {typedFounding?.dissolvedEvent ? (
              <MilestoneSubBtn
                type="button"
                onClick={(evt) => {
                  evt.stopPropagation()
                  onSelectEvent(typedFounding.dissolvedEvent!.id)
                }}
              >
                {typedFounding.dissolvedEvent.title}
              </MilestoneSubBtn>
            ) : typedFounding?.dissolutionNote ? (
              <MilestoneSubText>
                {typedFounding.dissolutionNote}
              </MilestoneSubText>
            ) : (
              <MilestoneSubText>후신 국가 계승 보기 →</MilestoneSubText>
            )}
          </MilestoneStep>
        </MilestoneFlowGrid>

        {/* 개요 · 국호유래 · 통사 서술 (클램프 또는 인라인 에디터) */}
        {isEditorOpen ? (
          <EditorWrap>
            <RichTextEditor
              value={savedDescription ?? ''}
              onChange={onEditorChange}
              placeholder="역사적 정치체에 대한 핵심 개요를 작성하세요..."
              showTitle={false}
            />
            <EditorBtnRow>
              <BentoActionBtn type="button" onClick={onCancelEditor}>
                취소
              </BentoActionBtn>
              <BentoActionBtn
                type="button"
                $accent
                disabled={isSaving}
                onClick={onSaveEditor}
              >
                {isSaving ? '저장 중…' : '개요 저장'}
              </BentoActionBtn>
            </EditorBtnRow>
          </EditorWrap>
        ) : hasNarrative ? (
          <>
            <BentoDivider />
            <ProseClampArea $expanded={expanded}>
              {savedDescription ? (
                isLikelyRichTextHtml(savedDescription) ? (
                  <RichTextReadView html={savedDescription} />
                ) : (
                  <PlainProse>{savedDescription}</PlainProse>
                )
              ) : null}
              {nameOrigin ? (
                <PlainProse>
                  <strong>국호 유래:</strong> {nameOrigin}
                </PlainProse>
              ) : null}
              {historyText ? (
                <PlainProse>
                  <strong>통사 요약:</strong> {historyText}
                </PlainProse>
              ) : null}
            </ProseClampArea>
            <NarrativeActionRow>
              <ToggleClampBtn
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? '서술 접기' : '서술 전문 펼치기'}
              </ToggleClampBtn>
              <ToggleClampBtn type="button" onClick={onOpenEditor}>
                <FiEdit2 size={10.5} /> 개요 편집
              </ToggleClampBtn>
            </NarrativeActionRow>
          </>
        ) : (
          <ToggleClampBtn type="button" onClick={onOpenEditor}>
            <FiEdit2 size={10.5} /> 역사 개요 작성하기
          </ToggleClampBtn>
        )}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 2. Proportional Ruler Reign Spectrum Bento Card ────────────────────── */

export function HistoricalRulerSpectrumCard({
  rulers,
  politicalSystems = [],
  spanStart,
  spanEnd,
  activeTenureId,
  onFocusRulerTenure,
  onSelectPerson,
  onOpenPoliticalSystem,
  onOpenRulersTab,
}: {
  rulers: HistoricalRulerItem[]
  politicalSystems?: PoliticalSystem[]
  spanStart: number | null
  spanEnd: number | null
  activeTenureId?: string | null
  onFocusRulerTenure?: (tenureId: string) => void
  onSelectPerson: (personId: string) => void
  onOpenPoliticalSystem?: () => void
  onOpenRulersTab: () => void
}) {
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null)
  const inSpanRulers = useMemo(
    () => rulers.filter((r) => !r.isOutOfSpan && r.startYear != null),
    [rulers],
  )

  const { lo, hi, eraSegments, hosSegments, hogSegments, longestRuler } =
    useMemo(() => {
      const years = inSpanRulers.flatMap((r) =>
        [r.startYear, r.endYear].filter((y): y is number => y != null),
      )
      const minY =
        spanStart ?? (years.length > 0 ? Math.min(...years) : 0)
      const maxY =
        spanEnd ?? (years.length > 0 ? Math.max(...years) : minY + 1)
      const safeHi = Math.max(minY + 1, maxY)

      const eraSegs = politicalSystems
        .map((ps, idx) => {
          const rawS = toSignedYear(ps.startEra, ps.startYear)
          if (rawS == null) return null
          const rawE = toSignedYear(ps.endEra, ps.endYear) ?? safeHi
          const s = Math.max(minY, rawS)
          const e = Math.min(safeHi, Math.max(s + 1, rawE))
          const formText = ps.governmentForm
            ? (GOVERNMENT_FORM_LABEL[
                ps.governmentForm as keyof typeof GOVERNMENT_FORM_LABEL
              ] ?? ps.governmentForm)
            : '정체'
          const label = ps.name?.trim() || formText
          return {
            id: ps.id,
            label,
            periodText: formatPeriod(ps),
            leftPct: ((s - minY) / (safeHi - minY)) * 100,
            widthPct: Math.max(2, ((e - s) / (safeHi - minY)) * 100),
            even: idx % 2 === 0,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      const buildSegs = (axis: 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT') =>
        inSpanRulers
          .filter((r) => r.axis === axis && r.startYear != null)
          .map((r, idx) => {
            const s = Math.max(minY, r.startYear!)
            const e = Math.min(safeHi, Math.max(s + 1, r.endYear ?? s + 1))
            return {
              ruler: r,
              leftPct: ((s - minY) / (safeHi - minY)) * 100,
              widthPct: Math.max(1.2, ((e - s) / (safeHi - minY)) * 100),
              even: idx % 2 === 0,
              years: Math.max(1, (r.endYear ?? s) - r.startYear!),
            }
          })

      const hos = buildSegs('HEAD_OF_STATE')
      const hog = buildSegs('HEAD_OF_GOVERNMENT')
      const allSegs = [...hos, ...hog]
      const longest =
        [...allSegs].sort((a, b) => b.years - a.years)[0]?.ruler ?? null

      return {
        lo: minY,
        hi: safeHi,
        eraSegments: eraSegs,
        hosSegments: hos,
        hogSegments: hog,
        longestRuler: longest,
      }
    }, [inSpanRulers, politicalSystems, spanStart, spanEnd])

  if (rulers.length === 0) return null

  const highlightedId = hoveredRecordId ?? activeTenureId ?? null
  const highlightedRuler = highlightedId
    ? (rulers.find((r) => r.recordId === highlightedId) ?? null)
    : null

  const handleRulerAction = (ruler: HistoricalRulerItem) => {
    if (onFocusRulerTenure) {
      onFocusRulerTenure(ruler.recordId)
      return
    }
    if (ruler.personId) onSelectPerson(ruler.personId)
  }

  return (
    <BentoCard aria-label="역대 통치자 치세 스펙트럼">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>역대 통치자 치세 스펙트럼</BentoCardTitle>
          <BentoCardBadge>{rulers.length}명</BentoCardBadge>
          {highlightedRuler ? (
            <BentoPill $accent>
              {highlightedRuler.ordinal != null
                ? `제${highlightedRuler.ordinal}대 `
                : ''}
              {highlightedRuler.personName} (
              {highlightedRuler.startYear != null
                ? formatSignedYear(highlightedRuler.startYear)
                : '?'}{' '}
              ~{' '}
              {highlightedRuler.endYear != null
                ? formatSignedYear(highlightedRuler.endYear)
                : '?'}
              )
            </BentoPill>
          ) : longestRuler ? (
            <BentoPill>최장 재위: {longestRuler.personName}</BentoPill>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          {highlightedRuler?.personId && onFocusRulerTenure ? (
            <BentoActionBtn
              type="button"
              onClick={() => onSelectPerson(highlightedRuler.personId!)}
            >
              {highlightedRuler.personName} 인물 정보
            </BentoActionBtn>
          ) : null}
          <BentoActionBtn type="button" $accent onClick={onOpenRulersTab}>
            통치자·내각 연표 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {eraSegments.length > 0 ? (
          <SpectrumRow>
            <SpectrumAxisLabel>정체·관제</SpectrumAxisLabel>
            <SpectrumTrack>
              {eraSegments.map((seg) => (
                <HistEraBlockBtn
                  key={seg.id}
                  type="button"
                  $even={seg.even}
                  style={{
                    left: `${seg.leftPct}%`,
                    width: `${seg.widthPct}%`,
                  }}
                  title={`${seg.label} (${seg.periodText})`}
                  onClick={() => onOpenPoliticalSystem?.()}
                >
                  {seg.widthPct >= 10 ? <span>{seg.label}</span> : null}
                </HistEraBlockBtn>
              ))}
            </SpectrumTrack>
          </SpectrumRow>
        ) : null}

        {hosSegments.length > 0 ? (
          <SpectrumRow>
            <SpectrumAxisLabel>군주·원수</SpectrumAxisLabel>
            <SpectrumTrack>
              {hosSegments.map((seg) => (
                <SpectrumBlock
                  key={seg.ruler.recordId}
                  type="button"
                  $tone="hos"
                  $even={seg.even}
                  $active={seg.ruler.recordId === highlightedId}
                  style={{
                    left: `${seg.leftPct}%`,
                    width: `${seg.widthPct}%`,
                  }}
                  title={`${seg.ruler.personName} (${seg.ruler.startYear != null ? formatSignedYear(seg.ruler.startYear) : '?'} ~ ${seg.ruler.endYear != null ? formatSignedYear(seg.ruler.endYear) : '?'}) — 클릭하여 당대 마인드맵 전환`}
                  onMouseEnter={() => setHoveredRecordId(seg.ruler.recordId)}
                  onMouseLeave={() => setHoveredRecordId(null)}
                  onClick={() => handleRulerAction(seg.ruler)}
                />
              ))}
            </SpectrumTrack>
          </SpectrumRow>
        ) : null}

        {hogSegments.length > 0 ? (
          <SpectrumRow>
            <SpectrumAxisLabel>수반·재상</SpectrumAxisLabel>
            <SpectrumTrack>
              {hogSegments.map((seg) => (
                <SpectrumBlock
                  key={seg.ruler.recordId}
                  type="button"
                  $tone="hog"
                  $even={seg.even}
                  $active={seg.ruler.recordId === highlightedId}
                  style={{
                    left: `${seg.leftPct}%`,
                    width: `${seg.widthPct}%`,
                  }}
                  title={`${seg.ruler.personName} (${seg.ruler.startYear != null ? formatSignedYear(seg.ruler.startYear) : '?'} ~ ${seg.ruler.endYear != null ? formatSignedYear(seg.ruler.endYear) : '?'}) — 클릭하여 당대 마인드맵 전환`}
                  onMouseEnter={() => setHoveredRecordId(seg.ruler.recordId)}
                  onMouseLeave={() => setHoveredRecordId(null)}
                  onClick={() => handleRulerAction(seg.ruler)}
                />
              ))}
            </SpectrumTrack>
          </SpectrumRow>
        ) : null}

        <SpectrumAxisTicks>
          <span>{formatSignedYear(lo)}</span>
          <span>{formatSignedYear(Math.round((lo + hi) / 2))}</span>
          <span>{formatSignedYear(hi)}</span>
        </SpectrumAxisTicks>

        {/* 주요 통치자 빠른 전환 칩 (클릭 시 상단 마인드맵 즉시 연동) */}
        <RulerChipsWrap>
          {rulers.slice(0, 12).map((r) => {
            const img = r.profileImageUrl
              ? getUploadImageUrl(r.profileImageUrl)
              : null
            const isSelected = r.recordId === activeTenureId
            return (
              <RulerChipBtn
                key={r.recordId}
                type="button"
                $active={isSelected}
                onMouseEnter={() => setHoveredRecordId(r.recordId)}
                onMouseLeave={() => setHoveredRecordId(null)}
                onClick={() => handleRulerAction(r)}
              >
                {img ? <img src={img} alt="" /> : null}
                {r.ordinal != null ? <small>{r.ordinal}대</small> : null}
                <strong>{r.personName}</strong>
              </RulerChipBtn>
            )
          })}
          {rulers.length > 12 ? (
            <MoreChipBtn type="button" onClick={onOpenRulersTab}>
              +{rulers.length - 12}명 전체 보기
            </MoreChipBtn>
          ) : null}
        </RulerChipsWrap>
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 3. Lineage Lifespan Span Bars & Diplomatic Network Card ────────────── */

export function HistoricalLineageDiplomacyCard({
  currentId,
  lineage,
  linkedModernCountries,
  membershipCount,
  relationCount,
  treatyCount,
  onSelectCountry,
  onOpenSuccession,
  onOpenMembership,
  onOpenRelations,
  onOpenTreaties,
}: {
  currentId: string
  lineage: HistoricalLineageNode[]
  linkedModernCountries: Country[]
  membershipCount: number
  relationCount: number
  treatyCount: number
  onSelectCountry: (id: string) => void
  onOpenSuccession: () => void
  onOpenMembership: () => void
  onOpenRelations: () => void
  onOpenTreaties: () => void
}) {
  const spanBars = useMemo(() => {
    const dated = lineage
      .map((n) => {
        const s =
          n.startYear != null
            ? n.startEra === 'BC'
              ? -Math.abs(n.startYear)
              : n.startYear
            : null
        const e =
          n.endYear != null
            ? n.endEra === 'BC'
              ? -Math.abs(n.endYear)
              : n.endYear
            : s
        return { node: n, s, e }
      })
      .filter((item) => item.s != null) as Array<{
      node: HistoricalLineageNode
      s: number
      e: number
    }>
    if (dated.length === 0) return null
    const minY = Math.min(...dated.map((d) => d.s))
    const maxY = Math.max(minY + 1, ...dated.map((d) => d.e))
    return {
      minY,
      maxY,
      rows: dated.slice(0, 9).map((d) => ({
        ...d,
        leftPct: ((d.s - minY) / (maxY - minY)) * 100,
        widthPct: Math.max(2.5, ((Math.max(d.s + 1, d.e) - d.s) / (maxY - minY)) * 100),
      })),
    }
  }, [lineage])

  if (
    lineage.length <= 1 &&
    linkedModernCountries.length === 0 &&
    membershipCount + relationCount + treatyCount === 0
  ) {
    return null
  }

  return (
    <BentoCard aria-label="전후 국가 계보 및 외교 네트워크">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>전후 계승 스팬 · 대외 관계</BentoCardTitle>
          {lineage.length > 1 ? (
            <BentoCardBadge>계보 {lineage.length}개국</BentoCardBadge>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" onClick={onOpenRelations}>
            관계 {relationCount}
          </BentoActionBtn>
          <BentoActionBtn type="button" $accent onClick={onOpenSuccession}>
            계승 상세 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {spanBars ? (
          <SpanChartBox>
            {spanBars.rows.map(({ node, s, e, leftPct, widthPct }) => {
              const isSelf = node.id === currentId
              return (
                <SpanRow
                  key={node.id}
                  type="button"
                  $self={isSelf}
                  onClick={() => !isSelf && onSelectCountry(node.id)}
                >
                  <SpanName $self={isSelf}>{node.name}</SpanName>
                  <SpanTrack>
                    <SpanBar
                      $self={isSelf}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  </SpanTrack>
                  <SpanYears>
                    {formatSignedYear(s)}~{e !== s ? formatSignedYear(e) : ''}
                  </SpanYears>
                </SpanRow>
              )
            })}
          </SpanChartBox>
        ) : null}

        <DiplomacyFooter>
          {membershipCount > 0 ? (
            <BentoActionBtn type="button" onClick={onOpenMembership}>
              소속·구성 정치체 {membershipCount}건
            </BentoActionBtn>
          ) : null}
          {treatyCount > 0 ? (
            <BentoActionBtn type="button" onClick={onOpenTreaties}>
              체결 조약 {treatyCount}건
            </BentoActionBtn>
          ) : null}
          {linkedModernCountries.map((mod) => (
            <BentoActionBtn
              key={mod.id}
              type="button"
              $accent
              onClick={() => onSelectCountry(mod.id)}
            >
              <FiGlobe size={11} /> 현대: {mod.name}
            </BentoActionBtn>
          ))}
        </DiplomacyFooter>
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 4. Diverging Territory Gain/Loss Waterfall Card ────────────────────── */

export function HistoricalTerritoryWaterfallCard({
  historicalCountryId,
  onSelectEvent,
}: {
  historicalCountryId: string
  onSelectEvent: (eventId: string) => void
}) {
  const { data: changes = [] } = useQuery({
    queryKey: territoryTransferKeys.party('historical', historicalCountryId),
    queryFn: () => getHistoricalCountryTerritoryChanges(historicalCountryId),
    enabled: Boolean(historicalCountryId),
    staleTime: 60_000,
  })

  const rows = useMemo(() => {
    return changes
      .map((c) => {
        const yr =
          c.effectiveYear != null
            ? c.effectiveEra === 'BC'
              ? -c.effectiveYear
              : c.effectiveYear
            : c.event.startYear != null
              ? c.event.startEra === 'BC'
                ? -c.event.startYear
                : c.event.startYear
              : (parseIsoDateParts(c.event.startDate)?.year ?? null)
        return { change: c, year: yr }
      })
      .sort((a, b) => (a.year ?? 99999) - (b.year ?? 99999))
  }, [changes])

  if (rows.length === 0) return null

  const maxArea = Math.max(
    1,
    ...rows.map((r) => Math.abs(r.change.areaKm2 ?? 1)),
  )
  const gainedCount = rows.filter((r) => r.change.direction === 'gained').length
  const lostCount = rows.filter((r) => r.change.direction === 'lost').length

  return (
    <BentoCard aria-label="강역 영토 확장 및 상실 변천">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>강역 변천 워터폴</BentoCardTitle>
          <BentoCardBadge>
            획득 {gainedCount} · 상실 {lostCount}
          </BentoCardBadge>
        </BentoCardTitleGroup>
      </BentoCardHeader>

      <BentoCardBody>
        <WaterfallAxisLegend>
          <span className="loss">◀ 상실 · 할양</span>
          <span>0 기준</span>
          <span className="gain">정복 · 획득 ▶</span>
        </WaterfallAxisLegend>
        <WaterfallList>
          {rows.slice(0, 8).map(({ change, year }) => {
            const isGain = change.direction === 'gained'
            const area = change.areaKm2 ?? 0
            const halfPct =
              area > 0
                ? Math.max(8, Math.round((area / maxArea) * 48))
                : 18
            return (
              <WaterfallRow
                key={change.id}
                type="button"
                onClick={() => onSelectEvent(change.event.id)}
              >
                <WfYear>{year != null ? formatSignedYear(year) : '—'}</WfYear>
                <WfRegion>
                  <strong>{change.regionName || change.event.title}</strong>
                  <small>{territoryMethodLabel(change.method)}</small>
                </WfRegion>
                <WfDivergingCell>
                  <WfDivergingTrack>
                    <WfCenterZeroLine aria-hidden />
                    <WfDivergingFill
                      $gain={isGain}
                      style={
                        isGain
                          ? { left: '50%', width: `${halfPct}%` }
                          : { right: '50%', width: `${halfPct}%` }
                      }
                    />
                  </WfDivergingTrack>
                  <WfVal $gain={isGain}>
                    {isGain ? '+' : '−'}
                    {area > 0
                      ? area >= 10_000
                        ? `${(area / 10_000).toFixed(1)}만km²`
                        : `${area.toLocaleString('ko-KR')}km²`
                      : territoryMethodLabel(change.method)}
                  </WfVal>
                </WfDivergingCell>
              </WaterfallRow>
            )
          })}
        </WaterfallList>
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── Styled Components ──────────────────────────────────────────────────── */

const MilestoneFlowGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.15fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`

const FlowArrowBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};

  @media (max-width: 820px) {
    display: none;
  }
`

const MilestoneStep = styled.div<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid
    ${({ theme, $highlight }) =>
      $highlight
        ? theme.mode === 'dark'
          ? 'rgba(129, 140, 248, 0.24)'
          : 'rgba(99, 102, 241, 0.14)'
        : 'transparent'};
  background: ${({ theme, $highlight }) =>
    $highlight
      ? theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(30, 41, 59, 0.45))'
        : 'linear-gradient(135deg, rgba(238, 242, 255, 0.75), rgba(248, 250, 252, 0.9))'
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(15, 23, 42, 0.032)'};
  cursor: ${({ onClick }) => (onClick ? 'pointer' : 'default')};
  transition: transform 0.15s ease;

  &:hover {
    transform: ${({ onClick }) => (onClick ? 'translateY(-1px)' : 'none')};
  }
`

const MilestoneTag = styled.span<{ $tone: 'start' | 'mid' | 'end' }>`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme, $tone }) =>
    $tone === 'mid' ? ledgerAccent(theme.mode) : theme.colors.text.tertiary};
`

const MilestoneMain = styled.div`
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

const MilestoneSubText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MilestoneSubBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const InlinePersonBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const AnchorMiniAvatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`

const NarrativeActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const EditorWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const EditorBtnRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const ProseClampArea = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  ${({ $expanded }) =>
    !$expanded
      ? `
    max-height: 92px;
    overflow: hidden;
  `
      : ''}
`

const PlainProse = styled.p`
  margin: 0;
  white-space: pre-wrap;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ToggleClampBtn = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const SpectrumRow = styled.div`
  display: grid;
  grid-template-columns: 62px 1fr;
  align-items: center;
  gap: 8px;
`

const SpectrumAxisLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SpectrumTrack = styled.div`
  position: relative;
  height: 18px;
  border-radius: 4px;
  background: repeating-linear-gradient(
    -45deg,
    ${({ theme }) => ledgerSubtleFill(theme.mode)},
    ${({ theme }) => ledgerSubtleFill(theme.mode)} 5px,
    transparent 5px,
    transparent 10px
  );
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  overflow: hidden;
`

const SpectrumBlock = styled.button<{
  $tone: 'hos' | 'hog'
  $even: boolean
  $active?: boolean
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0;
  border: none;
  background: ${({ theme, $tone, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#d97706'
      : $tone === 'hos'
        ? ledgerAccent(theme.mode)
        : theme.mode === 'dark'
          ? '#2dd4bf'
          : '#0d9488'};
  opacity: ${({ $active, $even }) => ($active ? 1 : $even ? 0.86 : 0.56)};
  z-index: ${({ $active }) => ($active ? 2 : 1)};
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`

const SpectrumAxisTicks = styled.div`
  display: flex;
  justify-content: space-between;
  padding-left: 70px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const RulerChipsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RulerChipBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 5px;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(15, 23, 42, 0.06)'};
  background: ${({ theme, $active }) =>
    $active
      ? ledgerAccentSubtle(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(15, 23, 42, 0.03)'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;

  img {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
  }
  small {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
  strong {
    font-weight: ${({ $active }) => ($active ? 700 : 600)};
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const MoreChipBtn = styled.button`
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`

const SpanChartBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const SpanRow = styled.button<{ $self: boolean }>`
  display: grid;
  grid-template-columns: minmax(90px, 130px) 1fr 78px;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  border: none;
  border-radius: 5px;
  background: ${({ theme, $self }) =>
    $self ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  font-family: inherit;
  text-align: left;
  cursor: ${({ $self }) => ($self ? 'default' : 'pointer')};

  &:hover {
    background: ${({ theme, $self }) =>
      $self ? ledgerAccentSubtle(theme.mode) : ledgerHoverFill(theme.mode)};
  }
`

const SpanName = styled.span<{ $self: boolean }>`
  font-size: 11.5px;
  font-weight: ${({ $self }) => ($self ? 800 : 600)};
  color: ${({ theme, $self }) =>
    $self ? ledgerAccent(theme.mode) : theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SpanTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

const SpanBar = styled.div<{ $self: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: ${({ theme, $self }) =>
    $self
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? '#64748b'
        : '#94a3b8'};
`

const SpanYears = styled.span`
  text-align: right;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  ${DIGIT_DISPLAY}
`

const DiplomacyFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const WaterfallList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const WaterfallRow = styled.button`
  display: grid;
  grid-template-columns: 54px minmax(100px, 1.1fr) 1fr;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const WfYear = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${DIGIT_DISPLAY}
`

const WfRegion = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;

  strong {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    flex-shrink: 0;
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const WaterfallAxisLegend = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 162px;
  margin-bottom: 2px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};

  .loss {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#fda4af' : '#be123c')};
  }
  .gain {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#047857')};
  }
`

const WfDivergingCell = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 68px;
  align-items: center;
  gap: 8px;
`

const WfDivergingTrack = styled.div`
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const WfCenterZeroLine = styled.span`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  z-index: 2;
`

const WfDivergingFill = styled.div<{ $gain: boolean }>`
  position: absolute;
  top: 1px;
  bottom: 1px;
  border-radius: 999px;
  background: ${({ theme, $gain }) =>
    $gain
      ? theme.mode === 'dark'
        ? '#34d399'
        : '#059669'
      : theme.mode === 'dark'
        ? '#fb7185'
        : '#e11d48'};
`

const WfVal = styled.span<{ $gain: boolean }>`
  flex-shrink: 0;
  text-align: right;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme, $gain }) =>
    $gain
      ? theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'
      : theme.mode === 'dark'
        ? '#fda4af'
        : '#be123c'};
  ${DIGIT_DISPLAY}
`

/* ─── 5. Historical Domain Archive Footprint Card ────────────────────────── */

export interface HistoricalDomainMetricItem {
  key: string
  label: string
  count: number
  unit?: string
  onOpen: () => void
}

function histLogScore(val: number, refMax: number): number {
  if (val <= 0) return 14
  return Math.min(
    100,
    Math.round(22 + (Math.log1p(val) / Math.log1p(Math.max(2, refMax))) * 78),
  )
}

export function HistoricalDomainArchiveCard({
  items,
}: {
  items: HistoricalDomainMetricItem[]
}) {
  const populatedCount = items.filter((item) => item.count > 0).length
  const totalRecords = items.reduce((acc, item) => acc + item.count, 0)
  const maxCount = Math.max(1, ...items.map((item) => item.count))
  const sorted = [...items].sort((a, b) => b.count - a.count)

  const radarAxes = useMemo<RadarAxisMetric[]>(() => {
    const byKey = new Map(items.map((i) => [i.key, i]))
    const get = (k: string) => byKey.get(k)?.count ?? 0
    const open = (k: string) => byKey.get(k)?.onOpen
    const govCnt = get('government')
    const evtCnt = get('events')
    const figCnt = get('figures')
    const milCnt = get('military')
    const dipCnt = get('relation') + get('treaty')
    const regLawCnt = get('regions') + get('laws') + get('ethnicity')

    return [
      {
        key: 'gov',
        label: '통치·관제',
        score: histLogScore(govCnt, 28),
        valueLabel: `${govCnt}건`,
        onClick: open('government'),
      },
      {
        key: 'events',
        label: '역사·사건',
        score: histLogScore(evtCnt, 60),
        valueLabel: `${evtCnt}건`,
        onClick: open('events'),
      },
      {
        key: 'figures',
        label: '인물·왕실',
        score: histLogScore(figCnt, 60),
        valueLabel: `${figCnt}명`,
        onClick: open('figures'),
      },
      {
        key: 'military',
        label: '군사·편제',
        score: histLogScore(milCnt, 20),
        valueLabel: `${milCnt}개`,
        onClick: open('military'),
      },
      {
        key: 'diplomacy',
        label: '계승·외교',
        score: histLogScore(dipCnt, 18),
        valueLabel: `${dipCnt}건`,
        onClick: open('relation'),
      },
      {
        key: 'territory',
        label: '강역·율령',
        score: histLogScore(regLawCnt, 24),
        valueLabel: `${regLawCnt}건`,
        onClick: open('regions'),
      },
    ]
  }, [items])

  return (
    <BentoCard aria-label="역사 도메인 아카이브 현황">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>왕조 6축 역량 레이더 · 사료 아카이브 밀도</BentoCardTitle>
          <BentoCardBadge>
            {populatedCount}/{items.length}개 분야 · 총{' '}
            {totalRecords.toLocaleString('ko-KR')}건
          </BentoCardBadge>
        </BentoCardTitleGroup>
      </BentoCardHeader>

      <BentoCardBody>
        <ArchiveRadarSplit>
          <ArchiveRadarBox>
            <NationalRadarPolygonChart axes={radarAxes} />
          </ArchiveRadarBox>

          <ArchiveDomainGrid>
            {sorted.map((item, idx) => {
              const pct =
                item.count > 0
                  ? Math.max(6, Math.round((item.count / maxCount) * 100))
                  : 0
              return (
                <ArchiveDomainRowBtn
                  key={item.key}
                  type="button"
                  $empty={item.count === 0}
                  onClick={item.onOpen}
                >
                  <ArchiveDomainTop>
                    <ArchiveDomainLabel>{item.label}</ArchiveDomainLabel>
                    <ArchiveDomainCount $empty={item.count === 0}>
                      {item.count > 0
                        ? `${item.count.toLocaleString('ko-KR')}${item.unit ?? '건'}`
                        : '미등록 +'}
                    </ArchiveDomainCount>
                  </ArchiveDomainTop>
                  <ArchiveDomainTrack>
                    {pct > 0 && (
                      <ArchiveDomainFill $pct={pct} $top={idx < 2} />
                    )}
                  </ArchiveDomainTrack>
                </ArchiveDomainRowBtn>
              )
            })}
          </ArchiveDomainGrid>
        </ArchiveRadarSplit>
      </BentoCardBody>
    </BentoCard>
  )
}

const ArchiveRadarSplit = styled.div`
  display: grid;
  grid-template-columns: 212px minmax(0, 1fr);
  align-items: center;
  gap: 14px;

  @media (max-width: 820px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ArchiveRadarBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 0;
`

const HistEraBlockBtn = styled.button<{ $even: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0 4px;
  border: none;
  border-right: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $even }) =>
    $even ? ledgerAccentSubtle(theme.mode) : ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ArchiveDomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ArchiveDomainRowBtn = styled.button<{ $empty: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 5px 7px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
  opacity: ${({ $empty }) => ($empty ? 0.65 : 1)};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    opacity: 1;
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

const ArchiveDomainTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
`

/* 좁은 칸에서 '구성 민/족', '교역·상/단'처럼 글자 중간에서 끊기던 것 — 낱말 단위로만 줄바꿈, 수치는 한 줄 */
const ArchiveDomainLabel = styled.span`
  min-width: 0;
  word-break: keep-all;
  line-height: 1.3;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ArchiveDomainCount = styled.span<{ $empty: boolean }>`
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $empty }) =>
    $empty ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

const ArchiveDomainTrack = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  overflow: hidden;
`

const ArchiveDomainFill = styled.div<{ $pct: number; $top: boolean }>`
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ theme, $top }) =>
    $top
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(165, 180, 252, 0.5)'
        : 'rgba(79, 70, 229, 0.5)'};
`
