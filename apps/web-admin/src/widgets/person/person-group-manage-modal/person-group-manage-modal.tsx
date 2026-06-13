/**
 * 인물 소속 그룹(세대·기수·계파·학파·사단 등) 관리 모달.
 * 깔끔하고 큼지막한 레이아웃 — 유형은 칩 그리드로 선택.
 * - 새 묶음 만들기 (이 인물을 첫 멤버로) + 중심 인물(구심점) 지정
 * - 기존 묶음에 이 인물 추가 (검색)
 * - 소속 묶음별: 메타 편집, 멤버/역할 관리, 전임(세대 계승)·중심 인물 지정, 삭제
 * - 편집 권한(canEdit) 없는 공유 묶음은 읽기 전용
 */
import { useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiTrash2, FiUserPlus, FiX } from 'react-icons/fi'
import styled, { type DefaultTheme } from 'styled-components'

import { getAllPersons } from '@/shared/api/persons'
import {
  PERSON_GROUP_TYPE_META,
  addPersonGroupMember,
  createPersonGroup,
  deletePersonGroup,
  getPersonGroupsByPerson,
  listPersonGroups,
  removePersonGroupMember,
  updatePersonGroup,
  updatePersonGroupMember,
  type PersonGroupType,
} from '@/shared/api/person-groups'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { confirm } from '@/shared/ui/confirm-dialog'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { notify } from '@/shared/ui/toast'
import {
  GroupTypeBadge,
  GroupTypeChips,
} from '@/widgets/person/person-group-ui/group-type-ui'
import { Z_INDEX } from '@/shared/styles/z-index'

const isDark = (mode: 'light' | 'dark') => mode === 'dark'

interface Props {
  personId: string
  personName?: string
  onClose: () => void
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

type PersonPicker =
  | { mode: 'member'; groupId: string }
  | { mode: 'center-new' }
  | { mode: 'center-edit' }
  | null

export function PersonGroupManageModal({ personId, personName, onClose }: Props) {
  const queryClient = useQueryClient()

  // 새 묶음 폼
  const [name, setName] = useState('')
  const [type, setType] = useState<PersonGroupType>('GENERATION')
  const [generationOrder, setGenerationOrder] = useState('')
  const [description, setDescription] = useState('')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')

  // 기존 묶음에 추가
  const [joinSearch, setJoinSearch] = useState('')
  const [existingGroupId, setExistingGroupId] = useState('')

  // 인물 선택 모달 (멤버 추가 / 중심 인물)
  const [picker, setPicker] = useState<PersonPicker>(null)

  // 그룹 메타 편집
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)

  const myGroupsQuery = useQuery({
    queryKey: ['person-groups-by-person', personId],
    queryFn: () => getPersonGroupsByPerson(personId),
    enabled: Boolean(personId),
  })
  const allGroupsQuery = useQuery({
    queryKey: ['person-groups-all'],
    queryFn: () => listPersonGroups(),
  })
  const allPersonsQuery = useQuery({
    queryKey: ['all-persons'],
    queryFn: () => getAllPersons(),
  })

