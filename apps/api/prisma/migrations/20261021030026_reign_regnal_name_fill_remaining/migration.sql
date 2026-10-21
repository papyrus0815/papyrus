-- 재위 왕호가 비어 있던 군주 재위 8행 채우기 — 이로써 군주직 재위는 모두 왕호를 갖는다.
-- 제임스 찰스 스튜어트는 스코틀랜드에서 6세, 잉글랜드에서 1세(왕호가 재위의 속성인 이유).
-- 바이에른 공 하인리히는 공작으로서 4세(황제로서는 2세).

UPDATE `government_position_tenure` SET `regnal_name` = '제임스 6세' WHERE `id` = '03fcb995-234d-4fbb-9368-69ff46a6e51f' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '루이 12세' WHERE `id` = '10e0fc7c-9382-4d0f-b649-ef8678cb566f' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '하인리히 4세' WHERE `id` = '1153505b-1d44-4daa-822f-667ef73fff3e' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌럼 1세' WHERE `id` = '346e87ab-ee63-46e0-a601-bc219ba78878' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '빌럼 1세' WHERE `id` = '67488dfc-3aed-4f2a-b0e9-66126b2d0453' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '제임스 1세' WHERE `id` = '749ead86-7fe3-42bc-91f5-0f5afc76fb58' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '압뒬하미트 1세' WHERE `id` = 'ef075c28-edee-41ce-80ec-30016cee9bd9' AND `regnal_name` IS NULL;
UPDATE `government_position_tenure` SET `regnal_name` = '무스타파 3세' WHERE `id` = 'fdc70fdf-2909-45b6-9f95-bab2da85ac82' AND `regnal_name` IS NULL;
