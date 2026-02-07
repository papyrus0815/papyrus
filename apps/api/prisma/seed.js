"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const node_util_1 = require("node:util");
const path = __importStar(require("path"));
const prisma_service_1 = require("./prisma.service");
const seeds_1 = require("./seeds");
const options = {
    environment: { type: 'string' },
};
async function main() {
    const { values: { environment }, } = (0, node_util_1.parseArgs)({ options });
    const env = environment;
    const envFileName = `env.${env}`;
    const envPath = path.resolve(process.cwd(), envFileName);
    // 로드 결과 확인을 위한 변수 할당
    const result = dotenv.config({ path: envPath });
    console.log(`🌱 Seed 환경: ${env}`);
    console.log(`📂 로드된 설정 파일: ${envFileName}`);
    if (result.error) {
        console.error('❌ 환경 변수 로드 중 에러 발생:', result.error);
    }
    const prisma = new prisma_service_1.PrismaService({ useAdapter: true });
    try {
        console.log(`\n🚀 ${env} 환경 시딩 시작...\n`);
        console.log('='.repeat(60));
        switch (env) {
            case 'development':
                // 1. 대륙 시딩
                const continentMap = await (0, seeds_1.seedContinents)(prisma);
                // 2. 국가 시딩
                await (0, seeds_1.seedCountries)(prisma, continentMap);
                // 3. 역사적 국가 시딩
                await (0, seeds_1.seedHistoricalCountries)(prisma);
                // 4. 이벤트 카테고리 시딩
                await (0, seeds_1.seedEventCategories)(prisma);
                // 5. 어드민 계정 시딩
                await (0, seeds_1.seedAdmin)(prisma);
                console.log('='.repeat(60));
                console.log('🎉 모든 시딩 작업이 완료되었습니다!');
                break;
            case 'production':
                // 프로덕션 환경에서는 필수 데이터만 시딩
                console.log('⚠️  프로덕션 환경에서는 최소한의 데이터만 시딩합니다.');
                await (0, seeds_1.seedContinents)(prisma);
                await (0, seeds_1.seedEventCategories)(prisma);
                await (0, seeds_1.seedAdmin)(prisma);
                break;
            case 'test':
                // 테스트 환경 시딩 로직 (필요시 추가)
                console.log('🧪 테스트 환경 시딩');
                break;
            default:
                console.log(`⚠️  알 수 없는 환경: ${env}`);
                break;
        }
    }
    catch (error) {
        console.error('❌ 시딩 중 오류 발생:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
        console.log('\n✅ 데이터베이스 연결 해제 완료');
    }
}
main()
    .then(() => {
    console.log('\n✨ 시딩이 성공적으로 완료되었습니다! ✨\n');
})
    .catch((error) => {
    console.error('\n❌ 시딩 실행 중 오류가 발생했습니다:', error);
    process.exit(1);
});
