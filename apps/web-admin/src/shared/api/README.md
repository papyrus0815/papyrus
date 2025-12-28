# API 모듈

Nestia SDK를 사용한 타입 안전한 API 통신 레이어

## 📁 구조

```
shared/api/
├── client.ts           # API 연결 설정
├── countries.ts        # 국가 API 함수
├── continents.ts       # 대륙 API 함수
└── index.ts           # 통합 export
```

## 🚀 사용 방법

### 1️⃣ React Query 훅 사용 (권장)

```tsx
import { useCountries, useCreateCountry } from '@/features/country/api'

function CountryList() {
  // 데이터 조회
  const { data: countries, isLoading, error } = useCountries()

  // 데이터 생성
  const createMutation = useCreateCountry()

  const handleCreate = () => {
    createMutation.mutate({
      name: '대한민국',
      capital: '서울',
      continentId: 'asia-id',
    })
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{/* ... */}</div>
}
```

### 2️⃣ 직접 API 호출

```tsx
import * as countriesApi from '@/shared/api/countries'

// 모든 국가 조회
const countries = await countriesApi.getAllCountries()

// 국가 생성
const newCountry = await countriesApi.createCountry({
  name: '대한민국',
  capital: '서울',
})

// 국가 수정
await countriesApi.updateCountry('country-id', {
  name: '한국',
})

// 국가 삭제
await countriesApi.deleteCountry('country-id')
```

## ✨ 특징

### 타입 안전성

- ✅ TypeScript 완전 지원
- ✅ 컴파일 타임 타입 체크
- ✅ 자동 완성 지원
- ✅ 런타임 유효성 검증 (Typia)

### 에러 처리

- ✅ 자동 에러 로깅
- ✅ 일관된 에러 처리
- ✅ 타입 안전한 에러 객체

### 성능 최적화

- ✅ React Query 캐싱
- ✅ Stale time 설정
- ✅ 자동 리페치
- ✅ Optimistic Updates 지원

## 📦 API 목록

### Countries (국가)

- `getAllCountries()` - 모든 국가 조회
- `getCountryById(id)` - 국가 상세 조회
- `createCountry(data)` - 국가 생성
- `updateCountry(id, data)` - 국가 수정
- `deleteCountry(id)` - 국가 삭제

### Continents (대륙)

- `getAllContinents()` - 모든 대륙 조회
- `getContinentById(id)` - 대륙 상세 조회
- `createContinent(data)` - 대륙 생성
- `updateContinent(id, data)` - 대륙 수정
- `deleteContinent(id)` - 대륙 삭제

## 🔧 환경 설정

`.env` 파일에서 API URL 설정:

```env
VITE_API_URL=http://localhost:8000
```

## 🔄 SDK 업데이트

API가 변경될 때마다 SDK를 재생성하세요:

```bash
# Service Manager GUI에서 "🔨 SDK 빌드" 버튼 클릭
# 또는 터미널에서:
npm run build:nestia
```

## 💡 Best Practices

1. **항상 React Query 훅 사용**
   - 캐싱, 리페치, 에러 처리 자동화
   - UI 상태 관리 간소화

2. **에러 처리**

   ```tsx
   const { data, error, isError } = useCountries()

   if (isError) {
     return <ErrorMessage error={error} />
   }
   ```

3. **낙관적 업데이트**

   ```tsx
   const updateMutation = useUpdateCountry()

   updateMutation.mutate(
     { id, data },
     {
       onSuccess: () => toast.success('수정 완료!'),
       onError: (error) => toast.error(error.message),
     },
   )
   ```

4. **로딩 상태**

   ```tsx
   const { isLoading, isFetching } = useCountries()

   return (
     <>
       {isLoading && <Spinner />}
       {isFetching && <RefreshIndicator />}
       {/* content */}
     </>
   )
   ```
