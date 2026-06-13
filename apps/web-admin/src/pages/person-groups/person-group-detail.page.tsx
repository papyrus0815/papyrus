/**
 * 인물 묶음 상세 페이지 (/person-groups/:groupId).
 * 모달이 아닌 고유 URL 페이지 — 딥링크·공유 가능. 계승(이전/다음 세대)은 페이지 링크로 승격.
 * canEdit이면 메타 편집·멤버 추가/역할/제거·삭제 가능.
 */
import { useMemo, useState } from 'react'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiArrowRight,
  FiChevronLeft,
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { Person } from '@/shared/api/person'
import {
  addPersonGroupMember,
  deletePersonGroup,
  getPersonGroup,
  listPersonGroups,
  removePersonGroupMember,
  updatePersonGroup,
  updatePersonGroupMember,
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
} from '@/widgets/person/person-group-ui/group-type-ui'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

function signedYear(era: 'BC' | 'AD' | null | undefined, year: number) {
  return era === 'BC' ? -year : year
}
function yearLabel(era: 'BC' | 'AD' | null | undefined, y?: number | null) {
  if (y == null || !Number.isFinite(y)) return ''
  return era === 'BC' ? `BC ${y}` : `${y}`
}
function lifespan(p: Person) {
  const b = yearLabel(p.birthEra ?? null, p.birthYear ?? null)
  const d = p.isAlive ? '—' : yearLabel(p.deathEra ?? null, p.deathYear ?? null)
  if (!b && !d) return '연도 미상'
  if (!b) return `? — ${d || '?'}`
  if (p.isAlive) return `${b} —`
  return `${b} — ${d || '?'}`
}

interface EditForm {
  name: string
  type: PersonGroupType
  generationOrder: string
  description: string
  predecessorGroupId: string
  centerPersonId: string
  centerName: string
}

