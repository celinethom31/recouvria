// src/app/api/cron/route.ts
// Déclencher via un cron externe (cPanel, Vercel Cron, etc.)
// Appel : GET /api/cron?secret=VOTRE_SECRET
import { NextRequest, NextResponse } from 'next/server'
import { runScenarioEngine } from '@/lib/scenarioEngine'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const start = Date.now()
  const result = await runScenarioEngine()
  const duration = Date.now() - start

  console.log(`[CRON] Moteur scénarios terminé en ${duration}ms`, result)
  return NextResponse.json({ ...result, durationMs: duration })
}
