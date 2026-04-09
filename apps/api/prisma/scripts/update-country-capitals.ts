import { PrismaService } from '../prisma.service'

const CAPITALS: Record<string, string> = {
  KR: '서울',
  JP: '도쿄',
  CN: '베이징',
  IR: '테헤란',
  US: '워싱턴 D.C.',
  GB: '런던',
  FR: '파리',
  DE: '베를린',
  RU: '모스크바',
  TR: '앙카라',
  HU: '부다페스트',
  AT: '빈',
  RO: '부쿠레슈티',
  BG: '소피아',
  RS: '베오그라드',
  PL: '바르샤바',
  CZ: '프라하',
  SK: '브라티슬라바',
  IN: '뉴델리',
  ID: '자카르타',
  PK: '이슬라마바드',
  NG: '아부자',
  BR: '브라질리아',
  BD: '다카',
  MX: '멕시코시티',
  ET: '아디스아바바',
  PH: '마닐라',
  EG: '카이로',
  CD: '킨샤사',
  VN: '하노이',
  TH: '방콕',
  TZ: '도도마',
  ZA: '프리토리아',
  IT: '로마',
  KE: '나이로비',
  MM: '네피도',
  CO: '보고타',
  SD: '하르툼',
}

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  let updated = 0
  for (const [isoCode, capital] of Object.entries(CAPITALS)) {
    const r = await prisma.country.updateMany({
      where: { isoCode },
      data: { capital },
    })
    if (r.count > 0) {
      console.log(`  ✅ ${isoCode}: ${capital}`)
      updated += r.count
    } else {
      console.log(`  ⚠️  ${isoCode}: 국가 없음`)
    }
  }
  console.log(`\n총 ${updated}개 국가 수도 업데이트 완료`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
