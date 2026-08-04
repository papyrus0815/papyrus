# papyrus-pilot — 게이미피케이션·지갑 Spring 이식 파일럿

**이건 전환이 아니라 증명이다.**

Nest(`:8000`)는 정본으로 계속 운영된다. 이 앱(`:8081`)은 같은 MySQL 을 보며 같은 계약을 내는
두 번째 구현체이고, 목적은 Papyrus 를 Java 로 옮기는 게 아니라 **한 도메인을 제대로 옮겼을 때
무엇이 달라지는지 기계로 증명하는 것**이다.

## 범위 밖 (명시적으로 하지 않는 것)

- 트래픽 전환. 프론트는 계속 Nest 를 부른다.
- nestia SDK 대체. `apps/web-admin` 의 API 래퍼 71 파일은 손대지 않는다.
- 스키마 변경. 정본은 `libs/db/prisma/*.prisma` 이고 이 앱은 구조를 바꾸지 않는다
  (`ddl-auto=validate` 가 그 서약의 실행 형태다).
- 게이미피케이션·지갑 외 도메인.

## 정직하게 남기는 한계

공존 기간 동안 **모놀리스는 같은 `account` 행을 락 없이 계속 만진다.** 이 파일럿이 잔액 갱신
경로에 행 잠금을 걸어도, Nest 쪽 경로가 그대로인 이상 프로덕션의 경합 결함은 남는다.
여기서 증명되는 것은 "이 구현이 동시성 하에서 정확하다"이지 "Papyrus 의 버그가 고쳐졌다"가 아니다.

## 스택

| | |
|---|---|
| Java | 21 (LTS) |
| Spring Boot | 4.1.0 — Spring Framework 7 / Jakarta EE 11 / **Jackson 3** |
| 영속성 | Spring Data JPA + Hibernate 7 |
| 타입안전 쿼리 | QueryDSL **7.5 (OpenFeign 포크)** — 원본 레포는 정체 상태 |
| DB | MySQL **8.0.45** (MariaDB 아님) |
| 테스트 | JUnit 5 + Testcontainers(`mysql:8.0.45`) + JSONassert + ArchUnit |
| 빌드 | Gradle 9.5.1 (wrapper) |

Boot 4.1 은 3.x 와 다른 점이 몇 개 있고 전부 이 프로젝트에서 실제로 걸렸다.

- 스타터 이름: `starter-web` → `starter-webmvc`, oauth2 는 `starter-security-oauth2-resource-server`,
  `starter-test` 는 스타터별 `-test` 로 분리
- `spring-retry` 불필요 — `@Retryable` 이 Spring Framework 7 코어로 들어왔다
  (`org.springframework.resilience.annotation`, `@EnableResilientMethods`)
- **Jackson 3**(`tools.jackson.databind`) — `WRITE_DATES_AS_TIMESTAMPS` 가 제거됐다.
  `spring.jackson.serialization.write-dates-as-timestamps` 를 남겨두면 기동이 깨진다.
- Testcontainers 클래스 위치가 `org.testcontainers.mysql.MySQLContainer` 로 이동

## 실행

시크릿은 이 디렉터리에 복사하지 않는다. 정본은 모노레포 루트의 `env.development` 이고
`tools/env.sh` 가 필요한 값만 읽어 export 한다.

```bash
# 테스트 (Docker 필요 — Testcontainers)
./gradlew test

# 기동 (:8081, 운영 DB 를 읽기 전용으로 붙는다)
./tools/run.sh

# 골든 재캡처 (읽기 전용. Nest 가 :8000 에 떠 있어야 한다)
./tools/capture-golden.sh

# 스키마 스냅샷 갱신 (Docker mysql 컨테이너 경유)
./tools/dump-schema.sh
```

모노레포 루트에서는 `npm run pilot:test`, `npm run pilot:run`, `npm run pilot:golden`.

## 골든 (계약 기준선)

`src/test/resources/golden/*.json` 은 **파일럿 코드를 쓰기 전에** Nest 에서 뜬 실제 응답이다.
나중에 뜨면 파일럿 출력이 기준이 되어 순환 논증이 된다.

기본 캡처는 읽기(GET)와 에러 봉투만 담는다. 이 스크립트가 보는 DB 는 운영에서 쓰는 그 DB 라서,
성공하는 POST 를 캡처하면 원장에 행이 생기고 잔액이 깎인다 — 골든을 뜨는 행위가 골든의 전제를
바꾼다. 쓰기 경로 골든이 필요하면 `--include-mutating` 으로 그 사실을 알고 실행할 것.

> 골든에는 개발 계정의 실제 값(잔액, 포인트, 원장 id, accountId)이 들어 있다. 자격증명은 없다.
> 저장소를 공개로 돌릴 계획이라면 이 디렉터리를 먼저 검토할 것.

캡처된 골든이 이미 증명한 계약 두 가지:

| 지점 | 실측 | Java 기본값이면 |
|---|---|---|
| `progressRatio` | `1` | `double` 이면 `1.0` — 프론트 비교가 깨진다 |
| `createdAt` | `2026-07-20T07:21:56.727Z` | `Instant.toString()` 은 ms 가 0 이면 `.000` 을 생략한다 |

## 현재 상태 (W1)

| 관문 | 상태 |
|---|---|
| `./gradlew build` 통과 | ✅ |
| QueryDSL APT × Boot 4.1 × Hibernate 7 × Gradle 9 × JDK 21 | ✅ `QAccountRef` 생성 확인 — 폴백 불필요 |
| `ddl-auto=validate` 로 운영 DDL 위 기동 | ✅ `SmokeContextTest` |
| `SchemaContractVerifier` (UNIQUE 5종) | ✅ 부팅 시 확인, 없으면 기동 실패 |
| 골든 캡처 | ✅ 18건 (GET 16 + 에러 봉투 2). POST 성공 경로는 미캡처 |
| Nest 발급 토큰으로 파일럿 인증 | ⬜ W1 잔여 — `SecurityConfig` 미작성 |

다음: `SecurityConfig`(HS256 대칭키로 Nest 토큰 검증) → `/wallet/me` 읽기 경로(W2).

## 문서

- `docs/adr/` — 설계 결정과 그 이유. "쓸 수 있는데 왜 안 썼는가"를 남기는 곳.
- `docs/DIVERGENCES.md` — Nest 와 일부러 다르게 만든 지점 대장.
- `docs/endpoint-parity-matrix.md` — 23개 엔드포인트 이관 현황.
