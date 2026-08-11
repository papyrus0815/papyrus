import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import styled from 'styled-components'

import { useModalBehavior } from '@/shared/ui/modal'

import * as S from './select-modal.styles'

export interface SelectOption<T = string> {
  value: T
  label: string
  icon?: string
  description?: string
  /**
   * 구획 라벨 — 지정하면 그 이름의 머리글 아래로 묶이고 접을 수 있다.
   * 지정하지 않은 옵션은 머리글 없이 그대로 나열된다(기존 소비자 무영향).
   * 같은 그룹의 옵션은 **연속으로** 넘길 것 — 렌더는 경계 전환에서만 머리글을 낸다.
   */
  group?: string
}

/**
 * 검색 비교용 정규화 — 소문자 + NFKD 분해 후 결합 분음부호 제거.
 * DB(utf8mb4_unicode_ci)는 악센트·전각을 무시하고 매칭하는데 JS includes는 코드포인트
 * 정확 일치라, 서버가 반환한 결과('Königgrätz' ↔ 'konig')를 클라 필터가 다시 숨기는
 * 불일치가 생긴다. NFKD는 전각→반각, NFD 자소 분리 한글도 일관 형태로 접는다.
 */
function foldForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface SelectModalProps<T = string> {
  /** 모달 표시 여부 */
  isOpen: boolean
  /** 모달 닫기 핸들러 */
  onClose: () => void
  /** 모달 제목 */
  title: string
  /** 선택 옵션 목록 */
  options: SelectOption<T>[]
  /** 현재 선택된 값 */
  selectedValue?: T
  /** 선택 핸들러 */
  onSelect: (value: T) => void
  /** 다중 선택 모드 */
  multiple?: boolean
  /** 선택된 값 목록 (다중 선택 모드) */
  selectedValues?: T[]
  /** 추가 헤더 컨텐츠 (예: 전체 해제 버튼) */
  headerExtra?: React.ReactNode
  /** 검색 입력 표시 (옵션 6개 이상이면 자동 노출 권장) */
  searchable?: boolean
  /** 검색 placeholder */
  searchPlaceholder?: string
  /** 로딩 상태 — 옵션 fetching 중 */
  isLoading?: boolean
  /**
   * 검색어 변경 통지 — 부모가 서버사이드 검색으로 options를 갱신할 때 사용.
   * 모달이 닫혀 검색어가 초기화될 때도 ''로 통지된다. 내부 클라이언트 필터는
   * 그대로 동작하므로(서버 결과는 항상 검색어를 포함해 무손실) 부모는 fetch만 하면 된다.
   */
  onQueryChange?: (query: string) => void
  /**
   * 서버 검색 fetch 진행 중 — 필터 결과가 비어도 "검색 결과 없음"을 확정 표기하지
   * 않고 "검색 중…"을 보여준다(디바운스·전송 중 오탐 방지). isLoading(첫 적재)과 달리
   * 목록이 있으면 그대로 두고 빈 상태 문구만 바꾼다.
   */
  isSearching?: boolean
  /**
   * 서버 조회 실패 — 빈 목록을 "결과 없음"으로 오인시키지 않고 오류 상태(재시도 버튼)를
   * 보여준다. 실패가 조용히 삼켜져 "없음"으로 위장하던 것을 보정.
   */
  hasError?: boolean
  /** 오류 상태에서 '다시 시도' 클릭 시 재조회 — 부모가 refetch를 넘긴다. */
  onRetry?: () => void
  /**
   * 처음에 접어 둘 그룹 이름들 — 부차적인 구획(예: "작위·칭호")을 기본으로 숨긴다.
   * 접혀 있어도 머리글과 개수는 항상 보이고, (a) 검색어를 입력하거나 (b) 그 그룹에
   * 현재 선택값이 들어 있으면 자동으로 펼쳐진다. 하드 필터가 아니라 강등이다.
   */
  collapsedGroups?: string[]
}

/** 그룹 머리글의 접힘 표식 — 펼침이면 아래(90°), 접힘이면 오른쪽. */
function GroupChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 공통 선택 모달 컴포넌트
 *
 * @example
 * // 단일 선택
 * <SelectModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="국가 형태 선택"
 *   options={stateTypeOptions}
 *   selectedValue={selectedStateType}
 *   onSelect={handleSelect}
 * />
 *
 * @example
 * // 다중 선택
 * <SelectModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="국가 선택"
 *   options={countryOptions}
 *   multiple
 *   selectedValues={selectedCountries}
 *   onSelect={handleToggle}
 * />
 */
