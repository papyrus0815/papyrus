import {
  Controller,
  Req,
  Res,
  UseGuards,
  Post,
  Patch,
  Get,
  Body,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from '../application/auth.service'
import { LoginDto } from './dto/login.dto'
import type { LoginResponseDto } from './dto/login.response'
import { AuthGuard } from '@nestjs/passport'
import { Inject } from '@nestjs/common'
import { AccountsPrismaRepository } from '../infrastructure/accounts.prisma.repository'
import type { Request, Response } from 'express'
import { AppConfigService } from '../../shared/config/config.service'
import { Public } from '../../shared/auth'
import { parseDurationMs } from '../domain/duration.util'
import {
  LoginAttemptLimiter,
  TooManyLoginAttemptsException,
} from '../application/login-attempt-limiter'
import type { AccountMeResponseDto } from './dto/account-me.response'
import { ChangePasswordDto } from './dto/change-password.dto'
import { UpdateDisplayNameDto } from './dto/update-display-name.dto'
import { SetRepresentativePersonDto } from './dto/set-representative-person.dto'

/**
 * 인증 컨트롤러  
 * @description 로그인, 세션 디버그, 리프레시 토큰 재발급 기능 제공
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly configService: AppConfigService,
    private readonly loginLimiter: LoginAttemptLimiter,
  ) {}

  /**
   * 로그인 요청 처리
   * @param dto - 로그인 요청 데이터
   * @param res - 응답 객체
   * @returns - 로그인 응답 데이터  
   */  
  @Public()
  @Post('login')
  @ApiOperation({ summary: '로그인' })
  async login(
    @Body() dto: LoginDto, 
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponseDto> {
    // req.ip는 main.ts의 trust proxy(루프백) 설정으로 nginx 뒤에서도 실제 클라이언트 IP
    const ip = req.ip ?? 'unknown'
    try {
      this.loginLimiter.assertAllowed(ip, dto.account)
    } catch (error) {
      if (error instanceof TooManyLoginAttemptsException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds))
      }
      throw error
    }

    let tokens: { accessToken: string; refreshToken: string }
    try {
      tokens = await this.auth.login(dto)
    } catch (error) {
      if (error instanceof UnauthorizedException) this.loginLimiter.recordFailure(ip, dto.account)
      throw error
    }
    this.loginLimiter.recordSuccess(ip, dto.account)
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken)

    // 리프레시 토큰은 httpOnly 쿠키로만 준다 — 본문에 실으면 JS(XSS)가 읽을 수 있다
    return { accessToken: tokens.accessToken }
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: '로그아웃 — 리프레시 토큰 취소 + 인증 쿠키 삭제' })
  async logout(
    @Req() req: Request & { cookies?: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    await this.auth.logout(req.cookies?.refresh_token)
    const { maxAge: _maxAge, ...settings } = this.configService.security.cookieSettings
    res.clearCookie('access_token', settings)
    res.clearCookie('refresh_token', settings)
    return { ok: true }
  }

  @Public()
  @Get('session')
  @ApiOperation({ summary: '세션 디버그: 쿠키 및 토큰 상태' })
  async session(@Req() req: any): Promise<{
    hasAccessCookie: boolean
    hasRefreshCookie: boolean
    accessValid: boolean
  }> {
    const access = req.cookies?.access_token
    const refresh = req.cookies?.refresh_token
    
    const accessValid = access ? 
      Boolean(await this.auth.validateToken(access)) : 
      false

    return {
      hasAccessCookie: Boolean(access),
      hasRefreshCookie: Boolean(refresh),
      accessValid,
    }
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '리프레시 토큰으로 액세스 토큰 재발급' })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const refreshToken = req.cookies?.refresh_token as string | undefined
    if (!refreshToken) return { ok: false }
    
    const result = await this.auth.refreshToken(refreshToken)
    if (!result) return { ok: false }
    
    this.setAuthCookies(res, result.accessToken)

    return { ok: true }
  }

  private setAuthCookies(res: Response, access: string, refresh?: string) {
    const settings = this.configService.security.cookieSettings
    res.cookie('access_token', access, {
      ...settings,
      maxAge: parseDurationMs(this.configService.jwt.expiresIn) ?? settings.maxAge,
    })
    if (refresh) setRefreshCookie(this.configService, res, refresh)
  }
}

/** 쿠키 수명 = 토큰 수명. 어긋나면 만료된 토큰을 든 쿠키가 남거나, 살아 있는 토큰을 쿠키가 먼저 버린다. */
function setRefreshCookie(configService: AppConfigService, res: Response, refresh: string) {
  const settings = configService.security.cookieSettings
  res.cookie('refresh_token', refresh, {
    ...settings,
    maxAge: parseDurationMs(configService.jwt.refreshExpiresIn) ?? settings.maxAge,
  })
}

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('account')
export class AccountController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountRepository: AccountsPrismaRepository,
    private readonly configService: AppConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  async me(@Req() req: any): Promise<AccountMeResponseDto | null> {
    const userId = req.user?.userId;
    if (!userId) return null;

    const account = await this.accountRepository.findMeView(userId);
    if (!account) return null;

    return {
      id: account.id,
      account: account.username,
      displayName: account.displayName,
      representativePersonId: account.representativePersonId,
      heroName: account.representativePerson?.name ?? null,
      heroThumbnail: account.representativePerson?.profileImageUrl ?? null,
      createdAt: account.createdAt.toISOString(),
      totalPoints: account.totalPoints,
      gradeCode: account.gradeCode,
    };
  }

  @Post('change-password')
  @ApiOperation({ summary: '비밀번호 변경' })
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    // 변경 시 모든 리프레시 토큰이 취소되므로, 지금 이 기기만 새 토큰으로 이어 준다
    const refreshToken = await this.authService.issueRefreshToken(userId)
    setRefreshCookie(this.configService, res, refreshToken)
    return { ok: true };
  }

  @Patch('display-name')
  @ApiOperation({ summary: '닉네임(표시명) 변경 — 로그인 ID는 불변' })
  async updateDisplayName(
    @Req() req: any,
    @Body() dto: UpdateDisplayNameDto,
  ): Promise<{ ok: boolean; displayName: string }> {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    const displayName = await this.authService.changeDisplayName(
      userId,
      dto.displayName,
    );
    return { ok: true, displayName };
  }

  @Patch('representative-person')
  @ApiOperation({ summary: '대표 인물(아바타) 지정/해제' })
  async setRepresentativePerson(
    @Req() req: any,
    @Body() dto: SetRepresentativePersonDto,
  ): Promise<{ ok: boolean }> {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();

    await this.authService.setRepresentativePerson(userId, dto.personId);
    return { ok: true };
  }
}