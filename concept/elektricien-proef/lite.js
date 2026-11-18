/* Vervangt de React-eilanden: zelfde animaties en gedrag, zonder framework */
(function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var E1 = 'cubic-bezier(.22,1,.36,1)', E2 = 'cubic-bezier(.16,1,.3,1)';
  var d = document;

  /* 1. Inschuiven bij scrollen (once, marge -80px onder) */
  var items = [];
  d.querySelectorAll('[style]').forEach(function (el) {
    var s = el.getAttribute('style').replace(/\s/g, '');
    var type = null;
    if (/^opacity:0;transform:translateY\(16px\);?$/.test(s)) type = 'up';
    else if (/^transform:translateY\(115%\);?$/.test(s)) type = 'line';
    else if (/^opacity:0;transform:scale\(1\.04\);?$/.test(s)) type = 'scale';
    if (!type) return;
    if (el.closest('section.p-2')) return; /* hero animeert al via CSS */
    items.push({ el: el, type: type });
  });
  function show(it, delay) {
    var el = it.el, t = it.type;
    if (RM) { el.style.transition = 'opacity .5s'; el.style.opacity = 1; el.style.transform = 'none'; return; }
    var dur = t === 'up' ? .5 : .7, ease = t === 'line' ? E2 : E1;
    el.style.transition = 'opacity ' + dur + 's ' + ease + ' ' + delay + 's, transform ' + dur + 's ' + ease + ' ' + delay + 's';
    if (t !== 'line') el.style.opacity = 1;
    el.style.transform = 'none';
  }
  if (RM) items.forEach(function (it) { if (it.type === 'line') { it.el.style.transform = 'none'; it.el.style.opacity = 0; } });
  var io = new IntersectionObserver(function (es) {
    var batch = es.filter(function (e) { return e.isIntersecting; });
    batch.forEach(function (e, i) {
      io.unobserve(e.target);
      var it = e.target.__it; if (!it) return;
      var base = it.type === 'line' ? 0 : Math.min(i, 6) * .06;
      requestAnimationFrame(function () { show(it, base); });
    });
  }, { rootMargin: '0px 0px -80px 0px' });
  items.forEach(function (it) {
    var target = it.type === 'line' ? (it.el.parentElement || it.el) : it.el;
    target.__it = it; io.observe(target);
  });

  /* 2. Hero-video zoomt rustig uit */
  var hv = d.querySelector('section.p-2 [style*="scale(1.12)"]');
  if (hv) {
    if (RM) hv.style.transform = 'none';
    else requestAnimationFrame(function () { hv.style.transition = 'transform 1.8s ' + E1; hv.style.transform = 'scale(1)'; });
  }

  /* 3. Koppen passend maken: maximaal 2 regels */
  function fit(h) {
    var p = h.parentElement, last = -1;
    function run() {
      var w = p ? p.clientWidth : innerWidth; if (w === last) return; last = w;
      h.style.fontSize = '';
      var cs = getComputedStyle(h), fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || fs * 1.2;
      if (!fs || !lh) return;
      var max = lh * 2 + 2, min = fs * .6, n = fs;
      while (h.getBoundingClientRect().height > max && n > min) { n = Math.max(min, n - 1); h.style.fontSize = n + 'px'; }
    }
    run(); if (d.fonts && d.fonts.ready) d.fonts.ready.then(run);
    new ResizeObserver(run).observe(p || h);
  }
  d.querySelectorAll('section h2.tracking-tight.text-balance').forEach(fit);

  /* 4. Uitklappen (een per groep open) */
  d.querySelectorAll('[data-slot="accordion"]').forEach(function (acc) {
    var its = acc.querySelectorAll(':scope > [data-slot="accordion-item"]');
    function set(item, open) {
      var btn = item.querySelector('[data-slot="accordion-trigger"]'), c = item.querySelector('[data-slot="accordion-content"]'), h3 = btn && btn.parentElement;
      var st = open ? 'open' : 'closed';
      [item, h3, btn, c].forEach(function (x) { if (x) x.setAttribute('data-state', st); });
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!c) return;
      if (open) {
        c.hidden = false;
        if (!c.firstElementChild && window.__ANS) {
          var q = (btn.textContent || '').trim(), t = window.__ANS[q];
          if (t) { var inn = d.createElement('div'); inn.className = window.__ACLS; inn.textContent = t; c.appendChild(inn); }
        }
        var inner = c.firstElementChild;
        if (inner) { inner.style.height = 'auto'; var hh = inner.getBoundingClientRect().height; inner.style.height = ''; c.style.setProperty('--radix-accordion-content-height', hh + 'px'); }
      } else {
        c.style.setProperty('--radix-accordion-content-height', c.scrollHeight + 'px');
        clearTimeout(c.__t);
        c.__t = setTimeout(function () { if (c.getAttribute('data-state') === 'closed') c.hidden = true; }, RM ? 0 : 220);
      }
    }
    its.forEach(function (item) {
      var btn = item.querySelector('[data-slot="accordion-trigger"]'); if (!btn) return;
      btn.addEventListener('click', function () {
        var open = item.getAttribute('data-state') === 'open';
        its.forEach(function (o) { if (o !== item && o.getAttribute('data-state') === 'open') set(o, false); });
        set(item, !open);
      });
    });
  });

  /* 5. Menu: lijn onder de actieve of aangewezen link */
  var ul = d.querySelector('header nav ul');
  if (ul) {
    var links = [].slice.call(ul.querySelectorAll('a[href*="#"]'));
    var line = d.createElement('span');
    line.setAttribute('aria-hidden', 'true');
    line.className = 'absolute -bottom-1.5 left-0 h-px w-full bg-accent';
    var active = null, hover = null;
    function paint() {
      var cur = hover || active;
      links.forEach(function (a) {
        var on = a === active;
        a.classList.toggle('text-foreground', on); a.classList.toggle('text-foreground/75', !on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      if (cur) cur.appendChild(line); else if (line.parentNode) line.parentNode.removeChild(line);
    }
    links.forEach(function (a) { a.addEventListener('mouseenter', function () { hover = a; paint(); }); });
    ul.addEventListener('mouseleave', function () { hover = null; paint(); });
    var seen = new Map(), ids = links.map(function (a) { return a.getAttribute('href').split('#')[1]; });
    var secs = ids.map(function (id) { return d.getElementById(id); }).filter(Boolean);
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen.set(e.target.id, e.isIntersecting); });
      var id = ids.find(function (i) { return seen.get(i); });
      active = id ? links[ids.indexOf(id)] : null; paint();
    }, { rootMargin: '-30% 0px -55% 0px' });
    secs.forEach(function (s) { nio.observe(s); });
  }

  /* 6. Belbalk onderin na 800px scrollen (mobiel) */
  var bar = d.querySelector('div.pointer-events-none.fixed.inset-x-0.bottom-0');
  if (bar) {
    var shown = null;
    function onScroll() {
      var s = scrollY > 800; if (s === shown) return; shown = s;
      bar.classList.toggle('translate-y-0', s); bar.classList.toggle('opacity-100', s);
      bar.classList.toggle('translate-y-full', !s); bar.classList.toggle('opacity-0', !s);
      if (s) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    }
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
  }
})();
