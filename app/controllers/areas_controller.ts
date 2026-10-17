import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Area from '#models/area'
import { loadState } from '#services/fund_state'
import { findOption } from '#services/options'
import Movement from '#models/movement'
import { parseJalali, todayIso, todayJalali } from '#services/jalali'

const areaValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  kind: vine.string().trim(),
  notes: vine.string().trim().optional(),
})
const valuedValidator = vine.create({ marketValue: vine.number().min(0), valuedOn: vine.string().trim().optional() })

export default class AreasController {
  async index({ view }: HttpContext) {
    const st = await loadState()
    const names = new Map(st.investors.map((i) => [i.id, i.name]))
    return view.render('pages/areas', { nav: 'ar', st, names, today: todayJalali() })
  }

  async store({ request, response, session }: HttpContext) {
    const d = await request.validateUsing(areaValidator)
    if (!findOption('area_kind', d.kind)?.active) {
      session.flash('error', 'نوع حوزه معتبر نیست.')
      return response.redirect('/areas')
    }
    await Area.create({ name: d.name, kind: d.kind, notes: d.notes ?? null, marketValue: 0 })
    session.flash('ok', 'حوزهٔ سرمایه‌گذاری اضافه شد.')
    return response.redirect('/areas')
  }

  async valuation({ request, params, response, session }: HttpContext) {
    const d = await request.validateUsing(valuedValidator)
    const area = await Area.find(Number(params.id))
    const on = d.valuedOn ? parseJalali(d.valuedOn) : todayIso()
    if (!area || !on) {
      session.flash('error', !area ? 'حوزه پیدا نشد.' : 'تاریخ شمسی معتبر نیست.')
    } else {
      area.marketValue = Math.round(d.marketValue)
      area.valuedOn = on
      await area.save()
      session.flash('ok', 'ارزش حوزه به‌روز شد.')
    }
    return response.redirect('/areas')
  }

  async edit({ view, params, response, session }: HttpContext) {
    const area = await Area.find(Number(params.id))
    if (!area) {
      session.flash('error', 'حوزه پیدا نشد.')
      return response.redirect('/areas')
    }
    return view.render('pages/area_edit', { nav: 'ar', area })
  }

  async update({ request, params, response, session }: HttpContext) {
    const d = await request.validateUsing(areaValidator)
    const area = await Area.find(Number(params.id))
    if (!area) {
      session.flash('error', 'حوزه پیدا نشد.')
      return response.redirect('/areas')
    }
    if (d.kind !== area.kind && !findOption('area_kind', d.kind)?.active) {
      session.flash('error', 'نوع حوزه معتبر نیست.')
      return response.redirect(`/areas/${area.id}/edit`)
    }
    area.merge({ name: d.name, kind: d.kind, notes: d.notes ?? null })
    await area.save()
    session.flash('ok', 'حوزه ویرایش شد.')
    return response.redirect('/areas')
  }

  async destroy({ params, response, session }: HttpContext) {
    const area = await Area.find(Number(params.id))
    const fail = (m: string) => {
      session.flash('error', m)
      return response.redirect(`/areas/${params.id}/edit`)
    }
    if (!area) return fail('حوزه پیدا نشد.')
    const st = await loadState()
    if (st.areaEntries.some((e) => e.areaId === area.id)) return fail('این حوزه واریز یا برداشت دارد. ابتدا گروه‌های مربوط را در «حرکت گروهی» حذف کنید.')
    const ref = `area:${area.id}`
    if (await Movement.query().where('from_ref', ref).orWhere('to_ref', ref).first()) return fail('این حوزه در تاریخچهٔ حرکت‌ها استفاده شده است.')
    await area.delete()
    session.flash('ok', 'حوزه حذف شد.')
    return response.redirect('/areas')
  }
}
