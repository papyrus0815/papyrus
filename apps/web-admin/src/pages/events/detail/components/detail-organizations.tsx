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
  type UpdateEventDto,
  addEventOrganization,
  removeEventOrganization,
  updateEventOrganization,
} from '@/shared/api/events'
import { getOrganizationMembers, getOrganizations } from '@/shared/api/organizations'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'
import { OrganizationQuickCreateModal } from '@/widgets/organization/organization-quick-create-modal'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineSelect } from './inline'
import { withSideColors } from './side-colors'
import { ORGANIZATION_ROLE_OPTIONS as ROLE_OPTIONS } from '@/features/event-facets/model/organization-roles'

interface DetailOrganizationsProps {
  event: EventDetail
  /** 경제 사건 — 비어 있어도 섹션을 띄워 연결을 안내한다 */
  expectOrganizations: boolean
  onPatch?: (dto: UpdateEventDto) => void
}


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

export function DetailOrganizations({
  event,
  expectOrganizations,
  onPatch,
}: DetailOrganizationsProps) {
  const queryClient = useQueryClient()
  const organizations = useMemo(() => event.organizations ?? [], [event.organizations])
  const coloredSides = useMemo(() => withSideColors(event.sides ?? []), [event.sides])
  const sideById = useMemo(
    () =>
      new Map(
        coloredSides.map(
          (side) => [side.id, { name: side.name, color: side.color }] as const,
        ),
      ),
    [coloredSides],
  )
  const sideOptions = useMemo(
    () =>
      coloredSides.length === 0
        ? []
        : [
            { value: 'none', label: '진영 미지정' },
            ...coloredSides.map((side) => ({ value: side.id, label: side.name })),
          ],
    [coloredSides],
  )

  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatingOrgOpen, setCreatingOrgOpen] = useState(false)
  const [pendingOrganizationId, setPendingOrganizationId] = useState<string | null>(null)

  const defaultCountryId =
    (event.relatedCountries ?? [])[0]?.id ?? undefined
  const defaultHistoricalCountryId =
    (event.relatedHistoricalCountries ?? [])[0]?.id ?? undefined

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

  const handleUpdateSide = async (relationId: string, sideId: string | null) => {
    try {
      await updateEventOrganization(event.id, relationId, { sideId })
      refresh()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '조직 진영 변경에 실패했습니다',
      )
    }
  }

  const handleImportMembers = async (relation: EventOrganization) => {
    if (!onPatch) return
    try {
      const members = await getOrganizationMembers(
        getApiConnection(),
        relation.organizationId,
      )
      if (members.length === 0) {
        notify.info(`‘${relation.name}’에 등록된 소속 인물이 없습니다.`)
        return
      }
      const currentPersons = event.relatedPersons ?? []
      const existingById = new Map(
        currentPersons.map((person) => [person.personId, person]),
      )
      const nextPersons = [
        ...currentPersons.map((person) => ({
          personId: person.personId,
          role: person.role ?? undefined,
          note: person.note ?? undefined,
          sideId: person.sideId ?? undefined,
        })),
      ]
      let addedCount = 0
      for (const member of members) {
        const pid = member.person.id
        const existing = existingById.get(pid)
        if (existing) {
          if (relation.sideId && existing.sideId !== relation.sideId) {
            const idx = nextPersons.findIndex((np) => np.personId === pid)
            if (idx >= 0) {
              nextPersons[idx] = { ...nextPersons[idx], sideId: relation.sideId }
              addedCount += 1
            }
          }
        } else {
          nextPersons.push({
            personId: pid,
            role: member.roleTitle ?? relation.name,
            ...(relation.sideId ? { sideId: relation.sideId } : {}),
          })
          addedCount += 1
        }
      }
      if (addedCount > 0) {
        onPatch({ relatedPersons: nextPersons } as UpdateEventDto)
        notify.success(
          `‘${relation.name}’ 소속 인물 ${addedCount}명을 이 사건의 참여 인물로 반영했습니다`,
        )
      } else {
        notify.info('이미 모든 소속 인물이 이 사건에 참여하고 있습니다')
      }
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '기관·조직 소속 인물을 불러오지 못했습니다',
      )
    }
  }

  const handleRemove = async (relation: EventOrganization) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `「${relation.name}」(${ROLE_LABEL[relation.role]})과 이 사건의 연결만 끊습니다. 조직·기업 정보는 그대로 남습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) removeMutation.mutate(relation.relationId)
  }

  return (
    <S.Section id="organizations">
      <S.SectionHeader>
        <S.SectionTitle>관련 기관·조직·기업</S.SectionTitle>
        {organizations.length > 1 && <S.SectionSubtitle>{organizations.length}곳</S.SectionSubtitle>}
      </S.SectionHeader>

      {organizations.length > 0 ? (
        <Rows>
          {organizations.map((relation) => (
            <OrganizationRow
              key={relation.relationId}
              relation={relation}
              side={relation.sideId ? sideById.get(relation.sideId) ?? null : null}
              sideOptions={sideOptions}
              onUpdateSide={(sideId) => void handleUpdateSide(relation.relationId, sideId)}
              onImportMembers={onPatch ? () => void handleImportMembers(relation) : undefined}
              onRemove={() => void handleRemove(relation)}
            />
          ))}
        </Rows>
      ) : (
        <S.HelperText>
          {expectOrganizations
            ? '상장·설립·인수처럼 기업·기관이 주체인 사건이면 연결하세요. 기업이면 최신 시가총액이 함께 보입니다.'
            : '공안위원회·의회 같은 권력기구나 사건에 관여한 기관·조직·기업을 연결할 수 있습니다.'}
        </S.HelperText>
      )}

      <Actions>
        <ActionButton type="button" onClick={() => setPickerOpen(true)}>
          <FiPlus size={14} /> 기관·조직 연결
        </ActionButton>
        <ActionButton type="button" onClick={() => setCreatingOrgOpen(true)}>
          <FiPlus size={14} /> 새 기관·조직 등록
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

      {creatingOrgOpen && (
        <OrganizationQuickCreateModal
          defaultCountryId={defaultCountryId}
          defaultHistoricalCountryId={defaultHistoricalCountryId}
          candidatePersons={(event.persons ?? []).map((person) => ({
            id: person.id,
            name: [person.name, person.surname].filter(Boolean).join(' '),
            role: person.role ?? undefined,
          }))}
          onClose={() => setCreatingOrgOpen(false)}
          onCreated={(created) => {
            setCreatingOrgOpen(false)
            setPendingOrganizationId(created.id)
          }}
        />
      )}

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

function OrganizationRow({
  relation,
  side,
  sideOptions,
  onUpdateSide,
  onImportMembers,
  onRemove,
}: {
  relation: EventOrganization
  side: { name: string; color: string } | null
  sideOptions: Array<{ value: string; label: string }>
  onUpdateSide: (sideId: string | null) => void
  onImportMembers?: () => void
  onRemove: () => void
}) {
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
            <NameLink
              to={`/organizations?selected=${relation.organizationId}&tab=members`}
              title="기관·조직 상세 및 소속 인물·위원 관리"
            >
              {relation.name}
              <FiExternalLink size={12} aria-hidden />
            </NameLink>
          )}
          <RoleBadge>{ROLE_LABEL[relation.role] ?? relation.role}</RoleBadge>
          {sideOptions.length > 0 && (
            <SideBadge $color={side?.color}>
              {side && <SideDot $color={side.color} aria-hidden />}
              <InlineSelect
                value={relation.sideId ?? 'none'}
                options={sideOptions}
                onSave={(next) => onUpdateSide(next === 'none' ? null : next)}
                placeholder="진영 지정"
                label={`${relation.name}의 소속 진영`}
              />
            </SideBadge>
          )}
          {onImportMembers && (
            <ImportMembersBtn
              type="button"
              title={`${relation.name} 소속 인물(위원·역할)을 사건 참여 인물로 불러오기`}
              onClick={onImportMembers}
            >
              👥 소속 인물 불러오기
            </ImportMembersBtn>
          )}
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

const SideBadge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $color }) => $color ? `${$color}55` : theme.colors.border};
  background: ${({ $color }) => ($color ? `${$color}14` : 'transparent')};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme, $color }) => $color ?? theme.colors.text.secondary};
`

const SideDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const ImportMembersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`
