import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FiArrowDown, FiArrowUp, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'

import * as S from '../styles'
import { type EventDetail, type EventDetailSection } from '../use-event-detail'
import { InlineRichText, InlineText } from './inline'

interface DetailNarrativeProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto) => void
  /** 본문 내 인물 멘션/엔티티 링크 클릭 → 페이지 레벨 인물 모달. */
  onPersonClick?: (personId: string) => void
}

interface SectionRow {
  /** 클라이언트 임시 키 — React 리스트 식별·child 컴포넌트 인스턴스 보존용. */
  key: string
  /**
   * 마지막으로 매핑된 서버 row id(있다면). 서버는 delete-and-recreate이라 PUT마다
   * id가 새로 발급되지만, 한 응답 사이클 안에서는 같은 id가 같은 row를 가리킴
   * — race 동안 위치 join의 보조 시그널로 사용.
   */
  serverId?: string
  title: string
  content: string
  sectionType?: string
}

/**
 * 본문 인라인 편집 — 배경·여파(rich text), eventSections(array) 각각 개별 편집.
 *
 * - 배경 / 여파: 클릭 → RichTextEditor swap, 명시 저장
 * - 각 section의 제목 / 본문: 개별 click-to-edit
 * - section 추가·삭제·순서 이동: 항목별 inline 버튼
 *
 * eventSections는 server가 통째로 delete-and-recreate라 *어떤 변경이든* 전체
 * 배열을 PUT한다. 로컬 state로 배열을 유지하고 변경 시마다 batch로 보낸다.
 */
