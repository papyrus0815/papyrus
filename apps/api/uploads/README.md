# Uploads Directory

이 디렉토리는 사용자가 업로드한 파일을 저장하는 공간입니다.

**기본 저장 위치**: **`apps/api/uploads/`** (API 앱 내부)  
- `UPLOAD_PATH` 미설정 시 기본값 `./apps/api/uploads` (서버 실행 시 `process.cwd()` = 프로젝트 루트 기준)
- 예: 프로젝트 루트가 `/Users/you/papyrus`이면 → `/Users/you/papyrus/apps/api/uploads/images/...`

**예전에 프로젝트 루트 `uploads/`에 쌓인 파일이 있다면**  
→ `uploads/images/` 안의 파일들을 `apps/api/uploads/images/`로 옮기면, DB에 저장된 기존 URL 그대로 서빙됩니다.

## 구조

용도별 + **연/월** 폴더로 저장해 파일 수가 많아져도 디렉터리가 분산되고, 보관·삭제 정책 적용이 쉽습니다.

```
apps/api/uploads/
├── images/
│   ├── countries/
│   │   └── 2025/
│   │       └── 02/
│   │           └── [timestamp]-[random].ext
│   ├── persons/
│   │   └── 2025/
│   │       └── 02/
│   ├── events/
│   ├── ministries/
│   ├── attachments/
│   └── [레거시]   # 예전 형식: images 직하위 또는 category 직하위만
└── README.md
```

## 설정

- **최대 파일 크기**: 10MB
- **허용 형식**: jpg, jpeg, png, gif, webp, bmp, svg
- **저장 경로**: `images/{category}/{YYYY}/{MM}/{filename}` (서버 로컬 시각 기준)
- **URL 패턴**: `/uploads/images/{category}/{YYYY}/{MM}/{filename}`
- **업로드 API**: `POST /upload/image?category=countries` (쿼리로 category 지정)

## 보안 주의사항

⚠️ **이 폴더는 Git에서 제외됩니다** (.gitignore)

- 업로드된 파일은 버전 관리되지 않습니다
- 배포 시 별도 백업이 필요합니다

## 프로덕션 권장사항

개발 환경에서는 로컬 파일시스템을 사용하지만, 프로덕션에서는 다음 중 하나를 권장합니다:

1. **AWS S3** - 가장 일반적, CDN 연동 쉬움
2. **Cloudflare R2** - S3 호환, egress 비용 무료
3. **Google Cloud Storage** - GCP 사용 시
4. **별도 NFS/Object Storage** - 온프레미스 환경

## TODO

- [ ] S3/R2로 마이그레이션
- [ ] 이미지 리사이징 자동화
- [ ] CDN 연동
- [ ] 자동 백업 스크립트
