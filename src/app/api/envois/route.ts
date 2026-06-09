// src/app/api/envois/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, textToHtml } from '@/lib/brevo'
import { sendSms } from '@/lib/mtarget'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const canal = searchParams.get('canal')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50

  const where: any = {}
  if (canal) where.canal = canal

  const [envois, total] = await Promise.all([
    prisma.envoi.findMany({
      where,
      include: { dossier: { select: { reference: true, debiteurNom: true } } },
      orderBy: { dateCreation: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.envoi.count({ where }),
  ])

  return NextResponse.json({ envois, total })
}

// Envoi manuel d'un email ou SMS
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { dossierId, canal, sujet, contenu } = body

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier) return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })

  const params = await prisma.parametre.findMany()
  const p = Object.fromEntries(params.map(x => [x.cle, x.valeur]))

  let messageId: string | undefined

  try {
    if (canal === 'EMAIL') {
      if (!dossier.debiteurEmail) throw new Error('Email débiteur manquant')
      const res = await sendEmail({
        to: dossier.debiteurEmail,
        toName: dossier.debiteurNom,
        subject: sujet,
        htmlContent: textToHtml(contenu),
        fromEmail: p['SOCIETE_EMAIL'],
        fromName: p['SOCIETE_NOM'],
      })
      messageId = res.messageId
    } else if (canal === 'SMS') {
      if (!dossier.debiteurTel) throw new Error('Téléphone débiteur manquant')
      const res = await sendSms({ to: dossier.debiteurTel, message: contenu.slice(0, 160) })
      messageId = res.messageId
    }

    const envoi = await prisma.envoi.create({
      data: {
        dossierId,
        canal,
        destinataire: canal === 'EMAIL' ? dossier.debiteurEmail! : dossier.debiteurTel!,
        sujet: canal === 'EMAIL' ? sujet : null,
        contenu,
        statut: 'ENVOYE',
        dateEnvoi: new Date(),
        messageId,
        metadata: { manuel: true },
      },
    })

    await prisma.action.create({
      data: {
        dossierId,
        type: canal === 'EMAIL' ? 'EMAIL_ENVOYE' : 'SMS_ENVOYE',
        description: `${canal} manuel envoyé${sujet ? ` : ${sujet}` : ''}`,
      },
    })

    return NextResponse.json(envoi)
  } catch (err: any) {
    await prisma.envoi.create({
      data: {
        dossierId,
        canal,
        destinataire: canal === 'EMAIL' ? (dossier.debiteurEmail || '') : (dossier.debiteurTel || ''),
        contenu,
        statut: 'ERREUR',
        erreur: err.message,
        metadata: { manuel: true },
      },
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
