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
 */
export const CATEGORY_SOFT_COLORS: Record<
  HistoricalEventCategory,
  { rgb: string; text: string; textDark: string; sparkEnd: string }
> = {
  // rgb = LEDGER hue(칩 배경 tint용), text/textDark = 그 hue의 AA 대비 shade(라이트/다크).
  military: { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
  political: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
  economic: { rgb: '180, 83, 9', text: '#9a3412', textDark: '#fdba74', sparkEnd: '#fb923c' },
  social: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
  technological: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
  cultural: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  diplomatic: { rgb: '14, 165, 233', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  conference: { rgb: '30, 58, 138', text: '#1e3a8a', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
  religious: { rgb: '161, 98, 7', text: '#854d0e', textDark: '#fcd34d', sparkEnd: '#fbbf24' },
  other: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
  // 한글 alias
  '전쟁/군사': { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
  정치: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
  경제: { rgb: '180, 83, 9', text: '#9a3412', textDark: '#fdba74', sparkEnd: '#fb923c' },
  사회: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
  과학기술: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
  문화: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
  외교: { rgb: '14, 165, 233', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
  '회담/조약': { rgb: '30, 58, 138', text: '#1e3a8a', textDark: '#93c5fd', sparkEnd: '#60a5fa' },
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
 * 공급할 뿐 **이름과 소비처를 바꾸지 않는다**. YearDivider가 `top: var(--century-header-h)`로
 * 세기 헤더에 붙어 있어, 이름이 끊기면 두 sticky 띠 사이에 슬릿이 생긴다.
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
    colDur: 52,
    colFlags: 112,
    colAct: 52,
    colTitle: 480,
    indent: 20,
    yearH: 30,
    yearMt: 10,
    yearMb: 4,
    centuryH: 36,
    centuryGap: 16,
    railInset: 19,
    /** sticky 열 헤더 높이 — 3겹 사다리의 첫 단 */
    colHeaderH: 24,
    // ── 광폭 단계 토큰(LIST_STEPS.ledger / .atlas에서만 소비) ──────────────────
    colTitleMax: 700,
    colDateWide: 72,
    colDurWide: 76,
    colFlagsWide: 180,
    colFlagsUltra: 220,
    colKw: 200,
    colReg: 88,
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
    colDur: 56,
    colFlags: 128,
    colAct: 60,
    colTitle: 520,
    indent: 28,
    yearH: 34,
    yearMt: 16,
    yearMb: 6,
    centuryH: 44,
    centuryGap: 28,
    railInset: 19,
    /** sticky 열 헤더 높이 — 3겹 사다리의 첫 단 */
    colHeaderH: 26,
    // ── 광폭 단계 토큰 ────────────────────────────────────────────────────────
    /** 실측 제목 자연 최대 613px을 전량 수용하는 clamp 상한 */
    colTitleMax: 760,
    colDateWide: 78,
    /** '12년 11개월'(실측 68px)이 안 잘리는 폭 — 현행 56px은 앞자리가 잘렸다 */
    colDurWide: 88,
    colFlagsWide: 200,
    colFlagsUltra: 240,
    /** 칩 2개(96×2) + gap 4 + '+N' 28 = 224 < 240 */
    colKw: 240,
    colReg: 96,
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
    colDur: 60,
    colFlags: 136,
    colAct: 60,
    colTitle: 520,
    indent: 32,
    yearH: 40,
    yearMt: 20,
    yearMb: 8,
    centuryH: 48,
    centuryGap: 32,
    railInset: 19,
    /** sticky 열 헤더 높이 — 3겹 사다리의 첫 단 */
    colHeaderH: 28,
    // ── 광폭 단계 토큰 ────────────────────────────────────────────────────────
    colTitleMax: 760,
    colDateWide: 82,
    colDurWide: 92,
    colFlagsWide: 210,
    colFlagsUltra: 250,
    colKw: 260,
    colReg: 96,
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
  dark: 'rgba(255, 255, 255, 0.08)',
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
 */
export const LIST_STEPS = {
  /**
   * 6→7트랙. 신축 역할이 제목 → 설명(요약)으로 넘어간다.
   * 이전 `summaryColumnMinCard`(1322)에 크롬 증가분 +12를 반영한 값이다.
   */
  summary: 1334,
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
