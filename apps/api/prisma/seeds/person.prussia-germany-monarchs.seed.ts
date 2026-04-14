import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

// 역사 국가 이름 → id 조회 헬퍼
async function getHistoricalCountryId(
  prisma: PrismaService,
  name: string,
): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}

// 관직 정의 이름 → id 조회 헬퍼
async function getPositionDefId(
  prisma: PrismaService,
  title: string,
): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}

interface MonarchEntry {
  // 인물 기본 정보
  name: string           // 이름 (한글)
  surname: string        // 성 (한글)
  originalName: string   // 원어 이름
  regnalName?: string    // 왕호 (예: Friedrich Wilhelm)
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string

  // 재위 기록 목록
  reigns: {
    countryName: string        // 역사 국가명
    positionTitle: string      // 관직명 (GovernmentPositionDefinition.title)
    regnalNumber?: number      // 대수
    startYear: number
    startMonth: number
    startDay?: number
    endYear?: number
    endMonth?: number
    endDay?: number
    appointmentMethod: AppointmentMethod
    endReason?: TenureEndReason
    endReasonDetail?: string
    notes?: string
  }[]
}

const MONARCHS: MonarchEntry[] = [
  // ── 0. 프리드리히 빌헬름 2세 ──────────────────────────────────────
  {
    name: '프리드리히 빌헬름',
    surname: '호엔촐레른',
    originalName: 'Friedrich Wilhelm II of Prussia',
    regnalName: 'Friedrich Wilhelm',
    biography:
      '프로이센 왕국의 국왕(1786-1797). 프리드리히 대왕(Friedrich II)의 조카로 즉위했다. 반프랑스 연합에 참여했으나 성과를 거두지 못했으며, 폴란드 2·3차 분할에 참여해 영토를 확장했다. 낭비벽과 사생활 문제로 비판받았으나 음악과 예술을 후원했다. 프리드리히 빌헬름 3세의 아버지.',
    birthYear: 1744, birthMonth: 9, birthDay: 25,
    deathYear: 1797, deathMonth: 11, deathDay: 16,
    gender: 'MALE',
    reigns: [
      {
        countryName: '프로이센 왕국',
        positionTitle: '국왕',
        regnalNumber: 2,
        startYear: 1786, startMonth: 8, startDay: 17,
        endYear: 1797, endMonth: 11, endDay: 16,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '프리드리히 대왕(Friedrich II) 사망 후 즉위. 폴란드 2·3차 분할 참여로 영토 확장. 프리드리히 빌헬름 3세의 아버지.',
      },
    ],
  },

  // ── 1. 프리드리히 빌헬름 3세 ──────────────────────────────────────
  {
    name: '프리드리히 빌헬름',
    surname: '호엔촐레른',
    originalName: 'Friedrich Wilhelm III',
    regnalName: 'Friedrich Wilhelm',
    biography:
      '프로이센 왕국의 국왕(1797-1840). 나폴레옹 전쟁에서 패배해 굴욕적인 틸지트 조약을 맺었으나, 이후 군사·행정 개혁(샤른호르스트, 슈타인-하르덴베르크 개혁)을 통해 국가를 재건했다. 해방전쟁(1813-1815)에서 반나폴레옹 연합에 합류해 승리를 거뒀다.',
    birthYear: 1770, birthMonth: 8, birthDay: 3,
    deathYear: 1840, deathMonth: 6, deathDay: 7,
    gender: 'MALE',
    reigns: [
      {
        countryName: '프로이센 왕국',
        positionTitle: '국왕',
        regnalNumber: 3,
        startYear: 1797, startMonth: 11, startDay: 16,
        endYear: 1840, endMonth: 6, endDay: 7,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '재위 3번째 프로이센 왕. 나폴레옹 전쟁과 해방전쟁을 거친 개혁 군주.',
      },
    ],
  },

  // ── 2. 프리드리히 빌헬름 4세 ──────────────────────────────────────
  {
    name: '프리드리히 빌헬름',
    surname: '호엔촐레른',
    originalName: 'Friedrich Wilhelm IV',
    regnalName: 'Friedrich Wilhelm',
    biography:
      '프로이센 왕국의 국왕(1840-1861). 낭만주의적 보수주의자로 1848년 혁명 당시 프랑크푸르트 의회가 제안한 통일 독일 황제 자리를 거부했다("혁명의 왕관은 받지 않겠다"). 말년에 정신질환을 앓아 동생 빌헬름 1세가 섭정을 맡았다.',
    birthYear: 1795, birthMonth: 10, birthDay: 15,
    deathYear: 1861, deathMonth: 1, deathDay: 2,
    gender: 'MALE',
    reigns: [
      {
        countryName: '프로이센 왕국',
        positionTitle: '국왕',
        regnalNumber: 4,
        startYear: 1840, startMonth: 6, startDay: 7,
        endYear: 1861, endMonth: 1, endDay: 2,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '1848년 혁명에서 황제 자리 거부. 말년 정신질환으로 빌헬름 1세가 섭정.',
      },
    ],
  },

  // ── 3. 빌헬름 1세 (프로이센 왕 + 독일 황제) ──────────────────────
  {
    name: '빌헬름',
    surname: '호엔촐레른',
    originalName: 'Wilhelm I',
    regnalName: 'Wilhelm',
    biography:
      '프로이센 왕국의 국왕(1861-1888)이자 독일 제국 초대 황제(1871-1888). 재상 비스마르크와 함께 덴마크 전쟁(1864), 프로이센-오스트리아 전쟁(1866), 프로이센-프랑스 전쟁(1870-71)을 차례로 승리로 이끌며 독일 통일을 완성했다. 1871년 1월 18일 베르사유 궁전 거울의 방에서 황제로 선포되었다.',
    birthYear: 1797, birthMonth: 3, birthDay: 22,
    deathYear: 1888, deathMonth: 3, deathDay: 9,
    gender: 'MALE',
    reigns: [
      {
        countryName: '프로이센 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1861, startMonth: 1, startDay: 2,
        endYear: 1888, endMonth: 3, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '형 프리드리히 빌헬름 4세의 섭정(1858)을 거쳐 즉위.',
      },
      {
        countryName: '북독일 연방',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1867, startMonth: 7, startDay: 1,
        endYear: 1871, endMonth: 1, endDay: 18,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.SUCCESSION_TRANSFER,
        notes: '북독일 연방 의장 겸임.',
      },
      {
        countryName: '독일 제국',
        positionTitle: '황제',
        regnalNumber: 1,
        startYear: 1871, startMonth: 1, startDay: 18,
        endYear: 1888, endMonth: 3, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '베르사유 거울의 방에서 독일 황제로 선포. 비스마르크를 재상으로 임명해 독일 통일 완성.',
      },
    ],
  },

  // ── 4. 프리드리히 3세 (99일 황제) ────────────────────────────────
  {
    name: '프리드리히',
    surname: '호엔촐레른',
    originalName: 'Friedrich III',
    regnalName: 'Friedrich',
    biography:
      '독일 제국 제2대 황제이자 프로이센 왕국의 국왕(1888). 자유주의적 성향의 황제로 영국 빅토리아 여왕의 딸 빅토리아 공주와 결혼했다. 즉위 당시 이미 후두암 말기였으며 단 99일 만에 사망해 "99일 황제"로 불린다.',
    birthYear: 1831, birthMonth: 10, birthDay: 18,
    deathYear: 1888, deathMonth: 6, deathDay: 15,
    gender: 'MALE',
    reigns: [
      {
        countryName: '프로이센 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1888, startMonth: 3, startDay: 9,
        endYear: 1888, endMonth: 6, endDay: 15,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '후두암으로 99일 재위.',
      },
      {
        countryName: '독일 제국',
        positionTitle: '황제',
        regnalNumber: 2,
        startYear: 1888, startMonth: 3, startDay: 9,
        endYear: 1888, endMonth: 6, endDay: 15,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '99일 천하. 자유주의 개혁 의지가 있었으나 실현하지 못하고 사망.',
      },
    ],
  },

  // ── 5. 빌헬름 2세 ─────────────────────────────────────────────────
  {
    name: '빌헬름',
    surname: '호엔촐레른',
    originalName: 'Wilhelm II',
    regnalName: 'Wilhelm',
    biography:
      '독일 제국 마지막 황제이자 프로이센 왕국의 국왕(1888-1918). 비스마르크를 해임하고 독자적인 "신항로(Neuer Kurs)" 정책을 추진해 영국·프랑스·러시아와의 갈등을 심화시켰다. 1차 세계대전 패전 후 1918년 11월 혁명으로 퇴위, 네덜란드로 망명해 1941년 도른에서 사망했다.',
    birthYear: 1859, birthMonth: 1, birthDay: 27,
    deathYear: 1941, deathMonth: 6, deathDay: 4,
    gender: 'MALE',
    reigns: [
      {
        countryName: '프로이센 왕국',
        positionTitle: '국왕',
        regnalNumber: 2,
        startYear: 1888, startMonth: 6, startDay: 15,
        endYear: 1918, endMonth: 11, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '1918년 11월 혁명으로 퇴위. 네덜란드로 망명.',
      },
      {
        countryName: '독일 제국',
        positionTitle: '황제',
        regnalNumber: 3,
        startYear: 1888, startMonth: 6, startDay: 15,
        endYear: 1918, endMonth: 11, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '1차 세계대전 패전과 11월 혁명으로 퇴위. 독일 제국 마지막 황제.',
        notes: '비스마르크 해임(1890), 세계정책 추진, 모로코 위기, 1차 대전 참전.',
      },
    ],
  },
]

