package kr.papyrus.pilot.shared.error;

/**
 * 404. Nest 의 {@code NotFoundException} 에 대응하며 사용자 노출 메시지를 그대로 담는다.
 *
 * <p>메시지가 한국어인 것은 의도다 — Nest 가 내는 문구를 프론트가 토스트에 그대로 띄우므로
 * 영어로 바꾸면 사용자에게 보이는 텍스트가 바뀐다.
 */
public class NotFoundException extends RuntimeException {

	public NotFoundException(String message) {
		super(message);
	}
}
