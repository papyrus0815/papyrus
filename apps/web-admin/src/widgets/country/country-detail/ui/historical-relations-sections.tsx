/**
 * 역사 국가 상세 — 계승 · 소속·구성 · 국가 관계 탭.
 *
 * 예전엔 세 탭이 각자 인라인 스타일(하드코딩 색 #6366f1·#fafafa·#dc2626…)로 칸 박스 목록을
 * 그렸다: 행마다 테두리 카드 + 늘 떠 있는 빨간 '삭제' 버튼 + 꽉 찬 보라 '추가' 버튼, 그리고
 * 공용 Modal이 아닌 손으로 만든 fixed 오버레이 다이얼로그(Esc·포커스 트랩 없음).
 * 이 파일은 같은 데이터·같은 뮤테이션을 그대로 두고 표현만 바꾼다:
 *  - 목록 = 헤어라인으로 나뉜 평평한 행(현대 국가 대시보드·사건 연관 섹션과 같은 문법)
 *  - 수정·삭제 = 행에 올렸을 때만 보이는 글 버튼, 삭제는 확인을 거친다
 *  - 추가·수정 = 공용 Modal(Esc·스크롤 잠금·포커스 트랩)
 *  - 색은 전부 테마 토큰
 */
import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowRight, FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  type CreateHistoricalCountryMembershipDto,
  type CreateHistoricalCountryRelationDto,
  type CreateHistoricalCountryTransitionDto,
  type HistoricalCountryMembershipDto,
  type HistoricalMembershipRole,
  type HistoricalRelationType,
  type TransitionEventType,
  type UpdateHistoricalCountryMembershipDto,
  createHistoricalCountryMembership,
  createHistoricalCountryRelation,
  createHistoricalCountryTransition,
  deleteHistoricalCountryMembership,
  deleteHistoricalCountryRelation,
  deleteHistoricalCountryTransition,
  getAllHistoricalCountries,
  getMembershipsByHistoricalCountryId,
  getRelationsByHistoricalCountryId,
  getTransitionsByHistoricalCountryId,
  updateHistoricalCountryMembership,
} from '@/shared/api/historical-countries'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

import * as DashboardStyles from './country-detail-dashboard.styles'

// ─── 라벨 ────────────────────────────────────────────────────────────────────

export const TRANSITION_EVENT_LABELS: Record<string, string> = {
  FOUNDED: '건국',
  CONQUEST: '정복',
  TREATY: '조약',
  INDEPENDENCE: '독립',
  UNIFICATION: '통일',
  UNION: '합병/연합',
  DISSOLVED: '멸망',
  SUCCESSION: '계승',
  SECULARIZATION: '세속화',
  SPLIT: '분열',
  OTHER: '기타',
}

const MEMBERSHIP_ROLE_LABELS: Record<HistoricalMembershipRole, string> = {
  COLONY: '식민지',
  PROTECTORATE: '보호국',
  DOMINION: '자치령',
  CONFEDERATION_MEMBER: '연방 구성원',
  VASSAL_STATE: '속국',
  ALLY: '동맹',
  UNION: '연합',
  SUCCESSION: '계승',
  OTHER: '기타',
}

const RELATION_TYPE_LABELS: Record<HistoricalRelationType, string> = {
  ALLIANCE: '동맹',
  WAR: '전쟁',
  SUZERAIN_VASSAL: '종주국-속국',
  TRIBUTARY: '조공·책봉',
  PERSONAL_UNION: '동군연합',
}

const HISTORICAL_LIST_KEY = ['historical-countries-list'] as const

const hasLeaderFlag = (role: HistoricalMembershipRole) =>
  role === 'CONFEDERATION_MEMBER' || role === 'UNION'

// ─── 공용 조각 ───────────────────────────────────────────────────────────────

/** 나라 이름 — 지금 보는 나라는 굵은 글자, 다른 나라는 그 나라 상세로 가는 링크 */
function CountryName({
  countryId,
  name,
  currentCountryId,
  fallback,
}: {
  countryId?: string | null
  name?: string | null
  currentCountryId: string
  fallback: string
}) {
  const label = name?.trim()
  if (!label) return <Muted>{fallback}</Muted>
  if (!countryId || countryId === currentCountryId) return <Self>{label}</Self>
  return (
    <CountryLink to={pathKeys.countryDetail(countryId)} title={`${label} 상세로 이동`}>
      {label}
    </CountryLink>
  )
}

