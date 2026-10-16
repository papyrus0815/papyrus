/**
 * 사건 목록 사이드바의 **목록 조판 스코프**.
 *
 * 2026-10-15부터 행 문법은 **기업 사이드바와 같다**(shared/ui/sidebar-list 기본값):
 * 썸네일(없으면 분류 첫 글자 배지) · 제목 15/600 한 줄 · 메타 줄(날짜 · 관련국 · 분류).
 * 예전의 사건 전용 조판 — 선두 날짜 열 · 연 소제목(sticky) · 37px 압축 행 · 세기 머리글 재배치 ·
 * 제목 뒤 꼬리표 · 핀 겹침 받침 — 은 사용자 지시('기업 사이드랑 디자인이 다르다')로 걷어냈다.
 *
 * 여기 남은 것은 사용자 지시로 공용과 **일부러 다른** 선택 행 하나뿐이다.
 *
 * ⚠️ display: contents — 스코프 div는 박스를 만들지 않는다. 사이드바는 MainGrid의 트랙
 * 하나를 그대로 차지해야 하므로 여기서 래퍼가 레이아웃에 끼면 폭·sticky가 전부 어긋난다.
 * ⚠️ 이 파일의 주석에 백틱을 쓰지 말 것 — styled 템플릿 리터럴이 그 자리에서 닫힌다.
 */
import styled from 'styled-components'

import * as S from '@/shared/ui/sidebar-list'

export const EventListScope = styled.div`
  display: contents;

  /*
   * 좌측 색 막대(공용 ListRow의 ::before strip)는 사건 지면에서 쓰지 않는다 — 사용자 지시
   * (2026-09-25 "좌측 border-left 컬러 쓰지 마라"). 본문 목록의 선택 행과 같은 말투로:
   * 옅은 면 + **모든 변** 1px 링.
   */
  ${S.ListRow}::before {
    display: none;
  }

  /* aria-selected는 $active prop과 별개 경로라 공용 규칙이 닿지 않는다 — 같은 값으로 맞춘다 */
  ${S.ListRow}[aria-selected='true'],
  ${S.ListRow}[aria-selected='true']:hover {
    background: ${({ theme }) => S.sidebarRowSelected(theme)};
    box-shadow: inset 0 0 0 1px
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(165, 180, 252, 0.35)' : 'rgba(79, 70, 229, 0.28)'};
    /*
     * 제목 잉크를 한 단 **더 진한 인디고**로. 공용 값(theme.colors.active #6366f1)을 선택
     * 배경 위에 얹으면 실측 대비가 라이트 3.94:1 · 다크 3.31:1로, 15px/600 본문 기준
     * WCAG AA(4.5:1)에 못 미친다 — 하필 목록에서 가장 중요한 한 행이 가장 안 읽혔다.
     * 색상(인디고)은 그대로 두고 명도만 옮긴다: 라이트 indigo-600 5.55:1 ·
     * 다크 indigo-300 7.42:1. 선택 신호는 면(틴트)과 링이 함께 진다.
     */
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  }
`
