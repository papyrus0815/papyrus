-- Prisma "migration was modified after it was applied" 복구
-- Safe Update 모드 때문에 1175 에러가 나면 아래 3줄을 **한 번에** 실행하세요.

SET SQL_SAFE_UPDATES = 0;

UPDATE _prisma_migrations
SET checksum = 'c32325577adcce9b264e3030dd7ef9805f2d21d21b251702238bcbeac920c1da'
WHERE migration_name = '20260208202551_add_show_position_info_to_government_tenure';

SET SQL_SAFE_UPDATES = 1;
