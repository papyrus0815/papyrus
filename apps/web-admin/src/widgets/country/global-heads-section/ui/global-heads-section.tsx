import { useState } from 'react'
import { FiPlus, FiChevronRight } from 'react-icons/fi'
import styled, { css } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

import { personCareerApi } from '@/shared/api/person-career'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

const MAIN = '#6366f1'

const Wrapper = styled(motion.div)<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$embedded ? 0 : 32)}px;
  padding: ${(p) => (p.$embedded ? 0 : '36px 32px 48px')};
  background: ${({ theme }) => theme.colors.background.primary};
  ${(p) =>
    p.$embedded
      ? `
    flex: 1;
    min-height: 0;
  `
      : 'min-height: calc(100vh - 200px);'}
  position: relative;
`

const Header = styled.header`
  padding-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.04em;
  line-height: 1.25;
`

const HeaderDesc = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.55;
  max-width: 540px;
  font-weight: 500;
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
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
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          &:hover {
            border-color: #c7d2fe;
            background: rgba(99, 102, 241, 0.04);
          }
        `}
`

const KpiCard = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  padding: 20px 28px;
  border-radius: 16px;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(99, 106, 242, 0.18);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid #e5e7eb;
        `}
`

const KpiLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const KpiValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
`

const SectionHeading = styled.div`
  margin-bottom: 28px;
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

const SectionDesc = styled.p`
  margin: 6px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`

const CardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TenantCard = styled.button`
  text-align: left;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  padding: 16px 20px;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          &:hover {
            border-color: rgba(99, 106, 242, 0.4);
            background: rgba(99, 106, 242, 0.08);
            box-shadow: 0 2px 12px rgba(99, 106, 242, 0.12);
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid #e8ecf1;
          &:hover {
            border-color: #c7d2fe;
            background: #fafbff;
            box-shadow: 0 2px 6px rgba(99, 102, 241, 0.06);
          }
        `}
`

const CardPersonName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
`

const CardBadge = styled.span`
  display: inline-flex;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  flex-shrink: 0;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 106, 242, 0.18);
          color: #a5b4fc;
        `
      : css`
          background: rgba(99, 102, 241, 0.1);
          color: ${MAIN};
        `}
`

const CardDate = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const EmptyState = styled(motion.div)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 40px 72px;
  border-radius: 20px;
  overflow: hidden;

  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        `
      : css`
          background: ${theme.colors.background.primary};
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        `}
`

const EmptyGlow = styled.div`
  position: absolute;
  left: 50%;
  top: 20%;
  width: 280px;
  height: 280px;
  margin-left: -140px;
  margin-top: -140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
  filter: blur(32px);
  pointer-events: none;
`

const EmptyTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
`

const EmptyDesc = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
  line-height: 1.55;
  font-weight: 500;
  text-align: center;
  position: relative;
  z-index: 1;
`

const LoadingState = styled.div`
  padding: 56px;
  text-align: center;
  font-size: 14px;
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`

