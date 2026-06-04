# 조씨네 일정

가족 일정, 숙제 대기함, 여가시간 규칙, Admin 비밀번호 로그인을 포함한 일정 관리 프로토타입입니다.

## 실행

```bash
npm start
```

브라우저에서 `http://127.0.0.1:8123/`로 접속합니다.

## Admin

- 비밀번호: `admin1234`
- Admin 메뉴: 오늘 관리, 일정 템플릿, 숙제 관리, 휴일/설정

## Backend API

- `POST /api/admin/login`
- `GET /api/snapshot`
- `PUT /api/snapshot`
- `POST /api/snapshot/reset`

상세 계약은 `outputs/backend-api-contract.md`를 참고하세요.
