import { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  houseText,
  LEGISLATURE_TYPE_LABEL,
  primaryHouseLabel,
  toSignedYear,
  type GovernmentForm,
} from '@/entities/political-system/model/political-system'
import type { PoliticalSystem } from '@/shared/api/political-system'
import { pathKeys } from '@/shared/router'

import { IconGlobe } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface Props {
  countryId: string
  countryName: string
}

/**
 * 정부 형태별 색. 왕정 계열은 따뜻한 쪽, 공화정 계열은 차가운 쪽으로 묶어
 * 밴드를 훑을 때 "왕정↔공화정"이 색만으로 읽히게 한다.
 */
const FORM_COLOR: Record<GovernmentForm, string> = {
  ABSOLUTE_MONARCHY: '#b45309',
  CONSTITUTIONAL_MONARCHY: '#d97706',
  MILITARY: '#7f1d1d',
  ONE_PARTY: '#9f1239',
  THEOCRACY: '#7c3aed',
  PROVISIONAL: '#78716c',
  PRESIDENTIAL: '#2563eb',
  SEMI_PRESIDENTIAL: '#0891b2',
  PARLIAMENTARY: '#059669',
  OTHER: '#64748b',
}

const UNKNOWN_COLOR = '#94a3b8'

/**
 * 세그먼트 최소 폭(px). 라벨 한 덩이('제2공화국')가 들어가는 최소치다.
 * 비율만으로 폭을 주면 4년짜리 정체가 40px로 눌려 라벨이 '제…'가 된다.
 */
const MIN_SEGMENT_PX = 76

interface Segment {
  system: PoliticalSystem
  startYear: number
  endYear: number
  /** 밴드에서 차지할 비율 (합 1) */
  weight: number
  color: string
  /** 앞 정체와 연도가 끊겼는가 — 기록 공백을 숨기지 않기 위해 */
  gapBefore: boolean
}

/**
 * 정부 변천 — 이 나라의 정체가 어떻게 바뀌어 왔는지 한 줄로.
 *
 * 대시보드의 「계보」와 다르다. 계보는 **국가**가 어떻게 이어졌는지(서프랑크 왕국 →
 * 프랑스 왕국)를 말하고, 여기는 같은 나라 안에서 **정부 형태**가 어떻게 뒤집혔는지를
 * 말한다 — 왕정 → 공화정 → 제정 → 왕정 복고 → 공화정.
 *
 * 폭은 존속 기간에 비례하되 최소폭을 준다. 앙시앵 레짐 203년과 제2공화국 4년을 그대로
 * 비례시키면 짧은 정체가 실선이 되어 "있었다"는 사실조차 안 보인다.
 */
