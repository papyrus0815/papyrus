import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowDown, FiArrowUp, FiSettings, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  EVENT_COUNTRY_ROLE_OPTIONS,
  type EventCountryRole,
} from '@/entities/event/model'
import { getAllCountries } from '@/shared/api/countries'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { InlineSelect } from '@/shared/ui/inline-edit'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'

import * as S from '../styles'
import { type PatchOptions } from '../use-undoable-patch'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'

interface DetailActorsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: PatchOptions) => void
  /** 인물 클릭 시 상세 모달 오픈. 페이지 레벨 단일 모달이 처리. */
  onPersonClick: (personId: string) => void
  /**
   * 관련국 클릭 시 국가 정보 모달 오픈(인물과 대칭). 링크는 유지되므로
   * 수정자 키(cmd/ctrl/shift)·중클릭의 새 탭 동선은 그대로 보존된다.
   */
  onCountryClick: (countryId: string) => void
}

/**
 * 참여 행위자 — NYT editorial dramatis personae 사이드바.
 *
 * 디자인 의도
 * - 카드/필/배경색 폐기. 검정 1px 헤어라인 룰만으로 구획 (신문 룰).
 * - 타이틀: 큰 세리프 + italic subtitle, 그 아래 굵은 룰.
 * - 인물: 세로 리스트, 정사각 60px 아바타(b&w 톤) + bold serif 이름 + italic 역할
 *   + 본문체 비고. 행 사이 1px 라이트 룰.
 * - 참여국: 인물과 같은 행 구조. 이름 + 역할(10종 피커) + 역할 서술 + 비고.
 *   현대/역사를 한 목록으로 합쳐 sortOrder 순으로 세운다 — 순서가 두 배열에 걸쳐
 *   하나이기 때문.
 * - 액션(×, 편집)은 hover 시에만 노출.
 */
