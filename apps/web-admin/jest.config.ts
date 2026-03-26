import type { Config } from 'jest'

const config: Config = {
  displayName: 'web',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/apps/web-admin',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/src/**/*.spec.ts', '**/src/**/*.spec.tsx'],
}

export default config
