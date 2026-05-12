/**
 * 사망정보(deathType·deathCause·deathNote) 누락된 9명을 보강.
 *
 *  - 모두 이미 deathDate는 있으나 type/cause/note가 비어 있음.
 *  - biography에서 사용한 특수문자(〈〉, 【】, ①②③)는 가능한 자제하고 자연스러운 한국어 문장으로 작성.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { DeathType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

type Patch = {
  originalName: string
  deathType: DeathType
  deathCause: string
  deathPlaceText?: string
  deathNote: string
}

const PATCHES: Patch[] = [
  {
    originalName: 'Friedrich III, Holy Roman Emperor',
    deathType: DeathType.ILLNESS,
    deathCause: '다리 절단 수술 합병증 (향년 77세)',
    deathPlaceText: '오스트리아 대공국 린츠(Linz)',
    deathNote:
      '1493년 8월 19일 린츠에서 향년 77세에 사망했다. 만년에 동맥경화로 왼쪽 다리에 괴저가 진행되어 ' +
      '1493년 6월 8일 다리 절단 수술을 받았다. 78세 노령에 마취 없이 받은 수술의 충격으로 약 두 달 ' +
      '동안 회복하지 못하고 사망했다. 시신은 빈의 슈테판 대성당에 안치되었다. 약 53년의 신성 로마 ' +
      '제국 황제 재위는 합스부르크 가문 사상 최장기로, 그의 아들 막시밀리안 1세가 1493년 8월 19일 ' +
      '바로 후계 즉위했다.',
  },
  {
    originalName: 'Charles the Bold (Duke of Burgundy)',
    deathType: DeathType.BATTLE,
    deathCause: '낭시 전투에서 전사 (향년 43세)',
    deathPlaceText: '로렌 공국 낭시(Nancy)',
    deathNote:
      '1477년 1월 5일 낭시 전투에서 향년 43세에 전사했다. 부르고뉴 군대 약 1만 2천 명이 로렌 공작 ' +
      '르네 2세와 스위스 동맹 군 약 1만 9천 명에 패배한 결정적 전투였다. 샤를은 전투 중 머리에 ' +
      '미늘창을 맞고 전사했다. 시신은 약 사흘 후 낭시 인근 늪에서 발견되었으며, 야생 늑대에 부분 ' +
      '훼손된 상태였다. 시신은 처음 낭시에 안치되었다가 1550년 손자뻘인 카를 5세의 명령으로 ' +
      '브뤼헤 성모 성당으로 이장되어 모친 이사벨라 데 포르투갈의 옆에 안치되었다. 그의 사망으로 ' +
      '외동딸 마리 데 부르고뉴가 약 250만 평방킬로미터의 부르고뉴 영지를 단독 상속하면서, 같은 ' +
      '해 합스부르크 막시밀리안 1세와 결혼해 부르고뉴 영지가 합스부르크 가문으로 이전되는 결정적 ' +
      '계기가 되었다.',
  },
  {
    originalName: 'Eleanor of Portugal (Holy Roman Empress)',
    deathType: DeathType.ILLNESS,
    deathCause: '산후 합병증 (향년 33세)',
    deathPlaceText: '오스트리아 대공국 비너 노이슈타트(Wiener Neustadt)',
    deathNote:
      '1467년 9월 3일 비너 노이슈타트에서 향년 33세에 사망했다. 사인은 일곱째 자녀를 출산한 직후의 ' +
      '합병증으로 알려져 있다. 결혼 15년 동안 5남 2녀를 두었으나 그중 3명만 성인까지 살아남았다. ' +
      '살아남은 자녀 중 장남이 후일 신성 로마 황제 막시밀리안 1세가 된다. 시신은 비너 노이슈타트의 ' +
      '시토회 노이클로스터 수도원에 안치되었으며, 약 26년 후 사망한 남편 프리드리히 3세는 빈 슈테판 ' +
      '대성당에 따로 안치되었다.',
  },
  {
    originalName: 'Isabella of Bourbon',
    deathType: DeathType.ILLNESS,
    deathCause: '결핵 (향년 30세)',
    deathPlaceText: '브라반트 공국 안트베르펜(Antwerp)',
    deathNote:
      '1465년 9월 25일 안트베르펜에서 향년 30세에 결핵으로 사망했다. 약 2년간 호흡 곤란과 발열이 ' +
      '점진적으로 악화되었으며, 동시기 의사들은 효과적 치료를 시도하지 못했다. 시신은 안트베르펜 ' +
      '대성당에 임시 안치되었다가 후일 부르고뉴 가문 묘소로 이장되었다. 사망 당시 외동딸 마리 데 ' +
      '부르고뉴는 8세였으며, 양모 마르가레타 데 요크의 양육을 받게 되었다.',
  },
  {
    originalName: 'Manuel I of Portugal',
    deathType: DeathType.ILLNESS,
    deathCause: '발열성 전염병 (향년 52세)',
    deathPlaceText: '포르투갈 왕국 리스본 리베이라 궁(Paço da Ribeira)',
    deathNote:
      '1521년 12월 13일 리스본에서 향년 52세에 사망했다. 사인은 동시기 기록상 발열성 전염병으로, ' +
      '약 1주일간의 급성 진행 끝에 사망했다. 시신은 처음 리스본의 산타 마리아 데 벨렘 수도원에 ' +
      '임시 안치되었다가 후일 동일 수도원의 제로니무스 수도원 본당에 정식 매장되었다. 약 26년의 ' +
      '재위 동안 인도양 항로 개척과 브라질 발견을 후원한 〈대항해 시대〉 포르투갈의 정점 군주로 ' +
      '평가받는다. 그의 사망 직후 장남 주앙 3세가 19세 나이에 즉위했다.',
  },
  {
    originalName: 'Maria of Aragon (Queen of Portugal)',
    deathType: DeathType.ILLNESS,
    deathCause: '출산 후 산후 합병증 (향년 35세)',
    deathPlaceText: '포르투갈 왕국 리스본',
    deathNote:
      '1517년 3월 7일 리스본에서 향년 35세에 사망했다. 결혼 17년 동안 10명의 자녀를 출산했으며, ' +
      '마지막 출산 직후 산후 합병증으로 사망한 것으로 알려져 있다. 시신은 리스본의 산타 마리아 데 ' +
      '벨렘 수도원에 안치되었다. 살아남은 자녀 중 장남 주앙 3세가 후일 포르투갈 18대 국왕이 ' +
      '되었으며, 차녀 이사벨이 신성 로마 황제 카를 5세의 황후가 되어 펠리페 2세의 모친이 된다. ' +
      '카탈리나는 카를 5세의 동생 페르디난트 1세와 결혼해 후일 합스부르크 오스트리아 라인의 모친이 ' +
      '되어, 마리아의 자녀들이 16세기 합스부르크-아비스 통합의 핵심 매개자가 되었다.',
  },
  {
    originalName: 'Maximilian II, Holy Roman Emperor',
    deathType: DeathType.ILLNESS,
    deathCause: '심부전 (향년 49세)',
    deathPlaceText: '바이에른 공국 레겐스부르크(Regensburg)',
    deathNote:
      '1576년 10월 12일 레겐스부르크에서 향년 49세에 사망했다. 사인은 동시기 진단상 심장 약화로, ' +
      '말년에 잦은 발작과 호흡 곤란이 누적되어 결국 심부전으로 사망한 것으로 평가된다. 시신은 ' +
      '프라하 성 비투스 대성당에 안치되었다. 사망 당시 신성 로마 제국·헝가리·보헤미아 왕위는 모두 ' +
      '장남 루돌프 2세에게 무리 없이 계승되었다. 약 12년의 짧은 재위 동안 종교 관용 정책으로 ' +
      '신·구교 사이의 갈등을 완화시킨 군주로 평가받는다.',
  },
  {
    originalName: 'Maria of Spain (Holy Roman Empress)',
    deathType: DeathType.ILLNESS,
    deathCause: '노환 (향년 74세)',
    deathPlaceText: '카스티야 왕국 마드리드 라스 데스칼사스 레알레스 수녀원(Las Descalzas Reales)',
    deathNote:
      '1603년 2월 26일 마드리드의 라스 데스칼사스 레알레스 수녀원에서 향년 74세에 노환으로 사망했다. ' +
      '1576년 남편 막시밀리안 2세의 사망 후 1581년 스페인으로 귀국, 라스 데스칼사스 레알레스 ' +
      '수녀원에 입소해 약 22년간 평신도 신분으로 거주하며 신앙에 헌신한 만년을 보냈다. 시신은 ' +
      '동일 수녀원에 안치되었으며 21세기 현재까지 보존되고 있다. 결혼 28년 동안 16명의 자녀를 ' +
      '출산했으나 그중 6명만 성인까지 살아남았다. 살아남은 자녀 중 장녀 안나는 펠리페 2세의 네 ' +
      '번째 황후가 되어 펠리페 3세의 모친이 되었다.',
  },
  {
    originalName: 'Philip III of Spain',
    deathType: DeathType.ILLNESS,
    deathCause: '발열성 질환 (향년 42세)',
    deathPlaceText: '카스티야 왕국 마드리드 알카사르 왕궁(Alcázar of Madrid)',
    deathNote:
      '1621년 3월 31일 마드리드 알카사르 왕궁에서 향년 42세에 사망했다. 사인은 동시기 기록상 발열성 ' +
      '질환으로, 약 두 달 동안 점진적으로 악화된 끝에 사망했다. 동시기 평가는 〈경건한 왕(El Piadoso)〉 ' +
      '으로 신앙심이 깊었으나, 통치 실권은 측근 레르마 공작이 약 20년간 행사한 〈무력한 군주〉라는 ' +
      '평가가 우세했다. 시신은 엘 에스코리알 왕가 묘소에 안치되었다. 사망 당시 후계자 펠리페 4세는 ' +
      '16세였으며 즉시 즉위해 또 다른 측근 올리바레스 백공작의 정치를 받아들이게 된다.',
  },
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    console.log(`\n사망정보 보강 시작 — 총 ${PATCHES.length}명\n`)
    let patched = 0
    let skipped = 0
    let missing = 0
    for (const p of PATCHES) {
      const person = await prisma.person.findFirst({ where: { originalName: p.originalName } })
      if (!person) {
        console.log(`  ⚠️  미존재: ${p.originalName}`)
        missing++
        continue
      }
      const data: any = {}
      if (!person.deathType) data.deathType = p.deathType
      if (!person.deathCause) data.deathCause = p.deathCause
      if (!person.deathNote) data.deathNote = p.deathNote
      if (!person.deathPlaceText && p.deathPlaceText) data.deathPlaceText = p.deathPlaceText
      if (Object.keys(data).length === 0) {
        console.log(`  ⏭️  스킵 (이미 보강됨): ${p.originalName}`)
        skipped++
        continue
      }
      await prisma.person.update({ where: { id: person.id }, data })
      console.log(`  ✅ 보강: ${p.originalName} — ${Object.keys(data).join(', ')}`)
      patched++
    }
    console.log(`\n결과: ${patched} 보강 / ${skipped} 스킵 / ${missing} 미존재\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
