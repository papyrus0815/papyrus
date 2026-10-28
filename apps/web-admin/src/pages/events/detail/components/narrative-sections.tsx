/**
 * 번호 단락(1·2·3) 목록 — 사건 상세의 *배경*과 *전개*가 공유하는 조판.
 *
 * 디자인 의도
 * - **번호가 제목의 서수다.** 좌측 거터에 번호를 두고 세로 괘선으로 묶던 예전 틀은,
 *   본문을 52px 들여쓰면서도 정작 번호는 제목보다 작아 경계를 제목 서식에 빼앗겼다.
 *   이제 번호는 제목과 **같은 크기의 mono 숫자**로 제목 바로 앞에 선다 — 본문은 섹션
 *   좌측 기준선(리드 문단과 같은 열)을 되찾고, 경계는 그 숫자 하나가 만든다.
 * - **모드가 없다.** 순서·삭제는 '관리' 토글 뒤가 아니라 그 단락에 손이 닿을 때
 *   제자리에서 뜬다(absolute라 레이아웃 불변, hover 없는 환경은 상시 노출).
 * - **만들면 바로 쓴다.** '단락 추가'로 생긴 단락은 제목 입력이 열린 채 포커스까지 와 있고,
 *   제목이 빈 단락은 '제목 붙이기' 한 번으로 같은 자리에서 열린다.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { FiArrowDown, FiArrowUp, FiChevronDown, FiCornerUpRight, FiPlus, FiTrash2, FiType } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  MOTION,
  ledgerAccent,
  ledgerBackground,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type MentionItem } from '@/shared/lib/mention/mention-system'
import { emphasisToHtml } from '@/shared/lib/emphasis-markup'
import { tidyProseHtml } from '@/shared/lib/prose-tidy'

import * as S from '../styles'
import { InlineRichText, InlineSelect, InlineText } from './inline'
import { plainTextLength, type SectionKind, type SectionRow, splitTitlePeriod } from './narrative-sections.lib'
import { REVEAL_ANCHOR_EVENT, revealAnchor } from './scroll-to-anchor'

export * from './narrative-sections.lib'

/**
 * 본문 읽기 변환 — 빈 단락·빈 글꼴을 걷고(편집기 찌꺼기가 구분선 앞뒤로 150px 빈칸을 만들었다) `*강조*`를 굵게.
 * 배경·전개·여파 요약과 단락 본문이 함께 쓴다(저장값은 그대로).
 */
export const readProseHtml = (html: string) => emphasisToHtml(tidyProseHtml(html))

interface NarrativeSectionListProps {
  rows: SectionRow[]
  onFieldChange: (index: number, patch: Partial<SectionRow>) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (index: number) => void
  onPersonClick?: (personId: string) => void
  onEntityLink?: (item: MentionItem) => void
  /** 스크린리더 라벨 접두 — "배경 1단락 제목"처럼 읽히게. */
  labelPrefix: string
  /** 본문 placeholder — 배경/전개가 다른 문구를 쓴다. */
  bodyPlaceholder: string
  /** 단락 앵커 접두 — '#background-2'처럼 단락 하나를 직접 가리킬 수 있게. */
  anchorPrefix: string
  /**
   * 제목 입력을 열어 둔 채 띄울 단락의 key — 방금 '단락 추가'로 만든 그 단락.
   * 이 값이 바뀌어도 이미 떠 있는 입력을 다시 열지는 않는다(InlineText의 초기값일 뿐).
   */
  autoEditKey?: string | null
  /**
   * 단락이 가리킬 수 있는 하위 사건(D2). 주면 단락 머리에 '하위 사건' 선택이 생긴다 —
   * 전개 타임라인이 이 연결로 하위 사건 막대와 단락을 잇는다.
   */
  subjectOptions?: ReadonlyArray<{ value: string; label: string }>
  /**
   * 번호 단락 앞의 요약 본문(배경·여파) — 타임라인의 **첫 마디**로 같은 선에 꿴다(번호 대신 점).
   * 예전엔 선 밖에 따로 놓여, 단락이 없는 사건(대부분)은 배경에 타임라인이 아예 없었다.
   */
  lead?: ReactNode
  /**
   * 줄여 보기 — 요약은 몇 줄만, 번호 단락은 **제목 한 줄씩**(목차처럼). 단락 제목을 누르면 **그 단락만**
   * 제자리에서 열고 닫는다(나머지는 접힌 채). 본문은 `hidden="until-found"`로 숨겨 페이지 찾기(Ctrl+F)에는 걸린다.
   */
  collapsed?: boolean
  /** 줄여 보기에서 요약도 자를지 — 짧은 요약은 그대로 둔다(자르면 마지막 줄만 흐려진다) */
  clampLead?: boolean
  /** 잘린 요약으로 편집 포커스가 들어왔다 — 잘린 채로 편집하면 커서가 안 보인다 */
  onRequestExpand?: () => void
  /**
   * 다른 섹션으로 옮기기 — '배경으로'·'여파로'처럼. 전개에 '배경' 단락이 섞인 사건이 9건이었는데,
   * 옮길 길이 없어 지우고 다시 써야 했다. 주면 단락 도구에 '옮기기'가 생긴다.
   */
  moveTargets?: ReadonlyArray<{ kind: SectionKind; label: string }>
  onMoveToSection?: (index: number, kind: SectionKind) => void
}

