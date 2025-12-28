# Papyrus Project Constitution

> 이 문서는 Papyrus 프로젝트의 핵심 원칙과 가이드라인을 정의합니다.  
> 모든 코드, 기능, 리팩토링은 이 헌법을 기반으로 작성되어야 합니다.

**버전**: 1.0.0  
**최종 수정**: 2025-10-18

---

## 📜 목차

1. [프로젝트 철학](#-프로젝트-철학)
2. [아키텍처 원칙](#-아키텍처-원칙)
3. [기술 스택](#-기술-스택)
4. [코딩 컨벤션](#-코딩-컨벤션)
5. [컴포넌트 가이드라인](#-컴포넌트-가이드라인)
6. [품질 기준](#-품질-기준)
7. [금지 사항](#-금지-사항)

---

## 🎯 프로젝트 철학

### 핵심 가치

1. **단순성 (Simplicity)**: 복잡함보다 단순함을 선택한다
2. **일관성 (Consistency)**: 모든 코드는 동일한 패턴을 따른다
3. **유지보수성 (Maintainability)**: 6개월 후에도 이해할 수 있는 코드
4. **성능 (Performance)**: 사용자 경험을 최우선으로 한다
5. **확장성 (Scalability)**: 미래의 변화를 고려한 설계

### 설계 원칙

- **KISS (Keep It Simple, Stupid)**: 단순하게 유지하라
- **DRY (Don't Repeat Yourself)**: 중복을 제거하라
- **YAGNI (You Aren't Gonna Need It)**: 필요한 것만 구현하라
- **Separation of Concerns**: 관심사를 분리하라
- **Single Responsibility**: 하나의 책임만 가져라

---

## 🏗️ 아키텍처 원칙

### 1. Nx Monorepo 구조

```
papyrus/
├── apps/
│   ├── api/              # Backend - NestJS
│   ├── web/              # Frontend - React
│   └── service-manager/  # Electron - Service Manager
├── libs/
│   ├── db/               # Prisma schemas
│   └── api-sdk/          # API client
├── docs/                 # 문서
└── scripts/              # 자동화 스크립트
```

**원칙**:

- ✅ 각 앱은 독립적으로 실행 가능해야 함
- ✅ 공통 로직은 `libs/`에 위치
- ✅ 앱 간 직접 의존성은 금지 (API를 통한 통신만 허용)

### 2. Backend: Clean Architecture (NestJS)

```
apps/api/src/libs/{domain}/
├── application/          # Use cases (비즈니스 로직)
│   ├── commands/        # 명령 (쓰기 작업)
│   ├── queries/         # 쿼리 (읽기 작업)
│   └── services/        # 도메인 서비스
├── domain/              # 엔티티, 값 객체, 도메인 이벤트
├── infrastructure/      # 외부 의존성 (DB, API 등)
└── presentation/        # 컨트롤러, DTO
    ├── controller.ts
    └── dto/
```

**원칙**:

- ✅ CQRS 패턴 사용 (Command/Query 분리)
- ✅ 도메인 로직은 `domain/`에만 위치
- ✅ Controller는 얇게 유지 (라우팅만 담당)
- ✅ DTO는 Zod로 검증
- ✅ Prisma는 `infrastructure/`에서만 사용

### 3. Frontend: Feature-Sliced Design (FSD)

```
apps/web/src/
├── app/                 # 애플리케이션 초기화
├── pages/               # 페이지 (라우트)
├── widgets/             # 독립적인 UI 블록 (헤더, 사이드바 등)
├── features/            # 비즈니스 기능 (로그인, 국가 추가 등)
├── entities/            # 비즈니스 엔티티 (Country, User 등)
└── shared/              # 공통 코드
    ├── ui/              # 공통 UI 컴포넌트
    ├── api/             # API 클라이언트
    ├── lib/             # 유틸리티
    ├── constants/       # 상수
    └── styles/          # 전역 스타일
```

**계층 규칙** (상위는 하위만 import 가능):

```
app → pages → widgets → features → entities → shared
```

**원칙**:

- ✅ **하위 계층은 상위 계층을 import할 수 없음**
- ✅ 같은 계층 간에는 import 금지 (features ↔ features ❌)
- ✅ 각 슬라이스는 `index.ts`를 통해서만 export
- ✅ 페이지는 조립만 담당 (비즈니스 로직 금지)
- ✅ 비즈니스 로직은 `features/`나 `entities/`에 위치

### 4. Database: Prisma 모듈화

```
libs/db/prisma/
├── base.prisma          # 기본 설정
├── common.prisma        # 공통 모델
├── country.prisma       # 국가 도메인
├── military.prisma      # 군사 도메인
├── economy.prisma       # 경제 도메인
└── ...
```

**원칙**:

- ✅ 도메인별로 스키마 파일 분리
- ✅ `build-schema.ts`로 자동 병합
- ✅ 외래키 관계는 명확하게 정의
- ✅ 마이그레이션은 항상 검토 후 실행

---

## 🛠️ 기술 스택

### Backend

| 기술               | 용도                         | 버전   |
| ------------------ | ---------------------------- | ------ |
| **NestJS**         | 웹 프레임워크                | 11.x   |
| **Prisma**         | ORM                          | 6.x    |
| **Nestia**         | API 코드 생성 (SDK, Swagger) | 7.x    |
| **Zod**            | 스키마 검증                  | 4.x    |
| **Passport + JWT** | 인증                         | 11.x   |
| **MySQL**          | 데이터베이스                 | 8.x    |
| **Docker**         | 컨테이너화                   | latest |

**원칙**:

- ✅ 모든 엔드포인트는 DTO로 검증
- ✅ API 변경 시 Nestia 재생성 필수 (`npm run build:nestia`)
- ✅ 비밀번호는 Argon2로 해싱
- ✅ JWT는 httpOnly 쿠키로 전송

### Frontend

| 기술                      | 용도                 | 버전      |
| ------------------------- | -------------------- | --------- |
| **React**                 | UI 라이브러리        | 19.x      |
| **TypeScript**            | 타입 안전성          | 5.9.x     |
| **Vite**                  | 빌드 도구            | 6.x       |
| **React Router**          | 라우팅               | 7.x       |
| **styled-components**     | CSS-in-JS            | 6.x       |
| **Tailwind CSS**          | 유틸리티 CSS         | 4.x       |
| **Framer Motion**         | 애니메이션           | 12.x      |
| **React Hook Form + Zod** | 폼 관리 + 검증       | 7.x / 4.x |
| **TanStack Query**        | 서버 상태 관리       | 5.x       |
| **Zustand**               | 클라이언트 상태 관리 | 4.x       |
| **React Hot Toast**       | 알림                 | 2.x       |

**원칙**:

- ✅ 스타일: styled-components 우선, Tailwind 보조
- ✅ 폼: 반드시 React Hook Form + Zod 사용
- ✅ 애니메이션: Framer Motion 사용
- ✅ 서버 상태: TanStack Query
- ✅ 클라이언트 상태: Zustand (Redux 금지)

### DevOps

| 기술               | 용도          | 비고             |
| ------------------ | ------------- | ---------------- |
| **Nx**             | Monorepo 관리 | 21.x             |
| **Docker Compose** | 로컬 개발     | MySQL + Nginx    |
| **ESLint**         | Linting       | Flat Config (v9) |
| **Prettier**       | Formatting    | 기본 설정 사용   |

---

## 📝 코딩 컨벤션

### 1. TypeScript

#### 네이밍 규칙

```typescript
// ✅ DO
export interface UserProfile {} // PascalCase for types/interfaces
export type CountryId = string // PascalCase for type aliases
export class AuthService {} // PascalCase for classes
export function fetchCountries() {} // camelCase for functions
const userId = '123' // camelCase for variables
const MAX_RETRIES = 3 // UPPER_SNAKE_CASE for constants

// ❌ DON'T
interface userProfile {} // lowercase
function FetchCountries() {} // PascalCase
const UserID = '123' // PascalCase
```

#### 파일 네이밍

```
✅ DO:
- country.service.ts          # Backend services
- country.controller.ts       # Backend controllers
- country.page.tsx            # Frontend pages
- country.styles.ts           # Styled components
- useCountryForm.ts           # Custom hooks
- CountryList.tsx             # React components (PascalCase)

❌ DON'T:
- CountryService.ts           # PascalCase for files
- country-controller.ts       # kebab-case
- country_service.ts          # snake_case
```

#### Import 순서

```typescript
// 1. React 관련
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

// 2. 외부 라이브러리
import { motion, AnimatePresence } from 'framer-motion'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 3. 내부 절대 경로 (@/)
import type { Country } from '@/entities/country'
import { fetchCountries } from '@/shared/api'
import { Button } from '@/shared/ui'

// 4. 상대 경로
import * as S from './country.styles'
import { countrySchema } from './country.schema'
```

#### 타입 vs Interface

```typescript
// ✅ DO: Props는 interface
interface CountryFormProps {
  editing: Country | null
  onClose: () => void
}

// ✅ DO: 유니온/인터섹션은 type
type CountryId = string
type CountryStatus = 'active' | 'inactive' | 'deleted'

// ✅ DO: API 응답은 type
type CountryResponse = {
  data: Country[]
  total: number
}
```

### 2. React 컴포넌트

#### 컴포넌트 구조

```typescript
/**
 * 컴포넌트 설명
 */
export function CountryForm({ editing, onClose }: CountryFormProps) {
  // 1. Hooks (순서 중요!)
  const [state, setState] = useState()
  const form = useForm()

  // 2. Derived values
  const isValid = form.formState.isValid

  // 3. Effects
  useEffect(() => {
    // ...
  }, [deps])

  // 4. Event handlers
  const handleSubmit = async (data) => {
    // ...
  }

  // 5. Early returns
  if (!editing) {
    return null
  }

  // 6. JSX
  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

#### 컴포넌트 크기 제한

```
⚠️ 경고 기준:
- 300줄 이상: 분리 검토
- 500줄 이상: 반드시 분리
- 1000줄 이상: 즉시 리팩토링 필요
```

**분리 전략**:

```typescript
// ❌ BAD: 757줄짜리 거대 컴포넌트
export function HistoricalCountryForm() {
  // 757 lines of code...
}

// ✅ GOOD: 훅 + 작은 컴포넌트들
export function HistoricalCountryForm(props: Props) {
  const form = useHistoricalCountryForm(props)  // 비즈니스 로직

  return (
    <FormContainer>
      <FormHeader {...form.headerProps} />
      <BasicInfoSection {...form.basicProps} />
      <StateTypeSection {...form.stateProps} />
      <DateSection {...form.dateProps} />
      <ThumbnailSection {...form.thumbnailProps} />
      <FormFooter {...form.footerProps} />
    </FormContainer>
  )
}
```

### 3. 폼 관리

**필수**: React Hook Form + Zod

```typescript
// ✅ DO
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '국가명을 입력해주세요'),
  population: z.number().optional(),
})

type FormData = z.infer<typeof schema>

export function CountryForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'all',              // 실시간 검증
    reValidateMode: 'onChange',
    criteriaMode: 'all',      // 모든 에러 표시
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  )
}
```

### 4. 스타일링

#### styled-components (주 방식)

```typescript
// ✅ DO: 컴포넌트별 styles 파일
import styled from 'styled-components'
import { Z_INDEX } from '@/shared/styles/z-index'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`

export const Modal = styled.div`
  position: fixed;
  z-index: ${Z_INDEX.MODAL_CONTENT}; // ✅ 전역 상수 사용
  background: white;
  border-radius: 12px;
`
```

#### Tailwind CSS (보조 용도)

```typescript
// ✅ DO: 간단한 유틸리티만
<div className="flex items-center gap-4">
  <span className="text-gray-600 text-sm">Label</span>
</div>

// ❌ DON'T: 복잡한 스타일은 styled-components 사용
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  {/* styled-components로 작성할 것 */}
</div>
```

#### Z-Index 관리

```typescript
// ✅ DO: 전역 상수 사용
import { Z_INDEX } from '@/shared/styles/z-index'

const Modal = styled.div`
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

// ❌ DON'T: 하드코딩 금지
const Modal = styled.div`
  z-index: 9999; // ❌
`
```

### 5. 라우팅

#### 경로 상수 정의

```typescript
// shared/constants/routes.ts
export const ROUTES = {
  ROOT: '/',
  LOGIN: 'login',

  HISTORY: {
    ROOT: 'history',
    COUNTRY: 'country',
    CONTINENTS: 'continents',
  },

  ADMIN: {
    ROOT: 'admin',
    USERS: 'users',
  },
} as const
```

#### 라우트 설정 (Lazy Loading)

```typescript
// pages/history/history.route.tsx
import { RouteObject } from 'react-router'
import { ROUTES } from '@/shared/constants/routes'

export const historyRoute: RouteObject = {
  path: ROUTES.HISTORY.ROOT,
  element: <HistoryLayout />,
  children: [
    {
      path: ROUTES.HISTORY.COUNTRY,
      lazy: async () => {
        const [{ countryLoader }, { default: Component }] = await Promise.all([
          import('./country/country.loader'),
          import('./country/country.page'),
        ])
        return { loader: countryLoader, Component }
      },
    },
  ],
}
```

**원칙**:

- ✅ 모든 경로는 `ROUTES` 상수 사용
- ✅ Lazy loading으로 코드 스플리팅
- ✅ 병렬 로딩 (`Promise.all`) 활용
- ✅ 데이터 로더는 별도 파일 (`.loader.ts`)

### 6. 주석 작성

```typescript
// ✅ DO: JSDoc으로 함수/컴포넌트 설명
/**
 * 국가 목록을 조회합니다.
 * @param filter - 필터 조건
 * @returns 국가 목록
 */
export async function fetchCountries(filter: CountryFilter): Promise<Country[]> {
  // ...
}

// ✅ DO: 섹션 구분 주석
export function ComplexComponent() {
  // ==================== 상태 관리 ====================
  const [state, setState] = useState()

  // ==================== useEffect 훅 ====================
  useEffect(() => {
    // ...
  }, [])

  // ==================== 이벤트 핸들러 ====================
  const handleClick = () => {
    // ...
  }

  // ==================== JSX 렌더링 ====================
  return <div />
}

// ✅ DO: 복잡한 로직 설명
// 날짜는 ISO 형식에서 date input 형식(YYYY-MM-DD)으로 변환
const formattedDate = new Date(isoDate).toISOString().split('T')[0]

// ❌ DON'T: 불필요한 주석
const userId = getUserId()  // 사용자 ID 가져오기 ← 코드만 봐도 명확
```

### 7. 변수 네이밍

```typescript
// ✅ DO: 의미 있는 이름
const userId = '123'
const isAuthenticated = true
const hasPermission = checkPermission()
const shouldShowModal = visible && isAuthenticated

// ❌ DON'T: 한 글자 변수 (예외: i, j, _, id, x, y, z, e, t, S, p, a, T)
const u = '123' // ❌
const f = true // ❌
const d = new Date() // ❌

// ✅ ALLOWED: 반복문, 좌표, 제네릭
for (let i = 0; i < 10; i++) {}
const { x, y } = position
function map<T>(arr: T[]) {}
```

### 8. Return 문 전 공백

```typescript
// ✅ DO
function getUser() {
  const user = findUser()

  return user // 이전 줄과 공백
}

// ❌ DON'T
function getUser() {
  const user = findUser()
  return user // 공백 없음
}
```

---

## 🧩 컴포넌트 가이드라인

### 1. 폴더 구조

```
country-form/
├── ui/
│   └── CountryForm.tsx       # 메인 컴포넌트
├── model/
│   ├── useCountryForm.ts     # 비즈니스 로직 훅
│   └── countrySchema.ts      # Zod 스키마
└── index.ts                  # Public API
```

### 2. 공통 UI 컴포넌트

위치: `apps/web/src/shared/ui/`

```typescript
// Button 예시
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick,
}: ButtonProps) {
  return (
    <S.Button
      $variant={variant}
      $size={size}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : children}
    </S.Button>
  )
}
```

**원칙**:

- ✅ Props는 명확하게 타입 정의
- ✅ 기본값 제공
- ✅ `$prefix`로 transient props 구분 (styled-components)
- ✅ 접근성 고려 (aria 속성, 키보드 네비게이션)

### 3. 커스텀 훅

```typescript
// useCountryForm.ts
export function useCountryForm(editing: Country | null) {
  const [thumbnailPreview, setThumbnailPreview] = useState('')

  const form = useForm({
    resolver: zodResolver(countrySchema),
    defaultValues: editing || {},
  })

  const handleThumbnailChange = (file: File) => {
    // ...
  }

  const handleSubmit = async (data: CountryFormData) => {
    // ...
  }

  return {
    form,
    thumbnailPreview,
    handleThumbnailChange,
    handleSubmit,
  }
}
```

**원칙**:

- ✅ 비즈니스 로직을 컴포넌트에서 분리
- ✅ 재사용 가능한 단위로 작성
- ✅ 명확한 반환 객체 구조

### 4. 모달/드로어 패턴

```typescript
// ✅ DO: AnimatePresence + Portal
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <S.Overlay
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <S.Content
        as={motion.div}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
      >
        {children}
      </S.Content>
    </AnimatePresence>,
    document.body
  )
}
```

---

## ✅ 품질 기준

### 1. 코드 품질

| 항목          | 기준                           | 도구       |
| ------------- | ------------------------------ | ---------- |
| Linting       | 에러 0개                       | ESLint     |
| Type Safety   | `any` 사용 금지 (예외 승인)    | TypeScript |
| Test Coverage | 핵심 로직 80% 이상             | Jest       |
| Bundle Size   | 초기 로딩 < 500KB              | Vite       |
| 컴포넌트 크기 | < 300줄 (권장), < 500줄 (최대) | -          |

### 2. 성능 기준

| 항목                   | 기준                    |
| ---------------------- | ----------------------- |
| First Contentful Paint | < 1.5s                  |
| Time to Interactive    | < 3s                    |
| API 응답 시간          | < 500ms (95 percentile) |

### 3. 접근성 (a11y)

- ✅ 시맨틱 HTML 사용
- ✅ ARIA 속성 적절히 사용
- ✅ 키보드 네비게이션 지원
- ✅ 색상 대비 4.5:1 이상

### 4. 보안

- ✅ XSS 방지 (사용자 입력 검증)
- ✅ CSRF 토큰 사용
- ✅ JWT는 httpOnly 쿠키
- ✅ 환경 변수로 민감 정보 관리

---

## 🚫 금지 사항

### 절대 금지

```typescript
// ❌ any 타입 (예외적으로 승인 필요)
const data: any = fetchData()

