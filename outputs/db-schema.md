# 조씨네 일정 DB 스키마 초안

이 문서는 현재 파일 기반 `snapshot.json` 데이터와 SQLite 저장소를 실제 DB로 확장하기 위한 기준입니다.
프론트는 당분간 `/api/snapshot`을 계속 사용할 수 있고, 서버 내부 저장소는 `STORAGE_DRIVER=file|sqlite`로 전환할 수 있습니다.

## 핵심 엔티티

### users

| column | type | note |
| --- | --- | --- |
| id | text primary key | `admin` 같은 내부 계정 ID |
| role | text | `admin`, `guardian` |
| password_hash | text | 지금은 `admin1234` 단순 로그인, 실제 서비스에서는 해시 저장 |
| created_at | datetime | 생성일 |

### children

| column | type | note |
| --- | --- | --- |
| id | text primary key | 아이 ID |
| name | text | 화면 표시 이름 |
| color | text | UI 색상 |
| initial | text | 아바타 글자 |
| sort_order | integer | 표시 순서 |

### guardians

| column | type | note |
| --- | --- | --- |
| id | text primary key | 보호자 ID |
| name | text | 엄마, 아빠, 이모 등 |
| sort_order | integer | 표시 순서 |

### schedules

| column | type | note |
| --- | --- | --- |
| id | text primary key | 일정 ID |
| child_id | text | children.id |
| title | text | 학교, 태권도 등 |
| type | text | school, academy, homework, meal, leisure |
| date | date nullable | 반복 원본이면 null, 오늘 변경이면 해당 날짜 |
| start_minute | integer | 07:00 기준 분 |
| duration_minute | integer | 길이 |
| lane | integer | 시간표 lane |
| drop_guardian_id | text nullable | 등원/시작 담당 |
| pick_guardian_id | text nullable | 하원/종료 담당 |
| homework_id | text nullable | 숙제 일정이면 homework_items.id |
| changed | boolean | 오늘만 변경 여부 |
| deleted_at | datetime nullable | null이면 활성, 값이 있으면 휴지통 |
| created_at | datetime | 생성일 |
| updated_at | datetime | 수정일 |

### homework_items

| column | type | note |
| --- | --- | --- |
| id | text primary key | 숙제 ID |
| child_id | text | children.id |
| title | text | 숙제명 |
| due_label | text | 오늘, 내일, 이번 주 등 |
| priority | text | 높음, 보통, 낮음 |
| duration_minute | integer | 예상 소요 시간 |
| placed_at_schedule_id | text nullable | 배치된 일정 |
| completed_at | datetime nullable | 완료 처리 시각 |

### holidays

| column | type | note |
| --- | --- | --- |
| id | text primary key | 휴일 ID |
| date | date | 휴일 날짜 |
| title | text | 휴일명 |
| affects_school | boolean | 학교 제외 여부 |
| affects_academy | boolean | 학원 제외 여부 |

### schedule_templates

| column | type | note |
| --- | --- | --- |
| id | text primary key | 템플릿 ID |
| type | text | school, academy, homework 등 |
| child_id | text | 기본 아이 |
| title | text | 기본 제목 |
| start_minute | integer | 기본 시작 |
| duration_minute | integer | 기본 길이 |
| lane | integer | 기본 lane |
| drop_guardian_id | text nullable | 기본 시작 담당 |
| pick_guardian_id | text nullable | 기본 종료 담당 |
| weekdays | text | JSON 배열 문자열 또는 별도 join table |
| holiday_skip | boolean | 휴일 제외 여부 |

## 현재 API와의 매핑

| 현재 snapshot 필드 | DB 엔티티 |
| --- | --- |
| `family.children` | `children` |
| `family.guardians` | `guardians` |
| `schedules` | `schedules where deleted_at is null` |
| `deletedSchedules` | `schedules where deleted_at is not null` |
| `homeworkItems` | `homework_items` |
| `placedHomeworkIds` | `homework_items.placed_at_schedule_id` |
| `completedHomeworkIds` | `homework_items.completed_at` |
| `holidays` | `holidays` |
| `templates` | `schedule_templates` |

## 다음 구현 순서

1. 로그인 비밀번호를 평문 비교에서 해시 비교로 변경
2. 프론트 `ScheduleApi`를 entity API 기반으로 점진 전환
3. 배포 환경에서 `STORAGE_DRIVER=sqlite`를 기본값으로 전환
4. SQLite 테이블을 Postgres 호환 스키마로 확장
