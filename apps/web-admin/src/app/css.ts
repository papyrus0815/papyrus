import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  :root {
    --color-primary: #ad46ff;
    --color-primary-100: #f3e8ff;
    /* 파생 색상 변수 */
    --color-primary-200: #e9d1ff;
    --color-primary-300: #d6aaff;
    /* 전역 내비는 좌측 레일(NavRail)로 옮겼다 — 상단 바가 없으므로 0.
       이 변수를 쓰는 곳이 58군데라 의미(=상단 오프셋)를 유지한 채 값만 0으로 둔다:
       calc(100vh - var(--header-height)) / margin-top / top 이 전부 자동으로 맞는다. */
    --header-height: 0px;
    /* 좌측 내비 레일 폭 — 본문은 이만큼 오른쪽에서 시작한다 */
    --nav-rail-width: 80px;
    /* 우측 콘텐츠 안에서 position:fixed로 뷰포트를 쓰는 지면(사건 카탈로그)이 참조.
       사이드바가 있는 지면은 ContentShell이 여기에 목록 폭을 더해 덮어쓴다. */
    --content-left-inset: var(--nav-rail-width);
    /* 좌측 하단 계정 패널 높이 — 레일·목록이 이만큼 아래를 비워 겹침을 피한다 */
    --user-panel-height: 60px;
    --sidebar-width: 280px;
    --focus-ring: 0 0 0 3px rgba(173, 70, 255, 0.25);
    --shadow-soft: 0 1px 3px rgba(0,0,0,0.08);
    --shadow-lg: 0 10px 30px rgba(0,0,0,0.12);
    --radius-8: 8px;
    --radius-10: 10px;
    --radius-12: 12px;
    --surface: #ffffff;
    --surface-elevated: rgba(255,255,255,0.75);
    --border-color: #dadce0;
    --border-color-light: #e6e8eb;
    --border-color-hover: #bdc1c6;
    --glass-blur: 12px;
    --gradient-subtle: radial-gradient(1200px 500px at 10% -10%, rgba(173,70,255,0.06), transparent 50%), radial-gradient(800px 400px at 90% -20%, rgba(90,0,255,0.05), transparent 55%);
  }
  /* 좁은 화면에서는 레일을 줄인다 — 본문 폭이 더 급하다 */
  @media (max-width: 640px) {
    :root {
      --nav-rail-width: 64px;
    }
  }

  /* ✍️ 전역 폰트 설정 — Pretendard Variable 기본 + 시스템 한글 fallback */
body {
    font-family:
      'Pretendard Variable', Pretendard,
      -apple-system, BlinkMacSystemFont,
      'Apple SD Gothic Neo', 'Noto Sans KR',
      'Inter', 'Segoe UI', Roboto,
      sans-serif;
    font-feature-settings: 'ss06', 'ss07';
    letter-spacing: -0.01em;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    accent-color: var(--color-primary);
  }
  /* 🏛️ 'CIVILIZATION' 타이틀처럼 특정 요소에만 Cinzel 폰트 적용 */
  h1, h2, h3 {}

  /* 📜 기타 기본 스타일 리셋 */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  /* color-scheme: app.tsx에서 document.documentElement와 테마 동기화 (다크에서 네이티브 select 배경 등) */
  html {
    scroll-behavior: smooth;
  }



  /* 포커스 링(접근성) */
  :where(button, [role="button"], a, input, select, textarea) {
    &:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
      border-color: var(--color-primary);
    }
  }

  /* selection 컬러 */
  ::selection {
    background: var(--color-primary);
    color: #fff;
  }

  /* 기본 컨트롤 공통 호버/활성화 상태 예쁘게 */
  :where(button, input, select, textarea) {
    transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
  }
`
