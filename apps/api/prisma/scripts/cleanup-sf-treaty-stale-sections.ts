import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

const SF_EVENT_TITLE = '샌프란시스코 강화조약 체결'
const SECURITY_EVENT_TITLE = '미·일 안전보장조약 체결 (1951)'

const SF_KEEP_TITLES = [
  '주요 조항',
  '회의 진행 — 1951-09-04 ~ 09-08의 5일간',
  '한국 미초청과 청구권 — 1949~1951년 한·미·일 3각의 누락',
  '서명 거부 3국과 그로미코의 7개 수정안',
  '영토 조항 제2조 — "포기"는 명시했으나 "귀속"은 명시하지 않은 모호함',
  '미·일 안전보장조약 패키지 — 같은 날 도쿄가 아닌 샌프란시스코',
  '학설사·사료론 — 샌프란시스코 체제 연구의 4학파와 1차 사료',
]

const SECURITY_KEEP_TITLES = [
  '서명식 — 같은 날 오후 프레시디오 군기지',
  '본문 — 5개 조항의 비대칭 권리·의무 구조',
  '국내 비준 과정 — 일본 국회 1951-10-26과 미 상원 1952-03-20',
  '1960년 개정과 안보투쟁 — 60年安保闘争의 정치사',
]

async function deleteStale(prisma: PrismaService, eventTitle: string, keepTitles: string[]) {
  const event = await prisma.event.findFirst({
    where: { title: eventTitle, deletedAt: null },
    select: { id: true, title: true },
  })
  if (!event) {
    console.warn(`  ⚠️  사건 미존재: ${eventTitle}`)
    return
  }
  const sections = await prisma.eventSection.findMany({
    where: { eventId: event.id },
    select: { id: true, title: true, order: true },
    orderBy: { order: 'asc' },
  })
  console.log(`\n📌 ${event.title} (id=${event.id})`)
  console.log(`   현재 섹션: ${sections.length}개`)
  for (const sec of sections) {
    if (keepTitles.includes(sec.title)) {
      console.log(`   ✅ keep [${sec.order}] ${sec.title}`)
    } else {
      await prisma.eventSection.delete({ where: { id: sec.id } })
      console.log(`   🗑️  delete [${sec.order}] ${sec.title}`)
    }
  }
}

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  try {
    await deleteStale(prisma, SF_EVENT_TITLE, SF_KEEP_TITLES)
    await deleteStale(prisma, SECURITY_EVENT_TITLE, SECURITY_KEEP_TITLES)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ 구 섹션 정리 완료\n')
  })
  .catch((error) => {
    console.error('\n❌ 정리 실패:', error)
    process.exit(1)
  })
