export function cryptoId() {
  try {
    return Math.random().toString(36).slice(2, 10)
  } catch {
    return Date.now().toString(36)
  }
}

export function stringOrUndefined(
  value: FormDataEntryValue | null,
): string | undefined {
  const stringValue = String(value ?? '').trim()
  return stringValue ? stringValue : undefined
}

export function numberOrUndefined(
  value: FormDataEntryValue | null,
): number | undefined {
  const stringValue = String(value ?? '').trim()
  if (!stringValue) return undefined
  const parsed = Number(stringValue)
  return Number.isFinite(parsed) ? parsed : undefined
}
