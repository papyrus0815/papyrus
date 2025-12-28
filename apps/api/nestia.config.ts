const config = {
  // This config is resolved with CWD = apps/api
  input: {
    include: [
      'src/**/*.controller.ts',
      'src/libs/**/presentation/**/*.ts', // DTO 파일들도 포함
    ],
  },
  output: 'src/api',
  swagger: {
    output: 'src/api/swagger.json',
    info: {
      title: 'Papyrus API',
      version: '1.0.0',
    },
  },
  simulate: false,
  verbose: true,
  exclude: [
    'src/api/**',
    'src/modules/**',
    '**/health/**',
    'src/libs/shared/health/**',
  ],
}

export default config
