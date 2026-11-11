# Focus Board

Express 5 + Prisma 7(SQLite) + TypeScript로 만드는 할 일 웹 앱(화면 + REST API). 상세 요구사항은 @spec.md 참고.

## 공통 규칙
- 주석과 메시지는 한글로 작성한다

세부 규칙은 `.claude/rules/`에 주제별로 나뉘어 있다:
- `api.md` — zod 검증, 오류 응답 형식 (`src/**/*.ts` 작업 시 로드)
- `frontend.md` — 화면 작성 규칙 (`public/**` 작업 시 로드)
- `testing.md` — 테스트 계획 수립, 완료 기준 (항상 로드)
- `safety.md` — `.env`, 패키지 설치, DB 초기화 주의사항 (항상 로드)