function SectionHead({
  title,
  description,
  addLabel,
  onAdd,
}: {
  title: string
  description: string
  addLabel: string
  onAdd: () => void
}) {
  return (
    <Head>
      <HeadText>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </HeadText>
      <AddButton type="button" onClick={onAdd}>
        <FiPlus aria-hidden /> {addLabel}
      </AddButton>
    </Head>
  )
}

/** 나라 고르기 — 이 나라 자신은 뺀다 */
function CountrySelect({
  id,
  value,
  onChange,
  excludeId,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  excludeId: string
}) {
  const { data: countries = [], isLoading } = useQuery({
    queryKey: HISTORICAL_LIST_KEY,
    queryFn: getAllHistoricalCountries,
  })
  return (
    <Select id={id} value={value} onChange={(changeEvent) => onChange(changeEvent.target.value)}>
      <option value="">{isLoading ? '불러오는 중…' : '선택'}</option>
      {countries
        .filter((country) => country.id !== excludeId)
        .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
        .map((country) => (
          <option key={country.id} value={country.id}>
            {country.name}
          </option>
        ))}
    </Select>
  )
}

async function confirmRemove(what: string) {
  return confirm({
    title: `${what} 삭제`,
    message: `이 ${what}를 삭제할까요? 되돌릴 수 없습니다.`,
    confirmLabel: '삭제',
    danger: true,
  })
}

// ─── 계승 ────────────────────────────────────────────────────────────────────

export function SuccessionSection({ country }: { country: UnifiedCountry }) {
  const queryClient = useQueryClient()
  const historicalCountryId = country.id
  const queryKey = ['historical-country-transitions', historicalCountryId]
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<{ successorId: string; eventType: TransitionEventType }>({
    successorId: '',
    eventType: 'SUCCESSION',
  })

  const { data: transitions = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getTransitionsByHistoricalCountryId(historicalCountryId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryTransitionDto) => createHistoricalCountryTransition(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setAddOpen(false)
      setForm({ successorId: '', eventType: 'SUCCESSION' })
      notify.success('계승 관계를 추가했습니다')
    },
    onError: () => notify.error('계승 관계를 추가하지 못했습니다'),
  })
  const deleteMutation = useMutation({
    mutationFn: (transitionId: string) => deleteHistoricalCountryTransition(transitionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      notify.success('계승 관계를 삭제했습니다')
    },
    onError: () => notify.error('계승 관계를 삭제하지 못했습니다'),
  })

  return (
    <DashboardStyles.DashboardRoot>
      <Section>
        <SectionHead
          title="계승·변천"
          description="이 나라로 이어진 전신, 이 나라에서 이어진 후신과 그 방식(계승·정복·독립…)"
          addLabel="후임 국가 추가"
          onAdd={() => setAddOpen(true)}
        />
        {isLoading ? (
          <Muted>불러오는 중…</Muted>
        ) : transitions.length === 0 ? (
          <Empty>등록된 계승·변천 관계가 없습니다.</Empty>
        ) : (
          <List>
            {transitions.map((transition) => (
              <Row key={transition.id}>
                <RowMain>
                  <CountryName
                    countryId={transition.predecessorId}
                    name={transition.predecessorName}
                    currentCountryId={country.id}
                    fallback="(전임)"
                  />
                  <Arrow aria-label="에서">
                    <FiArrowRight aria-hidden />
                  </Arrow>
                  <CountryName
                    countryId={transition.successorId}
                    name={transition.successorName}
                    currentCountryId={country.id}
                    fallback="(후임)"
                  />
                  <Tag>
                    {TRANSITION_EVENT_LABELS[transition.eventType] ?? transition.eventType}
                  </Tag>
                  {transition.successorStartDate && <Muted>{transition.successorStartDate}</Muted>}
                </RowMain>
                <RowActions>
                  <DangerTextButton
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={async () => {
                      if (await confirmRemove('계승 관계')) deleteMutation.mutate(transition.id)
                    }}
                  >
                    삭제
                  </DangerTextButton>
                </RowActions>
              </Row>
            ))}
          </List>
        )}
      </Section>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="후임 국가 추가" size="narrow">
        <ModalBody>
          <FormNote>
            전임 <strong>{country.name}</strong> → 후임 국가
          </FormNote>
          <Field>
            <Label htmlFor="succession-successor">후임 국가</Label>
            <CountrySelect
              id="succession-successor"
              value={form.successorId}
              onChange={(successorId) => setForm((prev) => ({ ...prev, successorId }))}
              excludeId={historicalCountryId}
            />
          </Field>
          <Field>
            <Label htmlFor="succession-type">방식</Label>
            <Select
              id="succession-type"
              value={form.eventType}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, eventType: changeEvent.target.value as TransitionEventType }))
              }
            >
              {(Object.keys(TRANSITION_EVENT_LABELS) as TransitionEventType[]).map((key) => (
                <option key={key} value={key}>
                  {TRANSITION_EVENT_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          <FormHint>변천 시점은 후임 국가의 존속 시작을 따른다.</FormHint>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!form.successorId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                predecessorId: historicalCountryId,
                successorId: form.successorId,
                eventType: form.eventType,
              })
            }
          >
            {createMutation.isPending ? '등록 중…' : '등록'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </DashboardStyles.DashboardRoot>
  )
}

