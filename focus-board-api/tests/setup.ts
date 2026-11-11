// 각 테스트 파일보다 먼저 실행된다.
// 테스트는 데이터를 지우므로, 테스트 DB(test.db)가 아니면 즉시 중단해 개발 DB(dev.db)를 보호한다.
const url = process.env.DATABASE_URL;

if (url !== "file:./test.db") {
  throw new Error(`테스트는 test.db에서만 실행할 수 있습니다. 현재 DATABASE_URL: ${url ?? "(없음)"}`);
}
