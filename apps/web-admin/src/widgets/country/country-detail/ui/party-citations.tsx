/**
 * 정당 기록의 출처 — 각 행의 '출처 N' 단추와 그 모달(B5, docs/political-party-model-review.md §4.11).
 *
 * 정당 하나의 인용을 한 번에 받아(GET /political-parties/:id/citations) 행마다 개수를 보여 준다 — 행마다 요청하지 않는다.
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiBookOpen } from 'react-icons/fi'
import styled from 'styled-components'

import type { Citation } from '@/shared/api/evidence'
import { type PartyCitationTargetType, politicalPartyApi } from '@/shared/api/political-party'
import { notify } from '@/shared/ui/toast'
import { CitationsModal } from '@/widgets/evidence/citations-modal'

export const partyCitationsKey = (partyId: string) => ['political-parties', partyId, 'citations'] as const

export function usePartyCitations(partyId: string) {
  const { data = [] } = useQuery({
    queryKey: partyCitationsKey(partyId),
    queryFn: () => politicalPartyApi.getCitations(partyId),
    staleTime: 15_000,
  })
  return useMemo(() => {
    const map = new Map<string, Citation[]>()
    for (const group of data) map.set(`${group.targetType}:${group.targetId}`, group.citations)
    return map
  }, [data])
}

export function PartyCitationButton({
  partyId,
  targetType,
  targetId,
  subject,
}: {
  partyId: string
  targetType: PartyCitationTargetType
  targetId: string
  /** 모달 머리 — 무엇의 출처인가 */
  subject: string
}) {
  const queryClient = useQueryClient()
  const citations = usePartyCitations(partyId).get(`${targetType}:${targetId}`) ?? []
  const [open, setOpen] = useState(false)
  const saveMut = useMutation({
    mutationFn: (inputs: Parameters<typeof politicalPartyApi.setCitations>[1]['citations']) =>
      politicalPartyApi.setCitations(partyId, { targetType, targetId, citations: inputs }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partyCitationsKey(partyId) })
      setOpen(false)
      notify.success('출처를 저장했습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })
  const count = citations.length
  return (
    <>
      <CitationBtn
        type="button"
        $empty={count === 0}
        aria-label={count > 0 ? `출처 ${count}개 — ${subject}` : `출처 달기 — ${subject}`}
        title={count > 0 ? citations.map((citation) => citation.source.title).join(' · ') : '출처 미검증 — 눌러서 출처 달기'}
        onClick={() => setOpen(true)}
      >
        <FiBookOpen size={12} aria-hidden />
        {count > 0 ? count : null}
      </CitationBtn>
      {open ? (
        <CitationsModal
          title="출처"
          subject={subject}
          initial={citations}
          saving={saveMut.isPending}
          onClose={() => setOpen(false)}
          onSubmit={(inputs) => saveMut.mutate(inputs)}
        />
      ) : null}
    </>
  )
}

const CitationBtn = styled.button<{ $empty: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $empty }) => ($empty ? theme.colors.text.tertiary : theme.colors.primary)};
  opacity: ${({ $empty }) => ($empty ? 0.55 : 1)};
  cursor: pointer;

  &:hover {
    opacity: 1;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    opacity: 1;
  }
`
