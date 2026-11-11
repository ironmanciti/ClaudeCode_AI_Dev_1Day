import express, { type Express } from "express";

// Express 앱을 생성한다. listen은 하지 않으므로 테스트(supertest)에서도 그대로 사용할 수 있다.
export function createApp(): Express {
  const app = express();

  // JSON 요청 본문 파싱
  app.use(express.json());

  // 서버 상태 확인용 엔드포인트
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}
