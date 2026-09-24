/**
 * 부처 이름의 **틀(frame)** — 나라마다 같은 자리를 다른 이름으로 부른다.
 *
 * 대시보드의 「기본 틀에서 고르기」는 오래 '외무부·국방부…' 13개를 하드코딩해 뒀다.
 * 근대 일본은 외무성·내무성·대장성이었고 우두머리는 장관이 아니라 대신이었으며,
 * 조선은 이조·호조·예조였다. 한국식 '부'만 권하면 일본 지면을 만드는 사람은 권유를
 * 전부 지우고 손으로 다시 쳐야 한다.
 *
 * 그래서 이름을 고정값이 아니라 **틀의 한 변형**으로 둔다. 기본 틀('부')은 그대로
 * 남기고, 나라·시대에 맞는 틀을 골라 담을 수 있게 한다. 담은 뒤의 이름은 언제든
 * 고칠 수 있다(부처 이름은 원래 자유 입력 — 여기서 정하는 건 출발점뿐이다).
 *
 * `categoryName`은 전역 카테고리(administration_department_category.name)와 맞춰
 * 둔다. 예전 프리셋은 카테고리 없이 만들어서, 대시보드에서 만든 부처가 「행정조직 →
 * 중앙부처」의 어느 카테고리 탭에도 안 나타났다.
 */

export type DepartmentFrameItem = {
  /** 명칭 체계가 달라도 같은 자리를 가리키는 키 (외교·국방…) */
  slot: string
  name: string
  /** 전역 부처 카테고리 이름 — 만들 때 categoryId로 환원한다 */
  categoryName: string
}

export type DepartmentNameFrame = {
  id: string
  /** 선택기에 보이는 이름 */
  label: string
  /** 이 틀에서 부처 우두머리를 부르는 말 (장관·대신·부장·판서) */
  headTitle: string
  /** 언제 쓰는 틀인지 */
  hint: string
  items: DepartmentFrameItem[]
}

export const DEPARTMENT_NAME_FRAMES: DepartmentNameFrame[] = [
  {
    id: 'bu',
    label: '부(部) — 기본',
    headTitle: '장관',
    hint: '현대 한국·일반적인 근대 국가',
    items: [
      { slot: 'foreign', name: '외무부', categoryName: '외교' },
      { slot: 'defense', name: '국방부', categoryName: '국방' },
      { slot: 'finance', name: '재무부', categoryName: '재정·경제' },
      { slot: 'justice', name: '법무부', categoryName: '법무' },
      { slot: 'interior', name: '내무부', categoryName: '행정·안전' },
      { slot: 'education', name: '교육부', categoryName: '교육' },
      { slot: 'health', name: '보건부', categoryName: '보건·복지' },
      { slot: 'labor', name: '노동부', categoryName: '고용·노동' },
      { slot: 'industry', name: '산업부', categoryName: '산업·에너지' },
      { slot: 'agriculture', name: '농업부', categoryName: '농림·해양' },
      { slot: 'transport', name: '교통부', categoryName: '국토·교통' },
      { slot: 'culture', name: '문화부', categoryName: '문화·체육' },
      { slot: 'environment', name: '환경부', categoryName: '환경' },
    ],
  },
  {
    id: 'jp-imperial',
    label: '성(省) — 일본 제국',
    headTitle: '대신',
    hint: '메이지~1947. 외무대신·내무대신처럼 우두머리는 「대신」',
    items: [
      { slot: 'foreign', name: '외무성', categoryName: '외교' },
      { slot: 'interior', name: '내무성', categoryName: '행정·안전' },
      { slot: 'finance', name: '대장성', categoryName: '재정·경제' },
      { slot: 'army', name: '육군성', categoryName: '국방' },
      { slot: 'navy', name: '해군성', categoryName: '국방' },
      { slot: 'justice', name: '사법성', categoryName: '법무' },
      { slot: 'education', name: '문부성', categoryName: '교육' },
      { slot: 'communications', name: '체신성', categoryName: '정보·통신' },
      { slot: 'industry', name: '농상무성', categoryName: '농림·해양' },
      { slot: 'colonial', name: '척무성', categoryName: '기타' },
      { slot: 'court', name: '궁내성', categoryName: '기타' },
    ],
  },
  {
    id: 'jp-modern',
    label: '성(省) — 현대 일본',
    headTitle: '대신',
    hint: '1947년 이후 — 방위성·총무성 체제',
    items: [
      { slot: 'foreign', name: '외무성', categoryName: '외교' },
      { slot: 'defense', name: '방위성', categoryName: '국방' },
      { slot: 'finance', name: '재무성', categoryName: '재정·경제' },
      { slot: 'justice', name: '법무성', categoryName: '법무' },
      { slot: 'interior', name: '총무성', categoryName: '행정·안전' },
      { slot: 'education', name: '문부과학성', categoryName: '교육' },
      { slot: 'health', name: '후생노동성', categoryName: '보건·복지' },
      { slot: 'industry', name: '경제산업성', categoryName: '산업·에너지' },
      { slot: 'agriculture', name: '농림수산성', categoryName: '농림·해양' },
      { slot: 'transport', name: '국토교통성', categoryName: '국토·교통' },
      { slot: 'environment', name: '환경성', categoryName: '환경' },
    ],
  },
  {
    id: 'cn',
    label: '부(部) — 중국식',
    headTitle: '부장',
    hint: '중화민국·중화인민공화국 — 외교부·재정부',
    items: [
      { slot: 'foreign', name: '외교부', categoryName: '외교' },
      { slot: 'defense', name: '국방부', categoryName: '국방' },
      { slot: 'finance', name: '재정부', categoryName: '재정·경제' },
      { slot: 'justice', name: '사법부', categoryName: '법무' },
      { slot: 'interior', name: '공안부', categoryName: '행정·안전' },
      { slot: 'education', name: '교육부', categoryName: '교육' },
      { slot: 'health', name: '위생부', categoryName: '보건·복지' },
      { slot: 'labor', name: '노동부', categoryName: '고용·노동' },
      { slot: 'industry', name: '공업부', categoryName: '산업·에너지' },
      { slot: 'agriculture', name: '농업부', categoryName: '농림·해양' },
      { slot: 'transport', name: '교통부', categoryName: '국토·교통' },
      { slot: 'culture', name: '문화부', categoryName: '문화·체육' },
    ],
  },
  {
    id: 'joseon',
    label: '조(曹) — 조선 6조',
    headTitle: '판서',
    hint: '조선·고려 — 이조·호조·예조. 우두머리는 「판서」',
    items: [
      { slot: 'interior', name: '이조', categoryName: '행정·안전' },
      { slot: 'finance', name: '호조', categoryName: '재정·경제' },
      { slot: 'foreign', name: '예조', categoryName: '외교' },
      { slot: 'defense', name: '병조', categoryName: '국방' },
      { slot: 'justice', name: '형조', categoryName: '법무' },
      { slot: 'transport', name: '공조', categoryName: '국토·교통' },
    ],
  },
]