// ─── 소속·구성 ───────────────────────────────────────────────────────────────

export function MembershipSection({ country }: { country: UnifiedCountry }) {
  const queryClient = useQueryClient()
  const historicalCountryId = country.id
  const queryKey = ['historical-country-memberships', historicalCountryId]
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<HistoricalCountryMembershipDto | null>(null)
  const [form, setForm] = useState<{
    asParent: boolean
    otherCountryId: string
    role: HistoricalMembershipRole
    isLeadingMember: boolean
  }>({ asParent: true, otherCountryId: '', role: 'VASSAL_STATE', isLeadingMember: false })
  const [editForm, setEditForm] = useState<{ role: HistoricalMembershipRole; isLeadingMember: boolean }>({
    role: 'VASSAL_STATE',
    isLeadingMember: false,
  })

  const { data: memberships = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getMembershipsByHistoricalCountryId(historicalCountryId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryMembershipDto) => createHistoricalCountryMembership(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setAddOpen(false)
      setForm({ asParent: true, otherCountryId: '', role: 'VASSAL_STATE', isLeadingMember: false })
      notify.success('소속·구성 관계를 추가했습니다')
    },
    onError: () => notify.error('소속·구성 관계를 추가하지 못했습니다'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ membershipId, data }: { membershipId: string; data: UpdateHistoricalCountryMembershipDto }) =>
      updateHistoricalCountryMembership(membershipId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setEditing(null)
      notify.success('소속·구성 관계를 수정했습니다')
    },
    onError: () => notify.error('소속·구성 관계를 수정하지 못했습니다'),
  })
  const deleteMutation = useMutation({
    mutationFn: (membershipId: string) => deleteHistoricalCountryMembership(membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      notify.success('소속·구성 관계를 삭제했습니다')
    },
    onError: () => notify.error('소속·구성 관계를 삭제하지 못했습니다'),
  })

  return (
    <DashboardStyles.DashboardRoot>
      <Section>
        <SectionHead
          title="소속·구성"
          description="신성로마제국–제후국, 종주국–속국처럼 위아래로 묶인 관계"
          addLabel="소속·구성 추가"
          onAdd={() => setAddOpen(true)}
        />
        {isLoading ? (
          <Muted>불러오는 중…</Muted>
        ) : memberships.length === 0 ? (
          <Empty>등록된 소속·구성 관계가 없습니다.</Empty>
        ) : (
          <List>
            {memberships.map((membership) => (
              <Row key={membership.id}>
                <RowMain>
                  <CountryName
                    countryId={membership.historicalCountryId}
                    name={membership.parentName}
                    currentCountryId={country.id}
                    fallback="(상위)"
                  />
                  <Muted aria-hidden>⊃</Muted>
                  <CountryName
                    countryId={membership.memberCountryId}
                    name={membership.memberName}
                    currentCountryId={country.id}
                    fallback="(하위)"
                  />
                  <Tag>{MEMBERSHIP_ROLE_LABELS[membership.role] ?? membership.role}</Tag>
                  {membership.isLeadingMember && <AccentTag>주축</AccentTag>}
                </RowMain>
                <RowActions>
                  <TextButton
                    type="button"
                    onClick={() => {
                      setEditing(membership)
                      setEditForm({ role: membership.role, isLeadingMember: !!membership.isLeadingMember })
                    }}
                  >
                    수정
                  </TextButton>
                  <DangerTextButton
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={async () => {
                      if (await confirmRemove('소속·구성 관계')) deleteMutation.mutate(membership.id)
                    }}
                  >
                    삭제
                  </DangerTextButton>
                </RowActions>
              </Row>
            ))}
          </List>
        )}
      </Section>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="소속·구성 수정" size="narrow">
        <ModalBody>
          {editing && (
            <FormNote>
              {editing.parentName ?? '(상위)'} ⊃ {editing.memberName ?? '(하위)'}
            </FormNote>
          )}
          <Field>
            <Label htmlFor="membership-edit-role">역할</Label>
            <Select
              id="membership-edit-role"
              value={editForm.role}
              onChange={(changeEvent) =>
                setEditForm((prev) => ({ ...prev, role: changeEvent.target.value as HistoricalMembershipRole }))
              }
            >
              {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((key) => (
                <option key={key} value={key}>
                  {MEMBERSHIP_ROLE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          {hasLeaderFlag(editForm.role) && (
            <CheckField>
              <input
                type="checkbox"
                checked={editForm.isLeadingMember}
                onChange={(changeEvent) =>
                  setEditForm((prev) => ({ ...prev, isLeadingMember: changeEvent.target.checked }))
                }
              />
              주축(주도국)
            </CheckField>
          )}
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setEditing(null)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={updateMutation.isPending}
            onClick={() =>
              editing &&
              updateMutation.mutate({
                membershipId: editing.id,
                data: {
                  role: editForm.role,
                  isLeadingMember: hasLeaderFlag(editForm.role) ? editForm.isLeadingMember : false,
                },
              })
            }
          >
            {updateMutation.isPending ? '저장 중…' : '저장'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="소속·구성 추가" size="narrow">
        <ModalBody>
          <Field>
            <Label htmlFor="membership-position">이 나라의 위치</Label>
            <Select
              id="membership-position"
              value={form.asParent ? 'parent' : 'member'}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, asParent: changeEvent.target.value === 'parent' }))
              }
            >
              <option value="parent">상위 — 이 나라가 포함하는 하위 국가 추가</option>
              <option value="member">하위 — 이 나라가 소속된 상위 국가 추가</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="membership-other">{form.asParent ? '하위 국가' : '상위 국가'}</Label>
            <CountrySelect
              id="membership-other"
              value={form.otherCountryId}
              onChange={(otherCountryId) => setForm((prev) => ({ ...prev, otherCountryId }))}
              excludeId={historicalCountryId}
            />
          </Field>
          <Field>
            <Label htmlFor="membership-role">역할</Label>
            <Select
              id="membership-role"
              value={form.role}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, role: changeEvent.target.value as HistoricalMembershipRole }))
              }
            >
              {(Object.keys(MEMBERSHIP_ROLE_LABELS) as HistoricalMembershipRole[]).map((key) => (
                <option key={key} value={key}>
                  {MEMBERSHIP_ROLE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
          {hasLeaderFlag(form.role) && (
            <>
              <CheckField>
                <input
                  type="checkbox"
                  checked={form.isLeadingMember}
                  onChange={(changeEvent) =>
                    setForm((prev) => ({ ...prev, isLeadingMember: changeEvent.target.checked }))
                  }
                />
                주축(주도국)
              </CheckField>
              <FormHint>연방·연합 안에서 주도적 역할을 한 구성원(예: 독일 제국 안의 프로이센)</FormHint>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!form.otherCountryId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                historicalCountryId: form.asParent ? historicalCountryId : form.otherCountryId,
                memberCountryId: form.asParent ? form.otherCountryId : historicalCountryId,
                role: form.role,
                isLeadingMember: hasLeaderFlag(form.role) ? form.isLeadingMember : undefined,
              })
            }
          >
            {createMutation.isPending ? '등록 중…' : '등록'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </DashboardStyles.DashboardRoot>
  )
}

// ─── 국가 관계 ───────────────────────────────────────────────────────────────

export function RelationSection({ country }: { country: UnifiedCountry }) {
  const queryClient = useQueryClient()
  const historicalCountryId = country.id
  const queryKey = ['historical-country-relations', historicalCountryId]
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<{
    asSubject: boolean
    otherCountryId: string
    relationType: HistoricalRelationType
  }>({ asSubject: true, otherCountryId: '', relationType: 'TRIBUTARY' })

  const { data: relations = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getRelationsByHistoricalCountryId(historicalCountryId),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateHistoricalCountryRelationDto) => createHistoricalCountryRelation(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      setAddOpen(false)
      setForm({ asSubject: true, otherCountryId: '', relationType: 'TRIBUTARY' })
      notify.success('국가 관계를 추가했습니다')
    },
    onError: () => notify.error('국가 관계를 추가하지 못했습니다'),
  })
  const deleteMutation = useMutation({
    mutationFn: (relationId: string) => deleteHistoricalCountryRelation(relationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      notify.success('국가 관계를 삭제했습니다')
    },
    onError: () => notify.error('국가 관계를 삭제하지 못했습니다'),
  })

  return (
    <DashboardStyles.DashboardRoot>
      <Section>
        <SectionHead
          title="국가 관계"
          description="조공·책봉, 동맹, 전쟁, 동군연합처럼 나란히 선 나라 사이의 관계"
          addLabel="관계 추가"
          onAdd={() => setAddOpen(true)}
        />
        {isLoading ? (
          <Muted>불러오는 중…</Muted>
        ) : relations.length === 0 ? (
          <Empty>등록된 국가 관계가 없습니다.</Empty>
        ) : (
          <List>
            {relations.map((relation) => (
              <Row key={relation.id}>
                <RowMain>
                  <CountryName
                    countryId={relation.subjectCountryId}
                    name={relation.subjectCountryName}
                    currentCountryId={country.id}
                    fallback="(주체)"
                  />
                  <Tag>{RELATION_TYPE_LABELS[relation.relationType] ?? relation.relationType}</Tag>
                  <CountryName
                    countryId={relation.objectCountryId}
                    name={relation.objectCountryName}
                    currentCountryId={country.id}
                    fallback="(대상)"
                  />
                </RowMain>
                <RowActions>
                  <DangerTextButton
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={async () => {
                      if (await confirmRemove('국가 관계')) deleteMutation.mutate(relation.id)
                    }}
                  >
                    삭제
                  </DangerTextButton>
                </RowActions>
              </Row>
            ))}
          </List>
        )}
      </Section>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="국가 관계 추가" size="narrow">
        <ModalBody>
          <Field>
            <Label htmlFor="relation-position">이 나라의 위치</Label>
            <Select
              id="relation-position"
              value={form.asSubject ? 'subject' : 'object'}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, asSubject: changeEvent.target.value === 'subject' }))
              }
            >
              <option value="subject">주체 — 이 나라 → 상대 국가</option>
              <option value="object">대상 — 상대 국가 → 이 나라</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="relation-other">상대 국가</Label>
            <CountrySelect
              id="relation-other"
              value={form.otherCountryId}
              onChange={(otherCountryId) => setForm((prev) => ({ ...prev, otherCountryId }))}
              excludeId={historicalCountryId}
            />
          </Field>
          <Field>
            <Label htmlFor="relation-type">관계 유형</Label>
            <Select
              id="relation-type"
              value={form.relationType}
              onChange={(changeEvent) =>
                setForm((prev) => ({ ...prev, relationType: changeEvent.target.value as HistoricalRelationType }))
              }
            >
              {(Object.keys(RELATION_TYPE_LABELS) as HistoricalRelationType[]).map((key) => (
                <option key={key} value={key}>
                  {RELATION_TYPE_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
        </ModalBody>
        <ModalFooter>
          <SecondaryButton type="button" onClick={() => setAddOpen(false)}>
            취소
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!form.otherCountryId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                subjectCountryId: form.asSubject ? historicalCountryId : form.otherCountryId,
                objectCountryId: form.asSubject ? form.otherCountryId : historicalCountryId,
                relationType: form.relationType,
              })
            }
          >
            {createMutation.isPending ? '등록 중…' : '등록'}
          </PrimaryButton>
        </ModalFooter>
      </Modal>
    </DashboardStyles.DashboardRoot>
  )
}

// ─── Styled ─────────────────────────────────────────────────────────────────

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 960px;
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Title = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.active};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const RowActions = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s ease;

  @media (hover: none) {
    opacity: 0.7;
  }
`

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc')};
  }
  &:hover ${RowActions}, &:focus-within ${RowActions} {
    opacity: 1;
  }
`

const RowMain = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 10px;
  flex: 1;
  min-width: 0;
  font-size: 14px;
`

const Self = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CountryLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.active};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const Arrow = styled.span`
  display: inline-flex;
  align-self: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Tag = styled.span`
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9')};
`

const AccentTag = styled(Tag)`
  color: ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.activeLight};
`

const Muted = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Empty = styled.p`
  margin: 0;
  padding: 20px 0;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const TextButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#eef2f7')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const DangerTextButton = styled(TextButton)`
  &:hover {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
  }
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Select = styled.select`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff')};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const CheckField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  input {
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`

const FormNote = styled.p`
  margin: 0 0 14px;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FormHint = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SecondaryButton = styled.button`
  padding: 8px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const PrimaryButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
