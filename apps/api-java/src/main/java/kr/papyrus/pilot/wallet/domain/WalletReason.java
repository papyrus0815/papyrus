package kr.papyrus.pilot.wallet.domain;

/**
 * 원장 거래 사유. DB {@code wallet_ledger.reason} ENUM 과 <b>값·개수가 정확히 같아야 한다.</b>
 *
 * <p>미사용 값 2개({@link #PURCHASE_TOPUP}, {@link #ADMIN_ADJUST})를 "안 쓰니까" 빼면 안 된다.
 * enum 은 읽기 경로에서도 매핑되므로, DB 에 그 값을 가진 행이 하나라도 생기는 순간
 * {@code IllegalArgumentException} 으로 조회 전체가 죽는다. 쓰는 쪽이 아니라 <b>읽는 쪽</b>이
 * 넓어야 한다.
 */
public enum WalletReason {

	/** 실결제 충전 (Phase 1 — PG 연동). 현재 미사용, 예약값. */
	PURCHASE_TOPUP,

	/** 운영자 수동 지급. */
	ADMIN_GRANT,

	/** 프로모션 코드 교환. */
	PROMO_CODE,

	/** 적립 포인트 → 파피 단방향 환전. */
	POINT_EXCHANGE,

	/** 상품 구매 소비 (음수). */
	CONSUME,

	/** 환불/취소 역분개 (원거래의 반대부호 행). */
	REFUND_REVERSAL,

	/** 운영자 보정. 현재 미사용, 예약값. */
	ADMIN_ADJUST
}
