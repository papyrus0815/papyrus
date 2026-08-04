package kr.papyrus.pilot.wallet.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import kr.papyrus.pilot.wallet.domain.WalletReason;
import org.hibernate.annotations.Immutable;

/**
 * 파피 원장. <b>append-only</b> — 수정도 삭제도 하지 않는다.
 *
 * <p>환불조차 행을 지우지 않고 반대부호 {@code REFUND_REVERSAL} 행을 새로 넣는다(감사 무결성).
 * Nest 쪽에도 {@code delete}/{@code deleteMany} 호출이 0건이다. 그 성질을 타입으로 굳히려고
 * {@link Immutable} 을 붙였다 — 더티체킹으로 과거 거래가 조용히 바뀌는 경로를 없앤다.
 *
 * <p>{@code account_id} 를 {@code @ManyToOne} 으로 올리지 않고 평문 {@code String} 으로 둔다.
 * {@code account} 는 모놀리스 소유이고, 관계로 올리면 원장을 읽을 때마다 계정 그래프가 딸려
 * 들어온다. {@code reversal_of_id} / {@code related_item_id} / {@code actor_account_id} 는 애초에
 * FK 가 아니다 — 특히 {@code related_item_id} 는 {@code shop_item} 과 {@code artifact} 두 테이블을
 * 가리키는 폴리모픽 느슨참조라 관계로 표현할 수가 없다.
 */
@Entity
@Immutable
@Table(name = "wallet_ledger", uniqueConstraints = @UniqueConstraint(
		name = "wallet_ledger_account_id_idempotency_key_key",
		columnNames = { "account_id", "idempotency_key" }))
public class WalletLedger {

	@Id
	@Column(name = "id", columnDefinition = "char(36)", nullable = false, updatable = false)
	private String id;

	@Column(name = "account_id", columnDefinition = "char(36)", nullable = false)
	private String accountId;

	/** 부호 있는 정수. +충전·환불 / −소비. Decimal 로 승격하지 말 것 — 전 구간 INT 다. */
	@Column(name = "amount", nullable = false)
	private int amount;

	@Enumerated(EnumType.STRING)
	@Column(name = "reason", nullable = false)
	private WalletReason reason;

	/** 계정 스코프 멱등키. 전역 UNIQUE 가 아니다. */
	@Column(name = "idempotency_key", length = 120, nullable = false)
	private String idempotencyKey;

	@Column(name = "reversal_of_id", columnDefinition = "char(36)")
	private String reversalOfId;

	@Column(name = "related_item_id", columnDefinition = "char(36)")
	private String relatedItemId;

	@Column(name = "actor_account_id", columnDefinition = "char(36)")
	private String actorAccountId;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected WalletLedger() {
	}

	public String getId() {
		return id;
	}

	public String getAccountId() {
		return accountId;
	}

	public int getAmount() {
		return amount;
	}

	public WalletReason getReason() {
		return reason;
	}

	public String getIdempotencyKey() {
		return idempotencyKey;
	}

	public String getReversalOfId() {
		return reversalOfId;
	}

	public String getRelatedItemId() {
		return relatedItemId;
	}

	public String getActorAccountId() {
		return actorAccountId;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
