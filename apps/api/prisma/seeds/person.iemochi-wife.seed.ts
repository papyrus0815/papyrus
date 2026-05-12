/**
 * 도쿠가와 이에모치(14대 쇼군)의 정실 가즈노미야 지카코 내친왕 시드.
 *
 *   인물: 가즈노미야 지카코 내친왕(和宮親子内親王, 1846-07-03 ~ 1877-09-02)
 *     - 닌코 천황(仁孝天皇, 第120代)의 8번째 황녀. 부친 사망 약 5개월 후 출생한 유복녀.
 *     - 동복 오빠: 고메이 천황(孝明天皇, 第121代).
 *     - 통칭 "가즈노미야(和宮)" — 1850년 4세 때 영친왕 선하(宣下)로 받은 미야호(宮号).
 *     - 1862-02-11(분큐 2년 음력 1월 13일) 에도성에서 14대 쇼군 도쿠가와 이에모치와 결혼.
 *       막부 말기 "공무합체(公武合体, 조정·막부 일체화)" 정책의 상징적 사건.
 *     - 1866-08-29 이에모치의 진중 사망 후 출가 → 법명 세이칸인노미야(静寛院宮).
 *     - 1868 도바·후시미 전투·에도성 무혈 개성 협상 시 도쿠가와가 보호에 일조.
 *     - 1877-09-02 하코네 토노자와(塔之沢) 온천에서 각기성 심부전으로 향년 31세에 사망.
 *
 *   ⚠️ 기존 데이터 보존 모드.
 *   ⚠️ 의존: 도쿠가와 이에모치(14대) + 황실 가문 + 도쿠가와 막부 HC 모두 기등록.
 *
 * 등록 항목:
 *   - Person x1 (가즈노미야 지카코 내친왕)
 *   - PersonStats x1
 *   - PersonCountryAffiliation x1 (도쿠가와 막부 CITIZENSHIP)
 *   - PersonSpouse x2 (양방향: 1862-02-11 ~ 1866-08-29 — 이에모치 사망으로 종료)
 */