export function SelectModal<T = string>({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  multiple = false,
  selectedValues = [],
  headerExtra,
  searchable,
  searchPlaceholder = '검색...',
  isLoading = false,
  onQueryChange,
  isSearching = false,
  hasError = false,
  onRetry,
  collapsedGroups,
}: SelectModalProps<T>) {
  const [query, setQuery] = useState('')
  /** 사용자가 머리글을 눌러 뒤집은 그룹만 담는다 — 비어 있으면 collapsedGroups가 기본값. */
  const [groupToggles, setGroupToggles] = useState<Record<string, boolean>>({})

  /**
   * a11y 토대 — 손수 만든 portal이라 Esc·포커스 트랩·body 스크롤 락·포커스 복원이
   * 전무했다. 공용 useModalBehavior에 위임(웹앰 규약: 새/기존 모달은 이 훅을 써야 함).
   * containerRef=모달 컨테이너, 초기 포커스는 검색창(없으면 훅이 첫 focusable로 폴백).
   */
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useModalBehavior({
    isOpen,
    onClose,
    containerRef,
    initialFocusRef: searchRef,
  })

  // 모달이 닫히면 검색어 초기화 (서버사이드 검색 부모에게도 통지) + 그룹 접힘도 기본값으로
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setGroupToggles({})
      onQueryChange?.('')
    }
    // onQueryChange 함수 identity 변화로 초기화가 재실행될 이유는 없음 — isOpen에만 반응.
  }, [isOpen])

  const showSearch = searchable ?? options.length >= 6

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const folded = foldForSearch(query.trim())
    return options.filter(
      (opt) =>
        foldForSearch(opt.label).includes(folded) ||
        (opt.description
          ? foldForSearch(opt.description).includes(folded)
          : false),
    )
  }, [options, query])

  /** 그룹별 옵션 수 — 접힌 그룹에도 "몇 개가 숨어 있는지"를 보여주기 위해 필터 뒤에 센다. */
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    filteredOptions.forEach((option) => {
      if (option.group) counts.set(option.group, (counts.get(option.group) ?? 0) + 1)
    })
    return counts
  }, [filteredOptions])

  /**
   * 현재 선택값이 들어 있는 그룹 — 기본 접힘이어도 펼쳐 준다.
   * (수정 모드에서 작위 재임을 열었는데 "작위·칭호"가 접혀 선택 표시가 안 보이는 것 방지)
   */
  const groupsWithSelection = useMemo(() => {
    const selectedKeys = multiple
      ? selectedValues
      : selectedValue === undefined
        ? []
        : [selectedValue]
    const found = new Set<string>()
    options.forEach((option) => {
      if (option.group && selectedKeys.includes(option.value)) found.add(option.group)
    })
    return found
    // selectedValues 기본값이 매 렌더 새 배열이라 참조가 흔들리지만, 계산이 가벼워 문제 없음.
  }, [options, multiple, selectedValues, selectedValue])

  if (!isOpen) return null

  const isSelected = (value: T) => {
    if (multiple) {
      return selectedValues.includes(value)
    }
    return selectedValue === value
  }

  /** 검색과 무관한 '기본 펼침 상태' — 머리글 토글은 이 값을 뒤집어야 한다. */
  const isGroupExpandedByState = (group: string): boolean => {
    const toggled = groupToggles[group]
    if (toggled !== undefined) return toggled
    if (groupsWithSelection.has(group)) return true
    return !(collapsedGroups ?? []).includes(group)
  }

  /**
   * 검색 중이면 무조건 펼침 — 접힌 그룹 때문에 "검색해도 안 나온다"가 생기면 안 된다.
   * 단 이 강제값을 토글의 기준으로 쓰면 안 된다. 검색 중 머리글을 누르면 화면은 그대로인데
   * groupToggles에 false가 박혀, 검색어를 지우는 순간 기본 펼침 그룹이 접혀 버린다.
   */
  const isGroupExpanded = (group: string): boolean =>
    query.trim() ? true : isGroupExpandedByState(group)

  /** 옵션을 순회하며 그룹 경계에서만 머리글을 내고, 접힌 그룹의 옵션은 건너뛴다. */
  const renderOptionRows = () => {
    const rows: React.ReactNode[] = []
    let currentGroup: string | undefined
    let boundaryPassed = false

    filteredOptions.forEach((option) => {
      if (!boundaryPassed || option.group !== currentGroup) {
        currentGroup = option.group
        boundaryPassed = true
        if (option.group) {
          const group = option.group
          const expanded = isGroupExpanded(group)
          rows.push(
            <S.OptionGroupHeader
              key={`group-${group}`}
              type="button"
              aria-expanded={expanded}
              onClick={() =>
                setGroupToggles((prev) => ({
                  ...prev,
                  [group]: !isGroupExpandedByState(group),
                }))
              }
            >
              <GroupChevron open={expanded} />
              <span>{group}</span>
              <S.OptionGroupCount>{groupCounts.get(group) ?? 0}</S.OptionGroupCount>
            </S.OptionGroupHeader>,
          )
        }
      }
      if (option.group && !isGroupExpanded(option.group)) return
      rows.push(
        <S.SelectOption
          key={String(option.value)}
          type="button"
          // 선택 상태를 색·체크 아이콘뿐 아니라 보조기술에도 전달(WCAG 4.1.2).
          // 다중/단일 모두 '눌림'으로 현재 선택을 표현.
          aria-pressed={isSelected(option.value)}
          $active={isSelected(option.value)}
          onClick={() => onSelect(option.value)}
        >
          {option.icon && <S.SelectOptionIcon>{option.icon}</S.SelectOptionIcon>}
          <S.SelectOptionBody>
            <S.SelectOptionText>{option.label}</S.SelectOptionText>
            {option.description && (
              <S.SelectOptionDescription>
                {option.description}
              </S.SelectOptionDescription>
            )}
          </S.SelectOptionBody>
          {isSelected(option.value) && (
            <S.SelectOptionCheck>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                  fill="currentColor"
                />
              </svg>
            </S.SelectOptionCheck>
          )}
        </S.SelectOption>,
      )
    })
    return rows
  }

  /* 라이브 리전 문구 — 로딩/검색중/결과수/없음. 검색창에 포커스가 머문 채 목록만 바뀌어
   * SR이 어떤 전환도 못 받던 것을 보정(WCAG 4.1.3). 옵션 목록이 있을 땐 개수를 알린다. */
  const statusText = isLoading
    ? '불러오는 중'
    : hasError && filteredOptions.length === 0
      ? '불러오지 못했습니다'
      : isSearching
        ? '검색 중'
        : query
          ? filteredOptions.length > 0
            ? `검색 결과 ${filteredOptions.length}건`
            : '검색 결과 없음'
          : ''

  return createPortal(
    <S.SelectModalOverlay
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <S.SelectModal
        ref={containerRef}
        as={motion.div}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <S.SelectModalHeader>
          <S.SelectModalTitle id={titleId}>{title}</S.SelectModalTitle>
          <S.SelectModalClose type="button" onClick={onClose} aria-label="닫기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                fill="currentColor"
              />
            </svg>
          </S.SelectModalClose>
        </S.SelectModalHeader>

        {/* 로딩·검색·결과 상태를 보조기술에 announce — 시각 텍스트만 바뀌던 조용한 갱신 보정. */}
        <VisuallyHidden role="status" aria-live="polite">
          {statusText}
        </VisuallyHidden>

        {headerExtra && <S.HeaderExtraWrapper>{headerExtra}</S.HeaderExtraWrapper>}

        {showSearch && (
          <S.SearchWrapper>
            <S.SearchInput
              ref={searchRef}
              type="text"
              value={query}
              onChange={(changeEvent) => {
                setQuery(changeEvent.target.value)
                onQueryChange?.(changeEvent.target.value)
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
            />
          </S.SearchWrapper>
        )}

        <S.SelectModalContent>
          {isLoading ? (
            <S.EmptyState>
              <S.EmptyIcon>⏳</S.EmptyIcon>
              <S.EmptyTitle>불러오는 중...</S.EmptyTitle>
              <S.EmptyDesc>잠시만 기다려 주세요</S.EmptyDesc>
            </S.EmptyState>
          ) : hasError && filteredOptions.length === 0 ? (
            <S.EmptyState>
              <S.EmptyIcon>⚠️</S.EmptyIcon>
              <S.EmptyTitle>불러오지 못했습니다</S.EmptyTitle>
              <S.EmptyDesc>
                네트워크 오류일 수 있어요 — 잠시 후 다시 시도해 주세요
              </S.EmptyDesc>
              {onRetry && (
                <RetryBtn type="button" onClick={onRetry}>
                  다시 시도
                </RetryBtn>
              )}
            </S.EmptyState>
          ) : filteredOptions.length === 0 ? (
            isSearching ? (
              <S.EmptyState>
                <S.EmptyIcon>🔍</S.EmptyIcon>
                <S.EmptyTitle>검색 중…</S.EmptyTitle>
                <S.EmptyDesc>서버에서 결과를 가져오는 중입니다</S.EmptyDesc>
              </S.EmptyState>
            ) : (
              <S.EmptyState>
                <S.EmptyIcon>{query ? '🔍' : '📭'}</S.EmptyIcon>
                <S.EmptyTitle>
                  {query ? '검색 결과 없음' : '데이터가 없습니다'}
                </S.EmptyTitle>
                <S.EmptyDesc>
                  {query
                    ? `"${query}"에 해당하는 항목을 찾지 못했습니다`
                    : '선택 가능한 항목이 없습니다'}
                </S.EmptyDesc>
              </S.EmptyState>
            )
          ) : (
            renderOptionRows()
          )}
        </S.SelectModalContent>
      </S.SelectModal>
    </S.SelectModalOverlay>,
    document.body,
  )
}

/** 오류 상태 '다시 시도' 버튼. */
const RetryBtn = styled.button`
  margin-top: 12px;
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s, border-color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

/** 시각적으로 숨기되 보조기술엔 노출되는 라이브 리전용 — 표준 sr-only 패턴. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`
