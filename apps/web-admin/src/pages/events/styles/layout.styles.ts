/**
 * Layout Styled Components
 * 페이지 레이아웃 관련 스타일
 */
import styled, { css } from 'styled-components'

import { BRAND, MOTION, toolbarControlHeight } from './theme'

export const PageScene = styled.div`
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: calc(100vh - var(--header-height));
  padding-top: 12px;
  /* iOS home indicator 영역 회피 — env가 0인 데스크톱에선 그냥 16px */
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#0f0f0f' : '#ffffff')};

  @media (max-width: 768px) {
    /* dvh는 모바일 주소창 표시/숨김에 따라 줄어들고 펼쳐짐 — 마지막 사건이 가려지는 걸 방지 */
    height: calc(100dvh - var(--header-height));
    padding-top: 12px;
  }
`

/**
 * 페이지 셸 — **폭 상한의 단일 소유자**(목록 뷰 한정).
 *
 * 툴바·본문·오류 배너를 한 캡 안에 담아 우측 끝을 1종으로 만들고 `margin: 0 auto`로
 * 중앙정렬한다. 앱 전역에서 페이지 레벨 캡은 예외 없이 `margin: 0 auto`와 짝이며
 * (administration-departments-list:1124 / collection:258 / person-groups-list:191 …),
 * 좌측정렬 캡을 쓰던 페이지는 여기 하나뿐이었다.
 *
 * ⚠️ concept-C의 "중앙 정렬 금지 — 좌측 스캔선이 폭에 따라 흔들린다"를 **의도적으로
 * 번복한 것**이다(2026-08-02 승인). 그 금지는 카드가 뷰포트를 따라 늘어나던 캡 이전
 * 세계의 판단이었다. 지금은 카드 폭이 상한에 고정돼 스캔선이 창 크기마다 한 번 정해져
 * 고정되고, 무엇보다 셸을 통째로 중앙정렬하므로 **카드 좌측 끝과 툴바 좌측 끝이 영구히
 * 같은 x에 선다** — 오히려 좌측정렬 시절이 그 규약을 깨고 있었다(카드 x=20, hairline 1900).
 *
 * 상한이 **선택 상태를 보지 않는다**는 것이 두 번째 계약이다. 요약 열 도입 전에는
 * `$hasSelection`으로 캡을 1160↔1620으로 넓혀야 목록과 패널 사이 구멍(1920:300px /
 * 2560:940px)이 안 생겼고, 그 대가로 선택할 때마다 페이지가 230px 미끄러졌다. 캡이
 * `pageWide`로 올라간 지금은 패널이 이미 캡 안에 들어오므로 **셸 폭이 상수**이고,
 * 선택 시 수평 이동이 0이다. 변하는 것은 카드 폭뿐이다(1840 → 1380).
 *
 * ⚠️ `transition`을 넣지 말 것 — max-width는 실제로 보간되므로 252행 목록 전체가
 * 12프레임 동안 리레이아웃된다. 즉시 스냅이 싸다.
 *
 * ⚠️⚠️ 2026-08-02 **재번복**: 위 캡과 중앙정렬은 사용자 지시로 전면 폐지됐다
 *   ("사건 리스트 페이지 목록 전체 화면을 써야 하는데 가운데로 되어 있다").
 *   캡의 실효 대역은 뷰포트 > 1880뿐이었고, 그 위에서 좌우로 죽는 폭이 2560에서 각 360px,
 *   3440에서 각 780px였다. 캡을 정당화하던 원래 사유("남는 폭 전부를 제목 트랙이 흡수해
 *   행 안에 빈 밴드가 생긴다")는 요약 열(7트랙) 도입으로 이미 절반이 무효였고, 이번
 *   열 사다리(`theme.ts` LIST_STEPS — 키워드·등록 시각까지 9트랙)가 나머지를 무효화한다.
 *
 *   **폭 상한은 이제 레포 어디에도 없다.** 가로 픽셀 흡수는 행 격자의 열 사다리가 하고,
 *   좌우 여백의 유일한 소유자는 아래 `padding` clamp다. 여기든 `CatalogSection`이든
 *   `ActiveContent`든 캡을 다시 심지 말 것 — 하나만 심어도 우측 끝이 즉시 2종이 된다.
 */
