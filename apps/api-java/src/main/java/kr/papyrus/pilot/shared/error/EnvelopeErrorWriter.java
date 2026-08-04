package kr.papyrus.pilot.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * 시큐리티 필터 체인에서 발생한 에러를 Nest 봉투로 직접 써 내려간다.
 *
 * <p>필터 단계의 예외는 {@code @RestControllerAdvice} 에 도달하지 않는다. 아직 DispatcherServlet
 * 에 들어가기 전이기 때문이다. 그래서 401/403 만 별도로 여기서 처리한다 — 이걸 빼먹으면
 * 컨트롤러 예외는 Nest 모양인데 인증 실패만 Spring 기본 모양이 되어, 하필 프론트가 가장
 * 의존하는 401 이 깨진다.
 */
@Component
public class EnvelopeErrorWriter {

	private final ObjectMapper objectMapper;
	private final Clock clock;

	public EnvelopeErrorWriter(ObjectMapper objectMapper, Clock clock) {
		this.objectMapper = objectMapper;
		this.clock = clock;
	}

	public void write(HttpServletRequest request, HttpServletResponse response, int status,
			String exceptionName, String message) throws IOException {

		ErrorEnvelope envelope = ErrorEnvelope.of(
				Instant.now(clock), request.getRequestURI(), request.getMethod(), status, exceptionName, message);

		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write(objectMapper.writeValueAsString(envelope));
	}
}
