package kr.papyrus.pilot.config;

import jakarta.annotation.PostConstruct;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * 부팅 시 멱등성의 근거가 되는 UNIQUE 제약이 실제 DB 에 존재하는지 확인하고, 없으면 기동을 실패시킨다.
 *
 * <p>이 파일럿의 중복 방지는 애플리케이션 코드가 아니라 <b>DB 제약</b>에 걸려 있다. "먼저 조회하고
 * 없으면 INSERT" 는 동시 요청에서 반드시 뚫린다. 뚫리지 않는 유일한 근거가 아래 5개 UNIQUE 인데,
 * 이건 파일럿이 만든 게 아니라 모놀리스의 Prisma 스키마가 만든 것이다. 즉 <b>파일럿이 통제하지 못하는
 * 전제</b> 위에 정확성이 서 있다.
 *
 * <p>그래서 전제를 조용히 믿는 대신 부팅할 때마다 확인한다. 누가 마이그레이션으로 인덱스를 지우면
 * 이중 적립이 조용히 발생하는 대신 서버가 안 뜬다.
 */
@Component
public class SchemaContractVerifier {

	private static final Logger log = LoggerFactory.getLogger(SchemaContractVerifier.class);

	/** 테이블 → 반드시 존재해야 하는 UNIQUE 컬럼 조합. */
	private static final Map<String, List<String>> REQUIRED_UNIQUES = new LinkedHashMap<>();

	static {
		// 적립 멱등성: 같은 (계정, 대상종류, 대상, 사유) 로는 한 번만 적립된다.
		REQUIRED_UNIQUES.put("point_entry", List.of("account_id", "owner_type", "record_id", "reason"));
		// 지갑 멱등성: 멱등키는 계정 스코프다. 전역 UNIQUE 가 아니라는 점이 중요하다.
		REQUIRED_UNIQUES.put("wallet_ledger", List.of("account_id", "idempotency_key"));
		// 같은 아이템 중복 보유 금지. 환불이 하드 삭제인 이유이기도 하다.
		REQUIRED_UNIQUES.put("user_item", List.of("account_id", "item_id"));
		REQUIRED_UNIQUES.put("account_badge", List.of("account_id", "badge_code"));
		REQUIRED_UNIQUES.put("user_artifact", List.of("account_id", "artifact_id"));
	}

	private final JdbcClient jdbcClient;

	public SchemaContractVerifier(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	@PostConstruct
	void verify() {
		Map<String, Set<List<String>>> actual = loadUniqueIndexes();

		List<String> violations = REQUIRED_UNIQUES.entrySet().stream()
				.filter(required -> !actual.getOrDefault(required.getKey(), Set.of()).contains(required.getValue()))
				.map(required -> "  - %s(%s) 없음 — 실제 UNIQUE: %s".formatted(
						required.getKey(),
						String.join(", ", required.getValue()),
						actual.getOrDefault(required.getKey(), Set.of())))
				.toList();

		if (!violations.isEmpty()) {
			throw new IllegalStateException("""
					멱등성의 근거인 UNIQUE 제약이 DB 에 없다. 이 상태로 기동하면 동시 요청에서 \
					이중 적립·이중 차감이 조용히 발생한다.
					%s
					스키마 정본은 libs/db/prisma/*.prisma 다. 인덱스를 되돌린 뒤 다시 기동할 것."""
					.formatted(String.join("\n", violations)));
		}

		log.info("스키마 계약 확인: UNIQUE {}종 존재", REQUIRED_UNIQUES.size());
	}

	private Map<String, Set<List<String>>> loadUniqueIndexes() {
		record IndexColumn(String tableName, String indexName, String columnName) {
		}

		List<IndexColumn> rows = jdbcClient.sql("""
						SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
						  FROM information_schema.STATISTICS
						 WHERE TABLE_SCHEMA = DATABASE()
						   AND NON_UNIQUE = 0
						   AND TABLE_NAME IN (:tables)
						 ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX""")
				.param("tables", REQUIRED_UNIQUES.keySet())
				.query((rs, rowNum) -> new IndexColumn(rs.getString(1), rs.getString(2), rs.getString(3)))
				.list();

		// (테이블, 인덱스) 별로 컬럼을 SEQ_IN_INDEX 순서대로 모은 뒤, 테이블 단위로 접는다.
		return rows.stream()
				.collect(Collectors.groupingBy(IndexColumn::tableName,
						Collectors.collectingAndThen(
								Collectors.groupingBy(IndexColumn::indexName, LinkedHashMap::new,
										Collectors.mapping(IndexColumn::columnName, Collectors.toList())),
								byIndex -> Set.copyOf(byIndex.values()))));
	}
}
