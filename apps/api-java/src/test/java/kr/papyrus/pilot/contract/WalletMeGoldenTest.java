package kr.papyrus.pilot.contract;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.util.List;
import kr.papyrus.pilot.support.GoldenLoader;
import kr.papyrus.pilot.support.MySqlContainerSupport;
import kr.papyrus.pilot.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;
import org.skyscreamer.jsonassert.JSONCompareMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code GET /wallet/me} 가 Nest 와 같은 응답을 내는지 대조한다.
 *
 * <p>구성이 순환이 아니라는 점이 중요하다.
 * <ul>
 *   <li><b>입력</b> = {@code db/fixture/wallet-golden-fixture.sql} — 골든을 뜬 시점의 <i>테이블 행</i></li>
 *   <li><b>기대값</b> = {@code golden/wallet-me.json} — 같은 시점의 <i>Nest 응답</i></li>
 * </ul>
 * 골든에서 거꾸로 시드했다면 매핑 계층만 검증하게 되고, 계산식(환전 상한·일일 한도)·정렬·
 * 날짜 포맷은 아무것도 증명하지 못한다.
 *
 * <p>둘은 반드시 같이 떠야 한다. 실제로 캡처 1시간 만에 {@code account.total_points} 가
 * 7185 → 7205 로 움직였고, 그러면 {@code exchangeableNow} 기대값이 718 vs 720 으로 갈린다.
 * {@code capture-golden.sh} 가 픽스처 덤프를 함께 부르는 이유다.
 */
@SpringBootTest(properties = "pilot.jwt-secret=" + TestTokens.SECRET)
@AutoConfigureMockMvc
@Sql(scripts = { "/db/fixture/reset.sql", "/db/fixture/wallet-golden-fixture.sql" })
@DisplayName("골든 대조: GET /wallet/me")
class WalletMeGoldenTest extends MySqlContainerSupport {

	/** 골든을 뜬 계정. 픽스처의 account 행과 같아야 한다. */
	private static final String ACCOUNT_ID = "6af53fe7-d02b-4c42-b86c-f32800897b32";

	@Autowired
	private MockMvc mockMvc;

	@Test
	@DisplayName("응답 본문이 Nest 골든과 값까지 일치한다")
	void matchesGoldenBody() throws Exception {
		GoldenLoader.Golden golden = GoldenLoader.load("wallet-me");

		MvcResult result = mockMvc.perform(get("/wallet/me")
						.header("Authorization", "Bearer " + TestTokens.signedFor(ACCOUNT_ID)))
				.andReturn();

		assertThat(result.getResponse().getStatus()).isEqualTo(golden.status());
		assertThat(result.getResponse().getContentType()).startsWith(MediaType.APPLICATION_JSON_VALUE);

		String actual = result.getResponse().getContentAsString();
		// STRICT: 필드가 남거나 모자라면 실패하고, 배열 순서도 본다.
		// 최근 거래는 createdAt 내림차순이라 순서 자체가 계약이다.
		JSONAssert.assertEquals(golden.body().toString(), actual, JSONCompareMode.STRICT);
	}

	@Test
	@DisplayName("최상위 키 순서까지 Nest 와 같다")
	void matchesGoldenKeyOrder() throws Exception {
		GoldenLoader.Golden golden = GoldenLoader.load("wallet-me");

		String actual = mockMvc.perform(get("/wallet/me")
						.header("Authorization", "Bearer " + TestTokens.signedFor(ACCOUNT_ID)))
				.andReturn().getResponse().getContentAsString();

		// JSONassert 는 키 순서를 보지 않는다. 순서는 따로 확인해야 한다 —
		// TS 객체 리터럴 전개 순서가 그대로 와이어에 나오므로 프론트가 스냅샷 테스트를
		// 걸어 두면 순서 차이만으로 깨진다.
		List<String> expected = golden.topLevelKeyOrder();
		List<String> got = new ObjectMapper().readTree(actual).propertyNames().stream().toList();

		assertThat(got).containsExactlyElementsOf(expected);
	}

	@Test
	@DisplayName("날짜는 밀리초 3자리 + Z 로 고정된다")
	void serializesDatesWithThreeMillisDigits() throws Exception {
		String actual = mockMvc.perform(get("/wallet/me")
						.header("Authorization", "Bearer " + TestTokens.signedFor(ACCOUNT_ID)))
				.andReturn().getResponse().getContentAsString();

		var recent = new ObjectMapper().readTree(actual).get("recent");
		assertThat(recent).isNotEmpty();
		for (var row : recent) {
			// Instant.toString() 은 ms 가 0 이면 .000 을 통째로 생략한다. 그걸 그대로 내보내면
			// 자정 정각에 생성된 거래 하나 때문에 골든이 깨진다.
			assertThat(row.get("createdAt").asString())
					.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z");
		}
	}
}
