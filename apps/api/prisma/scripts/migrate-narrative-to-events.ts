/**
 * 선거(`election.description`)·재임 기록(`tenure_achievement.description`)에만
 * 본문이 있고 `event_id`가 비어 있는 행에 대해:
 * - `event` 행을 생성하고(정본)
 * - 해당 선거/재임 업적에 `event_id`를 연결합니다.
 *
 * 실행 (저장소 루트, env.development 등 DB 접속 가능한 상태):
 *   npx tsx apps/api/prisma/scripts/migrate-narrative-to-events.ts --dry-run
 *   npx tsx apps/api/prisma/scripts/migrate-narrative-to-events.ts
 *
 * 옵션:
 *   --dry-run                          DB 쓰기 없이 대상 건수만 출력
 *   --clear-source-descriptions        (1) 새로 연결할 때 함께 비우거나, (2) 이미 event_id가 있는데
 *                                      선거/재임에 description이 남아 있으면 그걸 NULL로 비움 (2번째 실행용)
 *   --elections-only | --achievements-only   한쪽만 처리
 *
 * 등록자: 첫 번째 ADMIN 사용자(`created_by`). 필요 시 환경변수로 덮어쓸 수 있음:
 *   MIGRATE_EVENTS_CREATED_BY=<user uuid>
 */
import * as dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import * as path from 'node:path'

import { PrismaService } from '../prisma.service'

function loadEnv() {
  const root = process.cwd()
  const envPath = path.join(root, 'env.development')
  dotenv.config({ path: envPath })
  if (!process.env.MYSQL_HOST) {
    dotenv.config()
  }
}

function hasMeaningfulHtmlText(s: string | null | undefined): boolean {
  if (s == null) return false
  const plain = s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.length > 0
}

function truncateTitle(s: string, max = 100): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

