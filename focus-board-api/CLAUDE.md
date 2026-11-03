# Focus Board

Express 5 + Prisma 7(SQLite) + TypeScript로 만드는 할 일 웹 앱(화면 + REST API). 상세 요구사항은 @spec.md 참고.

## 코딩 규칙
- 모든 요청 본문·파라미터는 zod 스키마로 검증한다
- 오류 응답은 `{ error: { code, message } }` 형식을 지킨다 (spec.md 4장)
- 주석과 메시지는 한글로 작성한다
- 화면은 `public/` 에 HTML·CSS·JS로만 작성하고(외부 라이브러리 없이), 데이터는 spec.md 4장 API로만 다룬다

## 테스트 계획 수립
계획에는 반드시 "테스트 계획" 섹션을 포함할 것:
- 테스트 파일 경로와 테스트 이름 목록
- 정상 케이스 / 경계값 / 실패 케이스 구분
- 각 케이스의 입력과 기대 응답(status, body)
- 통과 판정 명령어: `npm test`

## 완료 기준
- 테스트 계획의 테스트를 모두 작성하고 `npm test`가 전체 통과해야 완료로 간주한다
- 실패 시 원인을 분석해 수정하고 재실행한다. 통과 전에는 완료로 보고하지 않는다

## 주의
- `.env`는 읽거나 커밋하지 않는다. 새 환경변수는 `.env.example`에 추가한다
- 패키지는 `npm install`로 설치하고, 설치 명령은 실행 전에 사용자 승인을 받는다 (package.json에 버전을 직접 쓰지 않는다)
- DB 초기화(`migrate reset`, `db push --force-reset`)는 실행 전에 반드시 사용자에게 확인한다
