import { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiSettings } from 'react-icons/fi'
import styled from 'styled-components'

import { PositionCategoryCrudModal } from '@/pages/persons/PositionCategoryCrudModal'
import { type Person, personApi } from '@/shared/api/person'

const MAIN = '#6366f1'
const sectionLabelStyle: React.CSSProperties = {
  marginBottom: 18,
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  lineHeight: 1.4,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const PersonTabNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 20px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
`
const PersonTabBtn = styled.span`
  padding: 10px 18px;
  border-radius: 14px;
  background: #ffffff;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.12);
`
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sectionLabelStyle}>{children}</div>
}

function GovStatCard({
  accentColor = MAIN,
  icon,
  title,
  value,
  unit,
}: {
  accentColor?: string
  icon: React.ReactNode
  title: string
  value: string | number
  unit: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'
        e.currentTarget.style.borderColor = '#d1d5db'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = '#e5e7eb'
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em' }}>{value}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>{unit}</span>
        </div>
      </div>
    </div>
  )
}

interface PersonStatsProps {
  /** 국가 ID. 미전달 시 전체 인물 통계 */
  countryId?: string | null
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
 * - 요약 지표 (총 인물, 성별, 생존/사망)
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
        const data = countryId
          ? await personApi.getByCountryId(countryId)
          : await personApi.getAll()
        setPersons(Array.isArray(data) ? data : [])
        calculateStats(Array.isArray(data) ? data : [])
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 32,
              padding: '36px 32px 48px',
              background: '#ffffff',
              minHeight: 'calc(100vh - 200px)',
              position: 'relative',
            }}
          >
      <header style={{ paddingBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.25 }}>
            인물 통계
          </h2>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: '#64748b', lineHeight: 1.55, maxWidth: 540, fontWeight: 500 }}>
            총 인물 수, 역할·세기별 분포, 최근 등록 인물을 한눈에 볼 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCategoryCrudModal(true) }}
          aria-label="관직 카테고리 관리"
          title="관직 카테고리 관리"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <FiSettings size={18} />
          관직 카테고리
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PersonTabNav>
          <PersonTabBtn>통계</PersonTabBtn>
        </PersonTabNav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', padding: '20px 28px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>총 인물</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{stats.totalPersons}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>명</span></span>
        </div>
        <span style={{ width: 1, height: 24, background: '#e2e8f0', borderRadius: 1 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>남 / 여</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{stats.maleCount}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}> / </span>{stats.femaleCount}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>명</span></span>
        </div>
        <span style={{ width: 1, height: 24, background: '#e2e8f0', borderRadius: 1 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>생존 / 사망</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{stats.aliveCount}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}> / </span>{stats.deceasedCount}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>명</span></span>
        </div>
        <span style={{ width: 1, height: 24, background: '#e2e8f0', borderRadius: 1 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>평균 나이</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{stats.averageAge}<span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>세</span></span>
        </div>
        </div>
      </div>

      {/* 요약 지표 (행정조직 StatCard 스타일) */}
      <section aria-label="요약 지표">
        <SectionLabel>요약 지표</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
          <GovStatCard accentColor={MAIN} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>} title="총 인물" value={stats.totalPersons} unit="명" />
          <GovStatCard accentColor="#3b82f6" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} title="남성" value={stats.maleCount} unit="명" />
          <GovStatCard accentColor="#ec4899" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} title="여성" value={stats.femaleCount} unit="명" />
          <GovStatCard accentColor="#10b981" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} title="생존" value={stats.aliveCount} unit="명" />
          <GovStatCard accentColor="#64748b" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>} title="사망" value={stats.deceasedCount} unit="명" />
        </div>
      </section>

      {/* 역할별 분포 */}
      <section aria-label="역할별 분포">
        <SectionLabel>역할별 분포</SectionLabel>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 24,
            padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {Object.entries(stats.byRole)
              .sort(([, a], [, b]) => b - a)
              .map(([role, count], idx) => {
                const pct = stats.totalPersons > 0 ? (count / stats.totalPersons) * 100 : 0
                return (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 24px',
                      borderBottom: idx < Object.keys(stats.byRole).length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span style={{ flex: '0 0 140px', fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{role}</span>
                    <div style={{ flex: 1, minWidth: 0, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          minWidth: pct > 0 ? 4 : 0,
                          background: MAIN,
                          borderRadius: 3,
                          transition: 'width 0.25s ease',
                        }}
                      />
                    </div>
                    <span style={{ flex: '0 0 56px', fontSize: 13, fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                      {count}명
                    </span>
                  </li>
                )
              })}
          </ul>
          {Object.keys(stats.byRole).length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
              역할 정보가 있는 인물이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* 출생 세기별 분포 */}
      <section aria-label="출생 세기별 분포">
        <SectionLabel>출생 세기별 분포</SectionLabel>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          출생 연도 기준 세기별 분류
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gap: '6px 10px',
            alignItems: 'flex-end',
            height: '140px',
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
            const maxCount = Math.max(1, ...Object.values(stats.byCentury), 0)
            const barMaxHeight = 88
            return centuryOrder.map((century, idx) => {
              const count = stats.byCentury[century] ?? 0
              const height = maxCount > 0 ? (count / maxCount) * barMaxHeight : 0
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      minHeight: count > 0 ? 14 : 0,
                      height: `${height}px`,
                      background: count > 0 ? MAIN : 'rgba(226, 232, 240, 0.5)',
                      borderRadius: '6px 6px 0 0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      padding: count > 0 ? '4px 2px' : 0,
                      color: count > 0 ? '#fff' : 'transparent',
                      fontSize: 11,
                      fontWeight: 600,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (count > 0) e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                    title={`${century}: ${count}명`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
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
      </section>

      {/* 최근 등록 인물 */}
      <section aria-label="최근 등록 인물">
        <SectionLabel>최근 등록 인물</SectionLabel>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 24,
            padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              가장 최근에 등록된 인물 6명
            </p>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {stats.recentPersons.map((person, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 24px',
                  borderBottom: idx < stats.recentPersons.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    color: person.gender === 'MALE' ? '#3b82f6' : '#ec4899',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {person.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{person.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {person.country && (
                      <span>{person.country.flagEmoji && `${person.country.flagEmoji} `}{person.country.name}</span>
                    )}
                    {person.country && (person.job?.title || (person as { role?: string }).role || '역할 없음') && <span>·</span>}
                    <span>{person.job?.title || (person as { role?: string }).role || '역할 없음'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontSize: 12, color: '#64748b' }}>
                  <span>출생 {person.birthDate ? new Date(person.birthDate).getFullYear() : '미상'}</span>
                  <span style={{ width: 1, height: 10, background: '#e2e8f0', borderRadius: 1 }} />
                  <span style={{ color: person.deathDate ? '#64748b' : '#10b981', fontWeight: 500 }}>
                    {person.deathDate ? '사망' : '생존'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
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

