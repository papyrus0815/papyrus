import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { RADIUS, ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getEventOverview } from '@/shared/api/event-overview'
import {
  type EventContextCatalog,
  type EventContextEntityKind,
  type EventContextLinkInput,
  type EventContextLinkView,
  type EventContextRole,
  getEventContextCatalog,
  listEventContextLinks,
  syncEventContextLinks,
} from '@/shared/api/event-context-links'
import { eventKeys } from '@/shared/api/event-query-keys'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { withSideColors } from './side-colors'

const ENTITY_KIND_META: Record<
  EventContextEntityKind,
  { icon: string; label: string; hint: string }
> = {
  LAW: {
    icon: '📜',
    label: '법령·작전지침',
    hint: '예: 총통 지침 제21호, 정치장교 사살 명령(Kommissarbefehl)',
  },
  SOCIAL_PHENOMENON: {
    icon: '🌀',
    label: '사회 현상·사상',
    hint: '예: 레벤스라움(생존권), 소련군 대숙청, 홀로코스트',
  },
  NATURAL_FEATURE: {
    icon: '⛰️',
    label: '자연 지형·하천',
    hint: '예: 프리퍄티 습지, 드네프르강, 다우가바강',
  },
  INFRASTRUCTURE: {
    icon: '🛤️',
    label: '인프라·철도·방어선',
    hint: '예: 소련 광궤 철도망, 스탈린 방어선, 모스크바 운하',
  },
  CLIMATE: {
    icon: '❄️',
    label: '기후·기상 현상',
    hint: '예: 가을 라스푸티차(진흙탕), 1941년 동장군 한파',
  },
  RESOURCE: {
    icon: '🛢️',
    label: '자원·전략 물자',
    hint: '예: 캅카스(바쿠) 석유, 우크라이나 곡물, 크리보이로크 철광석',
  },
  COMPANY_FACILITY: {
    icon: '🏭',
    label: '군수공장·산업시설',
    hint: '예: 우랄 산맥 이전 전차공장, 하리코프 기관차 공장',
  },
}

const CONTEXT_ROLE_META: Record<EventContextRole, { icon: string; label: string }> = {
  OBJECTIVE: { icon: '🎯', label: '작전·전략 목표' },
  OBSTACLE: { icon: '🚧', label: '장애·제약 요인' },
  INSTRUMENT: { icon: '🛠️', label: '수단·도구·기반' },
  CAUSE: { icon: '⚡', label: '원인·촉발 요인' },
  BACKGROUND: { icon: '🌐', label: '배경·환경' },
  OUTCOME: { icon: '📌', label: '결과·산물' },
  OTHER: { icon: '📎', label: '기타 맥락' },
}

function toLinkInput(item: EventContextLinkView): EventContextLinkInput {
  return {
    role: item.role,
    sideId: item.sideId,
    description: item.description,
    lawId: item.entityKind === 'LAW' ? item.entityId : null,
    socialPhenomenonId: item.entityKind === 'SOCIAL_PHENOMENON' ? item.entityId : null,
    naturalFeatureId: item.entityKind === 'NATURAL_FEATURE' ? item.entityId : null,
    infrastructureId: item.entityKind === 'INFRASTRUCTURE' ? item.entityId : null,
    climateId: item.entityKind === 'CLIMATE' ? item.entityId : null,
    resourceId: item.entityKind === 'RESOURCE' ? item.entityId : null,
    companyFacilityId: item.entityKind === 'COMPANY_FACILITY' ? item.entityId : null,
  }
}

interface DetailContextLinksProps {
  event: EventDetail
  readOnly?: boolean
}

/**
 * 사건과 7대 초유기체 도메인(법령·사회현상·자연지형·인프라·기후·자원·시설)을 연결하는 섹션.
 */
