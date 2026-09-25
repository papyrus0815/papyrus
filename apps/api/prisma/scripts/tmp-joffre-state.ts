import * as dotenv from 'dotenv'
import * as path from 'path'
import { PrismaService } from '../prisma.service'

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.development') })
  const prisma = new PrismaService({ useAdapter: true })
  try {
    const p = await prisma.person.findFirst({
      where: { originalName: { contains: 'Joffre' } },
      include: {
        historicalCountry: { select: { id: true, name: true } },
        country: { select: { name: true } },
        nicknames: true,
        countryAffiliations: { select: { affiliationType: true, priority: true, note: true, historicalCountry: { select: { name: true } } } },
        GovernmentTenures: true,
        sovereignReigns: { select: { id: true } },
        lifeEvents: { select: { title: true } },
        stats: true,
        biographySections: { select: { title: true, content: true } },
        PersonEvent: { select: { role: true, event: { select: { title: true } } } },
        groupMemberships: { select: { roleLabel: true, group: { select: { name: true } } } },
        militaryCareers: { select: { id: true } },
        awards: { select: { id: true } },
      },
    })
    if (!p) { console.log('조프르 미등록'); return }
    console.log('id:', p.id)
    console.log('이름:', p.name, '/', p.middleName, '/', p.surname, '/', p.originalName)
    console.log('생몰:', p.birthDate?.toISOString().slice(0,10), `(era=${p.birthEra}, prec=${p.birthDatePrecision})`, '~', p.deathDate?.toISOString().slice(0,10), `(prec=${p.deathDatePrecision})`)
    console.log('birthPlaceText:', JSON.stringify(p.birthPlaceText))
    console.log('birthNote:', JSON.stringify(p.birthNote))
    console.log('deathPlaceText:', JSON.stringify(p.deathPlaceText))
    console.log('deathType:', p.deathType, '/ deathCause:', JSON.stringify(p.deathCause), '/ deathNote:', p.deathNote ? p.deathNote.length + '자' : null)
    console.log('gender:', p.gender, '/ nameDisplayOrder:', p.nameDisplayOrder, '/ influence:', p.influence)
    console.log('biography:', p.biography ? p.biography.length + '자' : 'NULL')
    console.log('주국적 HC:', p.historicalCountry?.name, p.historicalCountry?.id, '/ 현대:', p.country?.name ?? 'null')
    console.log('profileImageUrl:', p.profileImageUrl)
    console.log('별칭:', JSON.stringify(p.nicknames.map((n) => `${n.nickname}(${n.type})`)))
    console.log('소속국가:', JSON.stringify(p.countryAffiliations))
    console.log('재임:', p.GovernmentTenures.length, '/ 재위:', p.sovereignReigns.length, '/ 연보:', p.lifeEvents.length, '/ 전기섹션:', p.biographySections.length, '/ 능력치:', p.stats.length, '/ 사건연결:', p.PersonEvent.length, '/ 군경력:', p.militaryCareers.length, '/ 수상:', p.awards.length)
    console.log('소속 그룹:', JSON.stringify(p.groupMemberships.map((g) => `${g.group.name}: ${g.roleLabel}`)))
  } finally {
    await prisma.$disconnect()
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
