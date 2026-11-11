import { execSync } from "node:child_process";

// vitest의 test.env는 globalSetup(메인 프로세스)에는 적용되지 않으므로 DB 주소를 직접 넘긴다.
// prisma.config.ts의 dotenv는 기존 환경변수를 덮어쓰지 않으므로 .env의 dev.db보다 이 값이 우선한다.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
