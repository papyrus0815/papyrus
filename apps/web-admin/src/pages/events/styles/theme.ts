/**
 * Events Page Theme Constants
 * 이벤트 페이지 전용 테마 상수 및 색상 정의
 */
import type { HistoricalEventCategory } from '../create/events.types'

/**
 * 카테고리별 색상 테마
 */
export const CATEGORY_COLORS: Partial<
  Record<
    string,
    {
      background: string
      border: string
      iconBackground: string
      iconColor: string
      shadow: string
      accent: string
      tagline: string
    }
  >
> = {
  // accent = LEDGER_CATEGORY hue, iconColor = 그 hue의 진한 shade, border/iconBackground/
  // shadow = 그 hue의 rgba tint. 카테고리 요약 카드도 목록·타임라인과 같은 색 체계로 통일.
  military: {
    background: '#ffffff',
    border: 'rgba(185, 28, 28, 0.35)',
    iconBackground: 'rgba(185, 28, 28, 0.15)',
    iconColor: '#991b1b',
    shadow: 'rgba(185, 28, 28, 0.18)',
    accent: '#b91c1c',
    tagline: '무력 충돌, 작전, 동맹 확장 흐름',
  },
  political: {
    background: '#ffffff',
    border: 'rgba(109, 40, 217, 0.35)',
    iconBackground: 'rgba(109, 40, 217, 0.15)',
    iconColor: '#5b21b6',
    shadow: 'rgba(109, 40, 217, 0.18)',
    accent: '#6d28d9',
    tagline: '정권 교체, 협상, 체제 전환',
  },
  economic: {
    background: '#ffffff',
    border: 'rgba(180, 83, 9, 0.35)',
    iconBackground: 'rgba(180, 83, 9, 0.15)',
    iconColor: '#9a3412',
    shadow: 'rgba(180, 83, 9, 0.18)',
    accent: '#b45309',
    tagline: '금융 위기, 자원, 공급망 시프트',
  },
  social: {
    background: '#ffffff',
    border: 'rgba(13, 148, 136, 0.35)',
    iconBackground: 'rgba(13, 148, 136, 0.15)',
    iconColor: '#0f766e',
    shadow: 'rgba(13, 148, 136, 0.18)',
    accent: '#0d9488',
    tagline: '사회운동, 인권, 문화 충돌',
  },
  technological: {
    background: '#ffffff',
    border: 'rgba(14, 116, 144, 0.35)',
    iconBackground: 'rgba(14, 116, 144, 0.15)',
    iconColor: '#155e75',
    shadow: 'rgba(14, 116, 144, 0.18)',
    accent: '#0e7490',
    tagline: '기술 혁신, 산업 전환, 연구 경쟁',
  },
  cultural: {
    background: '#ffffff',
    border: 'rgba(219, 39, 119, 0.35)',
    iconBackground: 'rgba(219, 39, 119, 0.15)',
    iconColor: '#be185d',
    shadow: 'rgba(219, 39, 119, 0.18)',
    accent: '#db2777',
    tagline: '예술, 문학, 문화 유산',
  },
  diplomatic: {
    background: '#ffffff',
    border: 'rgba(14, 165, 233, 0.35)',
    iconBackground: 'rgba(14, 165, 233, 0.15)',
    iconColor: '#0369a1',
    shadow: 'rgba(14, 165, 233, 0.18)',
    accent: '#0ea5e9',
    tagline: '조약, 국제 관계, 협상',
  },
  conference: {
    background: '#ffffff',
    border: 'rgba(30, 58, 138, 0.35)',
    iconBackground: 'rgba(30, 58, 138, 0.15)',
    iconColor: '#1e3a8a',
    shadow: 'rgba(30, 58, 138, 0.18)',
    accent: '#1e3a8a',
    tagline: '국제 회담, 정상회담, 협상',
  },
  religious: {
    background: '#ffffff',
    border: 'rgba(161, 98, 7, 0.35)',
    iconBackground: 'rgba(161, 98, 7, 0.15)',
    iconColor: '#854d0e',
    shadow: 'rgba(161, 98, 7, 0.18)',
    accent: '#a16207',
    tagline: '신앙, 종교 개혁, 영적 운동',
  },
  other: {
    background: '#ffffff',
    border: 'rgba(107, 114, 128, 0.35)',
    iconBackground: 'rgba(107, 114, 128, 0.15)',
    iconColor: '#374151',
    shadow: 'rgba(107, 114, 128, 0.18)',
    accent: '#6b7280',
    tagline: '분류되지 않은 기타 사건',
  },
}

/**
 * 카테고리별 배지 색상 (리스트용)
 *
 * NOTE: 영문 슬러그(`'political'` 등)와 한글 이름(`'정치'` 등)을 둘 다 키로
 * 등록한다. 실제 데이터는 EventCategory의 한글 `name`이지만, 과거 코드 일부가
 * 영문 슬러그를 가정하고 작성되어 있어 두 형태 모두 매칭되도록 alias 처리.
 */
export const CATEGORY_BADGE_COLORS: Record<HistoricalEventCategory, string> = {
  // LEDGER_CATEGORY(ledger-tokens.ts)와 동일 hue로 통일 — 목록·격자·갤러리·대시보드·
  // 타임라인이 같은 카테고리에 같은 색을 쓰게 해 뷰 전환 시 색 점프를 없앤다.
  // 10색 모두 뚜렷(이전엔 정치·외교·회담이 전부 #2563eb 파랑으로 구별 불가).
  military: '#b91c1c',
  political: '#6d28d9',
  economic: '#b45309',
  social: '#0d9488',
  technological: '#0e7490',
  cultural: '#db2777',
  // #0ea5e9는 라이트 흰 배경 대비 2.77:1로 UI 3:1 미달 → 한 단계 진한 shade로.
  diplomatic: '#0284c7',
  conference: '#1e3a8a',
  religious: '#a16207',
  other: '#6b7280',
  // 한글 alias — DB EventCategory.name과 직접 매칭
  '전쟁/군사': '#b91c1c',
  정치: '#6d28d9',
  경제: '#b45309',
  사회: '#0d9488',
  과학기술: '#0e7490',
  문화: '#db2777',
  외교: '#0284c7',
  '회담/조약': '#1e3a8a',
  종교: '#a16207',
  기타: '#6b7280',
  // 배치3이 미지정 라벨을 '기타' → '미분류'로 바꿨는데 색 맵 키는 추가되지 않아,
  // 도트만 '#2563eb' 브랜드 폴백을 타고 칩은 회색이 되는 모순이 생겼다.
  미분류: '#6b7280',
}

/**
 * 카테고리별 soft chip 토큰 — 단색 배지 대신 *tinted* 배경 + 진한 텍스트.
 *   rgb: 베이스 색의 R,G,B 만 (alpha를 styled에서 동적으로) — bg 0.10/0.16, border 0.22/0.32
 *   text/textDark: 라이트/다크 모드별 가독성 확보된 텍스트 색
 *   spark: sparkbar 그라데이션 끝 색 — accent에서 한 톤 옅은 변형
 *
 * ⚠️ **식별성 예산** — 목록에서 카테고리를 싣는 것은 이제 색 면이 아니라 11px 글자 하나다.
 * 그 크기에서 두 색이 갈리려면 CIEDE2000 ΔE가 대략 12는 돼야 한다. 실측 293행 분포
 * (전쟁/군사 95 · 정치 58 · 경제 40 · 외교 39 · 회담/조약 34 = **91%**)에서 가장 잦은 두
 * 쌍이 하필 가장 가까운 두 쌍이었다:
 *
 *   라이트  전쟁/군사 #991b1b ↔ 경제 #9a3412 → **ΔE 7.8** (전 행의 46%)
 *   다크    외교 #7dd3fc ↔ 회담/조약 #93c5fd → **ΔE 8.8** (전 행의 25%)
 *
 * 두 값만 옮겨 해소했다(아래 각 줄 주석 참고). 결과: 상위 5 카테고리 사이 최악 쌍이
 * ΔE 13.7(정치↔회담/조약 라이트), 전 쌍 최악이 10.4(외교↔과학기술 — 과학기술 5행)다.
 *
 * ⚠️ 새 색을 넣기 전에 **반드시 두 축을 같이** 재볼 것 — 대비(AA 4.5:1)만 통과하고
 *    ΔE를 안 보면 "읽히긴 하는데 서로 구별이 안 되는" 팔레트가 된다. 위 사고가 정확히
 *    그것이었다(10색 전부 AA 통과 상태에서 ΔE만 7.8이었다).
 */