const CountryHint = styled.p`
  margin: 0 0 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

interface GlobalHeadsSectionProps {
  /** 상위 컨테이너에 임베드 시 헤더(타이틀·설명) 숨김 */
  embedded?: boolean
}

export function GlobalHeadsSection({ embedded }: GlobalHeadsSectionProps) {
  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['global-tenures'],
    queryFn: () => personCareerApi.getGlobalTenures(),
  })
  const [personPickerOpen, setPersonPickerOpen] = useState(false)
  const { data: allPersons = [] } = useQuery({
    queryKey: ['persons-for-global-heads'],
    queryFn: () => getAllPersons(),
    enabled: personPickerOpen,
  })
  /**
   * 등록·수정 중인 직위 보유 — 직위 보유 폼 하나(TenureRegisterPanel)를 연다.
   * 전역 직책은 국가가 없으므로 countryOptional, 기본 직위는 '교황'.
   */
  const [panelTarget, setPanelTarget] = useState<{ personId: string; tenureId?: string } | null>(null)

  const handleAdd = () => setPersonPickerOpen(true)
  const handleEdit = (t: any) => {
    const personId = t.personId ?? t.person?.id
    if (personId) setPanelTarget({ personId, tenureId: t.id })
  }

  /** notes에서 "왕명: xxx" 추출 — 왕호 칸이 비어 있는 레거시 행용 */
  const getRegnalNameFromNotes = (notes: string | null | undefined) => {
    if (!notes?.trim()) return ''
    const matched = notes.match(/왕명\s*:\s*(.+?)(?:\n|$)/i) || notes.match(/왕명\s*:\s*(.+)/i)
    return matched ? matched[1].trim() : ''
  }

  const getPersonName = (p: any) =>
    p
      ? getPersonDisplayName({
          name: p.name || '',
          surname: p.surname ?? '',
          middleName: p.middleName ?? '',
          nameDisplayOrder: p.nameDisplayOrder ?? null,
          country: p.country ?? null,
        })
      : '—'

  /** 기간 한쪽 끝 — DATETIME이 있으면 날짜, 없으면(서기 1000년 이전·기원전) 구조화 연도 */
  const formatEdge = (iso: string | null | undefined, era: string | null | undefined, year: number | null | undefined) => {
    if (iso) {
      return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (year != null) return era === 'BC' ? `BC ${year}년` : `${year}년`
    return '—'
  }

  return (
    <Wrapper
      $embedded={embedded}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {!embedded && (
        <Header>
          <div>
            <HeaderTitle>전역 수반 (교황 등)</HeaderTitle>
            <HeaderDesc>
              국가에 속하지 않는 직책(교황·칼리프 등)을 등록합니다. 사건 연대표에서 전역 수반 토글로 표시 여부를 바꿀 수 있습니다.
            </HeaderDesc>
            <CountryHint style={{ marginTop: 8 }}>
              국가별 수반은 좌측에서 국가를 선택한 뒤, 해당 국가 상세의 역대 수반 탭에서 등록하세요.
            </CountryHint>
          </div>
          <AddButton type="button" onClick={handleAdd} aria-label="전역 수반 등록">
            <FiPlus size={18} />
            전역 수반 등록
          </AddButton>
        </Header>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 4 }}>
        <KpiCard style={{ padding: '16px 20px', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <KpiLabel style={{ fontSize: 11, letterSpacing: '0.05em' }}>등록 전역 수반</KpiLabel>
            <KpiValue style={{ fontSize: 20 }}>{tenures.length}건</KpiValue>
          </div>
        </KpiCard>
      </div>

      <section aria-label="전역 수반 현황" style={{ paddingTop: 4 }}>
        <SectionHeading style={embedded ? { marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 } : { marginBottom: 16 }}>
          {!embedded && (
            <div>
              <SectionTitle>전역 수반 현황</SectionTitle>
              <SectionDesc>
                등록된 전역 수반 목록입니다. 카드를 클릭하면 수정·삭제할 수 있습니다.
              </SectionDesc>
            </div>
          )}
          {embedded && (
            <AddButton type="button" onClick={handleAdd} aria-label="전역 수반 등록">
              <FiPlus size={18} />
              전역 수반 등록
            </AddButton>
          )}
        </SectionHeading>

        {isLoading && tenures.length === 0 ? (
          <LoadingState>불러오는 중…</LoadingState>
        ) : tenures.length === 0 ? (
          <EmptyState
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <EmptyGlow />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <EmptyTitle>등록된 전역 수반이 없습니다</EmptyTitle>
              <EmptyDesc>
                위 <strong>전역 수반 등록</strong> 버튼을 눌러 교황 등을 추가하세요.
              </EmptyDesc>
            </div>
          </EmptyState>
        ) : (
          <CardGrid>
            <AnimatePresence initial={false}>
              {tenures.map((t: any) => {
                const regnal = t.regnalName?.trim() || getRegnalNameFromNotes(t.notes)
                const personDisplay = regnal ? `${regnal} (${getPersonName(t.person)})` : getPersonName(t.person)
                const ordNum = t.ordinal ?? t.termNumber
                const startLabel = formatEdge(t.startDate, t.startEra, t.startYear)
                const endLabel = t.endDate || t.endYear ? formatEdge(t.endDate, t.endEra, t.endYear) : '재임 중'
                const dateLabel = `${startLabel} ~ ${endLabel}${ordNum != null ? ` · ${ordNum}대` : ''}`
                const countryLabel =
                  t?.country?.name ?? t?.historicalCountry?.name ?? (t as any)?.historical_country?.name ?? '전역'
                return (
                  <TenantCard key={t.id} type="button" onClick={() => handleEdit(t)}>
                    <CardPersonName>{personDisplay}</CardPersonName>
                    <CardBadge title="국가">국가: {countryLabel}</CardBadge>
                    <CardBadge>{t.title ?? t.positionDefinition?.title ?? '전역'}</CardBadge>
                    <CardDate>{dateLabel}</CardDate>
                  <FiChevronRight size={18} style={{ flexShrink: 0, opacity: 0.4 }} />
                  </TenantCard>
                )
              })}
            </AnimatePresence>
          </CardGrid>
        )}
      </section>
      {personPickerOpen && (
        <PersonSelectModal
          persons={allPersons as any[]}
          selectedPersonId=""
          title="전역 수반 등록 — 인물 선택"
          onSelect={(personId) => {
            setPersonPickerOpen(false)
            setPanelTarget({ personId })
          }}
          onClose={() => setPersonPickerOpen(false)}
        />
      )}
      {panelTarget && (
        <TenureRegisterPanel
          personId={panelTarget.personId}
          tenureId={panelTarget.tenureId}
          open={!!panelTarget}
          onClose={() => setPanelTarget(null)}
          onSuccess={() => setPanelTarget(null)}
          defaultMonarchical
          defaultDefinitionTitle="교황"
          countryOptional
        />
      )}
    </Wrapper>
  )
}
