# 주의 (환경·패키지·DB)
- `.env`는 읽거나 커밋하지 않는다. 새 환경변수는 `.env.example`에 추가한다
- 패키지는 `npm install`로 설치하고, 설치 명령은 실행 전에 사용자 승인을 받는다 (package.json에 버전을 직접 쓰지 않는다)
- DB 초기화(`migrate reset`, `db push --force-reset`)는 실행 전에 반드시 사용자에게 확인한다
