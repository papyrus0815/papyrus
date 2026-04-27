/**
 * EventEditor — 사건 등록/수정 풀 페이지 위젯.
 *
 * Phase 1: 기본정보 섹션만 실제 동작. 나머지 섹션은 placeholder로 표시되어
 * 좌측 nav 와 anchored 본문 흐름이 비주얼적으로 검증 가능하도록 한다.
 */
import { useEffect, useMemo, useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { EditorShell, type SaveStatus } from './ui/editor-shell'
import { BasicInfoSection } from './ui/sections/basic-info.section'
import { SectionCard } from './ui/section-card'
import * as S from './ui/styles'
import {
  resolveVisibleSections,
  type EventEditorSectionId,
} from './model/section-config'
import {
  emptyEventEditorValues,
  type EventEditorFormValues,
} from './model/schema'
import { useEventEditor, type EventEditorMode } from './model/use-event-editor'

import {
  getAllEventCategories,
  type EventCategoryDto,
} from '@/shared/api/event-categories'

interface Props {
  mode: EventEditorMode
  /** edit 모드일 때 초기값 (Phase 2 에서 EventResponseDto → form 매퍼로 채움) */
  initialValues?: Partial<EventEditorFormValues>
  eventId?: string
}

const PLACEHOLDER_SECTIONS: Record<
  Exclude<EventEditorSectionId, 'basic'>,
  { title: string; description: string }
> = {
  content: {
    title: '본문',
    description: '배경·여파와 자유 형식의 본문 섹션을 작성합니다.',
  },
  images: {
    title: '이미지',
    description: '대표 이미지·갤러리.',
  },
  location: {
    title: '위치',
    description: '도시·행정구역·역사적 국가를 연결합니다.',
  },
  relations: {
    title: '관계',
    description: '관련 인물·국가·하위 사건.',
  },
  military: {
    title: '군사 정보',
    description: '교전 세력·전투 상세·피해 규모.',
  },
  conference: {
    title: '회담·외교',
    description: '참여국·조약·합의 사항.',
  },
}

export function EventEditor({ mode, initialValues, eventId: _eventId }: Props) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<EventCategoryDto[]>([])
  const [saveStatus] = useState<SaveStatus>('idle')

  // Phase 1: submit 은 미구현. 작동만 확인.
  const { form, submit } = useEventEditor({
    mode,
    initialValues,
    onSubmit: async (values) => {
      // Phase 2 에서 api-mapper 통해 createEvent/updateEvent 호출 예정.
      console.log('[event-editor] submit (Phase 1 stub)', values)
      toast('Phase 1 — 저장은 다음 단계에서 연결합니다.', { icon: 'ℹ️' })
    },
  })

  useEffect(() => {
    let cancelled = false
    getAllEventCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats)
      })
      .catch((err) => {
        console.warn('[event-editor] failed to load categories', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const watched = form.watch()
  const sections = useMemo(() => {
    const cat = categories.find((c) => c.id === watched.categoryId)
    return resolveVisibleSections(watched, cat?.name)
  }, [watched, categories])

  const handleCancel = () => {
    if (form.formState.isDirty) {
      const ok = window.confirm(
        '입력한 내용이 사라집니다. 정말 닫을까요?',
      )
      if (!ok) return
    }
    navigate('/events')
  }

  return (
    <FormProvider {...form}>
      <EditorShell
        mode={mode}
        values={watched}
        errors={form.formState.errors}
        sections={sections}
        saveStatus={saveStatus}
        isSubmitting={form.formState.isSubmitting}
        onCancel={handleCancel}
        onSubmit={() => {
          submit().catch(() => {
            // zod validation 실패 시 — sidebar 빨간 dot 으로 표시됨
          })
        }}
      >
        {sections.map((s) => {
          if (s.id === 'basic') {
            return (
              <BasicInfoSection key={s.id} categories={categories} />
            )
          }
          const ph = PLACEHOLDER_SECTIONS[s.id]
          return (
            <SectionCard
              key={s.id}
              id={s.id}
              title={ph.title}
              description={ph.description}
            >
              <S.HelpText>
                이 섹션은 다음 단계에서 작성됩니다 (Phase 2).
              </S.HelpText>
            </SectionCard>
          )
        })}
      </EditorShell>
    </FormProvider>
  )
}

export const _emptyForReference: EventEditorFormValues = emptyEventEditorValues
