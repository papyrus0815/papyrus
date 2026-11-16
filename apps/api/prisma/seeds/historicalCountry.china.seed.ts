import { Era, HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 중국 계열 역사국가 — 중화민국이 땅을 옮긴 것을 **행 분할 없이** 연결 기간으로 나타낸다.
 *
 * ## 왜 중화민국을 한 행으로 두나
 * 1949년은 정권 교체가 아니라 영토 교체다. 1947년 헌법과 총통 대수(1948 장제스 제1대 → 현직까지 통산)가
 * 이어지는 같은 나라라, 행을 '대륙 시기'·'대만 시기'로 나누면 대수와 국적이 끊긴다.
 * 이 코퍼스가 행을 나누는 기준도 정권 교체(REGIME_CHANGE)뿐이다(불가리아 공국/왕국 등).
 *
 * ## 대신 연결에 기간을 둔다 (historical_country_modern_country.start_* / end_*)
 * - 중국(CN): 1912-01 ~ 1949-12 — 12월 7일 행정원 타이베이 이전 결정, 10일 장제스 청두 이륙
 * - 대만(TW): 1945-10 ~ (현재) — 10월 25일 일본으로부터 대만 접수(광복절). 1945~49년은 두 땅을 함께 다스렸다
 *   (진먼·마쭈는 푸젠성이지만 ISO 3166 TW 범위라 대만 쪽에 든다. 하이난·저우산은 1950-05까지 버텼으나
 *    정부 이전 시점을 대륙 연결의 끝으로 잡는다)
 *
 * ## 소유
 * - 중화민국 행 자체는 `event.prc-founding.seed.ts`가 만든다. 이 시드는 없으면 같은 값으로 만들고,
 *   있으면 비어 있는 칸만 채운다(사용자 UI 편집 보호). 옛 시드 설명(메타 문장 포함)일 때만 설명을 바꾼다.
 * - 청나라는 아편전쟁 시드가 만든다 — 여기선 계승 관계만 건다(relations 시드).
 */

interface HistoricalCountryEntry {
  name: string
  enName?: string
  nameOrigin?: string
  description?: string
  startEra?: Era
  startYear?: number
  startMonth?: number
  startDay?: number
  endEra?: Era
  endYear?: number
  endMonth?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
}

interface PeriodLinkEntry {
  historicalCountryName: string
  isoCode: string
  startYear?: number
  startMonth?: number
  endYear?: number
  endMonth?: number
}

const ROC_NAME = '중화민국'
const PRC_NAME = '중화인민공화국'

/** `event.prc-founding.seed.ts`가 처음 넣은 설명 — 이 글 그대로일 때만 새 설명으로 바꾼다 */
const ROC_LEGACY_DESCRIPTION =
  '1912-01-01 신해혁명으로 청을 무너뜨리고 쑨원이 난징 임시 대총통으로 수립한 동아시아 최초의 공화국. 위안스카이 시기 → 군벌 시기 → 1928 국민정부 통일 → 1937-1945 항일전쟁 → 1946-1949 국공내전을 거쳐 1949-12-10 장제스가 청두를 떠나 대만으로 이동, 정부 본체는 타이베이로 이전. 본 시드는 1949 PRC 수립 시점의 적대 정부로서 등록.'

const ENTRIES: HistoricalCountryEntry[] = [
  {
    name: ROC_NAME,
    enName: 'Republic of China',
    nameOrigin:
      '"중화(中華)"는 중원 문명을 일컫던 "중국"과 "화하(華夏)"를 합친 말이고, "민국(民國)"은 군주의 나라에 맞선 ' +
      '"국민의 나라"라는 뜻이다. 1905년 쑨원이 이끈 중국동맹회의 강령 "구제달로(驅除韃虜)·회복중화(恢復中華)·' +
      '창립민국(創立民國)·평균지권(平均地權)"에서 국호가 나왔다.',
    description:
      '1912년 1월 1일 신해혁명으로 쑨원이 난징에서 임시 대총통에 취임하며 세운 공화국. 2월 12일 청 선통제의 ' +
      '퇴위 조서로 주권을 넘겨받았다. 위안스카이의 베이양 정부와 군벌 할거를 거쳐 1928년 국민정부가 북벌로 통일했고, ' +
      '1937~1945년 항일전쟁 끝에 1945년 10월 25일 일본으로부터 대만을 넘겨받았다. 1946~1949년 국공내전에서 패해 ' +
      '1949년 12월 정부를 타이베이로 옮긴 뒤로는 대만·펑후·진먼·마쭈를 다스리며 오늘에 이른다. ' +
      '1947년 헌법과 총통 대수는 정부 이전 전후로 그대로 이어진다.',
    startEra: 'AD', startYear: 1912, startMonth: 1, startDay: 1,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 32.0603, longitude: 118.7969, // 건국 수도 난징
  },
  {
    name: PRC_NAME,
    enName: "People's Republic of China",
    nameOrigin:
      '1949년 9월 중국 인민정치협상회의가 국호를 정했다. "인민공화국"은 소련·동유럽 인민민주주의 국가들의 국호 관례를 ' +
      '따른 것이고, "중화"는 중화민국에서 이어받았다.',
    description:
      '1949년 10월 1일 마오쩌둥이 베이징 톈안먼에서 수립을 선포한 사회주의 국가. 국공내전에서 이긴 중국 공산당이 ' +
      '대륙을 장악하며 세웠고, 1950년 5월 하이난섬·저우산 군도까지 손에 넣었다. 1971년 유엔 총회 결의 2758호로 ' +
      '중국 대표권을 중화민국으로부터 넘겨받았다. 대만은 실효 지배한 적이 없다.',
    startEra: 'AD', startYear: 1949, startMonth: 10, startDay: 1,
    stateType: HistoricalStateType.REPUBLIC,
    entityKind: HistoricalEntityKind.STATE,
    latitude: 39.9042, longitude: 116.4074, // 베이징
  },
]

const PERIOD_LINKS: PeriodLinkEntry[] = [
  { historicalCountryName: ROC_NAME, isoCode: 'CN', startYear: 1912, startMonth: 1, endYear: 1949, endMonth: 12 },
  { historicalCountryName: ROC_NAME, isoCode: 'TW', startYear: 1945, startMonth: 10 },
  // 중화인민공화국은 존속 기간 전체가 중국 땅 — 기간을 비운다
  { historicalCountryName: PRC_NAME, isoCode: 'CN' },
]

function hasAnyPeriod(link: {
  startYear: number | null
  startMonth: number | null
  endYear: number | null
  endMonth: number | null
}): boolean {
  return link.startYear != null || link.startMonth != null || link.endYear != null || link.endMonth != null
}

export async function seedChinaHistoricalCountries(prisma: PrismaService): Promise<void> {
  console.log('\n🇨🇳 중국 계열 역사 국가(중화민국·중화인민공화국) 시딩...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' }, select: { id: true } })

  const nameToId = new Map<string, string>()
  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({ where: { name: entry.name } })
    if (!existing) {
      const created = await prisma.historicalCountry.create({
        data: {
          name: entry.name,
          enName: entry.enName,
          nameOrigin: entry.nameOrigin,
          description: entry.description,
          startEra: entry.startEra,
          startYear: entry.startYear,
          startMonth: entry.startMonth,
          startDay: entry.startDay,
          endEra: entry.endEra,
          endYear: entry.endYear,
          endMonth: entry.endMonth,
          stateType: entry.stateType,
          entityKind: entry.entityKind,
          latitude: entry.latitude,
          longitude: entry.longitude,
          accountId: admin?.id,
        },
        select: { id: true },
      })
      nameToId.set(entry.name, created.id)
      console.log(`  ✅ ${entry.name}`)
      continue
    }

    nameToId.set(entry.name, existing.id)
    // 비어 있는 칸만 채운다. 설명은 옛 시드 문구 그대로일 때만 교체(UI 편집 보호)
    const patch: { nameOrigin?: string; description?: string } = {}
    if (existing.nameOrigin == null && entry.nameOrigin) patch.nameOrigin = entry.nameOrigin
    if (existing.description === ROC_LEGACY_DESCRIPTION && entry.description) {
      patch.description = entry.description
    }
    if (Object.keys(patch).length > 0) {
      await prisma.historicalCountry.update({ where: { id: existing.id }, data: patch })
      console.log(`  🩹 ${entry.name} — ${Object.keys(patch).join('·')} 보강`)
    } else {
      console.log(`  ⏭️  ${entry.name}`)
    }
  }

  // ── 현대 국가 연결 + 기간 ─────────────────────────────────────────
  for (const link of PERIOD_LINKS) {
    const historicalCountryId = nameToId.get(link.historicalCountryName)
    const modern = await prisma.country.findFirst({ where: { isoCode: link.isoCode }, select: { id: true } })
    if (!historicalCountryId || !modern) {
      console.warn(`  ⚠️  연결 건너뜀: ${link.historicalCountryName} ↔ ${link.isoCode} (현대 국가 미등록)`)
      continue
    }
    const period = {
      startEra: link.startYear != null ? Era.AD : null,
      startYear: link.startYear ?? null,
      startMonth: link.startMonth ?? null,
      endEra: link.endYear != null ? Era.AD : null,
      endYear: link.endYear ?? null,
      endMonth: link.endMonth ?? null,
    }
    const label = `${link.historicalCountryName} ↔ ${link.isoCode}`
    const existingLink = await prisma.historicalCountryModernCountry.findFirst({
      where: { historicalCountryId, modernCountryId: modern.id },
    })
    if (!existingLink) {
      await prisma.historicalCountryModernCountry.create({
        data: { historicalCountryId, modernCountryId: modern.id, ...period },
      })
      console.log(`  🔗 ${label} 연결`)
    } else if (!hasAnyPeriod(existingLink) && hasAnyPeriod(period)) {
      // 기간이 비어 있을 때만 채운다 — 이미 누가 적어 둔 기간은 그대로 둔다
      await prisma.historicalCountryModernCountry.update({ where: { id: existingLink.id }, data: period })
      console.log(`  🩹 ${label} 기간 보강`)
    } else {
      console.log(`  ♻️  ${label}`)
    }
  }

  console.log('✅ 중국 계열 역사 국가 시딩 완료\n')
}
