import type { HttpContext } from '@adonisjs/core/http'
import Option from '#models/option'
import Area from '#models/area'
import Movement from '#models/movement'
import { loadState } from '#services/fund_state'
import { invalidateOptions, loadOptions, ENGINES } from '#services/options'

const EDITABLE = ['area_kind', 'external_place', 'split_method']

/** Collects per-investor weights from fields named w_<investorId>. */
function readWeights(b: Record<string, unknown>) {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(b)) {
    if (!k.startsWith('w_')) continue
    const n = Number(v)
    if (v !== '' && n > 0) out[k.slice(2)] = n
  }
  return out
}

export default class OptionsController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    await loadOptions()
    const all = await Option.query().orderBy('sort').orderBy('id')
    const lists = (name: string) =>
      all.filter((o) => o.list === name).map((o) => ({
        ...o.serialize(),
        extra: o.extra ? JSON.parse(o.extra) : {},
      }))
    return view.render('pages/options', {
      nav: 'op', st,
      kinds: lists('area_kind'), places: lists('external_place'),
      methods: lists('split_method'), labels: lists('label'),
    })
  }

  async store({ request, response, session }: HttpContext) {
    const b = request.all()
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/options')
    }
    const list = String(b.list)
    const label = String(b.label || '').trim()
    if (!EDITABLE.includes(list)) return fail('فهرست نامعتبر است.')
    if (!label) return fail('عنوان را وارد کنید.')
    let extra: string | null = null
    if (list === 'split_method') {
      const engine = String(b.engine)
      if (!ENGINES[engine]) return fail('مبنای تقسیم نامعتبر است.')
      const roundTo = Math.max(1, Math.round(Number(b.roundTo) || 1))
      const weights = engine === 'weight' ? readWeights(b) : undefined
      extra = JSON.stringify({ engine, roundTo, ...(weights && Object.keys(weights).length ? { weights } : {}) })
    }
    const last = await Option.query().where('list', list).orderBy('sort', 'desc').first()
    await Option.create({
      list, value: 'c' + Date.now().toString(36), label, extra, active: true, builtin: false, sort: (last?.sort ?? 0) + 1,
    })
    invalidateOptions()
    session.flash('ok', 'اضافه شد.')
    return response.redirect('/options')
  }

  async update({ request, params, response, session }: HttpContext) {
    const b = request.all()
    const o = await Option.find(Number(params.id))
    if (!o) {
      session.flash('error', 'مورد پیدا نشد.')
      return response.redirect('/options')
    }
    const label = String(b.label || '').trim()
    if (!label) {
      session.flash('error', 'عنوان نمی‌تواند خالی باشد.')
      return response.redirect('/options')
    }
    o.label = label
    if (o.list !== 'label') {
      o.sort = Math.round(Number(b.sort) || 0)
      o.active = b.active === 'on'
    }
    if (o.list === 'split_method') {
      const cur = o.extra ? JSON.parse(o.extra) : {}
      const weights = cur.engine === 'weight' ? readWeights(b) : undefined
      o.extra = JSON.stringify({
        engine: cur.engine, roundTo: Math.max(1, Math.round(Number(b.roundTo) || 1)),
        ...(weights && Object.keys(weights).length ? { weights } : {}),
      })
    }
    if (o.list === 'split_method' && !o.active) {
      const others = await Option.query().where('list', 'split_method').where('active', true).whereNot('id', o.id).first()
      if (!others) {
        session.flash('error', 'حداقل یک روش تقسیم باید فعال بماند.')
        return response.redirect('/options')
      }
    }
    await o.save()
    invalidateOptions()
    session.flash('ok', 'ذخیره شد.')
    return response.redirect('/options')
  }

  async destroy({ params, response, session }: HttpContext) {
    const o = await Option.find(Number(params.id))
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect('/options')
    }
    if (!o) return fail('مورد پیدا نشد.')
    if (o.list === 'label' || o.builtin) return fail('گزینه‌های پیش‌فرض حذف نمی‌شوند؛ می‌توانید عنوانشان را عوض یا غیرفعالشان کنید.')
    let used = false
    if (o.list === 'area_kind') used = !!(await Area.query().where('kind', o.value).first())
    if (o.list === 'external_place') {
      used = !!(await Movement.query().where('from_ref', `ext:${o.value}`).orWhere('to_ref', `ext:${o.value}`).first())
    }
    if (o.list === 'split_method') used = !!(await Movement.query().where('method', o.value).first())
    if (used) return fail('این مورد در داده‌ها استفاده شده است؛ به‌جای حذف، غیرفعالش کنید.')
    await o.delete()
    invalidateOptions()
    session.flash('ok', 'حذف شد.')
    return response.redirect('/options')
  }
}
