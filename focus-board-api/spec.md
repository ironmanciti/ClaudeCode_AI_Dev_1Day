# Focus Board — 프로젝트 스펙

## 1. 개요
하루에 집중할 할 일(Task)을 중요도와 함께 관리하고 진행률을 확인하는 웹 앱. 브라우저 화면(6장)과 그 화면이 쓰는 REST API(4장)로 구성한다.
(Part 1 실습 앱 "Daily Focus Board"를 TypeScript로 구현)

## 2. 기술 스택
| 구분 | 선택 |
|---|---|
| 런타임 / 언어 | Node.js 24 / TypeScript |
| 웹 프레임워크 | Express 5 |
| ORM / DB | Prisma 7 / SQLite (`@prisma/adapter-better-sqlite3`) |
| 입력 검증 | zod 4 |
| 테스트 | Vitest + supertest |

## 3. 데이터 모델 (Task)
| 필드 | 타입 | 규칙 |
|---|---|---|
| id | Int | 자동 증가, PK |
| title | String | 필수, 앞뒤 공백 제거 후 1~100자 |
| priority | HIGH / MEDIUM / LOW | 기본값 MEDIUM |
| done | Boolean | 기본값 false |
| createdAt / updatedAt | DateTime | 자동 기록 |

## 4. API 계약
| 메서드 | 경로 | 설명 | 성공 | 실패 |
|---|---|---|---|---|
| GET | /api/tasks | 목록 (`?done=true\|false`) | 200 배열 | 400 잘못된 필터 |
| GET | /api/tasks/stats | 진행률 `{ total, done, percent }` | 200 | - |
| GET | /api/tasks/:id | 단건 조회 | 200 | 400 잘못된 id, 404 |
| POST | /api/tasks | 생성 `{ title, priority? }` | 201 + Location | 400 |
| PATCH | /api/tasks/:id | 수정 `{ title?, priority?, done? }` (1개 이상) | 200 | 400, 404 |
| DELETE | /api/tasks/:id | 삭제 | 204 | 400 잘못된 id, 404 |

오류 응답 형식: `{ "error": { "code": "VALIDATION_ERROR | NOT_FOUND | INVALID_JSON | INTERNAL_ERROR", "message": "...", "details"?: [...] } }`

- 예상하지 못한 서버 오류는 500 `INTERNAL_ERROR` 로 응답한다

- percent = round(done / total × 100), 할 일이 0개면 0

## 5. 테스트 계획 (`tests/tasks.test.ts`)
전제: 각 테스트 전에 Task 테이블을 비워(`beforeEach`) 테스트끼리 데이터가 섞이지 않게 한다.

### 5-1. 정상 케이스
| ID | 테스트 이름 | 입력 | 기대 응답 (status, body) |
|---|---|---|---|
| N1 | 할 일을 생성하고 단건 조회한다 | `POST /api/tasks` `{ "title": "운동하기", "priority": "HIGH" }` → `Location` 경로로 `GET` | 201, `Location: /api/tasks/{id}`, `{ id, title: "운동하기", priority: "HIGH", done: false, createdAt, updatedAt }` / 단건 조회 200, 생성 응답과 동일 |
| N2 | 목록을 조회하고 done으로 필터링한다 | 3개 생성 후 1개 완료 → `GET /api/tasks`, `?done=true`, `?done=false` | 200, 배열 길이 3 / 1 (모두 `done: true`) / 2 (모두 `done: false`) |
| N3 | 할 일을 완료 처리한다 | `PATCH /api/tasks/{id}` `{ "done": true }` → 다시 `GET` | 200, `done: true`, title·priority는 그대로 / 재조회에서도 `done: true` 유지 |
| N4 | 할 일을 삭제한다 | `DELETE /api/tasks/{id}` → 다시 `GET` | 204, body 없음 / 재조회 404 `NOT_FOUND` |
| N5 | 진행률을 계산한다 | 3개 생성 후 1개 완료 → `GET /api/tasks/stats` | 200, `{ total: 3, done: 1, percent: 33 }` |

