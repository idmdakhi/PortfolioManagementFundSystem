/** Tiny cookie-keeping HTTP client for the functional suite (no extra dependency). */
const BASE = `http://localhost:${process.env.PORT ?? '3334'}`

export class Client {
  private cookies = new Map<string, string>()
  lastHtml = ''

  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';')
      const i = pair.indexOf('=')
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1))
    }
  }
  private header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  async get(path: string) {
    const res = await fetch(BASE + path, { redirect: 'manual', headers: { cookie: this.header() } })
    this.store(res)
    this.lastHtml = res.status === 200 ? await res.text() : ''
    return { status: res.status, location: res.headers.get('location'), html: this.lastHtml, res }
  }

  private async token(page: string) {
    const { html } = await this.get(page)
    const m = html.match(/name='_csrf' value='([^']+)'/) ?? html.match(/name="_csrf" value="([^"]+)"/)
    if (!m) throw new Error(`no csrf token on ${page}`)
    return m[1]
  }

  /** POST a form. `from` is a page that contains a csrf field (and is the Referer, like a browser). */
  async post(path: string, body: Record<string, string>, from = '/login') {
    const _csrf = await this.token(from)
    const res = await fetch(BASE + path, {
      method: 'POST', redirect: 'manual',
      headers: { cookie: this.header(), 'content-type': 'application/x-www-form-urlencoded', referer: BASE + from },
      body: new URLSearchParams({ _csrf, ...body }),
    })
    this.store(res)
    return { status: res.status, location: res.headers.get('location') }
  }

  /** Follows a redirect with GET and returns the flash messages shown on that page. */
  async flashAfter(r: { location: string | null }) {
    if (!r.location) return []
    const p = await this.get(new URL(r.location, BASE).pathname + new URL(r.location, BASE).search)
    return [...p.html.matchAll(/class="flash[^"]*">([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  }

  async login(email: string, password: string) {
    return this.post('/login', { email, password })
  }
}
