// src/app/api/dashboard/route.ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET() {
  const now = new Date()
  const startCurrent = startOfMonth(now)
  const endCurrent = endOfMonth(now)

  const [
    statutCounts,
    totalEncours,
    envoiStats,
    relancesAujourdhui,
    activiteMensuelle,
  ] = await Promise.all([
    prisma.dossier.groupBy({ by: ['statut'], _count: true, _sum: { montantRestant: true } }),
    prisma.dossier.aggregate({
      where: { statut: { in: ['EN_COURS', 'LITIGIEUX', 'PROMESSE_PAIEMENT'] } },
      _sum: { montantRestant: true },
      _count: true,
    }),
    prisma.envoi.groupBy({
      by: ['canal', 'statut'],
      _count: true,
      where: { dateCreation: { gte: startCurrent, lte: endCurrent } },
    }),
    prisma.dossier.count({
      where: {
        statut: { in: ['EN_COURS'] },
        dateEcheance: { lt: now },
      },
    }),
    // 6 derniers mois
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        return prisma.envoi.count({
          where: {
            dateCreation: { gte: startOfMonth(d), lte: endOfMonth(d) },
            statut: { in: ['ENVOYE', 'DELIVRE', 'OUVERT'] },
          },
        }).then(count => ({ mois: d.toLocaleString('fr-FR', { month: 'short' }), count }))
      })
    ),
  ])

  const emailsMois = envoiStats.filter(e => e.canal === 'EMAIL').reduce((s, e) => s + e._count, 0)
  const smsMois = envoiStats.filter(e => e.canal === 'SMS').reduce((s, e) => s + e._count, 0)
  const emailsOuverts = envoiStats.find(e => e.canal === 'EMAIL' && e.statut === 'OUVERT')?._count || 0
  const tauxOuverture = emailsMois > 0 ? Math.round((emailsOuverts / emailsMois) * 100) : 0

  return NextResponse.json({
    statuts: statutCounts,
    dossiersActifs: totalEncours._count,
    montantEncours: totalEncours._sum.montantRestant || 0,
    relancesEchues: relancesAujourdhui,
    emailsMois,
    smsMois,
    tauxOuverture,
    activiteMensuelle,
  })
}
