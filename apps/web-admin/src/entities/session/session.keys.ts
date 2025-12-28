export const sessionKeys = {
  all: ['session'] as const,
  currentUser: () => [...sessionKeys.all, 'current-user'] as const,
}
