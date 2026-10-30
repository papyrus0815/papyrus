/**
 * 출처 한 건 편집 — 서고 우측. 서지(제목·저자·발행)와 **사료 비평** 칸(등급·저술 시점·관점·원어)을 함께.
 *
 * 사료 비평 칸이 이 서고의 이유다: 같은 '프로이센 손실 1.85만'이라도 참모본부 공식사(1차, 승전국 관점)와
 * 현대 연구서(2차)는 무게가 다르다. 수치 옆에 그 무게를 보이려면 출처가 그것을 알고 있어야 한다.
 */
import { useState } from 'react'

import styled from 'styled-components'

import {
  SOURCE_KIND_CHOICES,
  SOURCE_KIND_LABEL,
  SOURCE_TIER_HINT,
  SOURCE_TIER_LABEL,
} from '@/entities/evidence/lib/evidence-labels'
import type { CreateSourceInput, Source, SourceKind, SourceTier } from '@/shared/api/evidence'

interface Draft {
  kind: SourceKind
  tier: SourceTier | ''
  title: string
  originalTitle: string
  authors: string
  writtenYear: string
  publishedYear: string
  publisher: string
  language: string
  perspective: string
  url: string
  identifier: string
  note: string
}

const toDraft = (source: Source | null): Draft => ({
  kind: source?.kind ?? 'BOOK',
  tier: source?.tier ?? '',
  title: source?.title ?? '',
  originalTitle: source?.originalTitle ?? '',
  authors: source?.authors ?? '',
  writtenYear: source?.writtenYear != null ? String(source.writtenYear) : '',
  publishedYear: source?.publishedYear != null ? String(source.publishedYear) : '',
  publisher: source?.publisher ?? '',
  language: source?.language ?? '',
  perspective: source?.perspective ?? '',
  url: source?.url ?? '',
  identifier: source?.identifier ?? '',
  note: source?.note ?? '',
})

/** 빈 칸은 null — 수정에선 '비움', 등록에선 '없음' */
const toInput = (draft: Draft): CreateSourceInput => {
  const text = (value: string) => value.trim() || null
  const year = (value: string) => (value.trim() && Number.isInteger(Number(value)) ? Number(value) : null)
  return {
    kind: draft.kind,
    tier: draft.tier || null,
    title: draft.title.trim(),
    originalTitle: text(draft.originalTitle),
    authors: text(draft.authors),
    writtenYear: year(draft.writtenYear),
    publishedYear: year(draft.publishedYear),
    publisher: text(draft.publisher),
    language: text(draft.language),
    perspective: text(draft.perspective),
    url: text(draft.url),
    identifier: text(draft.identifier),
    note: text(draft.note),
  }
}

