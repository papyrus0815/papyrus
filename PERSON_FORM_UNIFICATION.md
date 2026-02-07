# ✨ 인물 등록/수정 폼 통합 완료

## 🎯 개선 내용

### Before (기존)

```
person-create.page.tsx - 등록 전용 (10,000+ 줄)
person-edit.page.tsx - 수정 전용 (2,700+ 줄)
→ 중복 코드, 유지보수 어려움
```

### After (개선)

```
person-create.page.tsx - 등록/수정 겸용
→ URL에 :id가 있으면 수정 모드
→ 없으면 등록 모드
```

## 🚀 동작 방식

### 등록 모드

```
URL: /persons/create
동작:
1. 빈 폼 표시
2. 데이터 입력
3. personApi.create() 호출
4. 경력 정보 저장
```

### 수정 모드

```
URL: /persons/:id/edit
동작:
1. 기존 데이터 로드
2. 폼에 채우기
3. 수정
4. personApi.update() 호출
5. 경력은 스킵 (별도 관리)
```

## 📝 주요 변경사항

### 1. 컴포넌트

- ✅ `useParams`로 ID 감지
- ✅ `isEditMode = !!id` 플래그
- ✅ 수정 모드일 때 데이터 로드
- ✅ 타이틀 동적 변경

### 2. 라우트

```typescript
{
  path: 'create',
  element: <PersonCreatePage />,
},
{
  path: ':id/edit',
  element: <PersonCreatePage />, // 같은 컴포넌트!
},
```

### 3. 버튼 라벨

- 등록 모드: "등록" / "등록 중..."
- 수정 모드: "수정" / "수정 중..."

### 4. 임시 저장

- 등록 모드: 임시 저장 버튼 표시
- 수정 모드: 임시 저장 버튼 숨김

## ✅ 장점

1. **코드 중복 제거**
   - 10,000줄 + 2,700줄 → 10,000줄
   - 한 곳만 수정하면 등록/수정 모두 반영

2. **일관된 UX**
   - 같은 UI/UX
   - 같은 간편 입력 모드
   - 같은 왕/군주 칭호 섹션

3. **유지보수 용이**
   - 버그 수정 한 번만
   - 기능 추가 한 번만

## 🗑️ Deprecated Files

- ✅ `person-edit.page.tsx.deprecated` (기존 수정 페이지)
- ✅ `person-edit.page.tsx.backup` (기존 백업)

더 이상 사용하지 않으며, 필요 시 삭제 가능합니다.
