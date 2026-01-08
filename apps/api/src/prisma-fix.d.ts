// apps/api/src/prisma-fix.d.ts
import * as PrismaClientNamespace from '.prisma/client'

declare module '@prisma/client' {
  // TypeScript가 @prisma/client를 찾을 때
  // 실제 모델 정보가 있는 .prisma/client의 모든 것을 내보내도록 연결합니다.
  export * from '.prisma/client'
  export { PrismaClient } from '.prisma/client/index'
}
