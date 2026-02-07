-- ========================================
-- Job/JobCategory 데이터 재구조화 (옵션 1)
-- ========================================
-- 
-- 목적: 계층 구조 정리 및 군사 계급 통합
-- - 계급은 통합 (육군 대장, 공군 대장 → 대장)
-- - 군종은 소속 조직에서 관리
-- - 2단계 카테고리 구조 (대분류 > 중분류 > 직업)
--
-- ========================================

-- ========================================
-- 초기화
-- ========================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ref_job;
TRUNCATE TABLE category_job;
SET FOREIGN_KEY_CHECKS = 1;


-- ========================================
-- 1단계 카테고리 (대분류)
-- ========================================

INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '정치/행정', NULL, NULL, NOW(), NOW()),
(UUID(), '군사', NULL, NULL, NOW(), NOW()),
(UUID(), '학문/교육', NULL, NULL, NOW(), NOW()),
(UUID(), '종교', NULL, NULL, NOW(), NOW()),
(UUID(), '예술/문화', NULL, NULL, NOW(), NOW()),
(UUID(), '경제/산업', NULL, NULL, NOW(), NOW()),
(UUID(), '법조', NULL, NULL, NOW(), NOW()),
(UUID(), '의료', NULL, NULL, NOW(), NOW()),
(UUID(), '언론/출판', NULL, NULL, NOW(), NOW()),
(UUID(), '스포츠', NULL, NULL, NOW(), NOW()),
(UUID(), '기타', NULL, NULL, NOW(), NOW());


-- ========================================
-- 2단계 카테고리 (중분류)
-- ========================================

-- 정치/행정 하위 카테고리
SET @politics_id = (SELECT id FROM category_job WHERE name = '정치/행정' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '국가원수', NULL, @politics_id, NOW(), NOW()),
(UUID(), '행정부', NULL, @politics_id, NOW(), NOW()),
(UUID(), '입법부', NULL, @politics_id, NOW(), NOW()),
(UUID(), '사법부', NULL, @politics_id, NOW(), NOW()),
(UUID(), '정당', NULL, @politics_id, NOW(), NOW()),
(UUID(), '외교', NULL, @politics_id, NOW(), NOW());

-- 군사 하위 카테고리
SET @military_id = (SELECT id FROM category_job WHERE name = '군사' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '장성급', NULL, @military_id, NOW(), NOW()),
(UUID(), '영관급', NULL, @military_id, NOW(), NOW()),
(UUID(), '위관급', NULL, @military_id, NOW(), NOW()),
(UUID(), '부사관', NULL, @military_id, NOW(), NOW()),
(UUID(), '병', NULL, @military_id, NOW(), NOW());

-- 학문/교육 하위 카테고리
SET @education_id = (SELECT id FROM category_job WHERE name = '학문/교육' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '교수/연구원', NULL, @education_id, NOW(), NOW()),
(UUID(), '교사', NULL, @education_id, NOW(), NOW()),
(UUID(), '학자', NULL, @education_id, NOW(), NOW());

-- 종교 하위 카테고리
SET @religion_id = (SELECT id FROM category_job WHERE name = '종교' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '기독교', NULL, @religion_id, NOW(), NOW()),
(UUID(), '불교', NULL, @religion_id, NOW(), NOW()),
(UUID(), '이슬람교', NULL, @religion_id, NOW(), NOW()),
(UUID(), '기타 종교', NULL, @religion_id, NOW(), NOW());

-- 예술/문화 하위 카테고리
SET @art_id = (SELECT id FROM category_job WHERE name = '예술/문화' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '미술', NULL, @art_id, NOW(), NOW()),
(UUID(), '음악', NULL, @art_id, NOW(), NOW()),
(UUID(), '영화/연극', NULL, @art_id, NOW(), NOW()),
(UUID(), '문학', NULL, @art_id, NOW(), NOW());

-- 경제/산업 하위 카테고리
SET @economy_id = (SELECT id FROM category_job WHERE name = '경제/산업' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '경영진', NULL, @economy_id, NOW(), NOW()),
(UUID(), '금융', NULL, @economy_id, NOW(), NOW()),
(UUID(), '제조/생산', NULL, @economy_id, NOW(), NOW());

