package kr.papyrus.pilot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.resilience.annotation.EnableResilientMethods;

/**
 * Papyrus 게이미피케이션·지갑 도메인의 Spring 이식 파일럿.
 *
 * <p>이 앱은 Nest(:8000)를 대체하지 않는다. 같은 MySQL 을 보며 같은 계약을 내는 두 번째 구현체이고,
 * 목적은 전환이 아니라 증명이다. 자세한 범위는 README 참고.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
// 데드락·락 획득 실패 재시도용. Spring Framework 7 코어의 @Retryable 을 켠다.
// 재시도는 반드시 @Transactional 바깥 계층(RetryingWalletFacade)에만 건다 — 같은 메서드에
// 겹치면 이미 rollback-only 로 표시된 트랜잭션 안에서 재시도해 전부 실패한다.
@EnableResilientMethods
public class PilotApplication {

	public static void main(String[] args) {
		SpringApplication.run(PilotApplication.class, args);
	}

}
