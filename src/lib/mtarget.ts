// src/lib/mtarget.ts
// Documentation API mTarget : https://www.mtarget.fr/api-sms/

interface SendSmsParams {
  to: string       // numéro au format international 33XXXXXXXXX
  message: string
  expediteur?: string
  campagne?: string
}

interface MTargetResponse {
  messageId?: string
  status?: string
  error?: string
}

function normalizePhone(phone: string): string {
  // Normalise 06... / 07... → 336... / 337...
  let p = phone.replace(/[\s\-\.]/g, '')
  if (p.startsWith('0')) p = '33' + p.slice(1)
  if (p.startsWith('+')) p = p.slice(1)
  return p
}

export async function sendSms(params: SendSmsParams): Promise<MTargetResponse> {
  const login = process.env.MTARGET_LOGIN
  const password = process.env.MTARGET_PASSWORD
  const defaultExp = process.env.MTARGET_EXPEDITEUR || 'RECOUVR'

  if (!login || !password) throw new Error('MTARGET_LOGIN / MTARGET_PASSWORD non configurés')

  const phone = normalizePhone(params.to)
  const expediteur = (params.expediteur || defaultExp).slice(0, 11)

  // mTarget accepte un appel HTTP GET ou POST
  const url = new URL('https://api-sms.mtarget.fr/msgs')
  url.searchParams.set('login', login)
  url.searchParams.set('pwd', password)
  url.searchParams.set('nbsms', '1')
  url.searchParams.set('msisdn', phone)
  url.searchParams.set('msg', params.message)
  url.searchParams.set('senderid', expediteur)
  if (params.campagne) url.searchParams.set('campagne', params.campagne)

  const res = await fetch(url.toString())
  const text = await res.text()

  // mTarget retourne un code : 0=OK, autres=erreur
  if (text.startsWith('0;')) {
    const parts = text.split(';')
    return { messageId: parts[1]?.trim(), status: 'ENVOYE' }
  }

  // Codes d'erreur courants
  const errorCodes: Record<string, string> = {
    '1': 'Erreur paramètre',
    '2': 'Authentification échouée',
    '3': 'Crédit insuffisant',
    '4': 'Numéro invalide',
    '11': 'Message trop long',
  }
  const code = text.split(';')[0]
  throw new Error(`mTarget erreur ${code}: ${errorCodes[code] || text}`)
}

// Vérifier le solde de crédits SMS
export async function getSolde(): Promise<number> {
  const login = process.env.MTARGET_LOGIN
  const password = process.env.MTARGET_PASSWORD
  if (!login || !password) return -1

  const url = new URL('https://api-sms.mtarget.fr/credits')
  url.searchParams.set('login', login)
  url.searchParams.set('pwd', password)

  const res = await fetch(url.toString())
  const text = await res.text()
  return parseInt(text, 10) || 0
}
