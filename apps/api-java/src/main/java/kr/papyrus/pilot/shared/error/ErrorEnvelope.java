package kr.papyrus.pilot.shared.error;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import kr.papyrus.pilot.shared.Iso8601;

/**
 * Nest 의 에러 응답 봉투를 그대로 재현한다.
 *
 * <p>Spring 의 기본값인 {@code ProblemDetail}(RFC 7807) 을 <b>쓰지 않는다.</b> 프론트의
 * 인터셉터가 이 모양을 보고 동작하기 때문이다 — 특히 401 을 받으면 {@code /auth/refresh} 로
 * 자동 재시도하는데, 봉투가 바뀌면 그 분기가 타지 않아 사용자가 재로그인 루프에 빠진다.
 *
 * <p>"더 표준적인 포맷" 은 여기서 개선이 아니라 회귀다. 계약을 바꾸는 건 파일럿 범위 밖이다.
 *
 * <p>실측 형태 ({@code golden/wallet-me-unauthenticated.json}):
 * <pre>
 * {
 *   "success": false,
 *   "timestamp": "2026-08-04T04:43:47.381Z",
 *   "path": "/wallet/me",
 *   "method": "GET",
 *   "statusCode": 401,
 *   "error": { "name": "UnauthorizedException", "message": "Unauthorized",
 *              "details": { "message": "Unauthorized", "statusCode": 401 } },
 *   "requestId": "4d2da871-..."
 * }
 * </pre>
 */
@JsonPropertyOrder({ "success", "timestamp", "path", "method", "statusCode", "error", "requestId" })
public record ErrorEnvelope(
		boolean success,
		String timestamp,
		String path,
		String method,
		int statusCode,
		Detail error,
		String requestId) {

	@JsonPropertyOrder({ "name", "message", "details" })
	public record Detail(String name, String message, Map<String, Object> details) {
	}

	public static ErrorEnvelope of(Instant now, String path, String method, int statusCode,
			String exceptionName, String message) {

		Map<String, Object> details = new LinkedHashMap<>();
		details.put("message", message);
		details.put("statusCode", statusCode);

		return new ErrorEnvelope(
				false,
				Iso8601.format(now),
				path,
				method,
				statusCode,
				new Detail(exceptionName, message, details),
				UUID.randomUUID().toString());
	}
}
