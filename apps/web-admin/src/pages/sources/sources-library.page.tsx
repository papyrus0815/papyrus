/**
 * 출처 서고 — `/sources`.
 *
 * 수치·인용이 기대는 책·사료를 한자리에서 본다. 예전엔 출처가 수치 입력 모달 안의 검색 상자로만 존재해서
 * '이 책이 어디어디 인용됐나', '1차 사료로 뒷받침된 수치가 얼마나 되나'를 물을 곳이 없었다.
 *
 * 좌측 = 목록(검색·등급), 우측 = 고른 출처의 서지·사료 비평 편집 + 쓰인 곳(사건별).
 * 시스템 출처(시드의 '출처 미기재' 자리표시 등)는 잠겨 있어 읽기만 된다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiBookOpen, FiLock, FiPlus, FiSearch } from 'react-icons/fi'
import { Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { SOURCE_KIND_LABEL, SOURCE_TIER_LABEL } from '@/entities/evidence/lib/evidence-labels'
import { compactKoreanNumber } from '@/entities/evidence/lib/format-observation'
import {
  type CreateSourceInput,
  createSource,
  listSourceLibrary,
  listSourceUsages,
  type SourceLibraryEntry,
  type SourceTier,
  type SourceUsage,
  updateSource,
} from '@/shared/api/evidence'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

import { SourceEditor, SourceSummary } from './source-editor'

type TierFilter = SourceTier | 'NONE' | ''

const TIER_FILTERS: Array<{ value: TierFilter; label: string }> = [
  { value: '', label: '전체' },
  { value: 'PRIMARY', label: SOURCE_TIER_LABEL.PRIMARY },
  { value: 'SECONDARY', label: SOURCE_TIER_LABEL.SECONDARY },
  { value: 'TERTIARY', label: SOURCE_TIER_LABEL.TERTIARY },
  { value: 'NONE', label: '미분류' },
]

const SUBJECT_LABEL: Record<string, string> = {
  EVENT: '사건 전체',
  EVENT_SIDE: '진영',
  EVENT_PARTICIPANT: '참여국',
}

const libraryKey = (query: string, tier: TierFilter) => ['sources', 'library', query, tier] as const

/** 한 줄 서지 — '저자 · 발행처 · 1867' */
function bibliographyLine(source: SourceLibraryEntry): string {
  return [source.authors, source.publisher, source.publishedYear ?? source.writtenYear]
    .filter((part) => part != null && part !== '')
    .join(' · ')
}

/** 쓰인 곳을 사건별로 — 한 사건의 여러 수치가 한 묶음 */
function groupUsages(usages: ReadonlyArray<SourceUsage>) {
  const groups = new Map<string, { eventId: string | null; title: string; rows: SourceUsage[] }>()
  for (const usage of usages) {
    const key = usage.eventId ?? '__none__'
    const group = groups.get(key) ?? { eventId: usage.eventId, title: usage.eventTitle ?? '(사건 미상)', rows: [] }
    group.rows.push(usage)
    groups.set(key, group)
  }
  /* 사건 안에서는 대상(진영·나라) → 지표 순 — 같은 진영의 수치가 붙어 읽힌다 */
  for (const group of groups.values()) {
    group.rows.sort(
      (left, right) =>
        (left.subjectType === 'EVENT_SIDE' ? 0 : 1) - (right.subjectType === 'EVENT_SIDE' ? 0 : 1) ||
        (left.subjectLabel ?? '').localeCompare(right.subjectLabel ?? '', 'ko') ||
        left.metricName.localeCompare(right.metricName, 'ko'),
    )
  }
  return [...groups.values()].sort((left, right) => right.rows.length - left.rows.length)
}

