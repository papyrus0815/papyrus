import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type UpdateEventDto } from '@/shared/api/events'
import { confirm } from '@/shared/ui/confirm-dialog'

import * as S from '../styles'
import { type EventDetail, type EventDetailSection } from '../use-event-detail'
import { InlineRichText } from './inline'
import {
  AddSectionButton,
  BACKGROUND_TYPE,
  isBackgroundSection,
  mergeSectionPayload,
  NARRATIVE_TYPE,
  NarrativeSectionList,
  type SectionRow,
  syncRowsWithServer,
} from './narrative-sections'

interface DetailNarrativeProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 본문 내 인물 멘션/엔티티 링크 클릭 → 페이지 레벨 인물 모달. */
  onPersonClick?: (personId: string) => void
  /**
   * 본문에 *인물* 엔티티를 링크했을 때 호출 → 참여 행위자 자동 등록.
   * 페이지가 relatedPersons 병합(중복 무시)을 담당. 표시명·프로필 이미지를 함께
   * 넘겨 낙관적 갱신이 인물 캐시 적재 없이도 즉시 이름·아바타를 렌더하도록 한다.
   */
  onPersonEntityLink?: (person: {
    id: string
    name: string
    imageUrl?: string | null
  }) => void
}

/**
 * 본문 인라인 편집 — 배경·여파(rich text), eventSections(array) 각각 개별 편집.
 *
 * - 배경: 요약 본문 1개(event.background) + 번호 단락(eventSections/sectionType=background)
 * - 전개: 번호 단락(그 외 sectionType)
 * - 여파: 단일 rich text
 *
 * eventSections는 server가 통째로 delete-and-recreate라 *어떤 변경이든* 배경·전개
 * 두 묶음을 **하나의 배열로 합쳐** PUT한다(order는 배경 → 전개 순 통산).
 */
