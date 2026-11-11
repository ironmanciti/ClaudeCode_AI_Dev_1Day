// Prisma 7은 .env를 자동으로 읽지 않으므로 직접 로드한다
// (이미 설정된 환경변수는 덮어쓰지 않으므로 테스트의 DATABASE_URL이 우선한다)
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
