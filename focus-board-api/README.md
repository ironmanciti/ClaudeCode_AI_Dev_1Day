# Focus Board

하루에 집중할 할 일(Task)을 중요도와 함께 관리하고 진행률을 확인하는 웹 앱입니다.
브라우저 화면(`public/index.html`)과 그 화면이 사용하는 REST API(`/api/tasks`)로 구성됩니다.

- 할 일 추가 (중요도 HIGH / MEDIUM / LOW, 기본값 MEDIUM)
- 완료 체크, 삭제, `done` 필터 조회
- 진행률 `{ total, done, percent }` 표시
- SQLite에 저장되어 새로고침·서버 재시작 후에도 데이터 유지

상세 요구사항은 [`spec.md`](./spec.md)를 참고하세요.

## 기술 스택

| 구분 | 사용 기술 (package.json 기준 버전) |
|---|---|
| 런타임 / 언어 | Node.js 24 / TypeScript 7.0 (`tsx`로 직접 실행, 별도 빌드 없음) |
| 웹 프레임워크 | Express 5.3 |
| ORM / DB | Prisma 7.10 + SQLite (`@prisma/adapter-better-sqlite3`) |
| 입력 검증 | zod 4.6 |
| 환경변수 | dotenv |
| 테스트 | Vitest 5.1 + supertest |
| 화면 | 외부 라이브러리 없는 HTML·CSS·JS 단일 파일 |

## 설치·실행 순서

```bash
# 1) 패키지 설치 (postinstall 스크립트가 prisma generate를 자동 실행)
npm install

# 2) 환경변수 파일 만들기
cp .env.example .env

# 3) DB 생성 + 마이그레이션 적용 (dev.db 생성)
npm run db:migrate

# 4) 개발 서버 실행 (파일 변경 시 자동 재시작)
npm run dev
# → 서버 실행 중: http://localhost:3000
```

> SQLite 경로 `file:./dev.db`는 실행 위치 기준 상대 경로입니다. 명령은 항상 **프로젝트 루트**에서 실행하세요.

### npm 스크립트

| 명령 | 실제 실행 내용 | 설명 |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | 개발 서버 (자동 재시작) |
| `npm start` | `tsx src/server.ts` | 서버 실행 (자동 재시작 없음) |
| `npm test` | `vitest run` | 전체 테스트 실행 |
| `npm run typecheck` | `tsc --noEmit` | 타입 검사 |
| `npm run db:migrate` | `prisma migrate dev` | 마이그레이션 생성·적용 |
| `npm run db:generate` | `prisma generate` | Prisma Client 재생성 (`src/generated/prisma`) |

## 환경변수

`.env.example`을 복사해 `.env`로 사용합니다. `.env`는 Git에 커밋되지 않습니다.

| 이름 | 필수 | 기본값 / 예시 | 설명 | 사용 위치 |
|---|---|---|---|---|
| `DATABASE_URL` | 필수 | `file:./dev.db` | SQLite DB 파일 경로. 없으면 서버 시작 시 오류 | `src/db.ts`, `prisma.config.ts` |
| `PORT` | 선택 | `3000` | 서버 포트. 없으면 3000 | `src/server.ts` |

- 이미 설정된 환경변수는 `.env` 값으로 덮어쓰지 않습니다. 예를 들어 `PORT=3100 npm start`처럼 일시적으로 바꿔 실행할 수 있습니다.
- 테스트는 `.env`와 관계없이 항상 `file:./test.db`를 사용합니다. 테스트 설정은 `vitest.config.ts`에 있습니다.

## 브라우저 화면

서버를 실행한 뒤 브라우저에서 **http://localhost:3000** 에 접속합니다.
Express가 `public/index.html`을 정적 파일로 제공하며, 화면은 아래 API만 `fetch`로 호출합니다.

- 할 일 입력 + 중요도 선택 후 **추가**. 빈 제목이면 API의 400 메시지를 화면에 표시
- 체크박스로 완료 처리(취소선), 삭제 버튼
- "완료 x / y"와 진행률 바. 추가·완료·삭제 직후 갱신
- 모든 할 일을 완료하면 축하 메시지

## API

기본 주소: `http://localhost:3000`

| 메서드 | 경로 | 설명 | 성공 | 실패 |
|---|---|---|---|---|
| GET | `/health` | 서버 상태 확인 | 200 `{ "status": "ok" }` | - |
| GET | `/api/tasks` | 목록 조회 (`?done=true\|false`), id 오름차순 | 200 배열 | 400 잘못된 필터 |
| GET | `/api/tasks/stats` | 진행률 `{ total, done, percent }` | 200 | - |
| GET | `/api/tasks/:id` | 단건 조회 | 200 | 400 잘못된 id, 404 |
| POST | `/api/tasks` | 생성 `{ title, priority? }` | 201 + `Location` 헤더 | 400 |
| PATCH | `/api/tasks/:id` | 수정 `{ title?, priority?, done? }` (1개 이상) | 200 | 400, 404 |
| DELETE | `/api/tasks/:id` | 삭제 | 204 (본문 없음) | 400 잘못된 id, 404 |