export function NarrativeSectionList({
  rows,
  onFieldChange,
  onMove,
  onRemove,
  onPersonClick,
  onEntityLink,
  labelPrefix,
  bodyPlaceholder,
  anchorPrefix,
  autoEditKey,
  subjectOptions,
  lead,
  collapsed = false,
  clampLead = false,
  onRequestExpand,
  moveTargets,
  onMoveToSection,
}: NarrativeSectionListProps) {
  /** '옮기기' 메뉴가 열린 단락 */
  const [moveMenuKey, setMoveMenuKey] = useState<string | null>(null)
  /**
   * '제목 붙이기'로 연 단락들 — 제목이 빈 채로도 입력을 띄워 두려면 이 기억이 필요하다
   * (값이 여전히 빈 문자열이라 title만 보고는 "열어 둔 것"과 "없는 것"을 구분 못 한다).
   */
  const [titleOpenKeys, setTitleOpenKeys] = useState<string[]>([])
  /**
   * 본문이 빈 단락에서 제목을 저장하면 그 단락의 본문 편집기를 곧장 연다. 예전엔 Enter 뒤
   * 포커스가 body로 떨어지고, 본문을 쓰려면 옆의 작은 ✎를 다시 찾아 눌러야 했다(실측).
   */
  const [bodyOpenKey, setBodyOpenKey] = useState<string | null>(null)

  /**
   * 줄여 보기에서 하나씩 연 단락 — 다시 줄이면(collapsed가 참이 되면) 모두 닫힌 데서 시작한다.
   * 줄여 보기가 아닐 때는 쓰지 않는다(전부 열려 있다).
   */
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set())
  useEffect(() => {
    if (collapsed) setOpenKeys(new Set())
  }, [collapsed])
  const toggleRow = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  /*
   * 목차·장부·해시·찾기가 접힌 단락(#background-3)으로 가려 하면 **그 단락만** 연다 — 이벤트를 여기서
   * 멈춰 섹션 전체 펼치기(DetailNarrative)까지 올라가지 않게 한다. flushSync: 부른 쪽이 곧바로 좌표를 잰다.
   */
  const stackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = stackRef.current
    if (!node || !collapsed) return undefined
    const onReveal = (revealEvent: Event) => {
      const item = (revealEvent.target as HTMLElement).closest<HTMLElement>('[data-row-key]')
      const key = item?.dataset.rowKey
      if (!key) return
      revealEvent.stopPropagation()
      flushSync(() => setOpenKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key))))
    }
    node.addEventListener(REVEAL_ANCHOR_EVENT, onReveal)
    return () => node.removeEventListener(REVEAL_ANCHOR_EVENT, onReveal)
  }, [collapsed])

  return (
    <SectionStack
      ref={stackRef}
      $compact={collapsed}
      onFocusCapture={(focusEvent) => {
        if (!collapsed || !onRequestExpand) return
        /* 단락(제목 버튼·하나씩 연 본문)은 제자리에서 다룬다 — 섹션 전체를 펴는 건 잘린 요약을 편집할 때뿐 */
        if ((focusEvent.target as HTMLElement).closest('[data-row-key]')) return
        onRequestExpand()
      }}
    >
      {lead && (
        <SectionItem>
          <LeadNode aria-hidden />
          <SectionPeriod>요약</SectionPeriod>
          {collapsed && clampLead ? <LeadClamp>{lead}</LeadClamp> : lead}
        </SectionItem>
      )}
      {rows.map((row, index) => {
        const hasTitle = row.title.trim().length > 0
        const titleOpen =
          hasTitle || row.key === autoEditKey || titleOpenKeys.includes(row.key)
        const ordinal = index + 1
        const { period, title: titleText } = splitTitlePeriod(row.title)
        const anchorId = `${anchorPrefix}-${ordinal}`
        const bodyLength = plainTextLength(row.content)
        const rowOpen = !collapsed || openKeys.has(row.key)
        return (
          <SectionItem
            key={row.key}
            id={anchorId}
            data-row-key={row.key}
            data-open={collapsed && rowOpen ? 'true' : undefined}
          >
            {/* 타임라인 노드 — 선 위의 번호. 시기가 있으면 노드는 그 날짜 줄과 나란히 선다(연혁과 같은 문법) */}
            <SectionIndex aria-hidden>{ordinal}</SectionIndex>
            {period && <SectionPeriod>{period}</SectionPeriod>}
            {collapsed ? (
              /* 줄인 단락 — 누르면 이 단락만 제자리에서 열고 닫는다. 펼친 제목과 같은 크기·굵기 */
              <CollapsedHead
                type="button"
                aria-expanded={rowOpen}
                aria-controls={`${anchorId}-body`}
                onClick={() => toggleRow(row.key)}
                aria-label={`${labelPrefix} ${ordinal}단락 — ${hasTitle ? titleText : '제목 없음'}`}
              >
                {hasTitle ? (
                  titleText
                ) : (
                  /* 제목 없는 단락은 본문 첫머리로 — '제목 없음'만 늘어서면 무엇인지 모른다 */
                  <CollapsedPreview>{bodyPreview(row.content) || '빈 단락'}</CollapsedPreview>
                )}
                <CollapsedTail aria-hidden>
                  {bodyLength > 0 && `${bodyLength.toLocaleString('ko-KR')}자`}
                  <FiChevronDown />
                </CollapsedTail>
              </CollapsedHead>
            ) : (
              <SectionHead>
                {titleOpen ? (
                  <SectionTitleHost>
                    <InlineText
                      value={row.title}
                      onSave={(next) => {
                        onFieldChange(index, { title: next })
                        if (next.trim() && !hasBodyText(row.content)) {
                          setBodyOpenKey(row.key)
                        }
                      }}
                      placeholder="단락 제목 — 예: 개전 배경, 전쟁 경과"
                      hint="Enter 저장 · Esc 취소"
                      label={`${labelPrefix} ${ordinal}단락 제목`}
                      /* 시기는 위 날짜 줄로 올렸다 — 읽을 때만 떼고, 편집은 원문 그대로 */
                      renderRead={(value) => splitTitlePeriod(value).title}
                      /* 방금 만든 단락·방금 연 제목은 입력이 열린 채로 뜬다. */
                      autoEdit={!hasTitle}
                    />
                  </SectionTitleHost>
                ) : (
                  <AddTitleBtn
                    type="button"
                    onClick={() =>
                      setTitleOpenKeys((keys) => [...keys, row.key])
                    }
                  >
                    <FiType aria-hidden />
                    제목 붙이기
                  </AddTitleBtn>
                )}
                {subjectOptions && subjectOptions.length > 0 && (
                  <SubjectPicker data-linked={row.subjectEventId ? 'true' : undefined}>
                    <InlineSelect
                      value={row.subjectEventId ?? ''}
                      options={[{ value: '', label: '연결 안 함' }, ...subjectOptions]}
                      onSave={(next) => onFieldChange(index, { subjectEventId: next || null })}
                      placeholder="↳ 하위 사건"
                      label={`${labelPrefix} ${ordinal}단락이 서술하는 하위 사건`}
                      prefix={row.subjectEventId ? <span aria-hidden="true">↳ </span> : undefined}
                    />
                  </SubjectPicker>
                )}
                <RowActions>
                  <RowActionBtn
                    type="button"
                    onClick={() => onMove(index, -1)}
                    disabled={index === 0}
                    aria-label={`${ordinal}단락 위로`}
                    title="위로"
                  >
                    <FiArrowUp />
                  </RowActionBtn>
                  <RowActionBtn
                    type="button"
                    onClick={() => onMove(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`${ordinal}단락 아래로`}
                    title="아래로"
                  >
                    <FiArrowDown />
                  </RowActionBtn>
                  {moveTargets && moveTargets.length > 0 && onMoveToSection && (
                    <MoveHost
                      onBlur={(blurEvent) => {
                        if (!blurEvent.currentTarget.contains(blurEvent.relatedTarget as Node | null)) setMoveMenuKey(null)
                      }}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === 'Escape') setMoveMenuKey(null)
                      }}
                    >
                      <RowActionBtn
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={moveMenuKey === row.key}
                        onClick={() => setMoveMenuKey((current) => (current === row.key ? null : row.key))}
                        aria-label={`${ordinal}단락 다른 섹션으로 옮기기`}
                        title="다른 섹션으로 옮기기"
                      >
                        <FiCornerUpRight />
                      </RowActionBtn>
                      {moveMenuKey === row.key && (
                        <MoveMenu role="menu">
                          {moveTargets.map((target) => (
                            <MoveMenuItem
                              key={target.kind}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMoveMenuKey(null)
                                onMoveToSection(index, target.kind)
                              }}
                            >
                              {target.label}
                            </MoveMenuItem>
                          ))}
                        </MoveMenu>
                      )}
                    </MoveHost>
                  )}
                  <RowActionBtn
                    type="button"
                    onClick={() => onRemove(index)}
                    aria-label={`${ordinal}단락 삭제`}
                    title="삭제"
                    $danger
                  >
                    <FiTrash2 />
                  </RowActionBtn>
                </RowActions>
              </SectionHead>
            )}
            {/* 줄여 보기에도 본문은 같은 자리에 둔 채 숨긴다 — 모드가 바뀌어도 이 노드가 살아 있어야
                찾기(Ctrl+F)가 펼친 뒤에도 그 글자를 가리킨다. 찾기가 닿으면 브라우저가 beforematch를 쏜다 */}
            <UntilFound id={`${anchorId}-body`} active={!rowOpen} onBeforeMatch={revealAnchor}>
              <SectionBodyHost>
                <InlineRichText
                  value={row.content}
                  onSave={(next) => onFieldChange(index, { content: next })}
                  placeholder={bodyPlaceholder}
                  label={`${labelPrefix} ${ordinal}단락 본문`}
                  onPersonClick={onPersonClick}
                  onEntityLink={onEntityLink}
                  transformReadHtml={readProseHtml}
                  autoOpen={row.key === bodyOpenKey}
                  /**
                   * sticky ✎ 금지 — sticky는 '개요'처럼 페이지를 통째로 차지하는 긴 본문
                   * 하나를 위한 것이다. 단락이 여럿 쌓인 목록에서 켜 두면 각 단락의 버튼이
                   * 제 블록을 벗어나 **다음 단락 위로 떠다닌다**(InlineRichText 주석 참고).
                   */
                  stickyEditButton={false}
                />
              </SectionBodyHost>
            </UntilFound>
          </SectionItem>
        )
      })}
    </SectionStack>
  )
}

