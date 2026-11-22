/**
 * 한 기록의 출처를 고치는 모달 — 인용 목록 편집기를 감싼다. 저장하면 대상의 인용을 이 목록과 같게 한다.
 */
import React, { useState } from 'react'

import type { Citation, CitationInput } from '@/shared/api/evidence'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import * as FormS from '@/widgets/country/country-detail/ui/military-unit-form/styles'
import { ModalFooter } from '@/widgets/political-party/party-sidecar-parts'

import { type CitationDraft, CitationListEditor, citationDraftsOf, citationInputsOf } from './citation-list-editor'

export function CitationsModal({
  title,
  subject,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  title: string
  /** 무엇의 출처인가 — '법적 지위 · 유일 합법 정당 1926.11 ~ 1943.7.27' */
  subject: string
  initial: Citation[]
  saving: boolean
  onClose: () => void
  onSubmit: (citations: CitationInput[]) => void
}) {
  const [drafts, setDrafts] = useState<CitationDraft[]>(() => citationDraftsOf(initial))
  const { inputs, problem } = citationInputsOf(drafts)
  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={title} maxWidth="min(760px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="citations-modal-title">
          <FormS.FormGroupTitle id="citations-modal-title">{subject}</FormS.FormGroupTitle>
          <CitationListEditor value={drafts} onChange={setDrafts} />
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saving} onClose={onClose} onSubmit={() => !problem && onSubmit(inputs)} />
    </RegisterModal>
  )
}
