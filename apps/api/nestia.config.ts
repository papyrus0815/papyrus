const config = {
  // This config is resolved with CWD = apps/api
  input: {
    // 컨트롤러 파일만 스캔한다. nestia의 ConfigAnalyzer는 input에 매칭된 모든 파일의
    // 모든 export에 대해 Reflect.getMetadata("path", export)를 호출하는데, reflect-metadata는
    // export 값이 원시값(string/number/undefined 등)이면 예외를 던진다.
    // DTO 파일( presentation/**/*.ts )은 원시 상수를 export 하는 경우가 있어 제너레이터가 크래시했다.
    // DTO '타입'은 input 글롭이 아니라 tsconfig 프로그램(type-checker)으로 해석되므로,
    // 컨트롤러만 스캔해도 SDK 산출물은 동일하다. (모든 @Controller는 *.controller.ts에 있음 — 검증됨)
    include: ['src/**/*.controller.ts'],
  },
  output: 'src/api',
  swagger: {
    output: 'swagger.json',
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

module.exports = config
