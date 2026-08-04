package kr.papyrus.pilot.wallet.repository;

import java.time.Instant;
import java.util.List;
import kr.papyrus.pilot.wallet.domain.WalletReason;
import kr.papyrus.pilot.wallet.entity.WalletLedger;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletLedgerRepository extends JpaRepository<WalletLedger, String> {

	/**
	 * 사유별 금액 합계. 행이 없으면 0.
	 *
	 * <p>{@code COALESCE} 로 감싸는 이유: JPQL {@code SUM} 은 대상 행이 없으면 {@code null} 을
	 * 낸다. Nest 는 {@code agg._sum.amount ?? 0} 으로 받아내므로 여기서도 0 으로 맞춰야
	 * "환전 이력이 없는 계정" 의 응답이 같아진다.
	 */
	@Query("""
			SELECT COALESCE(SUM(l.amount), 0)
			  FROM WalletLedger l
			 WHERE l.accountId = :accountId
			   AND l.reason = :reason""")
	int sumAmountByReason(@Param("accountId") String accountId, @Param("reason") WalletReason reason);

	/** 사유별 금액 합계 중 {@code since} 이후 분만. 경계는 {@code >=} (Nest 의 {@code gte}). */
	@Query("""
			SELECT COALESCE(SUM(l.amount), 0)
			  FROM WalletLedger l
			 WHERE l.accountId = :accountId
			   AND l.reason = :reason
			   AND l.createdAt >= :since""")
	int sumAmountByReasonSince(@Param("accountId") String accountId, @Param("reason") WalletReason reason,
			@Param("since") Instant since);

	List<WalletLedger> findByAccountIdOrderByCreatedAtDesc(String accountId, Limit limit);
}
