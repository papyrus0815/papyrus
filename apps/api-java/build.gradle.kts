plugins {
	java
	id("org.springframework.boot") version "4.1.0"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "kr.papyrus"
version = "0.0.1-SNAPSHOT"
description = "Papyrus gamification+wallet Spring port pilot"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

// QueryDSL 원본 레포는 정체 상태라 OpenFeign 포크를 쓴다.
// 7.x 는 jakarta 네이티브(jakarta.persistence-api 의존)이므로 :jakarta classifier 가 필요 없다.
val querydslVersion = "7.5"

dependencies {
	// Spring Boot 4.1 은 스타터 이름이 3.x 와 다르다.
	// starter-web -> starter-webmvc, oauth2 -> starter-security-oauth2-resource-server,
	// starter-test 는 스타터별 -test 로 쪼개졌다.
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-mysql")

	// 재시도(@Retryable)는 Spring Framework 7 부터 코어에 들어왔다
	// (org.springframework.resilience.annotation). 별도 spring-retry 의존이 필요 없고,
	// Boot 4.1 BOM 도 더 이상 spring-retry 버전을 관리하지 않는다.

	implementation("io.github.openfeign.querydsl:querydsl-jpa:$querydslVersion")

	runtimeOnly("com.mysql:mysql-connector-j")

	annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
	annotationProcessor("io.github.openfeign.querydsl:querydsl-apt:$querydslVersion:jpa")
	annotationProcessor("jakarta.persistence:jakarta.persistence-api")
	annotationProcessor("jakarta.annotation:jakarta.annotation-api")

	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-mysql")

	// 계약 대조(JSONassert) / 쿼리수 게이트(datasource-proxy) / 구조 규칙(ArchUnit)
	testImplementation("org.skyscreamer:jsonassert:1.5.3")
	testImplementation("net.ttddyy:datasource-proxy:1.11.0")
	testImplementation("com.tngtech.archunit:archunit-junit5:1.5.0")

	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform {
		// LiveParityTest 는 :8000(Nest)과 :8081(파일럿)이 동시에 떠 있어야 한다.
		// 기본 test 에서 빼고 parityTest 로만 돌린다.
		excludeTags("parity")
	}
}

tasks.register<Test>("parityTest") {
	group = "verification"
	description = "Nest(:8000)와 파일럿(:8081)을 같은 JWT로 동시 호출해 응답을 대조한다. 두 서버가 떠 있어야 한다."
	testClassesDirs = sourceSets["test"].output.classesDirs
	classpath = sourceSets["test"].runtimeClasspath
	useJUnitPlatform {
		includeTags("parity")
	}
	outputs.upToDateWhen { false }
}
