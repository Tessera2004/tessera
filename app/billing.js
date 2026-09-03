/* ============================================================
   MosaOS — Abo-Logik (Stripe) im Frontend
   ------------------------------------------------------------
   - lädt den Abo-Status des eingeloggten Mandanten (subscriptions-Tabelle)
   - startet Stripe-Checkout für gewählte Module
   - öffnet das Stripe-Kundenportal (Karte/Kündigung)
   - rendert die Abo-Verwaltung in den Einstellungen
   Hängt sich über window._subscription in loadFeatures() der App ein.
   ============================================================ */
window.MosaBilling = (function () {
  const cfg = () => window.MOSAOS_STRIPE;
  // Sprache erst zur Renderzeit nachschlagen: app-i18n.js wird nach dieser
  // Datei geladen, und der Kunde kann die Sprache jederzeit umstellen.
  const t = (k, f) => (window.MosaI18n ? MosaI18n.t(k, f) : f);
  // Modulname: eigener Schluessel, sonst der Navigationsname, sonst Deutsch
  const modLabel = (m) => t('mod.' + m.key + '.label', t('nav.' + m.key, m.label));
  function client() {
    try { if (typeof getSupabase === 'function') return getSupabase(); } catch {}
    return window.SB || null;
  }
  async function accessToken() {
    const c = client(); if (!c) return null;
    try { const { data } = await c.auth.getSession(); return data?.session?.access_token || null; } catch { return null; }
  }

  // Abo des Mandanten laden → window._subscription
  //   undefined  = nicht eingeloggt (Demo, lokale Schalter)
  //   { active, status, modules } = eingeloggt
  async function loadSubscription() {
    const c = client();
    if (!c) { window._subscription = undefined; return; }
    let session = null;
    try { session = (await c.auth.getSession()).data.session; } catch {}
    if (!session) { window._subscription = undefined; return; }
    try {
      const { data } = await c.from('subscriptions').select('status,modules,trial_ends_at').maybeSingle();
      const paid = !!(data && (data.status === 'active' || data.status === 'trialing'));
      // Testphase: bis trial_ends_at ist alles offen, danach greift die Bezahl-Wand.
      const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const trial = !paid && !!trialEndsAt && trialEndsAt.getTime() > Date.now();
      const allKeys = cfg().modules.map((m) => m.key);
      let mods = (paid && data.modules) || [];
      // Das Komplettpaket kommt als eine Position zurück und steht für
      // alle Module — sonst wäre nach dem Kauf nichts freigeschaltet.
      if (mods.includes('komplett')) mods = allKeys.concat('komplett');
      // In der Testphase darf der Kunde alles ausprobieren.
      if (trial) mods = allKeys.slice();
      window._subscription = {
        active: paid || trial,
        paid,
        trial,
        trialEndsAt,
        trialDaysLeft: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86400000)) : null,
        // Zugang gesperrt: nichts bezahlt UND Testphase vorbei (oder gar keine Testphase).
        locked: !paid && !trial,
        status: data?.status || 'inactive',
        modules: mods,
      };
    } catch {
      // Ladefehler darf niemanden aussperren — nur keine Module freischalten.
      window._subscription = { active: false, paid: false, trial: false, trialEndsAt: null, trialDaysLeft: null, locked: false, status: 'inactive', modules: [] };
    }
  }

  async function startCheckout(modules) {
    const t = await accessToken();
    if (!t) { alert(t('billing.loginFirst', 'Bitte zuerst einloggen, um zu abonnieren.')); return; }
    const base = location.href.split('?')[0].split('#')[0];
    try {
      const res = await fetch(cfg().functionsUrl + '/create-checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules, successUrl: base + '?billing=success', cancelUrl: base + '?billing=cancel' }),
      });
      const j = await res.json();
      if (j.url) location.href = j.url;
      else alert(t('billing.stripeError', 'Stripe-Fehler: ') + (j.error || t('billing.unknown', 'unbekannt')));
    } catch (e) { alert(t('billing.connError', 'Verbindungsfehler: ') + e); }
  }

  async function openPortal() {
    const t = await accessToken();
    if (!t) { alert(t('billing.loginPlain', 'Bitte zuerst einloggen.')); return; }
    try {
      const res = await fetch(cfg().functionsUrl + '/create-portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: location.href.split('?')[0].split('#')[0] }),
      });
      const j = await res.json();
      if (j.url) location.href = j.url;
      else alert(t('billing.stripeError', 'Stripe-Fehler: ') + (j.error || t('billing.unknown', 'unbekannt')));
    } catch (e) { alert(t('billing.connError', 'Verbindungsfehler: ') + e); }
  }

  // Abo-Verwaltung in den Einstellungen rendern (in #moduleSettings)
  function renderSettings(wrap) {
    // Der Container ist von Haus aus ein Grid → für die Abo-Ansicht auf Block stellen,
    // sonst werden Status/Liste/Buttons in Spalten gequetscht (Riesen-Button-Bug).
    wrap.style.display = 'block';
    const sub = window._subscription || { active: false, status: 'inactive', modules: [] };
    const mods = sub.modules || [];
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // Branche blendet bestimmte Module grundsätzlich aus (z. B. Werkstatt → keine Abo-Verträge).
    // Diese dürfen dann auch im Modul-Shop NICHT buchbar sein, sonst zahlt der Kunde für ein
    // Modul, das seine Branche nie anzeigt.
    const hiddenByVertical = (window.MosaVertical && MosaVertical.hiddenViews) ? MosaVertical.hiddenViews() : [];
    const rows = cfg().modules.filter((m) => !hiddenByVertical.includes(m.key)).map((m) => {
      const on = mods.includes(m.key);
      return `
      <label style="display:flex; align-items:center; gap:10px; padding:11px 14px; border:1px solid ${on ? 'var(--accent)' : 'var(--border)'}; border-radius:10px; background:var(--surface);">
        <input type="checkbox" class="sub-mod-pick" value="${m.key}" ${on ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);flex:0 0 auto;" />
        <span style="flex:1; min-width:0;">
          <span style="display:block; font-weight:600; font-size:13.5px;">${esc(modLabel(m))}</span>
          <span style="display:block; font-size:12px; color:var(--text-subtle);">+ CHF ${m.priceChf}${t('common.perMonth', '/Monat')}</span>
        </span>
        ${on ? '<span style="font-size:11px; font-weight:700; color:var(--success);flex:0 0 auto;">' + t('billing.moduleOn', 'aktiv') + '</span>' : ''}
      </label>`;
    }).join('');
    const statusLabel = sub.paid
      ? `<span style="color:var(--success); font-weight:700;">● ${t('billing.active', 'Abo aktiv')}</span>`
      : sub.trial
        ? `<span style="color:var(--warning, #e0a800); font-weight:700;">● ${t('billing.trialLeft', 'Testphase — noch')} ${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? t('trial.day', 'Tag gratis.') : t('trial.days', 'Tage gratis.')}</span>`
        : `<span style="color:var(--text-subtle); font-weight:700;">○ ${t('billing.none', 'kein aktives Abo')}</span>`;
    const k = cfg().komplett;
    const einzeln = cfg().basePriceChf + cfg().modules.reduce((s2, m) => s2 + m.priceChf, 0);
    const komplettAktiv = mods.includes('komplett');
    const paket = !k ? '' : `
      <label style="display:flex; align-items:center; gap:12px; padding:16px 18px; margin-bottom:14px;
                    border:1px solid ${komplettAktiv ? 'var(--accent)' : 'var(--border-strong)'}; border-radius:12px;
                    background:${komplettAktiv ? 'var(--accent-soft)' : 'var(--surface-2)'};">
        <input type="radio" name="sub-paket" class="sub-paket-pick" value="komplett" ${komplettAktiv ? 'checked' : ''}
               style="width:18px;height:18px;accent-color:var(--accent);flex:0 0 auto;" />
        <span style="flex:1; min-width:0;">
          <span style="display:block; font-weight:700; font-size:14.5px;">${esc(t('paywall.allModules', k.label))} — CHF ${k.gesamtChf}${t('common.perMonth', '/Monat')}</span>
          <span style="display:block; font-size:12.5px; color:var(--text-subtle);">
            ${t('billing.allIncl', 'Alles inklusive. Einzeln gebucht:')} CHF ${einzeln}${t('common.perMonth', '/Monat')} — ${t('billing.youSave', 'du sparst')} CHF ${einzeln - k.gesamtChf}.
          </span>
        </span>
      </label>
      <label style="display:flex; align-items:center; gap:12px; padding:11px 18px; margin-bottom:12px;
                    font-size:13px; color:var(--text-muted); cursor:pointer;">
        <input type="radio" name="sub-paket" class="sub-paket-pick" value="einzeln" ${komplettAktiv ? '' : 'checked'}
               style="width:16px;height:16px;accent-color:var(--accent);" />
        <span>${t('billing.orSingle', 'Oder einzeln zusammenstellen')}</span>
      </label>`;

    wrap.innerHTML = `
      <div style="margin-bottom:14px; font-size:13px; color:var(--text-muted);">
        ${statusLabel} · ${t('billing.base', 'Basis')} CHF ${cfg().basePriceChf}${t('common.perMonth', '/Monat')} <span style="color:var(--text-subtle);">${t('billing.baseIncl', '(Routenplanung, Kunden, Mitarbeiter)')}</span>
      </div>
      ${paket}
      <div id="subModulListe" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px;
                  opacity:${komplettAktiv ? '0.4' : '1'}; pointer-events:${komplettAktiv ? 'none' : 'auto'};">${rows}</div>
      <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
        <button type="button" class="btn btn-accent" style="flex:0 0 auto;" onclick="MosaBilling._subscribeSelected()">${sub.active ? t('billing.change', 'Abo ändern') : t('billing.subscribe', 'Jetzt abonnieren')}</button>
        ${sub.active ? '<button type="button" class="btn btn-ghost" style="flex:0 0 auto;" onclick="MosaBilling.openPortal()">' + t('billing.manage', 'Abo verwalten (Karte / Kündigung)') + '</button>' : ''}
      </div>`;
  }

  function _subscribeSelected() {
    const paket = document.querySelector('.sub-paket-pick:checked')?.value;
    if (paket === 'komplett') { startCheckout(['komplett']); return; }
    const picked = [...document.querySelectorAll('.sub-mod-pick:checked')].map((c) => c.value);
    if (!picked.length) { alert(t('billing.pickOne', 'Mindestens ein Modul wählen (oder nur Basis).')); }
    startCheckout(picked);
  }

  // Modulliste stumm schalten, solange das Komplettpaket gewählt ist
  document.addEventListener('change', (e) => {
    if (!e.target.classList || !e.target.classList.contains('sub-paket-pick')) return;
    const liste = document.getElementById('subModulListe');
    if (!liste) return;
    const komplett = e.target.value === 'komplett';
    liste.style.opacity = komplett ? '0.4' : '1';
    liste.style.pointerEvents = komplett ? 'none' : 'auto';
  });

  // Nach Rückkehr von Stripe (?billing=success): Abo neu laden (Webhook braucht 1–2 s)
  function handleReturn(onUpdated) {
    const p = new URLSearchParams(location.search);
    if (p.get('billing') === 'success') {
      history.replaceState({}, '', location.pathname);
      let tries = 0;
      const poll = async () => {
        await loadSubscription();
        onUpdated && onUpdated();
        if (!window._subscription?.active && tries++ < 5) setTimeout(poll, 2000);
      };
      poll();
      return 'success';
    }
    if (p.get('billing') === 'cancel') { history.replaceState({}, '', location.pathname); return 'cancel'; }
    return null;
  }

  return { loadSubscription, startCheckout, openPortal, renderSettings, _subscribeSelected, handleReturn };
})();
