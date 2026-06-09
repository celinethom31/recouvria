// src/app/api/agent/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { chatAgent, analyserDossier } from '@/lib/agent'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, messages, dossierId } = body

  // Chat libre
  if (action === 'chat') {
    // Injecter un résumé des dossiers actifs comme contexte
    const stats = await prisma.dossier.groupBy({
      by: ['statut'],
      _count: true,
      _sum: { montantRestant: true },
    })
    const contexte = stats.map(s =>
      `${s.statut}: ${s._count} dossiers, ${s._sum.montantRestant?.toFixed(0)}€`
    ).join(' | ')

    const reply = await chatAgent(messages, contexte)
    return NextResponse.json({ reply })
  }

  // Analyse d'un dossier spécifique
  if (action === 'analyser' && dossierId) {
    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      include: { actions: { orderBy: { date: 'desc' }, take: 10 } },
    })
    if (!dossier) return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })

    const historique = dossier.actions.map(a => a.description)
    const result = await analyserDossier(dossier as any, historique)

    // Sauvegarder l'analyse
    await prisma.analyseIA.create({
      data: {
        dossierId,
        type: 'RISQUE',
        resultat: result.analyse,
        recommandation: result.recommandation,
        scoreRisque: result.scoreRisque,
      },
    })

    return NextResponse.json(result)
  }

  // Analyse de masse des dossiers à risque
  if (action === 'analyser_tous') {
    const dossiers = await prisma.dossier.findMany({
      where: { statut: { in: ['EN_COURS', 'LITIGIEUX'] } },
      include: { actions: { orderBy: { date: 'desc' }, take: 5 } },
      orderBy: { dateEcheance: 'asc' },
      take: 20,
    })

    const analyses = []
    for (const d of dossiers) {
      const historique = d.actions.map(a => a.description)
      const result = await analyserDossier(d as any, historique)
      analyses.push({ dossier: d, ...result })
    }

    return NextResponse.json({ analyses: analyses.sort((a, b) => b.scoreRisque - a.scoreRisque) })
  }

  return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
}
