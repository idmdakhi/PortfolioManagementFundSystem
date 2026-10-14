import edge from 'edge.js'
import { faDigits, toJalaliStr } from '#services/jalali'
import { optionsOf, optLabel, ENGINES } from '#services/options'

const n0 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 })
const n2 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 })
const latin = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })

edge.global('fa', (n: number | bigint) => n0.format(Math.round(Number(n ?? 0))))
edge.global('fa2', (n: number) => n2.format(n ?? 0))
edge.global('pct', (n: number) => `٪${n2.format(n ?? 0)}`)
/** Thousands-separated Latin digits for input fields. */
edge.global('money', (n: number | bigint | null | undefined) => (n === null || n === undefined ? '' : latin.format(Math.round(Number(n)))))
edge.global('jd', (iso: string) => (iso ? faDigits(toJalaliStr(iso)) : ''))
edge.global('jraw', (iso: string) => (iso ? toJalaliStr(iso) : ''))
edge.global('cls', (n: number) => (n >= 0 ? 'pos' : 'neg'))
edge.global('typeFa', (t: string) => optLabel('label', 'tx.' + t))
edge.global('divFa', (s: string) => optLabel('label', 'div.' + s))
edge.global('areaTypeFa', (t: string) => optLabel('label', 'area.' + t))
edge.global('kindFa', (k: string) => optLabel('area_kind', k))
edge.global('opts', (list: string) => optionsOf(list))
edge.global('optAll', (list: string) => optionsOf(list, false))
edge.global('optLabel', optLabel)
edge.global('engineFa', (e: string) => ENGINES[e] ?? e)
edge.global('engines', () => Object.entries(ENGINES).map(([value, label]) => ({ value, label })))
