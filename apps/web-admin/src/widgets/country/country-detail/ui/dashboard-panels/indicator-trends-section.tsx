import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  useDemographicIndicators,
  useEconomicIndicators,
} from '@/entities/country/api.indicators'

import { CountryDataManagerModal } from '../country-data-manager/country-data-manager-modal'
import { IconChart } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import * as C from '../country-detail.styles'

interface IndicatorTrendsSectionProps {
  /** 모던 국가 ID. 역사 국가에는 지표가 없으므로 호출하지 않는다. */
  countryId: string
  countryName: string
}

const TOOLTIP_STYLE = {
  background: 'rgba(255, 255, 255, 0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  padding: '10px',
}

/**
 * 국가 지표 추이 — GDP 성장률·인구 증가율 + 데이터 관리 진입점.
 *
 * 백엔드 economic/demographic 지표 엔드포인트(읽기·쓰기)를 연결한다.
 * (수출·수입 품목별 차트는 백엔드 데이터 소스가 없어 제외)
 *
 * - 데이터가 없어도 "데이터 관리" 버튼으로 입력 가능 (빈 상태 노출).
 * - 로딩 중에는 스켈레톤을 노출한다.
 */
export function IndicatorTrendsSection({
  countryId,
  countryName,
}: IndicatorTrendsSectionProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const economicQuery = useEconomicIndicators(countryId)
  const demographicQuery = useDemographicIndicators(countryId)

  const economicGrowthData = useMemo(() => {
    const rows = (economicQuery.data ?? [])
      .filter((d) => d.gdpGrowthRate != null)
      .sort((a, b) => a.year - b.year)
    if (rows.length === 0) return []
    const avg =
      rows.reduce((sum, d) => sum + (d.gdpGrowthRate ?? 0), 0) / rows.length
    return rows.map((d) => ({
      year: String(d.year),
      growth: Number(d.gdpGrowthRate),
      avgGrowth: Number(avg.toFixed(2)),
    }))
  }, [economicQuery.data])

  const populationGrowthData = useMemo(() => {
    return (demographicQuery.data ?? [])
      .filter((d) => d.populationGrowthRate != null)
      .sort((a, b) => a.year - b.year)
      .map((d) => ({
        year: String(d.year),
        rate: Number(d.populationGrowthRate),
      }))
  }, [demographicQuery.data])

  const isLoading = economicQuery.isLoading || demographicQuery.isLoading
  const hasEconomic = economicGrowthData.length > 0
  const hasPopulation = populationGrowthData.length > 0
  const hasAny = hasEconomic || hasPopulation

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon $accent="violet">
          <IconChart />
        </S.SectionTitleIcon>
        <S.SectionTitleText>지표 추이</S.SectionTitleText>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(124,58,237,0.35)',
            background: 'rgba(124,58,237,0.08)',
            color: '#7c3aed',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          데이터 관리
        </button>
      </S.SectionTitleRow>

      {!isLoading && !hasAny && (
        <S.EmptyHint>
          등록된 지표가 없습니다. “데이터 관리”에서 연도별 경제·인구·발전 지표,
          교역, 기록을 추가할 수 있습니다.
        </S.EmptyHint>
      )}

      <CountryDataManagerModal
        countryId={countryId}
        countryName={countryName}
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />

      {isLoading ? (
        <C.ChartGridTwoCol>
          <C.ChartCardModern style={{ minHeight: 340, opacity: 0.6 }} />
          <C.ChartCardModern style={{ minHeight: 340, opacity: 0.6 }} />
        </C.ChartGridTwoCol>
      ) : (
        <C.ChartGridTwoCol>
          {hasEconomic && (
            <C.ChartCardModern
              as={motion.div}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <C.ChartCardHeader>
                <C.ChartCardTitle>
                  <span style={{ fontSize: '18px' }}>📈</span>
                  경제 성장률
                </C.ChartCardTitle>
                <C.ChartCardSubtitle>연간 GDP 성장률 추이</C.ChartCardSubtitle>
              </C.ChartCardHeader>
              <C.ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={economicGrowthData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      stroke="#9aa0a6"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9aa0a6"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                      width={35}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="growth"
                      stroke="#4285f4"
                      strokeWidth={2.5}
                      dot={{ fill: '#4285f4', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="성장률"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgGrowth"
                      stroke="#34a853"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="기간 평균"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </C.ChartWrapper>
            </C.ChartCardModern>
          )}

          {hasPopulation && (
            <C.ChartCardModern
              as={motion.div}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <C.ChartCardHeader>
                <C.ChartCardTitle>
                  <span style={{ fontSize: '18px' }}>👥</span>
                  인구 증가율
                </C.ChartCardTitle>
                <C.ChartCardSubtitle>연간 인구 증가율 추이</C.ChartCardSubtitle>
              </C.ChartCardHeader>
              <C.ChartWrapper>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={populationGrowthData}>
                    <defs>
                      <linearGradient
                        id="colorPopulationTrend"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#34a853" stopOpacity={0.4} />
                        <stop
                          offset="95%"
                          stopColor="#34a853"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      stroke="#9aa0a6"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9aa0a6"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                      width={35}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#34a853"
                      fill="url(#colorPopulationTrend)"
                      strokeWidth={2.5}
                      name="증가율"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </C.ChartWrapper>
            </C.ChartCardModern>
          )}
        </C.ChartGridTwoCol>
      )}
    </S.Section>
  )
}
