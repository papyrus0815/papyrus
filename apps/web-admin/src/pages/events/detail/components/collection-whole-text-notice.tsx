import styled from 'styled-components'

import { ledgerAccentSubtle } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'

import * as S from '../styles'
import { TextButton } from './collection-development.styles'

/**
 * 묶음 사건의 '전체 글' 안내 — 배경·여파가 둘 다 비었을 때 개요 탭 머리에 한 줄.
 *
 * 묶음 사건은 전개를 하위 사건에 맡기므로, 이 사건 자신의 글은 '전체가 무엇이었고(개요) 왜
 * 일어나(배경) 어떻게 끝났나(여파)'뿐이다. 1차세계대전은 하위 18건을 거느리면서 이 셋이 모두 0자였다.
 */
export function CollectionWholeTextNotice({
  onWriteSummary,
  onWriteBackground,
  onWriteNarrative,
  onWriteAftermath,
}: {
  /** 요약도 비었으면 — 빈 요약 자리표시를 따로 세우지 않고 여기서 쓴다 */
  onWriteSummary?: () => void
  onWriteBackground: () => void
  /**
   * 단일 사건의 '아직 글이 없다' 안내로 쓸 때 — 단일 사건은 전개도 제 글이라 전개 쓰기가 붙는다.
   * (글이 하나도 없는 단일 사건 11건은 빈 요약 기울임 한 줄 + 칩 띠 + 그보다 큰 댓글 칸이 전부였다)
   */
  onWriteNarrative?: () => void
  onWriteAftermath: () => void
}) {
  const single = Boolean(onWriteNarrative)
  return (
    <Notice role="note">
      <NoticeText>
        {single ? (
          <>
            <b>아직 글이 없습니다.</b> 요약 한 문단으로 시작하거나, 배경·전개·여파로 나눠 씁니다.
          </>
        ) : (
          <>
            <b>전체에 대한 글이 비어 있습니다.</b> 전개는 하위 사건이 맡고, 이 사건에는{' '}
            {onWriteSummary ? '요약·배경·여파' : '배경·여파'}를 씁니다.
          </>
        )}
      </NoticeText>
      <NoticeActions>
        {onWriteSummary && (
          <TextButton type="button" onClick={onWriteSummary}>
            요약 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteBackground}>
          배경 쓰기
        </TextButton>
        {onWriteNarrative && (
          <TextButton type="button" onClick={onWriteNarrative}>
            전개 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteAftermath}>
          여파 쓰기
        </TextButton>
      </NoticeActions>
    </Notice>
  )
}

/*
 * '아직 글이 없다' 안내 — 면 없는 한 줄. 예전엔 강조색 면 상자라 오른쪽 '비어 있는 항목 · 채우기', 아래 '더 채울 수
 * 있는 것'과 함께 같은 말이 세 번, 그중 가장 크게 섰다. 쓰기 단추만 강조색으로 남긴다.
 */
const Notice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 2px 0 2px 12px;
  border-left: 2px solid ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const NoticeText = styled.p`
  flex: 1 1 320px;
  margin: 0;
  /* 한국어는 낱말 경계에서 줄을 바꾼다 — 안 그러면 '배 / 경'처럼 낱말이 잘린다 */
  word-break: keep-all;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${metaText};

  b {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const NoticeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
`
