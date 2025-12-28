# Docker 설치 가이드

이 문서는 macOS에서 Docker를 설치하고 설정하는 방법을 안내합니다.

## macOS에서 Docker 설치

### 방법 1: Docker Desktop 설치 (권장)

1. **Docker Desktop 다운로드**
   - 공식 웹사이트: https://www.docker.com/products/docker-desktop/
   - 또는 Homebrew를 사용하여 설치:
   ```bash
   brew install --cask docker
   ```

2. **Docker Desktop 실행**
   - Applications 폴더에서 Docker.app 실행
   - 또는 터미널에서:
   ```bash
   open -a Docker
   ```

3. **설치 확인**
   - Docker Desktop이 실행되면 메뉴바에 Docker 아이콘이 표시됩니다
   - 터미널에서 다음 명령어로 확인:
   ```bash
   docker --version
   docker compose version
   ```

### 방법 2: Colima 사용 (경량 대안)

Homebrew를 사용하는 경우 Colima를 대안으로 사용할 수 있습니다:

```bash
# Colima 설치
brew install colima docker docker-compose

# Colima 시작
colima start

# Docker 설정 확인
docker --version
```

## 설치 후 확인

다음 명령어로 Docker가 정상적으로 설치되었는지 확인하세요:

```bash
# Docker 버전 확인
docker --version

# Docker Compose 버전 확인
docker compose version

# Docker 실행 상태 확인
docker ps

# Docker 정보 확인
docker info
```

## 프로젝트에서 Docker 사용하기

이 프로젝트는 Docker Compose를 사용하여 MySQL과 Nginx를 실행합니다.

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하거나 기존 환경 변수 파일을 확인하세요:

```bash
# .env 파일 예시
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=papyrus
MYSQL_USER=papyrus
MYSQL_PASSWORD=your_password
MYSQL_PORT=3307
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
DOCKER_NETWORK_NAME=papyrus-network
```

### 2. Docker Compose로 서비스 시작

```bash
# 서비스 시작 (백그라운드)
docker compose up -d

# 로그 확인
docker compose logs -f

# 서비스 상태 확인
docker compose ps

# 서비스 중지
docker compose down

# 서비스 중지 및 볼륨 삭제 (데이터 삭제)
docker compose down -v
```

### 3. 개별 서비스 관리

```bash
# MySQL만 시작
docker compose up -d mysql

# Nginx만 시작
docker compose up -d nginx

# 특정 서비스 로그 확인
docker compose logs mysql
docker compose logs nginx

# 특정 서비스 재시작
docker compose restart mysql
```

## 문제 해결

### Docker Desktop이 시작되지 않는 경우

1. **시스템 요구사항 확인**
   - macOS 10.15 이상
   - 최소 4GB RAM
   - 가상화 지원 (Intel: VT-x, Apple Silicon: 자동 지원)

2. **권한 확인**
   - 시스템 설정 > 보안 및 개인 정보 보호에서 Docker 허용

3. **재설치**
   ```bash
   # Docker Desktop 완전 제거 후 재설치
   brew uninstall --cask docker
   brew install --cask docker
   ```

### 포트 충돌 문제

다른 애플리케이션이 같은 포트를 사용하는 경우:

```bash
# 포트 사용 확인
lsof -i :3307  # MySQL 포트
lsof -i :80    # HTTP 포트
lsof -i :443   # HTTPS 포트

# .env 파일에서 포트 변경
MYSQL_PORT=3308
NGINX_HTTP_PORT=8080
NGINX_HTTPS_PORT=8443
```

### 컨테이너가 시작되지 않는 경우

```bash
# 컨테이너 로그 확인
docker compose logs

# 컨테이너 상태 확인
docker compose ps -a

# 컨테이너 재생성
docker compose up -d --force-recreate
```

## 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Docker Desktop for Mac 가이드](https://docs.docker.com/desktop/install/mac-install/)

