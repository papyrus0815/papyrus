/**
 * 사건 상세의 인라인 편집 키트는 shared/ui/inline-edit로 승격됨.
 * 기존 import 경로(`./inline` / `./components/inline`)를 보존하기 위한 re-export shim.
 * 새 사용처는 `@/shared/ui/inline-edit`에서 직접 가져올 것.
 */
export * from '@/shared/ui/inline-edit'