export function DetailActors({
  event,
  onPatch,
  onPersonClick,
  onCountryClick,
}: DetailActorsProps) {
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  /**
   * 관리 모드 — true일 때만 reorder(↑↓) 버튼이 각 row에 등장한다.
   * 사용 빈도 낮은 액션을 평소엔 숨겨 read-first 톤을 유지.
   */
  const [manageMode, setManageMode] = useState(false)

  const persons = event.relatedPersons ?? []
  const modernCountries = event.relatedCountries ?? []
  const historicalCountries = event.relatedHistoricalCountries ?? []

  const { data: allPersons = [], isLoading: personsLoading } = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: personModalOpen,
    staleTime: 5 * 60_000,
  })
  const { data: allModern = [] } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: countryModalOpen,
    staleTime: 5 * 60_000,
  })
  const { data: allHistorical = [] } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: countryModalOpen,
    staleTime: 5 * 60_000,
  })

  const patchPersons = (
    next: Array<{ personId: string; role?: string; note?: string }>,
  ) => onPatch({ relatedPersons: next })

  const updatePerson = (
    personId: string,
    patch: { role?: string; note?: string },
  ) => {
    const next = persons.map((p) => {
      if (p.personId !== personId) return toPersonPayload(p)
      return {
        personId: p.personId,
        role:
          patch.role !== undefined
            ? patch.role.trim() || undefined
            : p.role ?? undefined,
        note:
          patch.note !== undefined
            ? patch.note.trim() || undefined
            : p.note ?? undefined,
      }
    })
    patchPersons(next)
  }

  const removePerson = (personId: string) => {
    const removed = persons.find((person) => person.personId === personId)
    const removedName = removed?.person
      ? getPersonDisplayName({
          name: removed.person.name ?? '',
          surname: removed.person.surname,
          middleName: removed.person.middleName,
          nameDisplayOrder: removed.person.nameDisplayOrder,
          country: removed.person.country,
        }) || '인물'
      : '인물'
    onPatch(
      {
        relatedPersons: persons
          .filter((person) => person.personId !== personId)
          .map(toPersonPayload),
      },
      { savedLabel: `행위자 제거 · ${removedName}` },
    )
  }

  /**
   * 인물 순서 이동 — 서버는 array 순서를 그대로 보존하므로 array를 재정렬해 PUT.
   * 경계(맨 위에서 ↑, 맨 아래에서 ↓)에서는 호출 자체가 막혀 patch 발송 X.
   */
  const movePerson = (personId: string, dir: -1 | 1) => {
    const idx = persons.findIndex((p) => p.personId === personId)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= persons.length) return
    const next = persons.slice()
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    patchPersons(next.map(toPersonPayload))
  }

  /**
   * 인물 추가 — 모달은 연속 추가(multiSelect)라 여기서 닫지 않는다.
   * 중복은 모달이 excludeIds로 이미 거르지만, 안전하게 한 번 더 가드.
   */
  const addPerson = (personId: string) => {
    if (persons.some((p) => p.personId === personId)) return
    patchPersons([...persons.map(toPersonPayload), { personId }])
  }

  /**
   * 참여국 — 현대·역사를 **한 목록**으로 합쳐 다룬다. 서버가 표시 편의로 두 배열을
   * 내려주지만 순서(sortOrder)는 둘에 걸쳐 하나이므로, 편집은 언제나 합친 목록으로
   * 한다. 저장은 `relatedCountries` 한 필드 — 서버가 자연키로 머지하므로 보내지 않은
   * 필드(역할·서술·비고)는 그대로 살아남는다.
   */
  const countryRows = useMemo(() => {
    const rows = [
      ...modernCountries.map((country, index) => ({
        id: country.id,
        name: country.name,
        isHistorical: false,
        role: country.role ?? null,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        sortOrder: country.sortOrder ?? index,
      })),
      ...historicalCountries.map((country, index) => ({
        id: country.id,
        name: country.name,
        isHistorical: true,
        role: country.role ?? null,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        sortOrder: country.sortOrder ?? index,
      })),
    ]
    rows.sort((left, right) => left.sortOrder - right.sortOrder)
    return rows
  }, [modernCountries, historicalCountries])

  const patchCountries = (
    next: typeof countryRows,
    options?: { savedLabel?: string },
  ) => onPatch({ relatedCountries: next.map(toCountryPayload) }, options)

  const updateCountry = (
    rowKey: string,
    patch: { role?: EventCountryRole; roleDescription?: string; note?: string },
  ) => {
    const next = countryRows.map((row) =>
      countryRowKey(row) === rowKey ? { ...row, ...patch } : row,
    )
    patchCountries(next)
  }

  const removeCountry = (rowKey: string) => {
    const removed = countryRows.find((row) => countryRowKey(row) === rowKey)
    patchCountries(
      countryRows.filter((row) => countryRowKey(row) !== rowKey),
      { savedLabel: `관련국 제거 · ${removed?.name ?? '국가'}` },
    )
  }

  /** 순서 이동 — 이제 sortOrder로 실제 저장된다(예전엔 저장 자리가 없어 무시됐다). */
  const moveCountry = (rowKey: string, dir: -1 | 1) => {
    const index = countryRows.findIndex((row) => countryRowKey(row) === rowKey)
    if (index < 0) return
    const target = index + dir
    if (target < 0 || target >= countryRows.length) return
    const next = countryRows.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    patchCountries(next)
  }

  const addCountry = (country: { id: string; isHistorical: boolean }) => {
    const rowKey = country.isHistorical ? `h:${country.id}` : `m:${country.id}`
    if (countryRows.some((row) => countryRowKey(row) === rowKey)) return
    patchCountries([
      ...countryRows,
      {
        id: country.id,
        name: '',
        isHistorical: country.isHistorical,
        role: null,
        roleDescription: null,
        note: null,
        sortOrder: countryRows.length,
      },
    ])
  }

  const selectedCountryIds = useMemo(
    () => countryRows.map((row) => row.id),
    [countryRows],
  )

  const totalCountries = countryRows.length
  const hasAnything =
    persons.length > 0 || totalCountries > 0
  /** 순서 변경 토글은 행이 2개 이상일 때만 의미가 있다. */
  const canManage = persons.length > 1 || totalCountries > 1
  /**
   * 항목을 1개 이하로 지우면 토글 버튼이 사라지는데, manageMode가 true로 남으면
   * reorder 액션이 갇힌 채 끌 길이 없다. 토글이 사라지는 시점에 모드도 해제.
   */
  useEffect(() => {
    if (!canManage && manageMode) setManageMode(false)
  }, [canManage, manageMode])

  return (
    <>
      <S.Section id="actors">
        <S.SectionHeader>
          <S.SectionTitle>참여 행위자</S.SectionTitle>
          {hasAnything && (
            <S.SectionSubtitle>
              {totals(persons.length, totalCountries)}
            </S.SectionSubtitle>
          )}
          {canManage && (
            <S.SectionActions>
              <ManageToggle
                type="button"
                onClick={() => setManageMode((v) => !v)}
                $active={manageMode}
                aria-pressed={manageMode}
              >
                <FiSettings />
                {manageMode ? '관리 끝' : '순서 변경'}
              </ManageToggle>
            </S.SectionActions>
          )}
        </S.SectionHeader>

        {/* 비어 있을 때 통일 안내 — persons·countries 모두 없을 때만 */}
        {!hasAnything && (
          <S.EmptyState>
            <S.EmptyStateHead>
              <S.EmptyStateIcon aria-hidden>👥</S.EmptyStateIcon>
              <S.EmptyStateLine>
                아직 등록된 인물·국가가 없습니다. 아래 <strong>인물 추가</strong>·
                <strong>국가 추가</strong>로 시작하세요.
              </S.EmptyStateLine>
            </S.EmptyStateHead>
          </S.EmptyState>
        )}

        {/* 인물 — 세로 리스트, hairline 구분선 */}
        {persons.length > 0 && (
          <PersonList>
            {persons.map((person, idx) => {
              const fullName = person.person
                ? getPersonDisplayName({
                    name: person.person.name ?? '',
                    surname: person.person.surname,
                    middleName: person.person.middleName,
                    nameDisplayOrder: person.person.nameDisplayOrder,
                    country: person.person.country,
                  }) || '미상'
                : '미상'
              const avatarUrl = person.person?.profileImageUrl ?? undefined
              const hasNote = Boolean(person.note && person.note.trim())
              return (
                /**
                 * key는 join 행 id(person.id)가 아니라 personId. relatedPersons는 서버가
                 * delete-and-recreate라 저장할 때마다 person.id가 새 UUID로 재발급된다.
                 * id로 키잉하면 매 저장 직후 모든 행이 unmount/remount되며 인라인 편집의
                 * 포커스·IME·커서가 끊긴다. personId는 recreate에도 안정적.
                 */
                <PersonRow key={person.personId}>
                  <PersonAvatarBtn
                    type="button"
                    onClick={() => onPersonClick(person.personId)}
                    aria-label={`${fullName} 상세 보기`}
                  >
                    <PersonAvatar $hasImage={Boolean(avatarUrl)}>
                      {avatarUrl ? (
                        <img
                          src={getUploadImageUrl(avatarUrl) || avatarUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span>{fullName.charAt(0)}</span>
                      )}
                    </PersonAvatar>
                  </PersonAvatarBtn>

                  <PersonBody>
                    <PersonNameBtn
                      type="button"
                      onClick={() => onPersonClick(person.personId)}
                    >
                      {fullName}
                    </PersonNameBtn>
                    <PersonRoleLine>
                      <InlineText
                        value={person.role ?? ''}
                        onSave={(next) =>
                          updatePerson(person.personId, { role: next })
                        }
                        placeholder="역할 추가"
                        validate={(next) =>
                          next.length > 100
                            ? '역할은 100자 이내로 입력하세요'
                            : null
                        }
                      />
                    </PersonRoleLine>
                    <PersonNoteLine $hasContent={hasNote}>
                      <InlineText
                        value={person.note ?? ''}
                        onSave={(next) =>
                          updatePerson(person.personId, { note: next })
                        }
                        placeholder="비고 추가"
                        multiline
                        /* 여러 줄 비고 — Enter는 줄바꿈, 저장은 blur로. */
                        multilineEnter
                      />
                    </PersonNoteLine>
                  </PersonBody>

                  <RowActions>
                    {manageMode && (
                      <>
                        <ReorderBtn
                          type="button"
                          onClick={() => movePerson(person.personId, -1)}
                          disabled={idx === 0}
                          aria-label={`${fullName} 위로`}
                        >
                          <FiArrowUp />
                        </ReorderBtn>
                        <ReorderBtn
                          type="button"
                          onClick={() => movePerson(person.personId, 1)}
                          disabled={idx === persons.length - 1}
                          aria-label={`${fullName} 아래로`}
                        >
                          <FiArrowDown />
                        </ReorderBtn>
                      </>
                    )}
                    <RemoveInline
                      type="button"
                      onClick={() => removePerson(person.personId)}
                      aria-label={`${fullName} 제거`}
                    >
                      <FiX />
                    </RemoveInline>
                  </RowActions>
                </PersonRow>
              )
            })}
          </PersonList>
        )}
        <AddBtn type="button" onClick={() => setPersonModalOpen(true)}>
          인물 추가
        </AddBtn>

        {/* 참여국 — 인물 행과 같은 편집 수준(역할·서술·비고) */}
        {countryRows.length > 0 && (
          <NationsBlock>
            <NationsEyebrow>참여국</NationsEyebrow>
            <CountryList>
              {countryRows.map((row, index) => {
                const rowKey = countryRowKey(row)
                const NameLink = row.isHistorical
                  ? HistoricalCountryName
                  : CountryLink
                const hasNote = Boolean(row.note && row.note.trim())
                return (
                  <CountryRow key={rowKey}>
                    <CountryBody>
                      <CountryNameLine>
                        <NameLink
                          to={pathKeys.countryDetail(row.id)}
                          aria-haspopup="dialog"
                          onClick={(clickEvent) => {
                            if (!shouldInterceptEntityClick(clickEvent)) return
                            clickEvent.preventDefault()
                            onCountryClick(row.id)
                          }}
                        >
                          {row.name}
                        </NameLink>
                        <CountryRolePicker>
                          <InlineSelect
                            value={row.role ?? ''}
                            options={EVENT_COUNTRY_ROLE_OPTIONS.map(
                              (option) => ({
                                value: option.value,
                                label: option.label,
                                description: option.hint,
                              }),
                            )}
                            onSave={(next) =>
                              updateCountry(rowKey, {
                                role: next as EventCountryRole,
                              })
                            }
                            placeholder="역할 지정"
                            label={`${row.name} 역할`}
                          />
                        </CountryRolePicker>
                      </CountryNameLine>
                      <CountryRoleLine>
                        <InlineText
                          value={row.roleDescription ?? ''}
                          onSave={(next) =>
                            updateCountry(rowKey, { roleDescription: next })
                          }
                          placeholder="이 나라가 한 일 추가"
                          multiline
                          multilineEnter
                        />
                      </CountryRoleLine>
                      <CountryNoteLine $hasContent={hasNote}>
                        <InlineText
                          value={row.note ?? ''}
                          onSave={(next) => updateCountry(rowKey, { note: next })}
                          placeholder="비고 추가"
                          multiline
                          multilineEnter
                        />
                      </CountryNoteLine>
                    </CountryBody>

                    <RowActions>
                      {manageMode && (
                        <>
                          <ReorderBtn
                            type="button"
                            onClick={() => moveCountry(rowKey, -1)}
                            disabled={index === 0}
                            aria-label={`${row.name} 위로`}
                          >
                            <FiArrowUp />
                          </ReorderBtn>
                          <ReorderBtn
                            type="button"
                            onClick={() => moveCountry(rowKey, 1)}
                            disabled={index === countryRows.length - 1}
                            aria-label={`${row.name} 아래로`}
                          >
                            <FiArrowDown />
                          </ReorderBtn>
                        </>
                      )}
                      <RemoveInline
                        type="button"
                        onClick={() => removeCountry(rowKey)}
                        aria-label={`${row.name} 제거`}
                      >
                        <FiX />
                      </RemoveInline>
                    </RowActions>
                  </CountryRow>
                )
              })}
            </CountryList>
          </NationsBlock>
        )}
        <AddBtn type="button" onClick={() => setCountryModalOpen(true)}>
          국가 추가
        </AddBtn>
      </S.Section>

      {personModalOpen && (
        <PersonSelectModal
          persons={allPersons}
          selectedPersonId=""
          onSelect={(id) => addPerson(id)}
          onClose={() => setPersonModalOpen(false)}
          excludeIds={persons.map((p) => p.personId)}
          title="참여 인물 추가"
          searchPlaceholder="이름 또는 생몰년도로 검색..."
          multiSelect
          loading={personsLoading}
        />
      )}
      <AdvancedCountrySelectModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onSelect={(country) => addCountry(country)}
        modernCountries={allModern}
        historicalCountries={allHistorical}
        selectedCountryIds={selectedCountryIds}
        multiSelect
      />
    </>
  )
}

