// src/app/api/dossiers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const dossier = await prisma.dossier.findUnique({
    where: { id: params.id },
    include: {
      scenario: { include: { etapes: { orderBy: { ordre: 'asc' } } } },
      actions: { orderBy: { date: 'desc' } },
      envois: { orderBy: { dateCreation: 'desc' } },
      analyses: { orderBy: { date: 'desc' }, take: 5 },
    },
  })
  if (!dossier) return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
  return NextResponse.json(dossier)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { statut, priorite, notes, montantRestant, scenarioId, tags } = body

  const updateData: any = {}
  if (statut) updateData.statut = statut
  if (priorite) updateData.priorite = priorite
  if (notes !== undefined) updateData.notes = notes
  if (montantRestant !== undefined) updateData.montantRestant = montantRestant
  if (scenarioId !== undefined) updateData.scenarioId = scenarioId
  if (tags) updateData.tags = tags

  const dossier = await prisma.dossier.update({ where: { id: params.id }, data: updateData })

  if (statut) {
    await prisma.action.create({
      data: {
        dossierId: params.id,
        type: 'CHANGEMENT_STATUT',
        description: `Statut changé en ${statut}`,
      }
    })
  }

  return NextResponse.json(dossier)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.dossier.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
