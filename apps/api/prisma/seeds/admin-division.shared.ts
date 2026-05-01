/**
 * 행정구역(AdministrativeDivision) + 레벨 설정(CountryAdminDivisionConfig) 공용 시드 헬퍼.
 *
 * AdministrativeDivision은 adminDivisionId(=CountryAdminDivisionConfig FK)가 필수이므로
 * 국가별 레벨 정의를 먼저 만들고, 그 ID를 참조해서 트리를 쌓는다.
 */
import { PrismaService } from '../prisma.service'

export interface AdminLevelConfig {
  level: number
  label: string
  description?: string
}

export interface AdminDivisionItem {
  name: string
  localName?: string
  /** 부모 명칭 — 같은 국가 내 (level-1 이상에서만 의미 있음) */
  parentName?: string | null
  /** 이 항목이 속한 레벨 (1=최상위) */
  level: number
}

export interface AdminDivisionSeedInput {
  isoCode: string
  countryNameKo: string
  /** 국가별 레벨 정의 (예: [{level:1, label:'광역시도'}, {level:2, label:'시군구'}]) */
  levels: AdminLevelConfig[]
  divisions: AdminDivisionItem[]
}

/**
 * 한 국가의 행정구역을 idempotent하게 시딩.
 * - CountryAdminDivisionConfig: (countryId, divisionLevel) 기준 upsert
 * - AdministrativeDivision: (countryId, name) 기준 중복 skip
 *
 * `divisions`는 부모가 자식보다 먼저 오도록 정렬되어 있어야 한다 (parentName 조회를 위해).
 */
export async function seedAdminDivisionsForCountry(
  prisma: PrismaService,
  input: AdminDivisionSeedInput,
): Promise<void> {
  console.log(
    `\n🗺  ${input.countryNameKo} 행정구역 시딩 시작 (level ${input.levels.length}개)...`,
  )

  const country = await prisma.country.findFirst({
    where: { isoCode: input.isoCode },
    select: { id: true },
  })
  if (!country) {
    console.warn(
      `  ⚠️  ${input.countryNameKo}(${input.isoCode}) Country 없음 — 시딩 건너뜀`,
    )
    return
  }

  // 1. 레벨 정의 upsert
  const configByLevel = new Map<number, string>()
  for (const lvl of input.levels) {
    const existing = await prisma.countryAdminDivisionConfig.findFirst({
      where: { countryId: country.id, divisionLevel: lvl.level },
      select: { id: true },
    })
    if (existing) {
      configByLevel.set(lvl.level, existing.id)
    } else {
      const created = await prisma.countryAdminDivisionConfig.create({
        data: {
          countryId: country.id,
          divisionLevel: lvl.level,
          divisionLabel: lvl.label,
          description: lvl.description ?? null,
        },
      })
      configByLevel.set(lvl.level, created.id)
    }
  }

  // 2. 기존 division 조회 (이름 → id 매핑, parentName 해석용)
  const existing = await prisma.administrativeDivision.findMany({
    where: { countryId: country.id },
    select: { id: true, name: true },
  })
  const idByName = new Map<string, string>(existing.map((d) => [d.name, d.id]))

  let created = 0
  let skipped = 0
  for (const item of input.divisions) {
    if (idByName.has(item.name)) {
      skipped++
      continue
    }
    const adminDivisionId = configByLevel.get(item.level)
    if (!adminDivisionId) {
      console.warn(
        `  ⚠️  ${item.name}: level ${item.level} 설정이 없어 건너뜀`,
      )
      continue
    }
    const parentId = item.parentName
      ? (idByName.get(item.parentName) ?? null)
      : null
    if (item.parentName && !parentId) {
      console.warn(
        `  ⚠️  ${item.name}: 부모 "${item.parentName}" 미존재 — 루트로 등록`,
      )
    }

    const row = await prisma.administrativeDivision.create({
      data: {
        countryId: country.id,
        adminDivisionId,
        parentId,
        name: item.name,
        localName: item.localName ?? null,
      },
    })
    idByName.set(item.name, row.id)
    created++
  }
  console.log(
    `  ✅ AdministrativeDivision: 신규 ${created}건 / 기존 ${skipped}건 (총 ${idByName.size}건)`,
  )
}
