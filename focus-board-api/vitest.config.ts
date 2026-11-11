import { defineConfig } from "vitest/config";

// 테스트 전용 DB (개발 DB dev.db와 분리)
const TEST_DATABASE_URL = "file:./test.db";

export default defineConfig({
  test: {
    // 테스트 워커 프로세스에 적용되는 환경변수
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // 테스트 시작 전 test.db에 마이그레이션 적용
    globalSetup: ["./tests/global-setup.ts"],
    // 각 테스트 파일보다 먼저 실행: 테스트 DB가 아니면 중단
    setupFiles: ["./tests/setup.ts"],
    // 같은 DB 파일을 공유하므로 파일 단위 병렬 실행을 끈다
    fileParallelism: false,
  },
});
