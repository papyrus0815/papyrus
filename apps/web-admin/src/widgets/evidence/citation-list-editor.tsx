/**
 * 인용 목록 편집기 — 기존 출처(서고 검색)를 고르거나 새 출처를 적고, 인용마다 위치(쪽·절)와 근거 구절을 단다.
 *
 * 근거 도메인(evidence)의 CitationInput 그대로 만든다 — 서버가 (출처, 위치) 자연키로 머지하므로 다듬은 구절이 보존된다.
 * 정당 기록의 '출처'와 정당 측정값(당원 수)이 같이 쓴다. 사건 측정값 모달은 사건 지면 고유라 따로 있다.
 */
import React, { useId, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiBookOpen, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { SOURCE_KIND_CHOICES, SOURCE_KIND_LABEL, SOURCE_TIER_LABEL } from '@/entities/evidence/lib/evidence-labels'
import * as EventFormS from '@/pages/events/create/event-create.styles'
import {
  type Citation,
  type CitationInput,
  type CreateSourceInput,
  type Source,
  type SourceKind,
  type SourceTier,
  searchSources,
} from '@/shared/api/evidence'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { FormSelectNative } from '@/shared/ui/form-select-native'

/** 편집 중 한 줄 — 기존 출처 또는 새 출처 */
export type CitationDraft = {
  key: string
  locator: string
  quote: string
} & (
  | { mode: 'existing'; source: Source }
  | {
      mode: 'new'
      newSource: { kind: SourceKind; title: string; authors: string; publishedYear: string; url: string; tier: SourceTier | '' }
    }
)

let draftSeq = 0
const nextKey = () => {
  draftSeq += 1
  return `draft-${draftSeq}`
}

export function citationDraftsOf(citations: Citation[] | undefined): CitationDraft[] {
  return (citations ?? []).map((citation) => ({
    key: citation.id,
    mode: 'existing' as const,
    source: citation.source,
    locator: citation.locator ?? '',
    quote: citation.quote ?? '',
  }))
}

/** 저장용 — 새 출처의 제목이 비면 문제로 돌려준다 */
export function citationInputsOf(drafts: CitationDraft[]): { inputs: CitationInput[]; problem: string | null } {
  const inputs: CitationInput[] = []
  for (const draft of drafts) {
    const locator = draft.locator.trim() || null
    const quote = draft.quote.trim() || null
    if (draft.mode === 'existing') {
      inputs.push({ sourceId: draft.source.id, locator, quote })
      continue
    }
    const title = draft.newSource.title.trim()
    if (!title) return { inputs: [], problem: '새 출처의 제목을 입력하세요.' }
    const year = draft.newSource.publishedYear.trim()
    if (year && !/^-?\d{1,4}$/.test(year)) return { inputs: [], problem: '발행 연도는 숫자(기원전은 음수)입니다.' }
    const url = draft.newSource.url.trim()
    if (url && !/^https?:\/\//i.test(url)) return { inputs: [], problem: '출처 주소는 http(s)로 시작해야 합니다.' }
    const source: CreateSourceInput = {
      kind: draft.newSource.kind,
      title,
      authors: draft.newSource.authors.trim() || null,
      publishedYear: year ? Number(year) : null,
      url: url || null,
      tier: draft.newSource.tier || null,
    }
    inputs.push({ source, locator, quote })
  }
  return { inputs, problem: null }
}

export function CitationListEditor({
  value,
  onChange,
}: {
  value: CitationDraft[]
  onChange: (next: CitationDraft[]) => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const searchId = useId()
  const { data: found = [], isFetching } = useQuery({
    queryKey: ['sources', 'search', debounced.trim()],
    queryFn: () => searchSources(debounced.trim()),
    enabled: searchOpen,
    staleTime: 30_000,
  })

  const patch = (key: string, change: Partial<CitationDraft>) =>
    onChange(value.map((draft) => (draft.key === key ? ({ ...draft, ...change } as CitationDraft) : draft)))
  const patchNewSource = (key: string, change: Partial<Extract<CitationDraft, { mode: 'new' }>['newSource']>) =>
    onChange(
      value.map((draft) =>
        draft.key === key && draft.mode === 'new' ? { ...draft, newSource: { ...draft.newSource, ...change } } : draft,
      ),
    )

  return (
    <EditorRoot>
      {value.length === 0 ? <EmptyLine>아직 출처가 없습니다 — 출처 없는 기록은 '출처 미검증'으로 보입니다.</EmptyLine> : null}
      {value.map((draft, index) => (
        <CitationCard key={draft.key}>
          <CardHead>
            <span className="index">{index + 1}</span>
            {draft.mode === 'existing' ? (
              <span className="title">
                <FiBookOpen size={13} aria-hidden />
                {draft.source.title}
                <span className="meta">
                  {[
                    SOURCE_KIND_LABEL[draft.source.kind],
                    draft.source.tier ? SOURCE_TIER_LABEL[draft.source.tier] : null,
                    draft.source.authors,
                    draft.source.publishedYear,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            ) : (
              <span className="title">새 출처</span>
            )}
            <RemoveBtn type="button" aria-label={`${index + 1}번 출처 빼기`} onClick={() => onChange(value.filter((item) => item.key !== draft.key))}>
              <FiTrash2 size={13} />
            </RemoveBtn>
          </CardHead>
          {draft.mode === 'new' ? (
            <NewSourceGrid>
              <EventFormS.Input
                aria-label="출처 제목"
                value={draft.newSource.title}
                onChange={(event) => patchNewSource(draft.key, { title: event.target.value })}
                placeholder="제목 * — 예: Mussolini's Italy"
              />
              <EventFormS.Input
                aria-label="저자·기관"
                value={draft.newSource.authors}
                onChange={(event) => patchNewSource(draft.key, { authors: event.target.value })}
                placeholder="저자·기관"
              />
              <EventFormS.Input
                aria-label="발행 연도"
                inputMode="numeric"
                value={draft.newSource.publishedYear}
                onChange={(event) => patchNewSource(draft.key, { publishedYear: event.target.value })}
                placeholder="발행 연도"
              />
              <FormSelectNative
                aria-label="출처 종류"
                value={draft.newSource.kind}
                onChange={(event) => patchNewSource(draft.key, { kind: event.target.value as SourceKind })}
              >
                {SOURCE_KIND_CHOICES.map((kind) => (
                  <option key={kind} value={kind}>
                    {SOURCE_KIND_LABEL[kind]}
                  </option>
                ))}
              </FormSelectNative>
              <FormSelectNative
                aria-label="사료 층위"
                value={draft.newSource.tier}
                onChange={(event) => patchNewSource(draft.key, { tier: event.target.value as SourceTier | '' })}
              >
                <option value="">층위 미분류</option>
                {(['PRIMARY', 'SECONDARY', 'TERTIARY'] as SourceTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {SOURCE_TIER_LABEL[tier]}
                  </option>
                ))}
              </FormSelectNative>
              <EventFormS.Input
                aria-label="출처 주소"
                value={draft.newSource.url}
                onChange={(event) => patchNewSource(draft.key, { url: event.target.value })}
                placeholder="https://… (웹 출처)"
              />
            </NewSourceGrid>
          ) : null}
          <LocatorRow>
            <EventFormS.Input
              aria-label={`${index + 1}번 위치`}
              value={draft.locator}
              onChange={(event) => patch(draft.key, { locator: event.target.value })}
              placeholder="위치 — p. 123 · §4 · 인포박스"
            />
            <EventFormS.Textarea
              aria-label={`${index + 1}번 근거 구절`}
              rows={2}
              value={draft.quote}
              onChange={(event) => patch(draft.key, { quote: event.target.value })}
              placeholder="근거 구절(원문 인용, 선택)"
            />
          </LocatorRow>
        </CitationCard>
      ))}
      <AddRow>
        <AddBtn type="button" aria-expanded={searchOpen} aria-controls={searchId} onClick={() => setSearchOpen((open) => !open)}>
          <FiSearch size={13} aria-hidden />
          서고에서 찾기
        </AddBtn>
        <AddBtn
          type="button"
          onClick={() =>
            onChange([
              ...value,
              {
                key: nextKey(),
                mode: 'new',
                newSource: { kind: 'BOOK', title: '', authors: '', publishedYear: '', url: '', tier: '' },
                locator: '',
                quote: '',
              },
            ])
          }
        >
          <FiPlus size={13} aria-hidden />새 출처
        </AddBtn>
      </AddRow>
      {searchOpen ? (
        <SearchPanel id={searchId}>
          <EventFormS.Input
            aria-label="출처 찾기"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목·저자·식별자"
            autoFocus
          />
          <SearchList role="listbox" aria-label="출처 후보">
            {found
              .filter((source) => !value.some((draft) => draft.mode === 'existing' && draft.source.id === source.id))
              .slice(0, 20)
              .map((source) => (
                <div
                  key={source.id}
                  role="option"
                  aria-selected={false}
                  className="row"
                  onClick={() => onChange([...value, { key: nextKey(), mode: 'existing', source, locator: '', quote: '' }])}
                >
                  <span className="name">{source.title}</span>
                  <span className="meta">
                    {[SOURCE_KIND_LABEL[source.kind], source.authors, source.publishedYear].filter(Boolean).join(' · ')}
                  </span>
                </div>
              ))}
            {!isFetching && found.length === 0 ? <EmptyLine>찾는 출처가 없습니다 — '새 출처'로 만드세요.</EmptyLine> : null}
          </SearchList>
        </SearchPanel>
      ) : null}
    </EditorRoot>
  )
}

const EditorRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const EmptyLine = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CitationCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .index {
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    line-height: 20px;
    text-align: center;
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)')};
  }
  .title {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const RemoveBtn = styled.button`
  margin-left: auto;
  display: inline-flex;
  padding: 5px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`

const NewSourceGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) 110px;
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const LocatorRow = styled.div`
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 8px;
  align-items: start;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const AddRow = styled.div`
  display: flex;
  gap: 8px;
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const SearchPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SearchList = styled.div`
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    align-items: baseline;
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
  }
  .row:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)')};
  }
  .name {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
