// .env를 가장 먼저 불러와야 db.ts가 DATABASE_URL을 읽을 수 있다
import "./env.js";
import { createApp } from "./app.js";

// 포트는 환경변수 PORT를 따르고, 없으면 3000을 사용한다
const port = Number(process.env.PORT ?? 3000);

const app = createApp();

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
