package kr.papyrus.pilot.wallet.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import kr.papyrus.pilot.account.AccountRef;
import kr.papyrus.pilot.account.AccountRefRepository;
import kr.papyrus.pilot.config.ClockConfig;
import kr.papyrus.pilot.shared.Iso8601;
import kr.papyrus.pilot.shared.error.NotFoundException;
import kr.papyrus.pilot.wallet.domain.WalletPolicy;
import kr.papyrus.pilot.wallet.domain.WalletReason;
import kr.papyrus.pilot.wallet.repository.WalletLedgerRepository;
import kr.papyrus.pilot.wallet.web.dto.WalletLedgerView;
import kr.papyrus.pilot.wallet.web.dto.WalletView;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 지갑 읽기 경로. 쓰기는 {@code SpendService} / {@code WalletService} 가 담당한다. */
@Service
public class WalletQueryService {

	/** 최근 거래 노출 건수. Nest 의 {@code take: 20}. */
	private static final int RECENT_LIMIT = 20;

	private final AccountRefRepository accountRepository;
	private final WalletLedgerRepository ledgerRepository;
	private final Clock clock;

	public WalletQueryService(AccountRefRepository accountRepository, WalletLedgerRepository ledgerRepository,
			Clock clock) {
		this.accountRepository = accountRepository;
		this.ledgerRepository = ledgerRepository;
		this.clock = clock;
	}

	/**
	 * 내 지갑 요약.
	 *
	 * <p>Nest 는 세 집계를 {@code Promise.all} 로 병렬 실행하고 트랜잭션으로 감싸지 않는다
	 * ({@code wallet.service.ts:141-150}). 즉 세 값이 서로 다른 시점의 스냅샷일 수 있다.
	 *
	 * <p>파일럿은 이걸 <b>읽기 전용 트랜잭션 하나</b>로 묶는다. 병렬을 포기하는 대신
	 * REPEATABLE READ 안에서 세 쿼리가 같은 스냅샷을 보므로, "잔액은 차감 후인데 환전 가능량은
	 * 차감 전" 같은 찢어진 응답이 나오지 않는다. 쿼리 3개가 순차 실행되지만 전부 인덱스 조회라
	 * 병렬화 이득보다 일관성이 크다.
	 *
	 * <p>이건 {@code DIVERGENCES.md} 에 적을 만한 차이가 <b>아니다</b> — 응답 모양이 같고,
	 * 관측 가능한 차이는 "덜 찢어진다" 뿐이다.
	 */
	@Transactional(readOnly = true)
	public WalletView getWallet(String accountId) {
		AccountRef account = accountRepository.findById(accountId)
				.orElseThrow(() -> new NotFoundException("계정을 찾을 수 없습니다"));

		int exchangedTotal = ledgerRepository.sumAmountByReason(accountId, WalletReason.POINT_EXCHANGE);
		int exchangedToday = ledgerRepository.sumAmountByReasonSince(
				accountId, WalletReason.POINT_EXCHANGE, startOfToday());

		int exchangeableNow = Math.max(0,
				WalletPolicy.exchangeCapFromPoints(account.getTotalPoints()) - exchangedTotal);
		int dailyExchangeRemaining = Math.max(0, WalletPolicy.DAILY_EXCHANGE_LIMIT_PAPY - exchangedToday);

		var recent = ledgerRepository
				.findByAccountIdOrderByCreatedAtDesc(accountId, Limit.of(RECENT_LIMIT))
				.stream()
				.map(row -> new WalletLedgerView(
						row.getId(),
						row.getAmount(),
						row.getReason().name(),
						Iso8601.format(row.getCreatedAt())))
				.toList();

		return new WalletView(
				account.getPapyBalance(),
				WalletPolicy.POINTS_PER_PAPY,
				exchangeableNow,
				dailyExchangeRemaining,
				recent);
	}

	/**
	 * 일일 환전 한도의 리셋 경계.
	 *
	 * <p>Nest 의 {@code new Date(y, m, d)} 는 <b>서버 로컬</b> 자정이고 서버 TZ 가 KST 다.
	 * JVM 기본 TZ 에 맡기면 배포 환경이 UTC 일 때 경계가 9시간 밀리므로 존을 명시한다.
	 */
	private Instant startOfToday() {
		return LocalDate.now(clock).atStartOfDay(ClockConfig.SERVICE_ZONE).toInstant();
	}
}
