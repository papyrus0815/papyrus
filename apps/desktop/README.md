# Papyrus Desktop

관리자 화면(`apps/web-admin`)을 브라우저 대신 **독립 실행 창**에서 띄우는 Electron 셸.

`apps/service-manager`(서비스 기동·중지 도구)와는 별개다. 이쪽은 관리자 화면 그 자체다.

## 구조

```
Electron main (apps/desktop)
├── 내부 HTTP 서버 (127.0.0.1:3100)
│   ├── 정적: apps/web-admin/dist  (SPA 폴백 포함 → BrowserRouter 그대로 동작)
│   └── 그 외 요청: http://127.0.0.1:8000 으로 프록시 (/uploads 포함)
└── API 프로세스
    ├── 이미 떠 있으면 그대로 사용
    └── 없으면 dist/apps/api/.../main.js 를 자식 프로세스로 기동
```

**왜 내부 프록시인가.** `file://`로 띄우면 `createBrowserRouter`가 깨지고, 화면과 API의
오리진이 달라지면 CORS·쿠키를 따로 손봐야 한다. 화면과 API를 같은 오리진에 두면
브라우저에서 vite dev 프록시로 돌 때와 동작이 똑같아진다 —
프록시 판별 규칙도 `apps/web-admin/vite.config.ts`의 bypass 규칙을 그대로 따라간다.

그래서 데스크톱용 번들은 `VITE_API_BASE_URL`을 **비운 채** 빌드한다(`--mode desktop`).
그 사실은 `VITE_RUNTIME_TARGET='desktop'`으로 런타임에 전달되고,
`use-env-config.hook`은 이 표식을 보고 "환경 변수 누락" 경고를 띄우지 않는다.

## 실행

```bash
# 화면 + main 빌드 후 실행 (API가 안 떠 있으면 앱이 직접 띄운다)
npm run desktop:dev

# 화면을 이미 빌드해 뒀다면
npm run desktop:start
```

DB(도커/MySQL)는 이 앱이 관리하지 않는다. `npm run docker:up` 또는 service-manager로 먼저 올릴 것.

## 설치본 만들기

```bash
npm run desktop:package:mac     # dmg
npm run desktop:package:win     # nsis + portable
npm run desktop:package:linux   # AppImage + deb
npx electron-builder --projectDir apps/desktop --mac --dir   # 서명 없이 .app만 (빠른 확인용)
```

산출물은 `apps/desktop/release/`.

**설치본에는 화면만 들어간다.** API를 앱 안에 통째로 넣으려면 `node_modules`와
Prisma 엔진까지 동봉해야 해서 별도 작업이다. 그래서 설치본은
(a) 이미 떠 있는 API를 쓰거나, (b) `PAPYRUS_REPO_DIR`로 레포 경로를 지정하면
그쪽 `dist/apps/api`에서 API를 직접 띄운다.

## 윈도우 PC에 배포하기

맥에서 그대로 크로스 빌드할 수 있다. electron-builder가 필요한 wine·NSIS를 알아서 받는다.

```bash
npm run desktop:package:win        # x64가 아닌 호스트 아키텍처로 나갈 수 있으니 아래를 권장
npx electron-builder --projectDir apps/desktop --win --x64
```

`apps/desktop/release/`에 두 개가 나온다.

| 파일                      | 성격                                            |
| ------------------------- | ----------------------------------------------- |
| `Papyrus Setup 0.1.0.exe` | NSIS 설치본 (설치 경로 선택·바탕화면 바로가기)  |
| `Papyrus 0.1.0.exe`       | 포터블 — 설치 없이 더블클릭                     |

서명을 하지 않았으므로 윈도우에서 SmartScreen 경고가 뜬다. **추가 정보 → 실행**으로 넘길 것.

### 윈도우 쪽 API를 어떻게 댈 것인가

설치본에는 화면만 들어 있다. 둘 중 하나를 골라야 한다.

**(A) 맥/서버의 API를 가리키기 — 간단함.**
API는 `BIND_HOST=0.0.0.0`이라 같은 네트워크에서 접근된다.
윈도우에서 `%APPDATA%\Papyrus\config.json`에 적는다.

```json
{ "apiOrigin": "http://192.168.0.10:8000" }
```

한 번만 써볼 거면 인자로도 된다 — `Papyrus.exe --api=http://192.168.0.10:8000`.
DB는 맥 쪽 도커를 그대로 쓰고, 윈도우는 화면만 돌린다.
CORS는 걱정할 필요 없다 — 앱 내부 프록시를 거치므로 브라우저 입장에선 같은 오리진이다.

**(B) 윈도우에도 전체 스택을 깔기.**
레포 클론 → `npm ci` → 도커/MySQL → `npm run build:api`.
`apps/service-manager`에 윈도우용 `setup.bat`·`start.bat`이 이미 있다.
이 경우 앱이 `dist/apps/api`를 찾아 API까지 직접 띄운다.

## 설정 (`config.json` / 환경 변수 / 인자)

우선순위: **CLI 인자 > 환경 변수 > `config.json` > 기본값**

`config.json` 위치 — 윈도우 `%APPDATA%\Papyrus\config.json`,
macOS `~/Library/Application Support/Papyrus/config.json`

```json
{ "apiOrigin": "http://127.0.0.1:8000", "port": 3100 }
```

| 인자 / 환경 변수                        | 기본값                  | 설명                                     |
| --------------------------------------- | ----------------------- | ---------------------------------------- |
| `--port=` / `PAPYRUS_DESKTOP_PORT`      | `3100`                  | 내부 서버 포트 (사용 중이면 1씩 증가)    |
| `--api=` / `PAPYRUS_API_ORIGIN`         | `http://127.0.0.1:8000` | 프록시 대상 API                          |
| `PAPYRUS_REPO_DIR`                      | (개발 시 레포 루트)     | API 산출물·`env.development`를 찾을 경로 |

## 렌더러에 노출되는 표면

`window.papyrusDesktop` — `isDesktop`, `platform`, `getStatus()`, `onLog()`.

`window.electron`이라는 이름은 **쓰지 않는다.** `api.service.ts`의 `getApiBaseUrl()`이
그 키를 보고 API 주소를 `http://localhost:8000`으로 갈아끼우는데,
데스크톱 앱은 같은 오리진(내부 프록시)으로 부르는 편이 낫기 때문이다.
