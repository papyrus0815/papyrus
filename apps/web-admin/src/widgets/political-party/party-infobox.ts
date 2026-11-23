/**
 * 정당 인포박스 — 저장된 기록에서 만든다(B8, docs/political-party-model-review.md §6).
 *
 * 인포박스는 따로 입력하는 칸이 아니다. 이름·당직·조직·표지·수치 같은 곁가지의 정본을 읽어 줄을 만든다 —
 * 섹션에서 고치면 인포박스도 바뀌고, 비어 있는 항목은 줄이 생기지 않는다(빈 '—' 줄을 늘어놓지 않음).
 * 순서는 나무위키·위키백과 정당 정보 상자의 관례(이름 → 표지 → 표어 → 존속 → 계보 → 지도부 → 기구 → 이념 → 당사 → 조직 → 수치)를 따른다.
 */
import type { Observation } from '@/shared/api/evidence'
import {
  type PartyExpressionDto,
  type PartyHeadquartersDto,
  type PartyIdeologyLinkDto,
  type PartyLinkDto,
  type PartyMembershipListRow,
  type PartyOrganizationLinkDto,
  type PartyOrganizationRole,
  type PartyPositionPeriodDto,
  type PartySymbolDto,
  POLITICAL_POSITION_LABEL,
  type PoliticalPartyAliasDto,
  type PoliticalPartyLegalStatusDto,
  type PoliticalPartyLineageDto,
  type PoliticalPosition,
  labelPartyOrganizationRole,
  labelPoliticalPartyLegalStatus,
} from '@/shared/api/political-party'
import { formatObservationExact } from '@/entities/evidence/lib/format-observation'
import { formatPartialDate, formatPeriodLabel, transitionEffectiveOn } from '@/shared/lib/party-dates'
import { labelPartyOfficeKind } from '@/shared/lib/party-membership-labels'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export type InfoboxItem = {
  text: string
  /** 원문·번역·직함 등 덧말 */
  sub?: string | null
  /** 기간·시점 */
  when?: string | null
  /** 같은 화면에서 이동할 대상 — 정당 */
  partyId?: string | null
  /** 인물 상세 */
  personId?: string | null
}

/** inline — 짧은 낱말 여럿(이념 13개)은 줄마다 세우지 않고 이어 쓴다 */
export type InfoboxRow = { key: string; label: string; items: InfoboxItem[]; inline?: boolean }

export type InfoboxImage = { key: string; url: string; caption: string }

export type PartyInfobox = {
  title: string
  subtitles: string[]
  images: InfoboxImage[]
  palette: string[]
  rows: InfoboxRow[]
}

export type PartyInfoboxInput = {
  party: {
    name: string
    localName?: string | null
    shortName?: string | null
    position?: string | null
    colorPalette?: string[] | null
    brandColor?: string | null
    founded: string
    dissolved: string
  }
  aliases: PoliticalPartyAliasDto[]
  legalStatuses: PoliticalPartyLegalStatusDto[]
  ideologies: PartyIdeologyLinkDto[]
  positionPeriods: PartyPositionPeriodDto[]
  organizations: PartyOrganizationLinkDto[]
  memberships: PartyMembershipListRow[]
  symbols: PartySymbolDto[]
  expressions: PartyExpressionDto[]
  headquarters: PartyHeadquartersDto[]
  links: PartyLinkDto[]
  lineage: PoliticalPartyLineageDto | null
  observations: Observation[]
}

/** 정보 상자에 줄로 올리는 조직 역할 — 순서 그대로. 나머지 역할은 '기타 조직' 한 줄 */
const ORGANIZATION_ROWS: Array<{ role: PartyOrganizationRole; label: string }> = [
  { role: 'GOVERNING_ORGAN', label: '지도 기구' },
  { role: 'OFFICIAL_MEDIA', label: '기관지' },
  { role: 'PARAMILITARY_WING', label: '준군사 조직' },
  { role: 'YOUTH_WING', label: '청년 조직' },
  { role: 'STUDENT_WING', label: '학생 조직' },
  { role: 'WOMEN_WING', label: '여성 조직' },
  { role: 'TRADE_UNION', label: '노동조합' },
  { role: 'THINK_TANK', label: '싱크탱크' },
  { role: 'INTERNATIONAL_MEMBERSHIP', label: '국제 조직' },
  { role: 'ALLIANCE_MEMBERSHIP', label: '연합' },
]

const signedStart = (row: { startEra?: string | null; startYear?: number | null; startMonth?: number | null; startDay?: number | null }) =>
  row.startYear == null
    ? Number.POSITIVE_INFINITY
    : (row.startEra === 'BC' ? -row.startYear : row.startYear) * 10000 + (row.startMonth ?? 1) * 100 + (row.startDay ?? 1)

