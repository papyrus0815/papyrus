import { Tokens, type TokenSet } from '@/constants/theme'

/**
 * 사건 카테고리 → 톤 색상.
 * 카테고리 이름은 백엔드 자유 입력이라 정확 매칭 + 부분 매칭 폴백.
 * 매칭 실패 시 기본 info 톤.
 */
type Tone = { bg: string; fg: string }

const KEYWORD_RULES: Array<{ match: RegExp; tone: (t: TokenSet) => Tone }> = [
  // 전쟁·전투·반란 → 빨강 (negative tone)
  { match: /전쟁|전투|반란|쿠데타|내전|침공|침략|봉기|혁명/, tone: (t) => t.state.negative },
  // 정치·외교·조약·협정 → 파랑 (info)
  { match: /정치|외교|조약|협정|동맹|회담|회의|선언/, tone: (t) => t.state.info },
  // 경제·산업·무역 → amber/warning
  { match: /경제|산업|무역|상업|통상|세금|화폐/, tone: (t) => t.state.warning },
  // 문화·예술·종교·학문 → 보라
  { match: /문화|예술|종교|불교|기독교|학문|편찬|작품|건축/, tone: (t) => ({ bg: t.accent.purpleSoft, fg: t.accent.purple }) },
  // 자연재해 → 빨강 변형
  { match: /지진|홍수|가뭄|태풍|역병|전염병|화재/, tone: (t) => t.state.negative },
  // 발견·탐험·과학 → 초록 (positive)
  { match: /발견|탐험|과학|발명|기술/, tone: (t) => t.state.positive },
]

export function eventCategoryTone(category?: string | null, tokens: TokenSet = Tokens): Tone {
  if (!category) return tokens.state.neutral
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(category)) return rule.tone(tokens)
  }
  return tokens.state.info
}
