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
  GOVERNMENT_FORM_LABEL,
  resolveCurrentSystem,
  STATE_STRUCTURE_LABEL,
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
  politicalSystems: PoliticalSystem[]
  onOpenGovernment: () => void
  onOpenSuccession: () => void
  onSelectPerson: (personId: string) => void
  onSelectEvent: (eventId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

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

  const firstRuler =
    typedFounding?.firstRulers?.[0] ?? typedFounding?.founders?.[0] ?? null
  const lastRuler =
    typedFounding?.lastRulers?.[0] ?? typedFounding?.dissolvers?.[0] ?? null

  const hasNarrative = Boolean(
    savedDescription?.trim() || nameOrigin?.trim() || historyText?.trim(),
  )

  return (
    <BentoCard aria-label={`${countryName} 정체성 및 흥망 흐름`}>
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>정치체 정체성 · 흥망성쇠 타임라인</BentoCardTitle>
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
          {!isEditorOpen ? (
            <BentoActionBtn type="button" onClick={onOpenEditor}>
              <FiEdit2 size={11} /> {savedDescription ? '개요 편집' : '개요 작성'}
            </BentoActionBtn>
          ) : null}
          {onEditBasic ? (
            <BentoActionBtn type="button" onClick={onEditBasic}>
              기본 제원
            </BentoActionBtn>
          ) : null}
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
        {/* 건국 ──▶ 존속·체제 ──▶ 멸망·계승 3단계 플로우 스트립 */}
        <MilestoneFlowGrid>
          <MilestoneStep>
            <MilestoneTag $tone="start">성립 · 건국</MilestoneTag>
            <MilestoneMain>
              {firstRuler?.name ? (
                <InlinePersonBtn
                  type="button"
                  onClick={() =>
                    firstRuler.personId && onSelectPerson(firstRuler.personId)
                  }
                >
                  <FiUser size={11} /> {firstRuler.name}
                </InlinePersonBtn>
              ) : (
                <span>{periodLabel.split('~')[0]?.trim() || '시점 미상'}</span>
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
              <MilestoneSubText>시조 · 건국 배경</MilestoneSubText>
            )}
          </MilestoneStep>

          <FlowArrowBox aria-hidden="true">
            <FiArrowRight size={14} />
          </FlowArrowBox>

          <MilestoneStep $highlight onClick={onOpenGovernment} role="button" tabIndex={0}>
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
                rulersCount > 0 ? `통치자 ${rulersCount}명` : null,
              ]
                .filter(Boolean)
                .join(' · ') || periodLabel}
            </MilestoneSubText>
          </MilestoneStep>

          <FlowArrowBox aria-hidden="true">
            <FiArrowRight size={14} />
          </FlowArrowBox>

          <MilestoneStep onClick={onOpenSuccession} role="button" tabIndex={0}>
            <MilestoneTag $tone="end">종식 · 계승</MilestoneTag>
            <MilestoneMain>
              {lastRuler?.name ? (
                <InlinePersonBtn
                  type="button"
                  onClick={(evt) => {
                    evt.stopPropagation()
                    if (lastRuler.personId) onSelectPerson(lastRuler.personId)
                  }}
                >
                  <FiUser size={11} /> {lastRuler.name}
                </InlinePersonBtn>
              ) : (
                <span>
                  {periodLabel.includes('~')
                    ? periodLabel.split('~')[1]?.trim() || '종료'
                    : '계승 탭 보기'}
                </span>
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
              <MilestoneSubText>후신 정치체 계승 보기 →</MilestoneSubText>
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
            <ToggleClampBtn
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? '서술 접기' : '서술 전문 펼치기'}
            </ToggleClampBtn>
          </>
        ) : null}
      </BentoCardBody>
    </BentoCard>
  )
}

/* ─── 2. Proportional Ruler Reign Spectrum Bento Card ────────────────────── */

