# 조씨네 일정 Backend API 계약

현재 서버는 `outputs/repository.js`에서 저장소 드라이버를 선택합니다.
기본값은 파일 기반 `outputs/data/snapshot.json`이고, `STORAGE_DRIVER=sqlite`를 지정하면 `outputs/data/schedule.sqlite`를 사용합니다.
프론트는 기존 `/api/snapshot`을 사용하고, 실제 DB 전환 준비를 위해 `/api/entities` 계열 API를 추가했습니다.

## Health

### `GET /api/health`

Response:

```json
{ "ok": true, "storageDriver": "file" }
```

`storageDriver`는 `file` 또는 `sqlite`입니다.

## SQLite Migration

현재 파일 저장소의 `snapshot.json`을 SQLite로 옮깁니다.

```powershell
npm run migrate:sqlite
```

대상 파일을 지정하려면:

```powershell
node outputs/migrate-sqlite.js --to outputs/data/schedule.sqlite
```

쓰기 없이 개수만 확인하려면:

```powershell
node outputs/migrate-sqlite.js --dry-run
```

## Admin Login

### `POST /api/admin/login`

Request:

```json
{ "password": "admin1234" }
```

Response:

```json
{ "ok": true, "role": "admin", "sessionId": "local-..." }
```

기본 비밀번호는 `admin1234`이고, 서버 내부에서는 PBKDF2 해시로 검증합니다.
실서비스에서는 `ADMIN_PASSWORD_HASH` 환경변수를 지정합니다.

비밀번호 해시 생성:

```powershell
npm run hash:password -- "새비밀번호"
```

서버 실행 예:

```powershell
set ADMIN_PASSWORD_HASH=pbkdf2$sha256$...&& npm start
```

## Snapshot API

프론트 호환용 API입니다. 화면은 이 API만으로 계속 동작합니다.

### `GET /api/snapshot`

Response:

```json
{
  "schedules": [],
  "deletedSchedules": [],
  "homeworkItems": [],
  "placedHomeworkIds": [],
  "completedHomeworkIds": [],
  "family": {
    "children": [],
    "guardians": []
  },
  "holidays": [],
  "templates": {}
}
```

### `PUT /api/snapshot`

Request: `GET /api/snapshot`과 같은 전체 snapshot.

Response:

```json
{ "ok": true, "savedAt": "2026-06-05T00:00:00.000Z" }
```

### `POST /api/snapshot/reset`

데모 데이터를 초기화합니다.

## Entity API

DB 전환 준비용 API입니다. 현재는 같은 `snapshot.json`을 읽고 쓰지만, 나중에는 각 컬렉션을 DB 테이블에 연결하면 됩니다.

### `GET /api/entities`

Response:

```json
{
  "children": [],
  "guardians": [],
  "schedules": [],
  "deletedSchedules": [],
  "homework": {
    "items": [],
    "placedIds": [],
    "completedIds": []
  },
  "holidays": [],
  "templates": {}
}
```

### `GET /api/entities/:collection`

지원 컬렉션:

- `children`
- `guardians`
- `schedules`
- `deleted-schedules`
- `homework`
- `holidays`
- `templates`

### `PUT /api/entities/:collection`

컬렉션 단위로 저장합니다.

Examples:

```http
PUT /api/entities/children
```

```json
[
  { "name": "민지", "color": "#ffe07b", "initial": "민" }
]
```

```http
PUT /api/entities/homework
```

```json
{
  "items": [],
  "placedIds": [],
  "completedIds": []
}
```

Response:

```json
{ "ok": true, "savedAt": "2026-06-05T00:00:00.000Z" }
```

## DB Mapping

상세 스키마는 `outputs/db-schema.md`를 기준으로 합니다.

현재 API와 DB 전환 기준:

- `family.children` -> `children`
- `family.guardians` -> `guardians`
- `schedules` + `deletedSchedules` -> `schedules.deleted_at`
- `homeworkItems` + 배치/완료 ID -> `homework_items`
- `holidays` -> `holidays`
- `templates` -> `schedule_templates`
