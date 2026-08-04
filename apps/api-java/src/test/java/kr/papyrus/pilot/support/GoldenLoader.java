package kr.papyrus.pilot.support;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code src/test/resources/golden/*.json} 을 읽는다.
 *
 * <p>이 파일들은 파일럿 코드를 쓰기 <b>전에</b> Nest(:8000)에서 뜬 실제 응답이다.
 * 갱신은 {@code ./tools/capture-golden.sh} 로만 한다 — 손으로 고치면 기준선이 아니라
 * 희망사항이 된다.
 */
public final class GoldenLoader {

	private static final ObjectMapper MAPPER = new ObjectMapper();

	private GoldenLoader() {
	}

	public record Golden(String name, int status, boolean bodyEmpty, JsonNode body) {

		/** 골든 본문의 최상위 키 순서. 응답 키 순서도 계약이라 따로 뽑아 쓴다. */
		public List<String> topLevelKeyOrder() {
			return body.propertyNames().stream().toList();
		}
	}

	public static Golden load(String name) {
		String path = "/golden/" + name + ".json";
		try (InputStream in = GoldenLoader.class.getResourceAsStream(path)) {
			if (in == null) {
				throw new IllegalStateException(
						"골든이 없다: %s — ./tools/capture-golden.sh 를 먼저 실행할 것".formatted(path));
			}
			JsonNode root = MAPPER.readTree(in);
			return new Golden(name, root.get("status").asInt(), root.get("bodyEmpty").asBoolean(), root.get("body"));
		}
		catch (IOException ex) {
			throw new IllegalStateException("골든 읽기 실패: " + path, ex);
		}
	}
}
