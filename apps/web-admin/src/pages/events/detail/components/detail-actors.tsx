import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiArrowDown, FiArrowUp, FiSettings, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
  RADIUS,
} from '@/pages/events/ledger/styles/ledger-tokens'

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
 * - 인물·국가는 같은 모양의 무리 머리글(이름 · 수 · + 추가)로 연다 — 예전엔 국가에만
 *   머리글이 있고 '+ 인물 추가'가 두 목록 사이에 떠 있었다.
 * - 비고·서술은 절반이 150자를 넘어(인물 비고 83/160) 15명짜리 사건에서 섹션이
 *   4,000px을 넘었다. 2줄에서 접고 '더 보기'로 펼친다. 시드가 쓰는 `*강조*`는 굵게 렌더.
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
  /**
   * 인물은 앞 PERSON_PREVIEW_COUNT명만 보이고 '모두 보기'로 펼친다 — 15명짜리 사건에서
   * 인물 목록만 2,100px을 넘었다. 순서 변경 중엔 전원이 보여야 옮길 수 있어 강제로 펼친다.
   */
  const [showAllPersons, setShowAllPersons] = useState(false)

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
    /* 새 인물은 끝에 붙는다 — 접혀 있으면 추가한 사람이 안 보이므로 펼친다. */
    if (persons.length >= PERSON_PREVIEW_COUNT) setShowAllPersons(true)
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
        flagEmoji: country.flagEmoji ?? null,
        isHistorical: false,
        role: country.role ?? null,
        roleDescription: country.roleDescription ?? null,
        note: country.note ?? null,
        sortOrder: country.sortOrder ?? index,
      })),
      ...historicalCountries.map((country, index) => ({
        id: country.id,
        name: country.name,
        flagEmoji: null,
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
        flagEmoji: null,
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
  const personsCollapsed =
    !showAllPersons && !manageMode && persons.length > PERSON_PREVIEW_COUNT
  const showAllToggleRef = useRef<HTMLButtonElement>(null)
  /**
   * 긴 목록을 접으면 버튼이 수천 px 위로 올라가 화면엔 국가 목록 한가운데가 남는다.
   * 접은 직후 버튼을 화면에 다시 데려온다.
   */
  const togglePersons = () => {
    const willCollapse = showAllPersons
    setShowAllPersons(!showAllPersons)
    if (willCollapse) {
      requestAnimationFrame(() =>
        showAllToggleRef.current?.scrollIntoView({ block: 'center' }),
      )
    }
  }
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
          {canManage && (
            <S.SectionActions>
              <ManageToggle
                type="button"
                onClick={() => setManageMode((previous) => !previous)}
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
                아직 등록된 인물·국가가 없습니다. <strong>인물 추가</strong>·
                <strong>국가 추가</strong>로 시작하세요.
              </S.EmptyStateLine>
            </S.EmptyStateHead>
          </S.EmptyState>
        )}

        {/* 인물 — 세로 리스트, hairline 구분선 */}
        <GroupHead>
          <GroupLabel>
            인물
            {persons.length > 0 && <GroupCount>{persons.length}</GroupCount>}
          </GroupLabel>
          <AddBtn type="button" onClick={() => setPersonModalOpen(true)}>
            인물 추가
          </AddBtn>
        </GroupHead>
        {persons.length > 0 && (
          <PersonList>
            {(personsCollapsed
              ? persons.slice(0, PERSON_PREVIEW_COUNT)
              : persons
            ).map((person, idx) => {
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
                      <ClampedProse measureKey={person.note ?? ''}>
                        <InlineText
                          value={person.note ?? ''}
                          onSave={(next) =>
                            updatePerson(person.personId, { note: next })
                          }
                          placeholder="비고 추가"
                          label={`${fullName} 비고`}
                          multiline
                          /* 여러 줄 비고 — Enter는 줄바꿈, 저장은 blur로. */
                          multilineEnter
                          renderRead={renderEmphasis}
                        />
                      </ClampedProse>
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
        {persons.length > PERSON_PREVIEW_COUNT && !manageMode && (
          <ShowAllToggle
            ref={showAllToggleRef}
            type="button"
            aria-expanded={showAllPersons}
            onClick={togglePersons}
          >
            {showAllPersons
              ? '접기'
              : `${persons.length}명 모두 보기 (+${persons.length - PERSON_PREVIEW_COUNT})`}
          </ShowAllToggle>
        )}

        {/* 참여국 — 인물 행과 같은 편집 수준(역할·서술·비고) */}
        <NationsBlock>
          <GroupHead>
            <GroupLabel>
              국가
              {totalCountries > 0 && <GroupCount>{totalCountries}</GroupCount>}
            </GroupLabel>
            <AddBtn type="button" onClick={() => setCountryModalOpen(true)}>
              국가 추가
            </AddBtn>
          </GroupHead>
          {countryRows.length > 0 && (
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
                          {row.flagEmoji && (
                            <CountryFlag aria-hidden>{row.flagEmoji}</CountryFlag>
                          )}
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
                        <ClampedProse measureKey={row.roleDescription ?? ''}>
                          <InlineText
                            value={row.roleDescription ?? ''}
                            onSave={(next) =>
                              updateCountry(rowKey, { roleDescription: next })
                            }
                            placeholder="이 나라가 한 일 추가"
                            label={`${row.name}이(가) 한 일`}
                            multiline
                            multilineEnter
                            renderRead={renderEmphasis}
                          />
                        </ClampedProse>
                      </CountryRoleLine>
                      <CountryNoteLine $hasContent={hasNote}>
                        <InlineText
                          value={row.note ?? ''}
                          onSave={(next) => updateCountry(rowKey, { note: next })}
                          placeholder="비고 추가"
                          multiline
                          multilineEnter
                          renderRead={renderEmphasis}
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
          )}
        </NationsBlock>
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

/**
 * 시드·편집자가 비고에 쓰는 `*강조*`(한 겹 별표) → 굵게. 실측 인물 비고 49/160,
 * 국가 서술 28/307행이 쓴다. 한글 이탤릭은 기울기만 흉내 내 읽기 어려워 굵기로 옮긴다.
 * 줄을 넘는 별표·짝 없는 별표는 그대로 둔다(편집 진입 시엔 원문 그대로).
 */
const EMPHASIS_PATTERN = /\*([^*\n]+)\*/g

function renderEmphasis(text: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(EMPHASIS_PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(<strong key={start}>{match[1]}</strong>)
    cursor = start + match[0].length
  }
  if (parts.length === 0) return text
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

const CLAMP_LINES = 2
const PERSON_PREVIEW_COUNT = 6

/**
 * 긴 산문을 2줄에서 접는다. 넘칠 때만 '더 보기'를 단다(짧은 글엔 흔적 없음).
 * 편집 중(focus-within)엔 CSS가 접힘을 풀어 textarea가 잘리지 않게 한다.
 */
function ClampedProse({
  children,
  measureKey,
}: {
  children: ReactNode
  /** 값이 바뀌면 넘침을 다시 잰다 — 접힌 상자는 크기가 그대로라 관찰자가 못 잡는다. */
  measureKey: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box || expanded) return
    /*
     * 반 줄 미만 넘침은 넘침이 아니다 — 인라인 키트의 inline-flex 호스트가 1~2px를
     * 더 먹어, 딱 2줄인 글에도 '더 보기'가 붙고 마지막 줄이 흐려졌다(실측 +1.5px).
     */
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(box).lineHeight) || 20
      setOverflowing(box.scrollHeight - box.clientHeight > lineHeight / 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [expanded, measureKey])

  const collapsed = !expanded
  return (
    <>
      <ProseClamp
        ref={boxRef}
        $collapsed={collapsed}
        $faded={collapsed && overflowing}
      >
        {children}
      </ProseClamp>
      {(overflowing || expanded) && (
        <MoreToggle
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '접기' : '더 보기'}
        </MoreToggle>
      )}
    </>
  )
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
  border-radius: ${RADIUS.SM};
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
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
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
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
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
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
  padding: 14px 12px;
  margin: 0 -12px;
  border-radius: ${RADIUS.MD};
  border-bottom: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.015)'};
  }

  @media (max-width: 400px) {
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 12px;
  }
`

const PersonAvatarBtn = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: block;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const PersonAvatar = styled.span<{ $hasImage: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  background: ${({ theme, $hasImage }) =>
    $hasImage
      ? 'transparent'
      : theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.06)'
      : 'rgba(15, 23, 42, 0.05)'};
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  font-size: 18px;
  font-weight: 600;
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

  @media (max-width: 400px) {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
`

const PersonBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const PersonNameBtn = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
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

/* 한글 이탤릭은 기울기만 흉내 내 흐려 보인다 — 역할은 곧은 보조 잉크로 */
const PersonRoleLine = styled.div`
  font-size: 13.5px;
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
  display: flex;
  flex-direction: column;

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
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
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
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => editorialRuleColor(theme.mode)};
  display: flex;
  flex-direction: column;
`

/**
 * 무리 머리글 — 인물·국가가 같은 모양으로 연다(라벨 · 수 ······ + 추가).
 * 한글 라벨이라 라틴 스몰캡스 트래킹(0.18em)을 쓰지 않는다 — 낱자로 흩어진다.
 */
const GroupHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
`

const GroupLabel = styled.h3`
  margin: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const GroupCount = styled.span`
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
`

/**
 * 2줄 접힘. 높이는 줄 수 × 1lh(부모 line-height) — 인물 1.62·국가 1.6 어느 쪽이든 맞는다.
 * 편집 중엔 풀어서 textarea가 잘리지 않게 한다.
 */
const ProseClamp = styled.div<{ $collapsed: boolean; $faded: boolean }>`
  ${({ $collapsed }) =>
    $collapsed &&
    css`
      /* +4px — 호스트가 더 먹는 1~2px에 마지막 줄 받침이 잘리지 않게 */
      max-height: calc(${CLAMP_LINES} * 1lh + 4px);
      overflow: hidden;
    `}
  ${({ $faded }) =>
    $faded &&
    css`
      mask-image: linear-gradient(to bottom, #000 calc(100% - 1lh), transparent);
    `}

  &:focus-within {
    max-height: none;
    mask-image: none;
  }

  /* 산문 속 강조는 굵기로 — 잉크는 본문과 같게 */
  strong {
    font-weight: 650;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /*
   * 인라인 키트의 점선 밑줄은 한 줄짜리 값의 편집 신호다. 여러 줄 산문 전체에 깔리면
   * 글보다 선이 먼저 읽힌다 — 산문은 행에 들어왔을 때만 밑줄을 띄운다(✎는 그대로).
   */
  [data-edit-host] > span:first-child:not([data-empty='true']) {
    text-decoration-color: transparent;
  }

  li:hover & [data-edit-host] > span:first-child:not([data-empty='true']),
  li:focus-within & [data-edit-host] > span:first-child:not([data-empty='true']) {
    text-decoration-color: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 인물 목록 '모두 보기' — 목록 폭 전체를 쓰는 얇은 버튼. 행 구분선과 같은 룰을 위에 둔다. */
const ShowAllToggle = styled.button`
  display: block;
  width: 100%;
  margin-top: 0;
  padding: 10px 0;
  border: none;
  border-top: 1px solid ${({ theme }) => softRuleColor(theme.mode)};
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  color: ${({ theme }) => mutedTextColor(theme.mode)};
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.025)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
`

const MoreToggle = styled.button`
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  font-style: normal;
  color: ${({ theme }) => mutedTextColor(theme.mode)};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.FOCUS};
  }
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
  border-radius: ${RADIUS.PILL};
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
  border-radius: ${RADIUS.MD};
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
  display: flex;
  flex-direction: column;
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-empty='true'] {
    font-style: italic;
    opacity: 0.55;
  }
`



const CountryFlag = styled.span`
  margin-right: 6px;
  font-style: normal;
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
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  /* 한글 라벨 — 라틴 스몰캡스(uppercase + 0.16em)를 걷는다. */
  letter-spacing: 0.04em;
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
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 3px;
    border-radius: ${RADIUS.FOCUS};
  }
`
