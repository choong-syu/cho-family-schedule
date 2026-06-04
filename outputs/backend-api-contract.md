# 조씨네 일정 Backend API 준비안

현재 프론트엔드는 `ScheduleApi` 어댑터를 통해 데이터를 읽고 저장합니다. 지금 구현은 `localStorage` 어댑터이며, 실제 백엔드로 전환할 때는 `outputs/app.js`의 `ScheduleApi` 구현만 서버 호출로 교체하면 됩니다.

## Admin Login

- `POST /api/admin/login`
- Request
```json
{ "password": "admin1234" }
```
- Response
```json
{ "ok": true, "role": "admin", "sessionId": "..." }
```

## Schedule Snapshot

- `GET /api/snapshot`
- Response
```json
{
  "schedules": [],
  "placedHomeworkIds": [],
  "completedHomeworkIds": [],
  "family": {
    "children": [],
    "guardians": []
  },
  "holidays": []
}
```

- `PUT /api/snapshot`
- Request: `GET /api/snapshot`과 같은 형태
- Response
```json
{ "ok": true, "savedAt": "2026-06-05T00:00:00+09:00" }
```

## Reset Demo Data

- `POST /api/snapshot/reset`
- Response: 초기화된 snapshot

## Frontend Adapter Target

`outputs/app.js`의 현재 구조:

```js
const ScheduleApi = {
  adapter: "localStorage",
  loadSnapshot() {},
  saveSnapshot(snapshot) {},
  resetSnapshot() {}
};
```

서버 연결 시 `adapter`를 `"http"`로 바꾸고 각 메서드 내부를 `fetch("/api/...")`로 교체하면 됩니다.
