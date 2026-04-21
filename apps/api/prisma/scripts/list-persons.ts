import { PrismaService } from '../prisma.service'

async function main() {
  const prisma = new PrismaService({ useAdapter: true })
  const persons = await prisma.person.findMany({
    select: {
      id: true,
      name: true,
      surname: true,
      originalName: true,
      influence: true,
      birthDate: true,
      deathDate: true,
    },
    orderBy: [{ birthDate: 'asc' }, { name: 'asc' }],
  })
  for (const p of persons) {
    const full = [p.surname, p.name].filter(Boolean).join(' ')
    const by = p.birthDate ? p.birthDate.getUTCFullYear() : ''
    const dy = p.deathDate ? p.deathDate.getUTCFullYear() : ''
    console.log(
      `${p.id}\t${p.originalName ?? ''}\t${full}\t${by}\t${dy}\t${p.influence ?? ''}`,
    )
  }
  await prisma.$disconnect()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