export function DetailNarrative({
  event,
  onPatch,
  onPersonClick,
}: DetailNarrativeProps) {
  /**
   * 클라이언트 임시 키 생성기. 모듈 스코프 mutable counter는 HMR에서 취약하므로
   * 컴포넌트 인스턴스의 ref로 둔다. Date.now()와 함께라 충돌 위험은 사실상 없음.
   */
  const counterRef = useRef(0)
  const nextKey = useCallback(
    () => `s-${Date.now()}-${++counterRef.current}`,
    [],
  )

  /* 배경·여파는 server 값을 그대로 InlineRichText로 — 컴포넌트가 자체 draft 관리. */
  const serverSections = useMemo<EventDetailSection[]>(
    () =>
      (event.eventSections ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [event.eventSections],
  )

  /* sections는 reorder/add/remove 작업이 묶여 있어 로컬 state 유지.
     server invalidate → refetch 되면 다시 로컬 상태로 동기화. */
  const [rows, setRows] = useState<SectionRow[]>(() =>
    serverSections.map((s) => ({
      key: nextKey(),
      serverId: s.id,
      title: s.title ?? '',
      content: s.content ?? '',
      sectionType: s.sectionType,
    })),
  )

  /**
   * 마지막 in-flight commit 시점의 *로컬 rows 길이* — server 응답이 도착했을 때
   * 이 길이를 기준으로 positional join을 해도 안전한지 판단한다.
   *
   * race 시나리오 차단:
   *  1) user edits row A → commitRows([A_new, B_old]) → server에 patch1 발송, len=2.
   *  2) server 응답 전 user edits row B → commitRows([A_new, B_new]) → patch2, len=2.
   *  3) patch1 응답 도착: server=[A_new, B_old]. 로컬 len=2 == server len 2 →
   *     position join으로 키 보존. B는 server값을 *받지 않고* 로컬 B_new 유지.
   *  4) patch2 응답 도착: server=[A_new, B_new]. 동일 길이 → position join.
   */
  useEffect(() => {
    setRows((prev) => syncRowsWithServer(prev, serverSections, nextKey))
  }, [serverSections, nextKey])

  /** rows를 server payload로 직렬화 후 patch 호출. */
  const commitRows = (next: SectionRow[]) => {
    setRows(next)
    /**
     * 빈 row(title·content 모두 비어 있음)는 commit에서 제외.
     * title이 비어 있더라도 content가 있으면 그대로 전송 — 사용자가 의도적으로
     * 비워둔 빈 제목을 placeholder 문자열로 강제 치환하지 않는다
     * (이전엔 '제목 없음'으로 덮어써 데이터 손상 가능했음).
     */
    const cleaned = next
      .filter((r) => r.title.trim() || r.content.trim())
      .map((r, idx) => ({
        title: r.title.trim(),
        content: r.content,
        order: idx,
        sectionType: r.sectionType ?? 'narrative',
      }))
    onPatch({ eventSections: cleaned })
  }

  const addSection = () => {
    /* 빈 row를 *로컬에만* 추가 — 사용자가 내용을 채우기 전엔 server로 안 보냄.
       빈 row는 commitRows의 filter에서 자동 제거. */
    setRows((arr) => [
      ...arr,
      { key: nextKey(), title: '', content: '', sectionType: 'narrative' },
    ])
  }

  const updateSectionField = (idx: number, patch: Partial<SectionRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    commitRows(next)
  }

  const removeSection = (idx: number) => {
    commitRows(rows.filter((_, i) => i !== idx))
  }

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= rows.length) return
    const next = rows.slice()
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    commitRows(next)
  }

  const [manageMode, setManageMode] = useState(false)

  return (
    <>
      {/* 배경 — 비어 있어도 진입점 노출. */}
      <S.Section id="background">
        <S.SectionHeader>
          <S.SectionTitle>배경</S.SectionTitle>
        </S.SectionHeader>
        <S.SectionBody>
          <InlineRichText
            value={event.background ?? ''}
            /* 비우면 빈 문자열을 보내 컬럼을 비운다(`|| undefined`는 서버가 무시). */
            onSave={(next) => onPatch({ background: next })}
            placeholder="사건 직전의 정세·도화선이 된 사건·인물 배치 등"
            onPersonClick={onPersonClick}
          />
        </S.SectionBody>
      </S.Section>

      {/* 전개 — 섹션 배열 inline. 비어 있어도 +추가 진입점. */}
      <S.Section id="narrative">
        <S.SectionHeader>
          <S.SectionTitle>전개</S.SectionTitle>
          {rows.length > 0 && (
            <S.SectionActions>
              <ManageToggle
                type="button"
                onClick={() => setManageMode((v) => !v)}
                $active={manageMode}
                aria-pressed={manageMode}
              >
                <FiSettings />
                {manageMode ? '관리 끝' : '관리'}
              </ManageToggle>
            </S.SectionActions>
          )}
        </S.SectionHeader>
        {rows.length === 0 ? (
          <S.EmptyState>
            <S.EmptyStateLine>
              아직 전개 섹션이 없습니다. 아래 버튼으로 추가하세요.
            </S.EmptyStateLine>
          </S.EmptyState>
        ) : (
          <SectionStack>
            {rows.map((row, idx) => (
              <SectionItem key={row.key}>
                <SectionTitleRow>
                  <SectionTitleHost>
                    <InlineText
                      value={row.title}
                      onSave={(next) => updateSectionField(idx, { title: next })}
                      placeholder="섹션 제목"
                    />
                  </SectionTitleHost>
                  {manageMode && (
                    <ManageActions>
                      <ManageBtn
                        type="button"
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        aria-label="위로"
                      >
                        <FiArrowUp />
                      </ManageBtn>
                      <ManageBtn
                        type="button"
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === rows.length - 1}
                        aria-label="아래로"
                      >
                        <FiArrowDown />
                      </ManageBtn>
                      <ManageBtn
                        type="button"
                        onClick={() => removeSection(idx)}
                        aria-label="삭제"
                        $danger
                      >
                        <FiTrash2 />
                      </ManageBtn>
                    </ManageActions>
                  )}
                </SectionTitleRow>
                <InlineRichText
                  value={row.content}
                  onSave={(next) => updateSectionField(idx, { content: next })}
                  placeholder="본문"
                  onPersonClick={onPersonClick}
                />
              </SectionItem>
            ))}
          </SectionStack>
        )}
        <AddSectionBtn type="button" onClick={addSection}>
          <FiPlus /> 섹션 추가
        </AddSectionBtn>
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
            onPersonClick={onPersonClick}
          />
        </S.SectionBody>
      </S.Section>
    </>
  )
}