/* ───────────────────────── helpers ───────────────────────── */

function totals(persons: number, countries: number): string {
  const parts: string[] = []
  if (persons > 0) parts.push(`${persons}명`)
  if (countries > 0) parts.push(`${countries}국`)
  return parts.join(' · ')
}

/**
 * UpdateEventDto.relatedPersons 항목 직렬화. null/빈 문자열은 undefined로 정규화해
 * 서버 `=== undefined` 가드와 정합. update/add/remove 모두 동일 매핑을 쓰므로
 * 헬퍼로 한 곳에 둔다.
 */
function toPersonPayload(p: { personId: string; role?: string | null; note?: string | null }) {
  return {
    personId: p.personId,
    role: p.role ?? undefined,
    note: p.note ?? undefined,
  }
}

/** 참여국 행의 신원 — 현대/역사가 같은 uuid를 쓰더라도 섞이지 않는다 */
function countryRowKey(row: { id: string; isHistorical: boolean }): string {
  return row.isHistorical ? `h:${row.id}` : `m:${row.id}`
}

/**
 * 행 → 서버 계약(`relatedCountries`) 한 줄.
 * 빈 문자열은 null로 눕혀 "지움"을 명확히 한다(3상 규약: 생략=유지, null=비움).
 */
function toCountryPayload(row: {
  id: string
  isHistorical: boolean
  role: string | null
  roleDescription: string | null
  note: string | null
}) {
  return {
    ...(row.isHistorical
      ? { historicalCountryId: row.id }
      : { countryId: row.id }),
    role: (row.role ?? undefined) as EventCountryRole | undefined,
    roleDescription: row.roleDescription?.trim() ? row.roleDescription : null,
    note: row.note?.trim() ? row.note : null,
  }
}

