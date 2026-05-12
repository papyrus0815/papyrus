/**
 * 펠리페 4세(Philip IV of Spain, 1605~1665)의 어머니 시드.
 *
 *   어머니: 마르가레테 폰 외스터라이히 (Margaret of Austria, 1584-12-25 ~ 1611-10-03)
 *           합스부르크 이너외스터라이히(Inner Austria) 분지 출신
 *           카를 2세 폰 이너외스터라이히와 마리아 안나 폰 바이에른의 7녀
 *           1599년 14세에 사촌 펠리페 3세 데 에스파냐와 결혼해 약 12년간 8자녀 출산
 *           1611년 8번째 자녀 알폰소 출산 직후 산후 합병증으로 26세에 사망
 *           후일 페르디난트 2세 황제(1578~1637)의 친누이이자, 페르디난트 3세 황후 마리아 안나의 어머니
 *
 *   ⚠️ 기존 데이터 보존 모드.
 *   ⚠️ 의존: 펠리페 4세(Philip IV of Spain) + 펠리페 3세(Philip III of Spain) + 합스부르크 가문 모두 기등록
 *
 * 등록 항목:
 *   - Person x1 (마르가레테 폰 외스터라이히)
 *   - PersonStats x1
 *   - PersonCountryAffiliation x2 (이너외스터라이히 출생 + 카스티야 왕국 왕비로서 CITIZENSHIP)
 *   - PersonSpouse x2 (펠리페 3세와의 결혼 — 양방향, 1599-04-18 ~ 1611-10-03 사별)
 *   - 모자 관계: 마르가레테 → 펠리페 4세 (motherId 연결)
 */