export function SourcesLibraryPage() {
  useDocumentTitle('출처 서고')
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id')
  const creating = searchParams.get('new') === '1'
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<TierFilter>('')
  const trimmedQuery = query.trim()

  const { data: sources = [], isLoading, isError, refetch } = useQuery({
    queryKey: libraryKey(trimmedQuery, tier),
    queryFn: () => listSourceLibrary({ query: trimmedQuery, tier: tier || undefined }),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })
  /* 고른 출처가 필터 밖으로 나가도 우측은 유지 — 전체 목록에서 다시 찾는다 */
  const { data: allSources = [] } = useQuery({
    queryKey: libraryKey('', ''),
    queryFn: () => listSourceLibrary(),
    staleTime: 30_000,
    enabled: Boolean(selectedId),
  })
  const selected = useMemo(
    () => sources.find((source) => source.id === selectedId) ?? allSources.find((source) => source.id === selectedId) ?? null,
    [sources, allSources, selectedId],
  )
  const { data: usages = [], isLoading: usagesLoading } = useQuery({
    queryKey: ['sources', 'usages', selectedId],
    queryFn: () => listSourceUsages(selectedId!),
    enabled: Boolean(selectedId),
  })
  const usageGroups = useMemo(() => groupUsages(usages), [usages])

  const select = (id: string | null) => {
    const next = new URLSearchParams()
    if (id) next.set('id', id)
    setSearchParams(next, { replace: false })
  }
  const startCreate = () => setSearchParams(new URLSearchParams({ new: '1' }))

  const save = useMutation({
    mutationFn: (input: CreateSourceInput) => (selected && !creating ? updateSource(selected.id, input) : createSource(input)),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['sources'] })
      notify.success(creating ? '출처를 등록했습니다' : '출처를 고쳤습니다')
      if (creating) select(saved.id)
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '저장하지 못했습니다'),
  })

  const tieredCount = sources.filter((source) => source.tier).length

  return (
    <Page>
      <Head>
        <div>
          <PageTitle>
            <FiBookOpen aria-hidden />
            출처 서고
          </PageTitle>
          <PageSub>
            수치와 인용이 기대는 책·사료. 1차 사료인지 연구서인지, 언제 누가 어떤 입장에서 썼는지를 적어 두면 수치 옆에 그 무게가
            함께 보입니다.
          </PageSub>
        </div>
        <NewButton type="button" onClick={startCreate}>
          <FiPlus aria-hidden />새 출처
        </NewButton>
      </Head>

      <Body>
        <ListPane aria-label="출처 목록">
          <SearchBox>
            <FiSearch aria-hidden />
            <input
              value={query}
              onChange={(change) => setQuery(change.target.value)}
              placeholder="제목 · 원제 · 저자 · ISBN"
              aria-label="출처 검색"
            />
          </SearchBox>
          <ChipRow role="radiogroup" aria-label="등급">
            {TIER_FILTERS.map((option) => (
              <Chip
                key={option.value || 'all'}
                type="button"
                role="radio"
                aria-checked={tier === option.value}
                $active={tier === option.value}
                onClick={() => setTier(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </ChipRow>
          <ListMeta>
            {sources.length}건{sources.length > 0 ? ` · 등급 매김 ${tieredCount}` : ''}
          </ListMeta>

          {isLoading ? (
            <Notice>불러오는 중…</Notice>
          ) : isError ? (
            <Notice>
              목록을 불러오지 못했습니다.{' '}
              <TextButton type="button" onClick={() => void refetch()}>
                다시 시도
              </TextButton>
            </Notice>
          ) : sources.length === 0 ? (
            <Notice>{trimmedQuery || tier ? '조건에 맞는 출처가 없습니다.' : '아직 등록된 출처가 없습니다.'}</Notice>
          ) : (
            <SourceList>
              {sources.map((source) => (
                <li key={source.id}>
                  <SourceItem
                    type="button"
                    aria-current={source.id === selectedId ? 'true' : undefined}
                    $active={source.id === selectedId}
                    onClick={() => select(source.id)}
                  >
                    <ItemTitle>
                      {source.title}
                      {!source.editable && <FiLock aria-label="잠긴 출처" />}
                    </ItemTitle>
                    {bibliographyLine(source) && <ItemMeta>{bibliographyLine(source)}</ItemMeta>}
                    <ItemTags>
                      <Tag $strong={Boolean(source.tier)} $warn={source.kind === 'LEGACY_UNVERIFIED'}>
                        {source.tier ? SOURCE_TIER_LABEL[source.tier] : SOURCE_KIND_LABEL[source.kind]}
                      </Tag>
                      <Count>
                        인용 {source.citationCount}
                        {source.eventCount > 0 ? ` · 사건 ${source.eventCount}` : ''}
                      </Count>
                    </ItemTags>
                  </SourceItem>
                </li>
              ))}
            </SourceList>
          )}
        </ListPane>

        <DetailPane aria-label="출처 상세">
          {creating ? (
            <>
              <DetailTitle>새 출처</DetailTitle>
              <SourceEditor
                key="new"
                source={null}
                readOnly={false}
                saving={save.isPending}
                onSubmit={(input) => save.mutate(input)}
                onCancel={() => select(null)}
              />
            </>
          ) : selected ? (
            <>
              <DetailTitle>{selected.title}</DetailTitle>
              {selected.originalTitle && <DetailOriginal>{selected.originalTitle}</DetailOriginal>}
              {!selected.editable && (
                <LockNote>
                  <FiLock aria-hidden />
                  {selected.kind === 'LEGACY_UNVERIFIED'
                    ? '시드가 출처 없이 넣은 값들의 자리표시입니다 — 고치지 말고, 각 수치에 검증된 출처를 새로 달아 이 인용을 줄여 주세요.'
                    : '다른 사람이 등록한 출처라 읽기만 됩니다.'}
                </LockNote>
              )}
              {selected.editable ? (
                <SourceEditor
                  key={selected.id}
                  source={selected}
                  readOnly={false}
                  saving={save.isPending}
                  onSubmit={(input) => save.mutate(input)}
                />
              ) : (
                <SourceSummary source={selected} />
              )}

              <UsageSection aria-label="쓰인 곳">
                <UsageTitle>
                  쓰인 곳 <span>{usages.length}</span>
                </UsageTitle>
                {usagesLoading ? (
                  <Notice>불러오는 중…</Notice>
                ) : usageGroups.length === 0 ? (
                  <Notice>아직 이 출처를 인용한 수치가 없습니다.</Notice>
                ) : (
                  usageGroups.map((group) => (
                    <UsageGroup key={group.eventId ?? 'none'}>
                      <UsageEvent>
                        {group.eventId ? <Link to={pathKeys.events.detail(group.eventId)}>{group.title}</Link> : group.title}
                        <span>{group.rows.length}</span>
                      </UsageEvent>
                      <UsageRows>
                        {group.rows.map((usage) => (
                          <li key={usage.citationId}>
                            <span className="subject">
                              {usage.subjectLabel ?? SUBJECT_LABEL[usage.subjectType] ?? usage.subjectType}
                            </span>
                            <span className="metric">{usage.metricName}</span>
                            <span className="value">{usage.value != null ? compactKoreanNumber(usage.value) : '범위'}</span>
                            {usage.locator && <span className="locator">{usage.locator}</span>}
                          </li>
                        ))}
                      </UsageRows>
                    </UsageGroup>
                  ))
                )}
              </UsageSection>
            </>
          ) : (
            <Empty>
              <FiBookOpen aria-hidden />
              <p>왼쪽에서 출처를 고르면 서지·사료 비평과 그 출처가 쓰인 수치가 여기 보입니다.</p>
            </Empty>
          )}
        </DetailPane>
      </Body>
    </Page>
  )
}

export default SourcesLibraryPage

/* ── styled — 선 없이 면으로(사건 상세와 같은 문법) ── */

const fill = (mode: string, light = 0.04, dark = 0.05) =>
  mode === 'dark' ? `rgba(255,255,255,${dark})` : `rgba(15,23,42,${light})`

const Page = styled.div`
  padding: 24px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 16px 16px 40px;
  }
`

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const PageTitle = styled.h1`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const PageSub = styled.p`
  margin: 6px 0 0;
  max-width: 68ch;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const NewButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
`

const Body = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ListPane = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  background: ${({ theme }) => fill(theme.mode, 0.05, 0.06)};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 0;
  }
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.button<{ $active: boolean }>`
  padding: 4px 11px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ theme, $active }) => ($active ? fill(theme.mode, 0.11, 0.14) : fill(theme.mode, 0.04, 0.05))};
`

const ListMeta = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SourceList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SourceItem = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? fill(theme.mode, 0.08, 0.1) : 'transparent')};

  &:hover {
    background: ${({ theme, $active }) => ($active ? fill(theme.mode, 0.08, 0.1) : fill(theme.mode, 0.035, 0.045))};
  }
`

const ItemTitle = styled.span`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.primary};
  svg {
    flex-shrink: 0;
    width: 11px;
    height: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ItemMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ItemTags = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Tag = styled.span<{ $strong: boolean; $warn: boolean }>`
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
  color: ${({ theme, $warn, $strong }) =>
    $warn ? (theme.mode === 'dark' ? '#fcd34d' : '#92400e') : $strong ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme, $warn }) =>
    $warn ? (theme.mode === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.16)') : fill(theme.mode, 0.07, 0.09)};
`

const Count = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DetailPane = styled.section`
  min-width: 0;
  padding: 20px 22px;
  border-radius: 14px;
  background: ${({ theme }) => fill(theme.mode, 0.025, 0.03)};
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const DetailTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DetailOriginal = styled.p`
  margin: -8px 0 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const LockNote = styled.p`
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fcd34d' : '#92400e')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.12)')};
  svg {
    flex-shrink: 0;
  }
`

const UsageSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
`

const UsageTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  span {
    margin-left: 4px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const UsageGroup = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => fill(theme.mode, 0.035, 0.04)};
`

const UsageEvent = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13.5px;
  font-weight: 700;
  a {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  span {
    font-size: 11.5px;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const UsageRows = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 560px;
  li {
    display: grid;
    grid-template-columns: minmax(96px, 36%) minmax(0, 1fr) auto;
    gap: 8px;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .value {
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .locator {
    grid-column: 2 / -1;
    font-size: 11.5px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const Notice = styled.p`
  margin: 0;
  padding: 16px 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TextButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: underline;
  cursor: pointer;
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  svg {
    width: 28px;
    height: 28px;
  }
  p {
    margin: 0;
    max-width: 36ch;
    font-size: 13px;
    line-height: 1.6;
  }
`
