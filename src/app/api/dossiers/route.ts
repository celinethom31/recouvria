// src/app/api/dossiers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const DossierSchema = z.object({
  debiteurNom: z.string().min(1),
  debiteurEmail: z.string().email().optional().nullable(),
  debiteurTel: z.string().optional().nullable(),
  debiteurAdresse: z.string().optional().nullable(),
  debiteurType: z.enum(['PARTICULIER', 'ENTREPRISE']).default('PARTICULIER'),
  montantInitial: z.number().positive(),
  dateEcheance: z.string(),
  scenarioId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const statut = searchParams.get('statut')
  const search = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: any = {}
  if (statut && statut !== 'TOUS') where.statut = statut
  if (search) {
    where.OR = [
      { debiteurNom: { contains: search, mode: 'insensitive' } },
      { reference: { contains: search, mode: 'insensitive' } },
      { debiteurEmail: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [dossiers, total] = await Promise.all([
    prisma.dossier.findMany({
      where,
      include: {
        scenario: { select: { id: true, nom: true } },
        _count: { select: { envois: true, actions: true } },
      },
      orderBy: [{ priorite: 'desc' }, { dateEcheance: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dossier.count({ where }),
  ])

  return NextResponse.json({ dossiers, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = DossierSchema.parse(body)

  // Générer une référence unique
  const count = await prisma.dossier.count()
  const reference = `DOS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const dossier = await prisma.dossier.create({
    data: {
      ...data,
      reference,
      montantRestant: data.montantInitial,
      dateEcheance: new Date(data.dateEcheance),
    },
  })

  await prisma.action.create({
    data: { dossierId: dossier.id, type: 'CREATION', description: 'Dossier créé manuellement' }
  })

  return NextResponse.json(dossier, { status: 201 })
}
