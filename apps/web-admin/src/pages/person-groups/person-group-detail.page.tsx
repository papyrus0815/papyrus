/**
 * 인물 묶음 상세 페이지 (/person-groups/:groupId).
 * 모달이 아닌 고유 URL 페이지 — 딥링크·공유 가능. 계승(이전/다음 세대)은 페이지 링크로 승격.
 * 읽기 모드에서는 역할(roleLabel)과 설명(note) 전문, 타 집단 소속 배지, 연관 집단, 소속 인물 관여 사건을 보여주고,
 * 편집 권한(canEdit)이 있으면 메타 편집 및 멤버 역할·설명·순서 편집이 가능하다.
 */
import React, { useMemo, useState } from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUp,
  FiCheck,
  FiChevronLeft,
  FiEdit2,
  FiGitBranch,
  FiTrash2,
  FiUserPlus,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  addPersonGroupMember,
  deletePersonGroup,
  getPersonGroup,
  listPersonGroups,
  removePersonGroupMember,
  updatePersonGroup,
  updatePersonGroupMember,
  type PersonGroup,
  type PersonGroupType,
} from '@/shared/api/person-groups'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'
import {
  GroupTypeBadge,
  GroupTypeChips,
  personLifespanLabel,
  sortGroupMembers,
} from '@/widgets/person/person-group-ui/group-type-ui'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

function yearLabel(era: 'BC' | 'AD' | null | undefined, y?: number | null) {
  if (y == null || !Number.isFinite(y)) return ''
  return era === 'BC' ? `BC ${y}` : `${y}`
}

/**
 * 설명 텍스트 안의 `「집단 이름」` 표기를 찾아 실제 존재하는 집단이면 상세 링크로 변환한다.
 */
