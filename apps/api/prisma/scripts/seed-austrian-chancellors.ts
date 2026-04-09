import { Era, GovernmentPositionType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = 'bf93b960-cec2-4205-9fe1-f34616855f85'
const AUSTRIA_COUNTRY_ID = 'f130dbe9-3482-4529-a16e-180d8a4edf67'

const AT = (n: number) =>
  `at000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const AUSTRIAN_EMPIRE = AT(4)
const AUSTRO_HUNGARY = AT(5)

const PID = (n: number) =>
  `at000004-0000-0000-0000-${String(n).padStart(12, '0')}`
const TID = (n: number) =>
  `at000005-0000-0000-0000-${String(n).padStart(12, '0')}`
const CID = (n: number) =>
  `at000006-0000-0000-0000-${String(n).padStart(12, '0')}`

const POS_PM = 'gov-pos-pm'
const POS_CHANCELLOR = 'gov-pos-chancellor'

interface PM {
  idx: number
  name: string
  surname: string
  birth: string | null
  death: string | null
  biography: string
  /** 재임 [시작, 끝, 대수, 대상 역사국가, 직위ID] */
  tenures: Array<{
    start: string
    end: string
    termNumber: number
    histCountry: string
    positionId: string
  }>
}

const PMS: PM[] = [
  {
    idx: 1,
    name: '클레멘스',
    surname: '메테르니히',
    birth: '1773-05-15',
    death: '1859-06-11',
    biography:
      '오스트리아 국가재상(1821–1848). 빈 체제의 설계자로 1815년 빈 회의에서 유럽 반혁명 질서를 구축. 1848년 혁명으로 실각해 영국으로 망명.',
    tenures: [
      {
        start: '1821-05-25',
        end: '1848-03-13',
        termNumber: 1,
        histCountry: AUSTRIAN_EMPIRE,
        positionId: POS_CHANCELLOR,
      },
    ],
  },
  {
    idx: 2,
    name: '프란츠 안톤',
    surname: '콜로브라트리프슈타인스키',
    birth: '1778-01-31',
    death: '1861-04-04',
    biography:
      '1848년 3월 혁명 직후 오스트리아 최초의 입헌기 총리(2주 재임). 메테르니히와 오랜 정적이었음.',
    tenures: [
      {
        start: '1848-03-20',
        end: '1848-04-04',
        termNumber: 1,
        histCountry: AUSTRIAN_EMPIRE,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 3,
    name: '펠릭스',
    surname: '슈바르첸베르크',
    birth: '1800-10-02',
    death: '1852-04-05',
    biography:
      '프란츠 요제프 1세 즉위 직후의 오스트리아 총리(1848–1852). 1848년 혁명 진압, 올뮈츠 굴욕(1850)으로 독일 통일에 대한 프로이센의 야심을 좌절시킴.',
    tenures: [
      {
        start: '1848-11-21',
        end: '1852-04-05',
        termNumber: 2,
        histCountry: AUSTRIAN_EMPIRE,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 4,
    name: '카를 페르디난트',
    surname: '불올샤우엔슈타인',
    birth: '1797-05-17',
    death: '1865-10-28',
    biography:
      '슈바르첸베르크 사후 외무장관 겸 수석장관(1852–1859). 크림 전쟁 외교 실패로 실각.',
    tenures: [
      {
        start: '1852-04-11',
        end: '1859-05-17',
        termNumber: 3,
        histCountry: AUSTRIAN_EMPIRE,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 5,
    name: '프리드리히 페르디난트',
    surname: '보이스트',
    birth: '1809-01-13',
    death: '1886-10-24',
    biography:
      '작센 왕국 출신 정치가. 1867년 대타협(Ausgleich)을 주도하여 오스트리아-헝가리 이중제국을 성립시킨 초대 외무부 장관 겸 제국 재상(1867–1871).',
    tenures: [
      {
        start: '1867-02-07',
        end: '1871-11-06',
        termNumber: 1,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_CHANCELLOR,
      },
    ],
  },
  {
    idx: 6,
    name: '카를',
    surname: '아우어슈페르크',
    birth: '1814-10-01',
    death: '1890-01-04',
    biography:
      '대타협 후 키슬라이타니엔(오스트리아) 초대 총리(1867–1868). 자유주의 개혁 추진.',
    tenures: [
      {
        start: '1867-12-30',
        end: '1868-09-24',
        termNumber: 2,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 7,
    name: '아돌프',
    surname: '아우어슈페르크',
    birth: '1821-07-21',
    death: '1885-01-05',
    biography:
      '카를의 동생. 자유주의 「독일 동맹」 내각을 이끈 총리(1871–1879).',
    tenures: [
      {
        start: '1871-11-25',
        end: '1879-08-15',
        termNumber: 3,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 8,
    name: '에두아르트',
    surname: '타페',
    birth: '1833-02-24',
    death: '1895-11-29',
    biography:
      '15년간 최장기 총리(1879–1893)로 재임한 「철의 고리」 연립의 설계자. 체코·폴란드 민족주의자와 독일 보수파의 균형을 추구.',
    tenures: [
      {
        start: '1879-08-12',
        end: '1893-11-11',
        termNumber: 4,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 9,
    name: '카지미르 펠릭스',
    surname: '바데니',
    birth: '1846-10-14',
    death: '1909-07-09',
    biography:
      '폴란드 귀족 출신 총리(1895–1897). 독일어·체코어 병용 언어령을 추진하다 독일계 반발로 실각.',
    tenures: [
      {
        start: '1895-10-02',
        end: '1897-11-28',
        termNumber: 5,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 10,
    name: '에른스트',
    surname: '쾨르버',
    birth: '1850-11-06',
    death: '1919-03-04',
    biography:
      '경제 발전과 철도 건설에 주력한 총리(1900–1904). 1916년 단기 재임도 함.',
    tenures: [
      {
        start: '1900-01-19',
        end: '1904-12-31',
        termNumber: 6,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
      {
        start: '1916-10-29',
        end: '1916-12-13',
        termNumber: 12,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 11,
    name: '막스',
    surname: '베크',
    birth: '1854-09-06',
    death: '1943-01-20',
    biography:
      '보통선거권을 도입한 총리(1906–1908). 1907년 선거법 개혁으로 성인 남성 보통선거 실현.',
    tenures: [
      {
        start: '1906-06-02',
        end: '1908-11-15',
        termNumber: 7,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 12,
    name: '리하르트',
    surname: '비너트슈뢰어',
    birth: '1863-03-02',
    death: '1918-06-03',
    biography: '관료 출신 총리(1908–1911).',
    tenures: [
      {
        start: '1908-11-15',
        end: '1911-06-28',
        termNumber: 8,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 13,
    name: '카를',
    surname: '슈튀르크',
    birth: '1859-10-30',
    death: '1916-10-21',
    biography:
      '제1차 세계대전 발발기 총리(1911–1916). 의회를 정지시키고 비상 통치를 하던 중 사회주의자 프리드리히 아들러에게 암살됨.',
    tenures: [
      {
        start: '1911-11-03',
        end: '1916-10-21',
        termNumber: 9,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 14,
    name: '하인리히',
    surname: '클람마르티니츠',
    birth: '1863-01-01',
    death: '1932-03-07',
    biography: '카를 1세가 임명한 첫 총리(1916–1917). 보수 귀족 출신.',
    tenures: [
      {
        start: '1916-12-20',
        end: '1917-06-23',
        termNumber: 10,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 15,
    name: '에른스트',
    surname: '자이들러',
    birth: '1862-06-05',
    death: '1931-01-23',
    biography: '법관 출신 총리(1917–1918). 전시 식량난과 민족 문제로 고심.',
    tenures: [
      {
        start: '1917-06-23',
        end: '1918-07-25',
        termNumber: 11,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 16,
    name: '막스',
    surname: '후사레크',
    birth: '1865-05-03',
    death: '1935-03-06',
    biography: '민족 연방주의 총리(1918.7–10). 제국 개혁 시도했으나 실패.',
    tenures: [
      {
        start: '1918-07-25',
        end: '1918-10-27',
        termNumber: 12,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
  {
    idx: 17,
    name: '하인리히',
    surname: '람마슈',
    birth: '1853-05-21',
    death: '1920-01-06',
    biography:
      '오스트리아-헝가리 제국 마지막 총리(1918.10.27–11.11). 평화주의 법학자로 종전·해체 절차를 관리.',
    tenures: [
      {
        start: '1918-10-27',
        end: '1918-11-11',
        termNumber: 13,
        histCountry: AUSTRO_HUNGARY,
        positionId: POS_PM,
      },
    ],
  },
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  let tenureSeq = 0
  let cabinetSeq = 0

  for (const pm of PMS) {
    const personId = PID(pm.idx)

    await prisma.person.upsert({
      where: { id: personId },
      update: {
        name: pm.name,
        surname: pm.surname,
        birthEra: Era.AD,
        birthDate: new Date(`${pm.birth}T00:00:00Z`),
        deathEra: Era.AD,
        deathDate: new Date(`${pm.death}T00:00:00Z`),
        biography: pm.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: AUSTRIA_COUNTRY_ID,
        accountId: ACCOUNT_ID,
      },
      create: {
        id: personId,
        name: pm.name,
        surname: pm.surname,
        birthEra: Era.AD,
        birthDate: new Date(`${pm.birth}T00:00:00Z`),
        deathEra: Era.AD,
        deathDate: new Date(`${pm.death}T00:00:00Z`),
        biography: pm.biography,
        gender: 'male',
        nameDisplayOrder: 'western',
        countryId: AUSTRIA_COUNTRY_ID,
        accountId: ACCOUNT_ID,
      },
    })
    console.log(`\n  👤 ${pm.idx}. ${pm.name} ${pm.surname}`)

    for (const t of pm.tenures) {
      tenureSeq += 1
      const tenureId = TID(tenureSeq)
      const existing = await prisma.governmentPositionTenure.findFirst({
        where: {
          personId,
          historicalCountryId: t.histCountry,
          positionDefinitionId: t.positionId,
          startDate: new Date(`${t.start}T00:00:00Z`),
        },
      })
      let finalTenureId = existing?.id ?? tenureId
      if (!existing) {
        await prisma.governmentPositionTenure.create({
          data: {
            id: tenureId,
            personId,
            positionDefinitionId: t.positionId,
            positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
            historicalCountryId: t.histCountry,
            termNumber: t.termNumber,
            startDate: new Date(`${t.start}T00:00:00Z`),
            endDate: new Date(`${t.end}T00:00:00Z`),
            showPositionInfo: true,
            accountId: ACCOUNT_ID,
          },
        })
      }

      const existingCabinet = await prisma.cabinet.findFirst({
        where: { headTenureId: finalTenureId },
      })
      if (!existingCabinet) {
        cabinetSeq += 1
        const histLabel = t.histCountry === AUSTRIAN_EMPIRE ? '오스트리아 제국' : '오스트리아-헝가리'
        await prisma.cabinet.create({
          data: {
            id: CID(cabinetSeq),
            headTenureId: finalTenureId,
            name: `${pm.surname} ${histLabel} 내각 ${t.termNumber}기`,
            accountId: ACCOUNT_ID,
          },
        })
      }
      console.log(`     🏛️  ${t.histCountry === AUSTRIAN_EMPIRE ? '오스트리아 제국' : '오헝 제국'} ${t.termNumber}대 (${t.start} ~ ${t.end})`)
    }
  }

  console.log(`\n✅ 총 ${PMS.length}명 등록 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
