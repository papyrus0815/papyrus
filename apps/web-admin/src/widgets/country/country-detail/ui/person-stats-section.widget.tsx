import { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { FiSettings } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { PositionCategoryCrudModal } from '@/pages/persons/position-category-crud-modal'
import { type PersonResponseDto as Person, getPersonsByTenureCountry, getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { ACCENT } from '@/shared/styles/constants'
import { darkGlassMixin, glassOrSolidMixin } from '@/shared/styles/mixins'

// ─── Styled ───────────────────────────────────────────────────────────────────
const SectionLabelEl = styled.div`
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const StatCardRoot = styled.div`
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  cursor: default;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          ${darkGlassMixin}
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.14);
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
            border-color: #d1d5db;
          }
        `}
`

const StatCardIcon = styled.div<{ $accent: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ $accent }) => $accent};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : '#f3f4f6'};
`

const StatCardTitle = styled.div`
  font-size: 11px;
  margin-bottom: 4px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const StatCardValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`

const StatCardBig = styled.span`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StatCardUnit = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

// KPI 요약 바
const KpiBar = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  padding: 20px 28px;
  border-radius: 16px;

  ${({ theme }) => glassOrSolidMixin(theme)}
`

const KpiItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`

const KpiLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const KpiValueBig = styled.span`
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const KpiValueSub = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const KpiDivider = styled.span`
  width: 1px;
  height: 24px;
  border-radius: 1px;
  background: ${({ theme }) => theme.colors.border.default};
`

// 리스트 패널 (역할별 / 최근 인물)
const PanelCard = styled.div`
  border-radius: 24px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          ${darkGlassMixin}
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.04),
            0 1px 2px rgba(0, 0, 0, 0.02);
        `}
`

const PanelRow = styled.li<{ $last?: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: ${({ $last, theme }) =>
    $last
      ? 'none'
      : `1px solid ${theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.colors.border.light}`};
  transition: background 0.15s ease;
  list-style: none;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : theme.colors.background.secondary};
  }
`

const RoleName = styled.span`
  flex: 0 0 140px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ProgressTrack = styled.div`
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
`

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  min-width: ${({ $pct }) => ($pct > 0 ? 4 : 0)}px;
  background: ${ACCENT};
  border-radius: 3px;
  transition: width 0.25s ease;
`

const RoleCount = styled.span`
  flex: 0 0 56px;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PanelSubheader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : theme.colors.border.light};
`

const PanelSubheaderText = styled.p`
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// 최근 인물 아이템
const RecentPersonAvatar = styled.div<{ $gender: string | null | undefined }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
  color: ${({ $gender }) => ($gender === 'MALE' ? '#3b82f6' : '#ec4899')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9'};
`

const RecentPersonName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RecentPersonMeta = styled.div`
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const RecentPersonCountry = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TenureBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  border-radius: 14px;
  padding: 3px 10px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          color: #a5b4fc;
          background: rgba(99, 106, 242, 0.2);
          border: 1px solid rgba(99, 106, 242, 0.3);
        `
      : css`
          color: #4f46e5;
          background: linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%);
          border: 1px solid #c4b5fd;
          box-shadow: 0 1px 2px rgba(99, 102, 241, 0.1);
        `}
`

const TenureLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(163,130,252,0.8)' : '#6366f1'};
`

const RoleFallback = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RecentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaDivider = styled.span`
  width: 1px;
  height: 10px;
  border-radius: 1px;
  background: ${({ theme }) => theme.colors.border.default};
`

const AliveStatus = styled.span<{ $alive: boolean }>`
  font-weight: 500;
  color: ${({ $alive }) => ($alive ? '#10b981' : undefined)};
`

// 차트 (세기별)
const ChartWrap = styled.div`
  border-radius: 24px;
  padding: 28px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          ${darkGlassMixin}
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.04),
            0 1px 2px rgba(0, 0, 0, 0.02);
        `}
`

const ChartSubtitle = styled.p`
  margin: 0 0 16px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 6px 10px;
  align-items: flex-end;
  height: 140px;
`

const ChartBarWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const ChartBar = styled.div<{ $height: number; $hasCount: boolean }>`
  width: 100%;
  min-height: ${({ $hasCount }) => ($hasCount ? 14 : 0)}px;
  height: ${({ $height }) => $height}px;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: ${({ $hasCount }) => ($hasCount ? '4px 2px' : '0')};
  font-size: 11px;
  font-weight: 600;
  transition: opacity 0.2s ease;
  background: ${({ $hasCount }) =>
    $hasCount ? ACCENT : 'rgba(226, 232, 240, 0.5)'};
  color: ${({ $hasCount }) => ($hasCount ? '#fff' : 'transparent')};

  &:hover {
    opacity: 0.85;
  }
`

