package kr.papyrus.pilot.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import kr.papyrus.pilot.support.GoldenLoader;
import kr.papyrus.pilot.support.MySqlContainerSupport;
import kr.papyrus.pilot.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.Customization;
import org.skyscreamer.jsonassert.JSONAssert;
import org.skyscreamer.jsonassert.JSONCompareMode;
import org.skyscreamer.jsonassert.comparator.CustomComparator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/**
 * 인증 계약. Nest 가 발급한 토큰을 파일럿이 그대로 받아들이는지, 그리고 실패했을 때 응답 봉투가
 * Nest 와 같은지 확인한다.
 *
 * <p>401 봉투 모양이 왜 계약인가: 프론트 인터셉터가 401 을 보고 {@code /auth/refresh} 로
 * 자동 재시도한다. Spring 기본값인 {@code ProblemDetail} 로 바뀌면 그 분기를 타지 못해
 * 사용자가 재로그인 루프에 빠진다. "더 표준적인 포맷" 이 여기서는 회귀다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Sql(scripts = { "/db/fixture/reset.sql", "/db/fixture/wallet-golden-fixture.sql" })
@DisplayName("계약: 인증")
class AuthContractTest extends MySqlContainerSupport {

	private static final String ACCOUNT_ID = "6af53fe7-d02b-4c42-b86c-f32800897b32";

	@Autowired
	private MockMvc mockMvc;

	@Test
	@DisplayName("토큰이 없으면 Nest 와 같은 401 봉투를 낸다")
	void unauthenticatedMatchesGoldenEnvelope() throws Exception {
		GoldenLoader.Golden golden = GoldenLoader.load("wallet-me-unauthenticated");

		var response = mockMvc.perform(get("/wallet/me")).andReturn().getResponse();

		assertThat(response.getStatus()).isEqualTo(401);

		// timestamp 와 requestId 는 매 요청 달라지는 값이라 존재·타입만 본다.
		// 나머지 필드는 값까지 같아야 한다.
		JSONAssert.assertEquals(
				golden.body().toString(),
				response.getContentAsString(),
				new CustomComparator(JSONCompareMode.STRICT,
						Customization.customization("timestamp", (actual, expected) -> actual != null),
						Customization.customization("requestId", (actual, expected) -> actual != null)));
	}

	@Test
	@DisplayName("Authorization: Bearer 로 통과한다")
	void acceptsBearerHeader() throws Exception {
		int status = mockMvc.perform(get("/wallet/me")
						.header("Authorization", "Bearer " + TestTokens.signedFor(ACCOUNT_ID)))
				.andReturn().getResponse().getStatus();

		assertThat(status).isEqualTo(200);
	}

	@Test
	@DisplayName("access_token 쿠키만으로도 통과한다 — 프론트는 이 경로로 다닌다")
	void acceptsAccessTokenCookie() throws Exception {
		// Spring 기본 BearerTokenResolver 는 헤더만 본다. 그대로 뒀다면 브라우저에서 온
		// 요청(쿠키만 있음)이 전부 401 이 된다.
		int status = mockMvc.perform(get("/wallet/me")
						.cookie(new Cookie("access_token", TestTokens.signedFor(ACCOUNT_ID))))
				.andReturn().getResponse().getStatus();

		assertThat(status).isEqualTo(200);
	}

	@Test
	@DisplayName("쿠키와 헤더가 모두 있으면 쿠키가 이긴다 — Nest 의 추출기 순서")
	void cookieWinsOverHeader() throws Exception {
		// jwt.strategy.ts:11-14 의 fromExtractors 배열 순서가 쿠키 먼저다.
		// 순서를 반대로 하면 계정 전환 직후처럼 둘이 다른 계정을 가리킬 때
		// Nest 와 파일럿이 서로 다른 사용자로 판정한다.
		String cookieAccount = ACCOUNT_ID;
		String headerAccount = "00000000-0000-0000-0000-000000000000"; // 픽스처에 없는 계정

		int status = mockMvc.perform(get("/wallet/me")
						.cookie(new Cookie("access_token", TestTokens.signedFor(cookieAccount)))
						.header("Authorization", "Bearer " + TestTokens.signedFor(headerAccount)))
				.andReturn().getResponse().getStatus();

		// 헤더가 이겼다면 존재하지 않는 계정이라 404 가 났을 것이다.
		assertThat(status).isEqualTo(200);
	}

	@Test
	@DisplayName("만료된 토큰은 401")
	void rejectsExpiredToken() throws Exception {
		String expired = TestTokens.signedFor(ACCOUNT_ID, Instant.now().minus(1, ChronoUnit.MINUTES));

		int status = mockMvc.perform(get("/wallet/me").header("Authorization", "Bearer " + expired))
				.andReturn().getResponse().getStatus();

		// Nest 도 ignoreExpiration: false 다. 여기가 통과하면 만료 토큰이 영원히 사는 셈이 된다.
		assertThat(status).isEqualTo(401);
	}

	@Test
	@DisplayName("다른 키로 서명한 토큰은 401")
	void rejectsForeignSignature() throws Exception {
		// 서명만 다르고 클레임은 완전히 정상인 토큰. 구조 검사만 하고 서명을 안 보면 통과한다.
		String forged = com.nimbusds.jwt.SignedJWT.parse(TestTokens.signedFor(ACCOUNT_ID))
				.getParsedString();
		String tampered = forged.substring(0, forged.lastIndexOf('.') + 1) + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

		int status = mockMvc.perform(get("/wallet/me").header("Authorization", "Bearer " + tampered))
				.andReturn().getResponse().getStatus();

		assertThat(status).isEqualTo(401);
	}

	@Test
	@DisplayName("존재하지 않는 계정은 Nest 와 같은 404 봉투")
	void unknownAccountReturns404Envelope() throws Exception {
		String token = TestTokens.signedFor("00000000-0000-0000-0000-000000000000");

		var response = mockMvc.perform(get("/wallet/me").header("Authorization", "Bearer " + token))
				.andReturn().getResponse();

		assertThat(response.getStatus()).isEqualTo(404);

		var body = new ObjectMapper().readTree(response.getContentAsString());
		assertThat(body.get("success").asBoolean()).isFalse();
		assertThat(body.get("statusCode").asInt()).isEqualTo(404);
		assertThat(body.get("path").asString()).isEqualTo("/wallet/me");
		assertThat(body.get("method").asString()).isEqualTo("GET");
		// 메시지는 Nest 원문 그대로. 프론트가 토스트에 띄우므로 번역하면 사용자 화면이 바뀐다.
		assertThat(body.get("error").get("message").asString()).isEqualTo("계정을 찾을 수 없습니다");
	}

	@Test
	@DisplayName("헬스체크는 인증 없이 열려 있다")
	void healthIsPublic() throws Exception {
		int status = mockMvc.perform(get("/actuator/health")).andReturn().getResponse().getStatus();
		assertThat(status).isEqualTo(200);
	}
}
