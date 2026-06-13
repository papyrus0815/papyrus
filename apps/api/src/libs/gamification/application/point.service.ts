import { Injectable, Logger } from '@nestjs/common'
import { AggregateType, EventCountryRole, PointReason, Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { createPointsFor, gradeForPoints, gradeProgressFor, GradeProgress } from '../domain/point.policy'
import { BADGE_DEFS, BadgeStats, badgeProgress, earnedBadgeCodes } from '../domain/badge.policy'
import { centuryFromDateEra, centuryFromYearEra, centuryLabel } from '../domain/century'

/** 점수 조회 요약 응답 */
export interface PointSummary extends GradeProgress {
  /** 누적 점수 */
  totalPoints: number
  /** 현재 유효한 등록 기여 수(적립-회수) */
  contributionCount: number
  /** 전체 순위 (1부터, 점수 0이면 미랭크 null) */
  rank: number | null
  /** 현재 연속 등록 일수 */
  streakDays: number
}

/** 뱃지 1개 (획득 여부 + 진행도 포함) */
export interface BadgeView {
  code: string
  label: string
  description: string
  color: string
  earned: boolean
  /** 획득 시각 (미획득이면 null) */
  earnedAt: string | null
  /** 현재 진행값 (타깃 상한으로 캡) */
  current: number
  /** 획득 임계값 */
  target: number
  /** 이 뱃지 보유자 수 */
  holdersCount: number
  /** 활동 사용자(점수>0) 중 보유 비율 % (모집단 0이면 null) */
  rarityPct: number | null
}

/** 리더보드 한 줄 */
export interface LeaderboardEntry {
  rank: number
  accountId: string
  username: string
  gradeCode: string
  totalPoints: number
  /** 유효 등록 기여 수(적립-회수) */
  contributionCount: number
  /** 히어로 썸네일 (없으면 null) */
  heroThumbnail: string | null
  /** 조회한 본인인지 */
  isMe: boolean
}

/** 리더보드 기간 */
export type LeaderboardPeriod = 'all' | 'week' | 'month'

/**
 * 세기 슬라이스 필터.
 * - 정수: 해당 세기 (AD 양수, BC 음수 — 예: 19세기=19, 기원전 1세기=-1)
 * - 'unknown': 세기를 매길 수 없는 콘텐츠(현대국가·연도 미상)
 * - undefined: 세기 필터 없음(전체)
 */
export type CenturyFilter = number | 'unknown'

/** 세기 선택지 한 개 (리더보드 세기 셀렉터용) */
export interface CenturyOption {
  /** 세기 정수 (AD 양수/BC 음수). 'unknown' 버킷이면 null */
  century: number | null
  /** 사람이 읽는 라벨 (예: "19세기", "기원전 1세기", "세기 미상") */
  label: string
  /** 이 세기에 기여(점수)가 달린 콘텐츠 적립 행 수 */
  entryCount: number
}

/** 국가 선택지 한 개 (국가별 리더보드 셀렉터용) */
export interface CountryOption {
  /** 국가 ID (현대 Country 또는 역사 HistoricalCountry의 PK) */
  countryId: string
  /** 국가명 */
  name: string
  /** 역사 국가 여부(현대 Country면 false) */
  historical: boolean
  /** 이 국가에 달린 net 기여(등록-회수) 수 */
  entryCount: number
}

/** 활동 내역 한 줄 */
export interface ActivityEntry {
  id: string
  /** 증감 점수 */
  amount: number
  /** 사유 코드 (CREATE_CONTENT/COMPLETENESS_BONUS/CONTENT_DELETED/ADMIN_ADJUST) */
  reason: string
  /** 대상 콘텐츠 타입 */
  ownerType: string
  /** 발생 시각 (ISO) */
  createdAt: string
}

/** 공개 프로필(타 사용자 열람용) */
export interface PublicProfile {
  accountId: string
  username: string
  heroName: string | null
  heroThumbnail: string | null
  gradeCode: string
  totalPoints: number
  rank: number | null
  contributionCount: number
  /** 획득한 뱃지만 (미획득 제외) */
  badges: BadgeView[]
  /** 이 사용자가 기여한 세기별 net 등록 수 (내림차순, 기여 없으면 빈 배열) */
  centuryBreakdown: CenturyOption[]
}

type Tx = Prisma.TransactionClient

/**
 * 게이미피케이션 점수 적립/차감 서비스.
 *
 * 설계 원칙:
 * - 점수 변동은 PointEntry(원장)에 1행씩 기록하고, Account.totalPoints/gradeCode는
 *   해당 계정의 ledger 합계로 매번 재계산한다(드리프트 없음).
 * - 게이미피케이션은 부가 기능이므로, 어떤 실패도 콘텐츠 등록/삭제 본 흐름을
 *   깨지 않도록 내부에서 방어적으로 처리한다(로그만 남김).
 *
 * 설계 문서: docs/gamification-points-grade-design.md
 */
@Injectable()
export class PointService {
  private readonly logger = new Logger(PointService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 콘텐츠 등록 적립 (기본 점수 + 완성도 보너스를 한 트랜잭션에 함께 적립, 뱃지 평가 1회).
   * accountId가 없으면(비로그인/시드) 무시. 동일 (계정·콘텐츠·사유) 조합은 unique 제약으로
   * 1회만 적립되며, createMany(skipDuplicates)로 부분 중복도 안전하게 처리(멱등).
   * @param completenessAmount 완성도 보너스 점수(0이면 미적립)
   */
  async awardForCreate(
    accountId: string | null | undefined,
    ownerType: AggregateType,
    recordId: string,
    completenessAmount = 0,
  ): Promise<void> {
    if (!accountId) return
    const base = createPointsFor(ownerType)
    const contentCentury = await this.resolveContentCentury(ownerType, recordId)
    const contentCountryId = await this.resolveContentCountry(ownerType, recordId)
    const data: Prisma.PointEntryCreateManyInput[] = []
    if (base > 0) {
      data.push({ accountId, ownerType, recordId, reason: PointReason.CREATE_CONTENT, amount: base, contentCentury, contentCountryId })
    }
    if (completenessAmount > 0) {
      data.push({
        accountId,
        ownerType,
        recordId,
        reason: PointReason.COMPLETENESS_BONUS,
        amount: completenessAmount,
        contentCentury,
        contentCountryId,
      })
    }
    if (data.length === 0) return

    let changed = false
    try {
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.pointEntry.createMany({ data, skipDuplicates: true })
        changed = res.count > 0
        // 세기·국가는 record당 동일 — 콘텐츠 메타가 바뀌었을 수 있어 기존 행까지 최신값으로 정합화.
        await this.stampCenturyForRecord(tx, ownerType, recordId, contentCentury)
        await this.stampCountryForRecord(tx, ownerType, recordId, contentCountryId)
        if (changed) await this.recalcAccount(tx, accountId)
      })
    } catch (error) {
      this.logger.error(
        `점수 적립 실패 (account=${accountId}, ${ownerType}/${recordId}): ${String(error)}`,
      )
      return
    }
    if (changed) await this.evaluateBadges(accountId)
  }

  /**
   * 일괄 등록 적립 — 같은 타입의 여러 record를 원장 일괄 삽입 + 재계산·뱃지 평가 1회로 처리.
   * record별 awardForCreate 반복은 트랜잭션·계정 재계산·뱃지 평가가 N회 돌아
   * 일괄 등록(수십 건)의 응답을 수 초씩 늦춘다. 멱등성은 동일(unique + skipDuplicates).
   */
  async awardForCreateMany(
    accountId: string | null | undefined,
    ownerType: AggregateType,
    recordIds: string[],
  ): Promise<void> {
    if (!accountId || recordIds.length === 0) return
    const base = createPointsFor(ownerType)
    if (base <= 0) return
    const data: Prisma.PointEntryCreateManyInput[] = []
    for (const recordId of recordIds) {
      const contentCentury = await this.resolveContentCentury(ownerType, recordId)
      const contentCountryId = await this.resolveContentCountry(ownerType, recordId)
      data.push({
        accountId,
        ownerType,
        recordId,
        reason: PointReason.CREATE_CONTENT,
        amount: base,
        contentCentury,
        contentCountryId,
      })
    }

    let changed = false
    try {
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.pointEntry.createMany({ data, skipDuplicates: true })
        changed = res.count > 0
        if (changed) await this.recalcAccount(tx, accountId)
      })
    } catch (error) {
      this.logger.error(
        `일괄 점수 적립 실패 (account=${accountId}, ${ownerType} x${recordIds.length}): ${String(error)}`,
      )
      return
    }
    if (changed) await this.evaluateBadges(accountId)
  }

  /**
   * 완성도 보너스 적립 — 콘텐츠를 충실히 채운 경우 추가 점수.
   * 도메인 서비스가 신호 개수로 계산한 amount를 넘긴다. 등록·수정 모두에서 호출 가능
   * (unique 제약으로 콘텐츠당 1회만 적립되어 멱등). amount<=0이면 무시.
   */
  async awardCompletenessBonus(
    accountId: string | null | undefined,
    ownerType: AggregateType,
    recordId: string,
    amount: number,
  ): Promise<void> {
    if (!accountId || amount <= 0) return
    const added = await this.addEntry(accountId, ownerType, recordId, PointReason.COMPLETENESS_BONUS, amount)
    if (added) await this.evaluateBadges(accountId)
  }

  /** PointEntry 1행 추가 + Account 합계 재계산. 삽입 성공 시 true(중복/오류 시 false). */
  private async addEntry(
    accountId: string,
    ownerType: AggregateType,
    recordId: string,
    reason: PointReason,
    amount: number,
  ): Promise<boolean> {
    const contentCentury = await this.resolveContentCentury(ownerType, recordId)
    const contentCountryId = await this.resolveContentCountry(ownerType, recordId)
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.pointEntry.create({
          data: { accountId, ownerType, recordId, reason, amount, contentCentury, contentCountryId },
        })
        // 보너스 적립은 등록·수정 양쪽에서 호출 — 메타 수정 시 record 전체 세기·국가 재스탬프.
        await this.stampCenturyForRecord(tx, ownerType, recordId, contentCentury)
        await this.stampCountryForRecord(tx, ownerType, recordId, contentCountryId)
        await this.recalcAccount(tx, accountId)
      })
      return true
    } catch (error) {
      if (this.isUniqueViolation(error)) return false // 이미 적립됨 — 멱등 처리
      this.logger.error(
        `점수 적립 실패 (account=${accountId}, ${reason} ${ownerType}/${recordId}): ${String(error)}`,
      )
      return false
    }
  }

  /**
   * 콘텐츠 삭제 시 점수 회수(어뷰징 방지).
   * 해당 record에 대한 계정별 순적립(net)을 계산해 CONTENT_DELETED 음수 행으로 상쇄한다.
   * net<=0이면(이미 회수됨) 아무 것도 하지 않으므로 멱등하다.
   * 삭제 주체와 무관하게, 점수를 받았던 원 등록자에게서 회수된다(ledger가 소유자를 안다).
   */
  async revokeForRecord(ownerType: AggregateType, recordId: string): Promise<void> {
    try {
      const entries = await this.prisma.pointEntry.findMany({
        where: { ownerType, recordId },
        select: { accountId: true, amount: true, contentCentury: true, contentCountryId: true },
      })
      // 세기·국가는 record당 동일 — 기존 행에서 가져와 회수(음수) 행에도 동일하게 박는다(슬라이스별 net 정합).
      const recordCentury = entries.find((e) => e.contentCentury != null)?.contentCentury ?? null
      const recordCountryId = entries.find((e) => e.contentCountryId != null)?.contentCountryId ?? null
      const netByAccount = new Map<string, number>()
      for (const e of entries) {
        netByAccount.set(e.accountId, (netByAccount.get(e.accountId) ?? 0) + e.amount)
      }

      for (const [accountId, net] of netByAccount) {
        if (net <= 0) continue
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.pointEntry.create({
              data: {
                accountId,
                ownerType,
                recordId,
                reason: PointReason.CONTENT_DELETED,
                amount: -net,
                contentCentury: recordCentury,
                contentCountryId: recordCountryId,
              },
            })
            await this.recalcAccount(tx, accountId)
          })
        } catch (error) {
          if (this.isUniqueViolation(error)) continue // 이미 회수됨
          this.logger.error(
            `점수 회수 실패 (account=${accountId}, ${ownerType}/${recordId}): ${String(error)}`,
          )
        }
      }
    } catch (error) {
      this.logger.error(`점수 회수 조회 실패 (${ownerType}/${recordId}): ${String(error)}`)
    }
  }

  /**
   * 일괄 회수 — 하위 트리 cascade 삭제처럼 여러 record를 한 번에 회수.
   * record별 revokeForRecord 반복은 조회·트랜잭션·재계산이 N회 돌므로,
   * 원장 일괄 조회 → (record, 계정)별 net 산출 → 회수 행 일괄 삽입 + 계정당 재계산 1회로 묶는다.
   */
  async revokeForRecordMany(
    ownerType: AggregateType,
    recordIds: string[],
  ): Promise<void> {
    if (recordIds.length === 0) return
    try {
      const entries = await this.prisma.pointEntry.findMany({
        where: { ownerType, recordId: { in: recordIds } },
        select: {
          recordId: true,
          accountId: true,
          amount: true,
          contentCentury: true,
          contentCountryId: true,
        },
      })
      if (entries.length === 0) return

      interface Slot {
        recordId: string
        accountId: string
        net: number
        century: number | null
        countryId: string | null
      }
      const byKey = new Map<string, Slot>()
      for (const e of entries) {
        if (!e.recordId) continue
        const key = `${e.recordId}|${e.accountId}`
        const slot =
          byKey.get(key) ??
          ({
            recordId: e.recordId,
            accountId: e.accountId,
            net: 0,
            century: null,
            countryId: null,
          } satisfies Slot)
        slot.net += e.amount
        slot.century = slot.century ?? e.contentCentury ?? null
        slot.countryId = slot.countryId ?? e.contentCountryId ?? null
        byKey.set(key, slot)
      }

      const data: Prisma.PointEntryCreateManyInput[] = []
      const accounts = new Set<string>()
      for (const slot of byKey.values()) {
        if (slot.net <= 0) continue
        accounts.add(slot.accountId)
        data.push({
          accountId: slot.accountId,
          ownerType,
          recordId: slot.recordId,
          reason: PointReason.CONTENT_DELETED,
          amount: -slot.net,
          contentCentury: slot.century,
          contentCountryId: slot.countryId,
        })
      }
      if (data.length === 0) return

      await this.prisma.$transaction(async (tx) => {
        await tx.pointEntry.createMany({ data, skipDuplicates: true })
        for (const accountId of accounts) {
          await this.recalcAccount(tx, accountId)
        }
      })
    } catch (error) {
      this.logger.error(
        `일괄 점수 회수 실패 (${ownerType} x${recordIds.length}): ${String(error)}`,
      )
    }
  }

  /**
   * 소프트 삭제된 콘텐츠 복구 시 점수 복원.
   * 회수 행(CONTENT_DELETED)을 제거하면 net이 원래 적립분으로 돌아온다.
   */
  async restoreForRecord(ownerType: AggregateType, recordId: string): Promise<void> {
    try {
      const revokes = await this.prisma.pointEntry.findMany({
        where: { ownerType, recordId, reason: PointReason.CONTENT_DELETED },
        select: { accountId: true },
      })
      if (revokes.length === 0) return
      const accountIds = [...new Set(revokes.map((r) => r.accountId))]

      await this.prisma.$transaction(async (tx) => {
        await tx.pointEntry.deleteMany({
          where: { ownerType, recordId, reason: PointReason.CONTENT_DELETED },
        })
        for (const accountId of accountIds) {
          await this.recalcAccount(tx, accountId)
        }
      })
    } catch (error) {
      this.logger.error(`점수 복원 실패 (${ownerType}/${recordId}): ${String(error)}`)
    }
  }

  /**
   * 점수 조회 — 누적 점수, 등급, 다음 등급까지 진행도, 유효 기여 수.
   * 합계는 ledger에서 직접 계산해 캐시(Account)와 무관하게 항상 정확하다.
   */
  async getSummary(accountId: string): Promise<PointSummary> {
    const stats = await this.computeStats(accountId)
    // 순위: 나보다 점수 높은 계정 수 + 1 (동점은 같은 순위). 0점이면 미랭크.
    let rank: number | null = null
    if (stats.totalPoints > 0) {
      const higher = await this.prisma.account.count({
        where: { totalPoints: { gt: stats.totalPoints } },
      })
      rank = higher + 1
    }
    return {
      totalPoints: stats.totalPoints,
      contributionCount: stats.contributionCount,
      rank,
      streakDays: stats.streakDays,
      ...gradeProgressFor(stats.totalPoints),
    }
  }

  /**
   * 뱃지 목록 조회 — 전체 카탈로그에 획득 여부/시각을 합쳐 반환.
   */
  async getBadges(accountId: string): Promise<BadgeView[]> {
    const [owned, stats, holders, population] = await Promise.all([
      this.prisma.accountBadge.findMany({
        where: { accountId },
        select: { badgeCode: true, earnedAt: true },
      }),
      this.computeStats(accountId),
      this.prisma.accountBadge.groupBy({ by: ['badgeCode'], _count: { _all: true } }),
      this.prisma.account.count({ where: { totalPoints: { gt: 0 } } }),
    ])
    const earnedMap = new Map(owned.map((b) => [b.badgeCode, b.earnedAt]))
    const holdersMap = new Map(holders.map((h) => [h.badgeCode, h._count._all]))
    return BADGE_DEFS.map((def) => {
      const earnedAt = earnedMap.get(def.code)
      const { current, target } = badgeProgress(def, stats)
      const holdersCount = holdersMap.get(def.code) ?? 0
      return {
        code: def.code,
        label: def.label,
        description: def.description,
        color: def.color,
        earned: earnedAt != null,
        earnedAt: earnedAt ? earnedAt.toISOString() : null,
        current,
        target,
        holdersCount,
        rarityPct: population > 0 ? Math.round((holdersCount / population) * 100) : null,
      }
    })
  }

  /**
   * 리더보드 — 기간/세기별 상위 계정.
   * - 세기 미지정 + all: Account.totalPoints 캐시로 정렬(빠름)
   * - 그 외(week/month 또는 세기 지정): 해당 조건의 PointEntry 합산으로 정렬
   *   (고인물 독점 완화 + 세기 슬라이스). 세기는 콘텐츠가 다루는 시대 기준.
   * 캐시를 못 쓰는 경로는 본인이 상위 밖이면 본인 행을 끝에 덧붙여 반환한다(실제 순위 포함).
   * @param century 세기 슬라이스 — 정수(AD 양수/BC 음수) | 'unknown'(세기 미상·현대국가) | undefined(전체)
   */
  async getLeaderboard(
    limit: number,
    meId?: string,
    period: LeaderboardPeriod = 'all',
    century?: CenturyFilter,
    country?: string,
  ): Promise<LeaderboardEntry[]> {
    const take = Math.min(Math.max(1, limit), 100)
    const start = startOfPeriod(period)
    const hasCentury = century !== undefined
    const hasCountry = !!country

    if (!start && !hasCentury && !hasCountry) {
      const rows = await this.prisma.account.findMany({
        where: { totalPoints: { gt: 0 } },
        orderBy: [{ totalPoints: 'desc' }, { createdAt: 'asc' }],
        take,
        select: {
          id: true,
          username: true,
          displayName: true,
          gradeCode: true,
          totalPoints: true,
          representativePerson: { select: { profileImageUrl: true } },
        },
      })
      const contrib = await this.contributionCounts(rows.map((r) => r.id))
      return rows.map((r, i) => ({
        rank: i + 1,
        accountId: r.id,
        username: r.displayName ?? r.username,
        gradeCode: r.gradeCode,
        totalPoints: r.totalPoints,
        contributionCount: contrib.get(r.id) ?? 0,
        heroThumbnail: r.representativePerson?.profileImageUrl ?? null,
        isMe: meId != null && r.id === meId,
      }))
    }

    // 캐시 미사용 경로: 기간/세기/국가 조건으로 PointEntry 합산
    const centuryWhere = hasCentury
      ? { contentCentury: century === 'unknown' ? null : century }
      : {}
    const countryWhere = hasCountry ? { contentCountryId: country } : {}
    const sums = await this.prisma.pointEntry.groupBy({
      by: ['accountId'],
      where: { ...(start ? { createdAt: { gte: start } } : {}), ...centuryWhere, ...countryWhere },
      _sum: { amount: true },
    })
    const ranked = sums
      .map((s) => ({ accountId: s.accountId, points: s._sum.amount ?? 0 }))
      .filter((x) => x.points > 0)
      .sort((a, b) => b.points - a.points)
      .map((x, i) => ({ ...x, rank: i + 1 }))

    const top = ranked.slice(0, take)
    const myRanked = meId ? ranked.find((x) => x.accountId === meId) : undefined
    const includeMe = !!myRanked && !top.some((x) => x.accountId === meId)
    const display = includeMe ? [...top, myRanked!] : top
    const ids = display.map((x) => x.accountId)
    if (ids.length === 0) return []

    const [accounts, contrib] = await Promise.all([
      this.prisma.account.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, displayName: true, gradeCode: true, representativePerson: { select: { profileImageUrl: true } } },
      }),
      this.contributionCounts(ids, start, century, country),
    ])
    const accMap = new Map(accounts.map((a) => [a.id, a]))

    return display.map((x) => {
      const a = accMap.get(x.accountId)
      return {
        rank: x.rank,
        accountId: x.accountId,
        username: a?.displayName ?? a?.username ?? '(알 수 없음)',
        gradeCode: a?.gradeCode ?? 'BRONZE',
        totalPoints: x.points,
        contributionCount: contrib.get(x.accountId) ?? 0,
        heroThumbnail: a?.representativePerson?.profileImageUrl ?? null,
        isMe: meId != null && x.accountId === meId,
      }
    })
  }

  /**
   * 세기별 리더보드의 세기 셀렉터용 — 살아있는 기여가 달린 세기 목록(동적).
   * 등록(CREATE_CONTENT) - 삭제회수(CONTENT_DELETED)의 순(net) 기여 수를 세기별로 집계하고,
   * net > 0인 세기만 노출한다(전량 삭제된 세기가 셀렉터에만 남는 불일치 방지).
   * 세기 미상(null·현대국가)은 net > 0이면 맨 끝 'unknown' 버킷으로 포함한다.
   */
  async getAvailableCenturies(): Promise<CenturyOption[]> {
    return this.centuryOptions()
  }

  /**
   * 세기별 net 기여 수를 집계해 CenturyOption[]로 반환(내림차순, net>0만, 미상은 끝).
   * accountId 지정 시 그 계정의 기여만(공개 프로필 세기 분해용), 미지정 시 전체(셀렉터용).
   */
  private async centuryOptions(accountId?: string): Promise<CenturyOption[]> {
    const grouped = await this.prisma.pointEntry.groupBy({
      by: ['contentCentury', 'reason'],
      where: {
        reason: { in: [PointReason.CREATE_CONTENT, PointReason.CONTENT_DELETED] },
        ...(accountId ? { accountId } : {}),
      },
      _count: { _all: true },
    })
    // 세기별 net 기여 수 집계 (null 세기는 별도 키로 묶음)
    const netByCentury = new Map<number | null, number>()
    for (const g of grouped) {
      const sign = g.reason === PointReason.CREATE_CONTENT ? 1 : -1
      const key = g.contentCentury
      netByCentury.set(key, (netByCentury.get(key) ?? 0) + sign * g._count._all)
    }
    const dated: CenturyOption[] = []
    let unknownCount = 0
    for (const [century, net] of netByCentury) {
      if (net <= 0) continue
      if (century == null) {
        unknownCount = net
        continue
      }
      dated.push({ century, label: centuryLabel(century), entryCount: net })
    }
    // 최신 세기부터(내림차순). BC는 음수라 자연히 뒤로 간다.
    dated.sort((a, b) => (b.century ?? 0) - (a.century ?? 0))
    if (unknownCount > 0) {
      dated.push({ century: null, label: '세기 미상', entryCount: unknownCount })
    }
    return dated
  }

  /**
   * 국가별 리더보드 셀렉터용 — 살아있는 기여가 달린 국가 목록(net>0, 내림차순).
   * 현대/역사 국가를 모두 포함하며, 이름은 각 테이블에서 해석한다.
   */
  async getAvailableCountries(): Promise<CountryOption[]> {
    const grouped = await this.prisma.pointEntry.groupBy({
      by: ['contentCountryId', 'reason'],
      where: {
        reason: { in: [PointReason.CREATE_CONTENT, PointReason.CONTENT_DELETED] },
        contentCountryId: { not: null },
      },
      _count: { _all: true },
    })
    const netById = new Map<string, number>()
    for (const g of grouped) {
      if (!g.contentCountryId) continue
      const sign = g.reason === PointReason.CREATE_CONTENT ? 1 : -1
      netById.set(g.contentCountryId, (netById.get(g.contentCountryId) ?? 0) + sign * g._count._all)
    }
    const ids = [...netById.entries()].filter(([, n]) => n > 0).map(([id]) => id)
    if (ids.length === 0) return []
    const [countries, historical] = await Promise.all([
      this.prisma.country.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      this.prisma.historicalCountry.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    ])
    const modernMap = new Map(countries.map((c) => [c.id, c.name]))
    const histMap = new Map(historical.map((h) => [h.id, h.name]))
    return ids
      .map((id) => ({
        countryId: id,
        name: modernMap.get(id) ?? histMap.get(id) ?? '(알 수 없음)',
        historical: !modernMap.has(id) && histMap.has(id),
        entryCount: netById.get(id) ?? 0,
      }))
      .sort((a, b) => b.entryCount - a.entryCount)
  }

  /** 유효 기여 수(적립-회수)를 계정별로 집계 (since/century 지정 시 그 조건으로 한정) */
  private async contributionCounts(
    ids: string[],
    since?: Date | null,
    century?: CenturyFilter,
    country?: string,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    if (ids.length === 0) return map
    const grouped = await this.prisma.pointEntry.groupBy({
      by: ['accountId', 'reason'],
      where: {
        accountId: { in: ids },
        reason: { in: [PointReason.CREATE_CONTENT, PointReason.CONTENT_DELETED] },
        ...(since ? { createdAt: { gte: since } } : {}),
        ...(century !== undefined ? { contentCentury: century === 'unknown' ? null : century } : {}),
        ...(country ? { contentCountryId: country } : {}),
      },
      _count: { _all: true },
    })
    for (const g of grouped) {
      const sign = g.reason === PointReason.CREATE_CONTENT ? 1 : -1
      map.set(g.accountId, Math.max(0, (map.get(g.accountId) ?? 0) + sign * g._count._all))
    }
    return map
  }

  /** 활동 내역(최근 점수 변동) */
  async getActivity(accountId: string, limit: number): Promise<ActivityEntry[]> {
    const take = Math.min(Math.max(1, limit), 100)
    const rows = await this.prisma.pointEntry.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, amount: true, reason: true, ownerType: true, createdAt: true },
    })
    return rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      reason: r.reason,
      ownerType: r.ownerType,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  /** 공개 프로필(타 사용자 열람) — 등급·점수·순위·획득 뱃지 */
  async getPublicProfile(accountId: string): Promise<PublicProfile | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        username: true,
        totalPoints: true,
        gradeCode: true,
        displayName: true,
        representativePerson: { select: { name: true, profileImageUrl: true } },
      },
    })
    if (!account) return null

    const [stats, allBadges, higher, centuryBreakdown] = await Promise.all([
      this.computeStats(accountId),
      this.getBadges(accountId),
      account.totalPoints > 0
        ? this.prisma.account.count({ where: { totalPoints: { gt: account.totalPoints } } })
        : Promise.resolve(null),
      this.centuryOptions(accountId),
    ])

    return {
      accountId: account.id,
      username: account.displayName ?? account.username,
      heroName: account.representativePerson?.name ?? null,
      heroThumbnail: account.representativePerson?.profileImageUrl ?? null,
      gradeCode: account.gradeCode,
      totalPoints: stats.totalPoints,
      rank: higher == null ? null : higher + 1,
      contributionCount: stats.contributionCount,
      badges: allBadges.filter((b) => b.earned),
      centuryBreakdown,
    }
  }

  /**
   * 뱃지 평가 후 새로 충족된 뱃지를 영구 부여(중복은 unique로 무시).
   * 뱃지는 회수하지 않으므로 award 시점에만 호출한다.
   */
  async evaluateBadges(accountId: string): Promise<void> {
    try {
      const stats = await this.computeStats(accountId)
      const eligible = earnedBadgeCodes(stats)
      if (eligible.length === 0) return
      await this.prisma.accountBadge.createMany({
        data: eligible.map((badgeCode) => ({ accountId, badgeCode })),
        skipDuplicates: true,
      })
    } catch (error) {
      this.logger.error(`뱃지 평가 실패 (account=${accountId}): ${String(error)}`)
    }
  }

  /** 뱃지/요약 평가용 계정 통계 (ledger 기반) */
  private async computeStats(accountId: string): Promise<BadgeStats> {
    const [agg, grouped, createDates, countryGrouped, centuryGrouped] = await Promise.all([
      this.prisma.pointEntry.aggregate({ where: { accountId }, _sum: { amount: true } }),
      this.prisma.pointEntry.groupBy({
        by: ['ownerType', 'reason'],
        where: {
          accountId,
          reason: { in: [PointReason.CREATE_CONTENT, PointReason.CONTENT_DELETED] },
        },
        _count: { _all: true },
      }),
      this.prisma.pointEntry.findMany({
        where: { accountId, reason: PointReason.CREATE_CONTENT },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 400,
      }),
      this.prisma.pointEntry.groupBy({
        by: ['contentCountryId', 'reason'],
        where: {
          accountId,
          reason: { in: [PointReason.CREATE_CONTENT, PointReason.CONTENT_DELETED] },
          contentCountryId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.pointEntry.groupBy({
        by: ['contentCentury', 'reason'],
        where: {
          accountId,
          reason: { in: [PointReason.CREATE_CONTENT, PointReason.CONTENT_DELETED] },
          contentCentury: { not: null },
        },
        _count: { _all: true },
      }),
    ])

    // 단일 국가 최대 net 기여 수 (지역 전문가 뱃지용)
    const netByCountry = new Map<string, number>()
    for (const g of countryGrouped) {
      if (!g.contentCountryId) continue
      const sign = g.reason === PointReason.CREATE_CONTENT ? 1 : -1
      netByCountry.set(g.contentCountryId, (netByCountry.get(g.contentCountryId) ?? 0) + sign * g._count._all)
    }
    const maxCountryContribution = netByCountry.size ? Math.max(0, ...netByCountry.values()) : 0

    // 단일 세기 최대 net 기여 수 (시대 전문가 뱃지용)
    const netByCentury = new Map<number, number>()
    for (const g of centuryGrouped) {
      if (g.contentCentury == null) continue
      const sign = g.reason === PointReason.CREATE_CONTENT ? 1 : -1
      netByCentury.set(g.contentCentury, (netByCentury.get(g.contentCentury) ?? 0) + sign * g._count._all)
    }
    const maxCenturyContribution = netByCentury.size ? Math.max(0, ...netByCentury.values()) : 0

    const countByType: Partial<Record<AggregateType, number>> = {}
    let createTotal = 0
    let deleteTotal = 0
    for (const g of grouped) {
      const c = g._count._all
      const sign = g.reason === PointReason.CREATE_CONTENT ? 1 : -1
      countByType[g.ownerType] = (countByType[g.ownerType] ?? 0) + sign * c
      if (sign > 0) createTotal += c
      else deleteTotal += c
    }
    // 음수 방지 (이론상 발생하지 않지만 방어적으로)
    for (const k of Object.keys(countByType) as AggregateType[]) {
      countByType[k] = Math.max(0, countByType[k] ?? 0)
    }

    return {
      totalPoints: agg._sum.amount ?? 0,
      contributionCount: Math.max(0, createTotal - deleteTotal),
      countByType,
      streakDays: computeStreakDays(createDates.map((d) => d.createdAt)),
      maxCountryContribution,
      maxCenturyContribution,
    }
  }

  /** 한 계정의 totalPoints/gradeCode를 ledger 합계로 재계산 */
  private async recalcAccount(tx: Tx, accountId: string): Promise<void> {
    const agg = await tx.pointEntry.aggregate({
      where: { accountId },
      _sum: { amount: true },
    })
    const total = agg._sum.amount ?? 0
    await tx.account.update({
      where: { id: accountId },
      data: { totalPoints: total, gradeCode: gradeForPoints(total) },
    })
  }

  /**
   * 콘텐츠가 다루는 시대의 세기를 산출한다(세기별 리더보드 비정규화용).
   * 타입별 날짜 출처가 달라 분기한다. 세기를 매길 수 없으면 null:
   * - PERSON: 출생일+시대 / EVENT: 시작일 / HISTORICAL_COUNTRY: 시작연도+시대
   * - COUNTRY(현대국가): 시간 개념 없음 → 항상 null
   * - 그 외 타입 / 날짜 미상 → null
   * 게이미피케이션은 부가 기능이므로 조회 실패는 null로 흡수(본 흐름 비차단).
   */
  private async resolveContentCentury(
    ownerType: AggregateType,
    recordId: string | null | undefined,
  ): Promise<number | null> {
    if (!recordId) return null
    try {
      switch (ownerType) {
        case AggregateType.PERSON: {
          const p = await this.prisma.person.findUnique({
            where: { id: recordId },
            select: { birthDate: true, birthEra: true },
          })
          return p ? centuryFromDateEra(p.birthDate, p.birthEra) : null
        }
        case AggregateType.EVENT: {
          const e = await this.prisma.event.findUnique({
            where: { id: recordId },
            select: { startDate: true, startYear: true, startEra: true },
          })
          if (!e) return null
          // 구조화 필드(BC/고대 지원) 우선, 없으면 레거시 startDate(AD).
          if (e.startYear != null) return centuryFromYearEra(e.startYear, e.startEra)
          return centuryFromDateEra(e.startDate, null)
        }
        case AggregateType.HISTORICAL_COUNTRY: {
          const h = await this.prisma.historicalCountry.findUnique({
            where: { id: recordId },
            select: { startYear: true, startEra: true },
          })
          return h ? centuryFromYearEra(h.startYear, h.startEra) : null
        }
        case AggregateType.ADMINISTRATIVE_DIVISION: {
          const d = await this.prisma.administrativeDivision.findUnique({
            where: { id: recordId },
            select: { establishedDate: true },
          })
          return d ? centuryFromDateEra(d.establishedDate, null) : null
        }
        default:
          // COUNTRY(현대국가) 및 그 외 타입은 세기를 매기지 않음.
          return null
      }
    } catch (error) {
      this.logger.error(`세기 산출 실패 (${ownerType}/${recordId}): ${String(error)}`)
      return null
    }
  }

  /**
   * record에 속한 모든 PointEntry의 contentCentury를 주어진 값으로 정합화(updateMany).
   * 조건 없이 전부 갱신한다 — `{ not: century }` 필터를 쓰면 SQL의 `NULL <> n`이 참이 아니라
   * null 세기로 적립됐던 행(날짜 누락 후 추가 등)을 재스탬프 시 놓치기 때문. record당 행 수가
   * 적어(보통 ≤2) 무조건 갱신 비용은 무시할 수 있다.
   */
  private async stampCenturyForRecord(
    tx: Tx,
    ownerType: AggregateType,
    recordId: string | null | undefined,
    century: number | null,
  ): Promise<void> {
    if (!recordId) return
    await tx.pointEntry.updateMany({
      where: { ownerType, recordId },
      data: { contentCentury: century },
    })
  }

  /**
   * 콘텐츠 날짜가 수정됐을 때 해당 record의 세기 스냅샷을 다시 계산해 정합화한다.
   * 도메인 update 훅에서 호출 가능(미호출이어도 다음 적립/보너스 시 자동 정합).
   */
  async restampContentCentury(ownerType: AggregateType, recordId: string): Promise<void> {
    try {
      const century = await this.resolveContentCentury(ownerType, recordId)
      await this.prisma.$transaction((tx) => this.stampCenturyForRecord(tx, ownerType, recordId, century))
    } catch (error) {
      this.logger.error(`세기 재스탬프 실패 (${ownerType}/${recordId}): ${String(error)}`)
    }
  }

  /**
   * 콘텐츠의 대표 국가 ID를 산출한다(국가별 리더보드/뱃지 비정규화용).
   * - PERSON: 주 국적(countryId) → 없으면 최우선(priority) PersonCountryAffiliation의 (현대/역사)국가
   * - EVENT: 주도국(INITIATOR) → 없으면 첫 관계국 (현대/역사)
   * - COUNTRY / HISTORICAL_COUNTRY: 자기 자신
   * - 그 외 / 대표 국가 없음 → null
   * 현대 국가와 역사 국가는 별개 버킷(서로 다른 PK)으로 취급한다.
   */
  private async resolveContentCountry(
    ownerType: AggregateType,
    recordId: string | null | undefined,
  ): Promise<string | null> {
    if (!recordId) return null
    try {
      switch (ownerType) {
        case AggregateType.PERSON: {
          const p = await this.prisma.person.findUnique({
            where: { id: recordId },
            select: { countryId: true },
          })
          if (p?.countryId) return p.countryId
          const aff = await this.prisma.personCountryAffiliation.findFirst({
            where: { personId: recordId },
            orderBy: [{ priority: 'asc' }],
            select: { countryId: true, historicalCountryId: true },
          })
          return aff?.countryId ?? aff?.historicalCountryId ?? null
        }
        case AggregateType.EVENT: {
          const rels = await this.prisma.eventCountryRelation.findMany({
            where: { eventId: recordId },
            select: { countryId: true, historicalCountryId: true, role: true },
          })
          if (rels.length === 0) return null
          const primary = rels.find((r) => r.role === EventCountryRole.INITIATOR) ?? rels[0]
          return primary.countryId ?? primary.historicalCountryId ?? null
        }
        case AggregateType.COUNTRY:
        case AggregateType.HISTORICAL_COUNTRY:
          return recordId
        case AggregateType.ADMINISTRATIVE_DIVISION: {
          const d = await this.prisma.administrativeDivision.findUnique({
            where: { id: recordId },
            select: { countryId: true, historicalCountryId: true },
          })
          return d?.countryId ?? d?.historicalCountryId ?? null
        }
        default:
          return null
      }
    } catch (error) {
      this.logger.error(`국가 산출 실패 (${ownerType}/${recordId}): ${String(error)}`)
      return null
    }
  }

  /** record에 속한 모든 PointEntry의 contentCountryId를 정합화(record당 행 수 적어 무조건 갱신). */
  private async stampCountryForRecord(
    tx: Tx,
    ownerType: AggregateType,
    recordId: string | null | undefined,
    countryId: string | null,
  ): Promise<void> {
    if (!recordId) return
    await tx.pointEntry.updateMany({
      where: { ownerType, recordId },
      data: { contentCountryId: countryId },
    })
  }

  /** 콘텐츠의 국적/관계가 수정됐을 때 국가 스냅샷 재정합(도메인 update 훅에서 호출 가능). */
  async restampContentCountry(ownerType: AggregateType, recordId: string): Promise<void> {
    try {
      const countryId = await this.resolveContentCountry(ownerType, recordId)
      await this.prisma.$transaction((tx) => this.stampCountryForRecord(tx, ownerType, recordId, countryId))
    } catch (error) {
      this.logger.error(`국가 재스탬프 실패 (${ownerType}/${recordId}): ${String(error)}`)
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
}

/** 기간 시작 시각 (서버 로컬 기준). all이면 null. week=이번 주 월요일 00:00, month=1일 00:00 */
function startOfPeriod(period: LeaderboardPeriod): Date | null {
  if (period === 'all') return null
  const now = new Date()
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  // week: 월요일 시작
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (d.getDay() + 6) % 7 // 월=0 ... 일=6
  d.setDate(d.getDate() - dow)
  return d
}

/** 연속 등록 일수 — 등록(CREATE_CONTENT) 발생일을 기준으로 오늘/어제부터 끊기지 않은 날 수 */
function computeStreakDays(dates: Date[]): number {
  if (dates.length === 0) return 0
  const dayKey = (d: Date) => {
    const x = new Date(d)
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  }
  const DAY = 86_400_000
  const days = new Set(dates.map(dayKey))
  const today = dayKey(new Date())
  // 오늘 또는 어제부터 시작(오늘 아직 등록 안 했어도 어제까지면 스트릭 유지)
  let cursor: number
  if (days.has(today)) cursor = today
  else if (days.has(today - DAY)) cursor = today - DAY
  else return 0
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor -= DAY
  }
  return streak
}
