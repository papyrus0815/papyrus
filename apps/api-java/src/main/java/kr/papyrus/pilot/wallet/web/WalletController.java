package kr.papyrus.pilot.wallet.web;

import kr.papyrus.pilot.shared.ActorResolver;
import kr.papyrus.pilot.wallet.service.WalletQueryService;
import kr.papyrus.pilot.wallet.web.dto.WalletView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 경로는 Nest 와 <b>완전히 동일</b>하다. 전역 prefix 없음.
 *
 * <p>같은 경로를 쓰는 이유: 파일럿을 :8081 에 띄우고 프론트의 base URL 만 바꾸면 그대로 붙는다.
 * 골든 대조도 경로가 같아야 성립한다. 경로에 {@code /v2} 같은 걸 붙이는 순간 "같은 계약을
 * 구현했다"는 주장이 약해진다.
 *
 * <p>인증은 {@code SecurityConfig} 의 {@code anyRequest().authenticated()} 가 건다. Nest 는
 * 컨트롤러 클래스에 {@code @UseGuards(AuthGuard('jwt'))} 를 붙이는데, 클래스마다 붙이는 방식은
 * 새 컨트롤러에서 빠뜨리기 쉽다. 기본을 "닫힘"으로 두고 예외만 여는 편이 안전하다.
 */
@RestController
@RequestMapping("/wallet")
public class WalletController {

	private final WalletQueryService walletQueryService;
	private final ActorResolver actorResolver;

	public WalletController(WalletQueryService walletQueryService, ActorResolver actorResolver) {
		this.walletQueryService = walletQueryService;
		this.actorResolver = actorResolver;
	}

	/** 내 지갑 요약 (잔액·환전 가능량·최근 거래 20건). */
	@GetMapping("/me")
	public WalletView me() {
		return walletQueryService.getWallet(actorResolver.currentAccountId());
	}
}
