/**
 * DOM 조작 유틸리티
 */

/**
 * 안전하게 요소를 가져오기
 */
export function getElementById<T extends HTMLElement>(
  id: string,
): T | null {
  return document.getElementById(id) as T | null
}

/**
 * 안전하게 요소를 가져오기 (없으면 에러)
 */
export function requireElementById<T extends HTMLElement>(
  id: string,
  errorMessage?: string,
): T {
  const element = getElementById<T>(id)
  if (!element) {
    throw new Error(errorMessage || `Element with id "${id}" not found`)
  }
  return element
}

/**
 * HTML 이스케이프
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * 버튼 활성/비활성 설정
 */
export function setButtonDisabled(
  buttonId: string,
  disabled: boolean,
): void {
  const btn = getElementById<HTMLButtonElement>(buttonId)
  if (btn) {
    btn.disabled = disabled
  }
}

/**
 * 요소 표시/숨김 설정
 */
export function setElementDisplay(
  elementId: string,
  display: 'block' | 'flex' | 'none' | 'inline-block',
): void {
  const el = getElementById<HTMLElement>(elementId)
  if (el) {
    el.style.display = display
  }
}

/**
 * 요소의 텍스트 내용 설정
 */
export function setElementText(elementId: string, text: string): void {
  const el = getElementById<HTMLElement>(elementId)
  if (el) {
    el.textContent = text
  }
}

/**
 * 요소의 HTML 내용 설정
 */
export function setElementHTML(elementId: string, html: string): void {
  const el = getElementById<HTMLElement>(elementId)
  if (el) {
    el.innerHTML = html
  }
}

