import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { PoliticalPartyController } from './presentation/political-party.controller'
import { PoliticalPartyIdentityController } from './presentation/political-party-identity.controller'
import { PoliticalPartyIdeologyController } from './presentation/political-party-ideology.controller'
import { PoliticalPartyOrganizationController } from './presentation/political-party-organization.controller'
import { PoliticalPartyMarksController } from './presentation/political-party-marks.controller'
import { PoliticalPartyLinkController } from './presentation/political-party-link.controller'
import { PoliticalPartyCitationController } from './presentation/political-party-citation.controller'
import { EvidenceModule } from '../evidence/evidence.module'
import { PoliticalPartyTransitionController } from './presentation/political-party-transition.controller'
import { ElectoralDistrictController } from './presentation/electoral-district.controller'
import { ElectionController } from './presentation/election.controller'
import { PersonElectionController } from './presentation/person-election.controller'
import { CabinetPoliticalPartyController } from './presentation/cabinet-political-party.controller'
import { LawController } from './presentation/law.controller'
import { LawTypeController } from './presentation/law-type.controller'
import { NotificationModule } from '../notification/notification.module'
import { EventModule } from '../event/infrastructure/event.module'

@Module({
  // 사건 모듈 — 선거에서 서사 사건을 만들 때 EventService(포인트·참여국 등 생성 부수효과 포함)를 그대로 쓴다
  imports: [PrismaModule, NotificationModule, EventModule, EvidenceModule],
  controllers: [
    PoliticalPartyController,
    PoliticalPartyIdentityController,
    PoliticalPartyIdeologyController,
    PoliticalPartyOrganizationController,
    PoliticalPartyMarksController,
    PoliticalPartyCitationController,
    PoliticalPartyLinkController,
    PoliticalPartyTransitionController,
    ElectoralDistrictController,
    ElectionController,
    LawController,
    LawTypeController,
    PersonElectionController,
    CabinetPoliticalPartyController,
  ],
})
export class ElectionModule {}
