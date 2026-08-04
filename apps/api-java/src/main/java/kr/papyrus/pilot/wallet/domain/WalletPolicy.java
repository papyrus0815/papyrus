package kr.papyrus.pilot.wallet.domain;

/**
 * 파피 경제 정책 상수. Nest 의 {@code wallet.policy.ts} 와 1:1 대응한다.
 *
 * <p>환전은 포인트를 <b>소각하지 않는다</b>(점수=명예 불변). 대신
 * {@code floor(totalPoints / POINTS_PER_PAPY)} 를 누적 환전 상한으로 삼아 기여에 비례한 만큼만
 * 파피로 받게 한다. 그래서 "환전 가능량" 은 잔액이 아니라 <b>상한 − 지금까지 환전한 총액</b>이다.
 */
public final class WalletPolicy {

	/** 포인트→파피 환율. N 포인트당 파피 1개. */
	public static final int POINTS_PER_PAPY = 10;

	/** 일일 환전 상한(파피). 단시간 대량 환전 억제. */
	public static final int DAILY_EXCHANGE_LIMIT_PAPY = 100;

	/**
	 * 단일 거래 파피 금액 상한. INT(signed 32-bit) 오버플로 방지.
	 *
	 * <p>주의: Nest 는 이 상한을 양수 <b>입력</b> 검증(환전·지급·프로모 생성)에만 적용하고
	 * {@code spend()} 의 amount 나 상품 가격에는 적용하지 않는다. 누적 잔액에도 상한이 없다.
	 */
	public static final int MAX_PAPY_AMOUNT = 100_000_000;

	private WalletPolicy() {
	}

	/** 보유 점수로 환전 가능한 <b>누적</b> 파피 상한. */
	public static int exchangeCapFromPoints(int totalPoints) {
		return Math.max(0, totalPoints) / POINTS_PER_PAPY;
	}
}
