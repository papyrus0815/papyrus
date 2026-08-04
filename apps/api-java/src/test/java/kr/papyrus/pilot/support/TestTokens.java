package kr.papyrus.pilot.support;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Nest 가 발급하는 것과 <b>같은 모양</b>의 토큰을 테스트에서 만든다.
 *
 * <p>실측한 실제 토큰: 헤더 {@code {"alg":"HS256","typ":"JWT"}}, 클레임 {@code {sub, iat, exp}}.
 * issuer·audience 없음. 여기에 없는 클레임을 넣으면 "우리가 만든 토큰만 통과하는" 테스트가 되어
 * 실제 Nest 토큰과의 호환을 증명하지 못한다.
 */
public final class TestTokens {

	/**
	 * 테스트용 대칭키. 32바이트 이상이어야 한다 — Nimbus 는 HS256 에 256비트 미만 키를 거부한다
	 * (Nest 의 jsonwebtoken 은 짧아도 받는다).
	 */
	public static final String SECRET = "pilot-test-secret-key-at-least-32-bytes-long!!";

	private TestTokens() {
	}

	public static String signedFor(String accountId) {
		return signedFor(accountId, Instant.now().plus(30, ChronoUnit.DAYS));
	}

	public static String signedFor(String accountId, Instant expiresAt) {
		try {
			Instant issuedAt = Instant.now();
			JWTClaimsSet claims = new JWTClaimsSet.Builder()
					.subject(accountId)
					.issueTime(Date.from(issuedAt))
					.expirationTime(Date.from(expiresAt))
					.build();

			SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
			jwt.sign(new MACSigner(SECRET.getBytes(StandardCharsets.UTF_8)));
			return jwt.serialize();
		}
		catch (Exception ex) {
			throw new IllegalStateException("테스트 토큰 서명 실패", ex);
		}
	}
}
