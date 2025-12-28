# SSL 인증서 문제 해결 가이드

## 문제: ERR_CERT_AUTHORITY_INVALID

개발 환경에서 자체 서명 인증서를 사용할 때 발생하는 일반적인 문제입니다.

## 해결 방법

### 1. HSTS 헤더 제거 (완료됨)

`docker/nginx/nginx.conf`에서 HSTS 헤더가 주석 처리되었습니다.

### 2. 브라우저 HSTS 캐시 삭제

이미 브라우저에 HSTS가 캐시되어 있다면 삭제해야 합니다.

#### Chrome/Edge

1. 주소창에 `chrome://net-internals/#hsts` 입력
2. "Delete domain security policies" 섹션으로 이동
3. `civilization.zone` 입력 후 "Delete" 클릭
4. 페이지 새로고침

#### Firefox

1. 주소창에 `about:preferences#privacy` 입력
2. "보안" 섹션에서 "HTTPS-Only 모드" 비활성화 (임시)
3. 브라우저 재시작 후 다시 활성화

### 3. 자체 서명 인증서 신뢰하기 (선택사항)

#### Windows

```powershell
# 인증서를 로컬 컴퓨터 신뢰 저장소에 추가
Import-Certificate -FilePath "docker/nginx/ssl/server.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

#### macOS

```bash
# Keychain에 인증서 추가
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain docker/nginx/ssl/server.crt
```

#### Linux (Chrome)

```bash
# 인증서를 시스템 신뢰 저장소에 복사
sudo cp docker/nginx/ssl/server.crt /usr/local/share/ca-certificates/civilization.crt
sudo update-ca-certificates
```

### 4. SSL 인증서 재생성

인증서가 없거나 만료된 경우:

```powershell
# PowerShell에서 실행
cd docker/nginx
.\generate-ssl.ps1
```

또는

```bash
# Linux/Mac에서 실행
cd docker/nginx
./generate-ssl.sh
```

### 5. Nginx 재시작

설정 변경 후 Docker 컨테이너 재시작:

```bash
docker restart papyrus-nginx
```

또는 Docker Compose 사용 시:

```bash
docker-compose restart nginx
```

## 참고

- 개발 환경에서는 자체 서명 인증서를 사용하므로 브라우저 경고가 정상입니다
- 프로덕션 환경에서는 Let's Encrypt나 상용 인증서를 사용해야 합니다
- HSTS는 프로덕션 환경에서만 활성화하는 것을 권장합니다
