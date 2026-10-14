/**
 * 관련 기업·조직 — "이 사건의 주체·당사자인 조직은 어디이고, 지금 그 기업의 값은 얼마인가".
 *
 * 사건 ↔ 조직 표(event_organization_relation)는 스키마에 있었지만 쓰는 API도 보는 화면도 없어,
 * 시드(가스프롬 7건)만 채워지고 어디에도 보이지 않았다(docs/event-category-features-review.md
 * §3 경제). 이 섹션이 처음으로 그 표를 읽고 쓴다.
 *
 * - 기업이면(Company = Organization 1:1) 기업 상세로 가는 링크와 최신 주가 1점(시가총액)을 단다.
 *   기업의 시세·재무 정본은 기업 상세다 — 여기는 사건을 읽다가 "그래서 지금은?"에 답하는 한 줄.
 * - 연결은 2단계: 조직 고르기 → 역할(주체·설립·인수…). 같은 조직을 다른 역할로 거는 것은 된다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiExternalLink, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { ledgerHairlineStrong, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getApiConnection } from '@/shared/api/client'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  type EventOrganization,
  type EventOrganizationRole,
  addEventOrganization,
  removeEventOrganization,
} from '@/shared/api/events'
import { getOrganizations } from '@/shared/api/organizations'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'

interface DetailOrganizationsProps {
  event: EventDetail
  /** 경제 사건 — 비어 있어도 섹션을 띄워 연결을 안내한다 */
  expectOrganizations: boolean
}

const ROLE_OPTIONS: Array<{ value: EventOrganizationRole; label: string; description: string }> = [
  { value: 'PRINCIPAL', label: '주체', description: '사건을 일으키거나 이끈 조직' },
  { value: 'FOUNDED', label: '설립', description: '이 사건으로 세워진 조직' },
  { value: 'DISSOLVED', label: '해산·폐업', description: '이 사건으로 없어진 조직' },
  { value: 'ACQUIRER', label: '인수', description: '다른 조직을 사들인 쪽' },
  { value: 'ACQUIRED', label: '피인수', description: '팔린 쪽' },
  { value: 'PARTICIPANT', label: '참여', description: '사건에 함께한 조직' },
  { value: 'CONTRACTOR', label: '시공·건설', description: '공사·구축을 맡은 조직' },
  { value: 'BENEFICIARY', label: '수혜', description: '사건으로 이득을 본 조직' },
  { value: 'VICTIM', label: '피해', description: '사건으로 손해를 본 조직' },
  { value: 'OTHER', label: '기타', description: '그 밖의 관계' },
]

const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((option) => [option.value, option.label])) as Record<
  EventOrganizationRole,
  string
>

/** 시가총액 — '3.2조'처럼 한국어 큰 단위로 줄인다. 통화 기호는 뒤에 코드로. */
function formatCompactMoney(raw: string | null, currency: string | null): string | null {
  if (raw == null) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const compact = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  return currency ? `${compact} ${currency}` : compact
}

function formatPrice(raw: string | null, currency: string | null): string | null {
  if (raw == null) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const text = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)
  return currency ? `${text} ${currency}` : text
}

