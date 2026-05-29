import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowDown, FiArrowUp, FiSettings, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import { getAllCountries } from '@/shared/api/countries'
import { type UpdateEventDto } from '@/shared/api/events'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'

interface DetailActorsProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 인물 클릭 시 상세 모달 오픈. 페이지 레벨 단일 모달이 처리. */
  onPersonClick: (personId: string) => void
}

/**
 * 참여 행위자 — NYT editorial dramatis personae 사이드바.
 *
 * 디자인 의도
 * - 카드/필/배경색 폐기. 검정 1px 헤어라인 룰만으로 구획 (신문 룰).
 * - 타이틀: 큰 세리프 + italic subtitle, 그 아래 굵은 룰.
 * - 인물: 세로 리스트, 정사각 60px 아바타(b&w 톤) + bold serif 이름 + italic 역할
 *   + 본문체 비고. 행 사이 1px 라이트 룰.
 * - 국가: smallcaps `Nations` 라벨 + 본문 단락(현대 roman / 역사 italic, 가운뎃점 구분).
 * - 액션(×, 편집)은 hover 시에만 노출.
 */
export function DetailActors({
  event,
  onPatch,
  onPersonClick,
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

  const { data: allPersons = [] } = useQuery({
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
    patchPersons(
      persons.filter((p) => p.personId !== personId).map(toPersonPayload),
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

  const addPerson = (personId: string) => {
    if (persons.some((p) => p.personId === personId)) {
      setPersonModalOpen(false)
      return
    }
    patchPersons([...persons.map(toPersonPayload), { personId }])
    setPersonModalOpen(false)
  }

  const removeCountry = (id: string, isHistorical: boolean) => {
    if (isHistorical) {
      onPatch({
        relatedHistoricalCountryIds: historicalCountries
          .filter((c) => c.id !== id)
          .map((c) => c.id),
      })
    } else {
      onPatch({
        relatedCountryIds: modernCountries.filter((c) => c.id !== id).map((c) => c.id),
      })
    }
  }

  /** 국가 순서 이동 — 현대/역사 각 배열 안에서만 이동. 두 그룹 간 이동은 미지원. */
  const moveCountry = (id: string, isHistorical: boolean, dir: -1 | 1) => {
    const arr = isHistorical ? historicalCountries : modernCountries
    const idx = arr.findIndex((c) => c.id === id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    const next = arr.slice()
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    if (isHistorical) {
      onPatch({ relatedHistoricalCountryIds: next.map((c) => c.id) })
    } else {
      onPatch({ relatedCountryIds: next.map((c) => c.id) })
    }
  }

  const addCountry = (country: { id: string; isHistorical: boolean }) => {
    if (country.isHistorical) {
      if (historicalCountries.some((c) => c.id === country.id)) return
      onPatch({
        relatedHistoricalCountryIds: [
          ...historicalCountries.map((c) => c.id),
          country.id,
        ],
      })
    } else {
      if (modernCountries.some((c) => c.id === country.id)) return
      onPatch({
        relatedCountryIds: [...modernCountries.map((c) => c.id), country.id],
      })
    }
  }

  const selectedCountryIds = useMemo(
    () => [
      ...modernCountries.map((c) => c.id),
      ...historicalCountries.map((c) => c.id),
    ],
    [modernCountries, historicalCountries],
  )

  const totalCountries = modernCountries.length + historicalCountries.length
  const hasAnything =
    persons.length > 0 || totalCountries > 0

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
          {(persons.length > 1 || totalCountries > 1) && (
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
            <S.EmptyStateLine>
              아직 등록된 인물·국가가 없습니다. 아래 버튼으로 추가하세요.
            </S.EmptyStateLine>
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
                    <PersonRoleLine onClick={(e) => e.stopPropagation()}>
                      <InlineText
                        value={person.role ?? ''}
                        onSave={(next) =>
                          updatePerson(person.personId, { role: next })
                        }
                        placeholder="역할 추가"
                      />
                    </PersonRoleLine>
                    <PersonNoteLine
                      $hasContent={hasNote}
                      onClick={(e) => e.stopPropagation()}
                    >
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

        {/* 국가 — smallcaps 라벨 + 본문 단락 */}
        {(modernCountries.length > 0 || historicalCountries.length > 0) && (
          <NationsBlock>
            <NationsEyebrow>관련국</NationsEyebrow>
            <NationsParagraph>
              {modernCountries.map((country, i) => (
                <NationItem key={country.id}>
                  <CountryLink
                    to={pathKeys.countryDetail(country.id)}
                  >
                    {country.name}
                  </CountryLink>
                  {manageMode && (
                    <>
                      <NationReorder
                        type="button"
                        onClick={() => moveCountry(country.id, false, -1)}
                        disabled={i === 0}
                        aria-label={`${country.name} 앞으로`}
                      >
                        <FiArrowUp />
                      </NationReorder>
                      <NationReorder
                        type="button"
                        onClick={() => moveCountry(country.id, false, 1)}
                        disabled={i === modernCountries.length - 1}
                        aria-label={`${country.name} 뒤로`}
                      >
                        <FiArrowDown />
                      </NationReorder>
                    </>
                  )}
                  <NationRemove
                    type="button"
                    onClick={() => removeCountry(country.id, false)}
                    aria-label={`${country.name} 제거`}
                  >
                    ×
                  </NationRemove>
                  {i < modernCountries.length - 1 && (
                    <NationSep>·</NationSep>
                  )}
                </NationItem>
              ))}
              {modernCountries.length > 0 && historicalCountries.length > 0 && (
                <NationHardSep>—</NationHardSep>
              )}
              {historicalCountries.map((country, i) => (
                <NationItem key={country.id}>
                  <HistoricalCountryName>{country.name}</HistoricalCountryName>
                  {manageMode && (
                    <>
                      <NationReorder
                        type="button"
                        onClick={() => moveCountry(country.id, true, -1)}
                        disabled={i === 0}
                        aria-label={`${country.name} 앞으로`}
                      >
                        <FiArrowUp />
                      </NationReorder>
                      <NationReorder
                        type="button"
                        onClick={() => moveCountry(country.id, true, 1)}
                        disabled={i === historicalCountries.length - 1}
                        aria-label={`${country.name} 뒤로`}
                      >
                        <FiArrowDown />
                      </NationReorder>
                    </>
                  )}
                  <NationRemove
                    type="button"
                    onClick={() => removeCountry(country.id, true)}
                    aria-label={`${country.name} 제거`}
                  >
                    ×
                  </NationRemove>
                  {i < historicalCountries.length - 1 && (
                    <NationSep>·</NationSep>
                  )}
                </NationItem>
              ))}
            </NationsParagraph>
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
  transition: color 0.14s, border-color 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
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

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const NationReorder = styled.button`
  margin-left: 4px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  vertical-align: 1px;
  transition: color 0.14s, background 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 10px;
    height: 10px;
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
  padding: 18px 0;
  border-bottom: 1px solid ${({ theme }) => softRuleColor(theme.mode)};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 540px) {
    grid-template-columns: 52px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 14px 0;
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

const NationsParagraph = styled.p`
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: -0.005em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
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

const HistoricalCountryName = styled.span`
  font-style: italic;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.78)'
      : 'rgba(15,23,42,0.74)'};
`

const NationSep = styled.span`
  margin: 0 8px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.32)'
      : 'rgba(15,23,42,0.28)'};
`

const NationHardSep = styled.span`
  margin: 0 12px;
  color: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.45)'
      : 'rgba(15,23,42,0.45)'};
`

/**
 * 국가 칩 단위 wrapper — hover 그룹을 단락 전체가 아닌 *해당 칩만*으로 좁혀
 * × 버튼이 다른 칩 호버 시 깜빡이지 않게.
 */
const NationItem = styled.span`
  /* 칩 단위 hover 그룹 */
`

const NationRemove = styled.button`
  margin-left: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  opacity: 0;
  vertical-align: 1px;
  transition: opacity 0.14s, color 0.14s;

  ${NationItem}:hover &,
  ${NationItem}:focus-within & {
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

  /* 터치/포인터 hover 미지원 환경은 항상 노출. */
  @media (hover: none) {
    opacity: 0.7;
  }
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

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
  }
`
