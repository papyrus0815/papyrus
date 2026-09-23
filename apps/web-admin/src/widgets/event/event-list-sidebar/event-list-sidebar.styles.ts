/**
 * 사건 목록 사이드바의 **목록 조판 스코프**.
 *
 * 조판 규칙 셋:
 *   ⑴ 행 사이에 선을 긋지 않는다. 여백이 가르고, 호버·선택은 **둥근 면**으로 말한다.
 *   ⑵ 글자 크기가 곧 위계다 — 제목 14 > 메타 12 · 세기 12 > 연 11.
 *      한때 13/11/11/11로 거의 단조였고, 그래서 어디를 봐야 할지가 안 보였다.
 *   ⑶ 불투명 면은 지면색 하나, 색은 분류(글자)와 선택(면)에만.
 *
 *     ● 21세기                    35 ⌄     ← 섹션 (12/700 + 시대 램프 도트)
 *       2026년                             ← 연   (11/600)
 *     ╭──────────────────────────────╮
 *     │ 미국 10년물 국채 금리 5%선 돌파 │     ← 제목 (14/600)
 *     │ 9.14 · 경제 · ↳ NSPM-2 서명   │     ← 메타 (12/400)
 *     ╰──────────────────────────────╯
 *
 * ⚠️ display: contents — 스코프 div는 박스를 만들지 않는다. 사이드바는 MainGrid의 트랙
 * 하나를 그대로 차지해야 하므로 여기서 래퍼가 레이아웃에 끼면 폭·sticky가 전부 어긋난다.
 * (커스텀 속성은 display:contents를 그대로 통과하므로, 필요하면 --sidebar-surface 같은 공용
 * 값을 여기서 변수로 내려보낼 수 있다 — 지금은 공용 기본값을 그대로 쓴다.)
 * ⚠️ 여기 규칙은 전부 **사건 지면 한정 조판**이다. 지면색·채움·선택 톤 같은 *공통 표면*은
 * 공용 sidebar-list가 갖고 있으니 그쪽을 고칠 것(고치면 전 지면이 같이 바뀐다 — 의도된 것).
 * ⚠️ 이 파일의 주석에 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 그 자리에서 닫힌다.
 */
import styled from 'styled-components'

import * as S from '@/shared/ui/sidebar-list'

