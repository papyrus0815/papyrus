import {
  Controller,
  Req,
  Res,
  UseGuards,
  Post,
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
import type { Response } from 'express'
import { AppConfigService } from '../../shared/config/config.service'
import type { AccountMeResponseDto } from './dto/account-me.response'

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
  ) {}

  /**
   * 로그인 요청 처리
   * @param dto - 로그인 요청 데이터
   * @param res - 응답 객체
   * @returns - 로그인 응답 데이터  
   */  
  @Post('login')
  @ApiOperation({ summary: '로그인' })
  async login(
    @Body() dto: LoginDto, 
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponseDto> {
    // 로그인 처리
    const tokens = await this.auth.login(dto)
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken)
    
    return tokens
  }

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
    
    const cookieSettings = this.configService.security.cookieSettings
    res.cookie('access_token', result.accessToken, {
      ...cookieSettings,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30d
    })

    return { ok: true }
  }

  private setAuthCookies(res: Response, access: string, refresh?: string) {
    const settings = this.configService.security.cookieSettings;
    
    res.cookie('access_token', access, {
      ...settings,
      maxAge: this.parseDuration(this.configService.jwt.expiresIn || '1h'), 
    });

    if (refresh) {
      res.cookie('refresh_token', refresh, {
        ...settings,
        maxAge: this.parseDuration(this.configService.jwt.refreshExpiresIn),
      });
    }
  }

  // '30d' 같은 문자열을 ms 숫자로 변환하는 유틸리티 (ms 라이브러리 활용 권장)
  private parseDuration(d: any): number {
    // 임시: 하드코딩 대신 config의 단위를 숫자로 변환하는 로직 필요
    return 1000 * 60 * 60 * 24 * 30; 
  }
}

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('account')
export class AccountController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountRepository: AccountsPrismaRepository,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '내 정보 조회' })
  async me(@Req() req: any): Promise<AccountMeResponseDto | null> {
    const userId = req.user?.userId;
    if (!userId) return null;

    const account = await this.accountRepository.findById(userId);
    if (!account) return null;

    return { 
      id: account.id, 
      account: account.username, 
      heroId: account.heroId 
    };
  }
}