package kr.papyrus.pilot.wallet.web.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * 원장 한 줄의 노출면. 원장 행의 일부만 낸다 — 멱등키·역분개 대상·행위자는 내부 정보다.
 *
 * @param reason    enum 이 아니라 {@code String} 이다. Nest 가 Prisma enum 값을 그대로 문자열로
 *                  내보내므로 값은 같지만, 여기서 Java enum 을 쓰면 <b>DB 에 새 값이 생겼을 때
 *                  조회 자체가 죽는다.</b> 응답 DTO 는 읽는 쪽이라 넓게 받는다
 * @param createdAt {@code 2026-07-20T07:21:56.727Z} — 밀리초 3자리 고정 문자열.
 *                  {@code Iso8601.format} 참고
 */
@JsonPropertyOrder({ "id", "amount", "reason", "createdAt" })
public record WalletLedgerView(
		String id,
		int amount,
		String reason,
		String createdAt) {
}