/** 잠긴 출처 — 빈 입력칸(과 그 예시 글)을 늘어놓으면 예시가 실제 값처럼 읽힌다. 채워진 칸만 목록으로 */
export function SourceSummary({ source }: { source: Source }) {
  const rows: Array<[string, string | number | null]> = [
    ['종류', SOURCE_KIND_LABEL[source.kind]],
    ['등급', source.tier ? SOURCE_TIER_LABEL[source.tier] : null],
    ['원제', source.originalTitle],
    ['저자·기관', source.authors],
    ['발행', [source.publisher, source.publishedYear].filter((part) => part != null && part !== '').join(' · ') || null],
    ['저술 시점', source.writtenYear != null ? (source.writtenYear < 0 ? `기원전 ${-source.writtenYear}년` : `${source.writtenYear}년`) : null],
    ['원문 언어', source.language],
    ['관점·입장', source.perspective],
    ['ISBN·DOI', source.identifier],
    ['URL', source.url],
    ['메모', source.note],
  ]
  return (
    <Summary>
      {rows
        .filter(([, value]) => value != null && value !== '')
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </Summary>
  )
}

export function SourceEditor({
  source,
  readOnly,
  saving,
  onSubmit,
  onCancel,
}: {
  /** null이면 새 출처 */
  source: Source | null
  readOnly: boolean
  saving: boolean
  onSubmit: (input: CreateSourceInput) => void
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(() => toDraft(source))
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft((previous) => ({ ...previous, [key]: value }))
  const yearInvalid = [draft.writtenYear, draft.publishedYear].some(
    (value) => value.trim() !== '' && !Number.isInteger(Number(value)),
  )

  return (
    <Form
      onSubmit={(formEvent) => {
        formEvent.preventDefault()
        if (!draft.title.trim() || yearInvalid) return
        onSubmit(toInput(draft))
      }}
    >
      <fieldset disabled={readOnly || saving}>
        <Group>
          <GroupTitle>서지</GroupTitle>
          <Grid>
            <Field $wide>
              <span>제목</span>
              <input value={draft.title} onChange={(change) => set('title', change.target.value)} required />
            </Field>
            <Field $wide>
              <span>원제 (원어)</span>
              <input
                value={draft.originalTitle}
                onChange={(change) => set('originalTitle', change.target.value)}
                placeholder="예: Der Feldzug von 1866 in Deutschland"
              />
            </Field>
            <Field>
              <span>종류</span>
              <select value={draft.kind} onChange={(change) => set('kind', change.target.value as SourceKind)}>
                {[...SOURCE_KIND_CHOICES, ...(draft.kind === 'LEGACY_UNVERIFIED' ? (['LEGACY_UNVERIFIED'] as const) : [])].map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {SOURCE_KIND_LABEL[kind]}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field>
              <span>저자·기관</span>
              <input value={draft.authors} onChange={(change) => set('authors', change.target.value)} />
            </Field>
            <Field>
              <span>발행처</span>
              <input value={draft.publisher} onChange={(change) => set('publisher', change.target.value)} />
            </Field>
            <Field>
              <span>발행연도 (판본)</span>
              <input inputMode="numeric" value={draft.publishedYear} onChange={(change) => set('publishedYear', change.target.value)} />
            </Field>
            <Field>
              <span>ISBN·DOI</span>
              <input value={draft.identifier} onChange={(change) => set('identifier', change.target.value)} />
            </Field>
            <Field $wide>
              <span>URL</span>
              <input value={draft.url} onChange={(change) => set('url', change.target.value)} />
            </Field>
          </Grid>
        </Group>

        <Group>
          <GroupTitle>사료 비평</GroupTitle>
          <TierRow role="radiogroup" aria-label="출처 등급">
            {(['', 'PRIMARY', 'SECONDARY', 'TERTIARY'] as const).map((tier) => (
              <TierOption key={tier || 'none'} $active={draft.tier === tier}>
                <input type="radio" name="source-tier" checked={draft.tier === tier} onChange={() => set('tier', tier)} />
                {tier ? SOURCE_TIER_LABEL[tier] : '미분류'}
              </TierOption>
            ))}
          </TierRow>
          {draft.tier && <Hint>{SOURCE_TIER_HINT[draft.tier]}</Hint>}
          <Grid>
            <Field>
              <span>저술 시점 (기원전은 음수)</span>
              <input
                inputMode="numeric"
                value={draft.writtenYear}
                onChange={(change) => set('writtenYear', change.target.value)}
                placeholder="예: 1867"
              />
            </Field>
            <Field>
              <span>원문 언어</span>
              <input value={draft.language} onChange={(change) => set('language', change.target.value)} placeholder="예: de · la · zh-Hant" />
            </Field>
            <Field $wide>
              <span>관점·입장</span>
              <input
                value={draft.perspective}
                onChange={(change) => set('perspective', change.target.value)}
                placeholder="예: 프로이센 참모본부 공식 전사 — 승전국 관점, 자국 손실을 적게 잡는 경향"
              />
            </Field>
            <Field $wide>
              <span>메모</span>
              <textarea rows={3} value={draft.note} onChange={(change) => set('note', change.target.value)} />
            </Field>
          </Grid>
        </Group>
      </fieldset>

      {yearInvalid && <ErrorText>연도는 정수로 적어 주세요(기원전은 음수).</ErrorText>}
      {!readOnly && (
        <Actions>
          {onCancel && (
            <Button type="button" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button type="submit" $primary disabled={saving || !draft.title.trim() || yearInvalid}>
            {saving ? '저장 중…' : source ? '저장' : '출처 등록'}
          </Button>
        </Actions>
      )}
    </Form>
  )
}

const Summary = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  div {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 12px;
    font-size: 13px;
    line-height: 1.55;
  }
  dt {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
    overflow-wrap: anywhere;
    white-space: pre-line;
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;

  fieldset {
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const GroupTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: 10px 12px;
`

/** 입력 칸 — 선 없이 채운 면(서고 전체가 선을 쓰지 않는다) */
const Field = styled.label<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  min-width: 0;

  > span {
    font-size: 11.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input,
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
    font: inherit;
    font-size: 13.5px;
    color: ${({ theme }) => theme.colors.text.primary};
    resize: vertical;
  }

  input::placeholder,
  textarea::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    opacity: 0.7;
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 0;
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.75;
    cursor: default;
  }
`

const TierRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TierOption = styled.label<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 650;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(15,23,42,0.11)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.04)'};

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.error};
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const Button = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  color: ${({ theme, $primary }) => ($primary ? '#fff' : theme.colors.text.primary)};
  background: ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`
