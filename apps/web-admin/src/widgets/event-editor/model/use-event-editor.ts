/**
 * useEventEditor — 사건 에디터 폼 상태 훅.
 *
 * react-hook-form + zod 기반. mode='create' | 'edit' 분기는 caller가 처리하고
 * 본 훅은 "초기값을 받아 폼·검증·제출 핸들러를 돌려주는" 단순 컨테이너만 제공.
 *
 * Phase 2+ 에서 draft localStorage 자동저장과 edit 모드 초기 로딩을 추가한다.
 */
import { useCallback } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  emptyEventEditorValues,
  eventEditorSchema,
  type EventEditorFormValues,
} from './schema'

export type EventEditorMode = 'create' | 'edit'

export interface UseEventEditorOptions {
  mode: EventEditorMode
  initialValues?: Partial<EventEditorFormValues>
  onSubmit: (values: EventEditorFormValues) => Promise<void> | void
}

export function useEventEditor({
  mode,
  initialValues,
  onSubmit,
}: UseEventEditorOptions) {
  const form = useForm<EventEditorFormValues>({
    resolver: zodResolver(eventEditorSchema) as never,
    defaultValues: { ...emptyEventEditorValues, ...initialValues },
    mode: 'onBlur',
  })

  const handleSubmit: SubmitHandler<EventEditorFormValues> = useCallback(
    async (values) => {
      await onSubmit(values)
    },
    [onSubmit],
  )

  return {
    mode,
    form,
    submit: form.handleSubmit(handleSubmit),
  }
}

export type UseEventEditorReturn = ReturnType<typeof useEventEditor>
