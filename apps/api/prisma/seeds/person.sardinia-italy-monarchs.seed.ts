import { AppointmentMethod, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'

async function getHistoricalCountryId(
  prisma: PrismaService,
  name: string,
): Promise<string | null> {
  const c = await prisma.historicalCountry.findFirst({ where: { name } })
  return c?.id ?? null
}

async function getPositionDefId(
  prisma: PrismaService,
  title: string,
): Promise<string | null> {
  const d = await prisma.governmentPositionDefinition.findFirst({ where: { title } })
  return d?.id ?? null
}

interface MonarchEntry {
  name: string
  surname: string
  originalName: string
  regnalName?: string
  biography: string
  birthYear: number
  birthMonth: number
  birthDay: number
  deathYear?: number
  deathMonth?: number
  deathDay?: number
  gender: string

  reigns: {
    countryName: string
    positionTitle: string
    regnalNumber?: number
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
  // ── 사르데냐 왕국 ─────────────────────────────────────────────────

  // ── 1. 비토리오 아메데오 2세 ─────────────────────────────────────
  {
    name: '비토리오 아메데오',
    surname: '사보이아',
    originalName: 'Vittorio Amedeo II of Sardinia',
    regnalName: 'Vittorio Amedeo II',
    biography:
      '사르데냐 왕국의 초대 국왕(1720~1730). 본래 사보이아 공작이었으나 스페인 왕위 계승 전쟁(1701~1714)의 결과로 시칠리아를, 이후 1720년 교환 협정으로 사르데냐를 얻어 "사르데냐 국왕" 칭호를 획득했다. 탁월한 외교 수완으로 사보이아 공국의 왕국 격상을 이루어 냈으며, 1730년 아들 카를로 에마누엘레 3세에게 양위한 후 복위를 시도하다 연금 상태에서 사망했다.',
    birthYear: 1666, birthMonth: 5, birthDay: 14,
    deathYear: 1732, deathMonth: 10, deathDay: 31,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1720, startMonth: 8, startDay: 2,
        endYear: 1730, endMonth: 9, endDay: 3,
        appointmentMethod: AppointmentMethod.TREATY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '아들 카를로 에마누엘레 3세에게 양위.',
        notes: '1720년 런던 조약으로 시칠리아를 오스트리아에 넘기고 사르데냐를 받아 사르데냐 왕국 창건.',
      },
    ],
  },

  // ── 2. 카를로 에마누엘레 3세 ─────────────────────────────────────
  {
    name: '카를로 에마누엘레',
    surname: '사보이아',
    originalName: 'Carlo Emanuele III of Sardinia',
    regnalName: 'Carlo Emanuele III',
    biography:
      '사르데냐 왕국의 제2대 국왕(1730~1773). 오스트리아 왕위 계승 전쟁(1740~1748)과 7년 전쟁(1756~1763)에서 능숙한 외교와 군사력으로 알파 사보이아 지역을 확장했다. 세 차례 결혼하였으나 세 왕비 모두 그보다 먼저 세상을 떠났다. 43년간의 긴 치세 동안 군사·행정 개혁을 통해 사르데냐 왕국의 기반을 공고히 다졌다.',
    birthYear: 1701, birthMonth: 4, birthDay: 27,
    deathYear: 1773, deathMonth: 2, deathDay: 20,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1730, startMonth: 9, startDay: 3,
        endYear: 1773, endMonth: 2, endDay: 20,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '오스트리아 왕위 계승 전쟁에서 밀라노 일부 획득. 43년 치세.',
      },
    ],
  },

  // ── 3. 비토리오 아메데오 3세 ─────────────────────────────────────
  {
    name: '비토리오 아메데오',
    surname: '사보이아',
    originalName: 'Vittorio Amedeo III of Sardinia',
    regnalName: 'Vittorio Amedeo III',
    biography:
      '사르데냐 왕국의 제3대 국왕(1773~1796). 프랑스 혁명 이후 제1차 대프랑스 동맹에 참여하였으나 1796년 나폴레옹이 이끄는 프랑스군에 대패하여 사보이아와 니스를 프랑스에 할양하는 파리 휴전 협정을 맺었다. 굴욕적인 패전의 충격으로 같은 해 사망했다.',
    birthYear: 1726, birthMonth: 6, birthDay: 26,
    deathYear: 1796, deathMonth: 10, deathDay: 16,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1773, startMonth: 2, startDay: 20,
        endYear: 1796, endMonth: 10, endDay: 16,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '나폴레옹에게 패배하여 사보이아·니스 할양 후 사망.',
      },
    ],
  },

  // ── 4. 카를로 에마누엘레 4세 ─────────────────────────────────────
  {
    name: '카를로 에마누엘레',
    surname: '사보이아',
    originalName: 'Carlo Emanuele IV of Sardinia',
    regnalName: 'Carlo Emanuele IV',
    biography:
      '사르데냐 왕국의 제4대 국왕(1796~1802). 나폴레옹의 침공으로 피에몬테 본토를 잃고 사르데냐 섬으로 피신하였다. 깊은 신앙심을 지닌 군주로, 1802년 왕비 마리 클로틸드 사망 후 무력감을 느껴 동생 비토리오 에마누엘레 1세에게 양위하고 예수회에 입회하여 로마에서 여생을 보냈다.',
    birthYear: 1751, birthMonth: 5, birthDay: 24,
    deathYear: 1819, deathMonth: 10, deathDay: 6,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1796, startMonth: 10, startDay: 16,
        endYear: 1802, endMonth: 6, endDay: 4,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '왕비 사망 후 동생 비토리오 에마누엘레 1세에게 양위. 이후 예수회 입회.',
        notes: '나폴레옹에 의해 피에몬테 본토를 잃고 사르데냐 섬에서만 통치.',
      },
    ],
  },

  // ── 5. 비토리오 에마누엘레 1세 ───────────────────────────────────
  {
    name: '비토리오 에마누엘레',
    surname: '사보이아',
    originalName: 'Vittorio Emanuele I of Sardinia',
    regnalName: 'Vittorio Emanuele I',
    biography:
      '사르데냐 왕국의 제5대 국왕(1802~1821). 나폴레옹 몰락 후 1814년 빈 회의에서 피에몬테 본토와 제노바를 되찾아 사르데냐 왕국의 영토를 확장하였다. 복고 왕정의 전형으로 자유주의적 개혁을 억압하였다. 1821년 자유주의 혁명(피에몬테 혁명)이 발발하자 진압을 거부하고 조카 카를로 알베르토를 거쳐 카를로 펠리체에게 왕위를 물려주고 퇴위하였다.',
    birthYear: 1759, birthMonth: 7, birthDay: 24,
    deathYear: 1824, deathMonth: 1, deathDay: 10,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1802, startMonth: 6, startDay: 4,
        endYear: 1821, endMonth: 3, endDay: 13,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '1821년 피에몬테 혁명 발발. 진압 거부 후 동생 카를로 펠리체에게 양위.',
        notes: '빈 회의(1814)에서 피에몬테·제노바 회복.',
      },
    ],
  },

  // ── 6. 카를로 펠리체 ─────────────────────────────────────────────
  {
    name: '카를로 펠리체',
    surname: '사보이아',
    originalName: 'Carlo Felice of Sardinia',
    regnalName: 'Carlo Felice',
    biography:
      '사르데냐 왕국의 제6대 국왕(1821~1831). 비토리오 에마누엘레 1세의 동생으로, 형의 퇴위 후 즉위하였다. 오스트리아의 지원을 받아 1821년 자유주의 혁명을 진압하고 반동적 복고 체제를 유지하였다. 자녀가 없어 사보이아-카리냐노 분가의 카를로 알베르토가 후계자로 지명되었다. 예술 후원과 건축에 관심이 많았다.',
    birthYear: 1765, birthMonth: 4, birthDay: 6,
    deathYear: 1831, deathMonth: 4, deathDay: 27,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1821, startMonth: 3, startDay: 13,
        endYear: 1831, endMonth: 4, endDay: 27,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '자녀 없이 사망. 사보이아-카리냐노 분가 카를로 알베르토에게 계승.',
      },
    ],
  },

  // ── 7. 카를로 알베르토 ───────────────────────────────────────────
  {
    name: '카를로 알베르토',
    surname: '사보이아',
    originalName: 'Carlo Alberto of Sardinia',
    regnalName: 'Carlo Alberto',
    biography:
      '사르데냐 왕국의 제7대 국왕(1831~1849). 사보이아-카리냐노 분가 출신으로, 1848년 헌법(알베르토 헌법, Statuto Albertino)을 반포하여 입헌 군주제를 도입하고 제1차 이탈리아 독립 전쟁(1848)에서 오스트리아에 맞서 싸웠으나 노바라 전투(1849)에서 참패했다. 패전의 책임을 지고 아들 비토리오 에마누엘레 2세에게 양위한 후 포르투갈 포르토에서 사망했다.',
    birthYear: 1798, birthMonth: 10, birthDay: 2,
    deathYear: 1849, deathMonth: 7, deathDay: 28,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1831, startMonth: 4, startDay: 27,
        endYear: 1849, endMonth: 3, endDay: 23,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '노바라 전투 패배 후 아들 비토리오 에마누엘레 2세에게 양위. 포르토에서 사망.',
        notes: '1848년 알베르토 헌법 반포. 제1차 이탈리아 독립전쟁 참전.',
      },
    ],
  },

  // ── 8. 비토리오 에마누엘레 2세 (사르데냐 왕 + 이탈리아 초대 왕) ──
  {
    name: '비토리오 에마누엘레',
    surname: '사보이아',
    originalName: 'Vittorio Emanuele II of Italy',
    regnalName: 'Vittorio Emanuele II',
    biography:
      '사르데냐 왕국의 제8대 국왕(1849~1861)이자 이탈리아 왕국의 초대 국왕(1861~1878). 카보우르 수상과 가리발디 장군을 앞세워 이탈리아 통일(리소르지멘토)을 이루어 낸 "이탈리아의 아버지"로 불린다. 1866년 프로이센-오스트리아 전쟁 후 베네치아를, 1870년 프로이센-프랑스 전쟁 중 로마를 합병하여 통일을 완성했다. 로마 판테온에 안장되어 있다.',
    birthYear: 1820, birthMonth: 3, birthDay: 14,
    deathYear: 1878, deathMonth: 1, deathDay: 9,
    gender: 'MALE',
    reigns: [
      {
        countryName: '사르데냐 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1849, startMonth: 3, startDay: 23,
        endYear: 1861, endMonth: 3, endDay: 17,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.SUCCESSION_TRANSFER,
        endReasonDetail: '이탈리아 왕국 선포와 함께 초대 이탈리아 국왕으로 즉위.',
        notes: '카보우르 수상의 외교, 가리발디의 군사 원정으로 이탈리아 통일 주도.',
      },
      {
        countryName: '이탈리아 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1861, startMonth: 3, startDay: 17,
        endYear: 1878, endMonth: 1, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        notes: '1866년 베네치아, 1870년 로마 합병으로 이탈리아 통일 완성.',
      },
    ],
  },

  // ── 이탈리아 왕국 ─────────────────────────────────────────────────

  // ── 9. 움베르토 1세 ──────────────────────────────────────────────
  {
    name: '움베르토',
    surname: '사보이아',
    originalName: 'Umberto I of Italy',
    regnalName: 'Umberto I',
    biography:
      '이탈리아 왕국의 제2대 국왕(1878~1900). 비토리오 에마누엘레 2세의 아들로, 삼국 동맹(이탈리아·독일·오스트리아-헝가리, 1882)에 가입하여 이탈리아를 열강 외교에 편입시켰다. 에리트레아·소말리아를 식민지로 확보하였으나 에티오피아 원정(아도와 전투, 1896)에서 대패하는 굴욕을 맛보았다. 1900년 7월 무정부주의자 가에타노 브레시에게 몬차에서 암살되었다.',
    birthYear: 1844, birthMonth: 3, birthDay: 14,
    deathYear: 1900, deathMonth: 7, deathDay: 29,
    gender: 'MALE',
    reigns: [
      {
        countryName: '이탈리아 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1878, startMonth: 1, startDay: 9,
        endYear: 1900, endMonth: 7, endDay: 29,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '무정부주의자 가에타노 브레시에게 몬차에서 암살.',
        notes: '1882년 삼국 동맹 가입. 1896년 아도와 전투 패배.',
      },
    ],
  },

  // ── 10. 비토리오 에마누엘레 3세 ──────────────────────────────────
  {
    name: '비토리오 에마누엘레',
    surname: '사보이아',
    originalName: 'Vittorio Emanuele III of Italy',
    regnalName: 'Vittorio Emanuele III',
    biography:
      '이탈리아 왕국의 제3대 국왕(1900~1946). 제1차 세계대전에서 연합국 편으로 참전하여 트리에스테·트렌티노를 획득하였다. 1922년 무솔리니의 로마 진군 시 파시스트 정권에 권력을 넘겨주는 치명적인 결정을 내렸다. 제2차 세계대전에서 연합국과 정전 후 무솔리니를 해임(1943)하였으나 책임을 벗기 어려웠다. 1946년 공화국 수립 국민투표를 앞두고 아들 움베르토 2세에게 양위하고 망명했다. 재위 기간은 역대 이탈리아 국왕 중 가장 길었다.',
    birthYear: 1869, birthMonth: 11, birthDay: 11,
    deathYear: 1947, deathMonth: 12, deathDay: 28,
    gender: 'MALE',
    reigns: [
      {
        countryName: '이탈리아 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1900, startMonth: 7, startDay: 29,
        endYear: 1946, endMonth: 5, endDay: 9,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '공화국 국민투표를 앞두고 아들 움베르토 2세에게 양위. 이집트 망명 후 사망.',
        notes: '파시스트 무솔리니 집권 허용(1922). 1943년 무솔리니 해임. 46년의 최장 재위.',
      },
    ],
  },

  // ── 11. 움베르토 2세 ─────────────────────────────────────────────
  {
    name: '움베르토',
    surname: '사보이아',
    originalName: 'Umberto II of Italy',
    regnalName: 'Umberto II',
    biography:
      '이탈리아 왕국의 마지막 국왕(1946). "5월의 왕(Re di Maggio)"이라는 별명처럼, 아버지 비토리오 에마누엘레 3세의 퇴위로 즉위하였으나 불과 34일 만에 공화국 수립 국민투표(1946-06-02)에서 공화파가 승리하여 망명해야 했다. 포르투갈 카스카이스에서 46년간 망명 생활을 하다 1983년 사망하였으며, 이탈리아 헌법은 2002년 개정 전까지 사보이아 남계(男系) 후손의 귀국을 금지하였다.',
    birthYear: 1904, birthMonth: 9, birthDay: 15,
    deathYear: 1983, deathMonth: 3, deathDay: 18,
    gender: 'MALE',
    reigns: [
      {
        countryName: '이탈리아 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1946, startMonth: 5, startDay: 9,
        endYear: 1946, endMonth: 6, endDay: 12,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.STATE_DISSOLVED,
        endReasonDetail: '공화국 수립 국민투표(1946-06-02) 결과 군주제 폐지. 포르투갈로 망명.',
        notes: '재위 34일. "5월의 왕"이라 불림. 이탈리아 왕국의 마지막 군주.',
      },
    ],
  },
]