export function DetailOrganizations({ event, expectOrganizations }: DetailOrganizationsProps) {
  const queryClient = useQueryClient()
  const organizations = useMemo(() => event.organizations ?? [], [event.organizations])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null)

  const { data: allOrganizations = [], isLoading } = useQuery({
    queryKey: ['organizations', 'event-link-candidates'],
    queryFn: () => getOrganizations(getApiConnection()),
    enabled: pickerOpen,
    staleTime: 60_000,
  })

  const organizationOptions = allOrganizations
    .map((organization) => ({
      value: organization.id,
      label: organization.name,
      description: [organization.shortName, organization.type === 'COMPANY' ? '기업' : null]
        .filter(Boolean)
        .join(' · '),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ko'))

  /* 이미 같은 조직이 걸린 역할은 고를 수 없게 뺀다(서버도 409) */
  const roleOptions = useMemo(() => {
    const taken = new Set(
      organizations
        .filter((relation) => relation.organizationId === pendingOrganizationId)
        .map((relation) => relation.role),
    )
    return ROLE_OPTIONS.filter((option) => !taken.has(option.value))
  }, [organizations, pendingOrganizationId])

  const refresh = () => void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })

  const addMutation = useMutation({
    mutationFn: (body: { organizationId: string; role: EventOrganizationRole }) =>
      addEventOrganization(event.id, body),
    onSuccess: (relation) => {
      notify.success(`${relation.name}을(를) ${ROLE_LABEL[relation.role]}(으)로 연결했습니다`)
      refresh()
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '연결하지 못했습니다'),
  })

  const removeMutation = useMutation({
    mutationFn: (relationId: string) => removeEventOrganization(event.id, relationId),
    onSuccess: () => {
      notify.success('연결을 해제했습니다 (조직 자체는 남아 있습니다)')
      refresh()
    },
    onError: () => notify.error('연결 해제에 실패했습니다'),
  })

  const handleRemove = async (relation: EventOrganization) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `「${relation.name}」(${ROLE_LABEL[relation.role]})과 이 사건의 연결만 끊습니다. 조직·기업 정보는 그대로 남습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) removeMutation.mutate(relation.relationId)
  }

  if (!expectOrganizations && organizations.length === 0) return null

  return (
    <S.Section id="organizations">
      <S.SectionHeader>
        <S.SectionTitle>관련 기업·조직</S.SectionTitle>
        {organizations.length > 1 && <S.SectionSubtitle>{organizations.length}곳</S.SectionSubtitle>}
      </S.SectionHeader>

      {organizations.length > 0 ? (
        <Rows>
          {organizations.map((relation) => (
            <OrganizationRow
              key={relation.relationId}
              relation={relation}
              onRemove={() => void handleRemove(relation)}
            />
          ))}
        </Rows>
      ) : (
        <S.HelperText>
          상장·설립·인수처럼 기업이 주체인 사건이면 그 기업을 연결하세요. 기업이면 최신 시가총액이 함께
          보입니다.
        </S.HelperText>
      )}

      <Actions>
        <ActionButton type="button" onClick={() => setPickerOpen(true)}>
          <FiPlus size={14} /> 기업·조직 연결
        </ActionButton>
      </Actions>

      <SelectModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="연결할 기업·조직"
        options={organizationOptions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="이름으로 검색..."
        onSelect={(organizationId) => {
          setPickerOpen(false)
          setPendingOrganizationId(organizationId)
        }}
      />

      <SelectModal
        isOpen={pendingOrganizationId !== null}
        onClose={() => setPendingOrganizationId(null)}
        title="이 사건에서의 역할"
        options={roleOptions}
        onSelect={(role) => {
          const organizationId = pendingOrganizationId
          setPendingOrganizationId(null)
          if (organizationId) addMutation.mutate({ organizationId, role: role as EventOrganizationRole })
        }}
      />
    </S.Section>
  )
}

function OrganizationRow({ relation, onRemove }: { relation: EventOrganization; onRemove: () => void }) {
  const stock = relation.latestStock
  const marketCap = stock ? formatCompactMoney(stock.marketCap, stock.currency) : null
  const price = stock ? formatPrice(stock.price, stock.currency) : null
  const stockLine = [marketCap ? `시가총액 ${marketCap}` : null, price ? `주가 ${price}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Row>
      {relation.logoUrl ? <Logo src={relation.logoUrl} alt="" /> : <LogoFallback aria-hidden>{relation.name.slice(0, 1)}</LogoFallback>}
      <Body>
        <NameLine>
          {relation.companyId ? (
            <NameLink to={pathKeys.companies.detail(relation.companyId)}>
              {relation.name}
              <FiExternalLink size={12} aria-hidden />
            </NameLink>
          ) : (
            <Name>{relation.name}</Name>
          )}
          <RoleBadge>{ROLE_LABEL[relation.role] ?? relation.role}</RoleBadge>
        </NameLine>
        {relation.roleDescription && <Meta>{relation.roleDescription}</Meta>}
        {stockLine && (
          <Meta>
            {stockLine}
            {stock?.date && <> — {stock.date.slice(0, 10)} 기준</>}
          </Meta>
        )}
      </Body>
      <RemoveButton type="button" onClick={onRemove} aria-label={`${relation.name} 연결 해제`}>
        <FiX />
      </RemoveButton>
    </Row>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 4px;
  }

  &:last-child {
    border-bottom: none;
  }
`

const Logo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: ${RADIUS.SM};
  object-fit: contain;
  outline: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  outline-offset: -1px;
`

const LogoFallback = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const NameLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const NameLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Name = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RoleBadge = styled.span`
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Meta = styled.div`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`