/** 줄인 단락의 미리보기 — 본문 첫머리 한 줄(제목이 없을 때만) */
function bodyPreview(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

/**
 * `hidden="until-found"` — 화면에선 빠지되 페이지 찾기에는 걸리는 숨김. React 속성으로는 문자열 값을
 * 보장할 수 없어 DOM에 직접 단다. 찾기가 닿으면 브라우저가 속성을 걷고 beforematch를 쏜다.
 */
function UntilFound({
  id,
  active,
  children,
  onBeforeMatch,
}: {
  id?: string
  active: boolean
  children: ReactNode
  onBeforeMatch: (node: HTMLElement) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onBeforeMatchRef = useRef(onBeforeMatch)
  onBeforeMatchRef.current = onBeforeMatch
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (!active) {
      node.removeAttribute('hidden')
      return undefined
    }
    /* until-found를 모르는 브라우저는 hidden을 그냥 참으로 읽는다 — 숨김 자체는 어디서나 보장 */
    node.setAttribute('hidden', 'until-found')
    const handle = () => onBeforeMatchRef.current(node)
    node.addEventListener('beforematch', handle)
    return () => node.removeEventListener('beforematch', handle)
  }, [active])
  return (
    <div id={id} ref={ref}>
      {children}
    </div>
  )
}

