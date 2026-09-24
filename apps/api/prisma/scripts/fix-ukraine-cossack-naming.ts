/**
 * 우크라이나 카자크 계열 두 행의 표기를 '코사크/자포로제' → '카자크/자포리자'로 정정한다.
 *
 *  · 코사크 헤트만국 → 카자크 수장국
 *  · 자포로제 시치   → 자포리자 카자크 시치
 *
 * 엔티티 시드는 이름 기준 create-only(skip-if-exists)라 이미 만들어진 행의 이름을 못 고친다.
 * 루마니아 공국 분할 때와 같은 일회성 fix 스크립트로 처리한다(fix-romania-principality-split 패턴).
 * id는 그대로라 계승·소속·현대 국가 링크는 손대지 않아도 그대로 따라온다.
 * 멱등: 이미 정정된 뒤 다시 돌리면 바뀌는 행이 없다.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

// 표기 정정 대상 = 우크라이나 시드가 소유한 17행(옛 이름·새 이름 모두 나열해 재실행에도 걸리게 한다)
const UKRAINE_ROW_NAMES = [
  '스키타이',
  '보스포로스 왕국',
  '하자르 칸국',
  '페레야슬라우 공국',
  '키예프 공국',
  '금장 칸국',
  '크림 칸국',
  '자포로제 시치',
  '자포리자 카자크 시치',
  '코사크 헤트만국',
  '카자크 수장국',
  '갈리치아-로도메리아 왕국',
  '부코비나 공국',
  '우크라이나 인민공화국',
  '우크라이나국',
  '서우크라이나 인민공화국',
  '카르파토우크라이나',
  '우크라이나 제국판무관부',
  '우크라이나 공화국',
]

function toKazak(text: string): string {
  return text
    .replace(/코사크 헤트만국/g, '카자크 수장국')
    .replace(/자포로제 시치/g, '자포리자 카자크 시치')
    .replace(/자포로제 군단/g, '자포리자 군단')
    .replace(/코사크/g, '카자크')
}

// 시드 파일과 같은 최종 문구 — 다른 표기를 일부러 병기하므로 일괄 치환 뒤에 따로 덮어쓴다
const NAME_ORIGIN_OVERRIDES: { name: string; nameOrigin: string }[] = [
  {
    name: '자포리자 카자크 시치',
    nameOrigin:
      '"자 포로하미(за порогами)" 곧 "드니프로 급류 너머"라는 뜻이고, ' +
      '시치(Січ)는 통나무를 깎아 두른 목책 요새를 가리킨다. ' +
      '러시아어식 표기를 따른 "자포로제 시치", 영어 표기를 옮긴 "코사크"도 같은 대상을 가리킨다.',
  },
  {
    name: '카자크 수장국',
    nameOrigin:
      '당대의 정식 이름은 "자포리자 군단(Військо Запорозьке)"이었고, ' +
      '군주에 해당하는 선출직 수장 헤트만(гетьман, 독일어 Hauptmann에서 유래)의 이름을 따 수장국이라 옮긴다. ' +
      '영어 Cossack을 옮긴 "코사크 헤트만국", 러시아어식 "자포로제 군단"도 같은 나라를 가리키는 표기다.',
  },
]

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    console.log('\n🇺🇦 카자크 표기 정정 시작...')

    const rows = await prisma.historicalCountry.findMany({
      where: { name: { in: UKRAINE_ROW_NAMES } },
      select: { id: true, name: true, nameOrigin: true, description: true },
    })

    let changed = 0
    for (const row of rows) {
      const data: { name?: string; nameOrigin?: string; description?: string } = {}

      const nextName = toKazak(row.name)
      if (nextName !== row.name) data.name = nextName

      // 병기 문구를 따로 덮어쓰는 행은 일괄 치환에서 뺀다(안 그러면 매 실행마다 치환↔복원을 되풀이한다)
      const hasNameOriginOverride = NAME_ORIGIN_OVERRIDES.some(
        (override) => override.name === nextName,
      )
      if (row.nameOrigin && !hasNameOriginOverride) {
        const nextNameOrigin = toKazak(row.nameOrigin)
        if (nextNameOrigin !== row.nameOrigin) data.nameOrigin = nextNameOrigin
      }
      if (row.description) {
        const nextDescription = toKazak(row.description)
        if (nextDescription !== row.description) data.description = nextDescription
      }

      if (Object.keys(data).length === 0) continue

      await prisma.historicalCountry.update({ where: { id: row.id }, data })
      console.log(`  ✏️  ${row.name}${data.name ? ` → ${data.name}` : ''} (${Object.keys(data).join(', ')})`)
      changed++
    }

    for (const override of NAME_ORIGIN_OVERRIDES) {
      const target = await prisma.historicalCountry.findFirst({
        where: { name: override.name },
        select: { id: true, nameOrigin: true },
      })
      if (!target) {
        console.warn(`  ⚠️  찾을 수 없음: ${override.name}`)
        continue
      }
      if (target.nameOrigin === override.nameOrigin) continue

      await prisma.historicalCountry.update({
        where: { id: target.id },
        data: { nameOrigin: override.nameOrigin },
      })
      console.log(`  ✏️  ${override.name} 이름 유래 병기 갱신`)
      changed++
    }

    console.log(`\n✅ 표기 정정 완료 (${changed}건 수정)\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('✨ 카자크 표기 정정 스크립트 종료\n'))
  .catch((err) => { console.error('\n❌ 실패:', err); process.exit(1) })
