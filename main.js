/* ============================================================
   MosaOS — Marketing-Site Interactivity
   ============================================================ */

(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------- 0. Intro-Sequenz Cleanup --------- */
  const intro = document.getElementById('intro');
  const finishIntro = () => {
    document.body.classList.remove('intro-active');
    document.body.classList.add('intro-done');
  };
  if (intro) {
    const INTRO_DURATION = reduced ? 100 : 3200;
    const timer = setTimeout(finishIntro, INTRO_DURATION);
    // Per Klick überspringen
    intro.addEventListener('click', () => {
      clearTimeout(timer);
      intro.style.animation = 'introFadeOut 0.4s var(--ease) forwards';
      finishIntro();
    });
  } else {
    finishIntro();
  }

  /* --------- 1. Sticky Nav --------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --------- 2. Scroll-Reveal --------- */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduced) {
      reveals.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              const delay = parseInt(el.dataset.revealDelay || '0', 10);
              setTimeout(() => el.classList.add('in'), delay);
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
      );
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* --------- 3. Hero Mosaic Parallax --------- */
  // Bewusst entfernt: das Logo-Mosaik bewegte sich früher mit der Maus mit
  // („zog" beim Mausbewegen). Auf Wunsch deaktiviert — das Mosaik bleibt statisch.

  /* --------- 4. Module-Mixer (branchen-spezifisch, i18n + Währung) --------- */
  // Preise sind Basis CHF. emoji + price hier, Name/Beschreibung kommen aus i18n (mod.<id>.name / .desc)
  const MODULES = {
    // Reinigung Basis
    route:       { emoji: '🗺️', price: 49 },
    kunden:      { emoji: '👥', price: 0 },
    team:        { emoji: '🧑‍💼', price: 0 },
    // Handwerk Basis
    auftraege:   { emoji: '🧱', price: 59 },
    // Immobilien Basis
    objekt:      { emoji: '🏢', price: 79 },
    interessent: { emoji: '🔎', price: 0 },
    // Add-ons
    anruf:       { emoji: '📞', price: 19 },
    aufgaben:    { emoji: '✅', price: 15 },
    buch:        { emoji: '📊', price: 29, tag: true },
    foto:        { emoji: '📷', price: 19 },
    email:       { emoji: '📧', price: 39 },
    lohn:        { emoji: '💰', price: 49, tag: true },
    abos:        { emoji: '🔁', price: 19 },
    nachkalk:    { emoji: '🧮', price: 19 },
    stunden:     { emoji: '⏱️', price: 19 },
    material:    { emoji: '📦', price: 29 },
    offerten:    { emoji: '📄', price: 25 },
    expose:      { emoji: '📄', price: 29 },
    matching:    { emoji: '🤝', price: 25 },
    besichtigung:{ emoji: '📅', price: 19 },
  };

  const BRANCHEN = {
    reinigung:  { basePrice: 49, base: ['route', 'kunden', 'team'],          addons: ['offerten', 'anruf', 'aufgaben', 'foto', 'stunden', 'abos', 'nachkalk', 'email', 'buch', 'lohn'] },
    werkstatt:  { basePrice: 59, base: ['auftraege', 'kunden', 'team'],      addons: ['offerten', 'stunden', 'material', 'foto', 'abos', 'email', 'buch', 'lohn'] },
    schaedling: { basePrice: 49, base: ['route', 'kunden', 'team'],          addons: ['offerten', 'aufgaben', 'foto', 'stunden', 'abos', 'email', 'buch'] },
    handwerk:   { basePrice: 59, base: ['auftraege', 'kunden', 'team'],      addons: ['stunden', 'material', 'offerten', 'aufgaben', 'buch', 'lohn'] },
    garten:     { basePrice: 59, base: ['auftraege', 'kunden', 'team'],      addons: ['stunden', 'material', 'offerten', 'aufgaben', 'abos', 'buch', 'lohn'] },
  };

  /* ----- Währung nach Region ----- */
  const CURRENCY = {
    CHF: { rate: 1,    locale: 'de-CH', code: 'CHF' },
    EUR: { rate: 1.05, locale: 'de-DE', code: 'EUR' },
    GBP: { rate: 0.90, locale: 'en-GB', code: 'GBP' },
    USD: { rate: 1.12, locale: 'en-US', code: 'USD' },
  };
  const REGION_CCY = {
    CH: 'CHF', LI: 'CHF',
    DE: 'EUR', AT: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', IE: 'EUR', LU: 'EUR', FI: 'EUR',
    GB: 'GBP', US: 'USD',
  };
  const getCurrency = () => {
    let region = 'CH';
    try { region = (window.MOSAOS_I18N && window.MOSAOS_I18N.detectRegion()) || 'CH'; } catch {}
    return CURRENCY[REGION_CCY[region] || 'CHF'] || CURRENCY.CHF;
  };
  // CHF-Betrag in Anzeigewährung umrechnen (auf ganze Zahl gerundet)
  const conv = (chf) => {
    const c = getCurrency();
    return Math.round(chf * c.rate);
  };
  const fmtMoney = (chf) => {
    const c = getCurrency();
    const val = conv(chf);
    try {
      return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code, maximumFractionDigits: 0 }).format(val);
    } catch {
      return c.code + ' ' + val;
    }
  };

  const priceEl = document.getElementById('mixerPrice');
  const currEl = document.querySelector('.summary-price .curr');
  const activeEl = document.getElementById('mixerActive');
  const contentEl = document.getElementById('mixerContent');
  const tabBtns = document.querySelectorAll('.branche-tab');

  let currentBranche = 'reinigung';

  const t = (key, fallback) => {
    try {
      const lang = document.documentElement.lang || 'de';
      const d = (window.MOSAOS_I18N && window.MOSAOS_I18N.dict && window.MOSAOS_I18N.dict[lang]) || null;
      const fb = (window.MOSAOS_I18N && window.MOSAOS_I18N.dict && window.MOSAOS_I18N.dict.de) || {};
      return (d && d[key] != null ? d[key] : (fb[key] != null ? fb[key] : fallback));
    } catch { return fallback; }
  };

  const animatePrice = (fromChf, toChf) => {
    if (!priceEl) return;
    const c = getCurrency();
    const from = Math.round(fromChf * c.rate);
    const to = Math.round(toChf * c.rate);
    if (currEl) currEl.textContent = c.code;
    if (reduced || from === to) {
      priceEl.textContent = to.toLocaleString(c.locale);
      return;
    }
    const dur = 400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(from + (to - from) * eased);
      priceEl.textContent = val.toLocaleString(c.locale);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  let lastSumChf = null;
  const recalc = () => {
    const data = BRANCHEN[currentBranche];
    let sumChf = data.basePrice;
    const active = [];
    contentEl.querySelectorAll('input[type="checkbox"][data-price]').forEach((cb) => {
      if (cb.checked) {
        sumChf += parseInt(cb.dataset.price, 10) || 0;
        active.push(cb.dataset.name);
      }
    });
    animatePrice(lastSumChf == null ? sumChf : lastSumChf, sumChf);
    lastSumChf = sumChf;
    if (activeEl) {
      const brancheKey = 'branche.' + (currentBranche === 'immobilien' ? 'immo' : currentBranche);
      const brancheName = t(brancheKey, currentBranche);
      const baseLabel = t('mix.h.base', 'Basis');
      const rows = [`<div class="sum-row">✓ ${escape(brancheName)} — ${escape(baseLabel)}</div>`];
      active.forEach((name) => rows.push(`<div class="sum-row">✓ ${escape(name)}</div>`));
      activeEl.innerHTML = rows.join('');
    }
  };

  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const renderMixer = (key) => {
    if (!contentEl) return;
    currentBranche = key;
    lastSumChf = null;
    const data = BRANCHEN[key];
    const inclLabel = t('mix.incl', 'inklusive');

    const baseHtml = data.base.map((id) => {
      const m = MODULES[id];
      const name = MODULES[id].emoji + ' ' + t('mod.' + id + '.name', id);
      const priceLabel = m.price > 0 ? fmtMoney(m.price) : inclLabel;
      return `
      <label class="mod mod-locked">
        <input type="checkbox" checked disabled />
        <div class="mod-body">
          <div class="mod-name">${escape(name)}</div>
          <div class="mod-desc">${escape(t('mod.' + id + '.desc', ''))}</div>
        </div>
        <span class="mod-price">${escape(priceLabel)}</span>
      </label>`;
    }).join('');

    const addonHtml = data.addons.map((id) => {
      const m = MODULES[id];
      const name = m.emoji + ' ' + t('mod.' + id + '.name', id);
      const tag = m.tag ? ` <span class="mod-tag">${escape(t('mix.soon', 'bald'))}</span>` : '';
      return `
      <label class="mod">
        <input type="checkbox" data-price="${m.price}" data-name="${escape(name)}" />
        <div class="mod-body">
          <div class="mod-name">${escape(name)}${tag}</div>
          <div class="mod-desc">${escape(t('mod.' + id + '.desc', ''))}</div>
        </div>
        <span class="mod-price">+ ${escape(fmtMoney(m.price))}</span>
      </label>`;
    }).join('');

    contentEl.innerHTML = `
      <h4>${escape(t('mix.h.base', 'Basis (immer enthalten)'))}</h4>
      <div class="mod-group">${baseHtml}</div>
      <h4>${escape(t('mix.h.addons', 'Module on-top'))}</h4>
      <div class="mod-group">${addonHtml}</div>
    `;

    contentEl.querySelectorAll('input[type="checkbox"][data-price]').forEach((cb) => {
      cb.addEventListener('change', recalc);
    });
    recalc();
  };

  if (contentEl && tabBtns.length) {
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        renderMixer(btn.dataset.branche);
      });
    });
    renderMixer('reinigung');
    // Bei Sprach-/Währungswechsel neu rendern
    window.MOSAOS_MIXER_REFRESH = () => renderMixer(currentBranche);
  }

  /* --------- 5. Mobile Burger --------- */
  const burger = document.getElementById('navBurger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
      })
    );
  }

  /* --------- 6. Smooth-Scroll mit Nav-Offset --------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    });
  });
})();
