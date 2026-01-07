import { Injectable } from '@nestjs/common'
import { ParticipationType, CombatType, PrismaClient } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { MilitaryEventDto } from '../presentation/dto/military-event.dto'

/**
 * 군사 정보 전용 서비스
 * 
 * 정규화된 군사 정보를 관리합니다.
 * - BelligerentSide (교전 세력)
 * - CountryInSide (세력별 참전 국가)
 * - EventCountryRelationNew (국가 간 관계)
 * - MilitaryDetailsNorm (군사 상세 정보)
 * - CasualtiesData (피해 규모)
 */
@Injectable()
export class MilitaryEventService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 군사 정보 저장
   * 
   * 모든 군사 정보를 트랜잭션으로 저장합니다.
   * 기존 데이터가 있으면 삭제 후 새로 저장합니다.
   * 
   * @param eventId 사건 ID
   * @param data 군사 정보 DTO
   */
  async saveMilitaryData(
    eventId: string,
    data: MilitaryEventDto,
  ): Promise<void> {
    console.log('🟢 [Service] saveMilitaryData 시작:', {
      eventId,
      hasBelligerentSides: data.belligerentSides?.length || 0,
      hasRelations: data.relations?.length || 0,
      hasMilitaryDetails: !!data.militaryDetails,
      conflictType: data.militaryDetails?.conflictType,
      combatTypes: data.militaryDetails?.combatTypes,
      hasCasualties: data.casualties?.length || 0,
      warCost: data.warCost,
    })
    
    // 트랜잭션으로 모든 군사 정보를 저장
    await this.prisma.$transaction(async (tx) => {
      // 1. 기존 데이터 삭제 (업데이트 시)
      console.log('🗑️ [Service] 기존 데이터 삭제 중...')
      await this.deleteMilitaryData(eventId, tx)

      // 2. 교전 세력 저장
      if (data.belligerentSides && data.belligerentSides.length > 0) {
        for (const side of data.belligerentSides) {
          const createdSide = await tx.belligerentSide.create({
            data: {
              eventId,
              name: side.name,
              level: side.level,
              commander: side.commander,
              commanderPersonId: side.commanderPersonId,
              forces: side.forces,
              description: side.description,
              color: side.color,
            },
          })

          // 세력에 속한 국가들 저장
          if (side.countries && side.countries.length > 0) {
            for (const country of side.countries) {
              // DTO ParticipationType → Prisma ParticipationType 변환
              const participationTypeMap: Record<string, ParticipationType> = {
                'MAIN': 'FULL',
                'SUPPORT': 'INDIRECT',
                'LIMITED': 'LIMITED',
                'OCCUPIED': 'NON_COMBATANT',
              }
              
              const prismaParticipationType = country.participationType 
                ? participationTypeMap[country.participationType] || 'FULL'
                : 'FULL'
              
              await tx.countryInSide.create({
                data: {
                  sideId: createdSide.id,
                  countryId: country.countryId,
                  historicalCountryId: country.historicalCountryId,
                  commander: country.commander,
                  commanderPersonId: country.commanderPersonId,
                  forces: country.forces,
                  participation: prismaParticipationType,
                  joinDate: country.joinDate
                    ? new Date(country.joinDate)
                    : null,
                  withdrawDate: country.withdrawDate
                    ? new Date(country.withdrawDate)
                    : null,
                  description: country.description,
                },
              })
            }
          }
        }
      }

      // 3. 국가 간 관계 저장
      if (data.relations && data.relations.length > 0) {
        for (const relation of data.relations) {
          await tx.eventCountryRelationNew.create({
            data: {
              eventId,
              fromCountryId: relation.fromCountryId,
              fromHistoricalCountryId: relation.fromHistoricalCountryId,
              toCountryId: relation.toCountryId,
              toHistoricalCountryId: relation.toHistoricalCountryId,
              relationType: relation.relationType,
              startDate: relation.startDate
                ? new Date(relation.startDate)
                : null,
              endDate: relation.endDate ? new Date(relation.endDate) : null,
              strength: relation.strength,
              description: relation.description,
            },
          })
        }
      }

      // 4. 군사 상세 정보 저장
      if (data.militaryDetails) {
        console.log('💾 [Service] 군사 상세 정보 저장 중:', {
          conflictType: data.militaryDetails.conflictType,
          combatTypes: data.militaryDetails.combatTypes,
          tactics: data.militaryDetails.tactics,
          strategy: data.militaryDetails.strategy,
          outcome: data.militaryDetails.outcome,
        })
        
        const details = await tx.militaryDetailsNorm.create({
          data: {
            eventId,
            conflictType: data.militaryDetails.conflictType,
            objective: data.militaryDetails.objective,
            tactics: data.militaryDetails.tactics,
            strategy: data.militaryDetails.strategy,
            outcome: data.militaryDetails.outcome,
            territoryChanges: data.militaryDetails.territoryChanges,
            treaty: data.militaryDetails.treaty,
            strategicImpact: data.militaryDetails.strategicImpact,
          },
        })
        
        console.log('✅ [Service] MilitaryDetailsNorm 생성 완료:', details.id)

        // 전투 유형 저장
        if (
          data.militaryDetails.combatTypes &&
          data.militaryDetails.combatTypes.length > 0
        ) {
          console.log('💾 [Service] 전투 유형 저장 중:', data.militaryDetails.combatTypes)
          for (const combatType of data.militaryDetails.combatTypes) {
            await tx.militaryDetailsCombatType.create({
              data: {
                militaryDetailsId: details.id,
                combatType: combatType as unknown as CombatType,
              },
            })
          }
          console.log(`✅ [Service] 전투 유형 ${data.militaryDetails.combatTypes.length}개 저장 완료`)
        }
      } else {
        console.log('⚠️ [Service] militaryDetails가 없습니다')
      }

      // 5. 피해 규모 저장
      if (data.casualties && data.casualties.length > 0) {
        console.log(`💾 [Service] 피해 규모 ${data.casualties.length}개 저장 중...`)
        for (const casualty of data.casualties) {
          await tx.casualtiesData.create({
            data: {
              eventId,
              sideName: casualty.sideName,
              militaryKilled: casualty.totalKilled, // militaryKilled로 매핑
              militaryWounded: casualty.totalWounded, // militaryWounded로 매핑
            },
          })

          // 국가별 피해는 CountryInSide와 연결되므로 현재 구조에서는 생략
          // (필요시 CountryInSide에 casualties 관계를 통해 저장)
        }
        console.log('✅ [Service] 피해 규모 저장 완료')
      }
      
      console.log('✅ [Service] saveMilitaryData 트랜잭션 완료')
    })
  }

  /**
   * 군사 정보 조회
   * 
   * 모든 정규화된 군사 정보를 조회하여 DTO로 변환합니다.
   * 
   * @param eventId 사건 ID
   * @returns 군사 정보 DTO 또는 null (데이터가 없는 경우)
   */
  async getMilitaryData(eventId: string): Promise<MilitaryEventDto | null> {
    // 교전 세력 조회
    const belligerentSides = await this.prisma.belligerentSide.findMany({
      where: { eventId },
      include: {
        countries: {
          include: {
            country: true,
            historicalCountry: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // 국가 간 관계 조회
    const relations = await this.prisma.eventCountryRelationNew.findMany({
      where: { eventId },
      include: {
        fromCountry: true,
        fromHistoricalCountry: true,
        toCountry: true,
        toHistoricalCountry: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // 군사 상세 정보 조회
    const militaryDetails = await this.prisma.militaryDetailsNorm.findUnique({
      where: { eventId },
      include: {
        combatTypes: true,
      },
    })

    // 피해 규모 조회
    const casualties = await this.prisma.casualtiesData.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    })

    // 데이터가 없으면 null 반환
    if (
      belligerentSides.length === 0 &&
      relations.length === 0 &&
      !militaryDetails &&
      casualties.length === 0
    ) {
      return null
    }

    // DTO 형식으로 변환
    const result = {
      belligerentSides: belligerentSides.map((side) => ({
        name: side.name,
        level: side.level as never,
        commander: side.commander || undefined,
        commanderPersonId: side.commanderPersonId || undefined,
        forces: side.forces || undefined,
        description: side.description || undefined,
        color: side.color || undefined,
        countries: side.countries.map((country) => {
          // Prisma ParticipationType → DTO ParticipationType 변환
          const participationTypeMap: Record<string, string> = {
            'FULL': 'MAIN',
            'INDIRECT': 'SUPPORT',
            'LIMITED': 'LIMITED',
            'NON_COMBATANT': 'OCCUPIED',
          }
          
          const dtoParticipationType = country.participation
            ? participationTypeMap[country.participation] || 'MAIN'
            : 'MAIN'
          
          return {
            countryId: country.countryId || undefined,
            historicalCountryId: country.historicalCountryId || undefined,
            commander: country.commander || undefined,
            commanderPersonId: country.commanderPersonId || undefined,
            forces: country.forces || undefined,
            participationType: dtoParticipationType as never,
            joinDate: country.joinDate?.toISOString(),
            withdrawDate: country.withdrawDate?.toISOString(),
            description: country.description || undefined,
          }
        }),
      })),
      relations: relations.map((relation) => ({
        fromCountryId: relation.fromCountryId || undefined,
        fromHistoricalCountryId: relation.fromHistoricalCountryId || undefined,
        toCountryId: relation.toCountryId || undefined,
        toHistoricalCountryId: relation.toHistoricalCountryId || undefined,
        relationType: relation.relationType as never,
        startDate: relation.startDate?.toISOString(),
        endDate: relation.endDate?.toISOString(),
        strength: relation.strength || undefined,
        description: relation.description || undefined,
      })),
      militaryDetails: militaryDetails
        ? {
            conflictType: militaryDetails.conflictType as never,
            combatTypes: militaryDetails.combatTypes.map(
              (combatTypeItem) => combatTypeItem.combatType as never,
            ),
            objective: militaryDetails.objective || undefined,
            tactics: militaryDetails.tactics || undefined,
            strategy: militaryDetails.strategy || undefined,
            outcome: militaryDetails.outcome || undefined,
            territoryChanges: militaryDetails.territoryChanges || undefined,
            treaty: militaryDetails.treaty || undefined,
            strategicImpact: militaryDetails.strategicImpact || undefined,
          }
        : undefined,
      casualties: casualties.map((casualty) => ({
        sideName: casualty.sideName || undefined,
        totalKilled: casualty.militaryKilled || undefined,
        totalWounded: casualty.militaryWounded || undefined,
        countryCasualties: [],
      })),
    }

    return result
  }

  /**
   * 군사 정보 삭제 (내부 사용)
   * 
   * CASCADE 삭제로 연관된 모든 데이터가 자동 삭제됩니다.
   * 
   * @param eventId 사건 ID
   * @param tx 트랜잭션 객체
   */
  private async deleteMilitaryData(
    eventId: string,
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ): Promise<void> {
    // CountryInSide 삭제
    const sides = await tx.belligerentSide.findMany({
      where: { eventId },
      select: { id: true },
    })
    if (sides.length > 0) {
      await tx.countryInSide.deleteMany({
        where: {
          sideId: { in: sides.map((sideItem: { id: string }) => sideItem.id) },
        },
      })
    }

    // BelligerentSide 삭제
    await tx.belligerentSide.deleteMany({ where: { eventId } })

    // EventCountryRelationNew 삭제
    await tx.eventCountryRelationNew.deleteMany({ where: { eventId } })

    // MilitaryDetailsCombatType 삭제
    const details = await tx.militaryDetailsNorm.findUnique({
      where: { eventId },
      select: { id: true },
    })
    if (details) {
      await tx.militaryDetailsCombatType.deleteMany({
        where: { militaryDetailsId: details.id },
      })
    }

    // MilitaryDetailsNorm 삭제
    await tx.militaryDetailsNorm.deleteMany({ where: { eventId } })

    // CasualtiesData 삭제 (CountryCasualties는 별도 관계가 아니므로 여기서는 생략)
    await tx.casualtiesData.deleteMany({ where: { eventId } })
  }
}

