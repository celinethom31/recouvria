// src/app/api/parametres/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const params = await prisma.parametre.findMany({ orderBy: { cle: 'asc' } })
  return NextResponse.json(params)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, string>
  const ops = Object.entries(body).map(([cle, valeur]) =>
    prisma.parametre.upsert({
      where: { cle },
      update: { valeur },
      create: { cle, valeur },
    })
  )
  await Promise.all(ops)
  return NextResponse.json({ ok: true })
}
