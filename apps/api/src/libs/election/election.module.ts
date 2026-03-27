import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { PoliticalPartyController } from './presentation/political-party.controller'
import { PoliticalPartyTransitionController } from './presentation/political-party-transition.controller'
import { ElectoralDistrictController } from './presentation/electoral-district.controller'
import { ElectionController } from './presentation/election.controller'
import { PersonElectionController } from './presentation/person-election.controller'
import { CabinetPoliticalPartyController } from './presentation/cabinet-political-party.controller'
import { LawController } from './presentation/law.controller'
import { LawTypeController } from './presentation/law-type.controller'

@Module({
  imports: [PrismaModule],
  controllers: [
    PoliticalPartyController,
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
