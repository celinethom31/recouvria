// src/app/api/parametres/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, textToHtml } from '@/lib/brevo'
import { sendSms } from '@/lib/mtarget'

export async function POST(req: NextRequest) {
  const { service, email, phone } = await req.json()

  if (service === 'brevo') {
    try {
      await sendEmail({
        to: email,
        toName: 'Test',
        subject: 'Test de connexion RecouvrIA',
        htmlContent: textToHtml('Ceci est un message de test envoyé depuis RecouvrIA.\n\nLa connexion Brevo fonctionne correctement.'),
      })
      return NextResponse.json({ ok: true })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message })
    }
  }

  if (service === 'mtarget') {
    try {
      await sendSms({ to: phone, message: 'Test RecouvrIA : connexion mTarget OK.' })
      return NextResponse.json({ ok: true })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message })
    }
  }

  return NextResponse.json({ ok: false, error: 'Service inconnu' }, { status: 400 })
}