**검증 규칙** (`src/schemas/task.ts`)
- `title`: 문자열, 앞뒤 공백 제거 후 1~100자
- `priority`: `HIGH` | `MEDIUM` | `LOW` (생략 시 `MEDIUM`)
- `done`: boolean (`"yes"` 같은 문자열은 400)
- `:id`: 양의 정수
- `percent` = `round(done / total × 100)`, 할 일이 0개면 0

### curl 예시

```bash
# 생성 → 201, Location: /api/tasks/1
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write README","priority":"HIGH"}'
# {"id":1,"title":"Write README","priority":"HIGH","done":false,"createdAt":"...","updatedAt":"..."}

# 목록 / 완료된 것만 / 미완료만
curl http://localhost:3000/api/tasks
curl "http://localhost:3000/api/tasks?done=true"
curl "http://localhost:3000/api/tasks?done=false"

# 단건 조회
curl http://localhost:3000/api/tasks/1

# 완료 처리 → 200
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

# 진행률
curl http://localhost:3000/api/tasks/stats
# {"total":1,"done":1,"percent":100}

# 삭제 → 204
curl -i -X DELETE http://localhost:3000/api/tasks/1
```

> **Windows에서 한글 제목 보내기**
> Windows의 Git Bash·PowerShell에서 `-d '{"title":"운동하기"}'`처럼 명령 인자에 한글을 직접 넣으면 UTF-8로 전송되지 않아 제목이 깨져 저장됩니다. 서버 문제는 아닙니다.
> UTF-8로 저장한 JSON 파일을 보내세요. PowerShell에서는 `curl` 대신 `curl.exe`를 사용합니다.
>
> ```bash
> curl -X POST http://localhost:3000/api/tasks \
>   -H "Content-Type: application/json" \
>   --data-binary @task.json   # task.json 내용: {"title":"운동하기","priority":"LOW"}
> ```

### 오류 응답

모든 오류는 같은 형식으로 응답합니다 (`src/errors.ts`).

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "title은 비어 있을 수 없습니다.", "details": [{ "path": "title", "message": "title은 비어 있을 수 없습니다." }] } }
```

| code | status | 발생 상황 (예시) |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 빈 title, 101자 title, 잘못된 priority, 빈 PATCH 본문, `done` 타입 오류, `/api/tasks/abc`, `?done=maybe` |
| `INVALID_JSON` | 400 | 깨진 JSON 본문 (예: `{"title":`) |
| `NOT_FOUND` | 404 | 없는 id (`/api/tasks/9999`), 등록되지 않은 경로 |
| `INTERNAL_ERROR` | 500 | 예상하지 못한 서버 오류 |

## 테스트

```bash
npm test
```

- 테스트 전용 DB `test.db`를 사용하므로 개발 데이터(`dev.db`)에는 영향이 없습니다.
  - `tests/global-setup.ts`: 테스트 시작 전 `test.db`에 마이그레이션을 적용합니다 (`prisma migrate deploy`).
  - `tests/setup.ts`: `DATABASE_URL`이 `file:./test.db`가 아니면 테스트를 중단합니다.
- 각 테스트 전에 Task 테이블을 비웁니다. 테스트 파일은 병렬로 실행하지 않습니다 (`fileParallelism: false`).
- 테스트 구성 (총 27개)
  - `tests/health.test.ts`: `/health`, 없는 경로 404
  - `tests/tasks.test.ts`: 정상(N1~N5), 경계값(B1~B5), 실패(F1~F5) 케이스. 케이스 정의는 `spec.md` 5장 참고

## 폴더 구조

```
focus-board-api/
├── public/
│   └── index.html            # 브라우저 화면 (HTML + <style> + <script> 한 파일)
├── src/
│   ├── server.ts             # 진입점: .env 로드 후 PORT로 listen
│   ├── env.ts                # dotenv로 .env 로드
│   ├── app.ts                # Express 앱 생성 (JSON 파싱, 정적 파일, 라우터, 오류 처리)
│   ├── db.ts                 # PrismaClient (better-sqlite3 어댑터)
│   ├── errors.ts             # HttpError, 404 핸들러, 공통 오류 응답
│   ├── routes/
│   │   └── tasks.ts          # /api/tasks 라우터
│   ├── schemas/
│   │   └── task.ts           # zod 검증 스키마
│   └── generated/prisma/     # Prisma Client 생성 결과 (Git 제외, 자동 생성)
├── prisma/
│   ├── schema.prisma         # Task 모델, Priority enum
│   └── migrations/           # 마이그레이션 SQL
├── tests/
│   ├── global-setup.ts       # test.db 마이그레이션
│   ├── setup.ts              # 테스트 DB 확인
│   ├── health.test.ts
│   └── tasks.test.ts
├── prisma.config.ts          # Prisma 설정 (스키마·마이그레이션 경로, DATABASE_URL)
├── vitest.config.ts          # 테스트 설정 (test.db 사용)
├── tsconfig.json
├── .env.example              # 환경변수 예시
├── spec.md                   # 프로젝트 스펙
└── package.json
```

`dev.db`, `test.db`, `.env`, `node_modules/`, `src/generated/`는 `.gitignore`에 등록되어 있습니다.