/** 태그를 걷어낸 글자가 있는가 — 빈 <p></p>만 남은 본문을 '비었다'로 본다. */
function hasBodyText(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

/* ───────────────────────── 조판 ───────────────────────── */

/**
 * 타임라인 — 기업 상세 연혁과 같은 문법(2026-10-15 사용자: "연혁처럼 타임라인 느낌").
 * 좌측 세로선 하나에 단락마다 번호 노드가 꿰이고, 시기가 있으면 노드 옆 날짜 줄이 먼저 온다.
 * 본문은 선 오른쪽으로 들여 쓴다(TIMELINE_INSET).
 */
const TIMELINE_INSET = 38
const NODE_SIZE = 22

export const SectionStack = styled.div<{ $compact?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  /* 줄여 보기는 목차처럼 촘촘히 — 단락마다 본문 자리였던 32px을 다 띄우면 줄인 보람이 없다 */
  gap: ${({ $compact }) => ($compact ? 14 : 32)}px;

  /* 세로선 — 첫 노드 가운데에서 시작해 마지막 노드 아래로 조금 흘러내린다 */
  &::before {
    content: '';
    position: absolute;
    left: ${NODE_SIZE / 2 - 1}px;
    top: ${NODE_SIZE / 2}px;
    bottom: 0;
    width: 2px;
    border-radius: 1px;
    /* border.default는 이 지면 배경에서 거의 안 보였다(실측) — 장부 hairline(strong)으로 */
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  @media (max-width: 640px) {
    gap: ${({ $compact }) => ($compact ? 12 : 26)}px;
  }
`

const SectionItem = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: ${TIMELINE_INSET}px;

  @media (max-width: 640px) {
    padding-left: ${TIMELINE_INSET - 8}px;
  }
  /* 단락 하나를 직접 가리키는 앵커(#background-2) — 헤더 아래로 파묻히지 않게. */
  scroll-margin-top: 24px;

  /* 줄여 보기에서 하나만 연 단락 — 다음 제목 줄과 붙지 않게 본문 아래를 띄운다 */
  &[data-open='true'] {
    padding-bottom: 12px;
  }
`

/** 번호 + 제목(또는 '제목 붙이기') 한 줄. 액션은 이 줄 우측에 겹쳐 뜬다. */
const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  /* 우측 액션이 제목 위로 올라타지 않도록 비워 두는 폭(3 × 24 + 간격). */
  /* 오른쪽 도구가 제목 위로 올라타지 않도록 비워 두는 폭(4 × 24 + 간격) */
  padding-right: 112px;
  min-height: 23px;
`

/**
 * 순번 — **제목의 서수**다.
 *
 * 예전엔 좌측 거터에 12.5px로 앉혀 두었는데, 본문을 52px 들여쓰는 값을 치르고도 정작
 * 제목(17.5px 볼드)보다 작아 "여기서부터 새 단락"을 제 힘으로 말하지 못했다. 제목과 같은
 * 크기의 mono 숫자로 제목 앞에 세우면 들여쓰기 없이도 경계가 선다. 색은 한 단 낮춰
 * 제목보다 앞서지 않게 하고, 색상(accent)은 쓰지 않는다 — 단락 수만큼 색 토큰이 늘어난다.
 */
const SectionIndex = styled.span`
  ${DIGIT_DISPLAY}
  position: absolute;
  left: 0;
  top: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${NODE_SIZE}px;
  height: ${NODE_SIZE}px;
  border-radius: 50%;
  box-sizing: border-box;
  border: 2px solid ${({ theme }) => theme.colors.text.tertiary};
  /* 지면색으로 채워 선을 끊는다 + 바깥 후광으로 선과 노드 사이를 띄운다(연혁 노드와 같은 처리) */
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  /* 이 번호가 단락의 유일한 표지일 때가 있다 — text.tertiary는 AA 미달(라이트 2.54:1). */
  color: ${metaText};
  user-select: none;
`

/** 요약 마디의 노드 — 번호 노드와 같은 중심선 위의 작은 채운 점(번호가 아니라 '들머리'라서) */
const LeadNode = styled.span`
  position: absolute;
  left: ${NODE_SIZE / 2 - 5}px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.text.tertiary};
  box-shadow: 0 0 0 3px ${({ theme }) => ledgerBackground(theme.mode)};
`

/**
 * 줄여 보기의 요약 — 네 줄(15.5px × 1.78)까지 보이고 아래를 흐린다.
 * 흐림은 mask라 지면색을 몰라도 된다(ClampedBlock과 같은 처리).
 */
const LeadClamp = styled.div`
  max-height: ${Math.round(15.5 * 1.78 * 4)}px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 55%, transparent);
`

/** 줄인 단락의 머리 — 누르면 펼치고 그 단락으로 간다. 우측 글자수는 '얼마나 긴 단락인가'의 귀띔 */
const CollapsedHead = styled.button`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 23px;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: -0.01em;
  text-align: left;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: color ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 3px;
    border-radius: ${RADIUS.XS};
  }

  @media (max-width: 640px) {
    font-size: 15px;
  }
