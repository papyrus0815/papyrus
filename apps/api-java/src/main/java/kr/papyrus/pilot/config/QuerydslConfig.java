package kr.papyrus.pilot.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * QueryDSL 조회 팩토리.
 *
 * <p>읽기 전용이다. {@code JPAUpdateClause} / {@code JPADeleteClause} 는 쓰지 않는다 — 표현은
 * 가능하지만 영속성 컨텍스트와 동기화되지 않아, 같은 트랜잭션 안에서 이후에 읽는 엔티티가
 * 낡은 값을 들고 있게 된다. 쓰기는 전부 조건부 네이티브 UPDATE 로 하고 affected-rows 로 판정한다.
 */
@Configuration(proxyBeanMethods = false)
public class QuerydslConfig {

	@Bean
	JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
		return new JPAQueryFactory(entityManager);
	}
}
