import { useState } from 'react'

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

import * as S from './CountryDetail.styles'

// 타임라인 이벤트 타입
type TimelineEventType = 'trade' | 'politics' | 'economy' | 'diplomacy'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: TimelineEventType
  relatedCountries?: string[]
}

interface NewsItem {
  id: string
  title: string
  source: string
  date: string
  category: string
  link?: string
}

interface TimelineNewsSectionProps {
  economicGrowthData: Array<{ year: string; growth: number; avgGrowth: number }>
  populationGrowthData: Array<{
    year: string
    rate: number
    projection: number
  }>
  exportData: Array<{ category: string; value: number }>
  importData: Array<{ category: string; value: number }>
}

// Mock 타임라인 데이터
const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    date: '2024.11.15',
    title: '한미 무역협정 재협상 시작',
    description: '트럼프 행정부와 한국 정부 간 무역협정 재협상 공식 개시',
    type: 'trade',
    relatedCountries: ['미국'],
  },
  {
    id: '2',
    date: '2024.10.28',
    title: '반도체 수출 규제 완화',
    description: '미국 정부, 한국 반도체 기업에 대한 수출 규제 일부 완화 발표',
    type: 'trade',
    relatedCountries: ['미국'],
  },
  {
    id: '3',
    date: '2024.09.12',
    title: '한일 정상회담 개최',
    description: '한국-일본 정상회담, 경제협력 강화 방안 논의',
    type: 'diplomacy',
    relatedCountries: ['일본'],
  },
  {
    id: '4',
    date: '2024.08.05',
    title: '기준금리 동결 결정',
    description: '한국은행, 기준금리 3.50% 동결 결정',
    type: 'economy',
  },
  {
    id: '5',
    date: '2024.07.20',
    title: '미국과 철강 관세 협상',
    description: '트럼프 행정부, 한국산 철강 관세 인상 예고에 따른 긴급 협상',
    type: 'trade',
    relatedCountries: ['미국'],
  },
]

// Mock 뉴스 데이터
const mockNewsItems: NewsItem[] = [
  {
    id: '1',
    title: '삼성전자, AI 반도체 신제품 발표로 글로벌 시장 공략',
    source: '연합뉴스',
    date: '1시간 전',
    category: '경제',
  },
  {
    id: '2',
    title: '한미 정상회담, 반도체 동맹 강화 합의',
    source: '조선일보',
    date: '3시간 전',
    category: '정치',
  },
  {
    id: '3',
    title: '코스피, 외국인 매수세에 2,600선 돌파',
    source: '한국경제',
    date: '5시간 전',
    category: '경제',
  },
  {
    id: '4',
    title: 'K-방산 수출 250억불 돌파, 역대 최고치',
    source: 'MBC뉴스',
    date: '7시간 전',
    category: '산업',
  },
  {
    id: '5',
    title: '한-EU FTA 개정안 타결, 무역 확대 기대',
    source: '매일경제',
    date: '9시간 전',
    category: '국제',
  },
  {
    id: '6',
    title: '전기차 배터리 시장, 한국 기업 점유율 1위 유지',
    source: '전자신문',
    date: '11시간 전',
    category: '산업',
  },
]

const typeColors: Record<
  TimelineEventType,
  { bg: string; text: string; border: string }
