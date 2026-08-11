/**
 * "관직 재임" 직책 피커의 선택지 구성 — 필터 → 기록가족 그룹 → 이스케이프 해치 순.
 *
 * 설계 원칙 두 가지가 여기에 박혀 있다.
 * 1) **숨기지 말고 강등한다** — 작위(공작·백작·자작 등)는 공직 임기가 아니지만, 팔머스턴처럼
 *    작위를 재임 행으로 이미 등록한 기록이 실재한다. 하드 제외하면 그 행의 편집 선택지가
 *    증발하므로, 접히는 별도 그룹(`작위·칭호`)으로 내리기만 한다.
 * 2) **수정 중인 정의는 어떤 필터보다 먼저 살린다** — 피커 옵션에서 빠진 정의를 참조하는
 *    재임을 열면 라벨이 `기타: X`로 강등되고, 그대로 저장하면 positionDefinitionId가
 *    소리 없이 유실된다. `pinnedDefinition`은 각료 플로우 하드 필터까지 관통한다.
 */
import {
  getRecordFamily,
  RECORD_FAMILY_GROUP_LABELS,
  type RecordFamily,
} from '@/entities/government-position/model/record-family'

import { filterPositionDefinitions } from './filter-position-definitions'

export interface PositionDefinitionLike {
  id: string
  title?: string | null
  titleEn?: string | null
  name?: string | null
  positionType?: string | null
  isMonarchical?: boolean | null
  rank?: number | null
  /** 이 국가 컨텍스트의 재임·재위에서 쓰인 횟수 (피커 전용 API가 붙여 준다) */
  usedCount?: number | null
  usedInThisCountry?: boolean | null
}

/** 카탈로그에 없어 자유입력으로 저장돼 있던 직책명 — 같은 국가에서 다시 쓸 수 있게 되살린다 */
export interface RecentFreeTitleLike {
  title: string
  positionType: string
  count?: number
}

/** 사용 실적 그룹 — 이 국가에서 실제로 쓰인 직책만 위로 올린다 */
export const USED_GROUP_LABEL = '이 국가에서 쓰인 직책'

/**
 * 자유입력 직책명 선택지의 값 접두어. 정의 id와 섞이지 않게 접두어로 네임스페이스를 분리한다.
 * 선택 시 positionDefinitionId는 null로 두고 title·positionType만 복원한다.
 */
export const RECENT_TITLE_VALUE_PREFIX = '__RECENT__:'

/**
 * 값에 positionType까지 넣는 이유 — 서버 groupBy가 (title, positionType) 쌍이라 같은 표기가
 * 다른 유형으로 두 건 올 수 있다. title만 쓰면 옵션 value와 React key가 겹치고, 되짚기가
 * 항상 첫 항목을 잡아 엉뚱한 유형이 복원된다.
 */
export function recentTitleValue(title: string, positionType?: string | null): string {
  return `${RECENT_TITLE_VALUE_PREFIX}${positionType ?? ''}:${title}`
}

export function parseRecentTitleValue(
  value: string,
): { title: string; positionType: string | null } | null {
  if (!value.startsWith(RECENT_TITLE_VALUE_PREFIX)) return null
  const rest = value.slice(RECENT_TITLE_VALUE_PREFIX.length)
  const separator = rest.indexOf(':')
  if (separator < 0) return { title: rest, positionType: null }
  return {
    positionType: rest.slice(0, separator) || null,
    title: rest.slice(separator + 1),
  }
}

export interface BuiltinPositionLike {
  value: string
  label: string
  positionType: string
}

export interface PositionOptionItem {
  value: string
  label: string
  description?: string
  group?: string
}

export interface BuildPositionOptionsInput {
  /** 서버가 준 정의 목록 */
  definitions: PositionDefinitionLike[]
  /** 각료 추가(캐비닛에서 진입) 플로우면 각료·차관·부통령·기타만 */
  isMinisterFlow: boolean
  /** 내장 직책(정의 없이 고를 수 있는 항목) */
  builtins?: readonly BuiltinPositionLike[]
  /** 수정 중인 재임이 참조하는 정의 — 필터 결과에 없으면 강제로 되살린다 */
  pinnedDefinition?: PositionDefinitionLike | null
  /** 같은 국가에서 자유입력으로 저장돼 있던 직책명 — 사용 실적 그룹의 선택지로 되살린다 */
  recentTitles?: RecentFreeTitleLike[]
  /** '기타 (직접 입력)' 옵션 값. 넘기지 않으면 이스케이프 해치를 붙이지 않는다. */
  otherValue?: string
  otherLabel?: string
}