export async function seedSardiniaItalyMonarchs(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n👑 사르데냐·이탈리아 왕국 군주 시딩 시작...')

  for (const entry of MONARCHS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: entry.originalName },
    })

    let personId: string

    if (existing) {
      personId = existing.id
      console.log(`  ⏭️  ${entry.originalName}`)
    } else {
      const person = await prisma.person.create({
        data: {
          name: entry.name,
          surname: entry.surname,
          originalName: entry.originalName,
          regnalName: entry.regnalName,
          biography: entry.biography,
          birthDate: new Date(entry.birthYear, entry.birthMonth - 1, entry.birthDay),
          birthEra: 'AD',
          deathDate: entry.deathYear
            ? new Date(entry.deathYear, (entry.deathMonth ?? 1) - 1, entry.deathDay ?? 1)
            : undefined,
          deathEra: entry.deathYear ? 'AD' : undefined,
          gender: entry.gender as any,
          nameDisplayOrder: 'western',
          accountId: ACCOUNT_ID,
        },
      })
      personId = person.id
      console.log(`  ✅ ${entry.originalName}`)
    }

    for (const reign of entry.reigns) {
      const historicalCountryId = await getHistoricalCountryId(prisma, reign.countryName)
      if (!historicalCountryId) {
        console.warn(`    ⚠️  역사 국가 없음: ${reign.countryName}`)
        continue
      }

      const positionDefinitionId = await getPositionDefId(prisma, reign.positionTitle)

      const existingReign = await prisma.sovereignReign.findFirst({
        where: {
          personId,
          historicalCountryId,
          regnalNumber: reign.regnalNumber ?? 1,
        },
      })

      if (existingReign) {
        console.log(`    ⏭️  재위 ${reign.regnalNumber ?? 1}: ${reign.countryName}`)
        continue
      }

      await prisma.sovereignReign.create({
        data: {
          personId,
          historicalCountryId,
          positionDefinitionId: positionDefinitionId ?? undefined,
          regnalNumber: reign.regnalNumber ?? 1,
          startDate: new Date(reign.startYear, reign.startMonth - 1, reign.startDay ?? 1),
          endDate: reign.endYear
            ? new Date(reign.endYear, (reign.endMonth ?? 1) - 1, reign.endDay ?? 1)
            : undefined,
          appointmentMethod: reign.appointmentMethod,
          endReason: reign.endReason,
          endReasonDetail: reign.endReasonDetail,
          notes: reign.notes,
          accountId: ACCOUNT_ID,
        },
      })
      console.log(`    ✅ 재위 ${reign.regnalNumber ?? 1}: ${reign.countryName}`)
    }
  }

  console.log(`✅ 사르데냐·이탈리아 왕국 군주 시딩 완료 (${MONARCHS.length}명)\n`)
}
