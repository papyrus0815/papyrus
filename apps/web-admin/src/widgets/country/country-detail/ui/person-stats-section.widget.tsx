import { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiSettings } from 'react-icons/fi'

import { PositionCategoryCrudModal } from '@/pages/persons/PositionCategoryCrudModal'
import { type Person, personApi } from '@/shared/api/person'

interface PersonStatsProps {
  countryId: string
  /** true면 상단 여백 겹침 없음(탭 아래 등) — 카드 그리드 marginTop 0 */
  noOverlap?: boolean
}

interface PersonStats {
  totalPersons: number
  maleCount: number
  femaleCount: number
  aliveCount: number
  deceasedCount: number
  averageAge: number
  byRole: { [key: string]: number }
  /** 출생 연도 기준 세기별 분포 (예: "20세기" -> 인원 수) */
  byCentury: { [key: string]: number }
  recentPersons: Person[]
}

/**
 * 인물 통계 대시보드
 * - 전체 인물 통계
 * - 성별/생존 현황
 * - 역할별 분포
 * - 세기별 분포
 * - 최근 등록 인물
 */
const MIN_LOADING_MS = 1000
const FADE_DURATION = 0.35

export function PersonStatsSection({ countryId, noOverlap }: PersonStatsProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCategoryCrudModal, setShowCategoryCrudModal] = useState(false)
  const loadStartRef = useRef<number>(Date.now())
  const minLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [stats, setStats] = useState<PersonStats>({
    totalPersons: 0,
    maleCount: 0,
    femaleCount: 0,
    aliveCount: 0,
    deceasedCount: 0,
    averageAge: 0,
    byRole: {},
    byCentury: {},
    recentPersons: [],
  })

  // 데이터 로드 — 최소 1초 로딩 표시 후 부드럽게 전환
  useEffect(() => {
    loadStartRef.current = Date.now()
    setIsLoading(true)
    const fetchData = async () => {
      try {
        const data = await personApi.getByCountryId(countryId)
        setPersons(data)
        calculateStats(data)
      } catch {
        // fetch failed, keep state as-is
      } finally {
        const elapsed = Date.now() - loadStartRef.current
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed)
        minLoadTimeoutRef.current = setTimeout(() => {
          setIsLoading(false)
          minLoadTimeoutRef.current = null
        }, remaining)
      }
    }
    fetchData()
    return () => {
      if (minLoadTimeoutRef.current) {
        clearTimeout(minLoadTimeoutRef.current)
        minLoadTimeoutRef.current = null
      }
    }
  }, [countryId])

  // 통계 계산
  const calculateStats = (personList: Person[]) => {
    const total = personList.length
    const male = personList.filter((p) => p.gender === 'MALE').length
    const female = personList.filter((p) => p.gender === 'FEMALE').length
    const alive = personList.filter((p) => p.deathDate === null).length
    const deceased = total - alive

    // 평균 나이 계산 (생존자 기준)
    const alivePersons = personList.filter(
      (p) => p.deathDate === null && p.birthDate,
    )
    const avgAge =
      alivePersons.length > 0
        ? Math.round(
            alivePersons.reduce((sum, p) => {
              const birthYear = new Date(p.birthDate!).getFullYear()
              const age = new Date().getFullYear() - birthYear
              return sum + age
            }, 0) / alivePersons.length,
          )
        : 0

    // 역할별 분포
    const roleMap: { [key: string]: number } = {}
    personList.forEach((p) => {
      const role = p.role || '기타'
      roleMap[role] = (roleMap[role] || 0) + 1
    })

    // 세기별 분포 (출생 연도 기준) — birthDate 또는 birthYear 모두 사용
    const centuryMap: { [key: string]: number } = {}
    personList.forEach((p) => {
      let year: number | null = null
      if (p.birthDate) {
        year = new Date(p.birthDate).getFullYear()
      } else {
        const by = (p as { birthYear?: number }).birthYear
        if (typeof by === 'number' && !Number.isNaN(by)) year = by
      }
      if (year != null) {
        // 1세기=1~100, 20세기=1901~2000, 21세기=2001~2100 (한국 통상 표기)
        let label: string
        if (year < 1500) label = '15세기 이전'
        else if (year >= 2100) label = '22세기 이후'
        else label = `${Math.floor(year / 100) + 1}세기`
        centuryMap[label] = (centuryMap[label] || 0) + 1
      }
    })

    // 최근 등록 인물 (상위 6명)
    const recent = [...personList]
      .sort(
        (a, b) =>
          new Date(b.createdAt || '').getTime() -
          new Date(a.createdAt || '').getTime(),
      )
      .slice(0, 6)

    setStats({
      totalPersons: total,
      maleCount: male,
      femaleCount: female,
      aliveCount: alive,
      deceasedCount: deceased,
      averageAge: avgAge,
      byRole: roleMap,
      byCentury: centuryMap,
      recentPersons: recent,
    })
  }

  return (
    <div style={{ position: 'relative', minHeight: '400px' }}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              color: '#64748b',
              position: 'absolute',
              inset: 0,
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #e2e8f0',
                  borderTopColor: '#8b5cf6',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p>인물 데이터를 불러오는 중...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: FADE_DURATION, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              padding: '24px',
              background: '#f8fafc',
              minHeight: 'calc(100vh - 200px)',
              position: 'relative',
            }}
          >
      {/* 통계 합계 요약 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)',
          marginTop: noOverlap ? 0 : -80,
          position: 'relative',
          zIndex: 11,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              opacity: 0.9,
            }}
          >
            인물 통계 합계
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowCategoryCrudModal(true)
            }}
            aria-label="관직 카테고리 관리"
            title="관직 카테고리 관리"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              padding: 0,
              border: 'none',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 12,
            }}
          >
            <FiSettings size={20} />
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px 24px',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          <span>
            <strong>총 {stats.totalPersons}명</strong>
          </span>
          <span style={{ opacity: 0.8 }}>·</span>
          <span>남 {stats.maleCount}명 / 여 {stats.femaleCount}명</span>
          <span style={{ opacity: 0.8 }}>·</span>
          <span>생존 {stats.aliveCount}명 / 사망 {stats.deceasedCount}명</span>
          <span style={{ opacity: 0.8 }}>·</span>
          <span>평균 나이 {stats.averageAge}세</span>
        </div>
      </div>

      {/* 통계 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '16px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          title="총 인물"
          value={stats.totalPersons}
          unit="명"
          color="#8b5cf6"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
          title="남성"
          value={stats.maleCount}
          unit="명"
          color="#3b82f6"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
          title="여성"
          value={stats.femaleCount}
          unit="명"
          color="#ec4899"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          title="생존"
          value={stats.aliveCount}
          unit="명"
          color="#10b981"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
          title="사망"
          value={stats.deceasedCount}
          unit="명"
          color="#64748b"
        />
        <StatCard
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          title="평균 나이"
          value={stats.averageAge}
          unit="세"
          color="#f59e0b"
        />
      </div>

      {/* 성별 및 생존 현황 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
      >
        {/* 성별 분포 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
              >
                <circle cx="9" cy="9" r="2" />
                <path d="M9 11a4 4 0 0 0-4 4v2h8v-2a4 4 0 0 0-4-4zM16 11h3M17.5 9.5v3" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                성별 분포
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                남성 vs 여성 비율
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '200px',
                  background:
                    'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 800 }}>
                  {stats.maleCount}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '8px',
                  }}
                >
                  남성
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    fontSize: '12px',
                    opacity: 0.9,
                  }}
                >
                  {stats.totalPersons > 0 ? ((stats.maleCount / stats.totalPersons) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '200px',
                  background:
                    'linear-gradient(180deg, #ec4899 0%, #f472b6 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3)',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 800 }}>
                  {stats.femaleCount}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '8px',
                  }}
                >
                  여성
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    fontSize: '12px',
                    opacity: 0.9,
                  }}
                >
                  {stats.totalPersons > 0 ? ((stats.femaleCount / stats.totalPersons) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 생존 현황 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                생존 현황
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                생존 vs 사망 비율
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '200px',
                  background:
                    'linear-gradient(180deg, #10b981 0%, #34d399 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 800 }}>
                  {stats.aliveCount}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '8px',
                  }}
                >
                  생존
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    fontSize: '12px',
                    opacity: 0.9,
                  }}
                >
                  {stats.totalPersons > 0 ? ((stats.aliveCount / stats.totalPersons) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '200px',
                  background:
                    'linear-gradient(180deg, #64748b 0%, #94a3b8 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(100, 116, 139, 0.3)',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '48px', fontWeight: 800 }}>
                  {stats.deceasedCount}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '8px',
                  }}
                >
                  사망
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    fontSize: '12px',
                    opacity: 0.9,
                  }}
                >
                  {stats.totalPersons > 0 ? ((stats.deceasedCount / stats.totalPersons) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 역할별 분포 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              역할별 분포
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              인물들의 주요 역할 분류
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {Object.entries(stats.byRole)
            .sort(([, a], [, b]) => b - a)
            .map(([role, count], idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px',
                  background:
                    'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e5e5e5',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow =
                    '0 8px 20px rgba(139, 92, 246, 0.15)'
                  e.currentTarget.style.borderColor = '#8b5cf6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e5e5'
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: '#64748b',
                    marginBottom: '8px',
                  }}
                >
                  {role}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      color: '#8b5cf6',
                    }}
                  >
                    {count}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#64748b',
                    }}
                  >
                    명
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    height: '4px',
                    background: '#e5e5e5',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.totalPersons > 0 ? (count / stats.totalPersons) * 100 : 0}%`,
                      background:
                        'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 출생 세기별 분포 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              출생 세기별 분포
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              출생 연도 기준 세기(世紀)별 분류
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gap: '12px 8px',
            alignItems: 'flex-end',
            height: '240px',
          }}
        >
          {(() => {
            const centuryOrder = [
              '15세기 이전',
              '15세기',
              '16세기',
              '17세기',
              '18세기',
              '19세기',
              '20세기',
              '21세기',
              '22세기 이후',
            ]
            const maxCount = Math.max(
              1,
              ...Object.values(stats.byCentury),
              0,
            )
            return centuryOrder.map((century, idx) => {
              const count = stats.byCentury[century] ?? 0
              const height = maxCount > 0 ? (count / maxCount) * 200 : 0
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      minHeight: count > 0 ? '24px' : 0,
                      height: `${height}px`,
                      background:
                        count > 0
                          ? 'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)'
                          : 'rgba(226, 232, 240, 0.6)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      padding: count > 0 ? '8px 4px' : 0,
                      color: count > 0 ? '#ffffff' : 'transparent',
                      fontSize: '14px',
                      fontWeight: 700,
                      boxShadow:
                        count > 0
                          ? '0 -2px 8px rgba(59, 130, 246, 0.3)'
                          : 'none',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      if (count > 0) e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    title={`${century}: ${count}명`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {century}
                  </span>
                </div>
              )
            })
          })()}
        </div>
        {Object.keys(stats.byCentury).length === 0 && (
          <div
            style={{
              marginTop: '16px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '14px',
            }}
          >
            출생 연도 정보가 있는 인물이 없습니다.
          </div>
        )}
      </div>

      {/* 최근 등록 인물 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              최근 등록 인물
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              가장 최근에 등록된 인물 6명
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {stats.recentPersons.map((person, idx) => (
            <div
              key={idx}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow =
                  '0 8px 20px rgba(139, 92, 246, 0.15)'
                e.currentTarget.style.borderColor = '#8b5cf6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#e5e5e5'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background:
                      person.gender === 'MALE'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'
                        : 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '20px',
                    fontWeight: 700,
                  }}
                >
                  {person.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    {person.name}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    {person.role || '역할 없음'}
                  </p>
                </div>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>출생</span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>
                    {person.birthDate
                      ? new Date(person.birthDate).getFullYear()
                      : '미상'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>상태</span>
                  <span
                    style={{
                      color: person.deathDate ? '#64748b' : '#10b981',
                      fontWeight: 600,
                    }}
                  >
                    {person.deathDate ? '사망' : '생존'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PositionCategoryCrudModal
        isOpen={showCategoryCrudModal}
        onClose={() => setShowCategoryCrudModal(false)}
      />
    </div>
  )
}

// 통계 카드 컴포넌트
function StatCard({
  icon,
  title,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  unit: string
  color: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.15)'
        e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: `0 4px 12px ${color}40`,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>
            {value}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}
