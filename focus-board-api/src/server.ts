import { createApp } from "./app.js";

// 포트는 환경변수 PORT를 따르고, 없으면 3000을 사용한다
const port = Number(process.env.PORT ?? 3000);

const app = createApp();

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