function renderDescriptionWithGroupLinks(
  text: string,
  allGroups: PersonGroup[],
  currentGroupId: string,
): React.ReactNode {
  const byName = new Map<string, PersonGroup>()
  for (const g of allGroups) {
    if (g.id !== currentGroupId) {
      byName.set(g.name.trim(), g)
    }
  }
  const parts = text.split(/(「[^」]+」)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('「') && part.endsWith('」')) {
      const inner = part.slice(1, -1).trim()
      const matched = byName.get(inner)
      if (matched) {
        return (
          <InlineGroupLink
            key={idx}
            to={pathKeys.personGroupDetail(matched.id)}
            title={`${matched.name} (${matched.memberCount}명) 상세로 이동`}
          >
            {part}
          </InlineGroupLink>
        )
      }
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

interface RelatedGroupInfo {
  group: PersonGroup
  sharedMembers: Array<{ id: string; name: string }>
  relationBadge: string
}

interface EditForm {
  name: string
  type: PersonGroupType
  generationOrder: string
  description: string
  countryId: string
  historicalCountryId: string
  predecessorGroupId: string
  centerPersonId: string
  centerName: string
}

const OUTCOME_LABELS: Record<string, string> = {
  VICTORY: '승리',
  DEFEAT: '패배',
  DRAW: '무승부',
  WITHDRAWAL: '철수',
  INCONCLUSIVE: '결론 없음',
}

export default function PersonGroupDetailPage() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [memberEditMode, setMemberEditMode] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [picker, setPicker] = useState<'member' | 'center' | null>(null)

  const { data: group, isLoading } = useQuery({
    queryKey: ['person-group', groupId],
    queryFn: () => getPersonGroup(groupId),
    enabled: Boolean(groupId),
  })
  const allGroupsQuery = useQuery({
    queryKey: ['person-groups-all'],
    queryFn: () => listPersonGroups(),
    staleTime: 60_000,
  })
  const countriesQuery = useQuery({
    queryKey: ['all-countries'],
    queryFn: () => getAllCountries(),
    enabled: editing,
    staleTime: 5 * 60_000,
  })
  const historicalCountriesQuery = useQuery({
    queryKey: ['all-historical-countries'],
    queryFn: () => getAllHistoricalCountries(),
    enabled: editing,
    staleTime: 5 * 60_000,
  })
  const allPersonsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: () => getAllPersons(),
    enabled: Boolean(picker),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['person-group', groupId] })
    void queryClient.invalidateQueries({ queryKey: ['person-groups-all'] })
    void queryClient.invalidateQueries({ queryKey: ['person-groups-by-person'] })
  }

  const members = useMemo(() => {
    if (!group) return []
    return sortGroupMembers(group.members, group.center?.id)
  }, [group])

  /** 각 멤버가 속한 다른 집단 목록 */
  const otherGroupsByPersonId = useMemo(() => {
    const map = new Map<string, PersonGroup[]>()
    if (!group) return map
    const allGroups = allGroupsQuery.data ?? []
    for (const g of allGroups) {
      if (g.id === group.id) continue
      for (const m of g.members ?? []) {
        const list = map.get(m.person.id) ?? []
        list.push(g)
        map.set(m.person.id, list)
      }
    }
    return map
  }, [group, allGroupsQuery.data])

  /** 인원 중첩 또는 설명 참조로 연결된 연관 집단 */
  const relatedGroups = useMemo<RelatedGroupInfo[]>(() => {
    if (!group) return []
    const allGroups = allGroupsQuery.data ?? []
    const currentMemberNameById = new Map<string, string>()
    for (const m of group.members) {
      currentMemberNameById.set(
        m.person.id,
        getPersonDisplayName(m.person, true),
      )
    }
    const predOrSuccIds = new Set<string>([
      ...(group.predecessor ? [group.predecessor.id] : []),
      ...(group.successors ?? []).map((s) => s.id),
    ])

    const results: RelatedGroupInfo[] = []
    for (const other of allGroups) {
      if (other.id === group.id || predOrSuccIds.has(other.id)) continue
      const shared: Array<{ id: string; name: string }> = []
      for (const m of other.members ?? []) {
        const name = currentMemberNameById.get(m.person.id)
        if (name) {
          shared.push({ id: m.person.id, name })
        }
      }
      const mentionedInOurDesc = Boolean(
        group.description?.includes(`「${other.name}」`),
      )
      const mentionsUsInTheirDesc = Boolean(
        other.description?.includes(`「${group.name}」`),
      )

      if (shared.length === 0 && !mentionedInOurDesc && !mentionsUsInTheirDesc) {
        continue
      }

      let relationBadge = `공유 인물 ${shared.length}명`
      const ourCount = group.members.length
      const otherCount = (other.members ?? []).length || other.memberCount
      if (shared.length > 0 && ourCount > 0 && otherCount > 0) {
        if (shared.length === ourCount && otherCount > ourCount) {
          relationBadge = `상위 집단 (전원 ${shared.length}명 포함)`
        } else if (shared.length === otherCount && ourCount > otherCount) {
          relationBadge = `하위 분파 (${shared.length}명 전원 소속)`
        } else if (shared.length === ourCount && shared.length === otherCount) {
          relationBadge = `동일 구성 (${shared.length}명)`
        }
      } else if (shared.length === 0) {
        relationBadge = '설명 참조'
      }

      results.push({
        group: other,
        sharedMembers: shared,
        relationBadge,
      })
    }

    return results.sort(
      (a, b) =>
        b.sharedMembers.length - a.sharedMembers.length ||
        a.group.name.localeCompare(b.group.name, 'ko'),
    )
  }, [group, allGroupsQuery.data])

  const updateGroupMutation = useMutation({
    mutationFn: (form: EditForm) =>
      updatePersonGroup(groupId, {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || null,
        generationOrder:
          form.type === 'GENERATION' && form.generationOrder.trim()
            ? Number(form.generationOrder)
            : null,
        countryId: form.countryId || null,
        historicalCountryId: form.historicalCountryId || null,
        predecessorGroupId: form.predecessorGroupId || null,
        centerPersonId: form.centerPersonId || null,
      }),
    onSuccess: () => {
      notify.success('수정했습니다.')
      setEditing(false)
      setEditForm(null)
      invalidate()
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '수정 실패'),
  })

  const addMemberMutation = useMutation({
    mutationFn: (personId: string) =>
      addPersonGroupMember(groupId, { personId }),
    onSuccess: () => {
      notify.success('멤버를 추가했습니다.')
      invalidate()
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '추가 실패'),
  })
  const updateMemberMutation = useMutation({
    mutationFn: ({
      membershipId,
      roleLabel,
      note,
      sortOrder,
    }: {
      membershipId: string
      roleLabel?: string | null
      note?: string | null
      sortOrder?: number | null
    }) =>
      updatePersonGroupMember(groupId, membershipId, {
        roleLabel,
        note,
        sortOrder,
      }),
    onSuccess: () => {
      invalidate()
    },
    onError: () => notify.error('멤버 정보 저장 실패'),
  })
  const reorderMemberMutation = useMutation({
    mutationFn: async ({
      fromIndex,
      toIndex,
    }: {
      fromIndex: number
      toIndex: number
    }) => {
      const next = [...members]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      await Promise.all(
        next.map((m, idx) =>
          updatePersonGroupMember(groupId, m.membershipId, {
            sortOrder: idx + 1,
          }),
        ),
      )
    },
    onSuccess: () => {
      invalidate()
    },
    onError: () => notify.error('순서 변경 실패'),
  })
  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) =>
      removePersonGroupMember(groupId, membershipId),
    onSuccess: invalidate,
    onError: () => notify.error('제거 실패'),
  })
  const deleteGroupMutation = useMutation({
    mutationFn: () => deletePersonGroup(groupId),
    onSuccess: () => {
      notify.success('삭제했습니다.')
      void queryClient.invalidateQueries({ queryKey: ['person-groups-all'] })
      void queryClient.invalidateQueries({
        queryKey: ['person-groups-by-person'],
      })
      navigate(pathKeys.personGroups())
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '삭제 실패'),
  })

  const startEdit = () => {
    if (!group) return
    setEditForm({
      name: group.name,
      type: group.type,
      generationOrder:
        group.generationOrder != null ? String(group.generationOrder) : '',
      description: group.description ?? '',
      countryId: group.countryId ?? '',
      historicalCountryId: group.historicalCountryId ?? '',
      predecessorGroupId: group.predecessor?.id ?? '',
      centerPersonId: group.center?.id ?? '',
      centerName: group.center ? getPersonDisplayName(group.center, true) : '',
    })
    setEditing(true)
  }

  if (isLoading) {
    return (
      <Page>
        <BackLink to={pathKeys.personGroups()}>
          <FiChevronLeft size={16} /> 집단 목록
        </BackLink>
        <Muted>불러오는 중…</Muted>
      </Page>
    )
  }
  if (!group) {
    return (
      <Page>
        <BackLink to={pathKeys.personGroups()}>
          <FiChevronLeft size={16} /> 집단 목록
        </BackLink>
        <Muted>묶음을 찾을 수 없습니다.</Muted>
      </Page>
    )
  }

  const successors = group.successors ?? []
  const eventSideCount = group.eventSides?.length ?? 0
  const memberEventCount = group.memberEvents?.length ?? 0
  const totalEventCount = eventSideCount + memberEventCount

  return (
    <Page>
      <BackLink to={pathKeys.personGroups()}>
        <FiChevronLeft size={16} /> 집단 목록
      </BackLink>

      {/* ── 헤더 ── */}
      <HeaderCard>
        <HeaderTop>
          <GroupTypeBadge type={group.type} />
          {group.type === 'GENERATION' && group.generationOrder != null && (
            <OrdinalTag>{group.generationOrder}세대</OrdinalTag>
          )}
          {group.historicalCountryName && (
            <MetaPillLink
              to={
                group.historicalCountryId
                  ? pathKeys.personGroups({
                      historicalCountryId: group.historicalCountryId,
                    })
                  : pathKeys.personGroups()
              }
              title="이 역사 국가의 집단 모아보기"
            >
              {group.historicalCountryName}
            </MetaPillLink>
          )}
          {group.countryName && (
            <MetaPillLink
              to={
                group.countryId
                  ? pathKeys.countryDetail(group.countryId)
                  : pathKeys.personGroups()
              }
              title="국가 상세로 이동"
            >
              {group.countryName}
            </MetaPillLink>
          )}
          <MetaPill>{group.memberCount}명</MetaPill>
          {totalEventCount > 0 && (
            <MetaPill>관여 사건 {totalEventCount}건</MetaPill>
          )}
          <Spacer />
          {group.canEdit && !editing && (
            <>
              <IconBtn type="button" title="집단 정보 편집" onClick={startEdit}>
                <FiEdit2 size={16} />
              </IconBtn>
              <IconBtn
                type="button"
                $danger
                title="삭제"
                onClick={async () => {
                  if (
                    await confirm({
                      title: '삭제 확인',
                      message: `“${group.name}” 묶음을 삭제할까요? 모든 멤버십이 함께 제거됩니다.`,
                      danger: true,
                    })
                  )
                    deleteGroupMutation.mutate()
                }}
              >
                <FiTrash2 size={16} />
              </IconBtn>
            </>
          )}
        </HeaderTop>

        {editing && editForm ? (
          <EditBox>
            <Label>유형</Label>
            <GroupTypeChips
              value={editForm.type}
              onChange={(t) => setEditForm({ ...editForm, type: t })}
            />
            <Label>이름</Label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <CondRow>
              {editForm.type === 'GENERATION' && (
                <Field style={{ width: 140 }}>
                  <Label>세대 순번</Label>
                  <Input
                    type="number"
                    value={editForm.generationOrder}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        generationOrder: e.target.value,
                      })
                    }
                  />
                </Field>
              )}
              <Field style={{ flex: 1, minWidth: 200 }}>
                <Label>중심 인물 (선택)</Label>
                <PickerRow>
                  <PickerValue $empty={!editForm.centerPersonId}>
                    {editForm.centerPersonId
                      ? `★ ${editForm.centerName}`
                      : '미지정'}
                  </PickerValue>
                  <SmallBtn type="button" onClick={() => setPicker('center')}>
                    선택
                  </SmallBtn>
                  {editForm.centerPersonId && (
                    <SmallBtn
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          centerPersonId: '',
                          centerName: '',
                        })
                      }
                    >
                      해제
                    </SmallBtn>
                  )}
                </PickerRow>
              </Field>
            </CondRow>
            <CondRow>
              <Field style={{ flex: 1, minWidth: 180 }}>
                <Label>역사 국가 (예: 프랑스 제1공화국, 조선)</Label>
                <Select
                  value={editForm.historicalCountryId}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      historicalCountryId: e.target.value,
                    })
                  }
                >
                  <option value="">미지정</option>
                  {(historicalCountriesQuery.data ?? []).map((hc) => (
                    <option key={hc.id} value={hc.id}>
                      {hc.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field style={{ flex: 1, minWidth: 180 }}>
                <Label>현대 국가 (선택)</Label>
                <Select
                  value={editForm.countryId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, countryId: e.target.value })
                  }
                >
                  <option value="">미지정</option>
                  {(countriesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </CondRow>
            <Field>
              <Label>전임 묶음 (이전 세대·계파 계승, 선택)</Label>
              <Select
                value={editForm.predecessorGroupId}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    predecessorGroupId: e.target.value,
                  })
                }
              >
                <option value="">없음</option>
                {(allGroupsQuery.data ?? [])
                  .filter((c) => c.id !== group.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.generationOrder != null
                        ? `${c.generationOrder}세대 · `
                        : ''}
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Label>설명</Label>
            <Textarea
              rows={3}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
            <CondRow>
              <PrimaryBtn
                type="button"
                disabled={!editForm.name.trim() || updateGroupMutation.isPending}
                onClick={() => updateGroupMutation.mutate(editForm)}
              >
                저장
              </PrimaryBtn>
              <GhostBtn
                type="button"
                onClick={() => {
                  setEditing(false)
                  setEditForm(null)
                }}
              >
                취소
              </GhostBtn>
            </CondRow>
          </EditBox>
        ) : (
          <>
            <GroupName>{group.name}</GroupName>
            {group.center && (
              <CenterBanner>
                ★ 구심점:{' '}
                <Link to={pathKeys.personsTimelineDetail(group.center.id)}>
                  {getPersonDisplayName(group.center, true)}
                </Link>
              </CenterBanner>
            )}
            {group.description?.trim() && (
              <Description>
                {renderDescriptionWithGroupLinks(
                  group.description,
                  allGroupsQuery.data ?? [],
                  group.id,
                )}
              </Description>
            )}
            {(group.predecessor || successors.length > 0) && (
              <SuccessionBar>
                {group.predecessor ? (
                  <NavLink to={pathKeys.personGroupDetail(group.predecessor.id)}>
                    <FiArrowLeft size={14} />
                    <span>
                      이전:{' '}
                      {group.predecessor.generationOrder != null
                        ? `${group.predecessor.generationOrder}세대 · `
                        : ''}
                      {group.predecessor.name}
                    </span>
                  </NavLink>
                ) : (
                  <span />
                )}
                {successors.length > 0 ? (
                  <SuccessorsRight>
                    {successors.map((succ) => (
                      <NavLink
                        key={succ.id}
                        $right
                        to={pathKeys.personGroupDetail(succ.id)}
                      >
                        <span>
                          다음:{' '}
                          {succ.generationOrder != null
                            ? `${succ.generationOrder}세대 · `
                            : ''}
                          {succ.name}
                        </span>
                        <FiArrowRight size={14} />
                      </NavLink>
                    ))}
                  </SuccessorsRight>
                ) : (
                  <span />
                )}
              </SuccessionBar>
            )}
            {relatedGroups.length > 0 && (
              <RelatedBar>
                <RelatedTitle>
                  <FiGitBranch size={13} /> 연관 집단 (인원 공유 · 설명 참조)
                </RelatedTitle>
                <RelatedList>
                  {relatedGroups.map((rel) => (
                    <RelatedCard
                      key={rel.group.id}
                      to={pathKeys.personGroupDetail(rel.group.id)}
                    >
                      <RelatedTop>
                        <GroupTypeBadge type={rel.group.type} />
                        <RelatedBadge>{rel.relationBadge}</RelatedBadge>
                      </RelatedTop>
                      <RelatedName>{rel.group.name}</RelatedName>
                      {rel.sharedMembers.length > 0 && (
                        <RelatedMembersText>
                          공유:{' '}
                          {rel.sharedMembers
                            .slice(0, 5)
                            .map((m) => m.name)
                            .join(' · ')}
                          {rel.sharedMembers.length > 5
                            ? ` 외 ${rel.sharedMembers.length - 5}명`
                            : ''}
                        </RelatedMembersText>
                      )}
                    </RelatedCard>
                  ))}
                </RelatedList>
              </RelatedBar>
            )}
          </>
        )}
      </HeaderCard>

      {/* ── 멤버 ── */}
      <SectionHead>
        <SectionTitle>멤버 {group.memberCount}명</SectionTitle>
        {group.canEdit && (
          <SectionActions>
            {members.length > 0 && (
              <MemberModeBtn
                type="button"
                $active={memberEditMode}
                onClick={() => setMemberEditMode((v) => !v)}
              >
                {memberEditMode ? (
                  <>
                    <FiCheck size={14} /> 편집 완료
                  </>
                ) : (
                  <>
                    <FiEdit2 size={14} /> 역할·설명·순서 편집
                  </>
                )}
              </MemberModeBtn>
            )}
            <AddBtn type="button" onClick={() => setPicker('member')}>
              <FiUserPlus size={15} /> 멤버 추가
            </AddBtn>
          </SectionActions>
        )}
      </SectionHead>

      {members.length === 0 ? (
        <Muted>아직 멤버가 없습니다.</Muted>
      ) : (
        <MemberGrid>
          {members.map((m, index) => {
            const p = m.person
            const displayName = getPersonDisplayName(p, true)
            const src = p.profileImageUrl?.trim()
              ? getUploadImageUrl(p.profileImageUrl) || p.profileImageUrl
              : ''
            const initial = [...displayName][0] ?? '?'
            const isCenter = group.center?.id === p.id
            const spanText = personLifespanLabel(p) || '연도 미상'
            const otherGroups = otherGroupsByPersonId.get(p.id) ?? []

            return (
              <MemberCard key={m.membershipId} $center={isCenter}>
                <MemberCardHeader>
                  <MemberLink to={pathKeys.personsTimelineDetail(p.id)}>
                    <Avatar $has={Boolean(src)}>
                      {src ? (
                        <img src={src} alt="" loading="lazy" />
                      ) : (
                        <AvatarInitial>{initial}</AvatarInitial>
                      )}
                    </Avatar>
                    <MemberIdentity>
                      <MNameRow>
                        <MName>{displayName}</MName>
                        {isCenter && <CenterChip>★ 구심점</CenterChip>}
                        {p.country?.name && (
                          <MemberCountryChip>{p.country.name}</MemberCountryChip>
                        )}
                      </MNameRow>
                      <MYears>{spanText}</MYears>
                    </MemberIdentity>
                  </MemberLink>

                  {group.canEdit && memberEditMode && (
                    <MemberOrderControls>
                      <OrderBtn
                        type="button"
                        title="위로 이동"
                        disabled={
                          index === 0 || reorderMemberMutation.isPending
                        }
                        onClick={() =>
                          reorderMemberMutation.mutate({
                            fromIndex: index,
                            toIndex: index - 1,
                          })
                        }
                      >
                        <FiArrowUp size={13} />
                      </OrderBtn>
                      <OrderBtn
                        type="button"
                        title="아래로 이동"
                        disabled={
                          index === members.length - 1 ||
                          reorderMemberMutation.isPending
                        }
                        onClick={() =>
                          reorderMemberMutation.mutate({
                            fromIndex: index,
                            toIndex: index + 1,
                          })
                        }
                      >
                        <FiArrowDown size={13} />
                      </OrderBtn>
                      <RemoveBtn
                        type="button"
                        title="멤버 제거"
                        onClick={() => removeMemberMutation.mutate(m.membershipId)}
                      >
                        <FiX size={15} />
                      </RemoveBtn>
                    </MemberOrderControls>
                  )}
                </MemberCardHeader>

                {group.canEdit && memberEditMode ? (
                  <MemberEditFields>
                    <EditFieldGroup>
                      <EditFieldLabel>집단 내 역할·직책</EditFieldLabel>
                      <RoleInput
                        defaultValue={m.roleLabel ?? ''}
                        placeholder="예: 러시아 외무장관 — 총동원령 지지"
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          const cur = (m.roleLabel ?? '').trim()
                          if (next !== cur) {
                            updateMemberMutation.mutate({
                              membershipId: m.membershipId,
                              roleLabel: next || null,
                            })
                          }
                        }}
                      />
                    </EditFieldGroup>
                    <EditFieldGroup>
                      <EditFieldLabel>설명·행적 메모</EditFieldLabel>
                      <NoteTextarea
                        rows={2}
                        defaultValue={m.note ?? ''}
                        placeholder="이 집단에서 맡은 역할이나 맥락을 서술하세요"
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          const cur = (m.note ?? '').trim()
                          if (next !== cur) {
                            updateMemberMutation.mutate({
                              membershipId: m.membershipId,
                              note: next || null,
                            })
                          }
                        }}
                      />
                    </EditFieldGroup>
                  </MemberEditFields>
                ) : (
                  <>
                    {m.roleLabel?.trim() && (
                      <RoleBanner>{m.roleLabel}</RoleBanner>
                    )}
                    {m.note?.trim() && (
                      <MemberNoteText>{m.note}</MemberNoteText>
                    )}
                    {otherGroups.length > 0 && (
                      <OtherGroupsRow>
                        <OtherGroupsLabel>타 집단</OtherGroupsLabel>
                        {otherGroups.map((og) => (
                          <OtherGroupChip
                            key={og.id}
                            to={pathKeys.personGroupDetail(og.id)}
                          >
                            {og.name}
                          </OtherGroupChip>
                        ))}
                      </OtherGroupsRow>
                    )}
                  </>
                )}
              </MemberCard>
            )
          })}
        </MemberGrid>
      )}

      {/* ── 참여·관여 사건 ── */}
      <SectionHead>
        <SectionTitle>참여·관여 사건 {totalEventCount}건</SectionTitle>
      </SectionHead>
      {totalEventCount === 0 ? (
        <Muted>
          사건의 ‘진영’에 이 집단({group.name})을 연결하거나 소속 인물이 사건에 참여하면 여기에 표시됩니다.
        </Muted>
      ) : (
        <EventSideList>
          {group.eventSides?.map((es) => {
            const yearText = yearLabel(
              (es.startEra as 'BC' | 'AD' | null) ?? null,
              es.startYear,
            )
            return (
              <EventSideRow key={es.sideId}>
                <EventMainLink to={pathKeys.events.detail(es.eventId)}>
                  <EventKindTag $faction>진영 참여</EventKindTag>
                  {yearText && <EventYear>{yearText}년</EventYear>}
                  <EventTitleText>{es.eventTitle}</EventTitleText>
                </EventMainLink>
                <EventVsRow>
                  <SidePill $color={es.sideColor ?? '#1d4ed8'}>
                    {es.sideName}
                    {es.outcome && (
                      <OutcomeTag>
                        {OUTCOME_LABELS[es.outcome] ?? es.outcome}
                      </OutcomeTag>
                    )}
                  </SidePill>
                  {es.opposingSides.length > 0 && (
                    <>
                      <VsText>vs</VsText>
                      {es.opposingSides.map((opp) =>
                        opp.personGroupId ? (
                          <OpposingGroupLink
                            key={opp.id}
                            to={pathKeys.personGroupDetail(opp.personGroupId)}
                            $color={opp.color ?? '#b91c1c'}
                          >
                            {opp.name}
                            {opp.outcome && (
                              <OutcomeTag>
                                {OUTCOME_LABELS[opp.outcome] ?? opp.outcome}
                              </OutcomeTag>
                            )}
                          </OpposingGroupLink>
                        ) : (
                          <SidePill
                            key={opp.id}
                            $color={opp.color ?? '#b91c1c'}
                          >
                            {opp.name}
                            {opp.outcome && (
                              <OutcomeTag>
                                {OUTCOME_LABELS[opp.outcome] ?? opp.outcome}
                              </OutcomeTag>
                            )}
                          </SidePill>
                        ),
                      )}
                    </>
                  )}
                </EventVsRow>
              </EventSideRow>
            )
          })}

          {group.memberEvents?.map((me) => {
            const yearText = yearLabel(
              (me.startEra as 'BC' | 'AD' | null) ?? null,
              me.startYear,
            )
            return (
              <EventSideRow key={me.eventId}>
                <EventMainLink to={pathKeys.events.detail(me.eventId)}>
                  <EventKindTag>인물 관여</EventKindTag>
                  {yearText && <EventYear>{yearText}년</EventYear>}
                  <EventTitleText>{me.eventTitle}</EventTitleText>
                </EventMainLink>
                <EventVsRow>
                  {me.participants.map((part) => (
                    <ParticipantPill
                      key={part.personId}
                      to={pathKeys.personsTimelineDetail(part.personId)}
                    >
                      {part.personName}
                      {part.role ? ` (${part.role})` : ''}
                    </ParticipantPill>
                  ))}
                </EventVsRow>
              </EventSideRow>
            )
          })}
        </EventSideList>
      )}

      {picker && (
        <PersonSelectModal
          persons={allPersonsQuery.data ?? []}
          selectedPersonId=""
          title={picker === 'center' ? '중심 인물 선택' : '멤버 추가'}
          excludeIds={
            picker === 'member' ? group.members.map((m) => m.person.id) : []
          }
          onSelect={(id, pname) => {
            if (picker === 'member') addMemberMutation.mutate(id)
            else if (editForm)
              setEditForm({
                ...editForm,
                centerPersonId: id,
                centerName: pname,
              })
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </Page>
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const Page = styled.div`
  padding: 24px 24px 60px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const HeaderCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
`

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const Spacer = styled.div`
  flex: 1;
`

const OrdinalTag = styled.span`
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const MetaPill = styled.span`
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaPillLink = styled(Link)`
  padding: 2px 9px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  border: 1px solid transparent;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const GroupName = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CenterBanner = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 700;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`

const Description = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const InlineGroupLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  text-decoration: none;
  padding: 1px 4px;
  border-radius: 6px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.10)'};
  &:hover {
    text-decoration: underline;
  }
`

const SuccessionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SuccessorsRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
`

const NavLink = styled(Link)<{ $right?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 700;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const RelatedBar = styled.div`
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RelatedTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelatedList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
`

const RelatedCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 13px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
  text-decoration: none;
  transition: border-color 0.14s ease, transform 0.14s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
`

const RelatedTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`

const RelatedBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`

const RelatedName = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const RelatedMembersText = styled.div`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const MemberModeBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.default};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.primary}15` : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const MemberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const MemberCard = styled.div<{ $center?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid
    ${({ $center, theme }) =>
      $center
        ? isDark(theme.mode)
          ? 'rgba(255,214,10,0.45)'
          : 'rgba(245,158,11,0.5)'
        : theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
`

const MemberCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`

const MemberLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
  text-decoration: none;
  color: inherit;
  &:hover strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Avatar = styled.div<{ $has: boolean }>`
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid
    ${({ $has, theme }) => ($has ? 'transparent' : theme.colors.border.default)};
  background: ${({ $has, theme }) =>
    $has ? 'transparent' : theme.colors.background.tertiary};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const AvatarInitial = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MemberIdentity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const MNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const MName = styled.strong`
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  transition: color 0.13s ease;
`

const CenterChip = styled.span`
  padding: 1px 7px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const MemberCountryChip = styled.span`
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MYears = styled.div`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RoleBanner = styled.div`
  padding: 7px 11px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.45;
  word-break: keep-all;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-left: 3px solid ${({ theme }) => theme.colors.primary};
`

const MemberNoteText = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.58;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;
`

const OtherGroupsRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px dashed ${({ theme }) => theme.colors.border.light};
`

const OtherGroupsLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

const OtherGroupChip = styled(Link)`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  text-decoration: none;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const MemberOrderControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
`

const OrderBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  border-radius: 6px;
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const MemberEditFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const EditFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const EditFieldLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RoleInput = styled.input`
  width: 100%;
  padding: 7px 10px;
  font-size: 12.5px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const NoteTextarea = styled.textarea`
  width: 100%;
  padding: 7px 10px;
  font-size: 12.5px;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const RemoveBtn = styled.button`
  display: inline-flex;
  padding: 5px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 6px;
  &:hover {
    border-color: ${({ theme }) => theme.colors.error};
    color: ${({ theme }) => theme.colors.error};
  }
`

const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/* edit form bits */
const EditBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`
const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`
const CondRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
`
const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`
const inputCss = ({ theme }: { theme: import('styled-components').DefaultTheme }) => `
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border-radius: 9px;
  border: 1px solid ${theme.colors.border.default};
  background: ${theme.colors.background.primary};
  color: ${theme.colors.text.primary};
  &:focus { outline: none; border-color: ${theme.colors.primary}; }
`
const Input = styled.input`
  ${inputCss}
`
const Select = styled.select`
  ${inputCss}
`
const Textarea = styled.textarea`
  ${inputCss}
  resize: vertical;
`
const PickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`
const PickerValue = styled.div<{ $empty: boolean }>`
  flex: 1;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: ${({ $empty }) => ($empty ? 500 : 700)};
  border-radius: 9px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  color: ${({ $empty, theme }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const SmallBtn = styled.button`
  padding: 9px 13px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`
const PrimaryBtn = styled.button`
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
const GhostBtn = styled.button`
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`
const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  padding: 8px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ $danger, theme }) =>
    $danger ? theme.colors.error : theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: ${({ $danger, theme }) =>
      $danger ? theme.colors.error : theme.colors.primary};
    color: ${({ $danger, theme }) =>
      $danger ? theme.colors.error : theme.colors.primary};
  }
`

const EventSideList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const EventSideRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 13px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
`

const EventMainLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.primary};
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const EventKindTag = styled.span<{ $faction?: boolean }>`
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 6px;
  background: ${({ $faction, theme }) =>
    $faction
      ? isDark(theme.mode)
        ? 'rgba(244,63,94,0.18)'
        : 'rgba(225,29,72,0.12)'
      : theme.colors.background.secondary};
  color: ${({ $faction, theme }) =>
    $faction
      ? isDark(theme.mode)
        ? '#fb7185'
        : '#be123c'
      : theme.colors.text.secondary};
`

const EventYear = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-variant-numeric: tabular-nums;
`

const EventTitleText = styled.span`
  font-size: 14.5px;
  font-weight: 700;
`

const EventVsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const SidePill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}40`};
`

const ParticipantPill = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const OpposingGroupLink = styled(Link)<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}40`};
  &:hover {
    filter: brightness(0.92);
  }
`

const OutcomeTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
  &::before {
    content: '· ';
  }
`

const VsText = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