import { DeathType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const MARGARET = {
  name: '마르가레테',
  surname: '합스부르크',
  originalName: 'Margaret of Austria, Queen of Spain',
  regnalName: '왕비',
  birthYear: 1584,
  birthMonth: 12,
  birthDay: 25,
  deathYear: 1611,
  deathMonth: 10,
  deathDay: 3,
  birthPlaceText: '이너외스터라이히 대공국 그라츠(Graz)',
  deathPlaceText: '카스티야 왕국 엘 에스코리알 왕궁(El Escorial)',
  deathType: DeathType.ILLNESS,
  deathCause: '산후 합병증 (향년 26세)',
  deathNote:
    '1611년 10월 3일 엘 에스코리알 왕궁에서 향년 26세에 사망했다. 같은 해 9월 22일 여덟 번째 자녀 ' +
    '알폰소를 출산한 직후 산후 출혈과 발열이 점진적으로 악화되어 약 열흘 만에 사망했다. 사망 당시 ' +
    '남편 펠리페 3세는 33세였고 자녀 6명이 살아 있었으며, 그중 장남 펠리페가 후일 펠리페 4세로 ' +
    '즉위한다. 결혼 12년 차의 갑작스러운 사망으로 펠리페 3세는 평생 재혼하지 않았다. 시신은 엘 ' +
    '에스코리알 왕궁의 합스부르크 스페인 왕실 묘소에 안치되었다. 동시기 평가에서 깊은 신앙심과 ' +
    '자비로운 성품으로 사랑받았으며, 만년에는 측근 레르마 공작의 부정부패에 강한 반대 입장을 표명해 ' +
    '궁정 정치의 한 축을 이루었다.',
  biography:
    '합스부르크 이너외스터라이히 분지 출신의 카스티야·아라곤·포르투갈 왕비. 1584년 12월 25일 ' +
    '이너외스터라이히 대공국 수도 그라츠에서 출생했다. 부친은 합스부르크 이너외스터라이히 분지의 ' +
    '시조이자 신성 로마 황제 페르디난트 1세의 막내 아들인 카를 2세 폰 이너외스터라이히(Charles II ' +
    'of Inner Austria, 1540~1590), 모친은 비텔스바흐 가문 출신의 마리아 안나 폰 바이에른(Maria Anna ' +
    'of Bavaria, 1551~1608)이다. 7녀이자 15자녀 중 한 명으로, 형제자매 중 한 명이 후일 신성 로마 ' +
    '황제 페르디난트 2세(1578~1637)이다.\n\n' +
    '어린 시절 부친 카를 2세가 1590년 향년 50세에 사망한 직후 모친 마리아 안나의 양육 하에 그라츠에서 ' +
    '자랐다. 어머니의 깊은 가톨릭 신앙심이 자녀들에게 결정적 영향을 미쳤으며, 마르가레테 본인도 ' +
    '평생 신실한 가톨릭 신자로 살았다. 어린 시절 한때 수녀가 되기를 원했으나 합스부르크 가문의 ' +
    '정략 결혼 전통으로 결혼이 결정되었다.\n\n' +
    '1598년 14세였던 마르가레테는 사촌 펠리페 3세 데 에스파냐(Philip III of Spain, 1578~1621)와의 ' +
    '결혼이 결정되었다. 두 사람은 6촌 사촌 관계로 모두 합스부르크 가문 출신이었다. 합스부르크 ' +
    '가문 내부의 결혼 정책으로 스페인 합스부르크와 오스트리아 합스부르크의 결속을 강화하려는 ' +
    '목적이었다. 1599년 4월 18일 이탈리아 페라라에서 대리 결혼식이 거행되었고, 같은 해 11월 18일 ' +
    '스페인 발렌시아에서 정식 결혼식이 거행되었다. 같은 날 펠리페 3세의 누이 이사벨 클라라 에우헤니아도 ' +
    '오스트리아 대공 알브레히트와 결혼해 합스부르크 양가가 이중 결혼으로 결속을 굳혔다.\n\n' +
    '결혼 후 약 12년간 8명의 자녀를 출산했다. 살아남은 자녀 6명 중 첫째 딸 안나(Anne of Austria, ' +
    '1601~1666)는 후일 프랑스 루이 13세의 왕비이자 루이 14세의 모친이 되어 17세기 프랑스-스페인 ' +
    '관계의 핵심 인물이 된다. 장남 펠리페(1605~1665)는 후일 펠리페 4세로 즉위한다. 차녀 마리아 ' +
    '안나(1606~1646)는 친오빠 페르디난트 2세의 아들 페르디난트 3세 황제의 황후가 되어 합스부르크 ' +
    '양가 결혼 정책의 또 다른 매개자가 되었다.\n\n' +
    '왕비로서 마르가레테는 동시기 평가에서 신실한 신앙과 자비로운 성품으로 사랑받았다. 통치 실권은 ' +
    '남편 펠리페 3세의 측근 레르마 공작 프란시스코 데 산도발이 약 20년간 행사했는데, 마르가레테는 ' +
    '레르마 공작의 부정부패와 권력 남용에 강한 반대 입장을 표명해 궁정 정치의 한 축을 이루었다. ' +
    '특히 레르마 공작의 측근 로드리고 칼데론의 부정 사건을 적극 폭로해 결국 1618년 레르마 공작 ' +
    '실각·1621년 칼데론 처형의 단초를 제공했다는 동시기 평가가 있다.\n\n' +
    '1611년 9월 22일 8번째 자녀 알폰소를 출산한 직후 산후 합병증이 시작되었다. 약 열흘간 출혈과 ' +
    '발열이 점진적으로 악화되어 1611년 10월 3일 엘 에스코리알 왕궁에서 향년 26세에 사망했다. ' +
    '결혼 12년 차의 갑작스러운 사망이었으며, 남편 펠리페 3세는 평생 재혼하지 않았다. 시신은 엘 ' +
    '에스코리알의 합스부르크 스페인 왕실 묘소에 안치되었다.\n\n' +
    '마르가레테의 사후 영향은 결정적이다. 첫째, 장남 펠리페 4세의 통치(1621~1665)를 통해 합스부르크 ' +
    '스페인 후기의 한 시대가 그녀의 자녀에게서 시작되었다. 둘째, 장녀 안나의 프랑스 결혼으로 ' +
    '루이 14세가 그녀의 외손자가 되어, 후일 1700년 스페인 왕위계승전쟁의 가계도적 기반이 마련되었다. ' +
    '셋째, 마리아 안나와 페르디난트 3세의 결혼으로 17세기 합스부르크 양가의 결속이 한 세대 더 ' +
    '연장되었다. 신앙심 깊은 짧은 생애였으나 17세기 유럽 왕가 계보의 핵심 매듭이 된 왕비로 평가된다.',
  influence: 55,
  stats: {
    politics: 60,
    military: 15,
    diplomacy: 65,
    intellect: 65,
    charisma: 75,
    administration: 50,
    notes:
      '약 12년의 짧은 결혼 생활 동안 8자녀 출산. 동시기 평가에서 신실한 신앙과 자비로운 성품으로 ' +
      '사랑받았다. 정치는 남편 펠리페 3세의 측근 레르마 공작에게 통치 실권이 있었으나, 마르가레테는 ' +
      '레르마의 부정부패에 적극 반대해 1618년 실각의 한 동인을 제공했다는 평가가 있다. 외교는 친정 ' +
      '오스트리아 합스부르크 측과의 결속 강화에 기여. 카리스마는 평민·궁정 모두에게 호감을 얻은 ' +
      '"좋은 왕비"의 전형. 자녀들의 결혼을 통해 17세기 유럽 왕가 계보의 핵심 매듭이 되었다. ' +
      '26세 요절로 본격적 정치 활동 시기는 짧았다.',
  },
} as const

export async function seedPhilipIVMother(prisma: PrismaService): Promise<void> {
  console.log('\n👑 펠리페 4세 어머니 마르가레테 폰 외스터라이히 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  admin 계정 미존재')
    return
  }
  const habsburg = await prisma.dynasty.findFirst({ where: { name: '합스부르크 가문' } })
  if (!habsburg) {
    console.warn('  합스부르크 가문 미존재')
    return
  }
  const castileHC = await prisma.historicalCountry.findFirst({ where: { name: '카스티야 왕국' } })
  if (!castileHC) {
    console.warn('  카스티야 왕국 HC 미존재')
    return
  }
  const philipIII = await prisma.person.findFirst({
    where: { originalName: 'Philip III of Spain' },
    select: { id: true },
  })
  if (!philipIII) {
    console.warn('  펠리페 3세 미존재')
    return
  }
  const philipIV = await prisma.person.findFirst({
    where: { originalName: 'Philip IV of Spain' },
    select: { id: true, motherId: true },
  })
  if (!philipIV) {
    console.warn('  펠리페 4세 미존재')
    return
  }

  // 1) Person
  const existing = await prisma.person.findFirst({
    where: { originalName: MARGARET.originalName },
  })
  let margaretId: string
  if (existing) {
    console.log(`  이미 존재 — 스킵: ${MARGARET.originalName}`)
    margaretId = existing.id
  } else {
    const created = await prisma.person.create({
      data: {
        name: MARGARET.name,
        surname: MARGARET.surname,
        originalName: MARGARET.originalName,
        regnalName: MARGARET.regnalName,
        biography: MARGARET.biography,
        birthDate: new Date(MARGARET.birthYear, MARGARET.birthMonth - 1, MARGARET.birthDay),
        birthEra: 'AD' as any,
        deathDate: new Date(MARGARET.deathYear, MARGARET.deathMonth - 1, MARGARET.deathDay),
        deathEra: 'AD' as any,
        gender: 'FEMALE',
        nameDisplayOrder: 'western' as any,
        dynastyId: habsburg.id,
        birthPlaceText: MARGARET.birthPlaceText,
        deathPlaceText: MARGARET.deathPlaceText,
        deathType: MARGARET.deathType,
        deathCause: MARGARET.deathCause,
        deathNote: MARGARET.deathNote,
        influence: MARGARET.influence,
        accountId: admin.id,
      },
    })
    margaretId = created.id
    console.log(`  ✅ 인물 생성: ${MARGARET.originalName} (id=${margaretId})`)
  }

  // 2) Stats
  const statsExists = await prisma.personStats.findFirst({
    where: { personId: margaretId, accountId: admin.id },
  })
  if (!statsExists) {
    await prisma.personStats.create({
      data: {
        personId: margaretId,
        accountId: admin.id,
        politics: MARGARET.stats.politics,
        military: MARGARET.stats.military,
        diplomacy: MARGARET.stats.diplomacy,
        intellect: MARGARET.stats.intellect,
        charisma: MARGARET.stats.charisma,
        administration: MARGARET.stats.administration,
        notes: MARGARET.stats.notes,
      },
    })
    console.log(`  ✅ 능력치 등록`)
  } else {
    console.log(`  능력치 스킵 (이미 존재)`)
  }

  // 3) Country affiliation — 카스티야 왕국 (왕비)
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId: margaretId,
      historicalCountryId: castileHC.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (!affExists) {
    await prisma.personCountryAffiliation.create({
      data: {
        personId: margaretId,
        historicalCountryId: castileHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log(`  ✅ 소속국가: 카스티야 왕국 CITIZENSHIP`)
  } else {
    console.log(`  소속국가 스킵`)
  }

  // 4) 결혼 (양방향)
  const mStart = new Date(1599, 3, 18) // 1599-04-18 페라라 대리 결혼
  const mEnd = new Date(1611, 9, 3) // 1611-10-03 마르가레테 사망
  const mNote =
    '1599년 4월 18일 이탈리아 페라라에서 대리 결혼식, 같은 해 11월 18일 스페인 발렌시아에서 정식 ' +
    '결혼식. 마르가레테 14세, 펠리페 3세 20세. 6촌 사촌 관계의 합스부르크 가문 내 정략 결혼으로, ' +
    '스페인 합스부르크와 오스트리아 합스부르크 양가의 결속 강화 목적이었다. 약 12년 결혼 생활 동안 ' +
    '8명의 자녀를 출산했으며 그중 6명이 성인까지 살아남았다. 살아남은 자녀 중 안나는 프랑스 루이 ' +
    '13세의 왕비가 되었고, 펠리페는 후일 펠리페 4세로 즉위, 마리아 안나는 페르디난트 3세 황제의 ' +
    '황후가 되었다. 1611년 10월 3일 마르가레테가 8번째 자녀 알폰소 출산 직후 산후 합병증으로 ' +
    '26세에 사망하면서 결혼 종결. 펠리페 3세는 평생 재혼하지 않고 약 10년 후 1621년에 사망했다.'

  for (const [aId, bId, label] of [
    [margaretId, philipIII.id, '마르가레테 → 펠리페 3세'],
    [philipIII.id, margaretId, '펠리페 3세 → 마르가레테'],
  ] as const) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (exists) {
      console.log(`  결혼 스킵: ${label}`)
      continue
    }
    await prisma.personSpouse.create({
      data: {
        personId: aId,
        spouseId: bId,
        marriageStartDate: mStart,
        marriageEndDate: mEnd,
        note: mNote,
      },
    })
    console.log(`  ✅ 결혼: ${label}`)
  }

  // 5) 모자: 마르가레테 → 펠리페 4세
  if (philipIV.motherId) {
    console.log(`  모자 스킵 (이미 연결): 펠리페 4세 motherId=${philipIV.motherId}`)
  } else {
    await prisma.person.update({
      where: { id: philipIV.id },
      data: { motherId: margaretId },
    })
    console.log(`  ✅ 모자: 마르가레테 → 펠리페 4세`)
  }

  console.log(`✅ 펠리페 4세 어머니 시딩 완료\n`)
}
