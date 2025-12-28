import { AxiosError } from 'axios'

/**
 * 서버로부터 받은 다양한 형태의 에러 객체에서
 * 사용자에게 보여줄 메시지 목록을 추출하는 유틸리티 함수.
 * @param error - Axios 또는 react-query의 mutation에서 발생한 에러 객체 (타입은 any로 유연하게 받음)
 * @returns {string[]} - UI에 표시할 에러 메시지 문자열 배열
 */
export function getMutationErrorMessages(error: any): string[] {
  // 1. 에러 객체가 없는 경우, 빈 배열 반환
  if (!error) {
    return []
  }

  // 2. 서버에서 보낸 유효성 검사 에러 처리 (가장 흔한 케이스)
  // e.g. { errors: { email: ["is invalid"], password: ["is too short"] } }
  const apiErrors = error?.response?.data?.errors
  if (typeof apiErrors === 'object' && apiErrors !== null) {
    return Object.entries(apiErrors)
      .map(
        ([key, value]) =>
          `${key} ${Array.isArray(value) ? value.join(', ') : value}`
      )
      .flat()
  }

  // 3. 서버에서 보낸 일반 에러 메시지 처리
  // e.g. { error: "Invalid credentials" }
  const errorMessage = error?.response?.data?.error
  if (typeof errorMessage === 'string') {
    return [errorMessage]
  }

  // 4. Axios의 기본 에러 메시지 처리 (e.g. "Network Error")
  if (error instanceof AxiosError || error instanceof Error) {
    if (error.message) return [error.message]
  }

  // 5. 위 모든 경우에 해당하지 않을 때, 기본 에러 메시지 반환
  return ['An unexpected error occurred. Please try again.']
}
