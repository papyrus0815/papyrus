-- AlterTable: 긴 리치 텍스트 설명 허용 (기존 VARCHAR 길이 제한 해제)
ALTER TABLE `administration_department` MODIFY `description` TEXT NULL;
