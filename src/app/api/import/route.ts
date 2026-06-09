// src/app/api/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { importFromExcel, previewExcel } from '@/lib/importExcel'

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const mappingRaw = formData.get('mapping') as string | null
  const scenarioId = formData.get('scenarioId') as string | null
  const preview = formData.get('preview') === 'true'

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  if (preview) {
    const data = previewExcel(buffer)
    return NextResponse.json(data)
  }

  if (!mappingRaw) return NextResponse.json({ error: 'Mapping manquant' }, { status: 400 })

  const mapping = JSON.parse(mappingRaw)
  const result = await importFromExcel(buffer, mapping, scenarioId || undefined)

  return NextResponse.json(result)
}
