import { TransitionEventType, TransitionScope } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ID = (n: number) =>
  `de000001-0000-0000-0000-${String(n).padStart(12, '0')}`

const EAST_FRANCIA = ID(1)
const HRE = ID(2)
const PRUSSIA_KINGDOM = ID(3)
const GERMAN_CONFED = ID(4)
const NORTH_GERMAN_CONFED = ID(5)
const GERMAN_EMPIRE = ID(6)
const WEIMAR = ID(7)
const NAZI = ID(8)
const WEST_GERMANY = ID(9)
const EAST_GERMANY = ID(10)
const PRUSSIA_DUCHY = ID(11)
const BRANDENBURG_MARK = ID(12)
const BRANDENBURG_PRUSSIA = ID(13)
const BAVARIA_KINGDOM = ID(14)
const BAVARIA_DUCHY = ID(15)
const SAXONY_KINGDOM = ID(16)
const SAXONY_ELECTORATE = ID(17)
// hanover, wurttemberg, baden, hesse — 18..21
const TEUTONIC_ORDER = ID(22)
const RHINE_CONFED = ID(23)
const SOVIET_ZONE = ID(24)
const ALLIED_OCCUPIED = ID(25)

// [predecessor, successor, eventType, scope]
const TRANSITIONS: Array<
  [string, string, TransitionEventType, TransitionScope]
> = [
  // 동프랑크 → 신성로마제국
  [EAST_FRANCIA, HRE, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  // 튜튼 기사단국 → 프로이센 공국 (세속화)
  [TEUTONIC_ORDER, PRUSSIA_DUCHY, TransitionEventType.SECULARIZATION, TransitionScope.STATE_SUCCESSION],
  // 프로이센 공국 & 브란덴부르크 → 브란덴부르크-프로이센 (동군연합)
  [PRUSSIA_DUCHY, BRANDENBURG_PRUSSIA, TransitionEventType.UNION, TransitionScope.STATE_SUCCESSION],
  [BRANDENBURG_MARK, BRANDENBURG_PRUSSIA, TransitionEventType.UNION, TransitionScope.STATE_SUCCESSION],
  // 브란덴부르크-프로이센 → 프로이센 왕국 (1701 왕국 승격)
  [BRANDENBURG_PRUSSIA, PRUSSIA_KINGDOM, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  // 신성로마제국 해체 → 라인 동맹 (1806)
  [HRE, RHINE_CONFED, TransitionEventType.DISSOLVED, TransitionScope.STATE_SUCCESSION],
  // 라인 동맹 → 독일 연방 (빈 회의)
  [RHINE_CONFED, GERMAN_CONFED, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  // 독일 연방 → 북독일 연방 (1866 해체 후)
  [GERMAN_CONFED, NORTH_GERMAN_CONFED, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  // 북독일 연방 → 독일 제국 (통일)
  [NORTH_GERMAN_CONFED, GERMAN_EMPIRE, TransitionEventType.UNIFICATION, TransitionScope.STATE_SUCCESSION],
  // 프로이센 왕국 → 독일 제국 (주도 통일, 왕국은 제국 구성국으로 존속)
  [PRUSSIA_KINGDOM, GERMAN_EMPIRE, TransitionEventType.UNIFICATION, TransitionScope.STATE_SUCCESSION],
  // 독일 제국 → 바이마르 공화국 (1918 11월 혁명)
  [GERMAN_EMPIRE, WEIMAR, TransitionEventType.SUCCESSION, TransitionScope.REGIME_CHANGE],
  // 바이마르 → 나치 독일 (1933 정권 장악)
  [WEIMAR, NAZI, TransitionEventType.SUCCESSION, TransitionScope.REGIME_CHANGE],
  // 나치 독일 → 연합군 점령 독일 (1945 패전)
  [NAZI, ALLIED_OCCUPIED, TransitionEventType.DISSOLVED, TransitionScope.STATE_SUCCESSION],
  // 연합군 점령 독일 → 서독
  [ALLIED_OCCUPIED, WEST_GERMANY, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  // 연합군 점령 독일 → 소련 점령지 (분열)
  [ALLIED_OCCUPIED, SOVIET_ZONE, TransitionEventType.SPLIT, TransitionScope.STATE_SUCCESSION],
  // 소련 점령지 → 동독
  [SOVIET_ZONE, EAST_GERMANY, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  // 동독 → 서독 (1990 흡수 통일)
  [EAST_GERMANY, WEST_GERMANY, TransitionEventType.UNIFICATION, TransitionScope.STATE_SUCCESSION],

  // 방(Land) 단위 승격
  [BAVARIA_DUCHY, BAVARIA_KINGDOM, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
  [SAXONY_ELECTORATE, SAXONY_KINGDOM, TransitionEventType.SUCCESSION, TransitionScope.STATE_SUCCESSION],
]

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  let created = 0
  for (const [predecessorId, successorId, eventType, scope] of TRANSITIONS) {
    const existing = await prisma.historicalCountryTransition.findFirst({
      where: { predecessorId, successorId, eventType },
    })
    if (existing) {
      console.log(`  ⏭️  이미 존재: ${predecessorId.slice(-3)} → ${successorId.slice(-3)} (${eventType})`)
      continue
    }
    await prisma.historicalCountryTransition.create({
      data: { predecessorId, successorId, eventType, transitionScope: scope },
    })
    created += 1
    console.log(`  ✅ ${predecessorId.slice(-3)} → ${successorId.slice(-3)} (${eventType} / ${scope})`)
  }
  console.log(`\n총 ${created}개 변천 관계 신규 등록 (전체 ${TRANSITIONS.length}개 정의)`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
