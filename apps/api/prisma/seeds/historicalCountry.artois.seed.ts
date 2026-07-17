/**
 * 아르투아 백국(County of Artois) 역사 국가 시드.
 *
 *   프랑스 북부 아라스(Arras)를 중심으로 한 중세·근세의 백작령.
 *   1180년 이자벨 드 에노가 프랑스 왕 필리프 2세와 혼인하며 지참령으로 왕가에 들어왔고,
 *   1226년 루이 8세의 유언에 따라 아들 로베르 1세에게 아파나주로 분봉되어(1237 정식 수여)
 *   카페계 아르투아 백작 가문이 성립. 1659년 피레네 조약·1678년 네이메헌 조약으로 프랑스에 병합.
 *
 *   ⚠️ stateType: HistoricalStateType enum에 COUNTY(백국)가 없어 최근접값 PRINCIPALITY 사용.
 *   ⚠️ 멱등: name으로 findFirst 후 미존재 시에만 create. 모던 국가(FR) 링크도 중복 방지.
 */
import { HistoricalEntityKind, HistoricalStateType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

interface HistoricalCountryEntry {
  name: string
  enName?: string
  description?: string
  startEra?: 'BC' | 'AD'
  startYear?: number
  endEra?: 'BC' | 'AD'
  endYear?: number
  stateType: HistoricalStateType
  entityKind?: HistoricalEntityKind
  latitude?: number
  longitude?: number
  linkToIsoCodes: string[]
}

const ENTRIES: HistoricalCountryEntry[] = [
  {
    name: '아르투아 백국',
    enName: 'County of Artois',
    description:
      '프랑스 북부 아라스(Arras)를 중심으로 한 중세·근세의 백작령. 본래 플랑드르 백국의 일부였으나, ' +
      '1180년 이자벨 드 에노(Isabelle de Hainaut)가 프랑스 왕 필리프 2세(존엄왕)와 혼인하면서 ' +
      '지참령으로 프랑스 왕가에 들어왔고, 1191년 그녀의 사후 아들 루이(후일 루이 8세)에게 상속되었다. ' +
      '1226년 루이 8세의 유언에 따라 그의 아들 로베르 1세에게 아파나주(apanage)로 분봉되어 ' +
      '(1237년 정식 수여) 카페계 아르투아 백작 가문이 성립했다. 이후 로베르 2세와 마오(Mahaut) ' +
      '여백작을 거쳐 부르고뉴 공가·발루아-부르고뉴 가문·합스부르크 가문으로 상속되었으며, ' +
      '1659년 피레네 조약과 1678년 네이메헌 조약으로 프랑스에 최종 병합되었다. 이후 "아르투아 백작" ' +
      '칭호는 영토 없는 프랑스 왕족의 명예 칭호(예: 후일 샤를 10세)로 존속했다.',
    startEra: 'AD',
    startYear: 1237,
    endEra: 'AD',
    endYear: 1659, // 피레네 조약으로 프랑스에 대부분 병합, 나머지는 1678 네이메헌 조약
    stateType: HistoricalStateType.PRINCIPALITY, // enum에 COUNTY 없음 — 최근접값
    entityKind: HistoricalEntityKind.STATE,
    latitude: 50.29,
    longitude: 2.78, // 아라스(Arras)
    linkToIsoCodes: ['FR'],
  },
]

export async function seedArtoisHistoricalCountry(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🏰 아르투아 백국 역사 국가 시딩 시작...')

  const isoToModernId = new Map<string, string>()
  const allIsoCodes = new Set(ENTRIES.flatMap((e) => e.linkToIsoCodes))
  for (const isoCode of allIsoCodes) {
    const country = await prisma.country.findFirst({
      where: { isoCode },
      select: { id: true },
    })
    if (country) {
      isoToModernId.set(isoCode, country.id)
    } else {
      console.warn(`  ⚠️  현대 국가를 찾을 수 없음: ${isoCode}`)
    }
  }

  for (const entry of ENTRIES) {
    const existing = await prisma.historicalCountry.findFirst({
      where: { name: entry.name },
    })

    let id: string

    if (existing) {
      id = existing.id
      console.log(`  ⏭️  ${entry.name} (이미 존재)`)
    } else {
      const created = await prisma.historicalCountry.create({
        data: {
          name: entry.name,
          enName: entry.enName,
          description: entry.description,
          startEra: entry.startEra as any,
          startYear: entry.startYear,
          endEra: entry.endEra as any,
          endYear: entry.endYear,
          stateType: entry.stateType,
          entityKind: entry.entityKind,
          latitude: entry.latitude,
          longitude: entry.longitude,
          accountId: ACCOUNT_ID,
        },
      })
      id = created.id
      console.log(`  ✅ ${entry.name}`)
    }

    for (const isoCode of entry.linkToIsoCodes) {
      const modernCountryId = isoToModernId.get(isoCode)
      if (!modernCountryId) continue

      const linkExists = await prisma.historicalCountryModernCountry.findFirst({
        where: { historicalCountryId: id, modernCountryId },
      })
      if (!linkExists) {
        await prisma.historicalCountryModernCountry.create({
          data: { historicalCountryId: id, modernCountryId },
        })
        console.log(`  ✅ 모던 국가 연결: ${isoCode}`)
      } else {
        console.log(`  ⏭️  모던 국가 연결 이미 존재: ${isoCode}`)
      }
    }
  }

  console.log(`✅ 아르투아 백국 시딩 완료\n`)
}
