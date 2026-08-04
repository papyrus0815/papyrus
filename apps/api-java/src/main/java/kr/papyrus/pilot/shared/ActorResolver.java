package kr.papyrus.pilot.shared;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * 현재 요청의 행위자 계정 id.
 *
 * <p>Nest 는 이걸 AsyncLocalStorage 기반 컨텍스트({@code getActorAccountId()})와 컨트롤러의
 * {@code req.user?.userId ?? req.user?.id} 두 경로로 얻는다. Spring 에서는 {@code SecurityContext}
 * 가 같은 일을 하고, 서블릿 스택에서는 그게 ThreadLocal 이다 — 별도 컨텍스트 전파 장치가 필요 없다.
 *
 * <p>{@code sub} 를 쓴다. Nest 의 {@code JwtStrategy.validate} 가 {@code payload.sub} 하나만 보고
 * {@code {id, userId}} 를 만들어 넘기므로, 실제 진실의 원천은 {@code sub} 뿐이다.
 */
@Component
public class ActorResolver {

	/** 인증된 계정 id. 인증 필터를 통과한 요청에서만 부를 것. */
	public String currentAccountId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
			throw new IllegalStateException(
					"인증 컨텍스트가 없다. 이 메서드는 인증이 강제된 경로에서만 호출돼야 한다.");
		}
		String subject = jwt.getSubject();
		if (subject == null || subject.isBlank()) {
			// Nest 도 같은 검사를 한다(jwt.strategy.ts:21 — 'Invalid token payload').
			throw new IllegalStateException("토큰에 sub 클레임이 없다.");
		}
		return subject;
	}
}