-- 법조 하위 카테고리
SET @law_id = (SELECT id FROM category_job WHERE name = '법조' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '법관', NULL, @law_id, NOW(), NOW()),
(UUID(), '검찰', NULL, @law_id, NOW(), NOW()),
(UUID(), '변호사', NULL, @law_id, NOW(), NOW());

-- 의료 하위 카테고리
SET @medical_id = (SELECT id FROM category_job WHERE name = '의료' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '의사', NULL, @medical_id, NOW(), NOW()),
(UUID(), '간호', NULL, @medical_id, NOW(), NOW());

-- 언론/출판 하위 카테고리
SET @media_id = (SELECT id FROM category_job WHERE name = '언론/출판' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '방송', NULL, @media_id, NOW(), NOW()),
(UUID(), '신문', NULL, @media_id, NOW(), NOW()),
(UUID(), '출판', NULL, @media_id, NOW(), NOW());

-- 스포츠 하위 카테고리
SET @sports_id = (SELECT id FROM category_job WHERE name = '스포츠' LIMIT 1);
INSERT INTO category_job (id, name, thumbnailUrl, parentId, created_at, updated_at) VALUES
(UUID(), '구기 종목', NULL, @sports_id, NOW(), NOW()),
(UUID(), '육상', NULL, @sports_id, NOW(), NOW()),
(UUID(), '수영', NULL, @sports_id, NOW(), NOW()),
(UUID(), '기타 종목', NULL, @sports_id, NOW(), NOW());


-- ========================================
-- 직업 데이터 (ref_job)
-- ========================================

-- 정치/행정 > 국가원수 (왕/군주)
SET @head_of_state_id = (SELECT id FROM category_job WHERE name = '국가원수' AND parentId = @politics_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, name_en, description, created_at, updated_at) VALUES
(UUID(), @head_of_state_id, '왕', 'King', '왕국의 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '여왕', 'Queen', '왕국의 여성 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '황제', 'Emperor', '제국의 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '황후', 'Empress', '제국의 여성 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '국왕', 'King', '국왕', NOW(), NOW()),
(UUID(), @head_of_state_id, '천황', 'Emperor', '일본 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '술탄', 'Sultan', '이슬람 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '차르', 'Tsar', '러시아 황제', NOW(), NOW()),
(UUID(), @head_of_state_id, '칸', 'Khan', '유목민족 군주', NOW(), NOW()),
(UUID(), @head_of_state_id, '왕세자', 'Crown Prince', '왕위 계승자', NOW(), NOW()),
(UUID(), @head_of_state_id, '황태자', 'Crown Prince', '황위 계승자', NOW(), NOW()),
(UUID(), @head_of_state_id, '대통령', 'President', '공화국 국가원수', NOW(), NOW());

-- 정치/행정 > 행정부
SET @exec_id = (SELECT id FROM category_job WHERE name = '행정부' AND parentId = @politics_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @exec_id, '총리', NOW(), NOW()),
(UUID(), @exec_id, '부통령', NOW(), NOW()),
(UUID(), @exec_id, '국무위원', NOW(), NOW()),
(UUID(), @exec_id, '장관', NOW(), NOW()),
(UUID(), @exec_id, '차관', NOW(), NOW()),
(UUID(), @exec_id, '국장', NOW(), NOW());

-- 정치/행정 > 입법부
SET @legis_id = (SELECT id FROM category_job WHERE name = '입법부' AND parentId = @politics_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @legis_id, '국회의장', NOW(), NOW()),
(UUID(), @legis_id, '국회의원', NOW(), NOW()),
(UUID(), @legis_id, '상원의원', NOW(), NOW()),
(UUID(), @legis_id, '하원의원', NOW(), NOW());

-- 정치/행정 > 사법부
SET @judicial_id = (SELECT id FROM category_job WHERE name = '사법부' AND parentId = @politics_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @judicial_id, '대법원장', NOW(), NOW()),
(UUID(), @judicial_id, '대법관', NOW(), NOW()),
(UUID(), @judicial_id, '헌법재판소장', NOW(), NOW()),
(UUID(), @judicial_id, '헌법재판관', NOW(), NOW());