import { DeathType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const KAZUNOMIYA = {
  name: '지카코',
  // 일본 황실은 성씨 없음
  surname: undefined as string | undefined,
  originalName: 'Kazunomiya Chikako (和宮親子内親王)',
  regnalName: '가즈노미야 내친왕',
  birthYear: 1846,
  birthMonth: 7,
  birthDay: 3,
  deathYear: 1877,
  deathMonth: 9,
  deathDay: 2,
  birthPlaceText: '교토 가타쓰지 어소(姉小路第) — 현 교토부 교토시 가미교구',
  deathPlaceText: '사가미국 하코네 토노자와(塔之沢) 온천 — 현 가나가와현 하코네마치',
  deathType: DeathType.ILLNESS,
  deathCause: '각기성 심부전 (脚気衝心, 향년 31세)',
  deathNote:
    '1877-09-02(메이지 10년) 하코네 토노자와 온천 가가야(角屋) 료칸에서 향년 31세에 사망. 사망 ' +
    '약 2주 전부터 다리 부종·호흡 곤란 등 각기증(脚気)이 급속히 진행, 도쿄에서 정양 차 하코네 ' +
    '온천에 머무르던 중 심부전 합병으로 급사했다. 사인은 부군 14대 이에모치(1866-08 각기성 ' +
    '심부전 사망)와 동일 — 동시기 도쿠가와가의 식이·궁중 생활 환경이 백미식 의존으로 비타민 B1 ' +
    '결핍성 각기를 일으켰다는 분석이 후일 통설. 임종 시 측근 시녀 쓰치미카도 후지코(土御門藤子) 등 ' +
    '동석. 유언은 "이에모치 옆에 묻어 달라" — 시신은 부군 이에모치가 안치된 시바 조조지(増上寺) ' +
    '도쿠가와가 영묘에 옆자리로 합장되었다(1959 발굴 조사 시 좌측 부장품 중 이에모치 추정 인물의 ' +
    '습판 사진이 발견되어 큰 화제). 본인 자신은 만 31세 짧은 생애.',
  biography:
    '에도 막부 14대 쇼군 도쿠가와 이에모치의 정실(재위 1862-02-11 ~ 1866-08-29)·일본 황실 ' +
    '닌코 천황(仁孝天皇, 第120代)의 8번째 황녀. 1846년 7월 3일(고카 3년 음력 윤5월 10일) 교토 ' +
    '가타쓰지 어소에서 출생, 본명은 지카코 친왕(親子内親王). 부친 닌코 천황이 1846-02-21 향년 ' +
    '45세에 사망한 약 5개월 후의 유복녀로 태어났다. 모친은 닌코 천황의 측실 칸교인(観行院) ' +
    '하시모토 쓰네코(橋本経子, 1826~1865) — 출생 시 모친은 만 19세.\n\n' +
    '1850년 가즈노미야 미야호 수여. 1850-08(가에이 3년) 만 4세에 영친왕 선하를 받아 "가즈노미야 ' +
    '(和宮)" 미야호 수여. 동시에 친왕 칭호 부여. 동복 오빠는 1846년 즉위한 효명 천황(孝明天皇, ' +
    '제121대, 1831~1867) — 가즈노미야 출생 당시 14세였다.\n\n' +
    '1851 약혼 — 아리스가와노미야. 1851-07 만 5세에 아리스가와노미야 다루히토 친왕(有栖川宮 ' +
    '熾仁親王, 1835~1895, 후일 메이지 정부 군 사령관)과 약혼. 황녀 정혼의 통례에 따라 황족 ' +
    '내 약혼이었으며 약 9년간 약혼 관계가 지속됐다.\n\n' +
    '1860 막부 결혼 요구. 1860년 4월 막부 로주 안도 노부마사(安藤信正)가 "공무합체(公武合体, ' +
    '조정·막부 일체화) 정책"의 일환으로 효명 천황에 가즈노미야와 14대 쇼군 이에모치(당시 14세)의 ' +
    '결혼을 요청. 효명 천황은 1860-10 양이(攘夷) 단행 약속을 조건으로 동의, 가즈노미야 본인은 ' +
    '강하게 반대했으나 결국 친오빠인 천황의 명령으로 약혼을 파기하고 막부와의 정략결혼에 응했다.\n\n' +
    '1861 에도 행렬. 1861-10-20 ~ 11-15 교토→에도 약 27일간의 결혼 행렬(降嫁行列). 약 30,000명 ' +
    '규모의 호위 행렬로 일본 근세사 최대 규모의 결혼 행렬. 인접 12개 번에 호위 임무 부여. 행렬은 ' +
    '중산도(中山道)를 따라 행해졌으며 인근 농민들에게 부담이 컸다는 기록이 다수.\n\n' +
    '1862 결혼 — "공무합체"의 상징. 1862-02-11(분큐 2년 음력 1월 13일) 에도성에서 만 15세의 ' +
    '가즈노미야가 만 15세의 14대 쇼군 도쿠가와 이에모치와 정식 결혼. 막부 사상 황녀가 쇼군 ' +
    '정실이 된 최초이자 유일한 사례. 정략결혼이었으나 동갑 부부였고, 동시기 일화는 "둘이 서로 ' +
    '깊이 사랑했다"는 우호적 평가가 다수. 자녀는 없었다.\n\n' +
    '시고모 덴쇼인과의 갈등. 시고모(시모(姑)) 덴쇼인(天璋院, 본명 시마즈 아쓰코[篤姫], 1836~1883, ' +
    '13대 이에사다 정실)과는 출신·문화 차이(교토 황실 vs 사쓰마 무가)·시아버지 자리 다툼 등으로 ' +
    '오오쿠(大奥) 내 긴장 관계. 그러나 후일 1868 도바·후시미 패전 시 두 사람 모두 도쿠가와가 ' +
    '존속을 위해 협력했고, 만년에는 화해.\n\n' +
    '1866 이에모치 사망 — 출가. 1866-08-29 부군 이에모치가 제2차 조슈 정벌 진중(오사카성)에서 ' +
    '향년 20세에 각기성 심부전으로 사망. 본인은 에도성에서 임종 동석하지 못했다. 사망 약 1개월 ' +
    '후 출가, 법명 "세이칸인노미야(静寛院宮)"로 개명. 만 20세에 미망인이 되었다.\n\n' +
    '1867~1868 막부 종말 — 보신 전쟁 협상. 1867-11 친오빠 효명 천황 사망 → 메이지 천황 즉위. ' +
    '1868-01 도바·후시미 전투에서 막부군 패전. 본인은 (1)도쿠가와가의 가문 존속 보장 (2)15대 ' +
    '요시노부의 신변 보호 (3)에도성 무혈 개성(1868-04-11) 등의 협상에 가쓰 가이슈·사이고 ' +
    '다카모리·시고모 덴쇼인과 더불어 일조. 황녀 신분의 정치적 무게가 결정적으로 작용한 사례.\n\n' +
    '1869~1877 — 메이지 시대 만년. 1869년 도쿄성(에도성) 황궁화로 인해 도쿠가와 가문 시즈오카 ' +
    '70만 석으로 격감되자 본인도 시즈오카 일시 거주 후 1869-08 교토로 귀환. 1874-07 다시 ' +
    '도쿄로 이주해 황실 보호 아래 거주. 1877-09-02 하코네 토노자와 온천 정양 중 각기성 ' +
    '심부전으로 향년 31세에 사망. 부군 이에모치 옆 시바 조조지에 합장.\n\n' +
    '장기 유산. (1)막부 사상 황녀가 쇼군 정실이 된 유일 사례 → "공무합체" 정책의 상징 (2)1868 ' +
    '에도성 무혈 개성·도쿠가와가 존속 협상의 핵심 인물 — 황녀 신분의 정치적 무게 (3)부부 합장 ' +
    '및 1959년 발굴 시 사진 발견 일화로 부부 정애의 상징 (4)만 31세 단명·자녀 부재 → 14대 ' +
    '이에모치 직계 단절 → 15대 요시노부(미토 출신·히토쓰바시가 양자) 즉위 → 대정봉환의 인과적 ' +
    '연쇄에서 한 분기점.',
  influence: 70,
  stats: {
    politics: 60,
    military: 20,
    diplomacy: 75,
    intellect: 70,
    charisma: 75,
    administration: 45,
    notes:
      '막부 말기 황실·막부 정치의 결정적 매개. 정치 능력은 1868 에도성 무혈 개성·도쿠가와가 ' +
      '존속 협상에서 황녀 신분의 정치적 무게를 적극 활용한 점에서 양호. 외교는 동복 오빠 효명 ' +
      '천황·메이지 천황과의 황실 채널·사이고 다카모리/가쓰 가이슈와의 협상 등에서 결정적 역할. ' +
      '학식은 황실 교육으로 한학·와카·서예 등에서 우수. 카리스마는 황녀 출신·정략결혼 거부 후 ' +
      '결국 응한 결단·만년 도쿠가와가 보호 활동 등 동시기 일본 여성 중 최고급. 행정·군사는 ' +
      '신분상 직접 관여 없음. 본인 자신은 정략결혼·이른 미망인·자녀 부재·만 31세 단명의 비극적 ' +
      '생애였으나 막부 말기 일본 정치사에 결정적 흔적을 남긴 황녀.',
  },
} as const

export async function seedIemochiWife(prisma: PrismaService): Promise<void> {
  console.log('\n👰 도쿠가와 이에모치 정실(가즈노미야 지카코 내친왕) 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  admin 미존재')
    return
  }
  const imperial = await prisma.dynasty.findFirst({ where: { name: '황실' } })
  if (!imperial) {
    console.warn('  황실 가문 미존재 — seedJapanMeiji 먼저 실행 필요')
    return
  }
  const tokugawaHC = await prisma.historicalCountry.findFirst({
    where: { name: '도쿠가와 막부' },
  })
  if (!tokugawaHC) {
    console.warn('  도쿠가와 막부 HC 미존재')
    return
  }
  const iemochi = await prisma.person.findFirst({
    where: { originalName: 'Tokugawa Iemochi' },
    select: { id: true },
  })
  if (!iemochi) {
    console.warn('  도쿠가와 이에모치 미존재')
    return
  }

  // ── 1) Person ─────────────────────────────────────────────────────────
  let kazunomiyaId: string
  const existing = await prisma.person.findFirst({
    where: { originalName: KAZUNOMIYA.originalName },
  })
  if (existing) {
    console.log(`  인물 스킵: ${KAZUNOMIYA.originalName} (id=${existing.id})`)
    kazunomiyaId = existing.id
  } else {
    const created = await prisma.person.create({
      data: {
        name: KAZUNOMIYA.name,
        surname: KAZUNOMIYA.surname,
        originalName: KAZUNOMIYA.originalName,
        regnalName: KAZUNOMIYA.regnalName,
        biography: KAZUNOMIYA.biography,
        birthDate: new Date(
          KAZUNOMIYA.birthYear,
          KAZUNOMIYA.birthMonth - 1,
          KAZUNOMIYA.birthDay,
        ),
        birthEra: 'AD' as any,
        deathDate: new Date(
          KAZUNOMIYA.deathYear,
          KAZUNOMIYA.deathMonth - 1,
          KAZUNOMIYA.deathDay,
        ),
        deathEra: 'AD' as any,
        gender: 'FEMALE',
        nameDisplayOrder: 'korean' as any,
        dynastyId: imperial.id,
        birthPlaceText: KAZUNOMIYA.birthPlaceText,
        deathPlaceText: KAZUNOMIYA.deathPlaceText,
        deathType: KAZUNOMIYA.deathType,
        deathCause: KAZUNOMIYA.deathCause,
        deathNote: KAZUNOMIYA.deathNote,
        influence: KAZUNOMIYA.influence,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${KAZUNOMIYA.originalName} (id=${created.id})`)
    kazunomiyaId = created.id
  }

  // ── 2) PersonStats ────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId: kazunomiyaId, accountId: admin.id },
  })
  if (statsExists) {
    console.log('  가즈노미야 능력치 스킵')
  } else {
    await prisma.personStats.create({
      data: {
        personId: kazunomiyaId,
        accountId: admin.id,
        politics: KAZUNOMIYA.stats.politics,
        military: KAZUNOMIYA.stats.military,
        diplomacy: KAZUNOMIYA.stats.diplomacy,
        intellect: KAZUNOMIYA.stats.intellect,
        charisma: KAZUNOMIYA.stats.charisma,
        administration: KAZUNOMIYA.stats.administration,
        notes: KAZUNOMIYA.stats.notes,
      },
    })
    console.log('  ✅ 가즈노미야 능력치 등록')
  }

  // ── 3) PersonCountryAffiliation (도쿠가와 막부 CITIZENSHIP) ──────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId: kazunomiyaId,
      historicalCountryId: tokugawaHC.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (!affExists) {
    await prisma.personCountryAffiliation.create({
      data: {
        personId: kazunomiyaId,
        historicalCountryId: tokugawaHC.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log('  ✅ 소속국가: 가즈노미야 → 도쿠가와 막부')
  }

  // ── 4) PersonSpouse (양방향) ────────────────────────────────────────
  const marriageStart = new Date(1862, 1, 11) // 1862-02-11
  const marriageEnd = new Date(1866, 7, 29) // 1866-08-29 이에모치 사망
  const marriageNote =
    '1862-02-11(분큐 2년 음력 1월 13일) 에도성에서 만 15세 동갑 부부로 결혼. 막부 말기 ' +
    '"공무합체(公武合体)" 정책의 상징적 사건이자 막부 사상 황녀가 쇼군 정실이 된 유일 사례. ' +
    '정략결혼이었으나 동시기 일화는 "둘이 서로 깊이 사랑했다"는 우호적 평가가 다수. 자녀는 없었다. ' +
    '1866-08-29 이에모치가 제2차 조슈 정벌 진중(오사카성)에서 향년 20세에 각기성 심부전으로 ' +
    '사망 → 사별. 부부 합장은 시바 조조지 도쿠가와가 영묘.'

  for (const [aId, bId, label] of [
    [iemochi.id, kazunomiyaId, '이에모치 → 가즈노미야'],
    [kazunomiyaId, iemochi.id, '가즈노미야 → 이에모치'],
  ] as const) {
    const spouseExists = await prisma.personSpouse.findFirst({
      where: { personId: aId, spouseId: bId },
    })
    if (spouseExists) {
      console.log(`  결혼 스킵: ${label}`)
      continue
    }
    await prisma.personSpouse.create({
      data: {
        personId: aId,
        spouseId: bId,
        marriageStartDate: marriageStart,
        marriageEndDate: marriageEnd,
        note: marriageNote,
      },
    })
    console.log(`  ✅ 결혼: ${label}`)
  }

  console.log('✅ 도쿠가와 이에모치 정실(가즈노미야) 시딩 완료\n')
}
