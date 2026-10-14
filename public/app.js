(function () {
  var FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩'
  function latin(s) {
    return s.replace(/[۰-۹]/g, function (d) { return FA.indexOf(d) }).replace(/[٠-٩]/g, function (d) { return AR.indexOf(d) }).replace(/٫/g, '.')
  }
  function fmt(s) {
    s = latin(s)
    var neg = /^\s*-/.test(s)
    var parts = s.replace(/[^\d.]/g, '').split('.')
    var i = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return (neg ? '-' : '') + i + (parts.length > 1 ? '.' + parts.slice(1).join('') : '')
  }
  document.addEventListener('input', function (e) {
    var el = e.target
    if (!el.classList || !el.classList.contains('money')) return
    var atEnd = el.selectionStart === el.value.length
    var digitsBefore = latin(el.value.slice(0, el.selectionStart)).replace(/[^\d.]/g, '').length
    el.value = fmt(el.value)
    if (atEnd) return
    var n = 0, pos = 0
    while (pos < el.value.length && n < digitsBefore) { if (/[\d.]/.test(el.value[pos])) n++; pos++ }
    el.setSelectionRange(pos, pos)
  })
  document.addEventListener('submit', function (e) {
    var f = e.target
    if (f.dataset && f.dataset.confirm && !window.confirm(f.dataset.confirm)) { e.preventDefault(); return }
    f.querySelectorAll('.money').forEach(function (i) { i.value = latin(i.value).replace(/[,٬،]/g, '') })
  })

  // ---- Fullscreen. Browsers leave fullscreen when a new page loads, so while fullscreen
  // links and forms are fetched and swapped in place (same server, same session).
  var fsOn = function () { return !!document.fullscreenElement }
  function syncFs() {
    var b = document.getElementById('fs')
    if (!b) return
    b.hidden = !document.fullscreenEnabled
    b.textContent = fsOn() ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'
  }
  function swap(res, push) {
    return res.text().then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html')
      document.title = doc.title
      document.body.innerHTML = doc.body.innerHTML
      if (push) history.pushState({}, '', res.url)
      window.scrollTo(0, 0)
      syncFs()
    })
  }
  function go(url, opts, push) {
    var o = Object.assign({ credentials: 'same-origin', headers: {} }, opts)
    o.headers = Object.assign({ Accept: 'text/html' }, o.headers)
    return fetch(url, o)
      .then(function (r) {
        if (!/text\/html/.test(r.headers.get('content-type') || '')) { location.href = url; return }
        return swap(r, push)
      })
      .catch(function () { location.href = url })
  }
  document.addEventListener('click', function (e) {
    var t = e.target
    if (t.closest && t.closest('#fs')) {
      if (fsOn()) document.exitFullscreen()
      else document.documentElement.requestFullscreen()
      return
    }
    if (!fsOn() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
    var a = t.closest && t.closest('a[href]')
    if (!a || a.target || a.origin !== location.origin || a.hasAttribute('download')) return
    e.preventDefault()
    go(a.href, {}, true)
  })
  document.addEventListener('submit', function (e) {
    if (!fsOn() || e.defaultPrevented) return
    var f = e.target
    if (f.action && new URL(f.action, location.href).origin !== location.origin) return
    e.preventDefault()
    var multi = f.enctype === 'multipart/form-data'
    var data = multi ? new FormData(f) : new URLSearchParams(new FormData(f))
    if ((f.method || 'get').toUpperCase() === 'GET') go(f.action + '?' + data, {}, true)
    else go(f.action, multi ? { method: 'POST', body: data } : { method: 'POST', body: data, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, true)
  })
  window.addEventListener('popstate', function () { if (fsOn()) go(location.href, {}, false) })
  document.addEventListener('fullscreenchange', syncFs)
  syncFs()
})()
