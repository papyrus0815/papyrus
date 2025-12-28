import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'

import { type Person, personApi } from '@/shared/api/person'

interface PersonStatsProps {
  countryId: string
}

interface PersonStats {
  totalPersons: number
  maleCount: number
  femaleCount: number
  aliveCount: number
  deceasedCount: number
  averageAge: number
  byRole: { [key: string]: number }
  byEra: { [key: string]: number }
  recentPersons: Person[]
}

/**
 * 인물 통계 대시보드
 * - 전체 인물 통계
 * - 성별/생존 현황
 * - 역할별 분포
 * - 시대별 분포
 * - 최근 등록 인물
 */
export function PersonStatsSection({ countryId }: PersonStatsProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<PersonStats>({
    totalPersons: 0,
    maleCount: 0,
    femaleCount: 0,
    aliveCount: 0,
    deceasedCount: 0,
    averageAge: 0,
    byRole: {},
    byEra: {},
    recentPersons: [],
  })

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const data = await personApi.getByCountryId(countryId)
        setPersons(data)
        calculateStats(data)
      } catch (error) {
        console.error('Failed to fetch persons:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
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

    // 시대별 분포 (출생 연도 기준)
    const eraMap: { [key: string]: number } = {}
    personList.forEach((p) => {
      if (p.birthDate) {
        const year = new Date(p.birthDate).getFullYear()
        let era = '기타'
        if (year < 1900) era = '1900년 이전'
        else if (year < 1920) era = '1900-1919'
        else if (year < 1940) era = '1920-1939'
        else if (year < 1960) era = '1940-1959'
        else if (year < 1980) era = '1960-1979'
        else if (year < 2000) era = '1980-1999'
        else era = '2000년 이후'
        eraMap[era] = (eraMap[era] || 0) + 1
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
      byEra: eraMap,
      recentPersons: recent,
    })
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          color: '#64748b',
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
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
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
      {/* 통계 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '16px',
          marginTop: '-80px',
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
                  {((stats.maleCount / stats.totalPersons) * 100).toFixed(1)}%
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
                  {((stats.femaleCount / stats.totalPersons) * 100).toFixed(1)}%
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
                  {((stats.aliveCount / stats.totalPersons) * 100).toFixed(1)}%
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
                  {((stats.deceasedCount / stats.totalPersons) * 100).toFixed(
                    1,
                  )}
                  %
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
                      width: `${(count / stats.totalPersons) * 100}%`,
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

      {/* 시대별 분포 */}
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
              출생 시대별 분포
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              출생 연도 기준 시대별 분류
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '16px',
            height: '240px',
          }}
        >
          {Object.entries(stats.byEra)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([era, count], idx) => {
              const maxCount = Math.max(...Object.values(stats.byEra))
              const height = (count / maxCount) * 200
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${height}px`,
                      background:
                        'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)',
                      borderRadius: '12px 12px 0 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      padding: '12px 8px',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 700,
                      boxShadow: '0 -2px 8px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {count}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748b',
                      textAlign: 'center',
                    }}
                  >
                    {era}
                  </span>
                </div>
              )
            })}
        </div>
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