`

const CollapsedPreview = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 우측 끝 — 글자수 + 열림 표시(▾, 열리면 뒤집힌다) */
const CollapsedTail = styled.span`
  ${DIGIT_DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};

  svg {
    width: 14px;
    height: 14px;
    transition: transform ${MOTION.fast};
  }
  [aria-expanded='true'] > & svg {
    transform: rotate(180deg);
  }
`

/** 시기 줄 — 연혁의 날짜 줄(TLDate)과 같은 크기·굵기. 노드와 같은 높이에서 시작한다. */
const SectionPeriod = styled.div`
  /* '1912년 2월'처럼 한글이 섞여 mono(DIGIT_DISPLAY)는 쓰지 않는다 — 숫자 폭만 맞춘다 */
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  color: ${({ theme }) => theme.colors.text.secondary};

  /* 시기가 첫 줄이면 제목은 바로 아래에 붙는다 */
  & + * {
    margin-top: -4px;
  }
`

/**
 * 단락 제목 — **섹션 제목(20px)과 본문(15.5px) 사이**의 단.
 *
 * 17.5px이던 시절엔 섹션 제목과 2.5px 차이라, 목록이 근인으로 짚었던 "머리글이 행
 * 제목과 픽셀 단위로 같다"와 같은 상태였다(섹션 24 → 20으로 내린 직후 생긴 동률).
 * 16px으로 한 단 내려 20 : 16 = 1.25배 — 목록의 세기 18 : 행 14(1.29)와 같은 층이다.
 * 바로 아래 본문(15.5)과는 크기가 아니라 **굵기**(700 vs 400)가 가른다.
 */
const SectionTitleHost = styled.div`
  ${S.longFormEditAffordance}
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: 15px;
  }