/**
 * server 응답과 로컬 rows를 매핑한다. 핵심 목표는 **child 컴포넌트 키 보존**
 * — InlineText/InlineRichText는 자체 draft state를 들고 있어 key가 바뀌면 input이
 * unmount/remount되며 IME·커서·미저장 입력이 끊어진다.
 *
 * 매핑 전략(우선순위 순):
 *  1) **길이가 같을 때**: positional join. server[i] ↔ prev[i] 키 그대로 가져가고
 *     content/title은 *prev가 server보다 새로우면 prev 우선* — 즉, 사용자가 막 친
 *     값이 in-flight 응답(이전 상태 반영)으로 덮이지 않도록 한다. 동일성은
 *     "serverId가 같거나 prev의 serverId가 없으면 prev가 더 최신"으로 판정.
 *  2) **길이가 다를 때**: content-aware fallback. 동일한 (title, content, sectionType)
 *     이 있으면 키 보존. 아니면 새 row.
 *  3) 매칭 못한 prev row(아직 commit 안 된 빈 tail 등)는 끝에 append — 사용자 입력
 *     손실 방지.
 */
function syncRowsWithServer(
  prev: SectionRow[],
  server: EventDetailSection[],
  nextKey: () => string,
): SectionRow[] {
  // (1) 같은 길이 — positional join (race-safe).
  if (prev.length === server.length) {
    return server.map((s, i) => {
      const p = prev[i]
      const sTitle = s.title ?? ''
      const sContent = s.content ?? ''
      const sType = s.sectionType

      // prev가 in-flight 상태(아직 새 serverId 미수령)거나, 사용자가 친 값이 더 새
      // 보이면 prev 값을 유지. 그렇지 않으면 server 값 채택.
      const prevIsAhead =
        p.serverId === undefined ||
        (p.serverId !== s.id &&
          (p.title !== sTitle || p.content !== sContent || p.sectionType !== sType))

      if (prevIsAhead) {
        // prev 값 그대로 두고 serverId만 새로 발급된 id로 갱신.
        return { ...p, serverId: s.id }
      }
      // server 값 채택 — 키 보존.
      return {
        key: p.key,
        serverId: s.id,
        title: sTitle,
        content: sContent,
        sectionType: sType,
      }
    })
  }

  // (2) 길이 불일치 — content-aware fallback.
  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: SectionRow[] = []

  for (const s of server) {
    const sTitle = s.title ?? ''
    const sContent = s.content ?? ''
    const sType = s.sectionType
    // 우선 동일 serverId — drop-and-recreate라 보통 안 맞지만, 같은 응답 사이클에서
    // 이미 매핑된 row가 있다면 그쪽 우선.
    let matchedIdx = prev.findIndex((p, i) => !prevUsed[i] && p.serverId === s.id)
    if (matchedIdx < 0) {
      for (let i = 0; i < prev.length; i++) {
        if (prevUsed[i]) continue
        const p = prev[i]
        if (p.title === sTitle && p.content === sContent && p.sectionType === sType) {
          matchedIdx = i
          break
        }
      }
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push({ ...prev[matchedIdx], serverId: s.id })
    } else {
      next.push({
        key: nextKey(),
        serverId: s.id,
        title: sTitle,
        content: sContent,
        sectionType: sType,
      })
    }
  }

  for (let i = 0; i < prev.length; i++) {
    if (!prevUsed[i]) next.push(prev[i])
  }

  return next
}

const SectionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const SectionItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 18px;
  border: none;
  background: transparent;
`

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const SectionTitleHost = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ManageActions = styled.div`
  display: inline-flex;
  gap: 4px;
`

const ManageBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.error : theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.tertiary};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 11px;
    height: 11px;
  }
`

const ManageToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.text.tertiary : ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
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

const AddSectionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 14px;
  border-radius: 7px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.14s, color 0.14s, border-color 0.14s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`
