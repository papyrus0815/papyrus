/**
 * 인물 전기(생애 서술) — 다중 섹션 에디터.
 *
 * 사건 상세(detail-narrative)의 섹션 배열 패턴을 인물에 미러링.
 * 저장은 사건과 동일하게 sections 배열을 통째로 PUT → 서버에서 delete-and-recreate.
 * 읽기 모드는 공용 RichTextProseWithEntityClicks로 엔티티 클릭·용어/가문 정의 툴팁까지 지원.
 *
 * 개선 사항:
 *  1) 서버 동기화 — sections prop이 갱신되면(다른 진입점/탭 편집, 저장 후 refetch)
 *     로컬 rows를 race-safe하게 재동기화(detail-narrative의 syncRowsWithServer 미러).
 *     personId가 바뀌면(key 없이 인스턴스가 재사용되는 호출부) rows·편집 상태를
 *     강제 리셋해 이전 인물의 전기가 새지 않게 한다.
 *  2) 저장 효율 — 순서변경·삭제·드래그는 디바운스로 PUT을 1회로 합치고, PUT은
 *     직렬화(in-flight 체이닝)해 out-of-order delete-and-recreate가 서버에 옛
 *     상태를 남기지 않게 한다. 명시 저장은 즉시 flush, pending 디바운스는
 *     인물 전환·언마운트 시 폐기하지 않고 해당 인물 앞으로 flush.
 *  3) sectionType — 생애/업적/평가/일화 타입을 부여(아이콘·칩), 빈 상태 템플릿 제공.
 *  4) 읽기 UX — 섹션 3개 이상이면 목차(TOC)로 점프, 관리 모드에서 드래그로 순서변경.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  FiArrowDown,
  FiArrowUp,
  FiAward,
  FiEdit2,
  FiFileText,
  FiMessageSquare,
  FiMove,
  FiPlus,
  FiSettings,
  FiStar,
  FiTrash2,
  FiUser,
} from 'react-icons/fi'
import styled from 'styled-components'

import { personKeys } from '@/entities/person/api'
import type {
  RichTextDynastyTooltipState,
  RichTextTermTooltipState,
} from '@/shared/hooks/use-rich-text-prose-click'
import { createRichTextImageUploader } from '@/shared/api/upload'
import { updatePerson } from '@/shared/api/persons'
import { isLikelyRichTextHtml } from '@/shared/lib/rich-text-read-view'
import { confirm } from '@/shared/ui/confirm-dialog'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { RichTextProseWithEntityClicks } from '@/shared/ui/rich-text-read-view'
import { notify } from '@/shared/ui/toast'

export type BiographySectionData = {
  id?: string
  title: string
  content: string
  order?: number
  sectionType?: string | null
}

/** 순서변경·삭제·드래그 PUT 합치기 디바운스(ms). */
const STRUCTURAL_PERSIST_DELAY = 600
/** 목차(TOC)를 노출할 최소 섹션 수. */
const TOC_MIN_SECTIONS = 3

/** 전기 섹션 타입 프리셋 — 빈 상태 템플릿·타입 칩·편집 셀렉터 공용. */
const SECTION_TYPES = [
  { value: 'life', label: '생애', Icon: FiUser },
  { value: 'achievement', label: '업적', Icon: FiAward },
  { value: 'evaluation', label: '평가', Icon: FiStar },
  { value: 'anecdote', label: '일화', Icon: FiMessageSquare },
  { value: 'narrative', label: '기타', Icon: FiFileText },
] as const

type SectionTypeValue = (typeof SECTION_TYPES)[number]['value']

function sectionTypeMeta(t: string | null | undefined) {
  return SECTION_TYPES.find((s) => s.value === t) ?? null
}

type Row = {
  key: string
  /**
   * 마지막으로 매핑된 서버 row id(있다면). 서버는 delete-and-recreate라 PUT마다
   * id가 새로 발급되지만, 한 응답 사이클 안에서는 같은 id가 같은 row를 가리킴
   * — race 동안 위치 join의 보조 시그널로 사용.
   */
  serverId?: string
  title: string
  content: string
  sectionType?: string | null
}

let keySeq = 0
const nextKey = () => `bio-sec-${keySeq++}`

