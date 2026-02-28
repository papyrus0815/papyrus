# 업로드 이미지 404 오류 이해하기

## 오류 메시지

```
Failed to load resource: the server responded with a status of 404 (Not Found)
1772175649422-685463913.png
```

브라우저가 **이미지 URL을 요청했는데, 그 요청을 받은 서버가 404(Not Found)를 반환했다**는 뜻입니다.

## 원인

1. **이미지 파일은 서버(API) 디스크에 있음**  
   - `apps/api/uploads/images/` 아래에 `1772175649422-685463913.png` 등 파일이 실제로 존재합니다.

2. **요청이 API가 아닌 다른 서버로 감**  
   - 화면이 뜨는 주소가 예를 들어 `http://localhost:3000`(웹 admin)이면,  
     `<img src="/uploads/images/xxx.png">` 는 **같은 출처(origin)** 로 요청합니다.  
     → `http://localhost:3000/uploads/images/xxx.png` 로 요청이 나갑니다.  
   - 이 요청을 받는 것은 **API(8000번)** 가 아니라 **웹 서버(3000번)** 입니다.  
   - 3000번 서버에는 해당 경로에 파일이 없으므로 **404**를 반환합니다.

3. **정리**  
   - 404는 “파일이 디스크에 없다”가 아니라,  
     “**그 URL을 처리한 서버(프론트/프록시)가 파일을 찾지 못했다**”는 의미입니다.

## 해결 방법

### 1) 이미지 요청이 API로 가도록 하기 (권장)

- **환경 변수**  
  `.env` 또는 `.env.local`에서 다음처럼 설정합니다.  
  - 개발: `VITE_API_BASE_URL=http://localhost:8000`  
  - 운영: 실제 API 도메인 (예: `VITE_API_BASE_URL=https://api.example.com`)

  지금 `VITE_API_BASE_URL=""` 이면 이미지 요청이 웹 서버(예: 3000번)로 가서 404가 납니다.  
  **반드시 API 주소를 넣어주세요.**

- 그러면 `getUploadImageUrl()`을 쓰는 곳에서는  
  `/uploads/images/xxx.png` → `http://localhost:8000/uploads/images/xxx.png` 로 바뀌어  
  **브라우저가 직접 API(8000)로 요청**하고, API가 `apps/api/uploads/images/` 에서 파일을 서빙합니다.

- **추가**  
  업로드 이미지를 쓰는 모든 `<img src={...}>` 에서  
  상대 경로(`/uploads/...`)일 때는 `getUploadImageUrl(url)` 로 감싸서 사용하는 것이 좋습니다.

### 2) 프록시로 3000 → 8000 넘기기 (개발 시)

- 웹을 `http://localhost:3000` 에서 띄우고,  
  `VITE_API_BASE_URL` 을 비워 두어 “같은 출처”로 요청하게 한 경우  
  **Vite 프록시**가 `/uploads` 를 API(8000)로 넘겨줘야 합니다.
- `vite.config.ts` 에 이미 `/uploads` → `http://localhost:8000` 설정이 있으면,  
  이론상 3000으로 들어온 `/uploads/...` 요청은 8000으로 전달됩니다.
- 그런데도 404가 나면  
  - 실제로 요청이 3000으로만 가고 있거나  
  - 프록시가 적용되지 않는 환경(예: 빌드 후 다른 서버에서 서빙)일 수 있으므로,  
  위 1)처럼 **API 주소를 붙여서 직접 8000으로 요청**하는 방식이 더 안정적입니다.

## 확인 방법

- 브라우저에서 **직접** 아래 주소를 엽니다.  
  `http://localhost:8000/uploads/images/1772175649422-685463913.png`  
  - **이미지가 보이면**  
    API 서빙은 정상이고, 문제는 “요청이 3000으로 가고 있는 것”입니다.  
    → 1) 적용(환경 변수 + `getUploadImageUrl` 사용).  
  - **404가 나오면**  
    API 쪽 라우팅/경로 문제이므로, 서버 로그와 업로드 경로 설정을 확인해야 합니다.
