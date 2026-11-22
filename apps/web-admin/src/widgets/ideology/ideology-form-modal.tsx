/**
 * 이념 카탈로그 한 행 고치기 — 이름·영문·범주·상위 개념·다른 표기·설명.
 * 이름을 바꾸면 이 이념을 쓰는 모든 정당의 표시가 함께 바뀐다(서버가 캐시를 다시 쓴다).
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  IDEOLOGY_CATEGORY_OPTIONS,
  type IdeologyCategory,
  type IdeologyInput,
  ideologyApi,
  ideologyKeys,
} from '@/shared/api/ideology'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import * as FormS from '@/widgets/country/country-detail/ui/military-unit-form/styles'

export function IdeologyFormModal({ ideologyId, onClose }: { ideologyId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: ideology, isLoading } = useQuery({
    queryKey: ideologyKeys.detail(ideologyId),
    queryFn: () => ideologyApi.getById(ideologyId),
  })
  const { data: catalog = [] } = useQuery({
    queryKey: ideologyKeys.list('', ''),
    queryFn: () => ideologyApi.list(),
    staleTime: 30_000,
  })

  if (isLoading || !ideology) {
    return (
      <RegisterModal isOpen onClose={onClose} trapFocus={false} title="이념 고치기" maxWidth="min(680px, 96vw)">
        <PersonRegisterModalFormScroll>
          <EventFormS.Hint>불러오는 중…</EventFormS.Hint>
        </PersonRegisterModalFormScroll>
      </RegisterModal>
    )
  }
  return (
    <IdeologyFormBody
      key={ideology.id}
      initial={ideology}
      parentChoices={catalog.filter((row) => row.id !== ideology.id)}
      onClose={onClose}
      onSaved={() => {
        void queryClient.invalidateQueries({ queryKey: ideologyKeys.all })
        void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
        onClose()
      }}
    />
  )
}

function IdeologyFormBody({
  initial,
  parentChoices,
  onClose,
  onSaved,
}: {
  initial: Awaited<ReturnType<typeof ideologyApi.getById>>
  parentChoices: Array<{ id: string; name: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [englishName, setEnglishName] = useState(initial.englishName ?? '')
  const [category, setCategory] = useState<IdeologyCategory>(initial.category)
  const [parentId, setParentId] = useState(initial.parentId ?? initial.parent?.id ?? '')
  const [aliasText, setAliasText] = useState((initial.aliases ?? []).map((alias) => alias.name).join(', '))
  const [description, setDescription] = useState(initial.description ?? '')

  const sortedParents = useMemo(
    () => [...parentChoices].sort((left, right) => left.name.localeCompare(right.name, 'ko')),
    [parentChoices],
  )
  const usage = initial._count?.partyLinks ?? 0

  const saveMut = useMutation({
    mutationFn: (body: Partial<IdeologyInput>) => ideologyApi.update(initial.id, body),
    onSuccess: () => {
      notify.success('이념을 고쳤습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const problem = name.trim() ? null : '필수: 이름'
  const submit = () => {
    if (problem || saveMut.isPending) return
    saveMut.mutate({
      name: name.trim(),
      englishName: englishName.trim() || null,
      category,
      parentId: parentId || null,
      description: description.trim() || null,
      aliases: aliasText
        .split(/[,，]/)
        .map((piece) => piece.trim())
        .filter(Boolean)
        .map((alias) => ({ name: alias })),
    })
  }

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title="이념 고치기" maxWidth="min(680px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="ideology-form-title">
          <FormS.FormGroupTitle id="ideology-form-title">
            이념 목록 한 행{usage > 0 ? <FormS.FormGroupSummaryBadge>{usage}곳에서 씀</FormS.FormGroupSummaryBadge> : null}
          </FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="ideology-form-name">
              이름 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormS.TitleInput id="ideology-form-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
              {usage > 0 ? <EventFormS.Hint>바꾸면 이 이념을 쓰는 {usage}곳의 표시가 함께 바뀝니다.</EventFormS.Hint> : null}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="ideology-form-english">
              영문<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="ideology-form-english"
                value={englishName}
                onChange={(event) => setEnglishName(event.target.value)}
                placeholder="예: Italian fascism"
                autoComplete="off"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="ideology-form-category">범주</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative
                id="ideology-form-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as IdeologyCategory)}
              >
                {IDEOLOGY_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.hint ? ` — ${option.hint}` : ''}
                  </option>
                ))}
              </FormSelectNative>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="ideology-form-parent">
              상위 개념<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="ideology-form-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
                <option value="">없음(최상위)</option>
                {sortedParents.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </FormSelectNative>
              <EventFormS.Hint>예: 이탈리아 파시즘의 상위는 파시즘. 분명한 포함 관계만.</EventFormS.Hint>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="ideology-form-aliases">
              다른 표기<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="ideology-form-aliases"
                value={aliasText}
                onChange={(event) => setAliasText(event.target.value)}
                placeholder="쉼표로 — 예: 표퓰리즘, Populismo"
                autoComplete="off"
              />
              <EventFormS.Hint>찾기·이관에서 이 표기로도 이 이념을 찾습니다. 다른 이념의 이름·표기와 겹칠 수 없습니다.</EventFormS.Hint>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="ideology-form-description">
              설명<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="ideology-form-description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <PersonRegisterModalStickyFooter>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <EventFormS.Hint style={{ marginRight: 'auto' }}>{problem ?? '저장 준비 완료'}</EventFormS.Hint>
          <PersonRegisterModalCancelBtn type="button" onClick={onClose} disabled={saveMut.isPending}>
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn type="button" disabled={Boolean(problem) || saveMut.isPending} onClick={submit}>
            {saveMut.isPending ? '저장 중…' : '저장'}
          </PersonRegisterModalPrimaryBtn>
        </div>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}