/** 사용 실적 → rank → 제목 순. 서버 orderBy는 rank=1이 과반이라 사실상 무작위였다. */
function compareByUsageThenRank(
  left: PositionDefinitionLike,
  right: PositionDefinitionLike,
): number {
  const usedDiff = (right.usedCount ?? 0) - (left.usedCount ?? 0)
  if (usedDiff !== 0) return usedDiff
  const rankDiff = (left.rank ?? 999) - (right.rank ?? 999)
  if (rankDiff !== 0) return rankDiff
  return definitionLabel(left).localeCompare(definitionLabel(right))
}

/** 그룹 표시 순서 — 관직이 먼저, 작위는 아래. 군주 칭호는 이 피커에 오지 않는다. */
const GROUP_ORDER: RecordFamily[] = ['OFFICE', 'NOBLE_TITLE', 'SOVEREIGN']

/** 기본으로 접어 둘 그룹 — SelectModal의 collapsedGroups로 그대로 넘긴다. */
export const DEFAULT_COLLAPSED_POSITION_GROUPS = [
  RECORD_FAMILY_GROUP_LABELS.NOBLE_TITLE,
]

function definitionLabel(def: PositionDefinitionLike): string {
  return def.title ?? def.name ?? def.id ?? '직책'
}

export function buildPositionOptions({
  definitions,
  isMinisterFlow,
  builtins = [],
  pinnedDefinition,
  recentTitles = [],
  otherValue,
  otherLabel = '기타 (직접 입력)',
}: BuildPositionOptionsInput): PositionOptionItem[] {
  const filtered = filterPositionDefinitions(definitions, { isMinisterFlow })

  // 수정 중인 정의 되살리기 — 필터·그룹 판정보다 먼저. 서버 목록에 이미 있으면 그대로 둔다.
  const visible = [...filtered]
  if (pinnedDefinition?.id && !visible.some((def) => def.id === pinnedDefinition.id)) {
    visible.push(pinnedDefinition)
  }

  /**
   * 사용 실적 그룹에는 **관직(OFFICE)만** 넣는다.
   * 사용 실적은 재임+재위를 합산한 값이라, 가족 게이트가 없으면 재위 이력(러시아 제국 황제 16건 등)이
   * 딸려 와 "관직 재임" 피커 최상단에 군주·작위가 뜬다. 같은 정의가 두 그룹에 들어가면
   * SelectModal의 key도 중복된다.
   */
  const usedOffice = visible
    .filter((def) => getRecordFamily(def) === 'OFFICE' && def.usedInThisCountry === true)
    .sort(compareByUsageThenRank)
  const usedIds = new Set(usedOffice.map((def) => def.id))

  const byFamily = new Map<RecordFamily, PositionOptionItem[]>()
  visible.forEach((def) => {
    if (usedIds.has(def.id)) return
    const family = getRecordFamily(def)
    const bucket = byFamily.get(family) ?? []
    bucket.push({
      value: def.id,
      label: definitionLabel(def),
      group: RECORD_FAMILY_GROUP_LABELS[family],
    })
    byFamily.set(family, bucket)
  })

  // 같은 positionType의 정의가 이미 있으면 내장 항목은 중복 노출하지 않는다.
  const definedTypes = new Set(visible.map((def) => def.positionType))
  const builtinOptions = builtins
    .filter((builtin) => !definedTypes.has(builtin.positionType))
    .map((builtin) => ({
      value: builtin.value,
      label: builtin.label,
      group: RECORD_FAMILY_GROUP_LABELS.OFFICE,
    }))
  if (builtinOptions.length > 0) {
    byFamily.set('OFFICE', [...(byFamily.get('OFFICE') ?? []), ...builtinOptions])
  }

  const options: PositionOptionItem[] = []

  // 1) 이 국가에서 실제로 쓰인 직책 — 정의 실적 + 자유입력 실적 순
  usedOffice.forEach((def) => {
    options.push({
      value: def.id,
      label: definitionLabel(def),
      group: USED_GROUP_LABEL,
    })
  })
  recentTitles.forEach((recent) => {
    // 같은 표기의 정의가 이미 목록에 있으면 자유입력 잔재를 중복 노출하지 않는다
    if (visible.some((def) => definitionLabel(def) === recent.title)) return
    options.push({
      value: recentTitleValue(recent.title, recent.positionType),
      label: recent.title,
      description: '이 국가에서 직접 입력으로 등록된 직책',
      group: USED_GROUP_LABEL,
    })
  })

  GROUP_ORDER.forEach((family) => {
    const bucket = byFamily.get(family)
    if (bucket && bucket.length > 0) options.push(...bucket)
  })

  // 그룹이 하나뿐이면 머리글이 정보를 더하지 않는다 — 구획 라벨을 떼고 평평하게.
  const distinctGroups = new Set(options.map((option) => option.group))
  if (distinctGroups.size <= 1) {
    options.forEach((option) => {
      delete option.group
    })
  }

  // 이스케이프 해치는 항상 마지막, 그룹 없이 — 어떤 필터로도 닫히면 안 되는 길.
  if (otherValue !== undefined) {
    options.push({ value: otherValue, label: otherLabel })
  }
  return options
}

