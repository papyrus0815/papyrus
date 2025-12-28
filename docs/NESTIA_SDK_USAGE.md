# Nestia SDK 사용 가이드

## 개요

**Nestia SDK**를 사용하여 서버와 클라이언트 간 타입을 자동으로 동기화하고 타입 안전한 API 호출을 구현했습니다.

## 장점

✅ **완전 자동화**: 서버 DTO → SDK 자동 생성  
✅ **타입 안전성**: 컴파일 타임 타입 검증  
✅ **런타임 검증**: typia로 런타임 타입 체크  
✅ **중복 제거**: 타입과 API 클라이언트 모두 자동 생성  
✅ **동기화**: 서버 변경 시 즉시 반영

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│ 서버 (NestJS)                                                │
├─────────────────────────────────────────────────────────────┤
│ apps/api/src/libs/event/dto/event.response.ts               │
│   export class EventResponseDto { ... }                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
                   Nestia 자동 생성
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Nestia SDK                                                  │
├─────────────────────────────────────────────────────────────┤
│ apps/api/src/api/functional/events/index.ts                │
│   export namespace events {                                 │
│     export function getAllEvents(conn): Promise<...>        │
│     export type Output = Primitive<EventResponseDto[]>      │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
                      Re-export
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ libs/api-sdk/src/index.ts                                   │
├─────────────────────────────────────────────────────────────┤
│ export * from './api/module'                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    클라이언트에서 사용
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 클라이언트 (React)                                           │
├─────────────────────────────────────────────────────────────┤
│ web-admin/src/shared/api/events.ts                          │
│   import { functional } from '@papyrus/api-sdk'           │
│   const api = functional                                    │
│   return api.events.getAllEvents(connection)                │
└─────────────────────────────────────────────────────────────┘
```

## 사용 방법

### 클라이언트 API 래퍼

```typescript
// web-admin/src/shared/api/events.ts
import { functional } from '@papyrus/api-sdk'
import type { IConnection } from '@nestia/fetcher'

const api = functional

// 타입은 SDK에서 자동 추론
export type EventResponseDto = Awaited<
  ReturnType<typeof api.events.getEventById>
>

const getConnection = (): IConnection => ({
  host: 'http://localhost:8000',
})

// SDK 함수를 래핑
export async function getAllEvents() {
  return api.events.getAllEvents(getConnection())
}
```

### 컴포넌트에서 사용

```typescript
import { getAllEvents } from '@/shared/api/events'
import type { EventResponseDto } from '@/shared/api/events'

function EventList() {
  const [events, setEvents] = useState<EventResponseDto[]>([])

  useEffect(() => {
    getAllEvents().then(setEvents)
  }, [])

  // 타입 안전하게 사용!
  return events.map(event => (
    <div key={event.id}>{event.title}</div>
  ))
}
```

## 서버 변경 시 워크플로우

1. **서버 DTO 수정**

   ```typescript
   // apps/api/src/libs/event/dto/event.response.ts
   export class EventResponseDto {
     // 새 필드 추가
     @ApiProperty()
     newField!: string
   }
   ```

2. **SDK 재생성**

   ```bash
   npm run build:sdk
   # 또는
   npx nestia sdk
   ```

3. **클라이언트 자동 감지**
   - TypeScript가 자동으로 타입 에러 표시
   - 컴파일 타임에 모든 문제 발견

## 현재 적용 상태

### ✅ SDK 사용 중

- `web-admin/src/shared/api/events.ts`
- `web-admin/src/shared/api/event-categories.ts`

### 설정 파일

- `tsconfig.base.json`: `@papyrus/api-sdk` 경로 설정
- `web-admin/tsconfig.json`: SDK import 경로 설정
- `web-admin/vite.config.ts`: Vite alias 설정

## 주의사항

- SDK 재생성 시 `apps/api/src/api/` 디렉토리 전체가 재생성됨
- 수동으로 SDK 파일을 수정하지 말 것
- 서버 DTO가 단일 진실 공급원(Single Source of Truth)

## 기타 API 마이그레이션

동일한 패턴으로 다른 API도 SDK로 전환 가능:

- Countries
- Persons
- Military Units
- 등등

```typescript
// web-admin/src/shared/api/countries.ts
import { functional } from '@papyrus/api-sdk'

const api = functional

export const getAllCountries = () =>
  api.countries.getAllCountries(getConnection())
```