export function DetailNarrative({
  event,
  onPatch,
  onPersonClick,
  onPersonEntityLink,
}: DetailNarrativeProps) {
  /* 본문(배경·여파·섹션) 공통 — 인물 링크 삽입 시에만 행위자 등록으로 잇는다. */
  const handleEntityLink = useCallback(
    (item: { type: string; id: string; name: string; data?: unknown }) => {
      if (item.type !== 'person') return
      const imageUrl = (item.data as { imageUrl?: string | null } | null)
        ?.imageUrl
      onPersonEntityLink?.({ id: item.id, name: item.name, imageUrl })
    },
    [onPersonEntityLink],
  )
  /**
   * 클라이언트 임시 키 생성기. 모듈 스코프 mutable counter는 HMR에서 취약하므로
   * 컴포넌트 인스턴스의 ref로 둔다. Date.now()와 함께라 충돌 위험은 사실상 없음.
   */
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `s-${Date.now()}-${++counterRef.current}`,
    [],
  )

  const serverSections = useMemo<EventDetailSection[]>(
    () =>
      (event.eventSections ?? [])
        .slice()
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    [event.eventSections],
  )

  const serverBackground = useMemo(
    () => serverSections.filter((section) => isBackgroundSection(section.sectionType)),
    [serverSections],
  )
  const serverNarrative = useMemo(
    () => serverSections.filter((section) => !isBackgroundSection(section.sectionType)),
    [serverSections],
  )

  /* sections는 reorder/add/remove 작업이 묶여 있어 로컬 state 유지.
     server invalidate → refetch 되면 다시 로컬 상태로 동기화. */
  const toRows = useCallback(
    (sections: EventDetailSection[]): SectionRow[] =>
      sections.map((section) => ({
        key: nextKey(),
        serverId: section.id,
        title: section.title ?? '',
        content: section.content ?? '',
        sectionType: section.sectionType,
      })),
    [nextKey],
  )

  const [backgroundRows, setBackgroundRows] = useState<SectionRow[]>(() =>
    toRows(serverBackground),
  )
  const [narrativeRows, setNarrativeRows] = useState<SectionRow[]>(() =>
    toRows(serverNarrative),
  )

  /**
   * 마지막 in-flight commit 시점의 *로컬 rows 길이* 기준으로 positional join을 한다.
   * (race 시나리오는 syncRowsWithServer 주석 참고 — 사용자가 막 친 값이 이전 상태를
   * 담은 응답으로 덮이지 않도록 prev 우선 판정.)
   */
  useEffect(() => {
    setBackgroundRows((prev) => syncRowsWithServer(prev, serverBackground, nextKey))
  }, [serverBackground, nextKey])
  useEffect(() => {
    setNarrativeRows((prev) => syncRowsWithServer(prev, serverNarrative, nextKey))
  }, [serverNarrative, nextKey])

  /**
   * 배경·전개 두 묶음을 한 배열로 직렬화해 patch 호출.
   * 합치는 규칙(빈 row 제외·order 통산)은 mergeSectionPayload가 단일 출처.
   */
  const commit = useCallback(
    (nextBackground: SectionRow[], nextNarrative: SectionRow[]) => {
      setBackgroundRows(nextBackground)
      setNarrativeRows(nextNarrative)
      onPatch({ eventSections: mergeSectionPayload(nextBackground, nextNarrative) })
    },
    [onPatch],
  )

  /** 묶음 하나에 대한 추가·수정·삭제·이동 핸들러 묶음. */
  const makeHandlers = (
    rows: SectionRow[],
    sectionType: string,
    commitPair: (nextRows: SectionRow[]) => void,
    setRows: (nextRows: SectionRow[]) => void,
  ) => ({
    add: () => {
      /* 빈 row를 *로컬에만* 추가 — 사용자가 내용을 채우기 전엔 server로 안 보냄.
         빈 row는 commit의 filter에서 자동 제거. */
      const key = nextKey()
      setRows([...rows, { key, title: '', content: '', sectionType }])
      /* 만든 행위가 곧 '여기에 쓰겠다'는 뜻 — 제목 입력을 열어 둔 채로 띄운다. */
      setAutoEditKey(key)
    },
    change: (index: number, patch: Partial<SectionRow>) => {
      commitPair(
        rows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, ...patch } : row,
        ),
      )
    },
    remove: async (index: number) => {
      const row = rows[index]
      // 내용이 있는 단락은 무확인 파괴를 막는다(빈 단락은 즉시 제거).
      const hasContent = Boolean(
        row && (row.title.trim() || row.content.replace(/<[^>]*>/g, '').trim()),
      )
      if (hasContent) {
        const ok = await confirm({
          title: '단락 삭제',
          message: '이 단락을 삭제할까요? 입력한 내용이 사라집니다.',
          danger: true,
        })
        if (!ok) return
      }
      commitPair(rows.filter((_, rowIndex) => rowIndex !== index))
    },
    move: (index: number, direction: -1 | 1) => {
      const target = index + direction
      if (target < 0 || target >= rows.length) return
      const next = rows.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      commitPair(next)
    },
  })

  const background = makeHandlers(
    backgroundRows,
    BACKGROUND_TYPE,
    (next) => commit(next, narrativeRows),
    setBackgroundRows,
  )
  const narrative = makeHandlers(
    narrativeRows,
    NARRATIVE_TYPE,
    (next) => commit(backgroundRows, next),
    setNarrativeRows,
  )

  /**
   * 방금 '단락 추가'로 만든 단락의 key — 그 단락의 제목 입력만 열린 채로 뜬다.
   * 배경·전개가 한 값을 나눠 쓴다(동시에 두 곳에 새 단락을 만들 수는 없다).
   */
  const [autoEditKey, setAutoEditKey] = useState<string | null>(null)

  return (
    <>
      {/* 배경 — 요약 본문 1개 + 번호 단락. */}
      <S.Section id="background">
        <S.SectionHeader>
          <S.SectionTitle>배경</S.SectionTitle>
          {backgroundRows.length > 0 && (
            <S.SectionSubtitle>{backgroundRows.length}단락</S.SectionSubtitle>
          )}
        </S.SectionHeader>
        <S.SectionBody>
          <InlineRichText
            value={event.background ?? ''}
            /* 비우면 빈 문자열을 보내 컬럼을 비운다(`|| undefined`는 서버가 무시). */
            onSave={(next) => onPatch({ background: next })}
            /* 아래 번호 단락이 본론이고 이 줄은 그 앞에 두는 요약 — 선택이라고 적는다. */
            placeholder="사건 직전의 정세·도화선 — 요약 한 문단(선택)"
            label="배경 요약"
            onPersonClick={onPersonClick}
            onEntityLink={handleEntityLink}
          />
        </S.SectionBody>
        {backgroundRows.length > 0 && (
          <NarrativeSectionList
            rows={backgroundRows}
            onFieldChange={background.change}
            onMove={background.move}
            onRemove={background.remove}
            onPersonClick={onPersonClick}
            onEntityLink={handleEntityLink}
            labelPrefix="배경"
            bodyPlaceholder="이 배경 단락의 본문"
            anchorPrefix="background"
            autoEditKey={autoEditKey}
          />
        )}
        <AddSectionButton
          onClick={background.add}
          label="배경 단락 추가"
        />
      </S.Section>

      {/* 전개 — 번호 단락. 비어 있어도 +추가 진입점. */}
      <S.Section id="narrative">
        <S.SectionHeader>
          <S.SectionTitle>전개</S.SectionTitle>
          {narrativeRows.length > 0 && (
            <S.SectionSubtitle>{narrativeRows.length}단락</S.SectionSubtitle>
          )}
        </S.SectionHeader>
        {narrativeRows.length === 0 ? (
          <S.EmptyState>
            <S.EmptyStateHead>
              <S.EmptyStateIcon aria-hidden>📖</S.EmptyStateIcon>
              <S.EmptyStateLine>
                아직 전개 단락이 없습니다. 아래 <strong>+ 전개 단락 추가</strong>로
                시작하세요.
              </S.EmptyStateLine>
            </S.EmptyStateHead>
          </S.EmptyState>
        ) : (
          <NarrativeSectionList
            rows={narrativeRows}
            onFieldChange={narrative.change}
            onMove={narrative.move}
            onRemove={narrative.remove}
            onPersonClick={onPersonClick}
            onEntityLink={handleEntityLink}
            labelPrefix="전개"
            bodyPlaceholder="이 전개 단락의 본문"
            anchorPrefix="narrative"
            autoEditKey={autoEditKey}
          />
        )}
        <AddSectionButton
          onClick={narrative.add}
          label="전개 단락 추가"
        />
      </S.Section>

      {/* 여파 */}
      <S.Section id="aftermath">
        <S.SectionHeader>
          <S.SectionTitle>여파</S.SectionTitle>
        </S.SectionHeader>
        <S.SectionBody>
          <InlineRichText
            value={event.aftermath ?? ''}
            /* 비우면 빈 문자열을 보내 컬럼을 비운다(`|| undefined`는 서버가 무시). */
            onSave={(next) => onPatch({ aftermath: next })}
            placeholder="사건 직후의 결과·후속 영향·종결 시점의 상태"
            label="여파"
            onPersonClick={onPersonClick}
            onEntityLink={handleEntityLink}
          />
        </S.SectionBody>
      </S.Section>
    </>
  )
}