-- 정치/행정 > 정당
SET @party_id = (SELECT id FROM category_job WHERE name = '정당' AND parentId = @politics_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @party_id, '당대표', NOW(), NOW()),
(UUID(), @party_id, '서기장', NOW(), NOW()),
(UUID(), @party_id, '총서기', NOW(), NOW()),
(UUID(), @party_id, '당의장', NOW(), NOW());

-- 정치/행정 > 외교
SET @diplo_id = (SELECT id FROM category_job WHERE name = '외교' AND parentId = @politics_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @diplo_id, '외교부장관', NOW(), NOW()),
(UUID(), @diplo_id, '대사', NOW(), NOW()),
(UUID(), @diplo_id, '총영사', NOW(), NOW());


-- 군사 > 장성급
SET @general_id = (SELECT id FROM category_job WHERE name = '장성급' AND parentId = @military_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @general_id, '대장', NOW(), NOW()),
(UUID(), @general_id, '중장', NOW(), NOW()),
(UUID(), @general_id, '소장', NOW(), NOW()),
(UUID(), @general_id, '준장', NOW(), NOW());

-- 군사 > 영관급
SET @field_id = (SELECT id FROM category_job WHERE name = '영관급' AND parentId = @military_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @field_id, '대령', NOW(), NOW()),
(UUID(), @field_id, '중령', NOW(), NOW()),
(UUID(), @field_id, '소령', NOW(), NOW());

-- 군사 > 위관급
SET @company_id = (SELECT id FROM category_job WHERE name = '위관급' AND parentId = @military_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @company_id, '대위', NOW(), NOW()),
(UUID(), @company_id, '중위', NOW(), NOW()),
(UUID(), @company_id, '소위', NOW(), NOW());

-- 군사 > 부사관
SET @nco_id = (SELECT id FROM category_job WHERE name = '부사관' AND parentId = @military_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @nco_id, '원사', NOW(), NOW()),
(UUID(), @nco_id, '상사', NOW(), NOW()),
(UUID(), @nco_id, '중사', NOW(), NOW()),
(UUID(), @nco_id, '하사', NOW(), NOW());

-- 군사 > 병
SET @soldier_id = (SELECT id FROM category_job WHERE name = '병' AND parentId = @military_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @soldier_id, '병장', NOW(), NOW()),
(UUID(), @soldier_id, '상병', NOW(), NOW()),
(UUID(), @soldier_id, '일병', NOW(), NOW()),
(UUID(), @soldier_id, '이병', NOW(), NOW());


-- 학문/교육 > 교수/연구원
SET @prof_id = (SELECT id FROM category_job WHERE name = '교수/연구원' AND parentId = @education_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @prof_id, '교수', NOW(), NOW()),
(UUID(), @prof_id, '부교수', NOW(), NOW()),
(UUID(), @prof_id, '조교수', NOW(), NOW()),
(UUID(), @prof_id, '연구원', NOW(), NOW()),
(UUID(), @prof_id, '박사후연구원', NOW(), NOW());

-- 학문/교육 > 교사
SET @teacher_id = (SELECT id FROM category_job WHERE name = '교사' AND parentId = @education_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @teacher_id, '교사', NOW(), NOW()),
(UUID(), @teacher_id, '교장', NOW(), NOW()),
(UUID(), @teacher_id, '교감', NOW(), NOW());

-- 학문/교육 > 학자
SET @scholar_id = (SELECT id FROM category_job WHERE name = '학자' AND parentId = @education_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @scholar_id, '물리학자', NOW(), NOW()),
(UUID(), @scholar_id, '화학자', NOW(), NOW()),
(UUID(), @scholar_id, '수학자', NOW(), NOW()),
(UUID(), @scholar_id, '역사학자', NOW(), NOW()),
(UUID(), @scholar_id, '철학자', NOW(), NOW());


