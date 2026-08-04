package kr.papyrus.pilot.shared;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * 와이어 포맷 날짜 문자열.
 *
 * <p>Nest 는 서비스 안에서 {@code date.toISOString()} 을 호출해 문자열로 만든 뒤 응답에 넣는다.
 * 파일럿도 같은 자리에서 문자열로 만든다. Jackson 직렬화기에 맡기지 않는 이유는 둘이다.
 *
 * <ol>
 *   <li><b>정확성</b>: JS 의 {@code toISOString()} 은 밀리초를 <b>항상 3자리</b> 낸다
 *       ({@code ...:56.700Z}). Java 의 {@link Instant#toString()} 은 ms 가 0 이면 소수부를
 *       통째로 생략한다({@code ...:56Z}). 골든에서 바로 깨지는 차이다.</li>
 *   <li><b>가시성</b>: 이건 계약이지 표현 취향이 아니다. DTO 필드 타입이 {@code String} 이면
 *       "여기는 포맷이 고정된 곳"이 타입으로 드러나고, 단위 테스트로 잡을 수 있다.</li>
 * </ol>
 */
public final class Iso8601 {

	/** {@code 2026-07-20T07:21:56.727Z} — 밀리초 3자리 고정, 항상 UTC(Z). */
	private static final DateTimeFormatter WIRE_FORMAT = DateTimeFormatter
			.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
			.withZone(ZoneOffset.UTC);

	private Iso8601() {
	}

	public static String format(Instant instant) {
		return instant == null ? null : WIRE_FORMAT.format(instant);
	}
}