const byStart = <Row extends Parameters<typeof signedStart>[0]>(rows: Row[]) =>
  [...rows].sort((left, right) => signedStart(left) - signedStart(right))

/** 대표 먼저, 그다음 시기 순 */
const primaryFirst = <Row extends Parameters<typeof signedStart>[0] & { isPrimary?: boolean; sortOrder?: number }>(rows: Row[]) =>
  [...rows].sort(
    (left, right) =>
      Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)) ||
      (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
      signedStart(left) - signedStart(right),
  )

function personName(person: PartyMembershipListRow['person']): string {
  if (!person) return '—'
  return getPersonDisplayName({
    name: person.name,
    surname: person.surname,
    middleName: person.middleName,
    nameDisplayOrder: person.nameDisplayOrder ?? null,
    country: person.country ?? null,
  })
}

function organizationName(link: PartyOrganizationLinkDto): string {
  return link.organization?.name ?? link.militaryUnit?.name ?? '—'
}

function organizationSub(link: PartyOrganizationLinkDto): string | null {
  const original = link.organization?.localName ?? link.militaryUnit?.nameEn ?? null
  const short = link.organization?.shortName ?? null
  return [original, short].filter(Boolean).join(', ') || null
}

/** 같은 지표의 최신 시점 하나 — 채택(PREFERRED)·무구분을 대안보다 먼저 */
function latestObservation(observations: Observation[], metricKey: string): Observation | null {
  const rows = observations.filter(
    (observation) => observation.metric.key === metricKey && observation.estimateRole !== 'ALTERNATIVE',
  )
  if (rows.length === 0) return null
  const key = (observation: Observation) =>
    observation.start == null
      ? Number.NEGATIVE_INFINITY
      : (observation.start.era === 'BC' ? -observation.start.year : observation.start.year) * 10000 +
        (observation.start.month ?? 1) * 100 +
        (observation.start.day ?? 1)
  return rows.reduce((best, row) => (key(row) > key(best) ? row : best))
}

function observationWhen(observation: Observation): string | null {
  if (!observation.start) return null
  const { era, year, month, day } = observation.start
  const pad = (value: number) => String(value).padStart(2, '0')
  const partial = `${era === 'BC' ? '-' : ''}${String(year).padStart(4, '0')}${month != null ? `-${pad(month)}${day != null ? `-${pad(day)}` : ''}` : ''}`
  return formatPartialDate(partial) || null
}

