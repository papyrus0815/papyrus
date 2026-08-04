package kr.papyrus.pilot.shared;

import java.util.UUID;

/**
 * PK 생성기.
 *
 * <p>모든 테이블의 PK 는 {@code char(36)} 에 담긴 UUID v4 문자열이다. Prisma 가 애플리케이션에서
 * 만들어 넣던 값이고, 파일럿도 같은 방식을 유지한다.
 *
 * <p>JPA 의 {@code @GeneratedValue}(특히 {@code GenerationType.UUID})를 쓰지 않는 이유: Hibernate 가
 * UUID 를 {@code BINARY(16)} 으로 저장하려 들면 기존 543 행의 point_entry 와 그것을 가리키는 FK 가
 * 전부 어긋난다. 저장 표현을 바꿀 권한이 파일럿에는 없다.
 */
public final class Uuids {

	private Uuids() {
	}

	public static String newId() {
		return UUID.randomUUID().toString();
	}
}