export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  /* 전폭 거터 — 폭에 비례. 3440에서 20px는 시각적으로 0에 수렴해 '카드'라는 표면 인지가
     사라지고, 768 이하에서는 16px이 필요하다. clamp 하한이 기존 ≤768 분기를 그대로
     흡수한다(768px에서 1.2vw = 9.2px → 하한 16px로 클램프 = 현행과 동일). */
  padding: 0 clamp(16px, 1.2vw, 32px);
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

/*
 * (제거됨) `PageTopBar` · `PageTopTitle` — 참조 0인 죽은 export.
 * 페이지 h1은 상시 제거됐고(집중 보기 논의), 그 뒤로 이 둘을 렌더하는 곳이 없었다.
 * 32px 제목 스타일이 살아 있으면 다음 검토가 '현행 헤더'로 오독한다.
 */

/* primary action 버튼 — 페이지 내 *유일한 primary CTA*. ledger polish 평면 톤 안에서도
 * 채워진 indigo로 시인성 확보. hover는 한 톤 진하게(`primaryHover`)로만 변경.
 *
 * 모바일(<=640px)에서는 toolbar에서 숨기고 우하단 `CreateEventFab`를 별도 렌더 — 좁은 폭에서
 * toolbar가 5-6줄로 흩어지는 문제와, 사용자가 +CTA를 즉시 찾기 어려운 문제 동시 해결. */
export const CreateEventButton = styled.button`
  border-radius: 8px;
  padding: 8px 14px;
  /* 툴바 한 줄 컨트롤 공통 규약 — 리터럴 34px이면 641~768 대역에서 primary CTA만 6px
     작아 한 줄의 베이스라인이 어긋난다(나머지는 768에서 40px로 커진다). */
  ${toolbarControlHeight}
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: pointer;
  transition: background ${MOTION.fast}, border-color ${MOTION.fast},
    box-shadow ${MOTION.fast};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${BRAND.primary};
  border: 1px solid ${BRAND.primary};
  color: #ffffff;

  &:hover {
    background: ${BRAND.primaryHover};
    border-color: ${BRAND.primaryHover};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: 640px) {
    /* toolbar에서 hide — 우하단 FAB가 같은 액션을 제공 */
    display: none;
  }
`

/** 모바일 우하단 floating action button — toolbar의 `+새 사건`을 대체.
 * iOS home indicator를 피해 safe-area-inset-bottom 만큼 위로 띄움.
 * 데스크톱(>640px)에선 hide. */
