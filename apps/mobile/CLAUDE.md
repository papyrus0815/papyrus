# Papyrus Mobile — Claude 작업 가이드

## 정체성

이 앱은 **web-admin을 띄우는 얇은 WebView 셸**이다. 화면 로직·디자인·데이터는 전부 `apps/web-admin`에 있고, 모바일은 그것을 네이티브 컨테이너로 감싸기만 한다.

- 기능을 추가/수정하려면 **web-admin을 고친다.** mobile에 화면을 만들지 않는다.
- mobile에서 손볼 일: WebView 동작(로딩/에러/뒤로가기/파일업로드/딥링크), 스플래시·아이콘, 빌드 설정.

## 구조

```
app/_layout.tsx   Stack (headerShown:false) — index 한 화면만
app/index.tsx     WebView 셸 (로딩 오버레이 · 에러+재시도 · Android back · 파일업로드)
lib/web-url.ts    로드할 web-admin URL 결정 (lib/api.ts 패턴 재사용)
```

## URL 결정 (`lib/web-url.ts`)

1. `EXPO_PUBLIC_WEB_URL` 있으면 그대로 (staging/prod 배포 URL)
2. `__DEV__`: Expo dev server 호스트 자동 감지 + `EXPO_PUBLIC_WEB_PORT`(기본 3000, web-admin vite 포트)

dev에서 web-admin이 떠 있어야 한다: 루트에서 `npm run serve:web-admin` (포트 3000).

## 주의

- http dev 서버 로드를 위해 `app.json`의 android `usesCleartextTraffic:true`, WebView `mixedContentMode:"always"` 필요 — 빼지 말 것.
- 외부 도메인 링크는 시스템 브라우저로 보내고, web-admin 내부 SPA 라우팅은 WebView가 처리.
- **App Store 리젝 주의**: 순수 WebView 래퍼는 Apple 가이드라인 4.2에 걸릴 수 있음. 스토어 배포 시 네이티브 기능(푸시 등) 보강 검토.

## SDK·API

루트 `CLAUDE.md`의 Prisma·SDK 가이드도 함께 적용. 단, 모바일은 API를 직접 호출하지 않는다(web-admin이 호출).
