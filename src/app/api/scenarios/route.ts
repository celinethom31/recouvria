// src/app/api/scenarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const scenarios = await prisma.scenario.findMany({
    include: {
      etapes: { orderBy: { ordre: 'asc' } },
      _count: { select: { dossiers: true } },
    },
    orderBy: { dateCreation: 'asc' },
  })
  return NextResponse.json(scenarios)
}

export async function POST(req: NextRequest) {
  const { nom, description, etapes } = await req.json()

  const scenario = await prisma.scenario.create({
    data: {
      nom,
      description,
      etapes: {
        create: etapes?.map((e: any, i: number) => ({
          ordre: i + 1,
          jourDeclenchement: e.jourDeclenchement,
          canal: e.canal,
          sujet: e.sujet || null,
          contenu: e.contenu || '',
          genererAvecIA: e.genererAvecIA || false,
        })) || [],
      },
    },
    include: { etapes: true },
  })

  return NextResponse.json(scenario, { status: 201 })
}
