package kr.papyrus.pilot.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 시계를 빈으로 주입한다.
 *
 * <p>지갑 로직에는 "오늘 0시" 개념이 있다 — 일일 환전 한도가 그 경계로 리셋된다. Nest 는
 * {@code new Date(now.getFullYear(), now.getMonth(), now.getDate())} 로 <b>서버 로컬</b> 자정을
 * 만든다. 서버 TZ 가 KST 라 실질적으로 Asia/Seoul 자정이다.
 *
 * <p>{@code Instant.now()} 를 코드 안에서 직접 부르지 않고 시계를 주입하는 이유: 자정 경계
 * 동작은 자정에만 관찰된다. 시계를 고정할 수 없으면 "23시 59분에 환전하고 0시 1분에 또 하면
 * 한도가 리셋되는가"를 <b>테스트로 물어볼 방법이 없다</b>. Nest 구현에서는 원리적으로 불가능했던
 * 검증이고, 파일럿이 실제로 나아지는 지점 중 하나다.
 *
 * <p>TZ 를 JVM 기본값에 맡기지 않고 명시하는 것도 같은 이유다. 배포 환경의 TZ 가 UTC 로
 * 바뀌면 한도 리셋 시각이 9시간 밀리는데, 그건 조용히 일어난다.
 */
@Configuration(proxyBeanMethods = false)
public class ClockConfig {

	public static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

	@Bean
	Clock clock() {
		return Clock.system(SERVICE_ZONE);
	}
}
