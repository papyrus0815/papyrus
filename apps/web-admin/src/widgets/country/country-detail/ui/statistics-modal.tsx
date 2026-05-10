import React from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'

interface StatisticsModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  countryId: string
  type: 'population' | 'gdp'
}

interface PopulationPyramidData {
  ageGroup: string
  male: number
  female: number
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  title,
  countryId,
  type,
}) => {
  const [data, setData] = React.useState<
    Array<{
      year: string
      value: number
      growthRate: number
    }>
  >([])
  const [loading, setLoading] = React.useState(true)
  const [selectedYear, setSelectedYear] = React.useState('2024')
  const [showYearDropdown, setShowYearDropdown] = React.useState(false)
  const [pyramidData, setPyramidData] = React.useState<PopulationPyramidData[]>(
    [],
  )

  React.useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setLoading(true)
      try {
        // 실제 API 호출 로직을 여기에 추가
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 목업 데이터
        const mockData = Array.from({ length: 11 }, (_item, index) => {
          const year = 2014 + index
          const baseValue = type === 'population' ? 50000000 : 1000000000000
          const growth = type === 'population' ? 1.005 : 1.03
          const value = baseValue * Math.pow(growth, index)
          const prevValue =
            index > 0 ? baseValue * Math.pow(growth, index - 1) : baseValue
          const growthRate = ((value - prevValue) / prevValue) * 100

          return {
            year: year.toString(),
            value,
            growthRate,
          }
        })

        setData(mockData)

        // 인구 피라미드 목업 데이터
        if (type === 'population') {
          const ageGroups = [
            '0-9',
            '10-19',
            '20-29',
            '30-39',
            '40-49',
            '50-59',
            '60-69',
            '70-79',
            '80+',
          ]
          setPyramidData(
            ageGroups.map((ageGroup) => ({
              ageGroup,
              male: Math.floor(Math.random() * 2000000) + 1000000,
              female: Math.floor(Math.random() * 2000000) + 1000000,
            })),
          )
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, countryId, type])

  const formatValue = (value: number) => {
    if (type === 'population') {
      return value.toLocaleString('ko-KR') + ' 명'
    } else {
      return '$ ' + (value / 1000000000).toFixed(2) + 'B'
    }
  }

  const formatNumber = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M'
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K'
    }
    return value.toString()
  }

  const handleYearChange = (direction: 'prev' | 'next') => {
    const availableYears = data.map((dataItem) => dataItem.year)
    const currentIndex = availableYears.indexOf(selectedYear)

    if (direction === 'prev' && currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1])
    } else if (
      direction === 'next' &&
      currentIndex < availableYears.length - 1
    ) {
      setSelectedYear(availableYears[currentIndex + 1])
    }
  }

  const currentData = data.find((dataItem) => dataItem.year === selectedYear)

  const valueLabel = type === 'population' ? '인구' : 'GDP'

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <Overlay
        onClick={onClose}
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ModalContainer
          onClick={(e) => e.stopPropagation()}
          as={motion.div}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            <CloseButton onClick={onClose}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </CloseButton>
          </ModalHeader>

          <ModalBody>
            {loading ? (
              <LoadingContainer>
                <LoadingSpinner />
                <LoadingText>데이터를 불러오는 중...</LoadingText>
              </LoadingContainer>
            ) : (
              <>
                {/* Year Selector */}
                <YearSelectorContainer>
                  <YearArrowButton
                    onClick={() => handleYearChange('prev')}
                    disabled={selectedYear === data[0]?.year}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </YearArrowButton>

                  <YearDisplayWrapper>
                    <YearDisplay
                      onClick={() => setShowYearDropdown(!showYearDropdown)}
                    >
                      {selectedYear}년
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </YearDisplay>

                    {showYearDropdown && (
                      <YearDropdown>
                        {data.map((item) => (
                          <YearOption
                            key={item.year}
                            $active={item.year === selectedYear}
                            onClick={() => {
                              setSelectedYear(item.year)
                              setShowYearDropdown(false)
                            }}
                          >
                            {item.year}년
                          </YearOption>
                        ))}
                      </YearDropdown>
                    )}
                  </YearDisplayWrapper>

                  <YearArrowButton
                    onClick={() => handleYearChange('next')}
                    disabled={selectedYear === data[data.length - 1]?.year}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </YearArrowButton>
                </YearSelectorContainer>

                {type === 'population' ? (
                  <>
                    {/* Gender Statistics */}
                    <GenderStatsGrid>
                      <SimpleStatCard $highlight={false}>
                        <StatIcon $highlight={false}>
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </StatIcon>
                        <StatLabel $highlight={false}>남성 인구</StatLabel>
                        <StatValue $highlight={false}>
                          {formatNumber(
                            Math.floor((currentData?.value || 0) * 0.498),
                          )}
                        </StatValue>
                      </SimpleStatCard>

                      <SimpleStatCard $highlight>
                        <StatIcon $highlight>
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </StatIcon>
                        <StatLabel $highlight>총 인구</StatLabel>
                        <StatValue $highlight>
                          {formatNumber(currentData?.value || 0)}
                        </StatValue>
                      </SimpleStatCard>

                      <SimpleStatCard $highlight={false}>
                        <StatIcon $highlight={false}>
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </StatIcon>
                        <StatLabel $highlight={false}>여성 인구</StatLabel>
                        <StatValue $highlight={false}>
                          {formatNumber(
                            Math.floor((currentData?.value || 0) * 0.502),
                          )}
                        </StatValue>
                      </SimpleStatCard>
                    </GenderStatsGrid>

                    {/* Population Pyramid */}
                    <PyramidSection>
                      <SectionTitle>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M3 3h18v18H3z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        인구 피라미드
                      </SectionTitle>
                      <PyramidChartContainer>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={pyramidData.map((item) => ({
                              ...item,
                              male: -item.male, // 남성을 음수로 변환하여 왼쪽에 표시
                            }))}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e8eaed"
                            />
                            <XAxis
                              type="number"
                              stroke="#5f6368"
                              style={{ fontSize: '12px' }}
                              tickFormatter={(value) =>
                                formatNumber(Math.abs(value))
                              }
                            />
                            <YAxis
                              dataKey="ageGroup"
                              type="category"
                              stroke="#5f6368"
                              style={{ fontSize: '12px' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e8eaed',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '10px 12px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(value: number, name: string) => [
                                formatValue(Math.abs(value)),
                                name === 'male' ? '남성' : '여성',
                              ]}
                            />
                            <Legend
                              wrapperStyle={{
                                fontSize: '12px',
                              }}
                              formatter={(value) =>
                                value === 'male' ? '남성' : '여성'
                              }
                            />
                            <Bar dataKey="male" fill="#60a5fa" name="male" />
                            <Bar
                              dataKey="female"
                              fill="#f87171"
                              name="female"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </PyramidChartContainer>
                    </PyramidSection>

                    {/* Population Statistics Cards */}
                    <StatsGrid>
                      <StatCard>
                        <StatLabel>최근 값 (2024)</StatLabel>
                        <StatValue>
                          {formatValue(data[data.length - 1]?.value || 0)}
                        </StatValue>
                      </StatCard>
                      <StatCard>
                        <StatLabel>10년 전 (2014)</StatLabel>
                        <StatValue>
                          {formatValue(data[0]?.value || 0)}
                        </StatValue>
                      </StatCard>
                      <StatCard>
                        <StatLabel>평균 성장률</StatLabel>
                        <StatValue
                          positive={
                            data.reduce(
                              (sum, dataItem) =>
                                sum + (dataItem.growthRate || 0),
                              0,
                            ) /
                              data.length >
                            0
                          }
                        >
                          {(
                            data.reduce(
                              (sum, dataItem) =>
                                sum + (dataItem.growthRate || 0),
                              0,
                            ) / data.length || 0
                          ).toFixed(2)}
                          %
                        </StatValue>
                      </StatCard>
                      <StatCard>
                        <StatLabel>총 변화</StatLabel>
                        <StatValue
                          positive={
                            data[data.length - 1]?.value - data[0]?.value > 0
                          }
                        >
                          {(
                            ((data[data.length - 1]?.value - data[0]?.value) /
                              data[0]?.value) *
                              100 || 0
                          ).toFixed(2)}
                          %
                        </StatValue>
                      </StatCard>
                    </StatsGrid>

                    {/* Population Chart */}
                    <ChartSection>
                      <SectionTitle>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 2v20M2 12h20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {valueLabel} 추이 (2014-2024)
                      </SectionTitle>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={data}>
                            <defs>
                              <linearGradient
                                id="colorValue"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#4285f4"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#4285f4"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f1f3f4"
                            />
                            <XAxis
                              dataKey="year"
                              stroke="#5f6368"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                            />
                            <YAxis
                              stroke="#5f6368"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                              tickFormatter={formatValue}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e8eaed',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '10px 12px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(value: number) => [
                                formatValue(value),
                                valueLabel,
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#4285f4"
                              strokeWidth={2}
                              fill="url(#colorValue)"
                              dot={{
                                fill: '#4285f4',
                                radius: 4,
                                strokeWidth: 2,
                                stroke: '#fff',
                              }}
                              activeDot={{
                                radius: 6,
                                strokeWidth: 2,
                                stroke: '#fff',
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </ChartSection>
                  </>
                ) : (
                  <>
                    {/* GDP Statistics Cards */}
                    <StatsGrid>
                      <StatCard>
                        <StatLabel>최근 값 (2024)</StatLabel>
                        <StatValue>
                          {formatValue(data[data.length - 1]?.value || 0)}
                        </StatValue>
                      </StatCard>
                      <StatCard>
                        <StatLabel>10년 전 (2014)</StatLabel>
                        <StatValue>
                          {formatValue(data[0]?.value || 0)}
                        </StatValue>
                      </StatCard>
                      <StatCard>
                        <StatLabel>평균 성장률</StatLabel>
                        <StatValue
                          positive={
                            data.reduce(
                              (sum, dataItem) =>
                                sum + (dataItem.growthRate || 0),
                              0,
                            ) /
                              data.length >
                            0
                          }
                        >
                          {(
                            data.reduce(
                              (sum, dataItem) =>
                                sum + (dataItem.growthRate || 0),
                              0,
                            ) / data.length || 0
                          ).toFixed(2)}
                          %
                        </StatValue>
                      </StatCard>
                      <StatCard>
                        <StatLabel>총 변화</StatLabel>
                        <StatValue
                          positive={
                            data[data.length - 1]?.value - data[0]?.value > 0
                          }
                        >
                          {(
                            ((data[data.length - 1]?.value - data[0]?.value) /
                              data[0]?.value) *
                              100 || 0
                          ).toFixed(2)}
                          %
                        </StatValue>
                      </StatCard>
                    </StatsGrid>

                    {/* GDP Chart */}
                    <ChartSection>
                      <SectionTitle>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 2v20M2 12h20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {valueLabel} 추이 (2014-2024)
                      </SectionTitle>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={data}>
                            <defs>
                              <linearGradient
                                id="colorGDP"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#34a853"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#34a853"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f1f3f4"
                            />
                            <XAxis
                              dataKey="year"
                              stroke="#5f6368"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                            />
                            <YAxis
                              stroke="#5f6368"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                              tickFormatter={formatValue}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e8eaed',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '10px 12px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(value: number) => [
                                formatValue(value),
                                valueLabel,
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#34a853"
                              strokeWidth={2}
                              fill="url(#colorGDP)"
                              dot={{
                                fill: '#34a853',
                                radius: 4,
                                strokeWidth: 2,
                                stroke: '#fff',
                              }}
                              activeDot={{
                                radius: 6,
                                strokeWidth: 2,
                                stroke: '#fff',
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </ChartSection>

                    {/* GDP Growth Rate Chart */}
                    <ChartSection>
                      <SectionTitle>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M3 3l18 18M3 21l18-18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        연도별 성장률
                      </SectionTitle>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={data}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f1f3f4"
                            />
                            <XAxis
                              dataKey="year"
                              stroke="#5f6368"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                            />
                            <YAxis
                              stroke="#5f6368"
                              style={{ fontSize: '12px', fontWeight: 500 }}
                              tickFormatter={(value) => value.toFixed(1) + '%'}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e8eaed',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '10px 12px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(value: number) => [
                                value.toFixed(2) + '%',
                                '성장률',
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="growthRate"
                              stroke="#fbbc04"
                              strokeWidth={2}
                              dot={{
                                fill: '#fbbc04',
                                radius: 4,
                                strokeWidth: 2,
                                stroke: '#fff',
                              }}
                              activeDot={{
                                radius: 6,
                                strokeWidth: 2,
                                stroke: '#fff',
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </ChartSection>
                  </>
                )}
              </>
            )}
          </ModalBody>
        </ModalContainer>
      </Overlay>
    </AnimatePresence>
  )
}

// Styled Components (CountryDetail 스타일 시스템과 일치)
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ModalContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 9999;
`

const ModalHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e8eaed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #202124;
  letter-spacing: -0.01em;
`

const CloseButton = styled.button`
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #202124;
  }
`

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #ffffff;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #bfbfbf;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 20px;
`

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e8eaed;
  border-top-color: #4285f4;
  border-radius: 50%;
  animation: spin 0.8s ease-in-out infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.div`
  font-size: 14px;
  color: #5f6368;
  font-weight: 500;
`

const YearSelectorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8ebed;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`

const YearArrowButton = styled.button`
  background: #ffffff;
  border: 1px solid #e8ebed;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #dadce0;
    color: #202124;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const YearDisplayWrapper = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
`

const YearDisplay = styled.button`
  background: #202124;
  color: #ffffff;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #5f6368;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const YearDropdown = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 280px;
  overflow-y: auto;
  z-index: 10;
  padding: 4px;
  min-width: 140px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;
  }
`

const YearOption = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 8px 12px;
  background: ${(props) => (props.$active ? '#202124' : 'transparent')};
  color: ${(props) => (props.$active ? '#ffffff' : '#5f6368')};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? 600 : 500)};
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: ${(props) => (props.$active ? '#202124' : '#f8f9fa')};
  }
`

const GenderStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const SimpleStatCard = styled.div<{ $highlight?: boolean }>`
  background: #ffffff;
  padding: 20px 22px;
  border-radius: 12px;
  border: 1px solid ${(props) => (props.$highlight ? '#e8ebed' : '#e8ebed')};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

const StatIcon = styled.div<{ $highlight?: boolean }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  ${SimpleStatCard}:hover & {
    color: #202124;
  }
`

const StatLabel = styled.div<{ $highlight?: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const StatValue = styled.div<{
  $highlight?: boolean
  positive?: boolean
}>`
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
  color: ${(props) => {
    if (props.positive !== undefined) {
      return props.positive ? '#10b981' : '#ef4444'
    }
    return '#202124'
  }};
`

const PyramidSection = styled.div`
  margin-bottom: 28px;
`

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: #202124;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #5f6368;
    width: 18px;
    height: 18px;
  }
`

const PyramidChartContainer = styled.div`
  background: #ffffff;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e8ebed;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const StatCard = styled.div`
  background: #ffffff;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e8ebed;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`

const ChartSection = styled.div`
  margin-bottom: 28px;
`

const ChartContainer = styled.div`
  background: #ffffff;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e8ebed;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  margin-top: 16px;
`
