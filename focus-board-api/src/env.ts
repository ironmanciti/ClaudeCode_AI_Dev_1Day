// .env 파일을 process.env로 불러온다.
// 다른 모듈보다 먼저 import 해야 DATABASE_URL 등을 읽을 수 있다.
import { config } from "dotenv";

config({ quiet: true });
