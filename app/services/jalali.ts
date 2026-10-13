import * as jalaali from 'jalaali-js'
import { DateTime } from 'luxon'

const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

/** Persian/Arabic digits to Latin digits. */
export function latinDigits(s: string) {
  return s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
}

export function faDigits(s: string) {
  return s.replace(/\d/g, (d) => FA[Number(d)])
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "1404/12/29" (Persian or Latin digits) to ISO "2026-03-20". Null when invalid. */
export function parseJalali(input: string | null | undefined): string | null {
  if (!input) return null
  const m = latinDigits(input).trim().match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)
  if (!m) return null
  const [jy, jm, jd] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) return null
  const g = jalaali.toGregorian(jy, jm, jd)
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`
}

/** ISO "2026-03-20" to "1404/12/29" (Latin digits). */
export function toJalaliStr(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const j = jalaali.toJalaali(y, m, d)
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`
}

export const todayIso = () => DateTime.now().toISODate()!
export const todayJalali = () => toJalaliStr(todayIso())
export const addDays = (iso: string, n: number) => DateTime.fromISO(iso).plus({ days: n }).toISODate()!

/** First and last ISO day of a Jalali year. */
export function yearRange(jy: number) {
  const s = jalaali.toGregorian(jy, 1, 1)
  const e = jalaali.toGregorian(jy, 12, jalaali.jalaaliMonthLength(jy, 12))
  return { start: `${s.gy}-${pad(s.gm)}-${pad(s.gd)}`, end: `${e.gy}-${pad(e.gm)}-${pad(e.gd)}` }
}

export const jalaliYear = (iso: string) => Number(toJalaliStr(iso).slice(0, 4))
