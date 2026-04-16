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
  // ── 1. 밀로시 오브레노비치 1세 ─────────────────────────────────────
  {
    name: '밀로시',
    surname: '오브레노비치',
    originalName: 'Miloš I Obrenović',
    regnalName: 'Miloš I',
    biography:
      '세르비아 공국의 초대 군주(1817~1839, 1858~1860)이자 오브레노비치 왕조의 창시자. 제1차(1804) 및 제2차(1815) 세르비아 봉기를 이끌어 오스만 제국으로부터 자치권을 쟁취했다. 1830년 술탄의 칙서로 공식 세습 군주로 인정받았으며 벨그라드를 중심으로 근대적 국가 체제를 정비했다. 1839년 의회의 압력으로 퇴위 후 망명했다가 1858년 오스만 칙서로 복위하여 사망 때까지 통치했다.',
    birthYear: 1780, birthMonth: 8, birthDay: 18,
    deathYear: 1860, deathMonth: 9, deathDay: 26,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 1,
        startYear: 1817, startMonth: 11, startDay: 6,
        endYear: 1839, endMonth: 6, endDay: 25,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '세르비아 의회(Skupština)의 압력으로 퇴위. 큰아들 밀란 2세에게 양위.',
        notes: '1817년 세르비아 민족 의회에서 세습 군주로 선포됨. 1830년 오스만 술탄으로부터 공식 세습 공국 인정.',
      },
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 2,
        startYear: 1858, startMonth: 12, startDay: 26,
        endYear: 1860, endMonth: 9, endDay: 26,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '재임 중 사망. 자연사.',
        notes: '성 앤드루 의회(Svetoandrejska skupština)의 결의로 복위. 알렉산다르 카라조르제비치 퇴위 후 귀국.',
      },
    ],
  },

  // ── 2. 밀란 오브레노비치 2세 ─────────────────────────────────────
  {
    name: '밀란',
    surname: '오브레노비치',
    originalName: 'Milan II Obrenović',
    regnalName: 'Milan II',
    biography:
      '세르비아 공국의 제2대 군주. 밀로시 1세와 류비차의 장남으로, 1839년 1월 아버지의 퇴위 후 군주가 되었으나 병약하여 같은 해 7월 19세의 나이로 사망하면서 재위 기간은 불과 6개월에 불과했다. 동생 미하일로 3세가 계승하였다.',
    birthYear: 1819, birthMonth: 10, birthDay: 22,
    deathYear: 1839, deathMonth: 7, deathDay: 8,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 1,
        startYear: 1839, startMonth: 1, startDay: 25,
        endYear: 1839, endMonth: 7, endDay: 8,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '재위 중 병사. 이복 남동생 미하일로 3세가 계승.',
      },
    ],
  },

  // ── 3. 미하일로 오브레노비치 3세 ─────────────────────────────────
  {
    name: '미하일로',
    surname: '오브레노비치',
    originalName: 'Mihailo III Obrenović',
    regnalName: 'Mihailo III',
    biography:
      '세르비아 공국의 제3·5대 군주. 밀로시 1세의 차남으로, 1839년 형 밀란 2세의 사망 후 즉위했으나 1842년 카라조르제비치 가문의 쿠데타로 폐위되어 망명했다. 1860년 아버지 밀로시 1세 사망 후 복위하여 근대적 군대 창설, 오스만 요새 철거 교섭 등으로 세르비아의 실질적 독립을 강화했다. 1868년 벨그라드 인근에서 암살되었다.',
    birthYear: 1823, birthMonth: 9, birthDay: 16,
    deathYear: 1868, deathMonth: 6, deathDay: 10,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 1,
        startYear: 1839, startMonth: 7, startDay: 8,
        endYear: 1842, endMonth: 9, endDay: 14,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.OVERTHROWN,
        endReasonDetail: '카라조르제비치 가문을 지지하는 귀족들의 반란으로 폐위. 오스트리아로 망명.',
      },
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 2,
        startYear: 1860, startMonth: 9, startDay: 26,
        endYear: 1868, endMonth: 6, endDay: 10,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '코슈트냐크 공원에서 암살. 범인은 카라조르제비치 가문과 연루된 것으로 추정.',
        notes: '재임 중 오스만 요새를 철거시키고(1867) 발칸 동맹을 추진하는 등 독립 준비를 강화.',
      },
    ],
  },

  // ── 4. 알렉산다르 카라조르제비치 ───────────────────────────────────
  {
    name: '알렉산다르',
    surname: '카라조르제비치',
    originalName: 'Aleksandar Karađorđević',
    regnalName: 'Aleksandar',
    biography:
      '세르비아 공국의 제4대 군주(1842~1858). 카라조르제비치 왕조의 창시자 카라조르제(게오르기예 페트로비치)의 아들. 1842년 미하일로 3세의 폐위 후 세르비아 의회에서 선출되었다. 오스만 제국과 러시아 사이에서 중립 외교를 펼쳤으나, 크림 전쟁 이후 러시아의 압력과 친오브레노비치 세력의 반발로 1858년 성 앤드루 의회에서 폐위되어 오스트리아로 망명하였다.',
    birthYear: 1806, birthMonth: 10, birthDay: 11,
    deathYear: 1885, deathMonth: 5, deathDay: 3,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 1,
        startYear: 1842, startMonth: 9, startDay: 14,
        endYear: 1858, endMonth: 12, endDay: 26,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.OVERTHROWN,
        endReasonDetail: '성 앤드루 의회(1858)의 결의로 폐위. 밀로시 오브레노비치 1세가 복위.',
        notes: '크림 전쟁 당시 중립 정책으로 러시아의 신뢰를 잃었고, 오브레노비치 지지 세력의 반란으로 퇴위.',
      },
    ],
  },

  // ── 5. 밀란 오브레노비치 4세 / 밀란 1세 ────────────────────────
  {
    name: '밀란',
    surname: '오브레노비치',
    originalName: 'Milan I of Serbia',
    regnalName: 'Milan I',
    biography:
      '세르비아 공국의 제6대 군주(1868~1882)이자 세르비아 왕국의 초대 국왕(1882~1889). 미하일로 3세의 암살 후 14세의 나이로 즉위하여 섭정 체제 하에 성장했다. 1878년 베를린 조약으로 완전한 독립을 국제적으로 인정받고 1882년 왕국을 선포했다. 불가리아와의 세르비아-불가리아 전쟁(1885)에서 패배하고 왕비 나탈리야와의 이혼 파문으로 민심을 잃어 1889년 아들 알렉산다르에게 왕위를 물려주고 퇴위했다.',
    birthYear: 1854, birthMonth: 8, birthDay: 22,
    deathYear: 1901, deathMonth: 2, deathDay: 11,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 공국',
        positionTitle: '공국 군주',
        regnalNumber: 1,
        startYear: 1868, startMonth: 6, startDay: 10,
        endYear: 1882, endMonth: 3, endDay: 6,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.SUCCESSION_TRANSFER,
        endReasonDetail: '세르비아 왕국 선포와 함께 왕위로 격상. 공국 지위 종료.',
        notes: '즉위 당시 14세로 섭정 위원회가 통치. 1878년 베를린 조약으로 독립 인정.',
      },
      {
        countryName: '세르비아 왕국 (근대)',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1882, startMonth: 3, startDay: 6,
        endYear: 1889, endMonth: 3, endDay: 6,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.ABDICATION,
        endReasonDetail: '세르비아-불가리아 전쟁 패배, 왕비와의 이혼 파문으로 민심 이반. 아들 알렉산다르에게 양위.',
        notes: '공국에서 왕국으로 격상 선포. 불가리아와의 1885년 전쟁에서 패배.',
      },
    ],
  },

  // ── 6. 알렉산다르 오브레노비치 ──────────────────────────────────
  {
    name: '알렉산다르',
    surname: '오브레노비치',
    originalName: 'Aleksandar Obrenović',
    regnalName: 'Aleksandar I',
    biography:
      '세르비아 왕국의 제2대 국왕(1889~1903). 밀란 1세와 나탈리야 왕비의 외아들로, 1889년 13세에 즉위하여 섭정 체제를 거쳤다. 1893년 친정을 선포하고 절대 왕정을 강화하였으나, 서민 출신 과부 드라가 마신과의 결혼(1900)으로 귀족과 군의 반발을 샀다. 1903년 5월 쿠데타로 왕비와 함께 궁에서 피살되며 오브레노비치 왕조가 단절되었다.',
    birthYear: 1876, birthMonth: 8, birthDay: 14,
    deathYear: 1903, deathMonth: 6, deathDay: 11,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 왕국 (근대)',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1889, startMonth: 3, startDay: 6,
        endYear: 1903, endMonth: 6, endDay: 11,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '5월 쿠데타: 왕비 드라가와 함께 왕궁에서 장교단에게 암살됨. 오브레노비치 왕조 단절.',
        notes: '1893년 헌법을 폐기하고 친정 선포. 드라가 마신과의 결혼이 정치적 위기로 이어짐.',
      },
    ],
  },

  // ── 7. 페타르 1세 카라조르제비치 ────────────────────────────────
  {
    name: '페타르',
    surname: '카라조르제비치',
    originalName: 'Petar I Karađorđević',
    regnalName: 'Petar I',
    biography:
      '세르비아 왕국의 제3대 국왕(1903~1918). 알렉산다르 카라조르제비치의 아들로 오스만 제국과의 헤르체고비나 봉기에 참전하는 등 파란만장한 망명 생활 후 1903년 5월 쿠데타로 오브레노비치 왕조가 단절되자 세르비아 의회에 의해 국왕으로 선출되었다. 입헌 군주제를 도입하여 "정치적 자유의 황금기"를 열었다. 두 차례의 발칸 전쟁(1912~1913) 승리로 영토를 크게 확장하고 제1차 세계대전에서 연합국 편으로 참전했다. 1918년 종전 후 세르비아-크로아티아-슬로베니아 왕국의 국왕이 되었다.',
    birthYear: 1844, birthMonth: 7, birthDay: 11,
    deathYear: 1921, deathMonth: 8, deathDay: 16,
    gender: 'MALE',
    reigns: [
      {
        countryName: '세르비아 왕국 (근대)',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1903, startMonth: 6, startDay: 15,
        endYear: 1918, endMonth: 12, endDay: 1,
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        endReason: TenureEndReason.STATE_DISSOLVED,
        endReasonDetail: '세르비아 왕국이 세르비아-크로아티아-슬로베니아 왕국으로 통합됨.',
        notes: '5월 쿠데타 이후 의회 선출. 입헌 군주제 도입. 발칸 전쟁 2회 승리.',
      },
      {
        countryName: '세르비아-크로아티아-슬로베니아 왕국',
        positionTitle: '국왕',
        regnalNumber: 1,
        startYear: 1918, startMonth: 12, startDay: 1,
        endYear: 1921, endMonth: 8, endDay: 16,
        appointmentMethod: AppointmentMethod.HEREDITARY,
        endReason: TenureEndReason.DEATH_IN_OFFICE,
        endReasonDetail: '재위 중 고령으로 사망. 아들 알렉산다르 1세가 계승.',
        notes: '남슬라브 통합 국가의 초대 국왕.',
      },
    ],
  },
]

export async function seedSerbiaMonarchs(prisma: PrismaService): Promise<void> {
  console.log('\n👑 세르비아 군주 시딩 시작...')

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

    // 재위 기록 등록
    for (const reign of entry.reigns) {
      const historicalCountryId = await getHistoricalCountryId(prisma, reign.countryName)
      if (!historicalCountryId) {
        console.warn(`    ⚠️  역사 국가 없음: ${reign.countryName}`)
        continue
      }

      const positionDefinitionId = await getPositionDefId(prisma, reign.positionTitle)

      const existing = await prisma.sovereignReign.findFirst({
        where: { personId, historicalCountryId, regnalNumber: reign.regnalNumber ?? 1 },
      })

      if (existing) {
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

  console.log(`✅ 세르비아 군주 시딩 완료 (${MONARCHS.length}명)\n`)
}
