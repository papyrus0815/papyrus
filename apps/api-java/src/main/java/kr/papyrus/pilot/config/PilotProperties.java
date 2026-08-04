package kr.papyrus.pilot.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 파일럿 전용 설정.
 *
 * @param jwtSecret        Nest 가 HS256 으로 서명한 토큰을 검증하기 위한 대칭키. 파일럿은 토큰을
 *                         발급하지 않고 검증만 한다.
 * @param operatorUsernames grant / promo 같은 운영자 전용 엔드포인트를 통과시킬 계정. 현행 Nest 가
 *                         역할 테이블 없이 username 비교로 판정하므로 그대로 맞춘다.
 * @param wallet           지갑 동시성 정책.
 */
@ConfigurationProperties(prefix = "pilot")
public record PilotProperties(String jwtSecret, List<String> operatorUsernames, Wallet wallet) {

	public PilotProperties {
		operatorUsernames = operatorUsernames == null ? List.of() : List.copyOf(operatorUsernames);
		wallet = wallet == null ? new Wallet(LockMode.STRICT) : wallet;
	}

	public boolean isOperator(String userName) {
		return userName != null && operatorUsernames.contains(userName);
	}

	public record Wallet(LockMode lockMode) {

		public Wallet {
			lockMode = lockMode == null ? LockMode.STRICT : lockMode;
		}
	}

	public enum LockMode {

		/** 잔액을 건드리는 5경로 전부 행 잠금. 운영 기본값. */
		STRICT,

		/**
		 * 잠금 없음. 현행 Nest 의 결함(락 없는 read-modify-write)을 재현해
		 * {@code LostUpdateReproductionTest} 가 드리프트 발생 자체를 assert 하기 위한 모드다.
		 * 운영에서 켜면 안 된다.
		 */
		NONE
	}
}