/* ───────────────────────── styles — editorial sans ─────────────── */
/* NYT 깔끔한 톤(헤어라인 룰 + smallcaps eyebrow + 위계)만 차용. 폰트는 sans 기본. */

/**
 * 섹션 구분 hr 색상 — 본문 흐름 방해 안 하는 hairline.
 * 이전엔 0.78/0.5로 본문 글자보다 진해 시선 분산이 컸음. hairline 톤으로 낮춤.
 */
const editorialRuleColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'

const softRuleColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'

const mutedTextColor = (mode: 'light' | 'dark') =>
  mode === 'dark' ? 'rgba(255,255,255,0.66)' : 'rgba(15,23,42,0.62)'

/* ─── Section header — '순서 변경' 토글(공용 S.SectionHeader 안에 배치) ─── */

const ManageToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text.tertiary : softRuleColor(theme.mode)};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : mutedTextColor(theme.mode)};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const ReorderBtn = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`


/* ─── Person list (vertical, hairline separators) ─── */

const PersonList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const PersonRow = styled.li`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 18px 12px;
  margin: 0 -12px;
  border-radius: 10px;
  border-bottom: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  }

  @media (max-width: 540px) {
    grid-template-columns: 52px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 14px 12px;
  }

  @media (max-width: 400px) {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 10px;
  }
