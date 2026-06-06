import type { Config } from 'jest'

const config: Config = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/apps/api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/src/**/*.spec.ts'],
}

export default config