// ❌ console.log (개발 시 디버깅 후 제거)
console.log('debug')

// ❌ 하드코딩된 경로
navigate('/history/country')  // ROUTES 상수 사용할 것

// ❌ 하드코딩된 z-index
z-index: 9999;  // Z_INDEX 상수 사용할 것

// ❌ styled-components props를 DOM에 전달
<Button variant="primary" />  // $variant로 변경

// ❌ 마법의 숫자/문자열
if (status === 'A') { }  // const STATUS_ACTIVE = 'A' 사용

// ❌ 중첩된 삼항 연산자
const value = a ? b : c ? d : e ? f : g  // if-else 또는 switch 사용

// ❌ 깊은 중첩 (3단계 이상)
if (a) {
  if (b) {
    if (c) {
      if (d) {  // ❌ 너무 깊음
        // ...
      }
    }
  }
}

// ❌ 함수 내 함수 (클로저 의도가 명확한 경우 제외)
function outer() {
  function inner() {  // ❌ 별도 분리
    // ...
  }
}
```

### 지양 사항

```typescript
// ⚠️ Nested ternary (간단한 경우만 허용)
const label = isLoading ? '로딩중' : isError ? '에러' : '완료'  // 허용
const label = a ? b : c ? d : e  // ⚠️ 너무 복잡 - if-else 사용

// ⚠️ Optional chaining 남용
data?.user?.profile?.address?.city?.name  // ⚠️ 데이터 구조 개선 검토

// ⚠️ 인라인 스타일 (특별한 경우만)
<div style={{ color: 'red' }}>  // styled-components 사용

// ⚠️ !important (최후의 수단)
.override {
  color: red !important;  // ⚠️ 우선순위 재설계
}
```

---

## 📚 추가 리소스

- [Nx 문서](https://nx.dev)
- [Feature-Sliced Design](https://feature-sliced.design)
- [React Router v7](https://reactrouter.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)
- [Prisma](https://www.prisma.io)
- [NestJS](https://nestjs.com)

---

## 📝 문서 개정 이력

| 버전  | 날짜       | 변경 내용 | 작성자 |
| ----- | ---------- | --------- | ------ |
| 1.0.0 | 2025-10-18 | 초안 작성 | AI     |

---

## 🤝 기여 가이드

이 문서를 수정하려면:

1. 팀원과 논의
2. PR 생성
3. 리뷰 및 승인
4. 병합 후 팀 공유

**이 Constitution은 프로젝트의 법률입니다. 모든 코드는 이를 따라야 합니다.**