export const EventListScope = styled.div`
  display: contents;

  /* 지면색·채움·선택 톤은 전부 공용 sidebar-list의 기본값을 그대로 쓴다.
     (흰 지면 + 경계선 한 줄 규약은 여기서 시작했지만, 이제 전 지면 공통이라 승격했다.)
     여기 남은 건 **사건 목록만의 조판** — 칸 크기와 세기/연/제목/메타의 위계다. */
  ${S.SearchInput} {
    height: 38px;
    font-size: 13.5px;
  }
  ${S.FilterSelect} {
    height: 32px;
    font-size: 12px;
  }

  ${S.VirtualList} {
    /* 둥근 행이 지면 안쪽으로 들어앉는 여백 + 행 자체의 좌우 패딩.
       둘을 더한 20px이 **모든 글자의 왼쪽 선**이다(세기·연·제목·메타). */
    --list-inset: 8px;
    --row-pad-x: 12px;
    --text-left: 20px;
    /* 세기 헤더 높이 — 연 소제목이 그 아래에 서려면 형제들이 같은 값을 봐야 한다 */
    --century-h: 34px;
    /* 스크롤러 위쪽 여백 — sticky 머리글이 이만큼 끌어올려져야 한다(아래 ⚠️) */
    --list-pad-top: 4px;
    padding: var(--list-pad-top) 0 calc(var(--user-panel-height, 52px) + 20px);
    gap: 2px;
  }

  /* ── 세기 ────────────────────────────────────────────────────────────────
     섹션 머리. 내용(14px 제목)보다 작아야 라벨로 읽힌다 — 머리글이 더 크면 목록을
     정리하는 쪽이 목록보다 크게 외친다. 눈에 띄는 일은 크기가 아니라 시대 램프 도트가 맡는다. */
  ${S.GroupSectionHeader} {
    /* ⚠️ sticky의 top은 스크롤 컨테이너의 **패딩 박스** 기준이다. 0으로 두면 머리글이
       padding-top만큼 아래에 멈춰, 그 틈으로 지나가는 행의 글자 윗부분이 비친다. */
    top: calc(-1 * var(--list-pad-top, 4px));
    box-sizing: border-box;
    /* ⚠️ 스크롤러가 flex column이라 flex-shrink 기본값이 높이를 min-content까지 깎는다
       — 못 박은 높이가 무너지면 연 소제목이 세기 헤더 아래 틈에 떠 버린다. */
    flex-shrink: 0;
    height: var(--century-h);
    margin-top: 10px;
    padding: 0 var(--text-left);
    font-size: 12px;
    font-weight: 700;
    line-height: 16px;
    letter-spacing: 0.01em;
    color: ${({ theme }) => theme.colors.text.secondary};

    &:first-child {
      margin-top: 0;
    }
  }

  ${S.GroupCaret} {
    order: 3;
    margin: 0 0 0 6px;
  }
  ${S.GroupCount} {
    order: 2;
    font-size: 11px;
    letter-spacing: 0;
  }

  /* 마커는 **왼쪽 여백에 걸어 둔다**(hanging bullet). 흐름에 두면 세기 라벨만 안으로
     밀려, 연 소제목·제목이 맞춘 왼쪽 선에서 혼자 튀어나온다.
     ⚠️ 여백(20px)은 가장 큰 마커(빠른접근 아이콘 11px) 기준 — 좁으면 아이콘이 라벨에 붙는다.
     (sticky는 positioned라 여기가 absolute의 기준 박스가 된다) */
  ${S.GroupDot},
  ${S.GroupLeadIcon} {
    position: absolute;
    margin: 0;
  }
  ${S.GroupDot} {
    left: 7px;
    width: 6px;
    height: 6px;
  }
  ${S.GroupLeadIcon} {
    left: 5px;
    width: 11px;
    height: 11px;
  }

  /* ── 연 ─────────────────────────────────────────────────────────────────
     세기 헤더 바로 아래에 이어 붙어 따라다닌다. 한 세기가 121건이면 스크롤 두세 번에
     연도 문맥이 사라지는데, '지금 몇 년을 보고 있나'는 제목만큼 중요한 좌표다.
     z-index는 세기(2)보다 낮게 — 다음 세기 헤더가 올라오면 그 밑으로 사라져야 한다. */
  ${S.RowDivider} {
    position: sticky;
    flex-shrink: 0;
    top: calc(var(--century-h, 34px) - var(--list-pad-top, 4px));
    z-index: 1;
    background: ${({ theme }) => S.sidebarSurface(theme)};
    /* ⚠️ 위아래 여백은 **모든 연에 똑같이**. 세기 헤더 뒤에 오는 첫 해만 0으로 두면
       멈춰 있는 머리글 덩어리 높이가 54↔66px로 오가며 스크롤 중에 출렁인다(실측).
       ⚠️ margin이 아니라 padding이어야 한다 — sticky 오프셋은 margin 박스 기준이라
       margin-top을 주면 멈췄을 때 세기 헤더와의 사이가 벌어져 그 틈으로 행이 비친다. */
    padding: 11px var(--text-left) 7px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  /* ── 행 ─────────────────────────────────────────────────────────────────
     지면 안으로 들어앉은 둥근 면. 행 사이 헤어라인은 두지 않는다 — 선을 그으면 목록이
     표가 되고, 그 격자가 정작 읽어야 할 제목보다 먼저 보인다. */
  ${S.ListRow} {
    width: auto;
    margin: 0 var(--list-inset);
    padding: 9px var(--row-pad-x) 10px;
    min-height: 0;
    border-radius: 10px;
    contain-intrinsic-size: auto 58px;
    /* 두 겹의 sticky(세기 + 연) 밑에 선택 행이 숨지 않도록 */
    scroll-margin-top: calc(var(--century-h, 34px) + 34px);

    /* 좌측 strip은 쓰지 않는다 — 둥근 면이 이미 '이 줄'이라고 말한다. */
    &::before {
      display: none;
    }

    &:hover {
      background: ${({ theme }) => S.sidebarFillHover(theme)};
    }
  }

  /* aria-selected는 $active prop과 별개 경로라 공용 규칙이 닿지 않는다 — 같은 값으로 맞춘다 */
  ${S.ListRow}[aria-selected='true'],
  ${S.ListRow}[aria-selected='true']:hover {
    background: ${({ theme }) => S.sidebarRowSelected(theme)};
  }

  ${S.CodeText} {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.012em;
  }

  ${S.SubMeta} {
    font-size: 12px;
    font-weight: 400;
    gap: 5px;
    /* ⚠️ opacity로 톤을 낮추지 않는다 — 분류 색은 지면색에서 4.5:1을 넘도록 계산해 넣는데
       (category-ink), 줄 전체에 0.9를 걸면 그 계산이 조용히 무너진다. 톤은 색으로 정한다. */
  }

  ${S.TextStack} {
    gap: 3px;
  }
  ${S.RowTop} {
    align-items: flex-start;
  }
  ${S.RowRight} {
    align-self: flex-start;
    padding-top: 2px;
  }
`
