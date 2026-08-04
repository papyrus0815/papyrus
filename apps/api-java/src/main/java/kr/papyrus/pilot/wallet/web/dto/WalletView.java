package kr.papyrus.pilot.wallet.web.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import java.util.List;

/**
 * {@code GET /wallet/me} 응답.
 *
 * <p>키 순서는 Nest 의 객체 리터럴 전개 순서를 그대로 따른다
 * ({@code wallet.service.ts:155-166}). 레코드 선언 순서만으로도 맞지만
 * {@link JsonPropertyOrder} 로 한 번 더 못박는다 — 순서가 계약이라는 사실을 코드에 남기기 위해서다.
 *
 * @param balance                 {@code account.papy_balance} 캐시 값 그대로. 원장 SUM 이 아니다
 * @param pointsPerPapy           환율 상수(10)
 * @param exchangeableNow         {@code max(0, floor(totalPoints/10) − Σ POINT_EXCHANGE 전체)}
 * @param dailyExchangeRemaining  {@code max(0, 100 − Σ POINT_EXCHANGE 오늘 0시 이후)}
 * @param recent                  최근 거래 20건, {@code createdAt} 내림차순
 */
@JsonPropertyOrder({ "balance", "pointsPerPapy", "exchangeableNow", "dailyExchangeRemaining", "recent" })
public record WalletView(
		int balance,
		int pointsPerPapy,
		int exchangeableNow,
		int dailyExchangeRemaining,
		List<WalletLedgerView> recent) {
}
