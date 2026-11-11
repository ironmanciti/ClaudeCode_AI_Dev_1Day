import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env를 만들어 주세요.");
}

// SQLite 상대 경로(file:./dev.db)는 실행 위치(cwd) 기준이므로 항상 프로젝트 루트에서 실행한다
export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url }),
});