export async function seedPrussiaGermanyMonarchs(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n👑 프로이센·독일 제국 군주 시딩 시작...')

  for (const m of MONARCHS) {
    // ── 인물 생성 또는 업데이트 ────────────────────────────────────
    const existing = await prisma.person.findFirst({
      where: { originalName: m.originalName },
    })

    let personId: string

    const birthDate = new Date(m.birthYear, m.birthMonth - 1, m.birthDay)
    const deathDate = m.deathYear
      ? new Date(m.deathYear, (m.deathMonth ?? 1) - 1, m.deathDay ?? 1)
      : undefined

    if (existing) {
      personId = existing.id
      console.log(`  ⏭️  ${m.originalName}`)
    } else {
      const created = await prisma.person.create({
        data: {
          name: m.name,
          surname: m.surname,
          originalName: m.originalName,
          regnalName: m.regnalName,
          biography: m.biography,
          birthDate,
          birthEra: 'AD',
          deathDate,
          deathEra: 'AD',
          gender: m.gender,
          nameDisplayOrder: 'western',
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`  ✅ ${m.originalName}`)
    }

    // ── 재위 기록 생성 ─────────────────────────────────────────────
    for (const r of m.reigns) {
      const historicalCountryId = await getHistoricalCountryId(prisma, r.countryName)
      if (!historicalCountryId) {
        console.warn(`    ⚠️  역사 국가 없음: ${r.countryName}`)
        continue
      }

      const positionDefId = await getPositionDefId(prisma, r.positionTitle)

      const startDate = new Date(r.startYear, r.startMonth - 1, r.startDay ?? 1)
      const endDate = r.endYear
        ? new Date(r.endYear, (r.endMonth ?? 1) - 1, r.endDay ?? 1)
        : undefined

      const existingReign = await prisma.sovereignReign.findFirst({
        where: {
          personId,
          historicalCountryId,
          regnalNumber: r.regnalNumber,
        },
      })

      if (existingReign) {
        console.log(`    ⏭️  재위: ${r.countryName} ${r.positionTitle} (${r.startYear}-${r.endYear ?? '현재'})`)
      } else {
        await prisma.sovereignReign.create({
          data: {
            personId,
            historicalCountryId,
            positionDefinitionId: positionDefId,
            regnalNumber: r.regnalNumber,
            startDate,
            endDate,
            appointmentMethod: r.appointmentMethod,
            endReason: r.endReason,
            endReasonDetail: r.endReasonDetail,
            notes: r.notes,
            accountId: ACCOUNT_ID,
          },
        })
        console.log(`    ✅ 재위: ${r.countryName} ${r.positionTitle} (${r.startYear}-${r.endYear ?? '현재'})`)
      }
    }
  }

  console.log(`\n✅ 프로이센·독일 제국 군주 시딩 완료 (${MONARCHS.length}명)\n`)
}
