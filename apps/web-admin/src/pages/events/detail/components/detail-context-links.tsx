import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getEventOverview } from '@/shared/api/event-overview'
import {
  type EventContextCatalogItem,
  type EventContextDomain,
  type EventContextLinkInput,
  type EventContextLinkView,
  type EventContextRole,
  getEventContextCatalog,
  listEventContextLinks,
  syncEventContextLinks,
} from '@/shared/api/event-context-links'
import { eventKeys } from '@/shared/api/event-query-keys'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import {
  CollapsedActorChipBtn,
  CollapsedActorInfo,
  CollapsedActorSlot,
  HeaderControlBtn,
  SectionHintText,
} from './actors/actors.styles'
import { InlineSelect } from './inline'
import { LoadError } from './load-error'
import { withSideColors } from './side-colors'

/**
 * 분류·역할 이름 — 글리프 없이 글자로만(장부 언어). 예전엔 분류마다 이모지(📜·🌀·⛰️…)와
 * 바르바로사 작전의 예시('총통 지침 제21호', '라스푸티차')가 붙어, 어느 사건에서나 2차대전 문구가 떴다.
 */
const DOMAIN_LABEL: Record<EventContextDomain, string> = {
  LAW: '법령·지침',
  SOCIAL_PHENOMENON: '사회 현상·사상',
  NATURAL_FEATURE: '지형·하천',
  INFRASTRUCTURE: '기반시설',
  CLIMATE: '기후·기상',
  RESOURCE: '자원·물자',
  COMPANY_FACILITY: '공장·시설',
}

const DOMAIN_ORDER = Object.keys(DOMAIN_LABEL) as EventContextDomain[]

const ROLE_LABEL: Record<EventContextRole, string> = {
  BACKGROUND: '배경',
  CAUSE: '원인',
  OBJECTIVE: '목표',
  OBSTACLE: '장애·제약',
  INSTRUMENT: '수단·기반',
  OUTCOME: '결과',
  OTHER: '기타',
}

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as EventContextRole[]).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}))

/** 저장된 줄 → 동기화 입력(서버 계약: domain·entityId·role·sideId·note) */
function toLinkInput(item: EventContextLinkView): EventContextLinkInput {
  return {
    domain: item.domain,
    entityId: item.entityId,
    role: item.role,
    sideId: item.sideId,
    note: item.note,
  }
}

interface DetailContextLinksProps {
  event: EventDetail
  readOnly?: boolean
}

/**
 * 맥락 연결 — 사건에 작용한 지형·기반시설·법령·기후·자원·시설·사회 현상을 잇는다.
 *
 * **기록이 없으면 섹션을 세우지 않는다**(한 줄 '맥락 연결' 버튼만). 예전엔 모든 사건의 연관 탭 끝에
 * 큰 제목('🌐 다차원 초유기체 맥락 …')과 안내 문단이 늘 서 있었는데, 실DB 연결은 0행이었다.
 */
