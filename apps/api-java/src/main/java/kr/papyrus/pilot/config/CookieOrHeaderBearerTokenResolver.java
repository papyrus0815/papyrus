package kr.papyrus.pilot.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.util.StringUtils;

/**
 * Nest 의 토큰 추출 순서를 그대로 재현한다: <b>쿠키 {@code access_token} 우선, 그 다음
 * {@code Authorization: Bearer}</b>.
 *
 * <p>근거는 {@code jwt.strategy.ts:11-14} 의 {@code ExtractJwt.fromExtractors([...])} 다.
 * 배열 순서가 곧 우선순위이고, 쿠키가 먼저다.
 *
 * <p>Spring 의 기본 {@code DefaultBearerTokenResolver} 는 헤더만 본다. 그대로 쓰면 브라우저에서
 * 온 요청(쿠키만 있고 헤더는 없음)이 전부 401 이 된다 — 프론트는 로그인 시 서버가 심은
 * {@code access_token} 쿠키로 다니기 때문이다.
 *
 * <p>순서를 반대로 하면 더 미묘하게 깨진다. 쿠키와 헤더가 둘 다 있고 서로 다른 계정일 때
 * (계정 전환 직후 자주 발생한다) Nest 와 파일럿이 서로 다른 사용자로 판정한다.
 */
public class CookieOrHeaderBearerTokenResolver implements BearerTokenResolver {

	private static final String COOKIE_NAME = "access_token";
	private static final String BEARER_PREFIX = "Bearer ";

	@Override
	public String resolve(HttpServletRequest request) {
		String fromCookie = readCookie(request);
		if (StringUtils.hasText(fromCookie)) {
			return fromCookie;
		}
		return readAuthorizationHeader(request);
	}

	private String readCookie(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (COOKIE_NAME.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private String readAuthorizationHeader(HttpServletRequest request) {
		String header = request.getHeader("Authorization");
		if (header != null && header.startsWith(BEARER_PREFIX)) {
			String token = header.substring(BEARER_PREFIX.length()).trim();
			return StringUtils.hasText(token) ? token : null;
		}
		return null;
	}
}
