// ESLint v9 Flat Config (ESM)
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import nxPlugin from '@nx/eslint-plugin'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.nx/**',
      'node_modules',
      'test-output/**',
      'tmp/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@nx': nxPlugin,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^react-hot-toast', '@api', '@api/*'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
      // TypeScript 관련 규칙
      '@typescript-eslint/no-explicit-any': 'error',
      // 한 글자 변수명 금지 (i, j, _, id, fs, db, z는 예외)
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Identifier[name=/^(?!i$|j$|_$|id$|fs$|db$|z$|e$|x$|y$|t$|S$|p$|a$|T$).$/]',
          message: '한 글자 변수명은 금지합니다. 의미 있는 이름을 사용하세요.',
        },
      ],
    },
  },
]