export const CreateEventFab = styled.button`
  display: none;

  @media (max-width: 640px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    right: 16px;
    bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: ${BRAND.primary};
    color: #ffffff;
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.32);
    cursor: pointer;
    z-index: 1050;
    transition: background ${MOTION.fast}, transform ${MOTION.fast};

    &:hover {
      background: ${BRAND.primaryHover};
    }

    &:active {
      transform: scale(0.96);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.32), ${BRAND.focusRing};
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* toolbar — *카드 아닌 단순 flex row*. border / bg 모두 제거.
 * (이전: card-in-card 인상 → 14개 bordered children 위에 또 카드 1개) */
export const TopFilterBar = styled.div.attrs(
  /* 실측 하네스가 툴바 hairline을 잡을 손잡이(`data-list-scroller` 전례).
     스타일 훅이 아니라 "카드 우측 끝 == 툴바 우측 끝"을 한 줄로 검증하기 위한 것이다. */
  () => ({ 'data-catalog-toolbar': '' }) as Record<string, string>,
)`
  /* ── 넓은 폭: 명시 3존 격자 ────────────────────────────────────────────────
   * 검색 | 필터 | (남는 폭을 먹는 액션 트랙)
   *
   * flex-start 패킹이던 시절, 신축 자식이 검색바 하나뿐이라 전폭에서 컨트롤이 좌측에
   * 뭉치고 우측 1,000px 이상이 빈 border-bottom만 남았다 — "우측이 비었다"가 툴바
   * 층위에서 그대로 재현된 것이다. 마지막 트랙이 1fr이라 남는 폭은 전부 액션 트랙
   * 안에 들어오고, 액션군은 그 안에서 margin-left:auto로 우측 끝에 선다.
   */
  display: grid;
  grid-template-columns: clamp(280px, 22vw, 560px) auto minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
  /* 8/14 → 6/10. 세로 크롬에서 6px 회수(목록은 세로가 곧 행 수다). */
  padding: 6px 0 10px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.09)'
        : 'rgba(20, 19, 34, 0.09)'};

  /* ── 좁은 폭: 기존 wrap 규약으로 복귀 ──────────────────────────────────────
   * ⚠️ 이 분기를 빼면 태블릿에서 3존이 그대로 유지돼 컨트롤이 압착된다.
   * 임계는 툴바 라벨이 sr-only로 접히는 1024와 맞춘다. */
  @media (max-width: 1023px) {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
`

/**
 * 활성 필터 칩 **전용 행** — 툴바 바깥 형제.
 *
 * 예전엔 칩 바가 TopFilterBar 안에서 CTA 뒤에 인라인으로 흘렀다. 그래서 칩이 하나만
 * 생겨도 폭에 따라 툴바가 한 줄 늘어났다 줄었다 했고(1440에서 57 → 92px), 칩과 조작
 * 컨트롤이 같은 줄에서 경쟁했다. 전용 행으로 올리면 툴바 높이가 폭·필터 상태와
 * 무관해지고, 칩은 결과 목록 바로 위라는 제자리를 얻는다.
 *
 * 칩이 0개면 이 행 자체를 렌더하지 않는다(호출부 chipCount 게이트).
 */
export const ActiveFiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 30px;
  padding: 4px 0;
`

/**
 * detail 패널 폭 — 1400+에서 440px / 1200~1400에서 380px / <1200은 drawer.
 *
 * `$hasSelection=false`일 땐 *우측 컬럼 자체 미할당* → 메인 뷰 풀 폭.
 *
 * ⚠️ `grid-template-columns`에 transition을 걸지 말 것. 트랙 **개수**가 1↔2로 바뀌므로
 * CSS 명세상 보간 대상이 아니다 — 예전 `transition: grid-template-columns 0.18s`는
 * 한 번도 실행된 적 없는 선언이었고, 실제로 애니메이션되는 건 gap뿐이라 결과는
 * '컬럼은 즉시 점프 + gap만 0.18s 흐물거림'이었다. gap만 남긴다.
 */
export const CatalogSplit = styled.div<{ $hasSelection?: boolean }>`
  display: grid;
  /* 전폭 전환 이후 440px 고정은 3440에서 패널을 화면의 18%로 만들어 '목록만 넓어지고
     상세는 안 자란다'는 인상을 준다. 폭에 비례시키되 상·하한으로 묶는다.
     ⚠️ grid-template-columns에 transition을 걸지 말 것 — 폭이 보간되는 동안
     컨테이너 쿼리 단계가 여러 번 플립해 250여 행이 매 프레임 재조판된다.
     (이 주석 안에서 백틱 금지 — styled 템플릿 리터럴이 끊겨 TS1005가 난다.) */
  grid-template-columns: ${({ $hasSelection }) =>
    $hasSelection ? 'minmax(0, 1fr) clamp(400px, 22vw, 620px)' : 'minmax(0, 1fr)'};
  gap: ${({ $hasSelection }) => ($hasSelection ? '20px' : '0')};
  flex: 1;
  min-height: 0;
  overflow: hidden;
  transition: gap 0.18s ease;

  @media (max-width: 1400px) {
    grid-template-columns: ${({ $hasSelection }) =>
      $hasSelection ? 'minmax(0, 1fr) clamp(340px, 26vw, 400px)' : 'minmax(0, 1fr)'};
    gap: ${({ $hasSelection }) => ($hasSelection ? '18px' : '0')};
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/*
 * (제거됨) CatalogSection — 소비처 0인 죽은 export.
 *
 * 같은 이름이 `list.styles.ts`에도 있고 목록 카드가 쓰는 건 **그쪽**이다
 * (`event-compact-list.tsx`의 `List.CatalogSection`). 파일명이 layout이라 폭·레이아웃을
 * 고치러 온 사람이 여기를 먼저 열고 고친 뒤 "아무 일도 안 일어난다"에 빠지는 함정이었다.
 */