### 5-2. 경계값 케이스
| ID | 테스트 이름 | 입력 | 기대 응답 (status, body) |
|---|---|---|---|
| B1 | title 100자는 허용한다 | `POST` `{ "title": "가" × 100 }` | 201, title 길이 100 |
| B2 | title 101자는 거부한다 | `POST` `{ "title": "가" × 101 }` | 400, `error.code: "VALIDATION_ERROR"`, `details` 포함 |
| B3 | priority를 생략하면 MEDIUM이 된다 | `POST` `{ "title": "책 읽기" }` | 201, `priority: "MEDIUM"`, `done: false` |
| B4 | title 앞뒤 공백을 제거한다 | `POST` `{ "title": "  운동하기  " }` | 201, `title: "운동하기"` |
| B5 | 할 일이 없을 때 빈 목록과 0%를 반환한다 | 데이터 없음 → `GET /api/tasks`, `GET /api/tasks/stats` | 200, `[]` / 200, `{ total: 0, done: 0, percent: 0 }` |

### 5-3. 실패 케이스
| ID | 테스트 이름 | 입력 | 기대 응답 (status, body) |
|---|---|---|---|
| F1 | 생성 본문이 잘못되면 400을 반환한다 | `POST` `{ "title": "" }` / `{}` (title 누락) / `{ "title": "   " }` / `{ "title": "운동", "priority": "URGENT" }` | 모두 400, `error.code: "VALIDATION_ERROR"`, `details` 포함 |
| F2 | 깨진 JSON은 400을 반환한다 | `POST` 원문 `{"title":` (`Content-Type: application/json`) | 400, `error.code: "INVALID_JSON"` |
| F3 | 수정 본문이 잘못되면 400을 반환한다 | `PATCH /api/tasks/{id}` `{}` (빈 본문) / `{ "done": "yes" }` (타입 오류) | 모두 400, `error.code: "VALIDATION_ERROR"`, 원본 데이터는 변경되지 않음 |
| F4 | 잘못된 id·필터는 400을 반환한다 | `GET`·`PATCH`·`DELETE /api/tasks/abc` / `GET /api/tasks?done=maybe` | 모두 400, `error.code: "VALIDATION_ERROR"` |
| F5 | 없는 리소스·경로는 404를 반환한다 | `GET`·`PATCH`·`DELETE /api/tasks/9999` / `GET /api/unknown` | 모두 404, `error.code: "NOT_FOUND"` |

통과 판정 명령: `npm test`

## 6. 화면 (`public/`)
`http://localhost:3000/` 에서 열리는 한 페이지 웹 화면. 외부 라이브러리 없이 HTML·CSS·JS로 만들고, Express가 정적 파일로 제공한다. 데이터는 4장 API만 `fetch`로 사용한다.

| 파일 | 역할 |
|---|---|
| `public/index.html` | 화면 구조 + `<style>`(카드형 디자인, 반응형) + `<script>`(API 호출, 화면 갱신)를 한 파일에 작성 |

화면 구성 (아이디어):
```
  Daily Focus Board
  오늘 가장 중요한 일은?
  ─────────────────────────────────
  할 일 [______________________]
  중요도 [MEDIUM ▼]       [ 추가 ]
  ─────────────────────────────────
  Today's Focus
  □ Claude Code 강의 준비      HIGH
  ☑ 예제 코드 검토 (취소선)  MEDIUM
  □ 운동하기                    LOW   [삭제]
  ─────────────────────────────────
  완료 1 / 3   ■■■■□□□□□□□□   33%
```

| 기능 | 요구사항 |
|---|---|
| 추가 | 할 일 입력 + 중요도 선택(기본 MEDIUM). 빈 제목이면 API의 400 메시지를 화면에 표시 |
| 목록 | 중요도 배지(HIGH/MEDIUM/LOW 색 구분), 완료 체크 시 취소선, 삭제 버튼 |
| 진행률 | `/api/tasks/stats` 로 "완료 x / y"와 진행률 바. 추가·완료·삭제 직후 바로 갱신 |
| 축하 | 할 일을 모두 완료하면 축하 메시지 |
| 디자인 | 카드형, hover 효과, 모바일 폭(375px)에서도 레이아웃 유지 |
| 저장 | 새로고침·서버 재시작 후에도 데이터 유지 (SQLite) |

확인 방법: `npm run dev` 후 브라우저에서 위 표를 사람이 직접 확인한다. 화면은 자동 테스트 대상이 아니다.
