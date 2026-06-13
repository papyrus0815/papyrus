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
    // web-admin(node_modules/react@19.2.1)과 루트(@testing-library가 쓰는 react@19.2.4)
    // 두 복사본이 공존 → hook 컴포넌트 마운트 시 디스패처 불일치(useRef null).
    // react/react-dom을 루트 단일 복사본으로 강제해 통합 렌더 테스트가 가능하게 한다.
    '^react$': '<rootDir>/../../node_modules/react',
    '^react/(.*)$': '<rootDir>/../../node_modules/react/$1',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/../../node_modules/react-dom/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/src/**/*.spec.ts', '**/src/**/*.spec.tsx'],
}

export default config