`

/**
 * 제목이 없는 단락의 제목 자리 — 비워 두지 않고 진입점을 둔다.
 * 누르면 그 자리에서 입력이 열리고 포커스까지 온다(InlineText autoEdit).
 */
const AddTitleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${metaText};
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity ${MOTION.fast}, color ${MOTION.fast};

  &:hover {
    opacity: 1;
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 3px;
    border-radius: ${RADIUS.XS};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

/**
 * 단락 액션(순서·삭제) — '관리 모드'를 없앤 자리.
 *
 * 모드 전환은 두 번의 클릭과 "지금 무슨 모드인가"라는 기억을 요구했고, 정작 할 일은
 * 단락 하나를 옮기거나 지우는 것뿐이었다. 그 단락에 손이 닿을 때 제자리에 띄운다.
 * absolute라 나타나고 사라져도 글이 밀리지 않는다.
 */
/** '옮기기' 단추 + 그 아래 작은 메뉴 */
const MoveHost = styled.span`
  position: relative;
  display: inline-flex;
`

const MoveMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 132px;
  padding: 4px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 6px 18px rgba(0, 0, 0, 0.5)' : '0 6px 18px rgba(15, 23, 42, 0.1)'};
`

const MoveMenuItem = styled.button`
  padding: 6px 10px;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
    outline: none;
  }
`

