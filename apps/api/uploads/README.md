# Uploads Directory

이 디렉토리는 사용자가 업로드한 파일을 저장하는 공간입니다.

**위치**: `apps/api/uploads/` (API 서버와 함께 관리)

## 구조

```
uploads/
├── images/          # 이미지 파일 (jpg, png, gif, webp)
│   └── [timestamp]-[random].ext
└── README.md
```

## 설정

- **최대 파일 크기**: 10MB
- **허용 형식**: jpg, jpeg, png, gif, webp
- **URL 패턴**: `/uploads/images/[filename]`

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