export default function PersonGroupDetailPage() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [picker, setPicker] = useState<'member' | 'center' | null>(null)

  const { data: group, isLoading } = useQuery({
    queryKey: ['person-group', groupId],
    queryFn: () => getPersonGroup(groupId),
    enabled: Boolean(groupId),
  })
  const allGroupsQuery = useQuery({
    queryKey: ['person-groups-all', undefined],
    queryFn: () => listPersonGroups(),
    enabled: editing,
  })
  const allPersonsQuery = useQuery({
    queryKey: ['all-persons'],
    queryFn: () => getAllPersons(),
    enabled: Boolean(picker),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['person-group', groupId] })

  const members = useMemo(() => {
    if (!group) return []
    if (group.type === 'GENERATION') {
      return [...group.members].sort((a, b) => {
        const ya =
          a.person.birthYear != null
            ? signedYear(a.person.birthEra ?? null, a.person.birthYear)
            : Number.POSITIVE_INFINITY
        const yb =
          b.person.birthYear != null
            ? signedYear(b.person.birthEra ?? null, b.person.birthYear)
            : Number.POSITIVE_INFINITY
        return ya - yb
      })
    }
    return group.members
  }, [group])

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
        predecessorGroupId:
          form.type === 'GENERATION' ? form.predecessorGroupId || null : null,
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
    }: {
      membershipId: string
      roleLabel: string | null
    }) => updatePersonGroupMember(groupId, membershipId, { roleLabel }),
    onSuccess: invalidate,
    onError: () => notify.error('역할 저장 실패'),
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

  const successor = group.successors?.[0] ?? null

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
          {group.countryName && <MetaPill>{group.countryName}</MetaPill>}
          <MetaPill>{group.memberCount}명</MetaPill>
          <Spacer />
          {group.canEdit && !editing && (
            <>
              <IconBtn type="button" title="편집" onClick={startEdit}>
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
            {editForm.type === 'GENERATION' && (
              <Field>
                <Label>전임 묶음 (이전 세대)</Label>
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
                    .filter(
                      (c) => c.id !== group.id && c.type === 'GENERATION',
                    )
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
            )}
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
                <Link to={pathKeys.persons.detail(group.center.id)}>
                  {getPersonDisplayName(group.center, true)}
                </Link>
              </CenterBanner>
            )}
            {group.description?.trim() && (
              <Description>{group.description}</Description>
            )}
            {(group.predecessor || successor) && (
              <SuccessionBar>
                {group.predecessor ? (
                  <NavLink to={pathKeys.personGroupDetail(group.predecessor.id)}>
                    <FiArrowLeft size={14} />
                    {group.predecessor.generationOrder != null
                      ? `${group.predecessor.generationOrder}세대 · `
                      : ''}
                    {group.predecessor.name}
                  </NavLink>
                ) : (
                  <span />
                )}
                {successor ? (
                  <NavLink $right to={pathKeys.personGroupDetail(successor.id)}>
                    {successor.generationOrder != null
                      ? `${successor.generationOrder}세대 · `
                      : ''}
                    {successor.name}
                    <FiArrowRight size={14} />
                  </NavLink>
                ) : (
                  <span />
                )}
              </SuccessionBar>
            )}
          </>
        )}
      </HeaderCard>

      {/* ── 멤버 ── */}
      <SectionHead>
        <SectionTitle>멤버 {group.memberCount}명</SectionTitle>
        {group.canEdit && (
          <AddBtn type="button" onClick={() => setPicker('member')}>
            <FiUserPlus size={15} /> 멤버 추가
          </AddBtn>
        )}
      </SectionHead>

      {members.length === 0 ? (
        <Muted>아직 멤버가 없습니다.</Muted>
      ) : (
        <MemberGrid>
          {members.map((m) => {
            const p = m.person
            const displayName = getPersonDisplayName(p, true)
            const src = p.profileImageUrl?.trim()
              ? getUploadImageUrl(p.profileImageUrl) || p.profileImageUrl
              : ''
            const initial = [...displayName][0] ?? '?'
            return (
              <MemberCard key={m.membershipId}>
                <MemberLink to={pathKeys.persons.detail(p.id)}>
                  <Avatar $has={Boolean(src)}>
                    {src ? (
                      <img src={src} alt="" loading="lazy" />
                    ) : (
                      <AvatarInitial>{initial}</AvatarInitial>
                    )}
                  </Avatar>
                  <MName>{displayName}</MName>
                  <MYears>{lifespan(p)}</MYears>
                </MemberLink>
                {group.canEdit ? (
                  <MemberEditRow>
                    <RoleInput
                      defaultValue={m.roleLabel ?? ''}
                      placeholder="역할"
                      onBlur={(e) => {
                        const next = e.target.value.trim()
                        const cur = (m.roleLabel ?? '').trim()
                        if (next !== cur)
                          updateMemberMutation.mutate({
                            membershipId: m.membershipId,
                            roleLabel: next || null,
                          })
                      }}
                    />
                    <RemoveBtn
                      type="button"
                      title="제거"
                      onClick={() => removeMemberMutation.mutate(m.membershipId)}
                    >
                      <FiX size={14} />
                    </RemoveBtn>
                  </MemberEditRow>
                ) : (
                  m.roleLabel?.trim() && <RoleStatic>{m.roleLabel}</RoleStatic>
                )}
              </MemberCard>
            )
          })}
        </MemberGrid>
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
  max-width: 960px;
  margin: 0 auto;
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

const SuccessionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const NavLink = styled(Link)<{ $right?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 46%;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 700;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  ${({ $right }) => $right && 'margin-left: auto;'}
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
`

const MemberCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px 12px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
`

const MemberLink = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: inherit;
  &:hover > div:last-child,
  &:hover > div {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Avatar = styled.div<{ $has: boolean }>`
  width: 56px;
  height: 56px;
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
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: center;
  word-break: keep-all;
`

const MYears = styled.div`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MemberEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin-top: 2px;
`

const RoleInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  font-size: 11.5px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const RoleStatic = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RemoveBtn = styled.button`
  display: inline-flex;
  padding: 5px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 6px;
  &:hover {
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
