package kr.papyrus.pilot;

import static org.assertj.core.api.Assertions.assertThat;

import kr.papyrus.pilot.account.AccountRefRepository;
import kr.papyrus.pilot.support.MySqlContainerSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * W1 관문: 컨테이너에 올린 운영 DDL 위에서 컨텍스트가 뜬다.
 *
 * <p>이 테스트가 통과한다는 것은 세 가지를 동시에 의미한다.
 * <ul>
 *   <li>{@code ddl-auto=validate} 가 통과했다 — 엔티티 매핑이 실제 컬럼과 어긋나지 않았다</li>
 *   <li>{@code SchemaContractVerifier} 가 통과했다 — 멱등성 근거 UNIQUE 5종이 존재한다</li>
 *   <li>덤프한 스키마 스냅샷이 실행 가능한 SQL 이다</li>
 * </ul>
 */
@SpringBootTest
@DisplayName("스모크: 운영 DDL 위에서 컨텍스트 기동")
class SmokeContextTest extends MySqlContainerSupport {

	@Autowired
	private AccountRefRepository accountRefRepository;

	@Test
	@DisplayName("account 테이블을 읽을 수 있다")
	void readsAccountTable() {
		// 행 수를 단정하지 않는다. 컨테이너는 JVM 당 하나라 다른 테스트가 @Sql 로 넣은
		// 픽스처가 남아 있을 수 있다. 여기서 확인할 것은 데이터가 아니라 매핑이 실제 컬럼에
		// 붙어 쿼리가 나간다는 사실이다 — 컬럼명이 하나라도 틀리면 여기서 터진다.
		assertThat(accountRefRepository.count()).isNotNegative();

		// 존재하지 않는 값으로 조회해 파생 쿼리(user_name 컬럼)까지 실제로 실행시킨다.
		assertThat(accountRefRepository.findByUserName("__no_such_user__")).isEmpty();
	}
}
