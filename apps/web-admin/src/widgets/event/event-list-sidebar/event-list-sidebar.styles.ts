/**
 * 사건 목록 사이드바의 **목록 조판 스코프**.
 *
 * 조판은 **인물 목록과 같은 골격**이다(shared/ui/sidebar-list 기본값):
 * 선두 고정폭 열 · 제목 15 · 메타 12 · 같은 행 높이와 여백. 예전엔 사건만 제목 14에
 * 행을 촘촘히 눌러 담아, 같은 좌측 목록인데 지면을 옮길 때마다 리듬이 바뀌었다.
 *
 * 인물이 얼굴을 세우는 선두 열에 사건은 **날짜**를 세운다 — 썸네일 보유율이 13%뿐이라
 * (인물 40%) 그 자리를 이미지로 채우면 87%가 빈 블록이 되고 제목 폭만 먹는다.
 *
 *     ● 21세기                    35 ⌄     ← 섹션 (공용 그룹 헤더)
 *       2026년                             ← 연   (사건 고유 축)
 *      9.14  미국 10년물 국채 금리 5%선 돌파   ← 선두 날짜 + 제목 15
 *            경제 · ↳ NSPM-2 서명           ← 메타 12
 *
 * 여기 남는 건 인물에 **대응물이 없는 것**뿐이다: 연 소제목(sticky 시간축)과 그것이
 * 기대는 세기 헤더 높이, 그리고 선두 날짜 열의 폭.
 *
 * ⚠️ display: contents — 스코프 div는 박스를 만들지 않는다. 사이드바는 MainGrid의 트랙
 * 하나를 그대로 차지해야 하므로 여기서 래퍼가 레이아웃에 끼면 폭·sticky가 전부 어긋난다.
 * (커스텀 속성은 display:contents를 그대로 통과하므로 변수는 내려보낼 수 있다.)
 * ⚠️ 지면색·채움·선택 톤·상단 크롬 치수 같은 *공통 표면*은 공용 sidebar-list가 갖고 있다.
 * 그쪽을 고칠 것(고치면 전 지면이 같이 바뀐다 — 의도된 것).
 * ⚠️ 이 파일의 주석에 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 그 자리에서 닫힌다.
 */
import styled from 'styled-components'

import * as S from '@/shared/ui/sidebar-list'

