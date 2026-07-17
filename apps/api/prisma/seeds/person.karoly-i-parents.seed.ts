/**
 * 헝가리 카로이 1세(Charles I of Hungary, Károly Róbert, 1288~1342)의 부모 시드.
 *
 *   아버지: 카를로 마르텔로 당주 (Charles Martel of Anjou, 1271 ~ 1295-08-12)
 *           카페 앙주 가문(앙주-시칠리아 분지) 출신. 나폴리 왕 카를로 2세의 장남.
 *           어머니 헝가리의 마리아(아르파드 왕조)를 통해 헝가리 왕위 계승권을 물려받아
 *           명목상 헝가리 왕(1290~1295)으로 인정받았으나 실제로는 통치하지 못했다.
 *
 *   어머니: 합스부르크의 클레멘차 (Clementia of Habsburg, 약 1262 ~ 약 1293)
 *           독일 왕(로마인의 왕) 루돌프 1세 폰 합스부르크의 딸.
 *           1281년 카를로 마르텔로와 혼인해 앙주-나폴리와 합스부르크 가문을 이었다.
 *
 *   ⚠️ 자식 카로이 1세는 이미 UI로 등록됨(originalName='I. Károly') — 시드는 생성하지 않고
 *      findFirst로 로케이트해 fatherId/motherId만 연결한다.
 *   ⚠️ 기존 데이터 보존 모드(멱등). 가문(앙주-시칠리아·합스부르크)은 재사용, 미존재 시 생략.
 *   ⚠️ 국적/재위(affiliation·SovereignReign)는 이 시드에서 다루지 않음(별도 결정 필요).
 *
 * 등록 항목:
 *   - Person x2 (카를로 마르텔로·클레멘차)
 *   - PersonStats x2
 *   - PersonSpouse x2 (양방향 혼인, 약 1281 ~ 약 1293 클레멘차 사망)
 *   - 부자/모자 관계: 카를로 마르텔로·클레멘차 → 카로이 1세
 */
