# 국가 상세 URL 구조 점검

## 현재 URL 목록

| pathKeys | 생성 URL 예시 | 라우트 path | 탭/뷰 |
|----------|----------------|-------------|--------|
| `countryDetail(id)` | `/history/country/kr/` | `:countryId` | 국가 상세 기본(첫 탭) |
| `countryDashboard(id)` | `.../kr/dashboard` | `:countryId/dashboard` | 대시보드 |
| `countryPersons(id)` | `.../kr/persons` | `:countryId/persons` | 인물 탭 (기본: 통계) |
| `countryPersons(id, 'stats')` | `.../kr/persons?tab=stats` | (동일) | 인물 → 통계·최근 인물 |
| `countryPersons(id, 'list')` | `.../kr/persons?tab=list` | (동일) | 인물 → 인물 리스트 |
| `countryPersons(id, 'heads')` | `.../kr/persons?tab=heads` | (동일) | 인물 → 역대 수반 |
| `countryHeadsOfState(id)` | `.../kr/heads-of-state` | `:countryId/heads-of-state` | 역대 수반 (하위 호환) |
| `countryHistorical(id)` | `.../kr/historical` | `:countryId/historical` | 역사적 국가 |
| `countryRegions(id)` | `.../kr/regions` | `:countryId/regions` | 행정구역 |
| `countryGovernment(id)` | `.../kr/government` | `:countryId/government` | 행정조직 |

---

## ✅ 맞는 부분

1. **라우트 순서**  
   세그먼트가 고정인 경로(`dashboard`, `person`, `persons` 등)가 모두 **`:countryId` 보다 앞**에 정의되어 있어,  
   `dashboard` 같은 값이 `countryId`로 잡히지 않음.

2. **인물 탭 단일 경로 + 쿼리**  
   - `.../persons` 하나만 사용하고, 하위 뷰는 `?tab=stats|list|heads`로 구분.  
   - `/person` 경로 제거로 단수/복수 혼동 없음.

3. **URL 판별 정규식**  
   `isPersonTabUrl`, `isPersonsListUrl` 등이 모두  
   `/\/history\/country\/[^/]+\/(segment)\/?$/` 형태로 **마지막 세그먼트**만 검사해,  
   `person` / `persons` / `historical` / `regions` / `government` / `dashboard`가 서로 섞이지 않음.

4. **일관된 리소스 경로**  
   `history/country/:countryId/...` 아래에 하위 탭이 나열된 구조로,  
   REST 스타일과 계층 구조가 맞음.

---

## ⚠️ 개선 권장 (선택)

### 1. trailing slash 통일

- **현재**  
  - `countryDetail` → `.../kr/` (slash 있음)  
  - `countryHeadsOfState` → `.../heads-of-state/` (slash 있음)  
  - 나머지(`dashboard`, `person`, `persons` 등) → slash 없음  
- **권장**  
  - 전부 **slash 없음**으로 통일하거나,  
  - 전부 **slash 있음**으로 통일해 리다이렉트 한 번만 두는 쪽이 유지보수에 유리함.  
  (React Router는 보통 둘 다 같은 route로 처리하지만, 공유/북마크 시 일관된 URL이 좋음.)

### 2. pathKeys와 라우트 path 일치

- 라우트는 모두 **slash 없음** (`dashboard`, `person`, `persons` 등).  
- `pathKeys`만 `countryDetail`, `countryHeadsOfState`에서 끝에 `/`를 붙이고 있음.  
- 나머지와 맞추려면 pathKeys에서도 끝 `/` 제거를 고려할 수 있음.

---

## 결론

- **현재 URL 구조는 논리적으로 맞고**, 라우트 순서·person/persons 구분·판별 로직 모두 문제 없음.  
- **선택 사항**으로, trailing slash와 pathKeys 표기만 통일하면 더 일관된 구조가 됨.