export function GovernmentFlowSection({ countryId, countryName }: Props) {
  const navigate = useNavigate()
  const query = usePoliticalSystems({ countryId })
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const segments = useMemo<Segment[]>(() => {
    const rows = [...(query.data ?? [])]
      .sort(comparePoliticalSystems)
      .filter((system) => toSignedYear(system.startEra, system.startYear) != null)
    if (rows.length === 0) return []

    const thisYear = new Date().getFullYear()
    const spans = rows.map((system) => {
      const startYear = toSignedYear(system.startEra, system.startYear) as number
      const explicitEnd = toSignedYear(system.endEra, system.endYear)
      // 종료가 없으면 '현행'은 올해까지, 그냥 미상이면 시작 해에서 끊는다
      const endYear =
        explicitEnd ?? (system.isCurrent ? thisYear : startYear)
      return { system, startYear, endYear: Math.max(endYear, startYear) }
    })

    /*
     * 폭은 존속 기간의 **제곱근**에 비례시킨다.
     *
     * 선형으로 주면 앙시앵 레짐 203년이 밴드의 3분의 1을 먹고 나머지 11개가 40px로
     * 눌린다. 정작 왕정→공화정→제정→왕정 복고로 뒤집히는 격변이 그 눌린 구간에 있어,
     * 가장 볼 만한 대목이 안 읽히게 된다. 제곱근은 긴 시대를 눌러 주면서도 "제3공화국이
     * 제2공화국보다 훨씬 길다"는 사실은 남긴다.
     */
    const weights = spans.map((span) =>
      Math.sqrt(Math.max(span.endYear - span.startYear, 1)),
    )
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1

    return spans.map((span, index) => ({
      system: span.system,
      startYear: span.startYear,
      endYear: span.endYear,
      weight: weights[index] / total,
      color: span.system.governmentForm
        ? FORM_COLOR[span.system.governmentForm]
        : UNKNOWN_COLOR,
      gapBefore: index > 0 && span.startYear > spans[index - 1].endYear,
    }))
  }, [query.data])

  /** 밴드에 실제로 쓰인 형태만 범례에 — 안 쓴 색을 늘어놓으면 읽는 부담만 는다 */
  const legend = useMemo(() => {
    const used = new Map<GovernmentForm, number>()
    for (const segment of segments) {
      const form = segment.system.governmentForm
      if (!form) continue
      used.set(form, (used.get(form) ?? 0) + 1)
    }
    return [...used.keys()]
  }, [segments])

  const goToTab = () => navigate(pathKeys.countryGovernment(countryId))

  if (query.isLoading) return null

  const title = (
    <S.SectionTitleRow>
      <S.SectionTitleIcon $accent="amber">
        <IconGlobe />
      </S.SectionTitleIcon>
      <S.SectionTitleText>정부 변천</S.SectionTitleText>
      <HeaderAction type="button" onClick={goToTab}>
        {segments.length > 0 ? '정체 관리' : '정체 등록'}
      </HeaderAction>
    </S.SectionTitleRow>
  )

  if (segments.length === 0) {
    return (
      <S.Section>
        {title}
        <S.EmptyHint>
          등록된 정체가 없습니다. 대통령제·의원내각제 같은 정부 형태를 기간과 함께
          남기면 {countryName}의 정부가 어떻게 바뀌어 왔는지 한 줄로 보입니다.
        </S.EmptyHint>
      </S.Section>
    )
  }

  const first = segments[0]
  const last = segments[segments.length - 1]

  return (
    <S.Section>
      {title}

      <Band role="list" aria-label="정부 변천">
        {segments.map((segment) => {
          const dimmed = hoveredId != null && hoveredId !== segment.system.id
          return (
            <Segment
              key={segment.system.id}
              role="listitem"
              type="button"
              style={{ flexGrow: segment.weight, background: segment.color }}
              $dimmed={dimmed}
              $gap={segment.gapBefore}
              title={`${segment.system.name ?? ''} ${formatPeriod(segment.system)}`}
              onMouseEnter={() => setHoveredId(segment.system.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(segment.system.id)}
              onBlur={() => setHoveredId(null)}
              onClick={goToTab}
            >
              <SegmentLabel>{segment.system.name ?? '이름 없음'}</SegmentLabel>
            </Segment>
          )
        })}
      </Band>

      <Axis>
        <AxisEnd>{first.startYear}</AxisEnd>
        <AxisEnd>{last.system.isCurrent ? '현재' : last.endYear}</AxisEnd>
      </Axis>

      {/* 밴드 위에 놓인 정체의 상세 — hover한 것, 없으면 현행(마지막) */}
      <Detail>
        {(() => {
          const focused =
            segments.find((segment) => segment.system.id === hoveredId) ?? last
          const system = focused.system
          return (
            <>
              <DetailName>{system.name ?? '이름 없음'}</DetailName>
              <DetailPeriod>{formatPeriod(system)}</DetailPeriod>
              <DetailTags>
                {system.governmentForm && (
                  <DetailTag $color={focused.color}>
                    {GOVERNMENT_FORM_LABEL[system.governmentForm]}
                  </DetailTag>
                )}
                {system.legislatureType && (
                  <DetailMuted>
                    {LEGISLATURE_TYPE_LABEL[system.legislatureType]}
                    {system.lowerHouseName &&
                      ` · ${houseText(
                        primaryHouseLabel(system.legislatureType),
                        system.lowerHouseName,
                      )}`}
                    {system.upperHouseName &&
                      system.legislatureType === 'BICAMERAL' &&
                      ` · ${houseText('상원', system.upperHouseName)}`}
                  </DetailMuted>
                )}
              </DetailTags>
            </>
          )
        })()}
      </Detail>

      <Legend>
        {legend.map((form) => (
          <LegendItem key={form}>
            <LegendSwatch style={{ background: FORM_COLOR[form] }} />
            {GOVERNMENT_FORM_LABEL[form]}
          </LegendItem>
        ))}
      </Legend>
    </S.Section>
  )
}

const HeaderAction = styled.button`
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(217, 119, 6, 0.35);
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(217, 119, 6, 0.16);
  }
`

/*
 * 최소폭 합이 컨테이너를 넘으면 잘라내지 않고 가로로 흘린다. 세그먼트를 더 좁히면
 * 라벨이 사라져 "정체가 몇 번 바뀌었나"조차 안 보인다.
 */
const Band = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 52px;
  border-radius: 10px;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
`

const Segment = styled.button<{ $dimmed: boolean; $gap: boolean }>`
  position: relative;
  flex-basis: 0;
  flex-shrink: 0;
  min-width: ${MIN_SEGMENT_PX}px;
  border: none;
  padding: 0 8px;
  cursor: pointer;
  color: #fff;
  opacity: ${({ $dimmed }) => ($dimmed ? 0.42 : 1)};
  transition: opacity 0.15s ease;

  /* 기록이 끊긴 자리 — 앞 정체 종료와 이 정체 시작 사이가 비었다는 표시.
     공백을 이어 붙이면 연속인 것처럼 보이는 거짓말이 된다. */
  ${({ $gap }) =>
    $gap &&
    `
    margin-left: 6px;
    &::before {
      content: '';
      position: absolute;
      left: -5px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: repeating-linear-gradient(
        135deg,
        rgba(148, 163, 184, 0.9) 0 2px,
        transparent 2px 4px
      );
    }
  `}
`

/* 두 줄까지 허용 — 76px 칸에서 '부르봉 복고 왕정'이 한 줄로는 안 들어간다 */
const SegmentLabel = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  overflow: hidden;
  word-break: keep-all;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
`

const AxisEnd = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Detail = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 14px;
  /* 마우스가 오갈 때 높이가 튀지 않도록 두 줄 자리를 미리 잡아둔다 */
  min-height: 44px;
`

const DetailName = styled.span`
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DetailPeriod = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DetailTags = styled.span`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  flex-basis: 100%;
`

const DetailTag = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
  background: ${({ $color }) => $color};
`

const DetailMuted = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LegendSwatch = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 2px;
`