export function DetailContextLinks({ event, readOnly = false }: DetailContextLinksProps) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [domain, setDomain] = useState<EventContextDomain>('NATURAL_FEATURE')
  const [entityId, setEntityId] = useState('')
  const [role, setRole] = useState<EventContextRole>('BACKGROUND')
  const [sideId, setSideId] = useState('')
  const [noteText, setNoteText] = useState('')

  const sides = useMemo(() => withSideColors(event.sides ?? []), [event.sides])

  /* 실패를 빈 배열로 삼키지 않는다 — '연결 없음'과 '못 불러옴'은 다른 말이다 */
  const linksQuery = useQuery({
    queryKey: eventKeys.contextLinks(event.id),
    queryFn: () => listEventContextLinks(event.id),
    staleTime: 30_000,
  })

  const catalogQuery = useQuery<EventContextCatalogItem[]>({
    queryKey: eventKeys.contextCatalog(),
    queryFn: () => getEventContextCatalog(event.id),
    enabled: adding,
    staleTime: 60_000,
  })

  const links = useMemo(() => linksQuery.data ?? [], [linksQuery.data])

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
        entityKind: EventContextDomain
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

  /* 카탈로그는 서버가 한 줄 배열(domain 표지)로 준다 — 분류마다 몇 건인지 세어 고르기에 싣는다 */
  const catalogCountByDomain = useMemo(() => {
    const counts = new Map<EventContextDomain, number>()
    for (const option of catalogQuery.data ?? []) {
      counts.set(option.domain, (counts.get(option.domain) ?? 0) + 1)
    }
    return counts
  }, [catalogQuery.data])
  const domainOptions = useMemo(
    () =>
      DOMAIN_ORDER.map((key) => ({
        value: key,
        label: catalogQuery.data ? `${DOMAIN_LABEL[key]} (${catalogCountByDomain.get(key) ?? 0})` : DOMAIN_LABEL[key],
      })),
    [catalogQuery.data, catalogCountByDomain],
  )
  const linkedIds = useMemo(
    () => new Set(links.map((item) => `${item.domain}:${item.entityId}`)),
    [links],
  )
  const catalogOptions = useMemo(
    () =>
      (catalogQuery.data ?? [])
        .filter((option) => option.domain === domain && !linkedIds.has(`${option.domain}:${option.id}`))
        .map((option) => ({
          value: option.id,
          label: option.subtitle ? `${option.title} (${option.subtitle})` : option.title,
        })),
    [catalogQuery.data, domain, linkedIds],
  )
  const sideOptions = useMemo(
    () => sides.map((side) => ({ value: side.id, label: side.name })),
    [sides],
  )

  const refreshLinks = async () => {
    await queryClient.invalidateQueries({ queryKey: eventKeys.contextLinks(event.id) })
  }

  const handleAdd = async () => {
    if (!entityId) {
      notify.error('연결할 대상을 골라 주세요')
      return
    }
    const newItem: EventContextLinkInput = {
      domain,
      entityId,
      role,
      sideId: sideId || null,
      note: noteText.trim() || null,
    }
    setSaving(true)
    try {
      await syncEventContextLinks(event.id, [...links.map(toLinkInput), newItem])
      await refreshLinks()
      setEntityId('')
      setNoteText('')
      setAdding(false)
      notify.success('맥락 연결을 추가했습니다')
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '맥락 연결을 저장하지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (target: EventContextLinkView) => {
    const ok = await confirm({
      title: '맥락 연결 끊기',
      message: `‘${target.title}’ 연결을 끊을까요? 대상 자체는 지워지지 않습니다.`,
      confirmLabel: '끊기',
    })
    if (!ok) return
    setSaving(true)
    try {
      const remaining = links.filter((item) => item.id !== target.id).map(toLinkInput)
      await syncEventContextLinks(event.id, remaining)
      await refreshLinks()
      notify.success(`‘${target.title}’ 연결을 끊었습니다`)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '연결을 끊지 못했습니다')
    } finally {
      setSaving(false)
    }
  }

  const hasContent = links.length > 0 || subEventContextRollup.length > 0

  /* 기록도 없고 펼치지도 않았다 — 섹션 대신 한 줄 안내(참여·연관 공통 디렉터리 줄과 동일 문법) */
  if (!hasContent && !adding && !linksQuery.isError) {
    if (readOnly) return null
    return (
      <CollapsedActorSlot id="context-links">
        <CollapsedActorInfo>
          <strong>배경 맥락 (지형·법령·기후·자원)</strong>
          <span>이 사건에 작용한 지형·기반시설·법령·기후·자원·사회 현상을 연결합니다.</span>
        </CollapsedActorInfo>
        <CollapsedActorChipBtn type="button" onClick={() => setAdding(true)}>
          <FiPlus size={12} aria-hidden /> 맥락 연결
        </CollapsedActorChipBtn>
      </CollapsedActorSlot>
    )
  }

  return (
    <S.Section id="context-links">
      <ContextHeaderBlock>
        <S.SectionHeader>
          <S.SectionTitle>배경 맥락</S.SectionTitle>
          {links.length > 0 && <S.SectionSubtitle>{links.length}</S.SectionSubtitle>}
          {!readOnly && !linksQuery.isError && (
            <S.SectionActions>
              <HeaderControlBtn type="button" onClick={() => setAdding((prev) => !prev)}>
                {!adding && <FiPlus size={14} aria-hidden />} {adding ? '입력 닫기' : '맥락 연결'}
              </HeaderControlBtn>
            </S.SectionActions>
          )}
        </S.SectionHeader>
        <SectionHintText>
          이 사건에 작용한 지형·기반시설·법령·기후·자원·사회 현상을 구실과 함께 기록합니다.
        </SectionHintText>
      </ContextHeaderBlock>

      {linksQuery.isError && (
        <LoadError
          message="맥락 연결을 불러오지 못했습니다."
          onRetry={() => void linksQuery.refetch()}
          retrying={linksQuery.isFetching}
        />
      )}

      {links.length > 0 && (
        <LinksGrid>
          {links.map((item) => {
            const sideColor = sides.find((side) => side.id === item.sideId)?.color ?? null
            return (
              <LinkCard key={item.id}>
                <CardTop>
                  <KindTag>{DOMAIN_LABEL[item.domain] ?? item.domain}</KindTag>
                  <RoleTag>{ROLE_LABEL[item.role] ?? ROLE_LABEL.OTHER}</RoleTag>
                  {item.sideName && (
                    <SideTag $color={sideColor}>{item.sideName}</SideTag>
                  )}
                  {!readOnly && (
                    <RemoveBtn
                      type="button"
                      disabled={saving}
                      onClick={() => void handleRemove(item)}
                      aria-label={`${item.title} 연결 끊기`}
                    >
                      <FiTrash2 size={12} />
                    </RemoveBtn>
                  )}
                </CardTop>
                <EntityTitleRow>
                  <EntityTitle>{item.title}</EntityTitle>
                  {item.subtitle && <EntityCategory>{item.subtitle}</EntityCategory>}
                </EntityTitleRow>
                {item.note && <DescriptionText>{item.note}</DescriptionText>}
              </LinkCard>
            )
          })}
        </LinksGrid>
      )}

      {subEventContextRollup.length > 0 && (
        <SubRollupBox>
          <SubRollupTitle>하위 사건의 맥락 {subEventContextRollup.length}</SubRollupTitle>
          <LinksGrid>
            {subEventContextRollup.map((rollupItem) => (
              <LinkCard key={rollupItem.key}>
                <CardTop>
                  <KindTag>{DOMAIN_LABEL[rollupItem.entityKind] ?? rollupItem.entityKind}</KindTag>
                  <RoleTag>하위 {rollupItem.events.length}건</RoleTag>
                </CardTop>
                <EntityTitleRow>
                  <EntityTitle>{rollupItem.entityName}</EntityTitle>
                </EntityTitleRow>
                <SubRollupEventList>
                  {rollupItem.events.map((eventItem, index) => (
                    <li key={`${eventItem.eventId}-${index}`}>
                      <SubEventLink to={pathKeys.events.detail(eventItem.eventId)}>
                        {eventItem.eventTitle}
                      </SubEventLink>
                      <span>
                        {' · '}
                        {ROLE_LABEL[eventItem.role] ?? ROLE_LABEL.OTHER}
                        {eventItem.sideName ? ` (${eventItem.sideName})` : ''}
                        {eventItem.description ? ` — ${eventItem.description}` : ''}
                      </span>
                    </li>
                  ))}
                </SubRollupEventList>
              </LinkCard>
            ))}
          </LinksGrid>
        </SubRollupBox>
      )}

      {adding && !readOnly && (
        <AddFormBox>
          {/* 고르기는 지면 공용 피커(InlineSelect) — 네이티브 select는 다크 모드·터치에서 따로 논다 */}
          <FormRow>
            <FormPick>
              <FormPickLabel>분류</FormPickLabel>
              <InlineSelect
                value={domain}
                options={domainOptions}
                onSave={(next) => {
                  setDomain(next as EventContextDomain)
                  setEntityId('')
                }}
                label="맥락 분류"
                clearable={false}
              />
            </FormPick>

            <FormPick>
              <FormPickLabel>대상</FormPickLabel>
              {catalogQuery.isLoading ? (
                <FormPickNote>목록을 불러오는 중…</FormPickNote>
              ) : catalogQuery.isError ? null : catalogOptions.length === 0 ? (
                <FormPickNote>이 분류에 고를 항목이 아직 없습니다</FormPickNote>
              ) : (
                <InlineSelect
                  value={entityId}
                  options={catalogOptions}
                  onSave={setEntityId}
                  placeholder={`고르기 (${catalogOptions.length}건)`}
                  label={`연결할 ${DOMAIN_LABEL[domain]}`}
                />
              )}
            </FormPick>

            <FormPick>
              <FormPickLabel>구실</FormPickLabel>
              <InlineSelect
                value={role}
                options={ROLE_OPTIONS}
                onSave={(next) => setRole(next as EventContextRole)}
                label="사건에서 한 구실"
                clearable={false}
              />
            </FormPick>

            {sideOptions.length > 0 && (
              <FormPick>
                <FormPickLabel>진영</FormPickLabel>
                <InlineSelect
                  value={sideId}
                  options={sideOptions}
                  onSave={setSideId}
                  placeholder="공통"
                  label="관련 진영"
                />
              </FormPick>
            )}
          </FormRow>

          {catalogQuery.isError && (
            <LoadError
              message="고를 목록을 불러오지 못했습니다."
              onRetry={() => void catalogQuery.refetch()}
              retrying={catalogQuery.isFetching}
            />
          )}

          <FormRow>
            <FormInput
              type="text"
              aria-label="맥락 설명"
              placeholder="이 사건에서 어떤 구실을 했는지 (선택)"
              value={noteText}
              onChange={(changeEvent) => setNoteText(changeEvent.target.value)}
            />
            <SubmitBtn
              type="button"
              disabled={saving || !entityId}
              onClick={() => void handleAdd()}
            >
              연결
            </SubmitBtn>
            {!hasContent && (
              <CancelBtn type="button" onClick={() => setAdding(false)}>
                취소
              </CancelBtn>
            )}
          </FormRow>
        </AddFormBox>
      )}
    </S.Section>
  )
}

const ContextHeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const LinksGrid = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const LinkCard = styled.div`
  padding: 10px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: transparent;
`

const CardTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
`

const KindTag = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const RoleTag = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const SideTag = styled.span<{ $color: string | null }>`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ $color, theme }) => $color ?? theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const RemoveBtn = styled.button`
  margin-left: auto;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.error};
  }
  &:disabled {
    cursor: progress;
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
  margin-top: 6px;
  padding: 10px 0 4px;
  border-top: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** 고르기 한 칸 — 라벨 + 공용 피커(InlineSelect) */
const FormPick = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  margin-right: 12px;
  font-size: 12.5px;
`

const FormPickLabel = styled.span`
  flex: none;
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
`

const FormPickNote = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const FormInput = styled.input`
  flex: 1 1 240px;
  padding: 5px 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

const SubmitBtn = styled.button`
  padding: 5px 12px;
  border: none;
  border-radius: ${RADIUS.SM};
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

const CancelBtn = styled.button`
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: ${metaText};
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
