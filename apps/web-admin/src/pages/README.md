# Pages 디렉토리 가이드

## 📁 구조

```
pages/
├── dashboard/              # 대시보드 페이지
├── history/                # 히스토리 관련 페이지
│   ├── country/           # 국가 페이지
│   │   ├── country.page.tsx
│   │   └── country.loader.ts
│   ├── continents/        # 대륙 페이지
│   │   ├── continents.page.tsx
│   │   └── continents.loader.ts
│   └── history.route.tsx  # 히스토리 라우트 정의
├── layout/                # 메인 레이아웃
├── login/                 # 로그인 페이지
└── README.md              # 이 파일
```

## 🗺️ 라우팅 패턴

### 1. 경로 상수 정의

**위치**: `shared/constants/routes.ts`

```typescript
export const ROUTES = {
  // Root & Auth
  ROOT: '/',
  LOGIN: 'login',

  // History (중첩 구조)
  HISTORY: {
    ROOT: 'history',
    COUNTRY: 'country',
    CONTINENTS: 'continents',
  },
} as const
```

**장점**:

- ✅ **일관성**: 모든 경로를 한 곳에서 관리
- ✅ **타입 안전**: 컴파일 타임에 오타 검출
- ✅ **확장성**: 새 섹션 추가 용이
- ✅ **중복 제거**: DRY 원칙 준수

### 2. 라우트 설정 (Lazy Loading)

**패턴**: 각 페이지는 `{section}.route.tsx` 파일로 정의

```typescript
// history.route.tsx
import { RouteObject } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'
import HistoryLayout from '@/widgets/history-layout/history-layout.ui'

export const historyPageRoute: RouteObject = {
  path: ROUTES.HISTORY.ROOT,
  element: <HistoryLayout />,
  children: [
    {
      path: ROUTES.HISTORY.COUNTRY,
      lazy: async () => {
        const [{ countryLoader }, { default: Component }] =
          await Promise.all([
            import('./country/country.loader'),
            import('./country/country.page'),
          ])
        return { loader: countryLoader, Component }
      },
    },
  ],
}
```

**주요 특징**:

#### ✅ Lazy Loading (코드 스플리팅)

```typescript
lazy: async () => {
  // 페이지 접근 시점에 로드
  const Component = await import('./country/country.page')
  return { Component }
}
```

- **효과**: 초기 번들 크기 감소
- **장점**: 사용자가 실제 방문하는 페이지만 다운로드

#### ✅ 병렬 로딩 (성능 최적화)

```typescript
const [loader, Component] = await Promise.all([
  import('./country.loader'),
  import('./country.page'),
])
```

- **효과**: 로더와 컴포넌트를 동시에 로드
- **장점**: 순차 로딩 대비 시간 단축

#### ✅ 경로 상수 사용

```typescript
path: ROUTES.HISTORY.COUNTRY,  // ❌ 'country' (하드코딩 X)
```

- **효과**: 타입 안전성, 리팩토링 용이
- **장점**: IDE 자동완성, 컴파일 타임 검증

### 3. 페이지 구조

각 페이지는 다음 파일들로 구성:

```
country/
├── country.page.tsx       # 페이지 컴포넌트
├── country.loader.ts      # 데이터 로더 (선택)
└── components/            # 페이지 전용 컴포넌트 (선택)
```

#### 페이지 컴포넌트 (`*.page.tsx`)

```typescript
export default function CountryPage() {
  return (
    <div>
      {/* 페이지 내용 */}
    </div>
  )
}
```

#### 데이터 로더 (`*.loader.ts`)

```typescript
import { LoaderFunctionArgs } from 'react-router'

export async function countryLoader({ request, params }: LoaderFunctionArgs) {
  // 페이지 렌더링 전 데이터 로드
  const countries = await fetchCountries()

  return {
    countries,
    timestamp: new Date().toISOString(),
  }
}
```

**로더의 장점**:

- ✅ **데이터 준비**: 컴포넌트 렌더링 전 데이터 로드
- ✅ **에러 처리**: 로딩 실패 시 에러 바운더리 처리
- ✅ **캐싱**: React Router의 자동 캐싱 활용
- ✅ **병렬화**: 여러 로더를 동시 실행 가능

## 📋 체크리스트

### 새 페이지 추가 시

1. ☑️ **경로 상수 추가** (`shared/constants/routes.ts`)

   ```typescript
   ADMIN: {
     ROOT: 'admin',
     USERS: 'users',
   }
   ```

2. ☑️ **페이지 컴포넌트 생성** (`pages/admin/admin.page.tsx`)

   ```typescript
   export default function AdminPage() { ... }
   ```

3. ☑️ **로더 생성** (선택, `pages/admin/admin.loader.ts`)

   ```typescript
   export async function adminLoader() { ... }
   ```

4. ☑️ **라우트 정의** (`pages/admin/admin.route.tsx`)

   ```typescript
   export const adminPageRoute: RouteObject = {
     path: ROUTES.ADMIN.ROOT,
     lazy: async () => { ... }
   }
   ```

5. ☑️ **라우터에 등록** (`app/browser-router.tsx`)

   ```typescript
   import { adminPageRoute } from '@/pages/admin/admin.route'

   children: [adminPageRoute]
   ```

## 🎯 Best Practices

### DO ✅

1. **경로는 ROUTES 상수 사용**

   ```typescript
   path: ROUTES.HISTORY.COUNTRY // Good
   ```

2. **Lazy loading 적용**

   ```typescript
   lazy: async () => {
     const Component = await import('./page')
     return { Component }
   }
   ```

3. **병렬 로딩 활용**

   ```typescript
   await Promise.all([import('./loader'), import('./page')])
   ```

4. **페이지별 로더 분리**
   ```typescript
   country / country.loader.ts
   continents / continents.loader.ts
   ```

### DON'T ❌

1. **하드코딩된 문자열 사용**

   ```typescript
   path: 'country' // Bad - 타입 안전성 없음
   ```

2. **함수 호출로 경로 반환**

   ```typescript
   path: pathKeys.history.root() // Bad - 불필요한 오버헤드
   ```

3. **레이아웃에 로더 정의**

   ```typescript
   // Bad - 레이아웃은 UI만, 데이터는 페이지에서
   element: <HistoryLayout />,
   loader: historyLoader,  // ❌
   ```

4. **모든 페이지를 static import**
   ```typescript
   import CountryPage from './country.page' // Bad - 번들 크기 증가
   ```

## 🔗 관련 파일

- 경로 상수: `shared/constants/routes.ts`
- 경로 함수: `shared/router.ts`
- 메인 라우터: `app/browser-router.tsx`
- 예시 라우트: `pages/history/history.route.tsx`

## 📚 참고 자료

- [React Router - Lazy Loading](https://reactrouter.com/en/main/route/lazy)
- [React Router - Loaders](https://reactrouter.com/en/main/route/loader)
- [Code Splitting - React Docs](https://react.dev/reference/react/lazy)