async function main() {
  loadEnv()

  const dryRun = process.argv.includes('--dry-run')
  const clearSource = process.argv.includes('--clear-source-descriptions')
  const electionsOnly = process.argv.includes('--elections-only')
  const achievementsOnly = process.argv.includes('--achievements-only')

  if (electionsOnly && achievementsOnly) {
    console.error('Use only one of --elections-only / --achievements-only')
    process.exit(1)
  }

  const prisma = new PrismaService({ log: !dryRun })

  const createdByOverride = process.env.MIGRATE_EVENTS_CREATED_BY?.trim()
  const adminUser =
    createdByOverride != null && createdByOverride.length > 0
      ? await prisma.user.findUnique({ where: { id: createdByOverride } })
      : await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
        })

  if (!adminUser) {
    throw new Error(
      '등록자 사용자를 찾을 수 없습니다. ADMIN 계정이 있거나 MIGRATE_EVENTS_CREATED_BY 를 설정하세요.',
    )
  }

  console.log(`등록자(created_by): ${adminUser.id} (${adminUser.email})`)
  console.log(
    dryRun
      ? '🔍 DRY-RUN — DB에 쓰지 않습니다.'
      : '✍️  실행 — event 생성 및 event_id 연결',
  )
  if (clearSource && !dryRun) {
    console.log(
      '⚠️  --clear-source-descriptions: 정본은 event 이므로 선거/재임의 중복 description 을 비웁니다.',
    )
  }

  let createdEvents = 0
  let linkedElections = 0
  let linkedAchievements = 0
  let clearedElectionDescriptions = 0
  let clearedAchievementDescriptions = 0

  const runElections = !achievementsOnly
  const runAchievements = !electionsOnly

  if (runElections) {
    const elections = await prisma.election.findMany({
      where: { eventId: null },
      select: {
        id: true,
        name: true,
        description: true,
        pollDate: true,
        countryId: true,
        historicalCountryId: true,
      },
    })

    const targets = elections.filter((e) => hasMeaningfulHtmlText(e.description))

    console.log(`\n[선거] event_id 비어 있고 description 있는 행: ${targets.length}건`)

    for (const e of targets) {
      const eventId = randomUUID()
      const title = truncateTitle(e.name)
      const description = e.description!.trim()

      if (dryRun) {
        console.log(`  - would create event ${eventId} ← election ${e.id} "${title.slice(0, 40)}…"`)
        continue
      }

      await prisma.$transaction(async (tx) => {
        await tx.event.create({
          data: {
            id: eventId,
            title,
            description,
            startDate: e.pollDate,
            startDatePrecision: 'day',
            historicalCountryId: e.historicalCountryId,
            createdById: adminUser.id,
          },
        })

        if (e.countryId && !e.historicalCountryId) {
          await tx.eventCountryRelation.create({
            data: {
              eventId,
              countryId: e.countryId,
              role: 'PARTICIPANT',
            },
          })
        }

        await tx.election.update({
          where: { id: e.id },
          data: {
            eventId,
            ...(clearSource ? { description: null } : {}),
          },
        })
      })

      createdEvents += 1
      linkedElections += 1
    }
  }

  if (runAchievements) {
    const achievements = await prisma.tenureAchievement.findMany({
      where: { eventId: null },
      include: {
        tenure: {
          select: {
            countryId: true,
            historicalCountryId: true,
          },
        },
      },
    })

    const targets = achievements.filter((a) => hasMeaningfulHtmlText(a.description))

    console.log(`\n[재임 기록] event_id 비어 있고 description 있는 행: ${targets.length}건`)

    for (const a of targets) {
      const eventId = randomUUID()
      const title = truncateTitle(a.title)
      const description = a.description!.trim()
      const hist = a.tenure.historicalCountryId
      const country = a.tenure.countryId

      if (dryRun) {
        console.log(`  - would create event ${eventId} ← tenure_achievement ${a.id} "${title.slice(0, 40)}…"`)
        continue
      }

      await prisma.$transaction(async (tx) => {
        await tx.event.create({
          data: {
            id: eventId,
            title,
            description,
            startDate: a.startDate ?? undefined,
            endDate: a.endDate ?? undefined,
            startDatePrecision: a.startDate ? 'day' : undefined,
            endDatePrecision: a.endDate ? 'day' : undefined,
            historicalCountryId: hist,
            createdById: adminUser.id,
          },
        })

        if (country && !hist) {
          await tx.eventCountryRelation.create({
            data: {
              eventId,
              countryId: country,
              role: 'PARTICIPANT',
            },
          })
        }

        await tx.tenureAchievement.update({
          where: { id: a.id },
          data: {
            eventId,
            ...(clearSource ? { description: null } : {}),
          },
        })
      })

      createdEvents += 1
      linkedAchievements += 1
    }
  }

  /** 이미 마이그레이션으로 event_id만 채운 뒤, 별도 실행으로 원본을 비울 때 대응 */
  if (clearSource) {
    if (runElections) {
      const linkedWithBody = await prisma.election.findMany({
        where: {
          eventId: { not: null },
          description: { not: null },
        },
        select: { id: true, name: true, description: true },
      })
      const toClear = linkedWithBody.filter((e) =>
        hasMeaningfulHtmlText(e.description),
      )
      console.log(
        `\n[선거·정리] event_id 있음 + 본문(description) 남음: ${toClear.length}건`,
      )
      for (const e of toClear) {
        if (dryRun) {
          console.log(
            `  - would set description=NULL ← election ${e.id} "${truncateTitle(e.name).slice(0, 36)}…"`,
          )
          continue
        }
        await prisma.election.update({
          where: { id: e.id },
          data: { description: null },
        })
        clearedElectionDescriptions += 1
      }
    }

    if (runAchievements) {
      const linkedWithBody = await prisma.tenureAchievement.findMany({
        where: {
          eventId: { not: null },
          description: { not: null },
        },
        select: { id: true, title: true, description: true },
      })
      const toClear = linkedWithBody.filter((a) =>
        hasMeaningfulHtmlText(a.description),
      )
      console.log(
        `\n[재임 기록·정리] event_id 있음 + 본문(description) 남음: ${toClear.length}건`,
      )
      for (const a of toClear) {
        if (dryRun) {
          console.log(
            `  - would set description=NULL ← tenure_achievement ${a.id} "${truncateTitle(a.title).slice(0, 36)}…"`,
          )
          continue
        }
        await prisma.tenureAchievement.update({
          where: { id: a.id },
          data: { description: null },
        })
        clearedAchievementDescriptions += 1
      }
    }
  }

  console.log('\n--- 요약 ---')
  if (dryRun) {
    console.log('dry-run 이므로 DB 반영 없음.')
  } else {
    console.log(`생성한 event: ${createdEvents}`)
    console.log(`연결한 election: ${linkedElections}`)
    console.log(`연결한 tenure_achievement: ${linkedAchievements}`)
    if (clearSource) {
      console.log(
        `비운 election.description: ${clearedElectionDescriptions}건 / tenure_achievement.description: ${clearedAchievementDescriptions}건`,
      )
    }
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
