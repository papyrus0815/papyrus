/**
 * 인물 선택 모달 - 공용 컴포넌트
 * 이름, 생몰년도로 검색 가능
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'
import { createPortal } from 'react-dom'

import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiLoader,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { PersonResponseDto } from '@/shared/api/persons'
import { createPerson } from '@/shared/api/persons'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { glassCardMixin } from '@/shared/styles/mixins'
import { Z_INDEX } from '@/shared/styles/z-index'
import { notify } from '@/shared/ui/toast'

interface PersonSelectModalProps {
  persons: PersonResponseDto[]
  selectedPersonId: string
  onSelect: (personId: string, personName: string) => void
  onClose: () => void
  /** 표시 목록에서 제외할 인물 ID들 (자기 자신·이미 다른 가족 슬롯에 들어간 인물 등) */
  excludeIds?: string[]
  /** 선택 불가 사유 안내 (excludeIds로 결과가 0건일 때 빈 상태에 노출) */
  excludeReason?: string
  /** 모달 제목 (예: "아버지 선택") — 미지정 시 "인물 선택" */
  title?: string
  /** 검색 placeholder (예: "아버지로 등록할 인물을 검색...") */
  searchPlaceholder?: string
  /**
   * 인라인 "+ 새 인물 등록"의 국가 기본값. 있으면 등록 시 이 국가로 저장.
   * 없어도 allowCreate가 true면 국가 없이 등록 가능(고대·국가미상 인물).
   */
  defaultCountryId?: string
  /**
   * 인라인 새 인물 등록 진입점 노출 여부. 미지정 시 기존 동작(defaultCountryId 유무로 게이트).
   * 국가가 없는 인물(예: 고대 인물)의 가족 추가에서도 등록을 허용하려면 명시적으로 true.
   */
  allowCreate?: boolean
  /** 인라인 등록으로 새 인물이 생성된 경우 콜백 — 부모가 로컬 인물 목록을 갱신할 수 있도록. */
  onCreatedPerson?: (person: PersonResponseDto) => void
  /**
   * 연속 추가 모드. true면 인물을 골라도 모달이 닫히지 않고, 방금 추가한 인물은
   * "추가됨"으로 표시되어 중복 선택이 막힌다. 하단 "완료" 버튼으로 닫는다.
   * 사건 참여자처럼 여러 명을 한 번에 넣는 흐름용. 미지정 시 기존처럼 1건 선택 후 자동 닫힘.
   */
  multiSelect?: boolean
  /** 인물 목록 로딩 중 여부 — 첫 오픈 시 fetch 대기 동안 빈 상태 대신 로더를 노출. */
  loading?: boolean
  /**
   * 목록 상단에 고정할 인물 ID들(유력 후보 — 예: 자녀의 반대편 부모 후보로 ego의 배우자).
   * 검색·필터는 그대로 적용되고, 정렬 결과에서 핀 그룹만 위로 부상한다(그룹 내 상대 순서 유지).
   */
  pinnedIds?: string[]
}

type SortOption = 'name' | 'birth-asc' | 'birth-desc'

