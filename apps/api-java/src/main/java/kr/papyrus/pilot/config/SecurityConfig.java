package kr.papyrus.pilot.config;

import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import kr.papyrus.pilot.shared.error.EnvelopeErrorWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Nest 가 발급한 토큰을 <b>그대로 검증</b>한다. 파일럿은 토큰을 발급하지 않는다.
 *
 * <p>실측한 계약({@code jwt.strategy.ts}, {@code auth.module.ts}, 실제 토큰 헤더):
 * <ul>
 *   <li>알고리즘 HS256 대칭키 — {@code @nestjs/jwt} 에 문자열 secret 을 주면 기본이 HS256</li>
 *   <li>페이로드는 {@code {sub, iat, exp}} 뿐. issuer·audience 클레임 없음</li>
 *   <li>만료 검증함({@code ignoreExpiration: false}), 유효기간 30일</li>
 *   <li>추출 순서: 쿠키 {@code access_token} → {@code Authorization: Bearer}</li>
 * </ul>
 *
 * <p>키 길이 주의: Nest 의 {@code jsonwebtoken} 은 짧은 secret 도 받지만 Nimbus 는 HS256 에
 * <b>256비트(32바이트) 이상</b>을 요구하며, 미달이면 기동 시점이 아니라 첫 검증에서 터진다.
 * 현재 키는 46바이트라 통과한다. 짧은 키로 바꾸면 여기가 먼저 깨진다는 것을 알고 있어야 한다.
 *
 * <p>issuer/audience 검증을 <b>추가하지 않는다.</b> Spring 쪽에서만 추가하면 Nest 가 발급한
 * 기존 토큰이 전부 401 이 된다 — 계약을 한쪽에서만 조이는 건 강화가 아니라 파손이다.
 */
@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

	@Bean
	JwtDecoder jwtDecoder(PilotProperties properties) {
		String secret = properties.jwtSecret();
		if (secret == null || secret.isBlank()) {
			throw new IllegalStateException(
					"PILOT_JWT_SECRET 이 비어 있다. Nest 와 같은 대칭키가 없으면 토큰을 검증할 수 없다. "
							+ "tools/env.sh 가 루트 env.development 의 JWT_SECRET 을 읽어 넣는다.");
		}
		byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
		if (keyBytes.length < 32) {
			throw new IllegalStateException(
					"JWT 대칭키가 %d 바이트다. Nimbus 는 HS256 에 32바이트 이상을 요구한다 (Nest 의 jsonwebtoken 은 허용)."
							.formatted(keyBytes.length));
		}
		return NimbusJwtDecoder
				.withSecretKey(new SecretKeySpec(keyBytes, "HmacSHA256"))
				.macAlgorithm(MacAlgorithm.HS256)
				.build();
	}

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http, EnvelopeErrorWriter errorWriter) throws Exception {
		return http
				// 파일럿은 쿠키를 심지도, 세션을 만들지도 않는다. 순수 토큰 검증만 한다.
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.formLogin(form -> form.disable())
				.httpBasic(basic -> basic.disable())
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2
						.bearerTokenResolver(new CookieOrHeaderBearerTokenResolver())
						.jwt(Customizer.withDefaults())
						// 401/403 도 Nest 봉투로 낸다. 여기서 모양이 갈리면 프론트의
						// /auth/refresh 자동 재시도가 분기를 못 탄다.
						.authenticationEntryPoint((request, response, ex) -> errorWriter.write(
								request, response, 401, "UnauthorizedException", "Unauthorized"))
						.accessDeniedHandler((request, response, ex) -> errorWriter.write(
								request, response, 403, "ForbiddenException", "Forbidden")))
				.exceptionHandling(handling -> handling
						.authenticationEntryPoint((request, response, ex) -> errorWriter.write(
								request, response, 401, "UnauthorizedException", "Unauthorized"))
						.accessDeniedHandler((request, response, ex) -> errorWriter.write(
								request, response, 403, "ForbiddenException", "Forbidden")))
				.build();
	}
}
