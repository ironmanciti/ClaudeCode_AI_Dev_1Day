---
paths:
  - "src/**/*.ts"
---

# API 코딩 규칙
- 모든 요청 본문·파라미터는 zod 스키마로 검증한다
- 오류 응답은 `{ error: { code, message } }` 형식을 지킨다 (spec.md 4장)