export const PersonSelectModal: React.FC<PersonSelectModalProps> = ({
  persons,
  selectedPersonId,
  onSelect,
  onClose,
  excludeIds,
  excludeReason,
  title,
  searchPlaceholder,
  defaultCountryId,
  allowCreate,
  onCreatedPerson,
  multiSelect = false,
  loading = false,
  pinnedIds,
}) => {
  // 모달이 떠 있는 동안 배경 스크롤 잠금 (참조 카운트 방식이라 중첩 모달에도 안전).
  useBodyScrollLock(true)

  // 포커스 트랩 — Tab이 모달 밖으로 새지 않게 가두고, 닫힐 때 직전 포커스 복원.
  const modalBoxRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalBoxRef, true)

  const excludeSet = useMemo(
    () => new Set((excludeIds ?? []).filter(Boolean)),
    [excludeIds],
  )
  const playClickSound = useClickSound()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  /**
   * 연속 추가 모드에서 이번 세션에 추가한 인물 id. 부모 excludeIds가 patch 반영으로
   * 늦게 갱신돼도 즉시 "추가됨" 피드백을 주고, 갱신 후에도 목록에서 사라지지 않게 유지한다.
   */
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set())

  /** 키보드 내비게이션 — ↑↓로 이동, Enter로 선택. 현재 강조된 카드 index. */
  const [activeIndex, setActiveIndex] = useState(0)
  /** 리스트 스크롤 뷰포트 — 가상 스크롤의 scroll element. */
  const listViewportRef = useRef<HTMLDivElement>(null)
  /** 검색 입력 — 포커스 트랩이 초기 포커스를 잡은 뒤 검색창으로 다시 옮긴다. */
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ─── 인라인 새 인물 등록 ───────────────────────────────────────────────
  // 기존 동작(country 유무 게이트)을 유지하되, allowCreate가 명시되면 그 값 우선.
  const canCreate = allowCreate ?? !!defaultCountryId
  const [createMode, setCreateMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSurname, setNewSurname] = useState('')
  const [newGender, setNewGender] = useState<'' | 'MALE' | 'FEMALE'>('')
  const [newBirthYear, setNewBirthYear] = useState('')
  const [newDeathYear, setNewDeathYear] = useState('')
  const [creating, setCreating] = useState(false)

  const enterCreate = () => {
    playClickSound()
    // 검색어를 이름 필드에 자동 채움 — "검색했는데 못 찾음 → 등록" 흐름 가속.
    setNewName(searchQuery.trim())
    setNewSurname('')
    setNewGender('')
    setNewBirthYear('')
    setNewDeathYear('')
    setCreateMode(true)
  }

  const exitCreate = () => {
    if (creating) return
    setCreateMode(false)
  }

  const handleCreateSubmit = async () => {
    if (!newName.trim()) {
      notify.error('이름을 입력해 주세요.')
      return
    }
    if (!newSurname.trim()) {
      notify.error('성을 입력해 주세요.')
      return
    }
    if (!newGender) {
      notify.error('성별을 선택해 주세요.')
      return
    }
    setCreating(true)
    try {
      const payload: any = {
        name: newName.trim(),
        surname: newSurname.trim(),
        gender: newGender,
        // 국가 기본값이 있으면 사용, 없으면 국가 없이 등록(고대·국가미상 인물 허용).
        ...(defaultCountryId ? { countryId: defaultCountryId } : {}),
      }
      if (newBirthYear.trim()) {
        const y = parseInt(newBirthYear, 10)
        if (!isNaN(y) && y >= 1 && y <= 9999) {
          payload.birth = { era: 'AD', year: y }
        }
      }
      if (newDeathYear.trim()) {
        const y = parseInt(newDeathYear, 10)
        if (!isNaN(y) && y >= 1 && y <= 9999) {
          payload.death = { era: 'AD', year: y }
        }
      }
      const created = await createPerson(payload)
      notify.success('인물을 등록했습니다.')
      onCreatedPerson?.(created)
      const fullName = getPersonDisplayName(created)
      onSelect(created.id, fullName)
      onClose()
    } catch (err: any) {
      notify.error(err?.message ?? '등록에 실패했습니다.')
    } finally {
      setCreating(false)
    }
  }

  // 필터 상태 (직업 필터는 응답 DTO에 jobId가 없어 항상 빈 옵션이라 제거)
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [filterDynasty, setFilterDynasty] = useState<string>('')
  const [filterReligion, setFilterReligion] = useState<string>('')

  /**
   * 필터 옵션 — id 원문 대신 사람이 읽을 수 있는 이름으로. country/dynasty/religion은
   * 응답 DTO에 nested { id, name }가 함께 와서 추가 fetch 없이 라벨 맵을 만들 수 있다.
   */
  type FilterOption = { id: string; name: string }
  const dedupeByName = (entries: FilterOption[]): FilterOption[] => {
    const map = new Map<string, string>()
    entries.forEach(({ id, name }) => {
      if (id && !map.has(id)) map.set(id, name)
    })
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'ko'),
    )
  }

  const uniqueCountries = useMemo(
    () =>
      dedupeByName(
        persons
          .filter((p) => p.countryId)
          .map((p) => ({
            id: p.countryId as string,
            name: p.country?.name ?? (p.countryId as string),
          })),
      ),
    [persons],
  )

  const uniqueDynasties = useMemo(
    () =>
      dedupeByName(
        persons
          .filter((p) => p.dynastyId)
          .map((p) => ({
            id: p.dynastyId as string,
            name: p.dynasty?.name ?? (p.dynastyId as string),
          })),
      ),
    [persons],
  )

  const uniqueReligions = useMemo(
    () =>
      dedupeByName(
        persons
          .filter((p) => p.religionId)
          .map((p) => ({
            id: p.religionId as string,
            name: p.religion?.name ?? (p.religionId as string),
          })),
      ),
    [persons],
  )

  // 검색 + 필터링
  const filteredPersons = useMemo(() => {
    // excludeSet은 숨기되, 이번 세션에 추가한 인물(addedIds)은 "추가됨"으로 계속 노출.
    let result =
      excludeSet.size > 0
        ? persons.filter((p) => !excludeSet.has(p.id) || addedIds.has(p.id))
        : persons

    // 검색어 필터
    const query = searchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter((person) => {
        const display = getPersonDisplayName(person).toLowerCase()
        const westernLike = getPersonDisplayName(person, {
          countryDefaultNameDisplayOrder: 'western',
        }).toLowerCase()
        const koreanLike = getPersonDisplayName(person, {
          countryDefaultNameDisplayOrder: 'korean',
        }).toLowerCase()
        const birthYear = person.birthYear ? String(person.birthYear) : ''
        const deathYear = person.deathYear ? String(person.deathYear) : ''

        return (
          display.includes(query) ||
          westernLike.includes(query) ||
          koreanLike.includes(query) ||
          birthYear.includes(query) ||
          deathYear.includes(query)
        )
      })
    }

    // 국가 필터
    if (filterCountry) {
      result = result.filter((person) => person.countryId === filterCountry)
    }

    // 왕조 필터
    if (filterDynasty) {
      result = result.filter((person) => person.dynastyId === filterDynasty)
    }

    // 종교 필터
    if (filterReligion) {
      result = result.filter((person) => person.religionId === filterReligion)
    }

    // 정렬
    result = [...result].sort((personA, personB) => {
      if (sortBy === 'name') {
        const nameA = getPersonDisplayName(personA)
        const nameB = getPersonDisplayName(personB)
        return nameA.localeCompare(nameB, 'ko')
      } else if (sortBy === 'birth-asc') {
        const birthA = personA.birthYear || 9999
        const birthB = personB.birthYear || 9999
        return birthA - birthB
      } else if (sortBy === 'birth-desc') {
        const birthA = personA.birthYear || 0
        const birthB = personB.birthYear || 0
        return birthB - birthA
      }
      return 0
    })

    // 핀 부상 — 검색·필터·정렬을 다 거친 결과에서 유력 후보만 위로 (그룹 내 순서 유지)
    if (pinnedIds && pinnedIds.length > 0) {
      const pinnedSet = new Set(pinnedIds)
      const pinned = result.filter((person) => pinnedSet.has(person.id))
      if (pinned.length > 0) {
        result = [...pinned, ...result.filter((person) => !pinnedSet.has(person.id))]
      }
    }

    return result
  }, [
    persons,
    excludeSet,
    addedIds,
    searchQuery,
    filterCountry,
    filterDynasty,
    filterReligion,
    sortBy,
    pinnedIds,
  ])

  const activeFilterCount = [filterCountry, filterDynasty, filterReligion].filter(
    Boolean,
  ).length

  /** 필터로 쓸 차원이 하나라도 있는지 — 없으면 사이드바를 숨기고 단일 컬럼으로. */
  const hasFilters =
    uniqueCountries.length > 0 ||
    uniqueDynasties.length > 0 ||
    uniqueReligions.length > 0

  /**
   * 가상 스크롤 — 전체 인물 수백~수천 명을 한 번에 렌더하지 않도록.
   * 카드 높이가 균일해 estimateSize 고정 + measureElement로 미세 변동 보정(국가 모달과 동일 패턴).
   */
  const rowVirtualizer = useVirtualizer({
    count: filteredPersons.length,
    getScrollElement: () => listViewportRef.current,
    estimateSize: () => 58,
    overscan: 10,
    measureElement:
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !navigator.userAgent.includes('Firefox')
        ? (el) => (el as HTMLElement).getBoundingClientRect().height
        : undefined,
  })

  const handleSelect = (person: PersonResponseDto) => {
    if (addedIds.has(person.id)) return
    const fullName = getPersonDisplayName(person)
    playClickSound()
    onSelect(person.id, fullName)
    if (multiSelect) {
      // 모달 유지 — 방금 추가한 인물만 "추가됨"으로 잠그고 다음 선택을 받는다.
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.add(person.id)
        return next
      })
    } else {
      onClose()
    }
  }

  // 검색·필터·정렬이 바뀌면 강조 위치를 맨 위로 되돌린다.
  useEffect(() => {
    setActiveIndex(0)
  }, [searchQuery, filterCountry, filterDynasty, filterReligion, sortBy])

  // 강조된 인덱스가 목록 범위를 벗어나면 마지막 항목으로 보정.
  useEffect(() => {
    if (activeIndex > filteredPersons.length - 1) {
      setActiveIndex(Math.max(0, filteredPersons.length - 1))
    }
  }, [filteredPersons.length, activeIndex])

  // 강조 카드를 보이는 영역으로 스크롤 (가상 스크롤이라 index로 지정; 이미 보이면 no-op).
  useEffect(() => {
    if (filteredPersons.length === 0) return
    rowVirtualizer.scrollToIndex(activeIndex, { align: 'auto' })
    // rowVirtualizer는 안정 참조라 deps 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filteredPersons.length])

  /**
   * 초기 포커스를 검색창으로. 포커스 트랩이 rAF로 첫 focusable(닫기 버튼)을 잡으므로,
   * 그보다 뒤에 등록된 rAF로 검색창에 다시 포커스해 "열자마자 타이핑" 흐름을 유지한다.
   */
  useEffect(() => {
    if (createMode) return
    const id = window.requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [createMode])

  // 키보드: Escape 닫기 + ↑↓ 이동 + Enter 선택. 등록 폼(createMode)에서는 비활성.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 상위 모달(가족 등록 등) 위에 떠 있을 수 있어 전파를 막아 이 모달만 닫는다.
        e.stopPropagation()
        onClose()
        return
      }
      if (createMode) return
      // 정렬·필터 select 등 네이티브 폼 컨트롤이 포커스면 화살표/Enter를 양보.
      const tag = (e.target as HTMLElement | null)?.tagName
      const isFormControl = tag === 'SELECT' || tag === 'TEXTAREA'
      if (e.key === 'ArrowDown') {
        if (isFormControl) return
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filteredPersons.length - 1))
      } else if (e.key === 'ArrowUp') {
        if (isFormControl) return
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        // 버튼·select에 포커스가 있으면 네이티브 동작에 맡겨 이중 실행을 막는다.
        if (isFormControl || tag === 'BUTTON') return
        const person = filteredPersons[activeIndex]
        if (person && !addedIds.has(person.id)) {
          e.preventDefault()
          handleSelect(person)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createMode, filteredPersons, activeIndex, addedIds, handleSelect, onClose])

  const clearAllFilters = () => {
    playClickSound()
    setFilterCountry('')
    setFilterDynasty('')
    setFilterReligion('')
  }

  const modal = (
    <ModalOverlay onClick={onClose}>
      <ModalBox
        ref={modalBoxRef}
        role="dialog"
        aria-modal="true"
        aria-label={createMode ? '새 인물 등록' : (title ?? '인물 선택')}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader>
          {createMode ? (
            <CreateBackBtn type="button" onClick={exitCreate} disabled={creating}>
              <FiArrowLeft size={16} />
              검색으로
            </CreateBackBtn>
          ) : null}
          <ModalTitle>
            {createMode ? '새 인물 등록' : (title ?? '인물 선택')}
          </ModalTitle>
          <ModalCloseButton onClick={onClose} aria-label="닫기">
            <FiX size={20} strokeWidth={2.5} />
          </ModalCloseButton>
        </ModalHeader>

        {!createMode && (
          /* 검색 바 + 새 인물 등록 진입점 */
          <SearchSection>
            <SearchWrapper>
              <FiSearch size={20} className="search-icon" />
              <SearchInput
                ref={searchInputRef}
                type="text"
                placeholder={
                  searchPlaceholder ?? '이름 또는 생몰년도로 검색...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchWrapper>
            {canCreate && (
              <CreateEntryBtn
                type="button"
                onClick={enterCreate}
                title="DB에 없는 인물을 즉석에서 등록 (skeleton). 상세는 인물 페이지에서 보강."
              >
                <FiPlus size={14} />
                새 인물
              </CreateEntryBtn>
            )}
          </SearchSection>
        )}

        {createMode ? (
          <CreateFormBody>
            <CreateFormHint>
              필수 정보만 입력해 빠르게 등록합니다. 생몰지·가족·약력 등 상세는 인물 페이지에서 보강할 수 있습니다.
            </CreateFormHint>
            <CreateFormGrid>
              <CreateFormField>
                <CreateFormLabel>성</CreateFormLabel>
                <CreateFormInput
                  type="text"
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value)}
                  placeholder="예: 김"
                  disabled={creating}
                  autoFocus
                />
              </CreateFormField>
              <CreateFormField>
                <CreateFormLabel>이름</CreateFormLabel>
                <CreateFormInput
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 홍길동"
                  disabled={creating}
                />
              </CreateFormField>
              <CreateFormField $span={2}>
                <CreateFormLabel>성별</CreateFormLabel>
                <CreateFormChips role="radiogroup" aria-label="성별">
                  <CreateFormChip
                    type="button"
                    role="radio"
                    aria-checked={newGender === 'MALE'}
                    $active={newGender === 'MALE'}
                    onClick={() => setNewGender('MALE')}
                    disabled={creating}
                  >
                    남성
                  </CreateFormChip>
                  <CreateFormChip
                    type="button"
                    role="radio"
                    aria-checked={newGender === 'FEMALE'}
                    $active={newGender === 'FEMALE'}
                    onClick={() => setNewGender('FEMALE')}
                    disabled={creating}
                  >
                    여성
                  </CreateFormChip>
                </CreateFormChips>
              </CreateFormField>
              <CreateFormField>
                <CreateFormLabel>출생 연도 (선택)</CreateFormLabel>
                <CreateFormInput
                  type="number"
                  min={1}
                  max={9999}
                  value={newBirthYear}
                  onChange={(e) => setNewBirthYear(e.target.value)}
                  placeholder="예: 1397"
                  disabled={creating}
                />
              </CreateFormField>
              <CreateFormField>
                <CreateFormLabel>사망 연도 (선택)</CreateFormLabel>
                <CreateFormInput
                  type="number"
                  min={1}
                  max={9999}
                  value={newDeathYear}
                  onChange={(e) => setNewDeathYear(e.target.value)}
                  placeholder="예: 1450"
                  disabled={creating}
                />
              </CreateFormField>
            </CreateFormGrid>
            <CreateFormActions>
              <CreateFormCancelBtn
                type="button"
                onClick={exitCreate}
                disabled={creating}
              >
                취소
              </CreateFormCancelBtn>
              <CreateFormSubmitBtn
                type="button"
                onClick={handleCreateSubmit}
                disabled={creating}
              >
                {creating ? '등록 중…' : '등록 후 이 슬롯에 지정'}
              </CreateFormSubmitBtn>
            </CreateFormActions>
          </CreateFormBody>
        ) : (
        <SplitModalBody $noSidebar={!hasFilters}>
          {/* 좌측: 필터 사이드바 — 필터 차원이 하나도 없으면 숨김 */}
          {hasFilters && (
          <FilterSidebar>
            <FilterSidebarHeader>
              <span className="label">필터</span>
              {activeFilterCount > 0 && (
                <FilterBadge>{activeFilterCount}</FilterBadge>
              )}
            </FilterSidebarHeader>

            {/* 국가 필터 */}
            <FilterGroup>
              <FilterLabel>
                <FiMapPin size={12} />
                국가
              </FilterLabel>
              <FilterSelect
                value={filterCountry}
                onChange={(e) => {
                  playClickSound()
                  setFilterCountry(e.target.value)
                }}
              >
                <option value="">전체</option>
                {uniqueCountries.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </FilterSelect>
            </FilterGroup>

            {/* 왕조 필터 */}
            {uniqueDynasties.length > 0 && (
              <FilterGroup>
                <FilterLabel>
                  <FiCalendar size={12} />
                  왕조
                </FilterLabel>
                <FilterSelect
                  value={filterDynasty}
                  onChange={(e) => {
                    playClickSound()
                    setFilterDynasty(e.target.value)
                  }}
                >
                  <option value="">전체</option>
                  {uniqueDynasties.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </FilterSelect>
              </FilterGroup>
            )}

            {/* 종교 필터 */}
            {uniqueReligions.length > 0 && (
              <FilterGroup>
                <FilterLabel>종교</FilterLabel>
                <FilterSelect
                  value={filterReligion}
                  onChange={(e) => {
                    playClickSound()
                    setFilterReligion(e.target.value)
                  }}
                >
                  <option value="">전체</option>
                  {uniqueReligions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </FilterSelect>
              </FilterGroup>
            )}

            {/* 초기화 버튼 */}
            {activeFilterCount > 0 && (
              <>
                <FilterDivider />
                <ResetFiltersButton onClick={clearAllFilters}>
                  <FiX size={14} />
                  필터 초기화
                </ResetFiltersButton>
              </>
            )}
          </FilterSidebar>
          )}

          {/* 우측: 인물 리스트 */}
          <PersonsArea>
            <PersonsHeader>
              {loading && persons.length === 0 ? (
                <ResultCount>
                  <span className="total">불러오는 중…</span>
                </ResultCount>
              ) : filteredPersons.length > 0 ? (
                <ResultCount>
                  <span className="count">{filteredPersons.length}</span>
                  <span className="total">/ {persons.length}명</span>
                </ResultCount>
              ) : (
                <EmptyMessage>검색 결과가 없습니다</EmptyMessage>
              )}
              {/* 정렬 — 국가 모달처럼 리스트 상단에 배치 */}
              <HeaderSortSelect
                value={sortBy}
                aria-label="정렬"
                onChange={(e) => {
                  playClickSound()
                  setSortBy(e.target.value as SortOption)
                }}
              >
                <option value="name">이름순</option>
                <option value="birth-asc">출생일 빠른순</option>
                <option value="birth-desc">출생일 늦은순</option>
              </HeaderSortSelect>
            </PersonsHeader>

            <PersonsList ref={listViewportRef}>
              {loading && persons.length === 0 ? (
                <LoadingState>
                  <SpinnerIcon>
                    <FiLoader size={28} strokeWidth={2} />
                  </SpinnerIcon>
                  <EmptyText>인물 목록을 불러오는 중…</EmptyText>
                </LoadingState>
              ) : filteredPersons.length === 0 ? (
                <EmptyState>
                  <EmptyIconWrap>
                    <FiUser size={40} strokeWidth={1.5} />
                  </EmptyIconWrap>
                  <EmptyText>검색 결과가 없습니다</EmptyText>
                  <EmptySub>
                    {excludeReason ?? '필터를 조정하거나 검색어를 변경해 보세요'}
                  </EmptySub>
                </EmptyState>
              ) : (
                <VirtualSizer style={{ height: rowVirtualizer.getTotalSize() }}>
                  {rowVirtualizer.getVirtualItems().map((vRow) => {
                    const index = vRow.index
                    const person = filteredPersons[index]
                    if (!person) return null
                    const fullName = getPersonDisplayName(person)
                    const isAdded = addedIds.has(person.id)
                    // 선택 강조는 단일선택 슬롯 전용. '추가됨'은 별도 중립 처리.
                    const isSelected = !isAdded && selectedPersonId === person.id
                    const isActive = index === activeIndex
                    const initial = fullName.trim().charAt(0) || '?'

                    // 생몰년도 포맷팅
                    const birthYear = person.birthYear
                    const deathYear = person.deathYear
                    const lifespan =
                      birthYear || deathYear
                        ? `${birthYear || '?'} ~ ${deathYear || '현재'}`
                        : null
                    const countryName = person.country?.name
                    const flag = person.country?.flagEmoji

                    return (
                      <PersonCard
                        key={person.id}
                        data-index={index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${vRow.start}px)`,
                        }}
                        $selected={isSelected}
                        $added={isAdded}
                        $active={isActive}
                        onClick={() => handleSelect(person)}
                        onMouseEnter={() => setActiveIndex(index)}
                        disabled={isAdded}
                        aria-disabled={isAdded}
                      >
                        <PersonAvatar $selected={isSelected}>
                          {person.profileImageUrl ? (
                            <img src={person.profileImageUrl} alt={fullName} />
                          ) : (
                            <AvatarInitial>{initial}</AvatarInitial>
                          )}
                        </PersonAvatar>

                        <PersonMainInfo>
                          <PersonNameRow>
                            <PersonName>{fullName}</PersonName>
                            {isAdded ? (
                              <AddedTag>
                                <FiCheck size={12} strokeWidth={3} />
                                추가됨
                              </AddedTag>
                            ) : isSelected ? (
                              <SelectedBadge>
                                <FiCheck size={14} strokeWidth={3} />
                              </SelectedBadge>
                            ) : null}
                          </PersonNameRow>

                          <PersonMetaRow>
                            {lifespan ? (
                              <PersonMeta>
                                <FiCalendar size={11} />
                                <span>{lifespan}</span>
                              </PersonMeta>
                            ) : (
                              <PersonDates $empty>생몰 정보 없음</PersonDates>
                            )}
                            {countryName && (
                              <PersonMeta>
                                <FiMapPin size={11} />
                                <span>
                                  {flag ? `${flag} ` : ''}
                                  {countryName}
                                </span>
                              </PersonMeta>
                            )}
                          </PersonMetaRow>
                        </PersonMainInfo>
                      </PersonCard>
                    )
                  })}
                </VirtualSizer>
              )}
            </PersonsList>
          </PersonsArea>
        </SplitModalBody>
        )}

        {!createMode && (
          <ModalFooter>
            <FooterHint aria-hidden>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              이동
              <FooterHintSep>·</FooterHintSep>
              <kbd>↵</kbd>
              선택
              <FooterHintSep>·</FooterHintSep>
              <kbd>esc</kbd>
              닫기
            </FooterHint>
            {multiSelect && (
              <FooterRight>
                <FooterCount>
                  {addedIds.size > 0
                    ? `${addedIds.size}명 추가됨`
                    : '추가할 인물을 선택하세요'}
                </FooterCount>
                <FooterDoneBtn type="button" onClick={onClose}>
                  완료
                </FooterDoneBtn>
              </FooterRight>
            )}
          </ModalFooter>
        )}
      </ModalBox>
    </ModalOverlay>
  )

  if (typeof document === 'undefined') return null

  return createPortal(modal, document.body)
}

/**
 * 인디고 액센트 팔레트 — 앱 테마 primary(#6366f1) 계열을 한 곳에서 관리.
 * 라이트/다크 동일 톤을 의도해 theme 토큰(다크 primary는 #636af2로 미세하게 다름) 대신
 * 모듈 상수로 둔다. rgba(99,102,241,α) halo는 alpha가 제각각이라 인라인 유지.
 */
const ACCENT = '#6366f1' // 선택·강조 기본
const ACCENT_STRONG = '#4f46e5' // hover/pressed
const ACCENT_SOFT = '#818cf8' // 아바타 gradient 보조
const ACCENT_BORDER = '#c7d2fe' // hover border (indigo-200)
const ACCENT_TINT = '#eef2ff' // 라이트 선택 배경

// Styled Components — z-index를 상위 모달보다 높게 해 서브 모달에서도 앞에 표시
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  padding: 24px;
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalBox = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  width: 100%;
  max-width: 920px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);

  /* 모바일: 부모 풀스크린 폼 위에 작은 카드로 뜨지 않게 풀스크린 통일 */
  @media (max-width: 768px) {
    width: 100vw;
    max-width: none;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px) scale(0.99);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.mode === 'dark'
    ? 'rgba(255,255,255,0.03)'
    : 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)'};
`

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  line-height: 1.35;
`

const ModalCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : ACCENT_TINT};
    color: ${ACCENT};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
  }
`

const SearchSection = styled.div`
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 16px 28px 20px;
  > :first-child {
    flex: 1;
    min-width: 0;
  }
`

const CreateEntryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${ACCENT_STRONG};
  background: ${({ theme }) =>
    theme.colors.alert.info.bg};
  border: 1px solid ${({ theme }) =>
    theme.colors.alert.info.border};
  border-radius: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  &:hover {
    color: #fff;
    background: ${ACCENT};
    border-color: ${ACCENT};
  }
`

const CreateBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  margin-right: 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CreateFormBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 28px 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

const CreateFormHint = styled.p`
  margin: 0;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.colors.alert.info.bg};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#e0e7ff'};
  border-radius: 12px;
`

const CreateFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const CreateFormField = styled.div<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${({ $span }) =>
    $span && $span > 1
      ? `grid-column: span ${$span};`
      : ''}
  @media (max-width: 640px) {
    grid-column: span 1;
  }
`

const CreateFormLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CreateFormInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  outline: none;
  &:focus {
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
  &:disabled {
    opacity: 0.6;
  }
`

const CreateFormChips = styled.div`
  display: flex;
  gap: 6px;
`

const CreateFormChip = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? '#fff' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
    $active
      ? ACCENT
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : '#fff'};
  border: 1px solid ${({ $active, theme }) =>
    $active ? ACCENT : theme.colors.border.default};
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    border-color: ${({ $active }) => ($active ? ACCENT_STRONG : '#a5b4fc')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CreateFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-top: 6px;
`

const CreateFormCancelBtn = styled.button`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const CreateFormSubmitBtn = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: ${ACCENT};
  border: 1px solid ${ACCENT};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    background: ${ACCENT_STRONG};
    border-color: ${ACCENT_STRONG};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 18px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
    transition: color 0.2s ease;
  }

  &:focus-within .search-icon {
    color: ${ACCENT};
  }
`

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 18px 14px 48px;
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`

const SplitModalBody = styled.div<{ $noSidebar?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $noSidebar }) =>
    $noSidebar ? '1fr' : '200px 1fr'};
  flex: 1;
  min-height: 0;
  max-height: 56vh;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: 60vh;
  }
`

const FilterSidebar = styled.div`
  background: ${({ theme }) => theme.colors.background.secondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  overflow-y: auto;
  padding: 20px 16px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    max-height: 220px;
  }
`

const FilterSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  .label {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const FilterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: ${ACCENT};
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  margin-left: auto;
`

const FilterGroup = styled.div`
  margin-bottom: 18px;
`

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;

  svg {
    color: ${ACCENT};
    opacity: 0.9;
  }
`

const FilterSelect = styled.select`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${ACCENT_BORDER};
  }
  &:focus {
    border-color: ${ACCENT};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`

const FilterDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.default};
  margin: 16px 0;
  opacity: 0.6;
`

const ResetFiltersButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${ACCENT};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : ACCENT_TINT};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${ACCENT_BORDER};
    color: #ffffff;
  }
`

const PersonsArea = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PersonsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeaderSortSelect = styled.select`
  flex-shrink: 0;
  padding: 7px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 9px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${ACCENT_BORDER};
  }
  &:focus {
    border-color: ${ACCENT};
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`

const ResultCount = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};

  .count {
    color: ${ACCENT};
    font-weight: 700;
  }
  .total {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 500;
  }
`

const EmptyMessage = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #ef4444;
`

const PersonsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px 18px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text.tertiary};
  }
`

/** 가상 스크롤 총 높이를 잡는 relative 컨테이너 — 자식 행은 absolute + translateY. */
const VirtualSizer = styled.div`
  position: relative;
  width: 100%;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
`

const EmptyIconWrap = styled.div`
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 20px;
  opacity: 0.7;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptySub = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PersonCard = styled.button<{
  $selected: boolean
  $added?: boolean
  $active?: boolean
}>`
  width: 100%;
  display: flex;
  align-items: center;
  padding: 9px 12px;
  background: ${({ $selected, $active, theme }) =>
    $selected
      ? theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : ACCENT_TINT
      : $active
        ? theme.colors.background.secondary
        : 'transparent'};
  border: 1px solid
    ${({ $selected, $active, theme }) =>
      $selected ? ACCENT : $active ? ACCENT_BORDER : 'transparent'};
  border-radius: 10px;
  cursor: ${({ $added }) => ($added ? 'default' : 'pointer')};
  opacity: ${({ $added }) => ($added ? 0.6 : 1)};
  /* transform은 가상 스크롤 위치 지정용 — transition에서 제외해야 스크롤 잼이 없다. */
  transition:
    background 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
  box-shadow: ${({ $selected }) =>
    $selected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none'};

  &:hover {
    border-color: ${({ $selected }) => ($selected ? ACCENT : ACCENT_BORDER)};
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : ACCENT_TINT
        : theme.colors.background.secondary};
  }
  &:focus-visible {
    outline: none;
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
  }
  &:disabled {
    pointer-events: none;
  }
`

const AddedTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;

  svg {
    color: #22c55e;
  }
`

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px 24px;
`

const SpinnerIcon = styled.div`
  color: ${ACCENT};
  display: flex;
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(0deg, #fafbff 0%, #ffffff 100%)'};
`

const FooterHint = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#ffffff'};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    border-radius: 5px;
    box-shadow: 0 1px 0 ${({ theme }) => theme.colors.border.default};
  }

  /* 터치 환경엔 물리 키가 없으니 숨김 */
  @media (hover: none) {
    display: none;
  }
`

const FooterHintSep = styled.span`
  margin: 0 3px;
  opacity: 0.6;
`

const FooterRight = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
`

const FooterCount = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const FooterDoneBtn = styled.button`
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: ${ACCENT};
  border: 1px solid ${ACCENT};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
  &:hover {
    background: ${ACCENT_STRONG};
    border-color: ${ACCENT_STRONG};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
  }
`

const PersonAvatar = styled.div<{ $selected?: boolean }>`
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $selected, theme }) =>
    $selected
      ? `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`
      : theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'};
  border-radius: 50%;
  color: ${({ $selected, theme }) => ($selected ? '#ffffff' : theme.colors.text.tertiary)};
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const AvatarInitial = styled.span`
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
`

const PersonMainInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 12px;
`

const PersonNameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const PersonName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
  line-height: 1.3;
`

const SelectedBadge = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${ACCENT};
  color: #ffffff;
  border-radius: 50%;
  flex-shrink: 0;
`

const PersonMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const PersonMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
    opacity: 0.8;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
`

const PersonDates = styled.div<{ $empty?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $empty, theme }) =>
    $empty ? theme.colors.text.tertiary : theme.colors.text.secondary};
`
