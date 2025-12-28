# ========================================
# Docker 빌드 가이드
# ========================================

## 로컬 빌드 및 테스트

### 이미지 빌드
```bash
# API 이미지 빌드
docker build -t papyrus-api:latest .

# 특정 태그로 빌드
docker build -t papyrus-api:v0.0.1 .
```

### 로컬 실행
```bash
# 기본 실행
docker run -p 8000:8000 papyrus-api:latest

# 환경 변수 포함 실행
docker run -p 8000:8000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/papyrus" \
  -e JWT_SECRET="your-secret-key" \
  papyrus-api:latest

# 환경 파일 사용
docker run -p 8000:8000 --env-file .env papyrus-api:latest
```

### 디버그 모드
```bash
# 컨테이너 접속
docker run -it --entrypoint sh papyrus-api:latest

# 실행 중인 컨테이너 접속
docker exec -it <container-id> sh
```

## CI/CD 배포

### GitLab CI/CD
`.gitlab-ci.yml`에 다음 스테이지 추가:

```yaml
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHORT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE/api:latest .
    - docker push $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHORT_SHA
    - docker push $CI_REGISTRY_IMAGE/api:latest
```

### Kubernetes 배포
```bash
# Secret 생성
kubectl create secret generic papyrus-secrets \
  --from-literal=database-url='mysql://user:pass@host:3306/papyrus' \
  --from-literal=jwt-secret='your-production-jwt-secret'

# 배포
kubectl apply -f k8s/deployment.yaml

# 상태 확인
kubectl get pods -l app=papyrus-api
kubectl logs -f deployment/papyrus-api-deployment
```

## 멀티 스테이지 빌드 구조

```
Stage 1 (deps): 프로덕션 의존성만 설치
    ↓
Stage 2 (builder): 전체 의존성 설치 + 애플리케이션 빌드
    ↓
Stage 3 (runner): 빌드 결과물 + 프로덕션 의존성만 포함
```

### 최적화 포인트
- ✅ 레이어 캐싱: package.json 먼저 복사
- ✅ 멀티 스테이지: 최종 이미지 크기 최소화
- ✅ Alpine Linux: 경량 베이스 이미지
- ✅ 비특권 사용자: 보안 강화
- ✅ 헬스체크: 컨테이너 상태 모니터링
- ✅ .dockerignore: 불필요한 파일 제외

## 이미지 크기 비교

```
기존 (단일 스테이지): ~800MB
현재 (멀티 스테이지): ~250MB
```

## 환경 변수

### 필수 환경 변수
- `DATABASE_URL`: 데이터베이스 연결 문자열
- `JWT_SECRET`: JWT 서명 키

### 선택 환경 변수
- `NODE_ENV`: production (기본값)
- `PORT`: 8000 (기본값)
- `LOG_LEVEL`: info (프로덕션 권장)

## 헬스체크

컨테이너는 `/health` 엔드포인트로 헬스체크를 수행합니다:
- 30초마다 체크
- 3초 타임아웃
- 시작 후 40초 유예
- 3회 실패 시 unhealthy

## 트러블슈팅

### 빌드 실패
```bash
# 캐시 없이 빌드
docker build --no-cache -t papyrus-api:latest .

# 빌드 로그 상세 출력
docker build --progress=plain -t papyrus-api:latest .
```

### 런타임 오류
```bash
# 로그 확인
docker logs <container-id>

# 환경 변수 확인
docker exec <container-id> env
```

### 데이터베이스 연결 실패
- DATABASE_URL 형식 확인
- 네트워크 연결 확인 (`host.docker.internal` 사용 고려)
- 방화벽 설정 확인

