import express, { type Express } from "express";
import { fileURLToPath } from "node:url";
import { errorHandler, notFoundHandler } from "./errors.js";
import { tasksRouter } from "./routes/tasks.js";

// 화면 파일(public/) 위치
const publicDir = fileURLToPath(new URL("../public", import.meta.url));

// Express 앱을 생성한다. listen은 하지 않으므로 테스트(supertest)에서도 그대로 사용할 수 있다.
export function createApp(): Express {
  const app = express();

  // JSON 요청 본문 파싱
  app.use(express.json());

  // 화면(public/index.html) 정적 제공
  app.use(express.static(publicDir));

  // 서버 상태 확인용 엔드포인트
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // 할 일 API
  app.use("/api/tasks", tasksRouter);

  // 없는 경로 → 404, 그 밖의 오류 → 공통 오류 응답
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
