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
      const { data } = await c.from('subscriptions').select('status,modules').maybeSingle();
      const active = !!(data && (data.status === 'active' || data.status === 'trialing'));
      window._subscription = { active, status: data?.status || 'inactive', modules: (active && data.modules) || [] };
    } catch {
      window._subscription = { active: false, status: 'inactive', modules: [] };
    }
  }

  async function startCheckout(modules) {
    const t = await accessToken();
    if (!t) { alert('Bitte zuerst einloggen, um zu abonnieren.'); return; }
    const base = location.href.split('?')[0].split('#')[0];
    try {
      const res = await fetch(cfg().functionsUrl + '/create-checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules, successUrl: base + '?billing=success', cancelUrl: base + '?billing=cancel' }),
      });
      const j = await res.json();
      if (j.url) location.href = j.url;
      else alert('Stripe-Fehler: ' + (j.error || 'unbekannt'));
    } catch (e) { alert('Verbindungsfehler: ' + e); }
  }

  async function openPortal() {
    const t = await accessToken();
    if (!t) { alert('Bitte zuerst einloggen.'); return; }
    try {
      const res = await fetch(cfg().functionsUrl + '/create-portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: location.href.split('?')[0].split('#')[0] }),
      });
      const j = await res.json();
      if (j.url) location.href = j.url;
      else alert('Stripe-Fehler: ' + (j.error || 'unbekannt'));
    } catch (e) { alert('Verbindungsfehler: ' + e); }
  }

  // Abo-Verwaltung in den Einstellungen rendern (in #moduleSettings)
  function renderSettings(wrap) {
    // Der Container ist von Haus aus ein Grid → für die Abo-Ansicht auf Block stellen,
    // sonst werden Status/Liste/Buttons in Spalten gequetscht (Riesen-Button-Bug).
    wrap.style.display = 'block';
    const sub = window._subscription || { active: false, status: 'inactive', modules: [] };
    const mods = sub.modules || [];
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rows = cfg().modules.map((m) => {
      const on = mods.includes(m.key);
      return `
      <label style="display:flex; align-items:center; gap:10px; padding:11px 14px; border:1px solid ${on ? 'var(--accent)' : 'var(--border)'}; border-radius:10px; background:var(--surface);">
        <input type="checkbox" class="sub-mod-pick" value="${m.key}" ${on ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);flex:0 0 auto;" />
        <span style="flex:1; min-width:0;">
          <span style="display:block; font-weight:600; font-size:13.5px;">${esc(m.label)}</span>
          <span style="display:block; font-size:12px; color:var(--text-subtle);">+ CHF ${m.priceChf}/Monat</span>
        </span>
        ${on ? '<span style="font-size:11px; font-weight:700; color:var(--success);flex:0 0 auto;">aktiv</span>' : ''}
      </label>`;
    }).join('');
    const statusLabel = sub.active
      ? `<span style="color:var(--success); font-weight:700;">● Abo aktiv</span>`
      : `<span style="color:var(--text-subtle); font-weight:700;">○ kein aktives Abo</span>`;
    wrap.innerHTML = `
      <div style="margin-bottom:14px; font-size:13px; color:var(--text-muted);">
        ${statusLabel} · Basis CHF ${cfg().basePriceChf}/Monat <span style="color:var(--text-subtle);">(Routenplanung, Kunden, Mitarbeiter)</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px;">${rows}</div>
      <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
        <button type="button" class="btn btn-accent" style="flex:0 0 auto;" onclick="MosaBilling._subscribeSelected()">${sub.active ? 'Abo ändern' : 'Jetzt abonnieren'}</button>
        ${sub.active ? '<button type="button" class="btn btn-ghost" style="flex:0 0 auto;" onclick="MosaBilling.openPortal()">Abo verwalten (Karte / Kündigung)</button>' : ''}
      </div>`;
  }

  function _subscribeSelected() {
    const picked = [...document.querySelectorAll('.sub-mod-pick:checked')].map((c) => c.value);
    if (!picked.length) { alert('Mindestens ein Modul wählen (oder nur Basis).'); }
    startCheckout(picked);
  }

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
