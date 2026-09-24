/**
 * 제목 끝에 붙은 **자기 자신의 날짜**를 덜어낸다 — 날짜를 따로 찍는 목록 전용.
 *
 * 사건 제목에는 날짜를 괄호로 달아 두는 관행이 있다('IAEA 이란 비협조 결의 (2025-06-12)').
 * 행이 날짜를 이미 자기 자리에 찍고 있으면(사이드바는 메타 줄, 카탈로그 목록은 날짜 열)
 * 제목의 괄호는 같은 말을 두 번 하는 것이고, 그만큼을 제목이 아닌 것에 쓴다.
 *  - 사이드바: 298행 중 2줄 제목 43개, 그중 상당수가 이 꼬리 하나 때문이었다.
 *  - 카탈로그 목록(LIST): 298행 중 13행이 바로 옆 날짜 열과 **같은 날짜**를 제목 끝에
 *    한 번 더 적었다(행당 90~110px). 같은 지면의 설명(buildSnippet)은 이미 같은 이유로
 *    선두 날짜를 덜어내고 있었는데 제목만 예외로 남아 있었다.
 *
 * ⚠️ 호출하는 쪽이 **그 행이 실제로 날짜를 온전히 보여주는지** 먼저 판정한다. 날짜 열이
 * 비어 있거나(연 정밀도) 월까지만 찍는 행(그룹 밖 연도)에서는 제목의 괄호가 유일한
 * 출처다.
 *
 * ⚠️ **행이 실제로 보여주는 날짜와 같을 때만** 덜어낸다. 괄호 날짜가 시작일과 다른 제목이
 * 실제로 있고('시리아 아사드 정권 붕괴 (2024-12-08)'은 시작일이 2024-11-27), 그건 제목만이
 * 가진 정보라 지우면 안 된다.
 * ⚠️ 괄호 안에 날짜 말고 다른 내용이 있으면 그 내용은 남긴다
 * ('미-이란 핵 협상 (오만·로마, 2025-04-12 ~ 05-31)' → '미-이란 핵 협상 (오만·로마)').
 * ⚠️ 원본 제목은 검색(searchText)·스크린리더(ariaLabel)에 그대로 쓴다 — 화면에서만 줄인다.
 */
import { parseIsoDateParts } from '@/shared/lib/iso-date'

/** 제목 맨 끝의 괄호 덩어리 (중첩 괄호는 다루지 않는다 — 실데이터에 없다) */
const TRAILING_PARENS = /\s*[(（]([^()（）]*)[)）]\s*$/

/**
 * 괄호 안에서 날짜로 읽히는 선두 토큰 + 뒤따르는 기간 꼬리.
 * '2025-04-12 ~ 05-31' · '2024-09-17 ~ 18' · '2016.04.25' 를 한 덩어리로 잡는다.
 */
const DATE_TOKEN = /(\d{3,4})[-.](\d{1,2})[-.](\d{1,2})(\s*[~–—-]\s*[\d.\-\s]*\d)?/

/** 날짜를 떼고 남은 껍데기에서 구분자만 남았는지 — ', ' · '·' · '/' 따위 */
const SEPARATORS_ONLY = /^[\s,·/~–—-]*$/
/** 남은 조각 양 끝의 구분자 정리 */
const TRIM_SEPARATORS = /^[\s,·/~–—-]+|[\s,·/~–—-]+$/g

/**
 * 제목에서 중복 날짜 꼬리를 덜어낸 **표시용** 문자열.
 * 조건이 하나라도 안 맞으면 원본을 그대로 돌려준다(가장 안전한 쪽).
 */
export function titleWithoutOwnDate(
  title: string,
  startDate?: string | null,
  /** 'year'면 행이 날짜를 안 쓰므로 제목의 날짜가 유일한 출처 — 손대지 않는다 */
  precision?: string | null,
): string {
  if (!title || !startDate) return title
  if (precision === 'year') return title

  const parenthetical = TRAILING_PARENS.exec(title)
  if (!parenthetical) return title

  const dateToken = DATE_TOKEN.exec(parenthetical[1])
  if (!dateToken) return title

  const parts = parseIsoDateParts(startDate)
  if (!parts) return title
  const sameDate =
    parseInt(dateToken[1], 10) === parts.year &&
    parseInt(dateToken[2], 10) === parts.month &&
    parseInt(dateToken[3], 10) === parts.day
  if (!sameDate) return title

  const head = title.slice(0, parenthetical.index)
  const remainder = parenthetical[1].replace(dateToken[0], '')
  if (SEPARATORS_ONLY.test(remainder)) return head.trimEnd()

  const kept = remainder.replace(TRIM_SEPARATORS, '')
  return `${head.trimEnd()} (${kept})`
}
