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
})()