import { DeathType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const CHARLES_MARTEL = {
  name: '카를로 마르텔로',
  surname: '앙주',
  originalName: 'Charles Martel of Anjou',
  regnalName: null as string | null,
  birthYear: 1271,
  birthMonth: 1,
  birthDay: 1, // 1271년생, 정확한 일자 미상(연 단위)
  isBirthDateApproximate: false,
  deathYear: 1295,
  deathMonth: 8,
  deathDay: 12,
  isDeathDateApproximate: false,
  birthPlaceText: '나폴리 왕국 나폴리',
  deathPlaceText: '나폴리 왕국 나폴리',
  deathType: DeathType.ILLNESS,
  deathCause: '전염병(역병) — 향년 약 24세',
  deathNote:
    '1295년 8월 12일 나폴리에서 당시 이탈리아 남부를 휩쓴 전염병(역병)으로 향년 약 24세에 ' +
    '요절했다. 부친 나폴리 왕 카를로 2세보다 먼저 사망했기 때문에 나폴리 왕위는 동생 로베르토' +
    '(로베르 1세)에게 넘어갔고, 카를로 마르텔로가 어머니에게서 물려받은 헝가리 왕위 계승권은 ' +
    '장남 카로이 로베르트(=헝가리 카로이 1세)에게 상속되었다.',
  biography:
    '카페 앙주 가문(앙주-시칠리아 분지) 출신의 명목상 헝가리 왕. 1271년 나폴리 왕국에서 태어났다. ' +
    '부친은 나폴리 왕 카를로 2세(Charles II of Naples, 1254~1309)이고, 모친은 헝가리의 마리아' +
    '(Mary of Hungary, 약 1257~1323)로 헝가리 아르파드 왕조 이슈트반 5세의 딸이다. 이 모계 ' +
    '혈통을 통해 카를로 마르텔로는 헝가리 왕위 계승권을 물려받았다.\n\n' +
    '1290년 외삼촌 격인 헝가리 왕 라슬로 4세(László IV)가 후사 없이 피살되자, 카를로 마르텔로는 ' +
    '어머니 마리아의 계승권을 근거로 헝가리 왕위를 주장했다. 교황 니콜라오 4세의 지지로 명목상 ' +
    '헝가리 왕(1290~1295)으로 인정받았으나, 실제 헝가리는 아르파드 왕조 마지막 군주 안드라스 ' +
    '3세(András III)가 통치하고 있어 카를로 마르텔로는 헝가리 땅을 실질적으로 다스리지 못한 ' +
    '명목상의 왕에 머물렀다.\n\n' +
    '1281년 합스부르크 가문의 클레멘차(독일 왕 루돌프 1세의 딸)와 혼인해 장남 카로이 로베르트' +
    '(1288년생)를 비롯한 자녀를 두었다. 그가 주장한 헝가리 왕위 계승권은 아들 카로이 로베르트에게 ' +
    '이어졌고, 이 계승권을 근거로 카로이 로베르트가 1308년 실제로 헝가리 왕 카로이 1세로 즉위하면서 ' +
    '헝가리에 앙주 왕조의 통치가 시작되었다. 카를로 마르텔로 본인은 1295년 8월 나폴리에서 전염병으로 ' +
    '24세에 요절해, 아버지 카를로 2세보다 먼저 세상을 떠났다.',
  influence: 55,
  stats: {
    politics: 45,
    military: 40,
    diplomacy: 50,
    intellect: 50,
    charisma: 55,
    administration: 40,
    notes:
      '명목상 헝가리 왕(1290~1295)으로 인정받았으나 실제 통치는 하지 못했고 약 24세에 요절해 ' +
      '개인적 치적은 제한적이다. 헝가리 아르파드 왕조 계승권을 어머니에게서 물려받아 아들 카로이 ' +
      '1세에게 전달함으로써 헝가리 앙주 왕조 성립의 계보적 매개가 된 인물. 능력치는 짧은 생애를 ' +
      '감안한 개략적 추정치.',
  },
} as const

const CLEMENTIA_HABSBURG = {
  name: '클레멘차',
  surname: '합스부르크',
  originalName: 'Clementia of Habsburg',
  regnalName: null as string | null,
  birthYear: 1262,
  birthMonth: 1,
  birthDay: 1, // 약 1262년경 출생 추정
  isBirthDateApproximate: true,
  deathYear: 1293,
  deathMonth: 1,
  deathDay: 1, // 약 1293년경 사망 추정(막내 클레망스 출산 무렵)
  isDeathDateApproximate: true,
  birthPlaceText: null as string | null,
  deathPlaceText: null as string | null,
  deathType: DeathType.UNKNOWN,
  deathCause: null as string | null,
  deathNote:
    '남편 카를로 마르텔로(1295년 사망)보다 앞선 약 1293년경 사망한 것으로 전해진다. 막내딸 ' +
    '클레망스(후일 프랑스 왕비)의 출산 무렵으로 추정되나 정확한 사망일과 장소는 사료상 불확실하다.',
  biography:
    '합스부르크 가문 출신으로 나폴리 앙주 왕가에 시집간 클레멘차(클레멘티아 폰 합스부르크). 약 ' +
    '1262년경 태어났으며, 부친은 독일 왕(로마인의 왕)이자 합스부르크 가문의 시조격 군주 루돌프 ' +
    '1세 폰 합스부르크(Rudolf I of Germany, 1218~1291)이고, 모친은 호엔베르크의 게르트루트' +
    '(Gertrude of Hohenberg, 약 1225~1281)이다.\n\n' +
    '1281년 나폴리 앙주 가문의 카를로 마르텔로(명목상 헝가리 왕)와 혼인했다. 이 결혼은 신성 로마 ' +
    '왕 루돌프 1세의 합스부르크 가문과 나폴리 앙주 왕가를 잇는 정치적 결합이었다. 슬하에 장남 ' +
    '카로이 로베르트(=헝가리 카로이 1세), 딸 베아트리체, 그리고 막내 클레망스(Clémence de Hongrie, ' +
    '후일 프랑스 왕 루이 10세의 왕비)를 두었다.\n\n' +
    '남편보다 앞선 약 1293년경 사망한 것으로 전해지며, 정확한 사망 시점과 장소는 불확실하다. 그녀의 ' +
    '장남 카로이 로베르트가 1308년 헝가리 왕 카로이 1세로 즉위하면서, 합스부르크 가문의 피가 헝가리 ' +
    '앙주 왕조로 이어지게 되었다.',
  influence: 45,
  stats: {
    politics: 35,
    military: 20,
    diplomacy: 45,
    intellect: 50,
    charisma: 50,
    administration: 30,
    notes:
      '합스부르크(루돌프 1세)와 나폴리 앙주 가문을 잇는 결혼 동맹의 매개자. 독자적 정치 활동 ' +
      '기록은 제한적이며 약 1293년 비교적 이른 나이에 사망했다. 능력치는 개략적 추정치.',
  },
} as const

export async function seedKarolyIParents(prisma: PrismaService): Promise<void> {
  console.log('\n👑 카로이 1세 부모(카를로 마르텔로 + 클레멘차) 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  admin 미존재')
    return
  }

  // 가문(기존 재사용) — 앙주-시칠리아(부계), 합스부르크(모계)
  const anjou = await prisma.dynasty.findFirst({ where: { name: '앙주-시칠리아' } })
  if (!anjou) {
    console.warn('  앙주-시칠리아 가문 미존재')
    return
  }
  const habsburg = await prisma.dynasty.findFirst({ where: { name: '합스부르크 가문' } })
  if (!habsburg) {
    console.warn('  합스부르크 가문 미존재')
    return
  }

  // 자식 카로이 1세 로케이트(UI 등록분) — originalName 우선, name+surname 폴백
  const karoly = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: 'I. Károly' },
        { AND: [{ name: '카로이 로베르트' }, { surname: '앙주' }] },
      ],
    },
    select: { id: true, fatherId: true, motherId: true },
  })
  if (!karoly) {
    console.warn('  카로이 1세 미존재 — 먼저 인물을 등록하세요')
    return
  }

  // 1) Person 등록 helper (originalName 멱등)
  const createPerson = async (
    spec: typeof CHARLES_MARTEL | typeof CLEMENTIA_HABSBURG,
    gender: 'MALE' | 'FEMALE',
    dynastyId: string,
  ): Promise<string> => {
    const existing = await prisma.person.findFirst({ where: { originalName: spec.originalName } })
    if (existing) {
      console.log(`  인물 스킵: ${spec.originalName}`)
      return existing.id
    }
    const created = await prisma.person.create({
      data: {
        name: spec.name,
        surname: spec.surname,
        originalName: spec.originalName,
        regnalName: spec.regnalName ?? undefined,
        biography: spec.biography,
        birthDate: new Date(spec.birthYear, spec.birthMonth - 1, spec.birthDay),
        birthEra: 'AD' as any,
        isBirthDateApproximate: spec.isBirthDateApproximate,
        deathDate: new Date(spec.deathYear, spec.deathMonth - 1, spec.deathDay),
        deathEra: 'AD' as any,
        isDeathDateApproximate: spec.isDeathDateApproximate,
        gender,
        nameDisplayOrder: 'korean' as any, // 자식 카로이 1세와 동일 순서(성 우선)
        dynastyId,
        birthPlaceText: spec.birthPlaceText ?? undefined,
        deathPlaceText: spec.deathPlaceText ?? undefined,
        deathType: spec.deathType,
        deathCause: spec.deathCause ?? undefined,
        deathNote: spec.deathNote,
        influence: spec.influence,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${spec.originalName}`)
    return created.id
  }

  const fatherId = await createPerson(CHARLES_MARTEL, 'MALE', anjou.id)
  const motherId = await createPerson(CLEMENTIA_HABSBURG, 'FEMALE', habsburg.id)

  // 2) Stats
  for (const [pid, spec, label] of [
    [fatherId, CHARLES_MARTEL, '카를로 마르텔로'],
    [motherId, CLEMENTIA_HABSBURG, '클레멘차'],
  ] as const) {
    const exists = await prisma.personStats.findFirst({
      where: { personId: pid, accountId: admin.id },
    })
    if (exists) {
      console.log(`  ${label} 능력치 스킵`)
      continue
    }
    await prisma.personStats.create({
      data: {
        personId: pid,
        accountId: admin.id,
        politics: spec.stats.politics,
        military: spec.stats.military,
        diplomacy: spec.stats.diplomacy,
        intellect: spec.stats.intellect,
        charisma: spec.stats.charisma,
        administration: spec.stats.administration,
        notes: spec.stats.notes,
      },
    })
    console.log(`  ✅ ${label} 능력치 등록`)
  }

  // 3) 혼인 양방향 (약 1281 ~ 약 1293 클레멘차 사망)
  const mStart = new Date(1281, 0, 1)
  const mEnd = new Date(1293, 0, 1) // 클레멘차 사망(추정)
  const mNote =
    '1281년 합스부르크 가문의 클레멘차(독일 왕 루돌프 1세의 딸)와 나폴리 앙주 가문 카를로 마르텔로' +
    '(명목상 헝가리 왕)의 혼인. 신성 로마 왕 루돌프 1세의 합스부르크 가문과 나폴리 앙주 왕가를 잇는 ' +
    '정치적 결합이었다. 장남 카로이 로베르트가 어머니 계통(아르파드 왕조)의 헝가리 왕위 계승권과 ' +
    '아버지의 명목상 헝가리 왕위 주장을 물려받아 1308년 헝가리 카로이 1세로 즉위, 헝가리 앙주 왕조를 ' +
    '열었다. 클레멘차가 약 1293년 먼저 사망하며 혼인이 종결되었다.'
  for (const [aId, bId, label] of [
    [fatherId, motherId, '카를로 마르텔로 → 클레멘차'],
    [motherId, fatherId, '클레멘차 → 카를로 마르텔로'],
  ] as const) {
    const exists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (exists) {
      console.log(`  혼인 스킵: ${label}`)
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
    console.log(`  ✅ 혼인: ${label}`)
  }

  // 4) 부자/모자 관계 → 카로이 1세
  if (karoly.fatherId) {
    console.log(`  부자 스킵 (이미 연결)`)
  } else {
    await prisma.person.update({
      where: { id: karoly.id },
      data: { fatherId },
    })
    console.log(`  ✅ 부자: 카를로 마르텔로 → 카로이 1세`)
  }
  if (karoly.motherId) {
    console.log(`  모자 스킵 (이미 연결)`)
  } else {
    await prisma.person.update({
      where: { id: karoly.id },
      data: { motherId },
    })
    console.log(`  ✅ 모자: 클레멘차 → 카로이 1세`)
  }

  console.log(`✅ 카로이 1세 부모 시딩 완료\n`)
}