function toRows(
  sections: BiographySectionData[] | undefined,
  legacyBiography: string | null | undefined,
): Row[] {
  const list = (sections ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (list.length > 0) {
    return list.map((s) => ({
      key: nextKey(),
      serverId: s.id,
      title: s.title ?? '',
      content: s.content ?? '',
      sectionType: s.sectionType ?? null,
    }))
  }
  // 섹션이 없고 레거시 단일 전기가 있으면 첫 섹션으로 시드(저장 시 섹션으로 이관).
  if (legacyBiography && legacyBiography.trim()) {
    return [
      { key: nextKey(), title: '생애', content: legacyBiography, sectionType: 'life' },
    ]
  }
  return []
}

/** 마지막 persist 시점의 row 스냅샷 — sync의 '이후 수정(dirty)' 판정 기준선. */
type RowSnapshot = {
  title: string
  content: string
  sectionType: string | null
}

function snapshotRows(rows: Row[]): Map<string, RowSnapshot> {
  const map = new Map<string, RowSnapshot>()
  for (const r of rows) {
    map.set(r.key, {
      title: r.title,
      content: r.content,
      sectionType: r.sectionType ?? null,
    })
  }
  return map
}

/** 마지막 persist 기준선 대비 로컬 수정 여부 — 기준선에 없으면 이후 생긴 row로 본다. */
function isRowDirtySince(
  row: Row,
  lastPersisted: Map<string, RowSnapshot>,
): boolean {
  const snap = lastPersisted.get(row.key)
  if (!snap) return true
  return (
    snap.title !== row.title ||
    snap.content !== row.content ||
    snap.sectionType !== (row.sectionType ?? null)
  )
}

/**
 * server 응답과 로컬 rows를 매핑한다. 핵심 목표는 RichTextEditor 인스턴스 키 보존과
 * in-flight 편집/저장이 이전 상태 응답으로 덮이지 않게 하는 것
 * (detail-narrative.syncRowsWithServer 미러).
 *
 *  1) 길이가 같을 때: positional join. prev가 더 새(serverId 미수령 또는 값이 다름)면
 *     prev 유지(serverId만 갱신), 아니면 server 값 채택. 키는 항상 보존.
 *  2) 길이가 다를 때: (title,content,sectionType) 동일 매칭으로 키 보존. 못 맞춘
 *     prev row는 보존 근거가 있는 것(편집 중·아직 미persist 신규·마지막 persist
 *     이후 수정)만 끝에 append — 입력 손실 방지. 그 외(마지막 persist 그대로)는
 *     다른 탭 저장 등으로 서버에서 사라진 row이므로 드롭해 중복 부활을 막는다.
 */
function syncRowsWithServer(
  prev: Row[],
  server: Row[],
  local: {
    editingKey: string | null
    lastPersisted: Map<string, RowSnapshot>
  },
): Row[] {
  if (prev.length === server.length) {
    return server.map((s, i) => {
      const p = prev[i]
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== s.serverId &&
          (p.title !== s.title ||
            p.content !== s.content ||
            (p.sectionType ?? null) !== (s.sectionType ?? null)))
      if (prevIsAhead) return { ...p, serverId: s.serverId }
      return {
        key: p.key,
        serverId: s.serverId,
        title: s.title,
        content: s.content,
        sectionType: s.sectionType ?? null,
      }
    })
  }

  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: Row[] = []
  for (const s of server) {
    let matchedIdx = prev.findIndex(
      (p, i) => !prevUsed[i] && p.serverId !== undefined && p.serverId === s.serverId,
    )
    if (matchedIdx < 0) {
      matchedIdx = prev.findIndex(
        (p, i) =>
          !prevUsed[i] &&
          p.title === s.title &&
          p.content === s.content &&
          (p.sectionType ?? null) === (s.sectionType ?? null),
      )
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push({ ...prev[matchedIdx], serverId: s.serverId })
    } else {
      next.push({ ...s })
    }
  }
  for (let i = 0; i < prev.length; i++) {
    if (prevUsed[i]) continue
    const p = prev[i]
    // 미매칭 prev는 보존 근거가 있는 것만 append: 편집 중 / 아직 미persist 신규
    // (serverId 없음) / 마지막 persist 이후 수정. 그 외는 다른 탭 저장 등으로
    // 서버에서 사라진 row — append하면 중복 부활하므로 드롭(서버 상태 채택).
    if (
      p.key === local.editingKey ||
      p.serverId === undefined ||
      isRowDirtySince(p, local.lastPersisted)
    ) {
      next.push(p)
    }
  }
  return next
}