export function buildPartyInfobox(input: PartyInfoboxInput): PartyInfobox {
  const { party } = input
  const rows: InfoboxRow[] = []
  const push = (key: string, label: string, items: InfoboxItem[], inline = false) => {
    const filled = items.filter((item) => item.text.trim())
    if (filled.length > 0) rows.push({ key, label, items: filled, ...(inline ? { inline: true } : {}) })
  }

  /* 머리 — 대표 이름 + 원어·번역 */
  const translations = primaryFirst(input.aliases.filter((alias) => alias.type === 'TRANSLATION'))
  const subtitles = [
    party.localName?.trim() && party.shortName?.trim() ? `${party.localName.trim()} (${party.shortName.trim()})` : party.localName?.trim(),
    translations[0]?.name,
  ].filter((text): text is string => Boolean(text && text.trim()))

  /* 표지 — 대표 당기·로고를 앞에(그 밖의 상징은 섹션에서) */
  const imageOrder: PartySymbolDto['kind'][] = ['FLAG', 'LOGO', 'EMBLEM', 'BALLOT_SYMBOL']
  const images: InfoboxImage[] = []
  for (const kind of imageOrder) {
    const symbol = primaryFirst(input.symbols.filter((row) => row.kind === kind))[0]
    if (symbol?.imageUrl) images.push({ key: symbol.id, url: symbol.imageUrl, caption: symbol.caption ?? '' })
  }

  /* 다른 이름 — 통칭·이전 공식명·약어 */
  push(
    'aliases',
    '다른 이름',
    primaryFirst(input.aliases.filter((alias) => alias.type !== 'TRANSLATION' && alias.name !== party.name && alias.name !== party.localName)).map(
      (alias) => ({ text: alias.name, when: formatPeriodLabel(alias) || null }),
    ),
  )

  for (const [kind, label] of [
    ['MOTTO', '표어'],
    ['ANTHEM', '당가'],
    ['SALUTE', '경례'],
  ] as const) {
    push(
      kind.toLowerCase(),
      label,
      primaryFirst(input.expressions.filter((row) => row.kind === kind)).map((row) => ({
        text: row.originalText,
        sub: row.translation ?? null,
        when: formatPeriodLabel(row) || null,
      })),
    )
  }

  /* 존속 */
  const founded = formatPartialDate(party.founded)
  const dissolved = formatPartialDate(party.dissolved)
  if (founded) push('founded', '창당', [{ text: founded }])
  if (dissolved) push('dissolved', '해산', [{ text: dissolved }])

  /* 계보 */
  if (input.lineage) {
    push(
      'predecessors',
      '전신',
      input.lineage.predecessors.map((row) => ({
        text: row.fromParty?.name ?? '—',
        partyId: row.fromPartyId,
        when: formatPartialDate(transitionEffectiveOn(row)) || null,
      })),
    )
    push(
      'successors',
      '후신',
      input.lineage.successors.map((row) => ({
        text: row.toParty?.name ?? '—',
        partyId: row.toPartyId,
        when: formatPartialDate(transitionEffectiveOn(row)) || null,
      })),
    )
  }

  /* 지도부 — 창립자, 당수·대표, 서기장 (당원 소속이 정본) */
  push(
    'founders',
    '창립자',
    input.memberships.filter((row) => row.isFounder).map((row) => ({ text: personName(row.person), personId: row.personId })),
  )
  for (const officeKind of ['LEADER', 'CHAIR', 'SECRETARY_GENERAL'] as const) {
    push(
      `office-${officeKind}`,
      labelPartyOfficeKind(officeKind),
      byStart(input.memberships.filter((row) => row.officeKind === officeKind)).map((row) => ({
        text: personName(row.person),
        personId: row.personId,
        sub: row.roleTitle && row.roleTitle !== labelPartyOfficeKind(officeKind) ? row.roleTitle : null,
        when: formatPeriodLabel(row) || null,
      })),
    )
  }

  /* 이념·스펙트럼 */
  push(
    'ideologies',
    '이념',
    primaryFirst(input.ideologies).map((link) => ({ text: link.ideology.name })),
    true,
  )
  const periods = byStart(input.positionPeriods)
  push(
    'position',
    '스펙트럼',
    periods.length > 1
      ? periods.map((row) => ({ text: POLITICAL_POSITION_LABEL[row.position], when: formatPeriodLabel(row) || null }))
      : party.position
        ? [{ text: POLITICAL_POSITION_LABEL[party.position as PoliticalPosition] ?? party.position }]
        : [],
  )

  /* 법적 지위 — 마지막 행이 지금(또는 해산 직전) */
  push(
    'legal',
    '법적 지위',
    byStart(input.legalStatuses).map((row) => ({
      text: labelPoliticalPartyLegalStatus(row.status),
      when: formatPeriodLabel(row) || null,
    })),
  )

  /* 당사 */
  push(
    'headquarters',
    '당사',
    byStart(input.headquarters).map((row) => ({
      text: [row.city?.name, row.buildingName].filter(Boolean).join(' ') || row.address || '—',
      when: input.headquarters.length > 1 ? formatPeriodLabel(row) || null : null,
    })),
  )

  /* 산하·연계 조직 — 역할별 한 줄, 같은 역할 여러 기(期)는 시기 순 */
  const shownRoles = new Set<PartyOrganizationRole>()
  for (const { role, label } of ORGANIZATION_ROWS) {
    shownRoles.add(role)
    const links = byStart(input.organizations.filter((link) => link.role === role))
    push(
      `org-${role}`,
      label,
      links.map((link) => ({
        text: organizationName(link),
        sub: organizationSub(link),
        when: links.length > 1 || role === 'YOUTH_WING' ? formatPeriodLabel(link) || null : null,
      })),
    )
  }
  push(
    'org-other',
    '기타 조직',
    byStart(input.organizations.filter((link) => !shownRoles.has(link.role))).map((link) => ({
      text: organizationName(link),
      sub: labelPartyOrganizationRole(link.role),
    })),
  )

  /* 관계 */
  const sisters = input.links.filter((link) => link.kind === 'SISTER_PARTY')
  push('sisters', '자매 정당', sisters.map((link) => ({ text: link.otherParty.name, partyId: link.otherPartyId })))

  /* 수치 — 최신 채택값 */
  const members = latestObservation(input.observations, 'party.members')
  if (members) push('members', '당원', [{ text: formatObservationExact(members), when: observationWhen(members) }])
  const seats = latestObservation(input.observations, 'party.seats')
  if (seats) {
    push('seats', '의석', [
      { text: formatObservationExact(seats), sub: seats.qualifier ?? null, when: observationWhen(seats) },
    ])
  }

  const palette = (party.colorPalette?.length ? party.colorPalette : party.brandColor ? [party.brandColor] : []).filter(Boolean)

  return { title: party.name, subtitles, images, palette, rows }
}