-- 종교 > 기독교
SET @christian_id = (SELECT id FROM category_job WHERE name = '기독교' AND parentId = @religion_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @christian_id, '교황', NOW(), NOW()),
(UUID(), @christian_id, '추기경', NOW(), NOW()),
(UUID(), @christian_id, '주교', NOW(), NOW()),
(UUID(), @christian_id, '신부', NOW(), NOW()),
(UUID(), @christian_id, '목사', NOW(), NOW()),
(UUID(), @christian_id, '전도사', NOW(), NOW());

-- 종교 > 불교
SET @buddhist_id = (SELECT id FROM category_job WHERE name = '불교' AND parentId = @religion_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @buddhist_id, '조계종 총무원장', NOW(), NOW()),
(UUID(), @buddhist_id, '승려', NOW(), NOW()),
(UUID(), @buddhist_id, '스님', NOW(), NOW());

-- 종교 > 이슬람교
SET @islam_id = (SELECT id FROM category_job WHERE name = '이슬람교' AND parentId = @religion_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @islam_id, '이맘', NOW(), NOW()),
(UUID(), @islam_id, '무프티', NOW(), NOW());


-- 예술/문화 > 미술
SET @art_visual_id = (SELECT id FROM category_job WHERE name = '미술' AND parentId = @art_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @art_visual_id, '화가', NOW(), NOW()),
(UUID(), @art_visual_id, '조각가', NOW(), NOW()),
(UUID(), @art_visual_id, '사진작가', NOW(), NOW());

-- 예술/문화 > 음악
SET @music_id = (SELECT id FROM category_job WHERE name = '음악' AND parentId = @art_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @music_id, '작곡가', NOW(), NOW()),
(UUID(), @music_id, '지휘자', NOW(), NOW()),
(UUID(), @music_id, '가수', NOW(), NOW()),
(UUID(), @music_id, '연주자', NOW(), NOW());

-- 예술/문화 > 영화/연극
SET @film_id = (SELECT id FROM category_job WHERE name = '영화/연극' AND parentId = @art_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @film_id, '감독', NOW(), NOW()),
(UUID(), @film_id, '배우', NOW(), NOW()),
(UUID(), @film_id, '프로듀서', NOW(), NOW());

-- 예술/문화 > 문학
SET @literature_id = (SELECT id FROM category_job WHERE name = '문학' AND parentId = @art_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @literature_id, '소설가', NOW(), NOW()),
(UUID(), @literature_id, '시인', NOW(), NOW()),
(UUID(), @literature_id, '수필가', NOW(), NOW());


-- 경제/산업 > 경영진
SET @exec_business_id = (SELECT id FROM category_job WHERE name = '경영진' AND parentId = @economy_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @exec_business_id, 'CEO', NOW(), NOW()),
(UUID(), @exec_business_id, 'CFO', NOW(), NOW()),
(UUID(), @exec_business_id, 'CTO', NOW(), NOW()),
(UUID(), @exec_business_id, '회장', NOW(), NOW()),
(UUID(), @exec_business_id, '사장', NOW(), NOW()),
(UUID(), @exec_business_id, '부사장', NOW(), NOW()),
(UUID(), @exec_business_id, '상무', NOW(), NOW()),
(UUID(), @exec_business_id, '이사', NOW(), NOW());

-- 경제/산업 > 금융
SET @finance_id = (SELECT id FROM category_job WHERE name = '금융' AND parentId = @economy_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @finance_id, '은행가', NOW(), NOW()),
(UUID(), @finance_id, '투자가', NOW(), NOW()),
(UUID(), @finance_id, '애널리스트', NOW(), NOW());

-- 경제/산업 > 제조/생산
SET @manufacturing_id = (SELECT id FROM category_job WHERE name = '제조/생산' AND parentId = @economy_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @manufacturing_id, '공장장', NOW(), NOW()),
(UUID(), @manufacturing_id, '엔지니어', NOW(), NOW());


-- 법조 > 법관
SET @judge_id = (SELECT id FROM category_job WHERE name = '법관' AND parentId = @law_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @judge_id, '판사', NOW(), NOW()),
(UUID(), @judge_id, '부장판사', NOW(), NOW());