type Props = {
  personId: string
  sections: BiographySectionData[] | undefined
  /** 섹션이 비었을 때 시드로 쓸 레거시 단일 전기(person.biography) */
  legacyBiography?: string | null
  /** 읽기 본문 인물 멘션 클릭 (패널 모달 스택 등) */
  onPersonClick: (personId: string) => void
  /** 읽기 본문 용어(.term) 클릭 → 정의 툴팁 (패널 포털과 공유) */
  setTermTooltip?: React.Dispatch<
    React.SetStateAction<RichTextTermTooltipState | null>
  >
  /** 읽기 본문 가문 엔티티 클릭 → 정의 툴팁 (패널 포털과 공유) */
  setDynastyTooltip?: React.Dispatch<
    React.SetStateAction<RichTextDynastyTooltipState | null>
  >
}

export function PersonBiographySections({
  personId,
  sections,
  legacyBiography,
  onPersonClick,
  setTermTooltip,
  setDynastyTooltip,
}: Props) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<Row[]>(() =>
    toRows(sections, legacyBiography),
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [manageMode, setManageMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  /** 편집 진입 시점의 제목/본문 — Esc 취소 시 dirty 판단·복원용 */
  const editInitialRef = useRef<{ title: string; content: string }>({
    title: '',
    content: '',
  })
  /** 섹션 DOM 노드 — 목차 점프 scrollIntoView 대상. */
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  /* ── 저장·동기화용 ref ──────────────────────────────────────── */
  /** 현재 rows의 주인 personId — flush·재전송이 다른 인물로 교차 저장되지 않게 추적. */
  const personIdRef = useRef(personId)
  /** rows 리셋 세대 — 인물 전환(A→B→A 왕복)을 가로지른 in-flight 응답이
      리셋 직후의 rows·기준선을 옛 세대의 키로 덮지 않게 가드. */
  const rowsGenRef = useRef(0)
  /** 현재 편집 중 row key 미러 — sync 판정에서 최신값 참조용. */
  const editingKeyRef = useRef<string | null>(null)
  useEffect(() => {
    editingKeyRef.current = editingKey
  }, [editingKey])

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 디바운스 flush 시 읽을 최신 rows. */
  const latestRowsRef = useRef<Row[]>(rows)
  useEffect(() => {
    latestRowsRef.current = rows
  }, [rows])
  /** in-flight PUT promise — 직렬화용. 진행 중이면 새 전송 대신 pending에 합친다. */
  const inFlightRef = useRef<Promise<void> | null>(null)
  /** in-flight 중 들어온 저장 요청 — 인물당 최신 1건만 유지(삽입 순서대로 재전송).
      인물 전환 직전 flush 분이 새 인물의 변경에 밀려 유실되지 않게 personId별로 관리.
      rows는 큐잉 시점 캡처본, gen은 그 시점의 rows 세대. */
  const pendingPersistRef = useRef<Map<string, { rows: Row[]; gen: number }>>(
    new Map(),
  )
  /** 마지막 persist 성공 시점 row 스냅샷 — sync의 '이후 수정(dirty)' 판정 기준선.
      persist 전에는 마운트·인물 전환 시점의 서버 상태가 기준선. */
  const lastPersistedRef = useRef<Map<string, RowSnapshot> | null>(null)
  if (lastPersistedRef.current == null) {
    lastPersistedRef.current = snapshotRows(rows)
  }

  /* ── 저장(직렬화 + 디바운스) ───────────────────────────────────
     PUT은 한 번에 하나만 전송(체이닝). 진행 중에 새 저장이 오면 pending에
     인물당 최신 캡처본으로 합쳐 두고 완료 후 1회만 재전송 — 동시 PUT이 서버의
     delete-and-recreate를 out-of-order로 타며 옛 상태를 남기는 lost update를
     차단한다. personId는 클로저가 아닌 호출 시점 인자로 받아 교차 저장 방지. */
  const doPersist = useCallback(
    (targetPersonId: string, rowsToSave: Row[]) => {
      const gen = rowsGenRef.current
      if (inFlightRef.current != null) {
        pendingPersistRef.current.set(targetPersonId, { rows: rowsToSave, gen })
        return
      }
      const runChain = async (
        firstPersonId: string,
        firstRows: Row[],
        firstGen: number,
      ) => {
        let curPersonId = firstPersonId
        let curRows = firstRows
        let curGen = firstGen
        for (;;) {
          setSaving(true)
          try {
            const cleaned = curRows
              .filter((r) => r.title.trim() || r.content.trim())
              .map((r, idx) => ({
                title: r.title.trim(),
                content: r.content,
                order: idx,
                sectionType: r.sectionType ?? null,
              }))
            await updatePerson(curPersonId, { sections: cleaned })
            // dirty 기준선 갱신 — 현재 인물·현재 rows 세대 분만(전환 직전 flush나
            // A→B→A 왕복을 가로지른 응답이 리셋된 기준선을 옛 세대 키로 덮지 않게).
            if (
              curPersonId === personIdRef.current &&
              curGen === rowsGenRef.current
            )
              lastPersistedRef.current = snapshotRows(curRows)
            // 같은 인물의 더 늦은 저장이 대기 중이면 이 응답은 stale —
            // 무효화(불필요 refetch)도 토스트도 생략.
            if (!pendingPersistRef.current.has(curPersonId)) {
              await queryClient.invalidateQueries({
                queryKey: personKeys.detailFull(curPersonId),
              })
              if (!pendingPersistRef.current.has(curPersonId))
                notify.success('전기가 저장되었습니다.')
            }
          } catch (err) {
            if (!pendingPersistRef.current.has(curPersonId))
              notify.error(
                err instanceof Error ? err.message : '전기 저장에 실패했습니다.',
              )
          } finally {
            if (pendingPersistRef.current.size === 0) setSaving(false)
          }
          const it = pendingPersistRef.current.entries().next()
          if (it.done) return
          const [pendingPersonId, pendingEntry] = it.value
          pendingPersistRef.current.delete(pendingPersonId)
          curPersonId = pendingPersonId
          // 항상 큐잉 시점 캡처본으로 재전송 — latestRowsRef는 A→B→A 왕복 시
          // stale 캐시로 리셋돼 있을 수 있어 채택하면 flush된 변경(삭제 등)이
          // 조용히 역전된다. 그 사이 추가 변경은 각자의 디바운스/저장이 다시
          // doPersist를 호출해 pending에 최신본으로 합쳐지므로 유실되지 않는다.
          curRows = pendingEntry.rows
          curGen = pendingEntry.gen
        }
      }
      const flight = runChain(targetPersonId, rowsToSave, gen).finally(() => {
        inFlightRef.current = null
      })
      inFlightRef.current = flight
    },
    [queryClient],
  )

  /** 명시 저장(편집 완료) — 디바운스 타이머를 취소하고 즉시 전송. */
  const persistNow = useCallback(
    (next: Row[]) => {
      if (persistTimerRef.current != null) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
      doPersist(personIdRef.current, next)
    },
    [doPersist],
  )

  /** 구조 변경(순서·삭제·드래그) — 연타를 1회 PUT로 합친다. */
  const persistDebounced = useCallback(
    (next: Row[]) => {
      latestRowsRef.current = next
      if (persistTimerRef.current != null) clearTimeout(persistTimerRef.current)
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null
        doPersist(personIdRef.current, latestRowsRef.current)
      }, STRUCTURAL_PERSIST_DELAY)
    },
    [doPersist],
  )

  /* ── 인물 전환 대응 ───────────────────────────────────────────
     key 없이 personId만 바뀌는 호출부(상세 페이지 라우트 재사용, 위젯의 제자리
     교체 등)에서도 이전 인물의 rows·편집 상태가 새 인물로 새지 않도록 컴포넌트
     내부에서 처리한다. pending 디바운스 PUT은 폐기하지 않고 이전 인물 앞으로
     즉시 flush — 교차 저장과 변경 유실을 모두 차단. */
  useEffect(() => {
    if (personIdRef.current === personId) return
    const prevPersonId = personIdRef.current
    personIdRef.current = personId
    // ① 이전 인물의 pending 구조 변경을 이전 인물 id로 즉시 flush.
    if (persistTimerRef.current != null) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
      doPersist(prevPersonId, latestRowsRef.current)
    }
    // ② rows를 새 인물의 서버 상태로 강제 리셋. 레거시 시드는 리마운트와 동일하게
    //    항상 재적용 — 키 없는 호출부에서 재방문해도 서버에 남아 있는 레거시 전기가
    //    빈 상태로 보이지 않게. 삭제된 시드의 refetch 부활 차단은 sync의
    //    toRows(sections, null)이 담당하므로 여기서 따로 기록하지 않는다.
    rowsGenRef.current += 1
    const nextRows = toRows(sections, legacyBiography)
    latestRowsRef.current = nextRows
    lastPersistedRef.current = snapshotRows(nextRows)
    setRows(nextRows)
    // ③ 편집·관리·드래그 상태 초기화.
    setEditingKey(null)
    editingKeyRef.current = null
    setManageMode(false)
    setDragKey(null)
    setDropKey(null)
    // sections·legacyBiography는 personId와 같은 응답으로 함께 내려옴 — personId만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  /* ── 서버 동기화 ──────────────────────────────────────────────
     sections prop이 바뀌면(저장 후 refetch, 다른 진입점 편집) 로컬 rows를
     race-safe하게 재동기화. 편집 중 막 친 값은 prevIsAhead 판정으로 보존.
     레거시 시드는 비교 대상에서 제외(toRows(sections, null)) — 마지막 섹션
     삭제로 sections가 [S1]→[]로 바뀔 때 옛 레거시 원문이 부활하지 않게. */
  useEffect(() => {
    const serverRows = toRows(sections, null)
    setRows((prev) =>
      syncRowsWithServer(prev, serverRows, {
        editingKey: editingKeyRef.current,
        lastPersisted: lastPersistedRef.current ?? new Map(),
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  /* 언마운트 시 pending 디바운스 PUT은 폐기하지 않고 flush — 삭제·순서변경 직후
     탭 전환(AnimatePresence 언마운트)·패널 닫기로 변경이 조용히 유실되지 않게.
     personIdRef는 latestRowsRef의 rows와 항상 같은 인물을 가리킨다(마운트·전환 시 갱신). */
  useEffect(
    () => () => {
      if (persistTimerRef.current != null) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
        doPersist(personIdRef.current, latestRowsRef.current)
      }
    },
    [doPersist],
  )

  const updateField = useCallback((key: string, patch: Partial<Row>) => {
    setRows((arr) => arr.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }, [])

  const addSection = useCallback(
    (sectionType: SectionTypeValue | null, title: string) => {
      const row: Row = { key: nextKey(), title, content: '', sectionType }
      editInitialRef.current = { title, content: '' }
      setRows((arr) => [...arr, row])
      setEditingKey(row.key)
    },
    [],
  )

  const beginEdit = useCallback(
    (key: string) => {
      const row = rows.find((r) => r.key === key)
      editInitialRef.current = {
        title: row?.title ?? '',
        content: row?.content ?? '',
      }
      setEditingKey(key)
    },
    [rows],
  )

  /** 편집 취소 — 초기값으로 복원하고, 빈 섹션(새로 추가했다 비운 것)은 제거 */
  const cancelEdit = useCallback(() => {
    const key = editingKey
    if (key == null) return
    setRows((arr) =>
      arr
        .map((r) =>
          r.key === key
            ? {
                ...r,
                title: editInitialRef.current.title,
                content: editInitialRef.current.content,
              }
            : r,
        )
        .filter((r) => r.key !== key || r.title.trim() || r.content.trim()),
    )
    setEditingKey(null)
  }, [editingKey])

  const removeSection = useCallback(
    (key: string) => {
      setRows((arr) => {
        const next = arr.filter((r) => r.key !== key)
        persistDebounced(next)
        return next
      })
      if (editingKey === key) setEditingKey(null)
    },
    [persistDebounced, editingKey],
  )

  const moveSection = useCallback(
    (key: string, dir: -1 | 1) => {
      setRows((arr) => {
        const idx = arr.findIndex((r) => r.key === key)
        const target = idx + dir
        if (idx < 0 || target < 0 || target >= arr.length) return arr
        const next = arr.slice()
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)
        persistDebounced(next)
        return next
      })
    },
    [persistDebounced],
  )

  /** 드래그 드롭 — fromKey를 toKey 위치로 이동. */
  const reorderByKey = useCallback(
    (fromKey: string, toKey: string) => {
      if (fromKey === toKey) return
      setRows((arr) => {
        const from = arr.findIndex((r) => r.key === fromKey)
        const to = arr.findIndex((r) => r.key === toKey)
        if (from < 0 || to < 0) return arr
        const next = arr.slice()
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        persistDebounced(next)
        return next
      })
    },
    [persistDebounced],
  )

  const saveSection = useCallback(
    (_key: string) => {
      setEditingKey(null)
      persistNow(latestRowsRef.current)
    },
    [persistNow],
  )

  const scrollToSection = useCallback((key: string) => {
    sectionRefs.current[key]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  /**
   * 섹션 편집 중 키보드 단축키 — 사건 본문 인라인 에디터(InlineRichText)와 동일 UX.
   *  - ⌘/Ctrl+Enter: 저장
   *  - Esc: 취소(미저장 변경이 있으면 확인 후 폐기·복원)
   */
  useEffect(() => {
    if (editingKey == null) return
    const onKey = async (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!saving) saveSection(editingKey)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        const row = rows.find((r) => r.key === editingKey)
        const dirty = row
          ? row.title !== editInitialRef.current.title ||
            row.content !== editInitialRef.current.content
          : false
        if (
          dirty &&
          !(await confirm({
            title: '확인',
            message: '저장하지 않은 변경을 버릴까요?',
          }))
        )
          return
        cancelEdit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingKey, rows, saving, saveSection, cancelEdit])

  if (rows.length === 0) {
    // 빈 상태 — 추천 템플릿으로 작성 진입장벽을 낮춘다.
    return (
      <EmptyState>
        <EmptyTitle>전기를 작성해 보세요</EmptyTitle>
        <EmptyDesc>섹션을 골라 시작하거나 빈 섹션으로 자유롭게 작성할 수 있습니다.</EmptyDesc>
        <TemplateRow>
          {SECTION_TYPES.filter((t) => t.value !== 'narrative').map((t) => (
            <TemplateBtn
              key={t.value}
              type="button"
              onClick={() => addSection(t.value, t.label)}
            >
              <t.Icon size={14} />
              {t.label}
            </TemplateBtn>
          ))}
          <TemplateBtn type="button" $ghost onClick={() => addSection(null, '')}>
            <FiPlus size={14} />빈 섹션
          </TemplateBtn>
        </TemplateRow>
      </EmptyState>
    )
  }

  const showToc = rows.length >= TOC_MIN_SECTIONS && editingKey == null

  return (
    <Wrap>
      <Toolbar>
        <ManageToggle
          type="button"
          $active={manageMode}
          onClick={() => setManageMode((v) => !v)}
        >
          <FiSettings size={13} />
          {manageMode ? '관리 끝' : '관리'}
        </ManageToggle>
      </Toolbar>

      {showToc && (
        <Toc aria-label="전기 목차">
          {rows.map((row, idx) => {
            const meta = sectionTypeMeta(row.sectionType)
            return (
              <TocChip
                key={row.key}
                type="button"
                onClick={() => scrollToSection(row.key)}
              >
                {meta ? <meta.Icon size={12} /> : <span>{idx + 1}</span>}
                {row.title || '(제목 없음)'}
              </TocChip>
            )
          })}
        </Toc>
      )}

      {rows.map((row, idx) => {
        const isEditing = editingKey === row.key
        const meta = sectionTypeMeta(row.sectionType)
        const isDragging = dragKey === row.key
        const isDropTarget = dropKey === row.key && dragKey !== row.key
        return (
          <SectionItem
            key={row.key}
            ref={(el) => {
              sectionRefs.current[row.key] = el
            }}
            $dragging={isDragging}
            $dropTarget={isDropTarget}
            draggable={manageMode && !isEditing}
            onDragStart={
              manageMode
                ? (e) => {
                    setDragKey(row.key)
                    e.dataTransfer.effectAllowed = 'move'
                  }
                : undefined
            }
            onDragOver={
              manageMode
                ? (e) => {
                    if (dragKey == null) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dropKey !== row.key) setDropKey(row.key)
                  }
                : undefined
            }
            onDrop={
              manageMode
                ? (e) => {
                    e.preventDefault()
                    if (dragKey != null) reorderByKey(dragKey, row.key)
                    setDragKey(null)
                    setDropKey(null)
                  }
                : undefined
            }
            onDragEnd={
              manageMode
                ? () => {
                    setDragKey(null)
                    setDropKey(null)
                  }
                : undefined
            }
          >
            <SectionHead>
              {manageMode && !isEditing && (
                <DragHandle title="드래그하여 순서 변경">
                  <FiMove size={13} />
                </DragHandle>
              )}
              {!manageMode && meta ? (
                <SectionTypeBadge title={meta.label}>
                  <meta.Icon size={13} />
                </SectionTypeBadge>
              ) : (
                <SectionIndex>{idx + 1}</SectionIndex>
              )}
              {isEditing ? (
                <SectionTitleInput
                  value={row.title}
                  placeholder="섹션 제목 (예: 생애, 업적, 평가)"
                  onChange={(e) =>
                    updateField(row.key, { title: e.target.value })
                  }
                />
              ) : (
                <SectionTitle>{row.title || '(제목 없음)'}</SectionTitle>
              )}
              <HeadActions>
                {manageMode && (
                  <>
                    <IconBtn
                      type="button"
                      title="위로"
                      disabled={idx === 0}
                      onClick={() => moveSection(row.key, -1)}
                    >
                      <FiArrowUp size={14} />
                    </IconBtn>
                    <IconBtn
                      type="button"
                      title="아래로"
                      disabled={idx === rows.length - 1}
                      onClick={() => moveSection(row.key, 1)}
                    >
                      <FiArrowDown size={14} />
                    </IconBtn>
                    <IconBtn
                      type="button"
                      title="삭제"
                      $danger
                      onClick={() => removeSection(row.key)}
                    >
                      <FiTrash2 size={14} />
                    </IconBtn>
                  </>
                )}
              </HeadActions>
            </SectionHead>

            <SectionBody>
              {isEditing ? (
                <>
                  <TypeSelectRow role="radiogroup" aria-label="섹션 유형">
                    {SECTION_TYPES.map((t) => (
                      <TypeChip
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={(row.sectionType ?? null) === t.value}
                        $active={(row.sectionType ?? null) === t.value}
                        onClick={() =>
                          updateField(row.key, {
                            sectionType:
                              (row.sectionType ?? null) === t.value
                                ? null
                                : t.value,
                          })
                        }
                      >
                        <t.Icon size={12} />
                        {t.label}
                      </TypeChip>
                    ))}
                  </TypeSelectRow>
                  <RichTextEditor
                    value={row.content}
                    onChange={(v) => updateField(row.key, { content: v })}
                    showTitle={false}
                    placeholder="본문을 입력하세요. 서식·이미지·인물 멘션을 넣을 수 있습니다."
                    onImageUpload={createRichTextImageUploader('persons')}
                    /* 편집 진입 시 본문에 포커스 — preventScroll로 현재 스크롤
                       위치 유지(네이티브 input autoFocus처럼 위로 점프하지 않음). */
                    autoFocus
                  />
                  <EditHint>⌘/Ctrl + Enter 저장 · Esc 취소</EditHint>
                  <EditActions>
                    <GhostBtn
                      type="button"
                      disabled={saving}
                      onClick={cancelEdit}
                    >
                      취소
                    </GhostBtn>
                    <PrimaryBtn
                      type="button"
                      disabled={saving}
                      onClick={() => saveSection(row.key)}
                    >
                      {saving ? '저장 중…' : '저장'}
                    </PrimaryBtn>
                  </EditActions>
                </>
              ) : (
                /* 읽기 모드 — 본문 옆에 편집(✎) 버튼을 sticky로 둬서 본문이 길어도
                   스크롤을 내리는 내내 버튼이 따라온다(사건 상세 InlineRichText와 동일 UX).
                   관리 모드에서는 순서·삭제 조작만 하므로 편집 버튼은 숨긴다. */
                <BodyReadHost>
                  <BodyReadCol>
                    {row.content && isLikelyRichTextHtml(row.content) ? (
                      <RichTextProseWithEntityClicks
                        html={row.content}
                        samePersonId={personId}
                        onPersonClick={onPersonClick}
                        setTermTooltip={setTermTooltip}
                        setDynastyTooltip={setDynastyTooltip}
                      />
                    ) : row.content ? (
                      <PlainText>{row.content}</PlainText>
                    ) : (
                      <EmptyHint>
                        본문이 없습니다. 편집을 눌러 작성하세요.
                      </EmptyHint>
                    )}
                  </BodyReadCol>
                  {!manageMode && (
                    <StickyEditBtn
                      type="button"
                      title="편집"
                      onClick={() => beginEdit(row.key)}
                    >
                      <FiEdit2 size={14} />
                    </StickyEditBtn>
                  )}
                </BodyReadHost>
              )}
            </SectionBody>
          </SectionItem>
        )
      })}

      <AddRow>
        {SECTION_TYPES.filter((t) => t.value !== 'narrative').map((t) => (
          <AddTypeBtn
            key={t.value}
            type="button"
            disabled={saving}
            onClick={() => addSection(t.value, t.label)}
          >
            <t.Icon size={13} />
            {t.label}
          </AddTypeBtn>
        ))}
        <AddButton
          type="button"
          onClick={() => addSection(null, '')}
          disabled={saving}
        >
          <FiPlus size={14} />빈 섹션
        </AddButton>
      </AddRow>
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
`

const ManageToggle = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 7px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? '#4f46e5' : theme.colors.border.default};
  color: ${({ theme, $active }) =>
    $active ? '#4f46e5' : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? 'rgba(79,70,229,0.08)' : theme.colors.background.primary};
  cursor: pointer;
`

/** 목차 — 섹션 3개 이상일 때 점프 내비게이션. */
const Toc = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const TocChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 220px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  span {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 700;
  }
  &:hover {
    border-color: #4f46e5;
    color: #4f46e5;
  }
`

const SectionItem = styled.div<{ $dragging?: boolean; $dropTarget?: boolean }>`
  border: 1px solid
    ${({ theme, $dropTarget }) =>
      $dropTarget ? '#4f46e5' : theme.colors.border.default};
  border-radius: 12px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  /* 고정 헤더 아래로 가리지 않도록 목차 점프 시 여백 확보. */
  scroll-margin-top: calc(var(--header-height, 64px) + 16px);
  opacity: ${({ $dragging }) => ($dragging ? 0.5 : 1)};
  box-shadow: ${({ $dropTarget }) =>
    $dropTarget ? '0 0 0 2px rgba(79,70,229,0.18)' : 'none'};
  transition: box-shadow 0.12s, opacity 0.12s;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const DragHandle = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`

const SectionIndex = styled.span`
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 6px;
`

/** 읽기 모드 타입 뱃지 — 섹션 유형 아이콘. */
const SectionTypeBadge = styled.span`
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.1);
  border-radius: 6px;
`

const SectionTitle = styled.h4`
  flex: 1 1 auto;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionTitleInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  &:focus {
    outline: none;
    border-color: #4f46e5;
  }
`

const HeadActions = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  gap: 4px;
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? '#dc2626' : theme.colors.text.secondary};
  cursor: pointer;
  transition: background 0.12s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.secondary};
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const SectionBody = styled.div`
  font-size: 14px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
`

/** 편집 모드 섹션 타입 선택 칩 행. */
const TypeSelectRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`

const TypeChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? '#4f46e5' : theme.colors.border.default};
  color: ${({ theme, $active }) =>
    $active ? '#4f46e5' : theme.colors.text.secondary};
  background: ${({ $active }) =>
    $active ? 'rgba(79,70,229,0.08)' : 'transparent'};
  cursor: pointer;
`

/** 읽기 본문 + sticky 편집 버튼을 가로로 배치하는 호스트. */
const BodyReadHost = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
`

const BodyReadCol = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

/**
 * 편집(✎) 버튼 — 본문이 길어도 스크롤하는 내내 닿을 수 있도록 sticky.
 * 전역 고정 헤더(64px) 아래 16px 여유에 고정. 섹션(BodyReadHost) 범위 안에서만
 * 따라오므로 다음 섹션으로 넘어가면 자연히 그 섹션 버튼으로 교체된다.
 */
const StickyEditBtn = styled(IconBtn)`
  position: sticky;
  top: calc(var(--header-height, 64px) + 16px);
  flex: 0 0 auto;
  align-self: flex-start;
  /* 본문 위에 떠 있을 때 글자가 비치지 않도록 불투명 배경·테두리. */
  background: ${({ theme }) => theme.colors.background.primary};
  border-color: ${({ theme }) => theme.colors.border.default};
  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
`

const EditHint = styled.div`
  margin: 6px 2px 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`

const GhostBtn = styled.button`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const PrimaryBtn = styled.button`
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

const PlainText = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`

const EmptyHint = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

/** 섹션 추가 행 — 타입 템플릿 + 빈 섹션. */
const AddRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`

const AddTypeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: #4f46e5;
    color: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

/** 빈 상태 — 추천 템플릿 팔레트. */
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 18px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const EmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 6px;
`

const TemplateRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TemplateBtn = styled.button<{ $ghost?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px
    ${({ $ghost }) => ($ghost ? 'dashed' : 'solid')}
    ${({ theme }) => theme.colors.border.default};
  background: ${({ theme, $ghost }) =>
    $ghost ? 'transparent' : theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    border-color: #4f46e5;
    color: #4f46e5;
  }
`
