package kr.papyrus.pilot.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * {@code account} 테이블의 <b>읽기 전용</b> 투영.
 *
 * <p>account 는 모놀리스(Nest)가 소유한다. 파일럿은 이 행을 읽기만 하고, 캐시 컬럼
 * ({@code total_points}, {@code papy_balance}) 의 쓰기는 전부 조건부 네이티브 UPDATE 로만 한다
 * ({@code AccountBalanceRepository}). 그래서 {@link Immutable} 을 붙여 더티체킹 경로를 아예 막는다.
 *
 * <p>더티체킹으로 잔액을 깎으면 read-modify-write 가 되어 오버스펜드가 난다. 조건부 UPDATE 의
 * affected-rows 판정이 잔액 검사와 차감을 한 문장으로 묶는 유일한 방법이다.
 *
 * <p>{@code hero_id} 는 매핑하지 않는다. 이 테이블에서 혼자 {@code varchar(191)} 이고 파일럿
 * 범위(게이미피케이션·지갑) 밖이다.
 */
@Entity
@Immutable
@Table(name = "account")
public class AccountRef {

	@Id
	@Column(name = "id", columnDefinition = "char(36)", nullable = false, updatable = false)
	private String id;

	/** 실제 컬럼명은 {@code user_name} 이다 ({@code username} 아님). */
	@Column(name = "user_name", nullable = false)
	private String userName;

	@Column(name = "display_name")
	private String displayName;

	@Column(name = "total_points", nullable = false)
	private int totalPoints;

	@Column(name = "grade_code", nullable = false)
	private String gradeCode;

	@Column(name = "papy_balance", nullable = false)
	private int papyBalance;

	protected AccountRef() {
	}

	public String getId() {
		return id;
	}

	public String getUserName() {
		return userName;
	}

	public String getDisplayName() {
		return displayName;
	}

	public int getTotalPoints() {
		return totalPoints;
	}

	public String getGradeCode() {
		return gradeCode;
	}

	public int getPapyBalance() {
		return papyBalance;
	}

	/** 표시명은 Nest 와 동일하게 {@code displayName ?? userName} 으로 떨어진다. */
	public String resolveDisplayName() {
		return displayName != null ? displayName : userName;
	}
}
