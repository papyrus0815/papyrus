-- 즉위 방식에 '조약'(TREATY) 추가 — 1720 런던 조약으로 받은 사르데냐 왕위처럼 조약이 정한 즉위.
-- 사르데냐 시드가 없는 enum 값(AppointmentMethod.TREATY)을 써서 NULL로 조용히 저장돼 있던 행을 바로잡는다.
-- AlterTable
ALTER TABLE `government_position_tenure` MODIFY `appointment_method` ENUM('DIRECT_ELECTION', 'INDIRECT_ELECTION', 'APPOINTMENT', 'HEREDITARY', 'COUP', 'PARLIAMENTARY_ELECTION', 'CONQUEST', 'RESTORATION', 'ELECTIVE_MONARCHY', 'TREATY', 'OTHER') NULL;

UPDATE `government_position_tenure` SET `appointment_method` = 'TREATY'
WHERE `id` = '09e33ae5-060e-4dda-a1c5-d63596d6fa62' AND `appointment_method` IS NULL;