const ChartBarLabel = styled.span`
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChartEmptyMsg = styled.div`
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// 헤더 (hideHeader=false 시)
const StandaloneHeader = styled.header`
  padding-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const StandaloneTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StandaloneDesc = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.55;
  max-width: 540px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: ${theme.colors.text.primary};
          &:hover {
            background: rgba(99, 106, 242, 0.15);
            border-color: rgba(99, 106, 242, 0.4);
            color: #ffffff;
          }
        `
      : css`
          border: 1px solid ${theme.colors.border.default};
          background: ${theme.colors.background.primary};
          color: #374151;
          &:hover {
            background: ${theme.colors.background.secondary};
            border-color: ${theme.colors.border.medium};
          }
        `}
`

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  position: absolute;
  inset: 0;
  width: 100%;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
  border: 4px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-top-color: #8b5cf6;
`

const StatsContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-height: calc(100vh - 200px);
  position: relative;
`

const StatCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
`

const PanelEmptyMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <SectionLabelEl>{children}</SectionLabelEl>
}

function GovStatCard({
  accentColor = ACCENT,
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
    <StatCardRoot>
      <StatCardIcon $accent={accentColor}>{icon}</StatCardIcon>
      <div>
        <StatCardTitle>{title}</StatCardTitle>
        <StatCardValueRow>
          <StatCardBig>{value}</StatCardBig>
          <StatCardUnit>{unit}</StatCardUnit>
        </StatCardValueRow>
      </div>
    </StatCardRoot>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonStatsProps {
  countryId?: string | null
  noOverlap?: boolean
  hideHeader?: boolean
  categoryModalOpen?: boolean
  onCategoryModalOpenChange?: (open: boolean) => void
}

interface PersonStats {
  totalPersons: number
  maleCount: number
  femaleCount: number
  aliveCount: number
  deceasedCount: number
  averageAge: number
  byRole: { [key: string]: number }
  byCentury: { [key: string]: number }
  recentPersons: Person[]
}

const MIN_LOADING_MS = 1000
const FADE_DURATION = 0.35

const CENTURY_ORDER = [
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

// ─── Main component ───────────────────────────────────────────────────────────
export function PersonStatsSection({
  countryId,
  noOverlap,
  hideHeader,
  categoryModalOpen,
  onCategoryModalOpenChange,
}: PersonStatsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [internalCategoryModal, setInternalCategoryModal] = useState(false)
  const showCategoryCrudModal =
    hideHeader && categoryModalOpen !== undefined
      ? categoryModalOpen
      : internalCategoryModal
  const setShowCategoryCrudModal =
    hideHeader && onCategoryModalOpenChange
      ? onCategoryModalOpenChange
      : setInternalCategoryModal
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

  useEffect(() => {
    loadStartRef.current = Date.now()
    setIsLoading(true)
    const fetchData = async () => {
      try {
        const data = countryId
          ? await getPersonsByTenureCountry({ countryId })
          : await getAllPersons()
        const list = Array.isArray(data) ? data : []
        calculateStats(list)
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
      if (minLoadTimeoutRef.current) clearTimeout(minLoadTimeoutRef.current)
    }
  }, [countryId])

  const calculateStats = (personList: Person[]) => {
    const total = personList.length
    const male = personList.filter((p) => p.gender === 'MALE').length
    const female = personList.filter((p) => p.gender === 'FEMALE').length
    const alive = personList.filter((p) => p.deathDate === null).length
    const deceased = total - alive

    const alivePersons = personList.filter(
      (p) => p.deathDate === null && p.birthDate,
    )
    const avgAge =
      alivePersons.length > 0
        ? Math.round(
            alivePersons.reduce((sum, p) => {
              const birthYear = new Date(p.birthDate!).getFullYear()
              return sum + (new Date().getFullYear() - birthYear)
            }, 0) / alivePersons.length,
          )
        : 0

    const roleMap: { [key: string]: number } = {}
    personList.forEach((p) => {
      const role = (p as { role?: string }).role || '기타'
      roleMap[role] = (roleMap[role] || 0) + 1
    })

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
        let label: string
        if (year < 1500) label = '15세기 이전'
        else if (year >= 2100) label = '22세기 이후'
        else label = `${Math.floor(year / 100) + 1}세기`
        centuryMap[label] = (centuryMap[label] || 0) + 1
      }
    })

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
          >
            <LoadingWrap>
              <div style={{ textAlign: 'center' }}>
                <Spinner />
                <p>인물 데이터를 불러오는 중...</p>
              </div>
            </LoadingWrap>
          </motion.div>
        ) : (
          <StatsContent
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {!hideHeader && (
              <StandaloneHeader>
                <div>
                  <StandaloneTitle>인물 통계</StandaloneTitle>
                  <StandaloneDesc>
                    총 인물 수, 역할·세기별 분포, 최근 등록 인물을 한눈에 볼 수
                    있습니다.
                  </StandaloneDesc>
                </div>
                <HeaderActionBtn
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowCategoryCrudModal(true)
                  }}
                  aria-label="관직 카테고리 관리"
                  title="관직 카테고리 관리"
                >
                  <FiSettings size={18} />
                  관직 카테고리
                </HeaderActionBtn>
              </StandaloneHeader>
            )}

            {/* KPI 요약 바 */}
            <KpiBar>
              <KpiItem>
                <KpiLabel>총 인물</KpiLabel>
                <KpiValueBig>
                  {stats.totalPersons}
                  <KpiValueSub> 명</KpiValueSub>
                </KpiValueBig>
              </KpiItem>
              <KpiDivider />
              <KpiItem>
                <KpiLabel>남 / 여</KpiLabel>
                <KpiValueBig>
                  {stats.maleCount}
                  <KpiValueSub> / </KpiValueSub>
                  {stats.femaleCount}
                  <KpiValueSub> 명</KpiValueSub>
                </KpiValueBig>
              </KpiItem>
              <KpiDivider />
              <KpiItem>
                <KpiLabel>생존 / 사망</KpiLabel>
                <KpiValueBig>
                  {stats.aliveCount}
                  <KpiValueSub> / </KpiValueSub>
                  {stats.deceasedCount}
                  <KpiValueSub> 명</KpiValueSub>
                </KpiValueBig>
              </KpiItem>
              <KpiDivider />
              <KpiItem>
                <KpiLabel>평균 나이</KpiLabel>
                <KpiValueBig>
                  {stats.averageAge}
                  <KpiValueSub> 세</KpiValueSub>
                </KpiValueBig>
              </KpiItem>
            </KpiBar>

            {/* 요약 지표 */}
            <section aria-label="요약 지표">
              <SectionLabel>요약 지표</SectionLabel>
              <StatCardGrid>
                <GovStatCard
                  accentColor={ACCENT}
                  title="총 인물"
                  value={stats.totalPersons}
                  unit="명"
                  icon={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                />
                <GovStatCard
                  accentColor="#3b82f6"
                  title="남성"
                  value={stats.maleCount}
                  unit="명"
                  icon={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  }
                />
                <GovStatCard
                  accentColor="#ec4899"
                  title="여성"
                  value={stats.femaleCount}
                  unit="명"
                  icon={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  }
                />
                <GovStatCard
                  accentColor="#10b981"
                  title="생존"
                  value={stats.aliveCount}
                  unit="명"
                  icon={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  }
                />
                <GovStatCard
                  accentColor="#64748b"
                  title="사망"
                  value={stats.deceasedCount}
                  unit="명"
                  icon={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  }
                />
              </StatCardGrid>
            </section>

            {/* 역할별 분포 */}
            <section aria-label="역할별 분포">
              <SectionLabel>역할별 분포</SectionLabel>
              <PanelCard>
                <ul style={{ margin: 0, padding: 0 }}>
                  {Object.entries(stats.byRole)
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count], idx, arr) => {
                      const pct =
                        stats.totalPersons > 0
                          ? (count / stats.totalPersons) * 100
                          : 0
                      return (
                        <PanelRow key={idx} $last={idx === arr.length - 1}>
                          <RoleName>{role}</RoleName>
                          <ProgressTrack>
                            <ProgressFill $pct={pct} />
                          </ProgressTrack>
                          <RoleCount>{count}명</RoleCount>
                        </PanelRow>
                      )
                    })}
                </ul>
                {Object.keys(stats.byRole).length === 0 && (
                  <PanelEmptyMsg>
                    역할 정보가 있는 인물이 없습니다.
                  </PanelEmptyMsg>
                )}
              </PanelCard>
            </section>

            {/* 출생 세기별 분포 */}
            <section aria-label="출생 세기별 분포">
              <SectionLabel>출생 세기별 분포</SectionLabel>
              <ChartWrap>
                <ChartSubtitle>출생 연도 기준 세기별 분류</ChartSubtitle>
                <ChartGrid>
                  {(() => {
                    const maxCount = Math.max(
                      1,
                      ...Object.values(stats.byCentury),
                      0,
                    )
                    const barMaxHeight = 88
                    return CENTURY_ORDER.map((century, idx) => {
                      const count = stats.byCentury[century] ?? 0
                      const height =
                        maxCount > 0 ? (count / maxCount) * barMaxHeight : 0
                      return (
                        <ChartBarWrap key={idx}>
                          <ChartBar
                            $height={height}
                            $hasCount={count > 0}
                            title={`${century}: ${count}명`}
                          >
                            {count > 0 ? count : ''}
                          </ChartBar>
                          <ChartBarLabel>{century}</ChartBarLabel>
                        </ChartBarWrap>
                      )
                    })
                  })()}
                </ChartGrid>
                {Object.keys(stats.byCentury).length === 0 && (
                  <ChartEmptyMsg>
                    출생 연도 정보가 있는 인물이 없습니다.
                  </ChartEmptyMsg>
                )}
              </ChartWrap>
            </section>

            {/* 최근 등록 인물 */}
            <section aria-label="최근 등록 인물">
              <SectionLabel>최근 등록 인물</SectionLabel>
              <PanelCard>
                <PanelSubheader>
                  <PanelSubheaderText>
                    가장 최근에 등록된 인물 6명
                  </PanelSubheaderText>
                </PanelSubheader>
                <ul style={{ margin: 0, padding: 0 }}>
                  {stats.recentPersons.map((person, idx) => (
                    <PanelRow
                      key={idx}
                      $last={idx === stats.recentPersons.length - 1}
                    >
                      <RecentPersonAvatar $gender={person.gender}>
                        {person.name[0]}
                      </RecentPersonAvatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <RecentPersonName>
                          {getPersonDisplayName(person)}
                        </RecentPersonName>
                        <RecentPersonMeta>
                          {person.country && (
                            <RecentPersonCountry>
                              {person.country.flagEmoji &&
                                `${person.country.flagEmoji} `}
                              {person.country.name}
                            </RecentPersonCountry>
                          )}
                          {(() => {
                            const tenures = (
                              person as {
                                governmentTenures?: Array<{
                                  positionDefinition?: { title?: string }
                                  title?: string
                                }>
                              }
                            ).governmentTenures
                            const tenureTitles = tenures
                              ? (Array.from(
                                  new Set(
                                    tenures
                                      .map(
                                        (t) =>
                                          t.positionDefinition?.title ||
                                          t.title,
                                      )
                                      .filter(Boolean),
                                  ),
                                ) as string[])
                              : []
                            if (tenureTitles.length > 0) {
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 6,
                                  }}
                                >
                                  <TenureLabel>직책</TenureLabel>
                                  {tenureTitles.slice(0, 3).map((title) => (
                                    <TenureBadge key={title}>
                                      {title}
                                    </TenureBadge>
                                  ))}
                                  {tenureTitles.length > 3 && (
                                    <TenureLabel>
                                      +{tenureTitles.length - 3}
                                    </TenureLabel>
                                  )}
                                </span>
                              )
                            }
                            return (
                              <RoleFallback>
                                {(
                                  person as {
                                    job?: { title?: string }
                                    role?: string
                                  }
                                ).job?.title ||
                                  (person as { role?: string }).role ||
                                  '역할 없음'}
                              </RoleFallback>
                            )
                          })()}
                        </RecentPersonMeta>
                      </div>
                      <RecentMeta>
                        <span>
                          출생{' '}
                          {person.birthDate
                            ? new Date(person.birthDate).getFullYear()
                            : '미상'}
                        </span>
                        <MetaDivider />
                        <AliveStatus $alive={!person.deathDate}>
                          {person.deathDate ? '사망' : '생존'}
                        </AliveStatus>
                      </RecentMeta>
                    </PanelRow>
                  ))}
                </ul>
              </PanelCard>
            </section>
          </StatsContent>
        )}
      </AnimatePresence>
      <PositionCategoryCrudModal
        isOpen={showCategoryCrudModal}
        onClose={() => setShowCategoryCrudModal(false)}
      />
    </div>
  )
}
