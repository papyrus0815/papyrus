package kr.papyrus.pilot.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 테스트용 MySQL 컨테이너. 모든 통합 테스트가 이걸 상속한다.
 *
 * <p>H2 나 다른 엔진으로 대신하지 않는 이유: 이 파일럿이 "테스트로 증명했다"고 말하는 것들
 * — {@code SELECT ... FOR UPDATE} 직렬화, {@code INSERT ... ON DUPLICATE KEY UPDATE} 의
 * affected-rows 값, 조건부 UPDATE 의 rowcount, CHECK 제약 거부 — 이 전부 MySQL InnoDB 방언에
 * 직접 의존한다. 다른 엔진에서 통과한 테스트는 아무것도 증명하지 못한다.
 *
 * <p>서버 설정은 운영 실측값에 맞춘다. 특히 {@code sql_mode} 의 {@code IGNORE_SPACE} 는 MySQL 8
 * 기본값에 없는데 운영에는 켜져 있다. {@code default-time-zone=+09:00} 도 마찬가지로 운영과 같아야
 * 자정 근처 날짜 비교가 재현된다.
 *
 * <p>컨테이너는 JVM 당 한 번 뜨고 테스트 전체가 공유한다. 클래스마다 새로 띄우면 전체 실행이
 * 분 단위로 늘어난다.
 */
public abstract class MySqlContainerSupport {

	private static final String PRODUCTION_SQL_MODE = String.join(",",
			"IGNORE_SPACE",
			"ONLY_FULL_GROUP_BY",
			"STRICT_TRANS_TABLES",
			"NO_ZERO_IN_DATE",
			"NO_ZERO_DATE",
			"ERROR_FOR_DIVISION_BY_ZERO",
			"NO_ENGINE_SUBSTITUTION");

	@SuppressWarnings("resource") // JVM 수명과 같이 간다. 컨테이너 재사용이 목적이라 닫지 않는다.
	protected static final MySQLContainer MYSQL = new MySQLContainer(DockerImageName.parse("mysql:8.0.45"))
			.withDatabaseName("papyrus")
			.withUsername("papyrus")
			.withPassword("papyrus")
			.withCommand(
					"--character-set-server=utf8mb4",
					"--collation-server=utf8mb4_0900_ai_ci",
					"--default-time-zone=+09:00",
					"--innodb-lock-wait-timeout=5",
					"--sql-mode=" + PRODUCTION_SQL_MODE)
			// 운영 DDL 그대로. 갱신은 ./tools/dump-schema.sh
			.withInitScript("db/testschema/V1__prisma_schema_snapshot.sql")
			.withUrlParam("connectionTimeZone", "Asia/Seoul");

	static {
		MYSQL.start();
	}

	@DynamicPropertySource
	static void datasourceProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
		registry.add("spring.datasource.username", MYSQL::getUsername);
		registry.add("spring.datasource.password", MYSQL::getPassword);
	}
}