> = {
  trade: { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
  politics: { bg: '#f5f3ff', text: '#5b21b6', border: '#8b5cf6' },
  economy: { bg: '#ecfdf5', text: '#065f46', border: '#10b981' },
  diplomacy: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
}

const typeLabels: Record<TimelineEventType, string> = {
  trade: '무역',
  politics: '정치',
  economy: '경제',
  diplomacy: '외교',
}

// 뉴스 카테고리 타입
type NewsCategoryType = '경제' | '정치' | '산업' | '국제'

const newsCategoryColors: Record<
  NewsCategoryType,
  { bg: string; text: string; border: string }
> = {
  경제: { bg: '#ecfdf5', text: '#065f46', border: '#10b981' },
  정치: { bg: '#f5f3ff', text: '#5b21b6', border: '#8b5cf6' },
  산업: { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
  국제: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
}

/**
 * 타임라인 & 주요 뉴스 섹션
 */
export function TimelineNewsSection({
  economicGrowthData,
  populationGrowthData,
  exportData,
  importData,
}: TimelineNewsSectionProps) {
  const [selectedType, setSelectedType] = useState<TimelineEventType | 'all'>(
    'all',
  )
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<
    NewsCategoryType | 'all'
  >('all')
  const [newsViewMode, setNewsViewMode] = useState<'list' | 'card'>('list')

  const filteredEvents =
    selectedType === 'all'
      ? mockTimelineEvents
      : mockTimelineEvents.filter((event) => event.type === selectedType)

  const filteredNews =
    selectedNewsCategory === 'all'
      ? mockNewsItems
      : mockNewsItems.filter((news) => news.category === selectedNewsCategory)

  return (
    <div style={{ marginBottom: '40px' }}>
      <S.MapGrid
        as={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          gridTemplateColumns: '65% 35%',
          gap: '16px',
        }}
      >
        {/* 좌측: 주요 뉴스 + 차트들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 주요 뉴스 섹션 */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              height: '560px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = '#cbd5e1'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
              const beforeEl = e.currentTarget.querySelector(
                '.hover-gradient',
              ) as HTMLElement
              if (beforeEl) beforeEl.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
              const beforeEl = e.currentTarget.querySelector(
                '.hover-gradient',
              ) as HTMLElement
              if (beforeEl) beforeEl.style.opacity = '0'
            }}
          >
            {/* 상단 그라데이션 라인 */}
            <div
              className="hover-gradient"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background:
                  'linear-gradient(90deg, #4285f4 0%, #34a853 25%, #fbbc04 50%, #ea4335 75%, #4285f4 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                zIndex: 10,
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f1f5f9',
                background: '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#ffffff',
                }}
              >
                <span style={{ fontSize: '18px' }}>📰</span>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  주요 뉴스
                </h3>
                {/* 뷰 전환 버튼 */}
                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                  <button
                    onClick={() => setNewsViewMode('list')}
                    style={{
                      padding: '6px 10px',
                      background:
                        newsViewMode === 'list' ? '#f1f5f9' : 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="리스트 보기"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={newsViewMode === 'list' ? '#64748b' : '#94a3b8'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setNewsViewMode('card')}
                    style={{
                      padding: '6px 10px',
                      background:
                        newsViewMode === 'card' ? '#f1f5f9' : 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    title="카드 보기"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={newsViewMode === 'card' ? '#64748b' : '#94a3b8'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedNewsCategory('all')}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    background:
                      selectedNewsCategory === 'all'
                        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                        : '#fff',
                    color: selectedNewsCategory === 'all' ? '#fff' : '#64748b',
                    border: `2px solid ${selectedNewsCategory === 'all' ? '#1e293b' : '#e5e7eb'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: 700,
                    boxShadow:
                      selectedNewsCategory === 'all'
                        ? '0 4px 12px rgba(30, 41, 59, 0.3)'
                        : 'none',
                    transform:
                      selectedNewsCategory === 'all'
                        ? 'translateY(-1px)'
                        : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedNewsCategory !== 'all') {
                      e.currentTarget.style.borderColor = '#cbd5e1'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedNewsCategory !== 'all') {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  전체
                </button>
                {(Object.keys(newsCategoryColors) as NewsCategoryType[]).map(
                  (category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedNewsCategory(category)}
                      style={{
                        padding: '7px 14px',
                        fontSize: '12px',
                        background:
                          selectedNewsCategory === category
                            ? `linear-gradient(135deg, ${newsCategoryColors[category].bg} 0%, ${newsCategoryColors[category].bg}dd 100%)`
                            : '#fff',
                        color:
                          selectedNewsCategory === category
                            ? newsCategoryColors[category].text
                            : '#64748b',
                        border: `2px solid ${selectedNewsCategory === category ? newsCategoryColors[category].border : '#e5e7eb'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontWeight: 700,
                        boxShadow:
                          selectedNewsCategory === category
                            ? `0 4px 12px ${newsCategoryColors[category].border}40`
                            : 'none',
                        transform:
                          selectedNewsCategory === category
                            ? 'translateY(-1px)'
                            : 'translateY(0)',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedNewsCategory !== category) {
                          e.currentTarget.style.borderColor =
                            newsCategoryColors[category].border
                          e.currentTarget.style.backgroundColor = `${newsCategoryColors[category].bg}80`
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedNewsCategory !== category) {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.backgroundColor = '#fff'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }
                      }}
                    >
                      {category}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '18px 22px',
                background: '#ffffff',
              }}
            >
              {newsViewMode === 'list' ? (
                // 리스트 형식 (가로 레이아웃 - 썸네일 + 내용)
                filteredNews.map((news, index) => {
                  const categoryColor =
                    newsCategoryColors[news.category as NewsCategoryType]
                  return (
                    <motion.div
                      key={news.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: index * 0.08,
                        type: 'spring',
                        stiffness: 120,
                        damping: 15,
                      }}
                      whileHover={{ scale: 1.01, y: -2 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr',
                        gap: '14px',
                        cursor: 'pointer',
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden',
                        padding: '12px',
                        marginBottom:
                          index < filteredNews.length - 1 ? '12px' : '0',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = categoryColor.border
                        e.currentTarget.style.boxShadow = `0 6px 20px ${categoryColor.border}25`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#f1f5f9'
                        e.currentTarget.style.boxShadow =
                          '0 1px 3px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      {/* 썸네일 */}
                      <div
                        style={{
                          width: '120px',
                          height: '90px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${categoryColor.bg} 0%, ${categoryColor.bg}dd 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${categoryColor.border}`,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '36px',
                            filter: 'grayscale(0.2) opacity(0.7)',
                          }}
                        >
                          📰
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            padding: '3px 8px',
                            fontSize: '10px',
                            background: '#ffffff',
                            color: categoryColor.text,
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                        >
                          {news.category}
                        </div>
                      </div>

                      {/* 내용 */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#0f172a',
                              marginBottom: '6px',
                              lineHeight: '1.4',
                              letterSpacing: '-0.02em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {news.title}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#94a3b8"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                fontWeight: 600,
                              }}
                            >
                              {news.source}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#94a3b8',
                              fontWeight: 600,
                            }}
                          >
                            {news.date}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                // 카드 레이아웃 (3열 그리드)
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                  }}
                >
                  {filteredNews.map((news, index) => {
                    const categoryColor =
                      newsCategoryColors[news.category as NewsCategoryType]
                    return (
                      <motion.div
                        key={news.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: index * 0.08,
                          type: 'spring',
                          stiffness: 120,
                          damping: 15,
                        }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          borderRadius: '12px',
                          border: '1px solid #f1f5f9',
                          background: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            categoryColor.border
                          e.currentTarget.style.boxShadow = `0 8px 24px ${categoryColor.border}20`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#f1f5f9'
                          e.currentTarget.style.boxShadow =
                            '0 1px 3px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        {/* 썸네일 */}
                        <div
                          style={{
                            width: '100%',
                            height: '300px',
                            background: `linear-gradient(135deg, ${categoryColor.bg} 0%, ${categoryColor.bg}dd 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '56px',
                              filter: 'grayscale(0.2) opacity(0.6)',
                            }}
                          >
                            📰
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              left: '10px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              background: '#ffffff',
                              color: categoryColor.text,
                              borderRadius: '6px',
                              fontWeight: 800,
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            {news.category}
                          </div>
                        </div>

                        {/* 내용 */}
                        <div
                          style={{
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: '#0f172a',
                              lineHeight: '1.5',
                              letterSpacing: '-0.02em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              minHeight: '60px',
                            }}
                          >
                            {news.title}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: 'auto',
                              paddingTop: '10px',
                              borderTop: '1px solid #f1f5f9',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: '#94a3b8',
                                  fontWeight: 600,
                                }}
                              >
                                {news.source}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                fontWeight: 600,
                              }}
                            >
                              {news.date}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 차트 2개 추가 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              height: '430px',
            }}
          >
            {/* 경제 성장률 차트 */}
            <S.ChartCardModern
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
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
                      <linearGradient
                        id="colorGrowth"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4285f4"
                          stopOpacity={0.4}
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
                      wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="growth"
                      stroke="#4285f4"
                      strokeWidth={2.5}
                      dot={{ fill: '#4285f4', strokeWidth: 2, radius: 4 }}
                      activeDot={{ radius: 6, strokeWidth: 2 }}
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

            {/* 인구 성장률 차트 */}
            <S.ChartCardModern
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 }}
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
                        <stop
                          offset="5%"
                          stopColor="#34a853"
                          stopOpacity={0.4}
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
                      wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }}
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
          </div>
        </div>

        {/* 타임라인 섹션 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            height: '1006px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s ease',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
            const beforeEl = e.currentTarget.querySelector(
              '.hover-gradient',
            ) as HTMLElement
            if (beforeEl) beforeEl.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)'
            const beforeEl = e.currentTarget.querySelector(
              '.hover-gradient',
            ) as HTMLElement
            if (beforeEl) beforeEl.style.opacity = '0'
          }}
        >
          {/* 상단 그라데이션 라인 */}
          <div
            className="hover-gradient"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background:
                'linear-gradient(90deg, #4285f4 0%, #34a853 25%, #fbbc04 50%, #ea4335 75%, #4285f4 100%)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              zIndex: 10,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>⏰</span>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                주요 타임라인
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedType('all')}
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  background:
                    selectedType === 'all'
                      ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                      : '#fff',
                  color: selectedType === 'all' ? '#fff' : '#64748b',
                  border: `2px solid ${selectedType === 'all' ? '#1e293b' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: 700,
                  boxShadow:
                    selectedType === 'all'
                      ? '0 4px 12px rgba(30, 41, 59, 0.3)'
                      : 'none',
                  transform:
                    selectedType === 'all'
                      ? 'translateY(-1px)'
                      : 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (selectedType !== 'all') {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedType !== 'all') {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                전체
              </button>
              {(Object.keys(typeLabels) as TimelineEventType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    background:
                      selectedType === type
                        ? `linear-gradient(135deg, ${typeColors[type].bg} 0%, ${typeColors[type].bg}dd 100%)`
                        : '#fff',
                    color:
                      selectedType === type ? typeColors[type].text : '#64748b',
                    border: `2px solid ${selectedType === type ? typeColors[type].border : '#e5e7eb'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: 700,
                    boxShadow:
                      selectedType === type
                        ? `0 4px 12px ${typeColors[type].border}40`
                        : 'none',
                    transform:
                      selectedType === type
                        ? 'translateY(-1px)'
                        : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== type) {
                      e.currentTarget.style.borderColor =
                        typeColors[type].border
                      e.currentTarget.style.backgroundColor = `${typeColors[type].bg}80`
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== type) {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.backgroundColor = '#fff'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              background: 'transparent',
              display: 'flex',
              alignItems: filteredEvents.length === 0 ? 'center' : 'flex-start',
              justifyContent:
                filteredEvents.length === 0 ? 'center' : 'flex-start',
            }}
          >
            {filteredEvents.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '60px 20px',
                }}
              >
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-10px',
                      borderRadius: '50%',
                      background:
                        'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%)',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div
                  style={{
                    textAlign: 'center',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: '0 0 10px 0',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    타임라인이 없습니다
                  </h4>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#64748b',
                      lineHeight: '1.8',
                      margin: 0,
                    }}
                  >
                    선택한 유형의 타임라인 이벤트가 없습니다.
                    <br />
                    다른 필터를 선택해보세요.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  padding: '32px 28px',
                  width: '100%',
                }}
              >
                {/* 타임라인 선 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '42px',
                    top: '12px',
                    bottom: '12px',
                    width: '2px',
                    background: '#e2e8f0',
                    borderRadius: '1px',
                  }}
                />

                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{
                      delay: index * 0.1,
                      type: 'spring',
                      stiffness: 100,
                      damping: 15,
                    }}
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr',
                      gap: '24px',
                      marginBottom:
                        index < filteredEvents.length - 1 ? '32px' : '0',
                    }}
                  >
                    {/* 왼쪽: 날짜 + 점 */}
                    <div style={{ position: 'relative', paddingTop: '4px' }}>
                      {/* 타임라인 점 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '11px',
                          top: '12px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#64748b',
                          border: '3px solid #ffffff',
                          boxShadow: '0 0 0 2px #e2e8f0',
                          zIndex: 2,
                        }}
                      />

                      {/* 날짜 */}
                      <div
                        style={{
                          textAlign: 'right',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginBottom: '8px',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {event.date}
                        </div>
                        <span
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            background: `linear-gradient(135deg, ${typeColors[event.type].bg} 0%, ${typeColors[event.type].bg}dd 100%)`,
                            color: typeColors[event.type].text,
                            border: `1px solid ${typeColors[event.type].border}`,
                            borderRadius: '6px',
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            display: 'inline-block',
                          }}
                        >
                          {typeLabels[event.type]}
                        </span>
                      </div>
                    </div>

                    {/* 오른쪽: 내용 카드 */}
                    <motion.div
                      whileHover={{ scale: 1.01, x: 4 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #f1f5f9',
                        borderRadius: '12px',
                        padding: '16px 18px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          typeColors[event.type].border
                        e.currentTarget.style.boxShadow = `0 6px 20px ${typeColors[event.type].border}25`
                        e.currentTarget.style.background = `linear-gradient(135deg, #ffffff 0%, ${typeColors[event.type].bg}25 100%)`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#f1f5f9'
                        e.currentTarget.style.boxShadow =
                          '0 1px 3px rgba(0, 0, 0, 0.03)'
                        e.currentTarget.style.background = '#ffffff'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#0f172a',
                          marginBottom: '8px',
                          lineHeight: '1.5',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {event.title}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#64748b',
                          lineHeight: '1.6',
                        }}
                      >
                        {event.description}
                      </div>
                      {event.relatedCountries && (
                        <div
                          style={{
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>🇺🇸</span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#94a3b8',
                              fontWeight: 600,
                            }}
                          >
                            관련 국가: {event.relatedCountries.join(', ')}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </S.MapGrid>
    </div>
  )
}