export const DEFAULT_DEPARTMENT_FRAME_ID = 'bu'

export function getDepartmentNameFrame(frameId: string): DepartmentNameFrame {
  return (
    DEPARTMENT_NAME_FRAMES.find((frame) => frame.id === frameId) ??
    DEPARTMENT_NAME_FRAMES[0]
  )
}

const stripSpace = (value: string) => value.replace(/\s/g, '')

/**
 * 이미 만들어 둔 부처 이름으로 이 나라가 쓰는 틀을 짐작한다.
 * 일본 지면에 외무성이 이미 있으면 다음 권유도 '성'이어야 한다.
 * 못 맞히면 기본 틀 — 틀린 추측보다 기존 틀이 낫다.
 */
export function inferDepartmentFrameId(existingNames: string[]): string {
  const names = existingNames.map(stripSpace).filter(Boolean)
  if (names.length === 0) return DEFAULT_DEPARTMENT_FRAME_ID
  const scored = DEPARTMENT_NAME_FRAMES.map((frame) => ({
    id: frame.id,
    hits: frame.items.filter((item) =>
      names.some((name) => name.includes(stripSpace(item.name))),
    ).length,
  }))
  const best = scored.reduce((acc, row) => (row.hits > acc.hits ? row : acc))
  return best.hits > 0 ? best.id : DEFAULT_DEPARTMENT_FRAME_ID
}

/**
 * 이 틀에서 아직 만들지 않은 항목만. 이미 있는 부처를 또 권하지 않는다.
 * 같은 자리를 다른 틀 이름으로 이미 만들어 뒀다면(외무부가 있는데 외무성을 권함)
 * 그것도 거른다 — 자리(slot)로 판단한다.
 */
export function suggestFrameItems(
  frame: DepartmentNameFrame,
  existingNames: string[],
): DepartmentFrameItem[] {
  const existing = existingNames.map(stripSpace).filter(Boolean)
  const takenSlots = new Set<string>()
  for (const candidate of DEPARTMENT_NAME_FRAMES) {
    for (const item of candidate.items) {
      if (existing.some((name) => name.includes(stripSpace(item.name)))) {
        takenSlots.add(item.slot)
      }
    }
  }
  return frame.items.filter((item) => !takenSlots.has(item.slot))
}