  const myGroups = myGroupsQuery.data ?? []
  const myGroupIds = useMemo(() => new Set(myGroups.map((g) => g.id)), [myGroups])
  const joinableGroups = useMemo(() => {
    const q = joinSearch.trim().toLowerCase()
    return (allGroupsQuery.data ?? [])
      .filter((g) => !myGroupIds.has(g.id))
      .filter((g) => !q || g.name.toLowerCase().includes(q))
  }, [allGroupsQuery.data, myGroupIds, joinSearch])

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['person-groups-by-person', personId],
    })
    void queryClient.invalidateQueries({ queryKey: ['person-groups-all'] })
    void myGroupsQuery.refetch()
    void allGroupsQuery.refetch()
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createPersonGroup({
        name: name.trim(),
        type,
        description: description.trim() || null,
        generationOrder:
          type === 'GENERATION' && generationOrder.trim()
            ? Number(generationOrder)
            : null,
        centerPersonId: centerId || null,
        memberPersonIds: [personId],
      }),
    onSuccess: () => {
      notify.success('묶음을 만들었습니다.')
      setName('')
      setGenerationOrder('')
      setDescription('')
      setCenterId('')
      setCenterName('')
      invalidate()
    },
    onError: () => notify.error('묶음 생성에 실패했습니다.'),
  })

  const joinMutation = useMutation({
    mutationFn: (groupId: string) => addPersonGroupMember(groupId, { personId }),
    onSuccess: () => {
      notify.success('묶음에 추가했습니다.')
      setExistingGroupId('')
      setJoinSearch('')
      invalidate()
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '추가에 실패했습니다.'),
  })

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, form }: { groupId: string; form: EditForm }) =>
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
      notify.success('묶음을 수정했습니다.')
      setEditingGroupId(null)
      setEditForm(null)
      invalidate()
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '수정에 실패했습니다.'),
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      addPersonGroupMember(groupId, { personId: memberId }),
    onSuccess: () => {
      notify.success('멤버를 추가했습니다.')
      invalidate()
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '멤버 추가에 실패했습니다.'),
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({
      groupId,
      membershipId,
      roleLabel,
    }: {
      groupId: string
      membershipId: string
      roleLabel: string | null
    }) => updatePersonGroupMember(groupId, membershipId, { roleLabel }),
    onSuccess: () => invalidate(),
    onError: () => notify.error('역할 저장에 실패했습니다.'),
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({
      groupId,
      membershipId,
    }: {
      groupId: string
      membershipId: string
    }) => removePersonGroupMember(groupId, membershipId),
    onSuccess: () => invalidate(),
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '멤버 제거에 실패했습니다.'),
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => deletePersonGroup(groupId),
    onSuccess: () => {
      notify.success('묶음을 삭제했습니다.')
      invalidate()
    },
    onError: (e: unknown) =>
      notify.error(e instanceof Error ? e.message : '묶음 삭제에 실패했습니다.'),
  })

  const startEdit = (groupId: string) => {
    const g = myGroups.find((x) => x.id === groupId)
    if (!g) return
    setEditingGroupId(groupId)
    setEditForm({
      name: g.name,
      type: g.type,
      generationOrder:
        g.generationOrder != null ? String(g.generationOrder) : '',
      description: g.description ?? '',
      predecessorGroupId: g.predecessor?.id ?? '',
      centerPersonId: g.center?.id ?? '',
      centerName: g.center ? getPersonDisplayName(g.center, true) : '',
    })
  }

  // 인물 선택 결과 라우팅
  const handlePersonSelect = (id: string, pname: string) => {
    if (!picker) return
    if (picker.mode === 'member') {
      addMemberMutation.mutate({ groupId: picker.groupId, memberId: id })
    } else if (picker.mode === 'center-new') {
      setCenterId(id)
      setCenterName(pname)
    } else if (picker.mode === 'center-edit' && editForm) {
      setEditForm({ ...editForm, centerPersonId: id, centerName: pname })
    }
    setPicker(null)
  }

  const memberTargetGroup =
    picker?.mode === 'member'
      ? myGroups.find((g) => g.id === picker.groupId)
      : undefined
  const pickerExcludeIds = memberTargetGroup
    ? memberTargetGroup.members.map((m) => m.person.id)
    : []
  const pickerTitle =
    picker?.mode === 'member' ? '멤버로 추가할 인물 선택' : '중심 인물 선택'

  return createPortal(
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <div>
            <Title>소속 그룹 관리</Title>
            {personName && <Subtitle>{personName}</Subtitle>}
          </div>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={22} />
          </CloseBtn>
        </Header>

        <Body>
          {/* ── 새 묶음 만들기 ── */}
          <Card>
            <CardTitle>새 묶음 만들기</CardTitle>

            <FieldLabel>유형 선택</FieldLabel>
            <GroupTypeChips value={type} onChange={setType} />
            <ExampleNote>{PERSON_GROUP_TYPE_META[type].example}</ExampleNote>

            <Field>
              <FieldLabel>이름</FieldLabel>
              <BigInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 중국공산당 혁명 1세대"
              />
            </Field>

            <CondRow>
              {type === 'GENERATION' && (
                <Field style={{ width: 150 }}>
                  <FieldLabel>세대 순번</FieldLabel>
                  <BigInput
                    type="number"
                    value={generationOrder}
                    onChange={(e) => setGenerationOrder(e.target.value)}
                    placeholder="1"
                  />
                </Field>
              )}
              <Field style={{ flex: 1, minWidth: 200 }}>
                <FieldLabel>
                  중심 인물 <Muted>(구심점, 선택)</Muted>
                </FieldLabel>
                <PickerRow>
                  <PickerValue $empty={!centerId}>
                    {centerId ? `★ ${centerName}` : '미지정'}
                  </PickerValue>
                  <SmallBtn
                    type="button"
                    onClick={() => setPicker({ mode: 'center-new' })}
                  >
                    선택
                  </SmallBtn>
                  {centerId && (
                    <SmallBtn
                      type="button"
                      onClick={() => {
                        setCenterId('')
                        setCenterName('')
                      }}
                    >
                      해제
                    </SmallBtn>
                  )}
                </PickerRow>
              </Field>
            </CondRow>

            <Field>
              <FieldLabel>
                설명 <Muted>(선택)</Muted>
              </FieldLabel>
              <BigTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="맥락·시기·계기 등 자유 서술"
                rows={2}
              />
            </Field>

            <PrimaryBtn
              type="button"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <FiPlus size={18} />
              만들고 이 인물 추가
            </PrimaryBtn>
          </Card>

          {/* ── 기존 묶음에 추가 ── */}
          <Card>
            <CardTitle>기존 묶음에 추가</CardTitle>
            <BigInput
              value={joinSearch}
              onChange={(e) => setJoinSearch(e.target.value)}
              placeholder="묶음 이름 검색…"
            />
            {joinableGroups.length === 0 ? (
              <EmptyNote>
                {joinSearch.trim()
                  ? '검색 결과가 없습니다.'
                  : '추가할 수 있는 다른 묶음이 없습니다.'}
              </EmptyNote>
            ) : (
              <CondRow>
                <BigSelect
                  style={{ flex: 1 }}
                  value={existingGroupId}
                  onChange={(e) => setExistingGroupId(e.target.value)}
                >
                  <option value="">묶음 선택…</option>
                  {joinableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      [{PERSON_GROUP_TYPE_META[g.type].label}] {g.name} (
                      {g.memberCount}명)
                    </option>
                  ))}
                </BigSelect>
                <PrimaryBtn
                  type="button"
                  disabled={!existingGroupId || joinMutation.isPending}
                  onClick={() => joinMutation.mutate(existingGroupId)}
                >
                  추가
                </PrimaryBtn>
              </CondRow>
            )}
          </Card>

          {/* ── 현재 소속 묶음 ── */}
          <Card>
            <CardTitle>현재 소속 묶음</CardTitle>
            {myGroupsQuery.isLoading ? (
              <EmptyNote>불러오는 중…</EmptyNote>
            ) : myGroups.length === 0 ? (
              <EmptyNote>아직 소속된 묶음이 없습니다.</EmptyNote>
            ) : (
              <GroupList>
                {myGroups.map((g) => {
                  const editing = editingGroupId === g.id && editForm
                  return (
                    <GroupItem key={g.id}>
                      {editing ? (
                        <EditBox>
                          <FieldLabel>유형</FieldLabel>
                          <GroupTypeChips
                            value={editForm.type}
                            onChange={(t) => setEditForm({ ...editForm, type: t })}
                          />
                          <Field>
                            <FieldLabel>이름</FieldLabel>
                            <BigInput
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                          </Field>
                          <CondRow>
                            {editForm.type === 'GENERATION' && (
                              <Field style={{ width: 150 }}>
                                <FieldLabel>세대 순번</FieldLabel>
                                <BigInput
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
                              <FieldLabel>
                                중심 인물 <Muted>(선택)</Muted>
                              </FieldLabel>
                              <PickerRow>
                                <PickerValue $empty={!editForm.centerPersonId}>
                                  {editForm.centerPersonId
                                    ? `★ ${editForm.centerName}`
                                    : '미지정'}
                                </PickerValue>
                                <SmallBtn
                                  type="button"
                                  onClick={() =>
                                    setPicker({ mode: 'center-edit' })
                                  }
                                >
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
                              <FieldLabel>전임 묶음 (이전 세대)</FieldLabel>
                              <BigSelect
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
                                    (cand) =>
                                      cand.id !== g.id &&
                                      cand.type === 'GENERATION',
                                  )
                                  .map((cand) => (
                                    <option key={cand.id} value={cand.id}>
                                      {cand.generationOrder != null
                                        ? `${cand.generationOrder}세대 · `
                                        : ''}
                                      {cand.name}
                                    </option>
                                  ))}
                              </BigSelect>
                            </Field>
                          )}
                          <Field>
                            <FieldLabel>설명</FieldLabel>
                            <BigTextarea
                              value={editForm.description}
                              rows={2}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  description: e.target.value,
                                })
                              }
                            />
                          </Field>
                          <CondRow>
                            <PrimaryBtn
                              type="button"
                              disabled={
                                !editForm.name.trim() ||
                                updateGroupMutation.isPending
                              }
                              onClick={() =>
                                updateGroupMutation.mutate({
                                  groupId: g.id,
                                  form: editForm,
                                })
                              }
                            >
                              저장
                            </PrimaryBtn>
                            <GhostBtn
                              type="button"
                              onClick={() => {
                                setEditingGroupId(null)
                                setEditForm(null)
                              }}
                            >
                              취소
                            </GhostBtn>
                          </CondRow>
                        </EditBox>
                      ) : (
                        <>
                          <GroupItemHead>
                            <GroupTypeBadge type={g.type} />
                            <GroupItemName>{g.name}</GroupItemName>
                            {g.type === 'GENERATION' &&
                              g.generationOrder != null && (
                                <OrdinalTag>{g.generationOrder}세대</OrdinalTag>
                              )}
                            {g.center && (
                              <CenterTag>
                                ★ {getPersonDisplayName(g.center, true)}
                              </CenterTag>
                            )}
                            <Spacer />
                            {g.canEdit ? (
                              <>
                                <IconBtn
                                  type="button"
                                  title="묶음 편집"
                                  onClick={() => startEdit(g.id)}
                                >
                                  <FiEdit2 size={15} />
                                </IconBtn>
                                <IconBtn
                                  type="button"
                                  title="멤버 추가"
                                  onClick={() =>
                                    setPicker({ mode: 'member', groupId: g.id })
                                  }
                                >
                                  <FiUserPlus size={15} />
                                </IconBtn>
                                <IconBtn
                                  type="button"
                                  $danger
                                  title="묶음 삭제"
                                  onClick={async () => {
                                    if (
                                      await confirm({
                                        title: '삭제 확인',
                                        message: `“${g.name}” 묶음을 삭제할까요? 모든 멤버십이 함께 제거됩니다.`,
                                        danger: true,
                                      })
                                    ) {
                                      deleteGroupMutation.mutate(g.id)
                                    }
                                  }}
                                >
                                  <FiTrash2 size={15} />
                                </IconBtn>
                              </>
                            ) : (
                              <ReadOnlyTag title="다른 사용자가 만든 공유 묶음">
                                읽기 전용
                              </ReadOnlyTag>
                            )}
                          </GroupItemHead>

                          <MemberRows>
                            {g.members.map((m) => {
                              const isSelf = m.person.id === personId
                              return (
                                <MemberRow key={m.membershipId} $self={isSelf}>
                                  <MemberName>
                                    {getPersonDisplayName(m.person, true)}
                                    {isSelf && <SelfDot>본인</SelfDot>}
                                  </MemberName>
                                  {g.canEdit ? (
                                    <>
                                      <RoleInput
                                        defaultValue={m.roleLabel ?? ''}
                                        placeholder="역할 (예: 핵심)"
                                        onBlur={(e) => {
                                          const next = e.target.value.trim()
                                          const cur = (m.roleLabel ?? '').trim()
                                          if (next !== cur) {
                                            updateMemberMutation.mutate({
                                              groupId: g.id,
                                              membershipId: m.membershipId,
                                              roleLabel: next || null,
                                            })
                                          }
                                        }}
                                      />
                                      <RowIconBtn
                                        type="button"
                                        title={
                                          isSelf
                                            ? '이 묶음에서 나가기'
                                            : '멤버 제거'
                                        }
                                        onClick={() =>
                                          removeMemberMutation.mutate({
                                            groupId: g.id,
                                            membershipId: m.membershipId,
                                          })
                                        }
                                      >
                                        <FiX size={15} />
                                      </RowIconBtn>
                                    </>
                                  ) : (
                                    m.roleLabel?.trim() && (
                                      <RoleStatic>{m.roleLabel}</RoleStatic>
                                    )
                                  )}
                                </MemberRow>
                              )
                            })}
                          </MemberRows>
                        </>
                      )}
                    </GroupItem>
                  )
                })}
              </GroupList>
            )}
          </Card>
        </Body>
      </Modal>

      {picker && (
        <PersonSelectModal
          persons={allPersonsQuery.data ?? []}
          selectedPersonId=""
          title={pickerTitle}
          excludeIds={pickerExcludeIds}
          excludeReason="이미 이 묶음에 속한 인물입니다."
          onSelect={handlePersonSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </Overlay>,
    document.body,
  )
}

/* ─── styles ───────────────────────────────────────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Modal = styled.div`
  z-index: ${Z_INDEX.MODAL_CONTENT};
  width: 720px;
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 26px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Subtitle = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CloseBtn = styled.button`
  display: inline-flex;
  padding: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 10px;
  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  padding: 22px 26px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const CondRow = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-end;
  flex-wrap: wrap;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ExampleNote = styled.p`
  margin: -4px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  min-height: 16px;
`

const inputStyles = ({ theme }: { theme: DefaultTheme }) => `
  width: 100%;
  padding: 11px 13px;
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid ${theme.colors.border.default};
  background: ${theme.colors.background.primary};
  color: ${theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 3px ${theme.colors.primary}22;
  }
`

const BigInput = styled.input`
  ${inputStyles}
`
const BigSelect = styled.select`
  ${inputStyles}
`
const BigTextarea = styled.textarea`
  ${inputStyles}
  resize: vertical;
  line-height: 1.5;
`

const PickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PickerValue = styled.div<{ $empty: boolean }>`
  flex: 1;
  padding: 11px 13px;
  font-size: 13.5px;
  font-weight: ${({ $empty }) => ($empty ? 500 : 700)};
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  color: ${({ $empty, theme }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const SmallBtn = styled.button`
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 9px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  align-self: flex-start;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const GhostBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const EmptyNote = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const GroupItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
`

const EditBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const GroupItemHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const GroupItemName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const OrdinalTag = styled.span`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.18)' : 'rgba(245,158,11,0.14)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const CenterTag = styled.span`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) =>
    isDark(theme.mode) ? 'rgba(255,214,10,0.16)' : 'rgba(245,158,11,0.12)'};
  color: ${({ theme }) => (isDark(theme.mode) ? '#ffd60a' : '#b45309')};
`

const ReadOnlyTag = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Spacer = styled.div`
  flex: 1;
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  padding: 7px;
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

const MemberRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const MemberRow = styled.div<{ $self?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ $self, theme }) =>
    $self
      ? isDark(theme.mode)
        ? 'rgba(99,106,242,0.12)'
        : 'rgba(99,102,241,0.05)'
      : theme.colors.background.secondary};
`

const MemberName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const SelfDot = styled.span`
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
`

const RoleInput = styled.input`
  width: 150px;
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

const RoleStatic = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RowIconBtn = styled.button`
  display: inline-flex;
  padding: 6px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: 8px;
  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`