-- 법조 > 검찰
SET @prosecutor_id = (SELECT id FROM category_job WHERE name = '검찰' AND parentId = @law_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @prosecutor_id, '검찰총장', NOW(), NOW()),
(UUID(), @prosecutor_id, '검사', NOW(), NOW()),
(UUID(), @prosecutor_id, '검사장', NOW(), NOW());

-- 법조 > 변호사
SET @lawyer_id = (SELECT id FROM category_job WHERE name = '변호사' AND parentId = @law_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @lawyer_id, '변호사', NOW(), NOW()),
(UUID(), @lawyer_id, '법무법인 대표', NOW(), NOW());


-- 의료 > 의사
SET @doctor_id = (SELECT id FROM category_job WHERE name = '의사' AND parentId = @medical_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @doctor_id, '의사', NOW(), NOW()),
(UUID(), @doctor_id, '전문의', NOW(), NOW()),
(UUID(), @doctor_id, '병원장', NOW(), NOW()),
(UUID(), @doctor_id, '원장', NOW(), NOW());

-- 의료 > 간호
SET @nurse_id = (SELECT id FROM category_job WHERE name = '간호' AND parentId = @medical_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @nurse_id, '간호사', NOW(), NOW()),
(UUID(), @nurse_id, '간호부장', NOW(), NOW());


-- 언론/출판 > 방송
SET @broadcast_id = (SELECT id FROM category_job WHERE name = '방송' AND parentId = @media_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @broadcast_id, '기자', NOW(), NOW()),
(UUID(), @broadcast_id, '앵커', NOW(), NOW()),
(UUID(), @broadcast_id, 'PD', NOW(), NOW()),
(UUID(), @broadcast_id, '방송국장', NOW(), NOW());

-- 언론/출판 > 신문
SET @newspaper_id = (SELECT id FROM category_job WHERE name = '신문' AND parentId = @media_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @newspaper_id, '기자', NOW(), NOW()),
(UUID(), @newspaper_id, '편집장', NOW(), NOW()),
(UUID(), @newspaper_id, '주필', NOW(), NOW());

-- 언론/출판 > 출판
SET @publishing_id = (SELECT id FROM category_job WHERE name = '출판' AND parentId = @media_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @publishing_id, '출판인', NOW(), NOW()),
(UUID(), @publishing_id, '편집자', NOW(), NOW());


-- 스포츠 > 구기 종목
SET @ball_sports_id = (SELECT id FROM category_job WHERE name = '구기 종목' AND parentId = @sports_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @ball_sports_id, '축구선수', NOW(), NOW()),
(UUID(), @ball_sports_id, '야구선수', NOW(), NOW()),
(UUID(), @ball_sports_id, '농구선수', NOW(), NOW()),
(UUID(), @ball_sports_id, '배구선수', NOW(), NOW()),
(UUID(), @ball_sports_id, '테니스선수', NOW(), NOW());

-- 스포츠 > 육상
SET @track_id = (SELECT id FROM category_job WHERE name = '육상' AND parentId = @sports_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @track_id, '육상선수', NOW(), NOW()),
(UUID(), @track_id, '마라톤선수', NOW(), NOW());

-- 스포츠 > 수영
SET @swim_id = (SELECT id FROM category_job WHERE name = '수영' AND parentId = @sports_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @swim_id, '수영선수', NOW(), NOW());

-- 스포츠 > 기타 종목
SET @other_sports_id = (SELECT id FROM category_job WHERE name = '기타 종목' AND parentId = @sports_id LIMIT 1);
INSERT INTO ref_job (id, categoryId, name, created_at, updated_at) VALUES
(UUID(), @other_sports_id, '골프선수', NOW(), NOW()),
(UUID(), @other_sports_id, '피겨스케이팅선수', NOW(), NOW()),
(UUID(), @other_sports_id, '유도선수', NOW(), NOW()),
(UUID(), @other_sports_id, '복싱선수', NOW(), NOW());


-- ========================================
-- 완료
-- ========================================

SELECT '✅ Job/JobCategory 데이터 재구조화 완료!' as status;
SELECT COUNT(*) as total_categories FROM category_job;
SELECT COUNT(*) as total_jobs FROM ref_job;