export function HistoricalRulerSpectrumCard({
  rulers,
  spanStart,
  spanEnd,
  onSelectPerson,
  onOpenRulersTab,
}: {
  rulers: HistoricalRulerItem[]
  spanStart: number | null
  spanEnd: number | null
  onSelectPerson: (personId: string) => void
  onOpenRulersTab: () => void
}) {
  const inSpanRulers = useMemo(
    () => rulers.filter((r) => !r.isOutOfSpan && r.startYear != null),
    [rulers],
  )

  const { lo, hi, hosSegments, hogSegments, longestRuler } = useMemo(() => {
    const years = inSpanRulers.flatMap((r) =>
      [r.startYear, r.endYear].filter((y): y is number => y != null),
    )
    const minY =
      spanStart ?? (years.length > 0 ? Math.min(...years) : 0)
    const maxY =
      spanEnd ?? (years.length > 0 ? Math.max(...years) : minY + 1)
    const safeHi = Math.max(minY + 1, maxY)

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
      allSegs.sort((a, b) => b.years - a.years)[0]?.ruler ?? null

    return {
      lo: minY,
      hi: safeHi,
      hosSegments: hos,
      hogSegments: hog,
      longestRuler: longest,
    }
  }, [inSpanRulers, spanStart, spanEnd])

  if (rulers.length === 0) return null

  return (
    <BentoCard aria-label="역대 통치자 치세 스펙트럼">
      <BentoCardHeader>
        <BentoCardTitleGroup>
          <BentoCardTitle>역대 통치자 · 치세 스펙트럼</BentoCardTitle>
          <BentoCardBadge>{rulers.length}명</BentoCardBadge>
          {longestRuler ? (
            <BentoPill>최장 재위: {longestRuler.personName}</BentoPill>
          ) : null}
        </BentoCardTitleGroup>
        <BentoHeaderActions>
          <BentoActionBtn type="button" $accent onClick={onOpenRulersTab}>
            통치자·내각 연표 <FiArrowUpRight size={11} />
          </BentoActionBtn>
        </BentoHeaderActions>
      </BentoCardHeader>

      <BentoCardBody>
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
                  style={{
                    left: `${seg.leftPct}%`,
                    width: `${seg.widthPct}%`,
                  }}
                  title={`${seg.ruler.personName} (${seg.ruler.startYear != null ? formatSignedYear(seg.ruler.startYear) : '?'} ~ ${seg.ruler.endYear != null ? formatSignedYear(seg.ruler.endYear) : '?'})`}
                  onClick={() => {
                    if (seg.ruler.personId) onSelectPerson(seg.ruler.personId)
                  }}
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
                  style={{
                    left: `${seg.leftPct}%`,
                    width: `${seg.widthPct}%`,
                  }}
                  title={`${seg.ruler.personName} (${seg.ruler.startYear != null ? formatSignedYear(seg.ruler.startYear) : '?'} ~ ${seg.ruler.endYear != null ? formatSignedYear(seg.ruler.endYear) : '?'})`}
                  onClick={() => {
                    if (seg.ruler.personId) onSelectPerson(seg.ruler.personId)
                  }}
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

        {/* 주요 통치자 빠른 칩 */}
        <RulerChipsWrap>
          {rulers.slice(0, 10).map((r) => {
            const img = r.profileImageUrl
              ? getUploadImageUrl(r.profileImageUrl)
              : null
            return (
              <RulerChipBtn
                key={r.recordId}
                type="button"
                onClick={() => {
                  if (r.personId) onSelectPerson(r.personId)
                }}
              >
                {img ? <img src={img} alt="" /> : null}
                {r.ordinal != null ? <small>{r.ordinal}대</small> : null}
                <strong>{r.personName}</strong>
              </RulerChipBtn>
            )
          })}
          {rulers.length > 10 ? (
            <MoreChipBtn type="button" onClick={onOpenRulersTab}>
              +{rulers.length - 10}명 전체 보기
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
        <WaterfallList>
          {rows.slice(0, 8).map(({ change, year }) => {
            const isGain = change.direction === 'gained'
            const area = change.areaKm2 ?? 0
            const pct =
              area > 0
                ? Math.max(12, Math.round((area / maxArea) * 100))
                : 28
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
                <WfBarCell>
                  <WfBar $gain={isGain} style={{ width: `${pct}%` }} />
                  <WfVal $gain={isGain}>
                    {isGain ? '+' : '−'}
                    {area > 0
                      ? area >= 10_000
                        ? `${(area / 10_000).toFixed(1)}만km²`
                        : `${area.toLocaleString('ko-KR')}km²`
                      : territoryMethodLabel(change.method)}
                  </WfVal>
                </WfBarCell>
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
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid
    ${({ theme, $highlight }) =>
      $highlight
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ theme, $highlight }) =>
    $highlight ? ledgerAccentSubtle(theme.mode) : ledgerSubtleFill(theme.mode)};
  cursor: ${({ onClick }) => (onClick ? 'pointer' : 'default')};
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
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
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
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0;
  border: none;
  background: ${({ theme, $tone, $even }) =>
    $tone === 'hos'
      ? ledgerAccent(theme.mode)
      : theme.mode === 'dark'
        ? '#2dd4bf'
        : '#0d9488'};
  opacity: ${({ $even }) => ($even ? 0.86 : 0.56)};
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
  gap: 5px;
`

const RulerChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;

  img {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    object-fit: cover;
  }
  small {
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
  strong {
    font-weight: 600;
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

const WfBarCell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const WfBar = styled.div<{ $gain: boolean }>`
  height: 8px;
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