export const CATEGORY_SOFT_COLORS: Record<
  HistoricalEventCategory,
  { rgb: string; text: string; textDark: string; sparkEnd: string }
> = {
  // rgb = LEDGER hue(칩 배경 tint용), text/textDark = 그 hue의 AA 대비 shade(라이트/다크).
  military: { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
  political: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
  /* text: #9a3412(orange-800) → **#b45309** — 전쟁/군사와 ΔE 7.8이던 자리다.
     새 값은 이 카테고리가 이미 다른 지면에서 쓰는 accent(CATEGORY_BADGE_COLORS.economic ·
     바로 이 줄의 rgb)와 **같은 색**이라, 팔레트를 새로 만든 게 아니라 목록 글자만
     자기 hue로 되돌린 것이다. 라이트 대비 5.02:1(AA 통과) · 전쟁/군사와 ΔE 19.1. */
  economic: { rgb: '180, 83, 9', text: '#b45309', textDark: '#fdba74', sparkEnd: '#fb923c' },
  social: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
  technological: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
  cultural: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  /* rgb: #0ea5e9(sky-500) → **#0284c7**(sky-600). 이 `rgb`는 도입 때 칩 **배경 tint**
     전용이었지만(alpha 0.10~0.32), 기간 열의 점·막대가 같은 값을 **불투명 도형**으로
     쓰면서 성격이 바뀌었다 — 흰 지면 대비 2.77:1로 WCAG 1.4.11(비텍스트 3:1) 미달이고,
     외교는 실측 293행 중 39행(전 행의 13%)이라 **가장 잦은 표지가 가장 안 보이는** 상태였다.
     같은 진단으로 CATEGORY_BADGE_COLORS.diplomatic은 이미 #0284c7로 고쳐져 있었다 —
     두 맵이 갈라져 있었을 뿐이다. 새 값 4.10:1 · 과학기술과 ΔE 12.3(식별성 예산 통과). */
  diplomatic: { rgb: '2, 132, 199', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  /* textDark: #93c5fd(blue-300) → **#818cf8**(indigo-400) — 다크에서 외교(sky-300)와
     ΔE 8.8이던 자리다. 라이트의 '외교=하늘 / 회담=남색' 순서를 다크에서도 지키는 방향
     (sky → indigo)이라 뷰 사이 색 점프가 없다. 다크 대비 6.18:1 · 외교와 ΔE 23.1. */
  conference: { rgb: '30, 58, 138', text: '#1e3a8a', textDark: '#818cf8', sparkEnd: '#60a5fa' },
  religious: { rgb: '161, 98, 7', text: '#854d0e', textDark: '#fcd34d', sparkEnd: '#fbbf24' },
  other: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
  // 한글 alias
  '전쟁/군사': { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
  정치: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
  경제: { rgb: '180, 83, 9', text: '#b45309', textDark: '#fdba74', sparkEnd: '#fb923c' },
  사회: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
  과학기술: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
  문화: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  외교: { rgb: '2, 132, 199', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  '회담/조약': { rgb: '30, 58, 138', text: '#1e3a8a', textDark: '#818cf8', sparkEnd: '#60a5fa' },
  종교: { rgb: '161, 98, 7', text: '#854d0e', textDark: '#fcd34d', sparkEnd: '#fbbf24' },
  기타: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
  미분류: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
}

/**
 * 목록 메타 텍스트 색 — 날짜·기간·카운트·안내문처럼 '보조 데이텀'에 쓰는 회색.
 *
 * `theme.colors.text.tertiary`(라이트 #9ca3af / 다크 #71717a)는 소형 텍스트 기준
 * WCAG AA(4.5:1)에 양쪽 다 미달이다 — 실측 라이트 **2.54:1** / 다크 **3.82:1**.
 * 그런데 목록에서 이 토큰이 담는 건 '언제 일어난 일인가'(행 날짜·기간)와 '조건 밖 N건'
 * 같은 **누락 고지**라, 화면에서 가장 안 읽히면 안 되는 정보다.
 *
 * text.tertiary 자체를 손대면 앱 전역 회귀 범위가 커서, events 목록 소비처만 이 토큰으로 옮긴다.
 * 라이트 #6b7280 = 4.83:1 / 다크 #a1a1aa = 7.48:1 (각각 #ffffff / #141414 기준).
 */
export const META_TEXT = {
  light: '#6b7280',
  dark: '#a1a1aa',
} as const

/** styled에서 바로 쓰는 헬퍼 — `color: ${metaText};` */
export const metaText = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? META_TEXT.dark : META_TEXT.light

/**
 * 중요도 색상
 */
export const IMPORTANCE_COLORS = {
  critical: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#dc2626',
  },
  major: {
    background: 'rgba(251, 191, 36, 0.15)',
    color: '#d97706',
  },
  notable: {
    background: 'rgba(37, 99, 235, 0.1)',
    color: '#2563eb',
  },
} as const

/**
 * Brand tokens — events 페이지 도구 톤(차분한 단색 indigo).
 *
 * 사용 규칙:
 *   - hover/active alpha의 *비율*은 고정 — 높이려면 모든 토큰을 같이 올림
 *   - 다크모드 분기는 토큰 선택만 다르게 (alpha 비율은 동일)
 *   - !매직 헥스 / rgba(37,99,235,*) 직접 사용 금지 — 모두 BRAND.* 경유
 */
export const BRAND = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.06)',
  primarySoftHover: 'rgba(37, 99, 235, 0.12)',
  primaryFill: 'rgba(37, 99, 235, 0.16)',
  primaryBorder: 'rgba(37, 99, 235, 0.3)',
  primaryBorderHover: 'rgba(37, 99, 235, 0.5)',
  /**
   * 키보드 focus 링 — 모든 컨트롤 동일하게 사용.
   *
   * ⚠️ **반투명 금지.** 이전 값 `0 0 0 3px rgba(37,99,235,0.32)`은 배경과 합성되면
   * 라이트 rgb(185,205,249) = **1.60:1**, 다크 **1.37:1**로 WCAG 1.4.11(비텍스트 3:1)에
   * 한참 못 미쳤다(실측 확인). `outline: none`과 짝을 이루는 소비처가 26개소라 사실상
   * 목록의 세기·연도 접기 버튼 같은 주요 조작에 포커스 표시가 없는 것과 같았다.
   *
   * 불투명 단색으로 바꾼다 — #2563eb는 라이트(#fff) 대비 5.17:1, 다크(#141414) 대비 3.41:1로
   * 양쪽 테마에서 기준을 통과하므로 테마 분기 없이 한 값으로 유지할 수 있다.
   */
  focusRing: '0 0 0 2px #2563eb',
  /** dark mode alt */
  primaryTextOnDark: '#93c5fd',
  primarySoftDark: 'rgba(37, 99, 235, 0.14)',
  primaryFillDark: 'rgba(37, 99, 235, 0.22)',
} as const

/**
 * **클리핑 컨테이너 안** 컨트롤의 포커스 표시 — `BRAND.focusRing`의 대체재(검토 VIS-2/A11Y-7).
 *
 * `focusRing`은 `0 0 0 2px`, 즉 요소 **바깥으로 2px 번지는** box-shadow다. 그래서 조상이
 * `overflow: hidden`이면(필터 그룹이 정확히 그렇다 — 내부 hairline divider를 위해 클리핑한다)
 * 상·하 2px이 통째로 잘려 나가 "4개 컨트롤 중 어디에 포커스가 있는지" 구분이 불가능했다.
 *
 * `outline-offset: -2px`은 링을 요소 **안쪽**에 그리므로 클리핑과 무관하다. 색·굵기는
 * focusRing과 같은 값이라 두 규약이 화면에서 같은 인상을 준다.
 *
 * ⚠️ 클리핑 조상이 없는 컨트롤은 계속 `BRAND.focusRing`을 쓴다 — 안쪽 링은 컨트롤이 작을수록
 * 콘텐츠와 붙어 읽기 어렵기 때문에, 잘리지 않는 곳에서까지 바꿀 이유가 없다.
 */
export const focusRingInset = `
  outline: 2px solid ${BRAND.primary};
  outline-offset: -2px;
  box-shadow: none;
`

/**
 * **브랜드 틴트 배경 위** 컨트롤의 포커스 표시 — 포커스 링 3규약의 세 번째.
 *
 *   기본            → `BRAND.focusRing`      (요소 바깥 2px box-shadow)
 *   클리핑 조상 안  → `focusRingInset`       (안쪽 outline — 잘리지 않게)
 *   틴트 배경 위    → `focusRingOnTinted`    (여기)
 *
 * 다크에서 활성 행 배경(rgba(37,99,235,0.22)) 위에 같은 파랑 링을 그리면 링 안쪽 경계
 * 대비가 2.93:1까지 떨어진다. ↑↓ 내비게이션은 선택과 포커스를 **함께** 옮기므로
 * '활성 행 위의 포커스'가 상시 상태라 실질 식별력이 낮았다.
 *
 * `outline-offset: 1px`(바깥)인 이유: -2px면 활성 행의 좌측 인디고 막대와 같은 모서리에서
 * 겹쳐 '선택됨'과 '포커스됨'이 한 신호로 뭉갠다.
 */
export const focusRingOnTinted = ({ theme }: { theme: { mode: string } }) => `
  outline: 2px solid ${theme.mode === 'dark' ? '#93c5fd' : BRAND.primary};
  outline-offset: 1px;
`

/**
 * 툴바 한 줄 컨트롤(필터 그룹·검색바·액션 버튼·보기 세그먼트·정렬)의 **높이 단일 출처**.
 *
 * 예전에는 같은 줄에 서는 컨트롤들이 높이 3종(34/30+4/34)과 터치 확대 브레이크포인트
 * 2종(640·768)을 제각기 들고 있었다. 그 결과 **641~768px 대역에서 필터 그룹만 6px 크고**
 * (min-height:40 이 768에서 켜지는데 나머지는 640에서야 커진다) 나머지는 34px에 머물러,
 * 한 줄의 베이스라인이 눈에 띄게 어긋났다(검토 VIS-9).
 *
 * 구조 전환(라벨 sr-only 1024 · 가로 스크롤 720 · 액션 숨김 640)은 여기 합치지 않는다 —
 * 그건 '높이'가 아니라 '무엇을 보여줄 것인가'라 임계가 다른 게 정상이다.
 */
export const TOOLBAR_CONTROL = {
  base: '34px',
  /** 터치 타겟(권장 38~44px) — 한 임계에서 모든 컨트롤이 같이 커진다 */
  touch: '40px',
  touchAt: '768px',
  /** 세그먼트 컨테이너의 내부 패딩(상하 2px) — 안쪽 버튼 높이 = 전체 − 이 값 */
  segmentPad: 4,
} as const

/** 툴바 컨트롤 높이 규약 — 소비처는 리터럴 대신 이것만 쓴다(검토 VIS-9) */
export const toolbarControlHeight = `
  height: ${TOOLBAR_CONTROL.base};
  @media (max-width: ${TOOLBAR_CONTROL.touchAt}) {
    height: ${TOOLBAR_CONTROL.touch};
  }
`

/** 정사각 아이콘 버튼(정렬 방향 등) — 폭이 높이와 함께 움직여야 한다 */
export const toolbarControlSquare = `
  width: ${TOOLBAR_CONTROL.base};
  height: ${TOOLBAR_CONTROL.base};
  @media (max-width: ${TOOLBAR_CONTROL.touchAt}) {
    width: ${TOOLBAR_CONTROL.touch};
    height: ${TOOLBAR_CONTROL.touch};
  }
`

/** 세그먼트 컨테이너 **안쪽** 버튼 — 바깥 패딩만큼 작다. 합이 toolbarControlHeight와 같다. */
export const toolbarSegmentHeight = `
  height: calc(${TOOLBAR_CONTROL.base} - ${TOOLBAR_CONTROL.segmentPad}px);
  @media (max-width: ${TOOLBAR_CONTROL.touchAt}) {
    height: calc(${TOOLBAR_CONTROL.touch} - ${TOOLBAR_CONTROL.segmentPad}px);
  }
`

/**
 * 툴바 컨트롤의 중립 표면 — 6개 컨트롤이 **같은 8개 값을 복붙**하던 것을 한곳으로(검토 VIS-1).
 *
 * `filter.styles.ts`에는 색 리터럴이 149개 있었고 `theme.colors` 경유는 1회뿐이었다.
 * 그중 절대다수가 아래 8값의 반복이라, 토큰 하나로 접으면 "컨트롤 톤을 한 단계 조정"이
 * 8곳 수정에서 1곳 수정이 된다. 브랜드 색은 여기 넣지 않는다 — 그건 `BRAND`의 소관이다.
 *
 * ⚠️ `theme.colors.*`(전역 팔레트)로 치환하지 않은 이유: 전역 텍스트 토큰은
 * #1f2937/#6b7280/#9ca3af이고 여기 값은 #1e293b/#94a3b8이라 **값이 다르다**. 값이 바뀌는
 * 치환은 기계적 정리가 아니라 디자인 변경이므로, 이 배치에서는 값 동일 치환만 한다.
 */
export const CONTROL = {
  bgDark: 'rgba(255, 255, 255, 0.04)',
  bgHoverDark: 'rgba(255, 255, 255, 0.06)',
  borderDark: 'rgba(255, 255, 255, 0.1)',
  textDark: '#94a3b8',
  bgLight: '#f8fafc',
  bgHoverLight: '#ffffff',
  borderLight: 'rgba(203, 213, 225, 0.6)',
  textLight: '#1e293b',
  /** 그룹 **안쪽** 컨트롤의 hover — 자기 배경이 없으므로 톤 시프트만 얹는다 */
  insetHoverDark: 'rgba(255, 255, 255, 0.06)',
  insetHoverLight: 'rgba(15, 23, 42, 0.04)',
  /** 그룹 안 형제 사이 hairline */
  dividerDark: 'rgba(255, 255, 255, 0.08)',
  dividerLight: 'rgba(15, 23, 42, 0.08)',
} as const

export const DANGER = {
  base: '#ef4444',
  hover: '#dc2626',
  soft: 'rgba(239, 68, 68, 0.06)',
  fill: 'rgba(239, 68, 68, 0.12)',
  border: 'rgba(239, 68, 68, 0.3)',
  borderHover: 'rgba(239, 68, 68, 0.45)',
} as const

/** 모션 — prefers-reduced-motion에서는 transition 무력화 */
export const MOTION = {
  fast: '0.15s ease',
  base: '0.18s ease',
  drawer: '0.24s cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const

/**
 * 아이콘 사이즈 — 카테고리화. 자유롭게 size={number} 박지 말 것.
 *   xs(11): chip 내부 ✕ 등
 *   sm(13): toolbar 보조 액션 / clear
 *   base(14): 일반 toolbar 버튼
 *   md(16): 검색바 / primary CTA
 *   lg(18): drawer/modal close
 */
export const ICON_SIZE = {
  xs: 11,
  sm: 13,
  base: 14,
  md: 16,
  lg: 18,
} as const

/**
 * Elevation 토큰 — 평면 톤 어드민 정책. 일반 카드는 sm 이하만 사용.
 * lg 이상은 모달/드로어 같은 floating에만.
 */
export const SHADOW = {
  none: 'none',
  /** 1dp 정도의 hairline 음영 — 카드 base */
  xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
  /** hover 시 약간의 lift 대안 — 평면 톤에서는 거의 안 씀 */
  sm: '0 2px 6px rgba(15, 23, 42, 0.06)',
  /** dropdown / popover */
  md: '0 6px 16px rgba(15, 23, 42, 0.08)',
  /** drawer 슬라이드 */
  drawer: '-12px 0 32px rgba(15, 17, 29, 0.18)',
  /** modal float */
  modal: '0 20px 60px rgba(15, 23, 42, 0.18)',
  /** 다크 모드 — solid 검정 톤. 알파 비율 동일 */
  xsDark: '0 1px 2px rgba(0, 0, 0, 0.3)',
  smDark: '0 2px 6px rgba(0, 0, 0, 0.35)',
  mdDark: '0 6px 16px rgba(0, 0, 0, 0.4)',
  drawerDark: '-12px 0 32px rgba(0, 0, 0, 0.55)',
  modalDark: '0 20px 60px rgba(0, 0, 0, 0.55)',
} as const

/**
 * 타이포 스케일 — 페이지 안에서 4단 위계.
 *   page(19): 페이지 헤더 1번
 *   section(15): 모달/패널 헤더
 *   card(13): 카드 타이틀, toolbar 버튼
 *   micro(11): 메타·chip·뱃지
 */
export const TYPE_SCALE = {
  page: '19px',
  section: '15px',
  card: '13px',
  micro: '11px',
} as const

/**
 * 목록(LIST) 뷰 밀도 계층 — 행·그룹 크롬의 세로 예산과 가로 트랙 폭의 **단일 출처**.
 *
 * 왜 토큰인가: 4차 검토 실측에서 행 기하가 event-list-item.tsx·list.styles.ts 두 파일의
 * 리터럴 40여 곳에 흩어져 있었고, 그래서 "행 높이 45px의 60%가 데이터가 아니다"라는 사실을
 * 고치려면 매번 여러 파일을 동시에 만져야 했다. 소비처는 CSS 변수만 읽고, 값은 여기서만 바뀐다.
 *
 * ⚠️ `cozy`는 도입 시점에 **현행 렌더와 픽셀 동일**하도록 고정했다. 이 배치는 리터럴→변수
 * 기계 치환이고 시각 무변화가 완료 조건이다. 값 변경은 후속 배치가 담당한다.
 *
 * ⚠️ `railInset`·`centuryH`는 기존 CSS 변수 `--rail-inset`·`--century-header-h`의 값을
 * 공급할 뿐 **이름과 소비처를 바꾸지 않는다**. `--century-header-h`는 세기 밴드의 min-height를
 * 밀도 토큰에 묶는 이름이다(세기 헤더가 sticky이던 시절엔 연 헤더의 top도 이 값을 읽었다).
 *
 * ── 광폭 토큰(2026-08-02 전폭 전환) ──────────────────────────────────────────
 * `colTitleMax`·`col*Wide`·`colKw`·`colReg` 7개는 `LIST_STEPS`의 2·3단계에서만 소비된다.
 * ⚠️ `colTitle`의 의미가 바뀌었다: 이제 고정 폭이 아니라 `clamp(colTitle, 22cqw, colTitleMax)`
 *    의 **하한**이다. step 1 대역(카드 1322~1740)에서는 22cqw가 하한을 못 넘으므로
 *    계산값이 `colTitle` 그대로 = 도입 전과 픽셀 동일하다(0.22 × 2364 = 520이 교차점).
 */
export type ListDensity = 'compact' | 'cozy' | 'roomy'

export const LIST_DENSITY = {
  compact: {
    rowMinH: 32,
    rowPadY: 3,
    rowPadL: 14,
    rowPadR: 12,
    colGap: 10,
    actBtn: 24, // WCAG 2.2 SC 2.5.8 AA 최소치 — 이 아래로 내리지 않는다
    discBtn: 24,
    colDate: 62,
    colChip: 56,
    /* 기간 열은 이제 문자열이 아니라 **연 단위 트랙**이다 — 한 달이 최소 7px은 돼야
       '4월'과 '6월'이 눈으로 갈린다(52px 시절 한 달 = 4.3px). */
    colDur: 96,
    /**
     * summary 대역(카드 1180~1751)의 기간 트랙 **상한**.
     *
     * 이 대역은 신축 트랙이 제목 하나뿐이라, 기간을 1px 넓히면 제목이 1px 좁아진다.
     * 실측(잘린 제목 행 수 / 301행):
     *   카드 1275(뷰포트 1440) — dur 104: 45행 · 120: 54 · 136: 62 · 152: 78
     *   카드 1432(뷰포트 1600) — dur 104:  5행 · 120:  7 · 136:  8 · 152: 11
     *   카드 1744(뷰포트 1920) — 어떤 값에서도 0행
     * 즉 폭은 **카드가 넓어질수록 공짜**가 된다. 하한(콜론 위 colDur)은 좁은 쪽 값 그대로
     * 두고, 카드 1400 근처에서 이 상한에 닿는 램프를 CompactList가 건다.
     */
    colDurSummaryMax: 124,
    /* 관련국 열 — 이 폭은 **텍스트 칩 2개 + '+N'의 자연 폭**에서 나온다.
       역사국가는 이모지가 없어 칩이 곧 국가명이고, 2칩 행의 자연 폭 합계가 141px
       (칩 58+49 · '+N' 26 · gap 8)이라 128px 트랙에서 13px이 모자라 **두 칩이 함께**
       '러시아 …' · '일본 …'으로 잘렸다(실측 1600px: 521칩 중 190칩 = 36% 말줄임).
       모자란 양이 이렇게 작을 때는 상한(--flag-name-max)이 아니라 트랙을 준다.
       128 → 172로 재측정: 말줄임 190칩 → 4칩(0.8%). 제목·요약 트랙은 872 → 828로
       45px 줄지만, 그 45px이 사던 것은 요약 5글자였고 팔던 것은 국가명 전체였다. */
    colFlags: 150,
    colAct: 52,
    colTitle: 480,
    indent: 20,
    yearH: 30,
    /** 연 헤더 라벨 — 행 제목보다 **작다**(아래 cozy 주석 참고). */
    yearLabel: 13,
    yearMt: 16,
    yearMb: 4,
    centuryH: 30,
    /** 세기 헤더 라벨 크기 — 연 헤더보다 한 단 위. */
    centuryLabel: 19,
    centuryGap: 26,
    railInset: 31,
    /** sticky 열 헤더 높이 — 3겹 사다리의 첫 단 */
    colHeaderH: 28,
    // ── 광폭 단계 토큰(LIST_STEPS.ledger / .atlas에서만 소비) ──────────────────
    colTitleMax: 700,
    colDateWide: 72,
    /**
     * 기간 트랙의 광폭 단계 — 한 달 ≈ 14.7px.
     *
     * 132px이었다(한 달 11px). 그 폭에서 이 열이 싣는 잉크의 실측 중앙값은
     * **9px**(막대 최소폭)이고 125행은 6px 점이다 — 즉 이 열이 실제로 말하는 것은
     * 길이가 아니라 **연 안에서의 위치** 하나뿐인데, 위치를 읽을 해상도가 그 폭에
     * 없었다. 분기 격자(SPAN_GRID)를 깔아도 눈금 간격이 33px이면 4월과 6월이
     * 한 칸 안에서 뭉갠다. 늘어난 폭은 전부 신축 트랙(제목 1.5 : 키워드 1 : 관련국 1)
     * 에서 나오고, 이 단계의 제목 잉크 실측 p90은 313px이라 잘림은 늘지 않는다.
     */
    colDurWide: 176,
    /** atlas 단계 — 한 달 ≈ 17.3px. 관련국·등록 열까지 켜지는 폭이라 여기서 한 번 더 준다. */
    colDurUltra: 208,
    colFlagsWide: 180,
    colFlagsUltra: 220,
    colKw: 200,
    /* 등록 시각 — 잉크가 '4개월 전'·'오늘'로 **전 행 41px 고정**이다(실측 293행).
       96px은 그 차이 55px을 열 끝마다 빈 띠로 남겼다. 우측 정렬이라 남는 폭은
       제목·요약 쪽 공백으로만 쌓인다. */
    colReg: 72,
  },
  cozy: {
    rowMinH: 45,
    rowPadY: 8,
    rowPadL: 14,
    rowPadR: 12,
    colGap: 12,
    actBtn: 28,
    discBtn: 26,
    colDate: 66,
    colChip: 60,
    /* 기간 열 = 연 단위 트랙. 한 달 ≈ 8.7px. */
    colDur: 104,
    /**
     * summary 대역(카드 1180~1751)의 기간 트랙 **상한**.
     *
     * 이 대역은 신축 트랙이 제목 하나뿐이라, 기간을 1px 넓히면 제목이 1px 좁아진다.
     * 실측(잘린 제목 행 수 / 301행):
     *   카드 1275(뷰포트 1440) — dur 104: 45행 · 120: 54 · 136: 62 · 152: 78
     *   카드 1432(뷰포트 1600) — dur 104:  5행 · 120:  7 · 136:  8 · 152: 11
     *   카드 1744(뷰포트 1920) — 어떤 값에서도 0행
     * 즉 폭은 **카드가 넓어질수록 공짜**가 된다. 하한(콜론 위 colDur)은 좁은 쪽 값 그대로
     * 두고, 카드 1400 근처에서 이 상한에 닿는 램프를 CompactList가 건다.
     */
    colDurSummaryMax: 132,
    /* 관련국 열 — 이 폭은 **텍스트 칩 2개 + '+N'의 자연 폭**에서 나온다.
       역사국가는 이모지가 없어 칩이 곧 국가명이고, 2칩 행의 자연 폭 합계가 141px
       (칩 58+49 · '+N' 26 · gap 8)이라 128px 트랙에서 13px이 모자라 **두 칩이 함께**
       '러시아 …' · '일본 …'으로 잘렸다(실측 1600px: 521칩 중 190칩 = 36% 말줄임).
       모자란 양이 이렇게 작을 때는 상한(--flag-name-max)이 아니라 트랙을 준다.
       128 → 172로 재측정: 말줄임 190칩 → 4칩(0.8%). 제목·요약 트랙은 872 → 828로
       45px 줄지만, 그 45px이 사던 것은 요약 5글자였고 팔던 것은 국가명 전체였다. */
    colFlags: 172,
    colAct: 60,
    colTitle: 520,
    indent: 28,
    yearH: 34,
    /**
     * 연 헤더 라벨 — 행 제목(14px)보다 **작다**.
     *
     * 한때 17px/800이었다. "행 제목과 같은 14px/700이라 머리글이 행처럼 보인다"는 진단에
     * 크기로 답한 값인데, 그러면 목록을 정리하는 라벨이 정작 목록보다 크게 외친다
     * (사용자 지적: "세기·년도를 강조하는 건 맞는데 오버적이다"). 머리글은 **라벨의
     * 생김새**로 갈라야 한다 — 작게·흐리게·자간을 벌려서. 크기가 아니라 종류가 다른 것이다.
     */
    yearLabel: 14,
    yearMt: 22,
    yearMb: 6,
    centuryH: 36,
    /** 세기 헤더 라벨 크기 — 연 헤더보다 한 단 위, 행 제목보다는 조금 위. */
    centuryLabel: 21,
    centuryGap: 34,
    railInset: 31,
    /** sticky 열 헤더 높이 — 3겹 사다리의 첫 단 */
    colHeaderH: 30,
    // ── 광폭 단계 토큰 ────────────────────────────────────────────────────────
    /** 실측 제목 자연 최대 613px을 전량 수용하는 clamp 상한 */
    colTitleMax: 760,
    colDateWide: 78,
    /**
     * 기간 트랙의 광폭 단계 — 한 달 ≈ 16px.
     *
     * 144px이었다(한 달 12px). 그 폭에서 이 열이 싣는 잉크의 실측 중앙값은
     * **9px**(막대 최소폭)이고 125행은 6px 점이다 — 즉 이 열이 실제로 말하는 것은
     * 길이가 아니라 **연 안에서의 위치** 하나뿐인데, 위치를 읽을 해상도가 그 폭에
     * 없었다. 분기 격자(SPAN_GRID)를 깔아도 눈금 간격이 36px이면 4월과 6월이
     * 한 칸 안에서 뭉갠다. 늘어난 폭은 전부 신축 트랙(제목 1.5 : 키워드 1 : 관련국 1)
     * 에서 나오고, 이 단계의 제목 잉크 실측 p90은 313px이라 잘림은 늘지 않는다.
     */
    colDurWide: 192,
    /** atlas 단계 — 한 달 ≈ 19.3px. 관련국·등록 열까지 켜지는 폭이라 여기서 한 번 더 준다. */
    colDurUltra: 232,
    colFlagsWide: 200,
    colFlagsUltra: 240,
    /** 칩 2개(96×2) + gap 4 + '+N' 28 = 224 < 240 */
    colKw: 240,
    /* 등록 시각 — 잉크가 '4개월 전'·'오늘'로 **전 행 41px 고정**이다(실측 293행).
       96px은 그 차이 55px을 열 끝마다 빈 띠로 남겼다. 우측 정렬이라 남는 폭은
       제목·요약 쪽 공백으로만 쌓인다. */
    colReg: 72,
  },
  roomy: {
    rowMinH: 52,
    rowPadY: 11,
    rowPadL: 14,
    rowPadR: 12,
    colGap: 14,
    actBtn: 28,
    discBtn: 26,
    colDate: 70,
    colChip: 64,
    /* 기간 열 = 연 단위 트랙. 한 달 ≈ 9.3px. */
    colDur: 112,
    /**
     * summary 대역(카드 1180~1751)의 기간 트랙 **상한**.
     *
     * 이 대역은 신축 트랙이 제목 하나뿐이라, 기간을 1px 넓히면 제목이 1px 좁아진다.
     * 실측(잘린 제목 행 수 / 301행):
     *   카드 1275(뷰포트 1440) — dur 104: 45행 · 120: 54 · 136: 62 · 152: 78
     *   카드 1432(뷰포트 1600) — dur 104:  5행 · 120:  7 · 136:  8 · 152: 11
     *   카드 1744(뷰포트 1920) — 어떤 값에서도 0행
     * 즉 폭은 **카드가 넓어질수록 공짜**가 된다. 하한(콜론 위 colDur)은 좁은 쪽 값 그대로
     * 두고, 카드 1400 근처에서 이 상한에 닿는 램프를 CompactList가 건다.
     */
    colDurSummaryMax: 138,
    /* 관련국 열 — 이 폭은 **텍스트 칩 2개 + '+N'의 자연 폭**에서 나온다.
       역사국가는 이모지가 없어 칩이 곧 국가명이고, 2칩 행의 자연 폭 합계가 141px
       (칩 58+49 · '+N' 26 · gap 8)이라 128px 트랙에서 13px이 모자라 **두 칩이 함께**
       '러시아 …' · '일본 …'으로 잘렸다(실측 1600px: 521칩 중 190칩 = 36% 말줄임).
       모자란 양이 이렇게 작을 때는 상한(--flag-name-max)이 아니라 트랙을 준다.
       128 → 172로 재측정: 말줄임 190칩 → 4칩(0.8%). 제목·요약 트랙은 872 → 828로
       45px 줄지만, 그 45px이 사던 것은 요약 5글자였고 팔던 것은 국가명 전체였다. */
    colFlags: 180,
    colAct: 60,
    colTitle: 520,
    indent: 32,
    yearH: 40,
    /** 연 헤더 라벨 — 행 제목보다 **작다**(cozy 주석 참고). */
    yearLabel: 15,
    yearMt: 26,
    yearMb: 8,
    centuryH: 40,
    /** 세기 헤더 라벨 크기 — 연 헤더보다 한 단 위. */
    centuryLabel: 23,
    centuryGap: 40,
    railInset: 31,
    /** sticky 열 헤더 높이 — 3겹 사다리의 첫 단 */
    colHeaderH: 32,
    // ── 광폭 단계 토큰 ────────────────────────────────────────────────────────
    colTitleMax: 760,
    colDateWide: 82,
    /**
     * 기간 트랙의 광폭 단계 — 한 달 ≈ 16.7px.
     *
     * 150px이었다(한 달 12.5px). 그 폭에서 이 열이 싣는 잉크의 실측 중앙값은
     * **9px**(막대 최소폭)이고 125행은 6px 점이다 — 즉 이 열이 실제로 말하는 것은
     * 길이가 아니라 **연 안에서의 위치** 하나뿐인데, 위치를 읽을 해상도가 그 폭에
     * 없었다. 분기 격자(SPAN_GRID)를 깔아도 눈금 간격이 37px이면 4월과 6월이
     * 한 칸 안에서 뭉갠다. 늘어난 폭은 전부 신축 트랙(제목 1.5 : 키워드 1 : 관련국 1)
     * 에서 나오고, 이 단계의 제목 잉크 실측 p90은 313px이라 잘림은 늘지 않는다.
     */
    colDurWide: 200,
    /** atlas 단계 — 한 달 20px. 관련국·등록 열까지 켜지는 폭이라 여기서 한 번 더 준다. */
    colDurUltra: 240,
    colFlagsWide: 210,
    colFlagsUltra: 250,
    colKw: 260,
    /* 등록 시각 — 잉크가 '4개월 전'·'오늘'로 **전 행 41px 고정**이다(실측 293행).
       96px은 그 차이 55px을 열 끝마다 빈 띠로 남겼다. 우측 정렬이라 남는 폭은
       제목·요약 쪽 공백으로만 쌓인다. */
    colReg: 76,
  },
} as const

/**
 * 목록 행 안 타입 스케일 — 3단.
 *
 * 실측상 행 하나가 10 / 10.5 / 11 / 12 / 14 다섯 단을 썼고 인접 단차가 0.5px였다.
 * 0.5px는 위계를 0비트 실어 나른다. `title > meta > chip` 3단으로 줄이고, 굵기는
 * 700 > 600 > 500이 크기와 **같은 방향으로** 단조가 되게 한다.
 *
 * 도입 시점 값은 현행 제목 14 / 날짜 12 / 칩 10.5과 동일 — 통합은 타입 토큰 배치에서.
 */
export const ROW_TYPE = {
  compact: { title: '13px', meta: '11px', chip: '10px' },
  /* 칩 10.5 → 11: fill을 지워 텍스트 대비가 올라간 만큼 크기를 되돌린다.
     반픽셀은 위계를 0비트 실어 나르므로 스케일에 남기지 않는다(의도적 이탈). */
  cozy: { title: '14px', meta: '12px', chip: '11px' },
  roomy: { title: '15px', meta: '12px', chip: '11px' },
} as const

/*
 * (제거됨 → 부활) `SURFACE` — 아래 다시 선언한다.
 * 처음 도입 때는 소비처가 한 번도 생기지 않아 지웠다(레포 전역 참조 0). 이번에는
 * **소비처를 같은 커밋에 넣는다** — 토큰만 먼저 만들면 같은 일이 반복된다.
 */

/**
 * 레일(타임라인 선) 잉크 — **축선 · 계층 줄기 · 가로 커넥터가 한 값**을 쓴다.
 *
 * ── 왜 파랑을 버렸나 ────────────────────────────────────────────────────────
 * 사용자 판정: "좌측 타임라인 선 최악이야."
 *
 * 직전 라운드는 이 축을 **대비**로만 고쳤다(1.81 → 3.44:1). 그런데 지면에서 시끄러운 건
 * 대비가 아니라 **채도 × 반복**이었다. 301행이 각자 파란 점 + 파란 26px 스텁을 축에
 * 매달아, 왼쪽 거터가 브랜드 파랑 600개로 짠 빗(comb)이 돼 있었다. 같은 3.4:1이라도
 * 중립 회색 선은 바탕으로 읽히고 채도 높은 파랑 선은 **신호**로 읽힌다 — 그리고 이 축이
 * 실어야 할 신호는 '여기 시간축이 있다' 하나뿐이지, 행마다 새로 외칠 것이 아니다.
 *
 * 그래서 규칙을 바꾼다: **반복하는 것은 조용한 중립, 구조를 만드는 것만 브랜드 파랑.**
 *   - 중립(이 토큰) = 축선 · 줄기 · 커넥터 · 행 눈금(RAIL_TICK)
 *   - 파랑          = 세기 앵커 · 연 앵커 · 선택 행 눈금 (지면에 400개가 아니라 ~100개)
 *
 * 대비는 WCAG 1.4.11(3:1)을 그대로 지킨다(라이트 3.03:1 · 다크 3.29:1). 직전 값(3.44/3.67)
 * 보다 살짝 낮은 이유는 축이 이제 **눈금을 꿰는 실**이지 눈금 자신이 아니기 때문이다.
 *
 * ⚠️ 줄기·커넥터가 **같은 값**인 것은 의도다. 예전엔 축이 파랑, 줄기가 회색(#8f9296)이라
 * 같은 계층 장치가 두 색으로 갈려 있었고, depth 1 자식의 줄기가 축선과 겹치는 자리에서는
 * 색이 어긋난 이중선으로 보였다. 이제 겹치면 그냥 같은 선이다.
 *
 * ⚠️ 값이 다섯 군데에 리터럴로 흩어져 있던 이력(스크롤러 배경 · railAxisOverlay ·
 * 연 헤더 밴드의 축 재그리기 · 그 hover) 때문에 소비처는 반드시 railAxisOverlay()를 경유한다.
 */
export const RAIL_AXIS = {
  light: 'rgba(15, 23, 42, 0.46)',
  dark: 'rgba(255, 255, 255, 0.36)',
} as const

/**
 * 계층 줄기·가로 커넥터 — 축선과 **같은 잉크**(위 주석의 두 번째 ⚠️).
 * 별칭으로 남기는 이유는 소비처에서 '무엇을 그리는 선인지'가 이름으로 남게 하기 위해서다.
 */
export const RAIL_CONNECTOR = RAIL_AXIS

/**
 * 행 눈금(축 위의 구슬) — 축선보다 **한 단 진한 중립**.
 *
 * 예전 눈금은 축에서 10px 떨어진 자리에 있었고, 그래서 행마다 26px짜리 가로 스텁이
 * 필요했다(그 스텁이 빗살의 정체다). 눈금을 **축 위로** 올리면 스텁이 통째로 사라지고,
 * '이 행이 저 시점에 걸려 있다'는 점이 선 위에 있다는 사실로 직접 읽힌다.
 *
 * 축(3:1)보다 진해야(5:1) 선 위의 **구슬**로 읽힌다 — 같은 값이면 선이 굵어진 것처럼
 * 보이고, 더 흐리면 선에 먹힌다. 지면색 링은 쓰지 않는다: 링은 축을 눈금마다 끊어
 * 점선처럼 보이게 하던 원인이었고, 구슬이 선보다 진한 이상 필요도 없다
 * (속 빈 하위 눈금만 예외 — 커넥터가 원 안을 가로지르는 걸 막아야 한다).
 */
export const RAIL_TICK = {
  light: 'rgba(15, 23, 42, 0.62)',
  dark: 'rgba(255, 255, 255, 0.48)',
} as const

/**
 * 기간 트랙의 **연 격자** 잉크 — 한 해를 1·4·7·10월로 가르는 세로 하어라인.
 *
 * 이 열이 싣는 정보는 실측상 길이가 아니라 **위치**다(막대 중앙값 9px = 최소폭,
 * 125행은 6px 점). 그런데 좌표계를 말하는 눈금은 열 머리글에 한 번뿐이라, 머리글이
 * 화면 밖으로 나가는 순간 점이 트랙의 어디에 찍혔는지 읽을 방법이 사라졌다.
 *
 * ⚠️ 이 선은 **행마다 그리되 행 경계를 넘어 이어 붙는다**(Duration::before가 행 패딩만큼
 * 위아래로 뻗는다). 2026-08-01에 폐기된 것은 행마다 끊긴 **짧은 획 5개**였고
 * (293행 × 5 = 1,465획이 값보다 먼저 읽혔다), 연 그룹을 세로로 관통하는 **한 벌의
 * 연속선**은 그 진단에 걸리지 않는다 — 텍스처가 아니라 바탕이다.
 *
 * 값은 행 괘선(ROW_HAIRLINE 0.08)보다 **아래**다. 격자가 행 구분보다 진해지면
 * 목록이 표가 아니라 모눈종이가 된다.
 *   year    = 연 경계(1월 1일·12월 31일) — 필드의 양 끝
 *   quarter = 4·7·10월
 */
export const SPAN_GRID = {
  light: {
    year: 'rgba(15, 23, 42, 0.07)',
    quarter: 'rgba(15, 23, 42, 0.045)',
  },
  dark: {
    year: 'rgba(255, 255, 255, 0.07)',
    quarter: 'rgba(255, 255, 255, 0.045)',
  },
} as const

/**
 * 행 구분 hairline — **단일 출처**.
 *
 * 전폭 전환으로 행 폭이 1,038 → 3,294px(3.2배)이 되는데, 기존 alpha 0.05는 라이트
 * 표면 대비 1.106:1로 지각 하한 미만이다. 짧은 행에서는 눈이 행 끝의 여백으로 경계를
 * 보완하지만 폭이 길어지면 그 보완이 사라져 행들이 한 덩어리로 뭉친다.
 *
 * ⚠️ 스켈레톤(event-compact-list의 SkeletonStop)도 **같은 토큰**을 읽어야 한다.
 *    따로 두면 로딩 → 데이터 전환에서 선 굵기가 튄다.
 */
export const ROW_HAIRLINE = {
  light: 'rgba(15, 23, 42, 0.08)',
  /* 다크는 0.08이었다. 목록 표면(#1c1c1c) 위 실측 대비 **1.25:1**로, 32px 조밀 행에서는
     행 경계가 사실상 사라져 여러 행이 한 덩어리로 뭉쳤다(라이트는 흰 바탕이라 같은
     alpha가 더 잘 선다). 0.12로 올려 ~1.4:1 — 여전히 SPAN_GRID(연 격자)보다 진해
     '표가 모눈종이가 되지 않는다'는 규약은 유지된다. */
  dark: 'rgba(255, 255, 255, 0.12)',
} as const

/** styled에서 바로 쓰는 헬퍼 — `border-bottom: 1px solid ${rowHairline};` */
export const rowHairline = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? ROW_HAIRLINE.dark : ROW_HAIRLINE.light

/**
 * 목록 표면 3단 — 다크 모드에서 난립하던 근접 값들을 접는다.
 *
 * 실측상 목록 계열이 `#0f0f12`·`#141414`·`#171717`·`#18181b` 네 값을 섞어 썼는데,
 * 특히 `#0f0f12`는 `#141414` 대비 ΔRGB(5,5,2)로 **B만 상대적으로 높아** 앵커 도트
 * 둘레에 옅은 파란 헤일로가 돌았다. 셋으로 접고 의미를 붙인다.
 *   base    = 페이지 바탕(PageScene)
 *   raised  = 카드·행 위 오클루전 띠·도트 외곽 링
 *   overlay = 팝오버/드롭다운처럼 떠 있는 면
 */
export const SURFACE = {
  light: { base: '#ffffff', raised: '#ffffff', overlay: '#ffffff' },
  dark: { base: '#0f0f0f', raised: '#141414', overlay: '#18181b' },
} as const

/**
 * 그룹 머리글 표면 — **지면색 그대로**. 회색 밴드는 폐기했다.
 *
 * 한때 연/세기 구간을 tint 면(#edf0f5 / #dde4ee)으로 갈랐다. 근거는 "연 헤더 라벨이
 * 14px/700 primary로 행 제목과 픽셀 단위로 같아서, 선 하나로는 동률을 못 깬다"였다.
 * 그 진단은 맞았지만 처방이 틀렸다 — **머리글에 행과 같은 옷을 입혀 둔 채 뒤에 판을
 * 깔았다.** 결과는 목록 위에 회색 띠 두 종이 겹겹이 얹힌 화면이었고, 스크롤 중 명도가
 * 흰→진함→중간→흰으로 오르내려 머리글 블록이 한 덩어리로 읽히지 않았다
 * (사용자 지적: "뒷배경 회색 같은 거 없애라").
 *
 * 처방을 바꾼다: **머리글의 옷을 바꾼다**(크기·색·자간을 행과 다르게 — 라벨의 생김새로).
 * 그러면 면이 필요 없고, 구분은 여백과 세기 리더 룰이 맡는다.
 *
 * ⚠️ 값은 여전히 **불투명 지면색**이어야 한다. 이 표면들은 sticky라, 투명하게 두면
 * 아래로 지나가는 행이 라벨 뒤로 비친다(반투명 금지 규약은 그대로 유효).
 *   라이트 #ffffff · 다크 #141414(= 카드 #0f0f0f + rgba(255,255,255,0.02) 합성)
 */
export const GROUP_BAND = {
  light: { year: SURFACE.light.raised, century: SURFACE.light.raised },
  dark: { year: SURFACE.dark.raised, century: SURFACE.dark.raised },
} as const

/**
 * 밴드 hover — 밴드 자체보다 한 단 더. 밴드가 생기기 전의 hover 값(alpha 0.03~0.05)은
 * 이제 밴드 색에 묻혀 '눌러지는 줄'이라는 신호가 사라진다.
 */
/**
 * 열 머리글 띠 — 그룹 밴드와 **같은 계열의 한 단 위** 색.
 *
 * 흰 지면이었다. 그 탓에 스크롤 중 상단에 겹치는 세 층(열 머리글 → 세기 → 연도)의 명도가
 * 흰 → 진함 → 중간 → 흰(행)으로 **오르내려서**, 한 덩어리의 머리글이 아니라 서로 무관한
 * 띠 세 개가 쌓인 것처럼 읽혔다. 같은 hue 안에서 단조로 내려가게 값을 잡는다 —
 * 열 머리글(가장 옅음) → 연 밴드 → 세기 밴드(가장 진함) → 행(지면).
 *
 * ⚠️ 반투명 금지(그룹 밴드와 같은 규약) — sticky 띠 아래로 행이 비치면 안 된다.
 */
export const COLUMN_HEAD_BAND = {
  light: SURFACE.light.raised,
  dark: SURFACE.dark.raised,
} as const

/**
 * 머리글 hover — 밴드를 걷어낸 뒤로는 **이것만이** 면을 쓴다. 두 머리글 모두 버튼(접기)
 * 이라 눌러진다는 신호가 필요한데, 상시 밴드가 없으니 아주 옅은 한 단으로 충분하다.
 */
export const GROUP_BAND_HOVER = {
  light: { year: '#f3f5f8', century: '#eef1f6' },
  dark: { year: '#1e1e21', century: '#232327' },
} as const

export const surfaceRaised = ({ theme }: { theme: { mode: string } }) =>
  theme.mode === 'dark' ? SURFACE.dark.raised : SURFACE.light.raised

/**
 * 공통 색상
 */
export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: 'rgba(37, 99, 235, 0.12)',
  secondary: '#2563eb',
  border: 'rgba(20, 19, 34, 0.08)',
  borderLight: 'rgba(37, 99, 235, 0.12)',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b',
  },
  background: {
    white: '#ffffff',
    light: '#f8fafc',
    lighter: '#fafbff',
    gradient: 'linear-gradient(180deg, #fafbff, #ffffff)',
  },
} as const