export const EventListScope = styled.div`
  display: contents;

  ${S.VirtualList} {
    /* 세기 헤더 높이 — 연 소제목이 그 **아래에 이어 붙어** 서려면 형제들이 같은 값을 봐야
       한다. 공용 헤더의 자연 높이(패딩 14+6 + 12px 라벨)와 같은 값을 못 박아 둔 것이다.
       ⚠️ 공용 헤더의 패딩·글자 크기를 바꾸면 이 값도 같이 바꿔야 연 소제목이 뜬다. */
    --century-h: 35px;
    /* 공용 스크롤러의 위쪽 패딩 — sticky 머리글이 이만큼 끌어올려져야 한다(아래 ⚠️) */
    --list-pad-top: 6px;
  }

  /* ── 세기 ──────────────────────────────────────────────────────────────── */
  ${S.GroupSectionHeader} {
    /* ⚠️ sticky의 top은 스크롤 컨테이너의 **패딩 박스** 기준이다. 0으로 두면 머리글이
       padding-top만큼 아래에 멈춰, 그 틈으로 지나가는 행의 글자 윗부분이 비친다. */
    top: calc(-1 * var(--list-pad-top, 6px));
    box-sizing: border-box;
    /* ⚠️ 스크롤러가 flex column이라 flex-shrink 기본값이 높이를 min-content까지 깎는다
       — 못 박은 높이가 무너지면 연 소제목이 세기 헤더 아래 틈에 떠 버린다. */
    flex-shrink: 0;
    height: var(--century-h);
  }

  /* 건수와 캐럿을 라벨 뒤로 — 공용은 캐럿이 맨 앞이지만, 사건은 세기마다 건수가 크게
     달라(3건 ↔ 121건) 그 수가 라벨 바로 옆에서 읽혀야 어디를 펼칠지 고를 수 있다. */
  ${S.GroupCaret} {
    order: 3;
    margin: 0 0 0 6px;
  }
  ${S.GroupCount} {
    order: 2;
  }

  /* ── 연 ─────────────────────────────────────────────────────────────────
     세기 헤더 바로 아래에 이어 붙어 따라다닌다. 한 세기가 121건이면 스크롤 두세 번에
     연도 문맥이 사라지는데, '지금 몇 년을 보고 있나'는 제목만큼 중요한 좌표다.
     z-index는 세기(2)보다 낮게 — 다음 세기 헤더가 올라오면 그 밑으로 사라져야 한다. */
  ${S.RowDivider} {
    position: sticky;
    flex-shrink: 0;
    top: calc(var(--century-h, 35px) - var(--list-pad-top, 6px));
    z-index: 1;
    background: ${({ theme }) => S.sidebarSurface(theme)};
    /* ⚠️ 위아래 여백은 **모든 연에 똑같이**. 세기 헤더 뒤에 오는 첫 해만 0으로 두면
       멈춰 있는 머리글 덩어리 높이가 54↔66px로 오가며 스크롤 중에 출렁인다(실측).
       ⚠️ margin이 아니라 padding이어야 한다 — sticky 오프셋은 margin 박스 기준이라
       margin-top을 주면 멈췄을 때 세기 헤더와의 사이가 벌어져 그 틈으로 행이 비친다. */
    padding: 10px 12px 6px;
  }

  /* ── 행 ─────────────────────────────────────────────────────────────────
     두 겹의 sticky(세기 + 연) 밑에 선택 행이 숨지 않도록 여백만 손본다.
     나머지(패딩·높이·둥근 면·좌측 strip)는 전부 공용 = 인물과 같은 리듬. */
  ${S.ListRow} {
    scroll-margin-top: calc(var(--century-h, 35px) + 34px);
  }

  /* aria-selected는 $active prop과 별개 경로라 공용 규칙이 닿지 않는다 — 같은 값으로 맞춘다 */
  ${S.ListRow}[aria-selected='true'],
  ${S.ListRow}[aria-selected='true']:hover {
    background: ${({ theme }) => S.sidebarRowSelected(theme)};
  }

  /* ── 선두 날짜 열 ────────────────────────────────────────────────────────
     인물의 아바타(32px)와 같은 자리·같은 폭 리듬. 오른쪽 맞춤이라 '9.4'와 '12.28'의
     끝자리가 한 줄에 서고, 제목들의 왼쪽 선도 행마다 같다.
     연 정밀도 사건은 값이 비지만 폭은 그대로 — 열이 무너지지 않는다. */
  ${S.RowLead} {
    /* 36px = 가장 긴 값('11.27')의 실측 33.3px + 여유 2.7px.
       인물의 아바타 열은 32px이지만 그건 이미지 치수고, 이쪽은 글자가 정하는 폭이다.
       32px로 맞추면 헤드룸이 -1.3px라 두 자리 달·날짜가 잘린다(실측).
       ⚠️ 선두 값의 글자 크기나 서체를 바꾸면 이 폭을 다시 재야 한다. */
    width: 36px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    /* 제목 첫 줄과 눈높이를 맞춘다(제목 15 * 1.4 = 21, 날짜 12 * 1.4 = 17) */
    padding-top: 2px;
    align-self: flex-start;
  }

  ${S.SubMeta} {
    /* ⚠️ opacity로 톤을 낮추지 않는다 — 분류 색은 지면색에서 4.5:1을 넘도록 계산해 넣는데
       (category-ink), 줄 전체에 0.9를 걸면 그 계산이 조용히 무너진다. 톤은 색으로 정한다. */
    font-weight: 400;
  }

  /* 제목이 두 줄까지 접히는 도메인이라 선두 열·우측 슬롯은 첫 줄에 붙어야 한다 */
  ${S.RowTop} {
    align-items: flex-start;
  }
  ${S.RowRight} {
    align-self: flex-start;
    padding-top: 2px;
  }
`
