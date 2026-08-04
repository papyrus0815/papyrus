package kr.papyrus.pilot.querydsl;

import static org.assertj.core.api.Assertions.assertThat;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import kr.papyrus.pilot.account.QAccountRef;
import kr.papyrus.pilot.support.MySqlContainerSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * W1 Day1 스파이크: QueryDSL(OpenFeign 포크 7.5) × Spring Boot 4.1 × Hibernate 7 × Gradle 9 × JDK 21.
 *
 * <p>이 조합은 검증된 전례가 없다. QueryDSL 원본 레포는 정체 상태이고 포크는 Jakarta EE 11 대응이
 * 비교적 최근이다. 리더보드·상점 동적 쿼리 설계 전체가 QueryDSL 을 전제하므로, 안 되는 조합이라면
 * <b>착수 첫날에</b> 알아야 한다. 4주차에 발견하면 설계를 갈아엎어야 한다.
 *
 * <p>확인하는 것은 셋이다.
 * <ul>
 *   <li>APT 가 {@code QAccountRef} 를 실제로 생성했다 (안 됐으면 컴파일 자체가 실패한다)</li>
 *   <li>{@link JPAQueryFactory} 가 Hibernate 7 EntityManager 위에서 동작한다</li>
 *   <li>DTO 프로젝션·동적 where·정렬이 실제 SQL 로 나간다 — 리더보드가 쓸 기능들</li>
 * </ul>
 *
 * <p>실패 시 폴백은 JPQL + 네이티브 쿼리다. 그 경우 이 테스트를 지우지 말고
 * {@code @Disabled} 로 남긴 뒤 사유를 ADR 에 적을 것.
 */
@SpringBootTest
@DisplayName("스파이크: QueryDSL 7.5 × Boot 4.1 × Hibernate 7")
class QuerydslAptSpikeTest extends MySqlContainerSupport {

	/** 프로젝션이 실제로 조립되는지 보기 위한 최소 DTO. */
	public record LeaderboardRow(String accountId, String displayName, int totalPoints) {
	}

	@Autowired
	private JPAQueryFactory queryFactory;

	@Test
	@DisplayName("APT 가 Q 클래스를 생성했고 메타데이터가 실제 컬럼과 맞는다")
	void generatesQueryType() {
		QAccountRef account = QAccountRef.accountRef;

		assertThat(account.getType()).isEqualTo(kr.papyrus.pilot.account.AccountRef.class);
		// user_name / papy_balance 가 Q 타입에 잡혀 있어야 리더보드·잔액 쿼리를 짤 수 있다.
		assertThat(account.userName).isNotNull();
		assertThat(account.papyBalance).isNotNull();
		assertThat(account.totalPoints).isNotNull();
	}

	@Test
	@DisplayName("DTO 프로젝션 + 동적 where + 정렬이 SQL 로 나간다")
	void runsProjectionQuery() {
		QAccountRef account = QAccountRef.accountRef;

		List<LeaderboardRow> rows = queryFactory
				.select(Projections.constructor(LeaderboardRow.class,
						account.id,
						account.displayName.coalesce(account.userName),
						account.totalPoints))
				.from(account)
				.where(account.totalPoints.gt(0))
				.orderBy(account.totalPoints.desc(), account.id.asc())
				.limit(10)
				.fetch();

		// 행 수를 단정하지 않는다. 컨테이너는 JVM 당 하나라 다른 테스트가 @Sql 로 넣은
		// 픽스처가 남아 있을 수 있고, 여기서 증명할 것은 데이터가 아니라 "쿼리가 조립되어
		// 실행되고 DTO 로 매핑된다" 는 사실이다.
		assertThat(rows).isNotNull();
		assertThat(rows).allSatisfy(row -> {
			assertThat(row.accountId()).isNotBlank();
			assertThat(row.displayName()).isNotBlank(); // coalesce 가 동작했다
			assertThat(row.totalPoints()).isPositive(); // where 절이 적용됐다
		});
	}
}
