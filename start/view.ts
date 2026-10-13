import edge from 'edge.js'

const n0 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 })
const n2 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 })
const jd = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' })

edge.global('fa', (n: number) => n0.format(Math.round(n ?? 0)))
edge.global('fa2', (n: number) => n2.format(n ?? 0))
edge.global('jdate', (s: string) => jd.format(new Date(s)))
edge.global('cls', (n: number) => (n >= 0 ? 'pos' : 'neg'))
