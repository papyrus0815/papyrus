import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import * as S from './country-detail.styles'

interface ChartsSectionProps {
  economicGrowthData: Array<{ year: string; growth: number; avgGrowth: number }>
  populationGrowthData: Array<{
    year: string
    rate: number
    projection: number
  }>
  exportData: Array<{ category: string; value: number }>
  importData: Array<{ category: string; value: number }>
}

/**
 * 차트 섹션 위젯
 * - 경제 성장률
 * - 인구 성장률
 * - 주요 수출 품목
 * - 주요 수입 품목
 */
export function ChartsSection({
  economicGrowthData,
  populationGrowthData,
  exportData,
  importData,
}: ChartsSectionProps) {
  return (
    <S.ChartGridTwoCol>
      {/* 경제 성장률 */}
      <S.ChartCardModern
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <S.ChartCardHeader>
          <S.ChartCardTitle>
            <span style={{ fontSize: '18px' }}>📈</span>
            경제 성장률
          </S.ChartCardTitle>
          <S.ChartCardSubtitle>연간 GDP 성장률 추이</S.ChartCardSubtitle>
        </S.ChartCardHeader>
        <S.ChartWrapper>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={economicGrowthData}>
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4285f4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4285f4" stopOpacity={0.05} />
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
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: '10px',
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: '#0f172a',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '12px',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="growth"
                stroke="#4285f4"
                strokeWidth={2.5}
                dot={{
                  fill: '#4285f4',
                  strokeWidth: 2,
                  radius: 4,
                }}
                activeDot={{
                  radius: 6,
                  strokeWidth: 2,
                }}
                name="성장률"
              />
              <Line
                type="monotone"
                dataKey="avgGrowth"
                stroke="#34a853"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#34a853', radius: 3 }}
                name="평균 성장률"
              />
            </LineChart>
          </ResponsiveContainer>
        </S.ChartWrapper>
      </S.ChartCardModern>

      {/* 인구 성장률 */}
      <S.ChartCardModern
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <S.ChartCardHeader>
          <S.ChartCardTitle>
            <span style={{ fontSize: '18px' }}>👥</span>
            인구 성장률
          </S.ChartCardTitle>
          <S.ChartCardSubtitle>연간 인구 증가율 추이</S.ChartCardSubtitle>
        </S.ChartCardHeader>
        <S.ChartWrapper>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={populationGrowthData}>
              <defs>
                <linearGradient
                  id="colorPopulation"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#34a853" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34a853" stopOpacity={0.05} />
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
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: '10px',
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: '#0f172a',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '12px',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#34a853"
                fill="url(#colorPopulation)"
                strokeWidth={2.5}
                name="실제 성장률"
              />
              <Line
                type="monotone"
                dataKey="projection"
                stroke="#fbbc04"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#fbbc04', radius: 3 }}
                name="예측 성장률"
              />
            </AreaChart>
          </ResponsiveContainer>
        </S.ChartWrapper>
      </S.ChartCardModern>

      {/* 수출 품목 */}
      <S.ChartCardModern
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <S.ChartCardHeader>
          <S.ChartCardTitle>
            <span style={{ fontSize: '18px' }}>📦</span>
            주요 수출 품목
          </S.ChartCardTitle>
          <S.ChartCardSubtitle>
            Top 6 품목 (단위: Billion $)
          </S.ChartCardSubtitle>
        </S.ChartCardHeader>
        <S.ChartWrapper>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={exportData}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="#9aa0a6"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke="#9aa0a6"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: '10px',
                }}
                cursor={{ fill: 'rgba(66, 133, 244, 0.1)' }}
              />
              <Bar dataKey="value" name="수출액" radius={[0, 8, 8, 0]}>
                {exportData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(${210 + index * 10}, 80%, ${60 - index * 5}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </S.ChartWrapper>
      </S.ChartCardModern>

      {/* 수입 품목 */}
      <S.ChartCardModern
        as={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45 }}
      >
        <S.ChartCardHeader>
          <S.ChartCardTitle>
            <span style={{ fontSize: '18px' }}>🚢</span>
            주요 수입 품목
          </S.ChartCardTitle>
          <S.ChartCardSubtitle>
            Top 6 품목 (단위: Billion $)
          </S.ChartCardSubtitle>
        </S.ChartCardHeader>
        <S.ChartWrapper>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={importData}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="#9aa0a6"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke="#9aa0a6"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={65}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: '10px',
                }}
                cursor={{ fill: 'rgba(234, 67, 53, 0.1)' }}
              />
              <Bar dataKey="value" name="수입액" radius={[0, 8, 8, 0]}>
                {importData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(${5 + index * 10}, 80%, ${60 - index * 5}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </S.ChartWrapper>
      </S.ChartCardModern>
    </S.ChartGridTwoCol>
  )
}
