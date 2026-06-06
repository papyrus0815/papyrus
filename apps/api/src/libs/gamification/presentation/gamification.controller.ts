import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PointService, type CenturyFilter, type LeaderboardPeriod } from '../application/point.service'

/** 내 점수/등급 요약 응답 */
export interface PointSummaryResponseDto {
  /** 누적 점수 */
  totalPoints: number
  /** 현재 등급 코드 (BRONZE/SILVER/GOLD/PLATINUM/DIAMOND) */
  gradeCode: string
  /** 다음 등급 코드 (최고 등급이면 null) */
  nextGradeCode: string | null
  /** 현재 등급 시작 점수 */
  currentGradeMin: number
  /** 다음 등급 시작 점수 (최고 등급이면 null) */
  nextGradeMin: number | null
  /** 다음 등급까지 남은 점수 */
  pointsToNext: number
  /** 현재 등급 구간 진행률 0~1 */
  progressRatio: number
  /** 현재 유효한 등록 기여 수 */
  contributionCount: number
  /** 전체 순위 (1부터, 점수 0이면 null) */
  rank: number | null
  /** 현재 연속 등록 일수 */
  streakDays: number
}

/** 뱃지 응답 */
export interface BadgeResponseDto {
  /** 뱃지 코드 */
  code: string
  /** 한글 이름 */
  label: string
  /** 설명(획득 조건) */
  description: string
  /** 강조 색 */
  color: string
  /** 획득 여부 */
  earned: boolean
  /** 획득 시각 ISO 문자열 (미획득이면 null) */
  earnedAt: string | null
  /** 현재 진행값 (타깃 상한으로 캡) */
  current: number
  /** 획득 임계값 */
  target: number
  /** 이 뱃지 보유자 수 */
  holdersCount: number
  /** 활동 사용자 중 보유 비율 % (모집단 0이면 null) */
  rarityPct: number | null
}

/** 리더보드 한 줄 응답 */
export interface LeaderboardEntryResponseDto {
  /** 순위 (1부터) */
  rank: number
  /** 계정 ID */
  accountId: string
  /** 계정명 */
  username: string
  /** 등급 코드 */
  gradeCode: string
  /** 누적 점수 */
  totalPoints: number
  /** 유효 등록 기여 수 */
  contributionCount: number
  /** 히어로 썸네일 (없으면 null) */
  heroThumbnail: string | null
  /** 조회한 본인 여부 */
  isMe: boolean
}

/** 세기 선택지 한 개 응답 (세기별 리더보드 셀렉터용) */
export interface CenturyOptionResponseDto {
  /** 세기 정수 (AD 양수/BC 음수). 세기 미상 버킷이면 null */
  century: number | null
  /** 사람이 읽는 라벨 (예: "19세기", "기원전 1세기", "세기 미상") */
  label: string
  /** 이 세기에 점수가 적립된 콘텐츠 등록 건수 */
  entryCount: number
}

/** 활동 내역 한 줄 응답 */
export interface ActivityEntryResponseDto {
  id: string
  /** 증감 점수 */
  amount: number
  /** 사유 코드 */
  reason: string
  /** 대상 콘텐츠 타입 */
  ownerType: string
  /** 발생 시각 ISO */
  createdAt: string
}

/** 공개 프로필 응답 */
export interface PublicProfileResponseDto {
  accountId: string
  username: string
  heroName: string | null
  heroThumbnail: string | null
  gradeCode: string
  totalPoints: number
  rank: number | null
  contributionCount: number
  /** 획득한 뱃지 목록 */
  badges: BadgeResponseDto[]
  /** 이 사용자가 기여한 세기별 net 등록 수 (내림차순, 없으면 빈 배열) */
  centuryBreakdown: CenturyOptionResponseDto[]
}

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('gamification')
export class GamificationController {
  constructor(private readonly pointService: PointService) {}

  @Get('me')
  @ApiOperation({ summary: '내 점수/등급 요약 조회' })
  async me(@Req() req: any): Promise<PointSummaryResponseDto | null> {
    const userId = req.user?.userId ?? req.user?.id
    if (!userId) return null
    return this.pointService.getSummary(userId)
  }

  @Get('badges')
  @ApiOperation({ summary: '내 뱃지 목록 조회 (전체 카탈로그 + 획득 여부)' })
  async badges(@Req() req: any): Promise<BadgeResponseDto[]> {
    const userId = req.user?.userId ?? req.user?.id
    if (!userId) return []
    return this.pointService.getBadges(userId)
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '리더보드 (기간별 all/week/month + 선택적 세기 슬라이스)' })
  async leaderboard(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('period') period?: string,
    @Query('century') century?: string,
  ): Promise<LeaderboardEntryResponseDto[]> {
    const userId = req.user?.userId ?? req.user?.id
    const n = limit != null ? parseInt(limit, 10) : 20
    const p: LeaderboardPeriod =
      period === 'week' || period === 'month' ? period : 'all'
    // 세기 파라미터: 'unknown'(세기 미상 버킷) | 정수 문자열(AD 양수/BC 음수) | 미지정(전체)
    let c: CenturyFilter | undefined
    if (century === 'unknown') {
      c = 'unknown'
    } else if (century != null && century !== '') {
      const parsed = parseInt(century, 10)
      if (Number.isFinite(parsed)) c = parsed
    }
    return this.pointService.getLeaderboard(Number.isFinite(n) && n > 0 ? n : 20, userId, p, c)
  }

  @Get('centuries')
  @ApiOperation({ summary: '세기별 리더보드 셀렉터용 — 적립이 달린 세기 목록(건수 포함)' })
  async centuries(): Promise<CenturyOptionResponseDto[]> {
    return this.pointService.getAvailableCenturies()
  }

  @Get('activity')
  @ApiOperation({ summary: '내 활동 내역 (최근 점수 변동)' })
  async activity(
    @Req() req: any,
    @Query('limit') limit?: string,
  ): Promise<ActivityEntryResponseDto[]> {
    const userId = req.user?.userId ?? req.user?.id
    if (!userId) return []
    const n = limit != null ? parseInt(limit, 10) : 30
    return this.pointService.getActivity(userId, Number.isFinite(n) && n > 0 ? n : 30)
  }

  @Get('profile/:accountId')
  @ApiOperation({ summary: '공개 프로필 (타 사용자 등급·뱃지 열람)' })
  async profile(@Param('accountId') accountId: string): Promise<PublicProfileResponseDto | null> {
    return this.pointService.getPublicProfile(accountId)
  }
}