export function DetailContextLinks({ event, readOnly = false }: DetailContextLinksProps) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entityKind, setEntityKind] = useState<EventContextEntityKind>('LAW')
  const [entityId, setEntityId] = useState('')
  const [role, setRole] = useState<EventContextRole>('BACKGROUND')
  const [sideId, setSideId] = useState('')
  const [descriptionText, setDescriptionText] = useState('')

  const sides = useMemo(() => withSideColors(event.sides ?? []), [event.sides])

  const linksQuery = useQuery({
    queryKey: eventKeys.contextLinks(event.id),
    queryFn: () => listEventContextLinks(event.id).catch(() => [] as EventContextLinkView[]),
    staleTime: 30_000,
  })

  const catalogQuery = useQuery({
    queryKey: eventKeys.contextCatalog(event.id),
    queryFn: () =>
      getEventContextCatalog(event.id).catch(
        () =>
          ({
            laws: [],
            socialPhenomena: [],
            naturalFeatures: [],
            infrastructures: [],
            climates: [],
            resources: [],
            companyFacilities: [],
          }) satisfies EventContextCatalog,
      ),
    enabled: adding,
    staleTime: 60_000,
  })

  const links = linksQuery.data ?? []

  const hasSubEvents =
    event.kind === 'COLLECTION' || (event.childEvents?.length ?? 0) > 0

  const overviewQuery = useQuery({
    queryKey: eventKeys.overview(event.id),
    queryFn: () => getEventOverview(event.id),
    enabled: hasSubEvents,
    staleTime: 30_000,
  })

  const subEventContextRollup = useMemo(() => {
    const descendants = overviewQuery.data?.descendants ?? []
    const byKey = new Map<
      string,
      {
        key: string
        entityKind: EventContextEntityKind
        entityName: string
        events: Array<{
          eventId: string
          eventTitle: string
          role: EventContextRole
          sideName: string | null
          description: string | null
        }>
      }
    >()
    for (const node of descendants) {
      for (const ctxLink of node.contextLinks ?? []) {
        const key = `${ctxLink.entityKind}:${ctxLink.entityName}`
        let entry = byKey.get(key)
        if (!entry) {
          entry = {
            key,
            entityKind: ctxLink.entityKind,
            entityName: ctxLink.entityName,
            events: [],
          }
          byKey.set(key, entry)
        }
        entry.events.push({
          eventId: node.id,
          eventTitle: node.title,
          role: (ctxLink.role as EventContextRole) ?? 'OTHER',
          sideName: ctxLink.sideName,
          description: ctxLink.description,
        })
      }
    }
    return [...byKey.values()].sort(
      (left, right) => right.events.length - left.events.length,
    )
  }, [overviewQuery.data])

  const catalogOptions = useMemo(() => {
    const catalog = catalogQuery.data
    if (!catalog) return []
    switch (entityKind) {
      case 'LAW':
        return catalog.laws
      case 'SOCIAL_PHENOMENON':
        return catalog.socialPhenomena
      case 'NATURAL_FEATURE':
        return catalog.naturalFeatures
      case 'INFRASTRUCTURE':
        return catalog.infrastructures
      case 'CLIMATE':
        return catalog.climates
      case 'RESOURCE':
        return catalog.resources
      case 'COMPANY_FACILITY':
        return catalog.companyFacilities
    }
  }, [catalogQuery.data, entityKind])

  const refreshLinks = async () => {
    await queryClient.invalidateQueries({ queryKey: eventKeys.contextLinks(event.id) })
  }

  const handleAdd = async () => {
    if (!entityId) {
      notify.error('연결할 대상을 선택해 주세요')
      return
    }
    const newItem: EventContextLinkInput = {
      role,
      sideId: sideId || null,
      description: descriptionText.trim() || null,
      lawId: entityKind === 'LAW' ? entityId : null,
      socialPhenomenonId: entityKind === 'SOCIAL_PHENOMENON' ? entityId : null,
      naturalFeatureId: entityKind === 'NATURAL_FEATURE' ? entityId : null,
      infrastructureId: entityKind === 'INFRASTRUCTURE' ? entityId : null,
      climateId: entityKind === 'CLIMATE' ? entityId : null,
      resourceId: entityKind === 'RESOURCE' ? entityId : null,
      companyFacilityId: entityKind === 'COMPANY_FACILITY' ? entityId : null,
    }
    setSaving(true)
    try {
      await syncEventContextLinks(event.id, [...links.map(toLinkInput), newItem])
      await refreshLinks()
      setEntityId('')
      setDescriptionText('')
      setAdding(false)
      notify.success('다차원 맥락 연결을 추가했습니다')
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '다차원 맥락 연결 저장에 실패했습니다',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (targetId: string) => {
    setSaving(true)
    try {
      const remaining = links.filter((item) => item.id !== targetId).map(toLinkInput)
      await syncEventContextLinks(event.id, remaining)
      await refreshLinks()
      notify.success('연결을 해제했습니다')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '연결 해제에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <S.Section id="context-links">
      <S.SectionHeader>
        <S.SectionTitle>
          🌐 다차원 초유기체 맥락 (법령 · 지형 · 기후 · 인프라 · 자원 · 산업 · 현상)
        </S.SectionTitle>
        {links.length > 0 && <S.SectionSubtitle>{links.length}</S.SectionSubtitle>}
        {!readOnly && (
          <S.SectionActions>
            <AddToggleButton type="button" onClick={() => setAdding((prev) => !prev)}>
              <FiPlus size={12} /> {adding ? '닫기' : '맥락 연결 추가'}
            </AddToggleButton>
          </S.SectionActions>
        )}
      </S.SectionHeader>

      {links.length === 0 && subEventContextRollup.length === 0 && !adding && (
        <EmptyHint>
          이 사건에 작용한 법령·작전지침, 자연지형·하천, 기후(라스푸티차·한파), 철도·방어선 인프라, 전략 자원(유전·곡창), 군수공장, 사회현상을 연결해 초유기체 맥락을 완성할 수 있습니다.
        </EmptyHint>
      )}

      {links.length > 0 && (
        <LinksGrid>
          {links.map((item) => {
            const kindMeta = ENTITY_KIND_META[item.entityKind]
            const roleMeta = CONTEXT_ROLE_META[item.role] ?? CONTEXT_ROLE_META.OTHER
            const sideColor = sides.find((side) => side.id === item.sideId)?.color ?? null
            return (
              <LinkCard key={item.id}>
                <CardTop>
                  <KindTag title={kindMeta.label}>
                    {kindMeta.icon} {kindMeta.label}
                  </KindTag>
                  <RoleTag>
                    {roleMeta.icon} {roleMeta.label}
                  </RoleTag>
                  {item.sideName && (
                    <SideTag $color={sideColor}>{item.sideName}</SideTag>
                  )}
                  {!readOnly && (
                    <RemoveBtn
                      type="button"
                      disabled={saving}
                      onClick={() => void handleRemove(item.id)}
                      aria-label={`${item.entityName} 연결 해제`}
                    >
                      <FiTrash2 size={12} />
                    </RemoveBtn>
                  )}
                </CardTop>
                <EntityTitleRow>
                  <EntityTitle>{item.entityName}</EntityTitle>
                  {item.entityCategory && (
                    <EntityCategory>{item.entityCategory}</EntityCategory>
                  )}
                </EntityTitleRow>
                {item.description && <DescriptionText>{item.description}</DescriptionText>}
              </LinkCard>
            )
          })}
        </LinksGrid>
      )}

      {subEventContextRollup.length > 0 && (
        <SubRollupBox>
          <SubRollupTitle>
            ↳ 하위 사건에 작용한 다차원 맥락 롤업 ({subEventContextRollup.length}건)
          </SubRollupTitle>
          <LinksGrid>
            {subEventContextRollup.map((rollupItem) => {
              const kindMeta = ENTITY_KIND_META[rollupItem.entityKind]
              return (
                <LinkCard key={rollupItem.key}>
                  <CardTop>
                    <KindTag title={kindMeta.label}>
                      {kindMeta.icon} {kindMeta.label}
                    </KindTag>
                    <RoleTag>하위 {rollupItem.events.length}건</RoleTag>
                  </CardTop>
                  <EntityTitleRow>
                    <EntityTitle>{rollupItem.entityName}</EntityTitle>
                  </EntityTitleRow>
                  <SubRollupEventList>
                    {rollupItem.events.map((evItem, idx) => {
                      const roleMeta = CONTEXT_ROLE_META[evItem.role] ?? CONTEXT_ROLE_META.OTHER
                      return (
                        <li key={`${evItem.eventId}-${idx}`}>
                          <SubEventLink to={pathKeys.events.detail(evItem.eventId)}>
                            {evItem.eventTitle}
                          </SubEventLink>
                          <span>
                            {' · '}
                            {roleMeta.icon} {roleMeta.label}
                            {evItem.sideName ? ` (${evItem.sideName})` : ''}
                            {evItem.description ? ` — ${evItem.description}` : ''}
                          </span>
                        </li>
                      )
                    })}
                  </SubRollupEventList>
                </LinkCard>
              )
            })}
          </LinksGrid>
        </SubRollupBox>
      )}

      {adding && !readOnly && (
        <AddFormBox>
          <FormRow>
            <FormSelect
              value={entityKind}
              onChange={(changeEvent) => {
                setEntityKind(changeEvent.target.value as EventContextEntityKind)
                setEntityId('')
              }}
              aria-label="연결 도메인 분류"
            >
              {(Object.keys(ENTITY_KIND_META) as EventContextEntityKind[]).map((kindKey) => (
                <option key={kindKey} value={kindKey}>
                  {ENTITY_KIND_META[kindKey].icon} {ENTITY_KIND_META[kindKey].label}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              value={entityId}
              onChange={(changeEvent) => setEntityId(changeEvent.target.value)}
              aria-label="연결 대상 항목"
            >
              <option value="">
                -- {ENTITY_KIND_META[entityKind].label} 선택 ({catalogOptions.length}건) --
              </option>
              {catalogOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.category ? ` (${option.category})` : ''}
                </option>
              ))}
            </FormSelect>

            <FormSelect
              value={role}
              onChange={(changeEvent) => setRole(changeEvent.target.value as EventContextRole)}
              aria-label="사건 내 역할"
            >
              {(Object.keys(CONTEXT_ROLE_META) as EventContextRole[]).map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {CONTEXT_ROLE_META[roleKey].icon} {CONTEXT_ROLE_META[roleKey].label}
                </option>
              ))}
            </FormSelect>

            {sides.length > 0 && (
              <FormSelect
                value={sideId}
                onChange={(changeEvent) => setSideId(changeEvent.target.value)}
                aria-label="관련 진영"
              >
                <option value="">진영 무관 (공통)</option>
                {sides.map((side) => (
                  <option key={side.id} value={side.id}>
                    {side.name}
                  </option>
                ))}
              </FormSelect>
            )}
          </FormRow>

          <FormRow>
            <FormInput
              type="text"
              placeholder={`맥락 설명 (${ENTITY_KIND_META[entityKind].hint})`}
              value={descriptionText}
              onChange={(changeEvent) => setDescriptionText(changeEvent.target.value)}
            />
            <SubmitBtn
              type="button"
              disabled={saving || !entityId}
              onClick={() => void handleAdd()}
            >
              연결 저장
            </SubmitBtn>
          </FormRow>
        </AddFormBox>
      )}
    </S.Section>
  )
}

const AddToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.sm};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
`

const EmptyHint = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${metaText};
`

const LinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  margin-top: 8px;
`

const LinkCard = styled.div`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.md};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const CardTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
`

const KindTag = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
`

const RoleTag = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: rgba(59, 130, 246, 0.12);
`

const SideTag = styled.span<{ $color: string | null }>`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ $color, theme }) => $color ?? theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
`

const RemoveBtn = styled.button`
  margin-left: auto;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: #ef4444;
  }
`

const EntityTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`

const EntityTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EntityCategory = styled.span`
  font-size: 11px;
  color: ${metaText};
`

const DescriptionText = styled.p`
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SubRollupBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed ${({ theme }) => ledgerHairline(theme.mode)};
`

const SubRollupTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${metaText};
`

const SubRollupEventList = styled.ul`
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11.5px;
  color: ${metaText};
`

const SubEventLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`

const AddFormBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px dashed ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.md};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const FormSelect = styled.select`
  flex: 1 1 150px;
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.sm};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const FormInput = styled.input`
  flex: 1 1 240px;
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.sm};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const SubmitBtn = styled.button`
  padding: 5px 12px;
  border: none;
  border-radius: ${RADIUS.sm};
  background: ${({ theme }) => theme.colors.text.primary};
  color: ${({ theme }) => theme.colors.background.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`
