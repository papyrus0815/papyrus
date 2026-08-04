package kr.papyrus.pilot.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 컨트롤러 단계 예외를 Nest 봉투로 변환한다.
 *
 * <p>{@code ProblemDetail} 을 쓰지 않는 이유는 {@link ErrorEnvelope} 주석 참고.
 * 필터 단계(401/403)는 여기 오지 않으므로 {@code EnvelopeErrorWriter} 가 따로 처리한다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private final Clock clock;

	public GlobalExceptionHandler(Clock clock) {
		this.clock = clock;
	}

	@ExceptionHandler(NotFoundException.class)
	ResponseEntity<ErrorEnvelope> handleNotFound(NotFoundException ex, HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, "NotFoundException", ex.getMessage(), request);
	}

	private ResponseEntity<ErrorEnvelope> build(HttpStatus status, String name, String message,
			HttpServletRequest request) {

		ErrorEnvelope envelope = ErrorEnvelope.of(
				Instant.now(clock), request.getRequestURI(), request.getMethod(), status.value(), name, message);
		return ResponseEntity.status(status).body(envelope);
	}
}