const RowActions = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  gap: 4px;
  opacity: 0;
  transition: opacity ${MOTION.fast};

  ${SectionItem}:hover &,
  ${SectionItem}:focus-within & {
    opacity: 1;
  }

  /* hover가 없는 환경(터치)에는 '손이 닿는' 순간이 없다 — 상시 노출. */
  @media (hover: none) {
    opacity: 1;
  }
`

const RowActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  /* 지면색으로 채운다 — 글 위에 겹쳐 뜨므로 투명하면 본문 글자가 비쳐 읽힌다. */
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.error : theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color ${MOTION.fast}, color ${MOTION.fast},
    background ${MOTION.fast};

  &:hover:not(:disabled) {
    border-color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.tertiary};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.text.primary};
  }

  /* 보이지 않는 동안에도 Tab이 닿는다 — 닿는 순간 RowActions가 focus-within으로 드러난다. */
  &:focus-visible {
    outline: 2px solid
      ${({ theme, $danger }) => ($danger ? theme.colors.error : ledgerAccent(theme.mode))};
    outline-offset: 1px;
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

/** 단락 본문 — 섹션 리드 문단과 **같은 좌측 기준선·같은 가독폭**. */
const SectionBodyHost = styled.div`
  ${S.longFormEditAffordance}
  ${S.proseTableBreakout}
  ${S.proseHeadingRhythm}
  font-size: 15.5px;
  line-height: 1.78;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: ${S.PROSE_WIDTH}px;

  /* 표가 든 단락만 풀어 표는 문서 열 전체로 — 글줄은 Main의 규칙이 여전히 720에 묶는다(전체 폭 지면) */
  &:has(table) {
    max-width: none;
  }
`

/**
 * 단락 추가 — 점선 상자 대신 목록의 마지막 행처럼 읽히는 조용한 행.
 * 누르면 새 단락의 **제목 입력이 열린 채** 나타난다(만든 행위가 곧 '쓰겠다'는 뜻이므로).
 */
const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 7px 12px 7px 0;
  border: none;
  background: transparent;
  color: ${metaText};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color ${MOTION.fast};

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: ${RADIUS.XS};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

export function AddSectionButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <AddBtn type="button" onClick={onClick}>
      <FiPlus /> {label}
    </AddBtn>
  )
}

/** 단락 → 하위 사건 연결(D2) — 연결 전에는 옅게, 연결되면 본문 색 */
const SubjectPicker = styled.div`
  flex-shrink: 0;
  max-width: 40%;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};

  &[data-linked='true'] {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