`

const PersonAvatarBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: block;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const PersonAvatar = styled.span<{ $hasImage: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  background: ${({ theme, $hasImage }) =>
    $hasImage
      ? 'transparent'
      : theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1;
  /* 정사각 — editorial photo */
  border-radius: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* NYT 흑백 톤 */
    filter: grayscale(0.4) contrast(1.03);
    transition: filter 0.18s;
  }

  ${PersonAvatarBtn}:hover & img {
    filter: grayscale(0) contrast(1);
  }

  @media (max-width: 540px) {
    width: 52px;
    height: 52px;
    font-size: 21px;
  }

  @media (max-width: 400px) {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
`

const PersonBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-top: 2px;
`

const PersonNameBtn = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.012em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  line-height: 1.25;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
    outline: none;
  }
`

const PersonRoleLine = styled.div`
  font-style: italic;
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.005em;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  /* InlineText placeholder — empty state는 더 약하게 */
  [data-empty='true'] {
    font-style: italic;
    opacity: 0.55;
  }
`

const PersonNoteLine = styled.div<{ $hasContent: boolean }>`
  font-size: 14px;
  line-height: 1.62;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-top: 4px;

  /**
   * 빈 상태도 항상 placeholder가 보이도록 유지(과거엔 opacity 0 → hover 시 0.7로
   * 노출했는데, touch/포인터 환경에서는 hover 진입 자체가 없어 "비고 추가"가
   * 발견되지 않는 문제가 있었음). role 줄과 일관되게 약하게 항상 노출.
   */
  ${({ $hasContent }) =>
    !$hasContent &&
    css`
      [data-empty='true'] {
        opacity: 0.55;
        font-style: italic;
      }
    `}
`

