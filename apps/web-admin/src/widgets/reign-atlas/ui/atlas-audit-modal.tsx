/**
 * 지도 데이터 점검 창 — 지도에 안 나오는 원인을 갈래별로 모으고, 고칠 곳으로 보낸다.
 *
 * 위: 세기별 커버리지(수장 기록 수 · 전선이 그려지는 해) — 어느 시대를 먼저 채울지.
 * 아래: 원인 갈래 탭 → 항목 목록. 항목마다 '고치러 가기'(사건·국가·조약 상세 / 인물 창)와
 * 연도가 있으면 '지도에서 보기'(그해로 이동).
 */
import { useMemo, useState } from 'react'

import { FiArrowRight, FiMapPin } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { Modal, ModalBody } from '@/shared/ui/modal'
import { formatScrubberYear } from '@/shared/ui/year-scrubber'

import {
  AUDIT_CATEGORY_META,
  AUDIT_CATEGORY_ORDER,
  type AtlasAudit,
  type AuditCategory,
  type AuditTarget,
  type CenturyCoverage,
} from '../lib/atlas-audit'

/** 한 갈래에 수백 건이 쌓여도 창이 무거워지지 않게 */
const MAX_VISIBLE_ISSUES = 200

interface Props {
  isOpen: boolean
  onClose: () => void
  audit: AtlasAudit
  coverage: CenturyCoverage[]
  onOpenTarget: (target: AuditTarget) => void
  onJumpYear: (year: number) => void
}

function centuryLabel(century: number): string {
  return century > 0 ? `${century}세기` : `BC ${Math.abs(century)}세기`
}

const TARGET_LABEL: Record<AuditTarget['kind'], string> = {
  event: '사건 고치기',
  country: '국가 고치기',
  person: '인물 보기',
  treaty: '조약 고치기',
}

export function AtlasAuditModal({
  isOpen,
  onClose,
  audit,
  coverage,
  onOpenTarget,
  onJumpYear,
}: Props) {
  const firstWithIssues =
    AUDIT_CATEGORY_ORDER.find(
      (category) => audit.issues[category].length > 0,
    ) ?? AUDIT_CATEGORY_ORDER[0]!
  const [category, setCategory] = useState<AuditCategory>(firstWithIssues)
  const issues = audit.issues[category]
  const meta = AUDIT_CATEGORY_META[category]

  const maxRulers = useMemo(
    () => Math.max(1, ...coverage.map((row) => row.rulerCount)),
    [coverage],
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="wide"
      title="지도 데이터 점검"
      subtitle={`지도에 안 나오는 원인 ${audit.total}건 — 항목을 고치면 지도에 바로 반영됩니다`}
    >
      <ModalBody>
        <Section aria-label="세기별 커버리지">
          <SectionTitle>
            세기별 커버리지{' '}
            <small>
              막대 = 수장 기록 수 · 붉은 숫자 = 교전선이 그려지는 해
            </small>
          </SectionTitle>
          <CoverageScroll>
            <Coverage>
              {coverage.map((row) => (
                <CoverageColumn
                  key={row.century}
                  title={`${centuryLabel(row.century)}: 수장 ${row.rulerCount}건, 전선 ${row.frontYears}년`}
                >
                  <FrontYears $zero={row.frontYears === 0}>
                    {row.frontYears || '·'}
                  </FrontYears>
                  <BarTrack>
                    <BarFill
                      style={{
                        height: `${(row.rulerCount / maxRulers) * 100}%`,
                      }}
                      $zero={row.rulerCount === 0}
                    />
                  </BarTrack>
                  <RulerCount>{row.rulerCount}</RulerCount>
                  <CenturyName>{centuryLabel(row.century)}</CenturyName>
                </CoverageColumn>
              ))}
            </Coverage>
          </CoverageScroll>
        </Section>

        <Tabs role="tablist" aria-label="점검 갈래">
          {AUDIT_CATEGORY_ORDER.map((item) => {
            const count = audit.issues[item].length
            return (
              <Tab
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                $active={category === item}
                $empty={count === 0}
                onClick={() => setCategory(item)}
              >
                {AUDIT_CATEGORY_META[item].label}
                <Count $empty={count === 0}>{count}</Count>
              </Tab>
            )
          })}
        </Tabs>

        <Guide>
          <p>{meta.effect}</p>
          <p>
            <b>고치는 법</b> {meta.fix}
          </p>
        </Guide>

        {issues.length === 0 ? (
          <Empty>이 갈래는 문제가 없습니다. 👍</Empty>
        ) : (
          <IssueList role="tabpanel">
            {issues.slice(0, MAX_VISIBLE_ISSUES).map((issue) => (
              <IssueRow key={issue.key}>
                <IssueYear>
                  {issue.year != null ? formatScrubberYear(issue.year) : '—'}
                </IssueYear>
                <IssueText>
                  <strong>{issue.title}</strong>
                  <span>{issue.detail}</span>
                </IssueText>
                <IssueActions>
                  {issue.year != null && (
                    <GhostButton
                      type="button"
                      onClick={() => onJumpYear(issue.year!)}
                      title="이 해의 지도로 이동"
                    >
                      <FiMapPin size={12} />
                      지도
                    </GhostButton>
                  )}
                  <PrimaryButton
                    type="button"
                    onClick={() => onOpenTarget(issue.target)}
                  >
                    {TARGET_LABEL[issue.target.kind]}
                    <FiArrowRight size={12} />
                  </PrimaryButton>
                </IssueActions>
              </IssueRow>
            ))}
            {issues.length > MAX_VISIBLE_ISSUES && (
              <Empty>
                외 {issues.length - MAX_VISIBLE_ISSUES}건 — 위 항목부터
                정리하세요.
              </Empty>
            )}
          </IssueList>
        )}
      </ModalBody>
    </Modal>
  )
}

const Section = styled.section`
  margin-bottom: 14px;
`

const SectionTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  small {
    margin-left: 6px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const CoverageScroll = styled.div`
  overflow-x: auto;
`

const Coverage = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  min-width: max-content;
`

const CoverageColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 40px;
`

const FrontYears = styled.span<{ $zero: boolean }>`
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ $zero, theme }) =>
    $zero ? theme.colors.text.tertiary : '#ef4444'};
`

const BarTrack = styled.div`
  position: relative;
  width: 18px;
  height: 64px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow: hidden;
`

const BarFill = styled.div<{ $zero: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: ${({ $zero }) => ($zero ? '0' : '2px')};
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 4px;
`

const RulerCount = styled.span`
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenturyName = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`

const Tab = styled.button<{ $active: boolean; $empty: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${({ $empty }) => ($empty ? 0.55 : 1)};
  ${({ $active, theme }) =>
    $active &&
    css`
      border-color: ${theme.colors.primary};
      background: ${theme.colors.activeLight};
      color: ${theme.colors.primary};
      opacity: 1;
    `}
`

const Count = styled.span<{ $empty: boolean }>`
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
  color: #ffffff;
  background: ${({ $empty }) => ($empty ? '#94a3b8' : '#ef4444')};
`

const Guide = styled.div`
  margin-bottom: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  p {
    margin: 0;
  }
  b {
    margin-right: 4px;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const IssueList = styled.ul`
  max-height: 46vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
`

const IssueRow = styled.li`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const IssueYear = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const IssueText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  strong {
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const IssueActions = styled.div`
  display: inline-flex;
  gap: 6px;
`

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const PrimaryButton = styled(GhostButton)`
  border-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.primary};
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const Empty = styled.p`
  margin: 20px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
