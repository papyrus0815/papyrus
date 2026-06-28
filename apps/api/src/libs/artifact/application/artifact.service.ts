import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { AggregateType, ArtifactRarity, Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { WalletService } from '../../wallet/application/wallet.service'

/** 유물 카탈로그 한 개 (보유 플래그 포함) */
export interface ArtifactView {
  id: string
  name: string
  era: string | null
  /** 희귀도 (COMMON/RARE/LEGENDARY) */
  rarity: string
  pricePapy: number
  imageUrl: string | null
  description: string | null
  /** 세트 묶음 키 (없으면 null) */
  setKey: string | null
  /** 세기 스냅샷 (AD 양수/BC 음수/null) */
  contentCentury: number | null
  /** 연결 백과 엔티티 타입 (없으면 null) — 프론트 딥링크용 */
  linkedType: string | null
  /** 연결 백과 엔티티 PK */
  linkedId: string | null
  /** 요청 계정이 이미 소장했는지 */
  owned: boolean
}

/** 보유 유물 한 개 (인벤토리/진열장) */
export interface UserArtifactView {
  /** UserArtifact PK (진열 토글 대상) */
  id: string
  artifactId: string
  name: string
  era: string | null
  rarity: string
  imageUrl: string | null
  description: string | null
  setKey: string | null
  contentCentury: number | null
  linkedType: string | null
  linkedId: string | null
  /** 진열장 노출 여부 */
  displayed: boolean
  acquiredAt: string
}

/** 유물 수집 결과 */
export interface CollectArtifactResult {
  item: UserArtifactView
  /** 차감 후 잔액 */
  balance: number
}

type ArtifactRow = {
  id: string
  name: string
  era: string | null
  rarity: ArtifactRarity
  pricePapy: number
  imageUrl: string | null
  description: string | null
  setKey: string | null
  contentCentury: number | null
  linkedType: AggregateType | null
  linkedId: string | null
}

type UserArtifactRow = {
  id: string
  artifactId: string
  displayed: boolean
  acquiredAt: Date
  artifact: ArtifactRow
}

/**
 * 역사 유물 수집 서비스.
 *
 * 설계 원칙(docs/historical-artifact-collection-design.md):
 * - 유물은 코스메틱(ShopItem/UserItem)과 분리된 수집 도메인. 1종은 계정당 1개(uniq_user_artifact).
 * - 구매는 파피 경제를 재사용 — WalletService.spend(조건부 차감 + CONSUME 원장 + 멱등)를 주입.
 * - 차별점: 유물을 실제 백과 엔티티(linkedType/linkedId)에 링크해 "수집=탐험" 루프를 만든다.
 * - 환불(역분개)은 Phase A 미지원(설계상) — 유물은 회수 불가 수집물. 운영 회수는 차후 과제.
 */
@Injectable()
export class ArtifactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /** 유물 카탈로그 (활성 + 보유 플래그). setKey/rarity 필터 선택. */
  async listArtifacts(
    accountId: string,
    filter?: { setKey?: string; rarity?: ArtifactRarity },
  ): Promise<ArtifactView[]> {
    const [artifacts, owned] = await Promise.all([
      this.prisma.artifact.findMany({
        where: {
          isActive: true,
          ...(filter?.setKey ? { setKey: filter.setKey } : {}),
          ...(filter?.rarity ? { rarity: filter.rarity } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.userArtifact.findMany({
        where: { accountId },
        select: { artifactId: true },
      }),
    ])
    const ownedSet = new Set(owned.map((row) => row.artifactId))
    return artifacts.map((artifact) => this.toArtifactView(artifact, ownedSet.has(artifact.id)))
  }

  /** 내 수집(진열장) — 보유 유물 목록(진열+숨김 전량). 진열 필터는 소유자 화면이 담당 */
  async getMyCollection(accountId: string): Promise<UserArtifactView[]> {
    const rows = await this.prisma.userArtifact.findMany({
      where: { accountId },
      include: { artifact: true },
      orderBy: [{ displayOrder: 'asc' }, { acquiredAt: 'desc' }],
    })
    return rows.map((row) => this.toUserArtifactView(row))
  }

  /**
   * 방문(놀러가기): 타 계정의 진열장 — 진열(displayed=true)분만 읽기전용 노출.
   * getMyCollection을 재사용하지 않는 이유: 그쪽은 숨김분까지 전량 반환하므로
   * 방문자에게 그대로 주면 숨긴 수집이 유출됨 → 서버에서 displayed 강제 필터.
   */
  async getPublicCollection(accountId: string): Promise<UserArtifactView[]> {
    const rows = await this.prisma.userArtifact.findMany({
      where: { accountId, displayed: true },
      include: { artifact: true },
      orderBy: [{ displayOrder: 'asc' }, { acquiredAt: 'desc' }],
    })
    return rows.map((row) => this.toUserArtifactView(row))
  }

  /**
   * 유물 구매(파피 소비). WalletService.spend로 race-safe 차감 + CONSUME 원장 기록 후 UserArtifact 생성.
   * 멱등(같은 requestId 재시도·이미 보유는 흡수). 1종 1개(uniq_user_artifact).
   */
  async purchaseArtifact(
    accountId: string,
    artifactId: string,
    requestId?: string,
  ): Promise<CollectArtifactResult> {
    const artifact = await this.prisma.artifact.findUnique({ where: { id: artifactId } })
    if (!artifact || !artifact.isActive) throw new NotFoundException('수집 가능한 유물이 아닙니다')
    const key = `ARTIFACT:${artifactId}:${this.normalizeRequestId(requestId)}`
    try {
      await this.prisma.$transaction(async (tx) => {
        const ledgerId = await this.walletService.spend(tx, accountId, artifact.pricePapy, key, artifactId)
        await tx.userArtifact.create({ data: { accountId, artifactId, ledgerId } })
      })
    } catch (error) {
      // P2002: 같은 requestId 재시도 또는 이미 보유 — 멱등 처리(차감은 트랜잭션 롤백으로 무효).
      if (!this.isUniqueViolation(error)) throw error
    }

    const owned = await this.prisma.userArtifact.findUnique({
      where: { uniq_user_artifact: { accountId, artifactId } },
      include: { artifact: true },
    })
    // P2002 흡수 후에도 보유분이 안 보이면 = 경쟁 거래 미커밋(드문 동시성). 영구 실패 아님.
    if (!owned) throw new ConflictException('수집 처리가 진행 중입니다. 잠시 후 다시 시도하세요')
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { papyBalance: true },
    })
    return { item: this.toUserArtifactView(owned), balance: account?.papyBalance ?? 0 }
  }

  /** 진열장 노출 토글 */
  async setDisplay(
    accountId: string,
    userArtifactId: string,
    displayed: boolean,
  ): Promise<UserArtifactView> {
    const owned = await this.prisma.userArtifact.findFirst({
      where: { id: userArtifactId, accountId },
      include: { artifact: true },
    })
    if (!owned) throw new NotFoundException('보유하지 않은 유물입니다')
    await this.prisma.userArtifact.update({ where: { id: userArtifactId }, data: { displayed } })
    return this.toUserArtifactView({ ...owned, displayed })
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────────────────────
  private toArtifactView(artifact: ArtifactRow, owned: boolean): ArtifactView {
    return {
      id: artifact.id,
      name: artifact.name,
      era: artifact.era,
      rarity: artifact.rarity,
      pricePapy: artifact.pricePapy,
      imageUrl: artifact.imageUrl,
      description: artifact.description,
      setKey: artifact.setKey,
      contentCentury: artifact.contentCentury,
      linkedType: artifact.linkedType,
      linkedId: artifact.linkedId,
      owned,
    }
  }

  private toUserArtifactView(row: UserArtifactRow): UserArtifactView {
    return {
      id: row.id,
      artifactId: row.artifactId,
      name: row.artifact.name,
      era: row.artifact.era,
      rarity: row.artifact.rarity,
      imageUrl: row.artifact.imageUrl,
      description: row.artifact.description,
      setKey: row.artifact.setKey,
      contentCentury: row.artifact.contentCentury,
      linkedType: row.artifact.linkedType,
      linkedId: row.artifact.linkedId,
      displayed: row.displayed,
      acquiredAt: row.acquiredAt.toISOString(),
    }
  }

  private normalizeRequestId(requestId?: string): string {
    const trimmed = (requestId ?? '').trim()
    if (!trimmed) throw new BadRequestException('requestId(멱등 키)가 필요합니다')
    return trimmed
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
}