const RemoveInline = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.14s, color 0.14s;

  ${PersonRow}:hover &,
  ${PersonRow}:focus-within & {
    opacity: 0.7;
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.error};
    outline: none;
  }

  /**
   * 터치/포인터 hover 미지원 환경은 hover-only 진입이 불가하므로 항상 노출.
   * 키보드 사용자도 :focus-visible로 1.0까지 올라가지만, 발견성을 위해 매체 쿼리로
   * 보정해 둔다.
   */
  @media (hover: none) {
    opacity: 0.7;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

/* ─── Nations paragraph ─── */

const NationsBlock = styled.div`
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => editorialRuleColor(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const NationsEyebrow = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

/**
 * 비고는 대부분 비어 있다(실측 676행 중 0행). 모든 행에 '비고 추가' 유령 줄을 세우면
 * 14국짜리 사건에서 죽은 줄만 14개가 된다. 내용이 있을 때만 상시 노출하고, 없으면
 * 행에 마우스를 올리거나 포커스가 들어왔을 때만 나타나게 한다.
 */
const CountryNoteLine = styled.div<{ $hasContent: boolean }>`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  ${({ $hasContent }) =>
    !$hasContent &&
    css`
      height: 0;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.14s;

      [data-empty='true'] {
        opacity: 0.55;
        font-style: italic;
      }
    `}
`

/**
 * 역할은 이 지면의 새 축이라 스캔이 돼야 하는데, 이름 옆 회색 글씨로 두니
 * "대한민국 피해국"이 한 덩어리로 읽히고 편집 가능한지도 보이지 않았다.
 * 테두리를 둘러 이름에서 떼어내고, 작지만 또렷한 잉크를 준다.
 */
const CountryRolePicker = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 4px 1px 8px;
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;

  [data-empty='true'] {
    font-style: italic;
    font-weight: 500;
    opacity: 0.6;
  }

  /*
   * InlineSelect의 ▾는 hover에서만 뜨는데, 배지는 그 자리를 18px 비워 두므로 평소엔
   * 한쪽이 빈 알약처럼 보였다. 약하게 상시 노출해 균형을 맞추고 "고를 수 있다"는
   * 신호도 남긴다 — 행에 들어오면 또렷해진다.
   */
  button {
    opacity: 0.4;
  }
`

const CountryList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

/* 인물 행과 같은 골격 — 아바타 열만 없다(국기 이모지는 이름 옆이 자연스러워 생략). */
const CountryRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 14px 12px;
  margin: 0 -12px;
  border-radius: 10px;
  border-bottom: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  /* 빈 비고 줄은 이 행에 들어왔을 때만 펼친다 */
  &:hover ${CountryNoteLine}, &:focus-within ${CountryNoteLine} {
    height: auto;
    opacity: 1;
  }

  &:hover ${CountryRolePicker} button,
  &:focus-within ${CountryRolePicker} button {
    opacity: 1;
  }
`

const CountryBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const CountryNameLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`


const CountryRoleLine = styled.div`
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-empty='true'] {
    font-style: italic;
    opacity: 0.55;
  }
`



const CountryLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  font-weight: 500;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    outline: none;
  }
`

/* 역사 국가도 /country/:histId 상세가 실존 — 현대국(CountryLink)과 동일한
 * 링크 어포던스(hover·focus-visible 밑줄)를 상속하고 이탤릭 톤만 덧입힌다. */
const HistoricalCountryName = styled(CountryLink)`
  font-style: italic;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.78)'
      : 'rgba(15,23,42,0.74)'};
`




/* ─── Add buttons (editorial) ─── */

const AddBtn = styled.button`
  align-self: flex-start;
  margin-top: 14px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.14s;

  &::before {
    content: '+';
    font-size: 13px;
    line-height: 1;
    letter-spacing: 0;
    margin-right: 2px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
    border-radius: 2px;
  }
`
