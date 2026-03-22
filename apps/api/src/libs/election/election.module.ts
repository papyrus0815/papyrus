import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { PoliticalPartyController } from './presentation/political-party.controller'
import { ElectoralDistrictController } from './presentation/electoral-district.controller'
import { ElectionController } from './presentation/election.controller'
import { PersonElectionController } from './presentation/person-election.controller'
import { CabinetPoliticalPartyController } from './presentation/cabinet-political-party.controller'

@Module({
  imports: [PrismaModule],
  controllers: [
    PoliticalPartyController,
    ElectoralDistrictController,
    ElectionController,
    PersonElectionController,
    CabinetPoliticalPartyController,
  ],
})
export class ElectionModule {}
