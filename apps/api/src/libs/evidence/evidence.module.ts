import { Module } from '@nestjs/common'

import { CitationService } from './application/citation.service'
import { ObservationService } from './application/observation.service'
import { SourceService } from './application/source.service'
import { SubjectAccessService } from './application/subject-access.service'
import { EvidenceController } from './presentation/evidence.controller'

/**
 * 근거 모듈 — 출처 · 인용 · 지표 카탈로그 · 측정값.
 * 사건 전용이 아니다: 측정값 대상은 다형(사건·진영·참여국·국가·조직·인물)이고,
 * 인용은 측정값 밖의 기록(사건 서술·참여국 줄)에도 붙는다.
 */
@Module({
  controllers: [EvidenceController],
  providers: [SubjectAccessService, CitationService, ObservationService, SourceService],
  exports: [CitationService, ObservationService],
})
export class EvidenceModule {}
