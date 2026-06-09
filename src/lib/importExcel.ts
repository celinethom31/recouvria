// src/lib/importExcel.ts
import * as XLSX from 'xlsx'
import { prisma } from './prisma'
import { parse, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface ColMapping {
  debiteurNom: string
  debiteurEmail?: string
  debiteurTel?: string
  debiteurAdresse?: string
  debiteurType?: string
  montantInitial: string
  dateEcheance: string
  reference?: string
  notes?: string
}

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{ ligne: number; erreur: string }>
  preview: any[]
}

function parseDate(val: any): Date | null {
  if (!val) return null
  // Date Excel sérialisée (nombre)
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d)
  }
  // Chaîne DD/MM/YYYY
  if (typeof val === 'string') {
    const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy']
    for (const fmt of formats) {
      const parsed = parse(val, fmt, new Date(), { locale: fr })
      if (isValid(parsed)) return parsed
    }
  }
  if (val instanceof Date && isValid(val)) return val
  return null
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const cleaned = val.replace(/[€\s]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    if (!isNaN(num)) return num
  }
  return 0
}

function generateRef(): string {
  const now = new Date()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `DOS-${now.getFullYear()}-${rand}`
}

export function previewExcel(buffer: Buffer): { columns: string[]; rows: any[][] } {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
  if (!data.length) return { columns: [], rows: [] }
  return {
    columns: data[0].map(String),
    rows: data.slice(1, 6),
  }
}

export async function importFromExcel(
  buffer: Buffer,
  mapping: ColMapping,
  scenarioId?: string
): Promise<ImportResult> {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]

  const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [], preview: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2

    try {
      const nom = String(row[mapping.debiteurNom] || '').trim()
      if (!nom) { result.errors.push({ ligne: lineNum, erreur: 'Nom débiteur manquant' }); result.skipped++; continue }

      const montant = parseAmount(row[mapping.montantInitial])
      if (!montant || montant <= 0) { result.errors.push({ ligne: lineNum, erreur: 'Montant invalide' }); result.skipped++; continue }

      const dateEch = parseDate(row[mapping.dateEcheance])
      if (!dateEch) { result.errors.push({ ligne: lineNum, erreur: 'Date échéance invalide' }); result.skipped++; continue }

      let reference = mapping.reference ? String(row[mapping.reference] || '').trim() : ''
      if (!reference) reference = generateRef()

      // Vérifier si la référence existe déjà
      const existing = await prisma.dossier.findUnique({ where: { reference } })
      if (existing) { result.skipped++; continue }

      const typeRaw = mapping.debiteurType ? String(row[mapping.debiteurType] || '').toUpperCase() : ''
      const debiteurType = typeRaw.includes('ENTREPRISE') || typeRaw.includes('SOCIETE') || typeRaw.includes('SAS') || typeRaw.includes('SARL') || typeRaw.includes('SCI')
        ? 'ENTREPRISE' : 'PARTICULIER'

      await prisma.dossier.create({
        data: {
          reference,
          debiteurNom: nom,
          debiteurEmail: mapping.debiteurEmail ? String(row[mapping.debiteurEmail] || '').trim() || null : null,
          debiteurTel: mapping.debiteurTel ? String(row[mapping.debiteurTel] || '').trim() || null : null,
          debiteurAdresse: mapping.debiteurAdresse ? String(row[mapping.debiteurAdresse] || '').trim() || null : null,
          debiteurType: debiteurType as any,
          montantInitial: montant,
          montantRestant: montant,
          dateEcheance: dateEch,
          statut: 'EN_COURS',
          scenarioId: scenarioId || null,
        }
      })

      await prisma.action.create({
        data: {
          dossierId: (await prisma.dossier.findUnique({ where: { reference } }))!.id,
          type: 'IMPORT',
          description: `Dossier importé depuis Excel (ligne ${lineNum})`,
          auteur: 'Import',
        }
      })

      result.imported++
    } catch (err: any) {
      result.errors.push({ ligne: lineNum, erreur: err.message })
      result.skipped++
    }
  }

  return result
}
