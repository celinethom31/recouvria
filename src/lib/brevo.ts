// src/lib/brevo.ts
interface SendEmailParams {
  to: string
  toName: string
  subject: string
  htmlContent: string
  textContent?: string
  fromEmail?: string
  fromName?: string
  attachments?: Array<{ name: string; content: string; type: string }>
}

interface BrevoResponse {
  messageId?: string
  error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<BrevoResponse> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY non configurée')

  const fromEmail = params.fromEmail || process.env.BREVO_FROM_EMAIL || 'noreply@monentreprise.fr'
  const fromName = params.fromName || process.env.BREVO_FROM_NAME || 'Mon Entreprise'

  const body: any = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: params.to, name: params.toName }],
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent || stripHtml(params.htmlContent),
  }

  if (params.attachments?.length) {
    body.attachment = params.attachments.map(a => ({
      name: a.name,
      content: a.content,
      type: a.type,
    }))
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || `Brevo error ${res.status}`)
  }

  return { messageId: data.messageId }
}

export function textToHtml(text: string): string {
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
    ${text.split('\n').map(line =>
      line.trim() === '' ? '<br>' : `<p style="margin: 0 0 8px;">${escapeHtml(line)}</p>`
    ).join('\n')}
  </div>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}