/** 국가 상세 '역대 수반'·'전역 수반' 등록 피커의 관직 그룹 라벨. */
export const HEADS_OFFICE_GROUP_LABEL = '수반 직책'

/**
 * 수반 등록 피커용 그룹화 — 입력 순서(전역 우선·rank 등 호출부의 정렬)를 그대로 보존하면서
 * 작위만 접히는 그룹으로 내린다.
 *
 * 두 수반 화면은 ROYAL_NOBLE_TITLE을 '수반' 집합에 넣어 왔다. 재임 피커에서만 작위를 강등하면
 * 같은 재임 행을 만드는 다른 지면에서는 여전히 작위가 수반처럼 보여 비대칭이 남는다.
 * 여기서도 제외가 아니라 강등으로 맞춘다(작위 등록 경로는 유지).
 */
export function groupHeadsPositionOptions(
  definitions: PositionDefinitionLike[],
  toLabel: (def: PositionDefinitionLike) => string = definitionLabel,
): PositionOptionItem[] {
  const office = definitions.filter((def) => getRecordFamily(def) !== 'NOBLE_TITLE')
  const noble = definitions.filter((def) => getRecordFamily(def) === 'NOBLE_TITLE')
  if (noble.length === 0 || office.length === 0) {
    return definitions.map((def) => ({ value: def.id, label: toLabel(def) }))
  }
  return [
    ...office.map((def) => ({
      value: def.id,
      label: toLabel(def),
      group: HEADS_OFFICE_GROUP_LABEL,
    })),
    ...noble.map((def) => ({
      value: def.id,
      label: toLabel(def),
      group: RECORD_FAMILY_GROUP_LABELS.NOBLE_TITLE,
    })),
  ]
}

/** 재위 피커에서 기본으로 접어 둘 그룹. */
export const REIGN_OTHER_GROUP_LABEL = '그 밖의 직위'
export const DEFAULT_COLLAPSED_REIGN_GROUPS = [REIGN_OTHER_GROUP_LABEL]

/**
 * "군주 재위" 피커의 선택지 — 재임 피커의 거울상.
 *
 * 재위 패널은 그동안 필터가 **전혀 없어** 정의 50건(대통령·서기장·각료 포함)을 그대로 보여줬다.
 * 그렇다고 관직을 하드 제외할 수도 없다: 실측상 쇼군(15건)·총리(2건)·대통령(1건)처럼
 * isMonarchical=false인 정의로 등록된 재위가 18행 존재한다. 그래서 여기서도 강등만 한다 —
 * 군주 칭호·작위를 위로 올리고, 그 밖의 직위는 접히는 그룹으로 내린다.
 */
export function buildReignPositionOptions({
  definitions,
  pinnedDefinition,
}: {
  definitions: PositionDefinitionLike[]
  pinnedDefinition?: PositionDefinitionLike | null
}): PositionOptionItem[] {
  const visible = [...definitions]
  if (pinnedDefinition?.id && !visible.some((def) => def.id === pinnedDefinition.id)) {
    visible.push(pinnedDefinition)
  }

  const groupOf = (def: PositionDefinitionLike): string => {
    const family = getRecordFamily(def)
    if (family !== 'OFFICE') return RECORD_FAMILY_GROUP_LABELS[family]
    // 쇼군처럼 관직 유형이지만 이 국가에서 실제 재위로 쓰인 정의는 접힌 그룹에 묻지 않는다
    return def.usedInThisCountry === true ? USED_GROUP_LABEL : REIGN_OTHER_GROUP_LABEL
  }

  const order = [
    RECORD_FAMILY_GROUP_LABELS.SOVEREIGN,
    USED_GROUP_LABEL,
    RECORD_FAMILY_GROUP_LABELS.NOBLE_TITLE,
    REIGN_OTHER_GROUP_LABEL,
  ]
  const options: PositionOptionItem[] = []
  order.forEach((group) => {
    visible
      .filter((def) => groupOf(def) === group)
      .forEach((def) => {
        options.push({ value: def.id, label: definitionLabel(def), group })
      })
  })

  const distinctGroups = new Set(options.map((option) => option.group))
  if (distinctGroups.size <= 1) {
    options.forEach((option) => {
      delete option.group
    })
  }
  return options
}
