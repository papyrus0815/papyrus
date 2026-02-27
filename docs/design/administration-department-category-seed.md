# 행정 부처 카테고리 — 넣을 데이터

`administration_department_category` 테이블에 넣는 **전세계 공통** 부처 카테고리입니다.  
(국방·외교 등으로 부처를 묶어 비교할 때 사용)

## 시드 실행 방법

API 프로젝트에서:

```bash
cd apps/api
npx ts-node prisma/seed.ts --environment=development
```

또는 프로젝트 루트에서 seed 스크립트가 있다면:

```bash
npm run seed
```

development / production 공통으로 `seedAdministrationDepartmentCategories`가 실행되며,  
이미 같은 `name`이 있으면 `name_en`만 갱신하고 없으면 새로 넣습니다.

## 카테고리 목록 (19개)

| name (한글)   | name_en (영문)        |
|--------------|------------------------|
| 국방         | Defense                 |
| 외교         | Foreign Affairs         |
| 재정·경제    | Finance & Economy       |
| 법무         | Justice                 |
| 교육         | Education               |
| 과학기술     | Science & Technology    |
| 문화·체육    | Culture & Sports        |
| 보건·복지    | Health & Welfare        |
| 환경         | Environment             |
| 고용·노동    | Employment & Labor      |
| 여성·가족    | Gender & Family         |
| 농림·해양    | Agriculture & Fisheries |
| 산업·에너지  | Industry & Energy       |
| 국토·교통    | Land & Transport        |
| 정보·통신    | Information & Communication |
| 행정·안전    | Administration & Safety |
| 기획·조정    | Planning & Coordination |
| 정보·정보기관 | Intelligence           |
| 기타         | Other                   |

## 수동 SQL로 넣을 때 (참고)

```sql
INSERT INTO administration_department_category (id, name, name_en) VALUES
(UUID(), '국방', 'Defense'),
(UUID(), '외교', 'Foreign Affairs'),
(UUID(), '재정·경제', 'Finance & Economy'),
(UUID(), '법무', 'Justice'),
(UUID(), '교육', 'Education'),
(UUID(), '과학기술', 'Science & Technology'),
(UUID(), '문화·체육', 'Culture & Sports'),
(UUID(), '보건·복지', 'Health & Welfare'),
(UUID(), '환경', 'Environment'),
(UUID(), '고용·노동', 'Employment & Labor'),
(UUID(), '여성·가족', 'Gender & Family'),
(UUID(), '농림·해양', 'Agriculture & Fisheries'),
(UUID(), '산업·에너지', 'Industry & Energy'),
(UUID(), '국토·교통', 'Land & Transport'),
(UUID(), '정보·통신', 'Information & Communication'),
(UUID(), '행정·안전', 'Administration & Safety'),
(UUID(), '기획·조정', 'Planning & Coordination'),
(UUID(), '정보·정보기관', 'Intelligence'),
(UUID(), '기타', 'Other')
ON DUPLICATE KEY UPDATE name_en = VALUES(name_en);
```

(MySQL 기준. `name`에 UNIQUE가 있으면 위와 같이 중복 시 영문명만 갱신 가능.)