/**
 * 애니메이션 키프레임
 */
export const KEYFRAMES = {
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% {
        opacity: 0.6;
      }
      50% {
        opacity: 0.4;
      }
    }
  `,
} as const

/**
 * 반응형 브레이크포인트
 */
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
  wide: '1600px',
} as const

/**
 * 목록(LIST) 행 격자의 **컨테이너 임계 단일 출처**.
 *
 * ⚠️ 이 블록은 더 이상 '폭 상한'이 아니다. 2026-08-02 사용자 지시로 LIST 뷰의 폭 캡과
 *    중앙정렬은 폐지됐다(`PageWrapper.max-width` / `CatalogSection.width: min()` 둘 다 제거).
 *    같이 살던 `ink`·`page`·`pageWithAside`·`inkWide`·`pageWide` 5개는 그때 소비처가
 *    0이 되어 삭제했다 — 값이 살아 있는 척하는 토큰은 다음 사람이 '없는 캡'을 찾게 만든다
 *    (`SURFACE` 전례, 이 파일 아래 묘비 주석 참고).
 *
 * 단위는 **content box**다. 컨테이너 쿼리는 border box가 아니라 콘텐츠 상자를 재므로
 * 카드 보더 2px은 빠진다 — 이 항을 빼먹으면 임계 바로 위 뷰포트에서 열이 안 켜진다
 * (1824px에서 카드 1324인데 콘텐츠는 1322라 미달했다. 실측으로 확인).
 *
 * 카드 크롬 92 = 목록 패딩 56(좌 `--rail-gutter` 36 + 우 20)
 *              + Stop 패딩 26(`rowPadL` 14 + `rowPadR` 12)
 *              + CompactList 스크롤바 10(`list.styles.ts`의 `::-webkit-scrollbar`)
 * ⚠️ 위 세 항 중 하나라도 바꾸면 아래 세 임계를 **같은 커밋에서** 재유도할 것.
 *    (도입 시점 크롬은 80이었고 임계는 1322/1740/2040이었다. 스크롤바 6→10 · 우측
 *     패딩 12→20으로 12px이 늘어 전부 +12 했다. 이 재유도를 빼먹으면 "임계 바로 위
 *     뷰포트에서 열이 안 켜지는" 과거 회귀가 그대로 재발한다.)
 *
 * 유도식(cozy 기준 — 고정 트랙·gap이 가장 큰 밀도가 통과하면 나머지는 여유가 생긴다):
 *   summary 1334 = 92 + 고정 370(date 66 + chip 60 + dur 56 + flags 128 + act 60)
 *                     + gap 72(12×6) + 제목 520 + 요약 하한 280
 *   ledger  1752 = 92 + 고정 514(date 66 + chip 60 + kw 240 + durWide 88 + flagsWide 200 + act 60)
 *                     + gap 84(12×7) + 제목 520 + 요약 하한 280 → 여유를 둬 1752
 *   atlas   2052 = 92 + 고정 862(dateWide 78 + chip 60 + kw 240 + durWide 88 + flagsUltra 240
 *                                + reg 96 + act 60) + gap 96(12×8) + 제목 520 + 요약 하한 420
 *
 * 요약 280자리는 한 줄 말줄임의 실용 하한이다. 그 아래로는 열을 여느니 안 여는 게 낫다.
 *
 * ⚠️ 위 유도식의 고정 폭 합계는 **도입 시점 값**이다. 이후 `colDur`(56→104)·
 *    `colFlags`(128→152)·`colReg`(96→72)가 각자의 실측 근거로 움직였고, 임계는
 *    다시 유도하지 않았다 — 임계는 폭 **상한**이 아니라 열이 켜지는 **문턱**이라,
 *    고정 폭이 조금 늘면 그 단계에서 제목·요약이 그만큼 덜 가질 뿐 레이아웃이 깨지지
 *    않는다. 고정 폭을 크게(수십 px 단위로) 옮길 때만 재유도할 것.
 */
export const LIST_STEPS = {
  /**
   * 설명이 켜지는 임계.
   *
   * 1334였다. 그 값은 설명이 **340px짜리 독립 열**이던 시절, 그 열이 들어갈 자리를
   * 확보하는 데 필요한 카드 폭이었다. 설명이 제목 뒤를 잇는 글이 되면서 전제가 바뀌었다 —
   * 이제 필요한 것은 '열 하나'가 아니라 '제목을 쓰고 남는 폭'이고, 그건 훨씬 좁은 카드에도
   * 있다. 1334를 그대로 두면 **뷰포트 1600px 이상에서만** 설명이 보인다(1440px 카드는
   * 1277이라 미달) — 실측으로 확인한 상태였다.
   *
   * 값은 실측으로 잡았다(뷰포트 → 카드 폭 → 설명 최소 폭 / 잘린 제목 수):
   *
   * | 임계 | 1280(카드 1120) | 1440(카드 1277) | 1600(카드 1434) |
   * |---|---|---|---|
   * | 1080 | 설명 114~450px · 제목 24행 잘림 | 243~608 · 8행 | 313~764 · 1행 |
   * | 1180 | 설명 없음 · 제목 1행 | 243~608 · 8행 | 313~764 · 1행 |
   *
   * 1280 대역에서 설명 최소 폭 114px은 한글 12자다 — 그 12자를 얻자고 제목 24행을
   * 자르는 건 남는 장사가 아니다. 1440부터 켠다(최소 243px ≈ 25자, 잘린 제목 8행).
   */
  summary: 1180,
  /** 7→8트랙. 키워드 열이 켜지고 기간·관련국이 넓어진다. */
  ledger: 1752,
  /** 8→9트랙. 등록 시각 열이 켜지고 날짜·관련국이 한 번 더 넓어진다. */
  atlas: 2052,
} as const

/*
 * (제거됨) `Z_INDEX` — 이 파일의 로컬 z-index 사다리.
 * 정본은 `@/shared/styles/z-index`이고 events 페이지의 소비처들도 전부 그쪽을 import한다
 * (`catalog-main-content.tsx`·`filters-panel.tsx`). 여기 값은 스케일도 달라(dropdown 100 vs
 * 공용 값) 잘못 집으면 팝오버가 드로어 아래로 내려간다 — 오답을 고를 기회만 남아 있었다(검토 VIS-10).
 */
