# HSTS 오류 완전 해결 가이드

## 문제 상황
```
웹사이트에서 HSTS를 사용하므로 지금은 app.civilization.zone에 방문할 수 없습니다.
net::ERR_CERT_AUTHORITY_INVALID
```

이는 브라우저가 이전에 방문했을 때 HSTS 헤더를 캐시했고, 이제 자체 서명 인증서를 거부하고 있는 상황입니다.

## 해결 방법 (순서대로 시도)

### 1단계: Nginx 재시작 (필수)

먼저 Nginx 컨테이너를 재시작하여 변경된 설정을 적용합니다:

```powershell
# Docker Compose 사용 시
docker-compose restart nginx

# 또는 직접 컨테이너 재시작
docker restart papyrus-nginx
```

### 2단계: Chrome HSTS 캐시 삭제 (필수)

#### 방법 A: chrome://net-internals (권장)

1. **Chrome 주소창에 정확히 입력:**
   ```
   chrome://net-internals/#hsts
   ```

2. **"Delete domain security policies" 섹션으로 스크롤**

3. **도메인 입력 및 삭제:**
   ```
   civilization.zone
   ```
   "Delete" 버튼 클릭

4. **각 서브도메인도 개별 삭제:**
   ```
   app.civilization.zone
   api.civilization.zone
   user.civilization.zone
   ```
   각각 Delete 클릭

5. **"Query HSTS/PKP domain"에서 확인:**
   - `civilization.zone` 입력 후 "Query" 클릭
   - "Not found" 메시지가 나와야 성공

#### 방법 B: 브라우저 데이터 완전 삭제

1. **Chrome 설정 열기:**
   ```
   chrome://settings/clearBrowserData
   ```

2. **고급 탭 선택**

3. **기간: "전체 기간" 선택**

4. **다음 항목 체크:**
   - ✅ 쿠키 및 기타 사이트 데이터
   - ✅ 캐시된 이미지 및 파일

5. **"데이터 삭제" 클릭**

6. **Chrome 완전 종료 후 재시작**

### 3단계: hosts 파일 확인 (선택사항)

`C:\Windows\System32\drivers\etc\hosts` 파일에 다음이 있는지 확인:

```
127.0.0.1 app.civilization.zone
127.0.0.1 api.civilization.zone
127.0.0.1 user.civilization.zone
```

없다면 **관리자 권한**으로 메모장을 열어 추가하세요.

### 4단계: 접속 시도

#### 방법 A: 시크릿 모드 (빠른 테스트)

1. **Ctrl + Shift + N** (Chrome 시크릿 모드)
2. `https://app.civilization.zone` 접속
3. **"고급" 클릭 → "app.civilization.zone(으)로 이동(안전하지 않음)" 클릭**

시크릿 모드에서 작동하면 HSTS 캐시 문제가 맞습니다.

#### 방법 B: 인증서 수동 신뢰 (영구 해결)

Windows에서 인증서를 신뢰할 수 있는 저장소에 추가:

```powershell
# PowerShell 관리자 권한으로 실행
Import-Certificate -FilePath "docker\nginx\ssl\server.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

실행 후:
1. Chrome 완전 종료
2. 다시 열기
3. `https://app.civilization.zone` 접속
4. 경고 없이 접속되어야 함

### 5단계: 여전히 안 되는 경우

#### 옵션 1: HTTP로 임시 접속

`nginx.conf`를 수정하여 HTTP만 사용:

```nginx
server {
    listen 80;
    server_name app.civilization.zone;
    # SSL 관련 설정 주석 처리
}
```

그 후 `http://app.civilization.zone` 접속

#### 옵션 2: mkcert로 신뢰받는 인증서 생성 (권장)

```powershell
# Chocolatey로 mkcert 설치
choco install mkcert -y

# 루트 CA 설치
mkcert -install

# 인증서 생성
cd docker\nginx
mkcert -key-file ssl\server.key -cert-file ssl\server.crt app.civilization.zone api.civilization.zone user.civilization.zone localhost "*.civilization.zone"
```

mkcert로 생성한 인증서는 브라우저가 자동으로 신뢰합니다.

## 확인 체크리스트

- [ ] Nginx 재시작 완료
- [ ] chrome://net-internals/#hsts에서 도메인 삭제 완료
- [ ] Chrome 완전 종료 후 재시작
- [ ] 시크릿 모드에서 접속 테스트
- [ ] hosts 파일에 도메인 추가됨
- [ ] 필요시 인증서를 Windows 신뢰 저장소에 추가

## 참고

- **HSTS는 보안 기능**이므로 삭제 후에도 다시 캐시될 수 있습니다
- **개발 환경**에서는 mkcert 사용이 가장 편리합니다
- **프로덕션**에서는 Let's Encrypt 등 공인 인증서를 사용해야 합니다
- 자체 서명 인증서 사용 시 브라우저 경고는 **정상**이며, "고급 → 계속 진행"으로 우회 가능합니다

## 추가 트러블슈팅

인증서 정보 확인:
```powershell
# 인증서 내용 확인
openssl x509 -in docker\nginx\ssl\server.crt -text -noout

# 인증서와 키 매칭 확인
openssl x509 -noout -modulus -in docker\nginx\ssl\server.crt | openssl md5
openssl rsa -noout -modulus -in docker\nginx\ssl\server.key | openssl md5
```

두 MD5 해시가 일치해야 합니다.




