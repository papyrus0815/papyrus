# Papyrus Mobile — Claude 작업 가이드

## 디자인 시스템

토큰은 `constants/theme.ts`에 정의. **새 컴포넌트는 무조건 토큰 사용** — 매직넘버·하드코딩 색상 금지.

| 카테고리 | 토큰 | 비고 |
|---|---|---|
| 색 | `useTokens()` 훅 (다크모드 반응) 또는 `Tokens` 정적 (라이트 고정·레거시) | 슬레이트 톤 |
| 라운드 | `Radius.{none, xs, sm, md, lg, xl, full}` | 버튼 sm·카드 md·검색바/아이콘 full |
| 간격 | `Spacing.{xxs, xs, sm, md, base, lg, xl, xxl, section}` | 4px 베이스 + 2px micro |
| 타이포 | `Type.{displayXl, displayLg, displayMd, displaySm, titleMd, titleSm, bodyMd, bodySm, ..., buttonMd, ...}` | 14단 스케일 |
| 폰트 | `FontFamily.{regular, medium, semibold, bold}` | Inter VF (`_layout.tsx`에서 로드) |
| 쉐도우 | `Elevation.card` | 단일 티어 |

### 컴포넌트 작성 패턴

다크모드 대응이 필요한 컴포넌트는 `useTokens()` + `useMemo(() => makeStyles(t), [t])` 패턴:

```ts
function MyCard() {
  const t = useTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  return <View style={styles.card}>...</View>
}
function makeStyles(t: TokenSet) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surface.raised,
      borderRadius: Radius.md,
      padding: Spacing.lg,
    },
  })
}
```

## 작업 규칙

- **라우팅**: 화면 이동은 `lib/routes.ts` 헬퍼만 (`router.push` 직접 호출 X)
- **데이터 fetch**: 새 fetch는 `useQuery({ queryKey: [...], queryFn })` 권장. 키 컨벤션: `['persons','list']`, `['persons','detail',id]` 등. mutation 후 `queryClient.setQueryData` 또는 `invalidateQueries`
- **에러 표시**: `errorMessage()` + `ListErrorView` (retry 포함) 또는 `EmptyState`
- **폼**: dirty 가드 (`usePreventRemove` from `@react-navigation/native`) — 저장 성공 시 baseline 갱신해 가드 우회
- **a11y**: 작은 터치 타겟에 `hitSlop`, 아이콘 버튼에 `accessibilityLabel`, primary CTA `minHeight: 48`
- **검색 디바운스**: `useDebouncedValue(query, SEARCH_DEBOUNCE_MS)`
- **햅틱**: 결정적 순간 (저장 success/error, 삭제 warning, long-press impact)
- **즐겨찾기·검색 history**: `useBookmarks(scope)`, `useSearchHistory(scope)` (AsyncStorage)

## SDK·API

루트 `CLAUDE.md`의 Prisma·SDK 가이드도 함께 적용됩니다.
