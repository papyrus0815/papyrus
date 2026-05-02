import { useEffect, useMemo, useState } from 'react'

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
}

interface SectionRow {
  /** 클라이언트 임시 키(서버 ID는 PUT 후 새로 발급되므로 ID 신뢰 X). */
  key: string
  title: string
  content: string
  sectionType?: string
}

let counter = 0
const nextKey = () => `s-${Date.now()}-${++counter}`

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
export function DetailNarrative({ event, onPatch }: DetailNarrativeProps) {
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
      title: s.title ?? '',
      content: s.content ?? '',
      sectionType: s.sectionType,
    })),
  )

  /**
   * server 데이터 변경 시 로컬 state 재동기화.
   *
   * 핵심 원칙은 *키 안정성으로 child component 인스턴스를 보존*하는 것 — InlineText
   * /InlineRichText의 내부 draft state가 child 자신에게 살아 있으므로, key가 그대로
   * 유지되면 사용자가 입력 중이던 텍스트가 사라지지 않는다.
   *
   * 정책:
   *  1. 같은 idx의 prev row가 있으면 그 객체(=key)를 그대로 유지. server 값으로
   *     덮지 않는다 — 사용자가 dirty일 수도, clean일 수도 있는데 어느 쪽이든
   *     local을 우위로 둔다(외부 동시 편집은 reload로 해결).
   *  2. server에 새로 추가된 idx >= prev.length 위치의 row는 새 key로 신규 row 생성.
   *  3. local에만 있는(아직 commit 전인 빈) tail row는 그대로 보존.
   */
  useEffect(() => {
    setRows((prev) => {
      const synced: SectionRow[] = serverSections.map((s, idx) => {
        const prevRow = prev[idx]
        if (prevRow) return prevRow
        return {
          key: nextKey(),
          title: s.title ?? '',
          content: s.content ?? '',
          sectionType: s.sectionType,
        }
      })
      // local에만 있는 tail(아직 commit 안 된 빈 row 등)은 뒤에 그대로 붙임.
      if (prev.length > serverSections.length) {
        const localTail = prev.slice(serverSections.length)
        return [...synced, ...localTail]
      }
      return synced
    })
  }, [serverSections])

  /** rows를 server payload로 직렬화 후 patch 호출. */
  const commitRows = (next: SectionRow[]) => {
    setRows(next)
    const cleaned = next
      .filter((r) => r.title.trim() || r.content.trim())
      .map((r, idx) => ({
        title: r.title.trim() || '제목 없음',
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
            onSave={(next) => onPatch({ background: next || undefined })}
            placeholder="사건 직전의 정세·도화선이 된 사건·인물 배치 등"
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
                  maxHeight="480px"
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
            onSave={(next) => onPatch({ aftermath: next || undefined })}
            placeholder="사건 직후의 결과·후속 영향·종결 시점의 상태"
          />
        </S.SectionBody>
      </S.Section>
    </>
  )
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
