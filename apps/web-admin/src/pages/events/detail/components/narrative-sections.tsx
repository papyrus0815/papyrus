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
import { type ReactNode, useState } from 'react'

import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2, FiType } from 'react-icons/fi'
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

import * as S from '../styles'
import { InlineRichText, InlineSelect, InlineText } from './inline'
import { type SectionRow, splitTitlePeriod } from './narrative-sections.lib'

export * from './narrative-sections.lib'

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
}: NarrativeSectionListProps) {
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

  return (
    <SectionStack>
      {lead && (
        <SectionItem>
          <LeadNode aria-hidden />
          <SectionPeriod>요약</SectionPeriod>
          {lead}
        </SectionItem>
      )}
      {rows.map((row, index) => {
        const hasTitle = row.title.trim().length > 0
        const titleOpen =
          hasTitle || row.key === autoEditKey || titleOpenKeys.includes(row.key)
        const ordinal = index + 1
        const { period } = splitTitlePeriod(row.title)
        return (
          <SectionItem key={row.key} id={`${anchorPrefix}-${ordinal}`}>
            {/* 타임라인 노드 — 선 위의 번호. 시기가 있으면 노드는 그 날짜 줄과 나란히 선다(연혁과 같은 문법) */}
            <SectionIndex aria-hidden>{ordinal}</SectionIndex>
            {period && <SectionPeriod>{period}</SectionPeriod>}
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
            <SectionBodyHost>
              <InlineRichText
                value={row.content}
                onSave={(next) => onFieldChange(index, { content: next })}
                placeholder={bodyPlaceholder}
                label={`${labelPrefix} ${ordinal}단락 본문`}
                onPersonClick={onPersonClick}
                onEntityLink={onEntityLink}
                transformReadHtml={emphasisToHtml}
                autoOpen={row.key === bodyOpenKey}
                /**
                 * sticky ✎ 금지 — sticky는 '개요'처럼 페이지를 통째로 차지하는 긴 본문
                 * 하나를 위한 것이다. 단락이 여럿 쌓인 목록에서 켜 두면 각 단락의 버튼이
                 * 제 블록을 벗어나 **다음 단락 위로 떠다닌다**(InlineRichText 주석 참고).
                 */
                stickyEditButton={false}
              />
            </SectionBodyHost>
          </SectionItem>
        )
      })}
    </SectionStack>
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

export const SectionStack = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 32px;

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
    gap: 26px;
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
`

/** 번호 + 제목(또는 '제목 붙이기') 한 줄. 액션은 이 줄 우측에 겹쳐 뜬다. */
const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  /* 우측 액션이 제목 위로 올라타지 않도록 비워 두는 폭(3 × 24 + 간격). */
  padding-right: 84px;
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
