// MosaOS — app-basis.js
//
// Grundlagen: Seitenleiste, Module und Freischaltung, Testphase,
// Branchen-Preset (welche Leistungen und Begriffe eine Branche mitbringt).
//
// Teil der frueheren app.html. Die Datei wurde am 6. September 2026
// aufgeteilt: 9'559 Zeilen in einer Datei bedeuteten, dass jeder, der
// hier etwas sucht, alles laden muss.
//
// WICHTIG: Diese Dateien sind gewoehnliche Skripte, keine Module. Sie
// teilen sich denselben globalen Namensraum und werden in der Reihenfolge
// geladen, die in app.html steht. Beim Verschieben von Code darauf achten:
// Funktionen werden nur noch innerhalb ihrer eigenen Datei nach oben
// gezogen. Was beim Laden ausgefuehrt wird, darf nichts aus einer spaeter
// geladenen Datei aufrufen. Die Einrueckung von vier Leerzeichen ist
// absichtlich stehengeblieben - mehrzeilige Textbausteine wuerden sich
// sonst inhaltlich aendern.

    // Navigation between views
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const views = document.querySelectorAll('.view[data-view]');
    const titleEl = document.getElementById('topbarTitle');

    const titles = {
      dashboard: 'Dashboard',
      planung: 'Routenplanung',
      offerten: 'Offerten',
      objekte: 'Objekte',
      mitarbeiter: 'Mitarbeiter',
      kunden: 'Kunden',
      team: 'Büro-Team',
      abos: 'Abo-Verträge',
      berichte: 'Nachweise & Berichte',
      zeiten: 'Zeiterfassung',
      nachkalkulation: 'Soll-Ist-Nachkalkulation',
      einstellungen: 'Einstellungen',
      email: 'E-Mail',
      aufgaben: 'Aufgaben',
      anrufprotokoll: 'Anrufprotokoll',
      rechnungen: 'Rechnungen'
    };

    // Kurzhelfer: Branchen-Begriff holen (Fallback = Key, falls Engine fehlt).
    const VT = (k) => (window.MosaVertical ? MosaVertical.t(k) : k);
    // Kurzhelfer: Übersetzung für JS-generierte Strings (Fallback = dt. Text, falls i18n-Engine fehlt).
    const tt = (k, f) => (window.MosaI18n ? MosaI18n.t(k, f) : f);
    // Kurzhelfer: BCP-47-Locale für UI-Datumsformatierung aus der aktuellen Sprache (Wochentage/Monate auto-übersetzt).
    const UI_DATE_LOCALES = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH', it: 'it-CH', es: 'es-ES' };
    const dateLocale = () => UI_DATE_LOCALES[(window.MosaI18n ? MosaI18n.get() : 'de')] || 'de-CH';

    // Topbar-Titel einer Ansicht: branchen-Override (navLabels, sprach-lokalisiert) →
    // sonst Übersetzung (nav.<view>) → sonst statischer Titel. objekte/mitarbeiter werden
    // von sync/applyVerticalNavLabels branchen+sprach-aktuell in titles[] gehalten.
    function topbarTitle(view) {
      if (view === 'objekte' || view === 'mitarbeiter') return titles[view] || '';
      const over = (window.MosaVertical && MosaVertical.preset().navLabels) || {};
      if (over[view] != null) return over[view];
      return (window.MosaI18n ? MosaI18n.t('nav.' + view, titles[view]) : titles[view]) || '';
    }

    // Branchen-Begriff in den Topbar-Titel der Objekte-Ansicht spiegeln (reinigung => 'Objekte').
    function syncVerticalTitles() {
      if (window.MosaVertical) titles.objekte = MosaVertical.t('objektPlural');
      const active = document.querySelector('.nav-item.active[data-view]');
      if (active && titleEl) titleEl.textContent = topbarTitle(active.dataset.view) || titleEl.textContent;
    }
    syncVerticalTitles();
    // Bei Branchenwechsel: Titel + JS-gerenderte Ansichten aktualisieren.
    document.addEventListener('mosa-vertical-changed', () => {
      syncVerticalTitles();
      try { typeof applyFeatureFlags === 'function' && applyFeatureFlags(); } catch (e) {}   // Module pro Branche neu schalten
      try { typeof applyVerticalNavLabels === 'function' && applyVerticalNavLabels(); } catch (e) {}  // Branchen-Begriffe in der Seitenleiste
      try { typeof renderWerkstattplan === 'function' && renderWerkstattplan(); } catch (e) {}
      try { typeof renderReifen === 'function' && renderReifen(); } catch (e) {}
      try { typeof renderFahrzeuge === 'function' && renderFahrzeuge(); } catch (e) {}
      try { typeof renderKoederstellen === 'function' && renderKoederstellen(); } catch (e) {}
      try { typeof renderPestProtocols === 'function' && renderPestProtocols(); } catch (e) {}
      try { typeof renderBaustellen === 'function' && renderBaustellen(); } catch (e) {}
      try { typeof renderRapporte === 'function' && renderRapporte(); } catch (e) {}
      try { typeof renderMitarbeiter === 'function' && renderMitarbeiter(); } catch (e) {}
      try { typeof renderDashboard === 'function' && renderDashboard(); } catch (e) {}
      try { typeof applyPriceSection === 'function' && applyPriceSection(); } catch (e) {}
    });

    // Sprachwechsel: Übersetzung ist via MosaI18n.apply() schon angewandt; jetzt die
    // Branchen-Begriffe + Nav-Labels erneut drüberlegen und dynamische Inhalte neu rendern.
    document.addEventListener('mosa-lang-changed', () => {
      try { typeof MosaVertical !== 'undefined' && MosaVertical.apply(); } catch (e) {}      // data-term-Begriffe
      try { typeof applyVerticalNavLabels === 'function' && applyVerticalNavLabels(); } catch (e) {}
      try { typeof syncVerticalTitles === 'function' && syncVerticalTitles(); } catch (e) {}
      try { typeof renderDashboard === 'function' && renderDashboard(); } catch (e) {}
      // JS-gesetzte View-Untertitel (Counts) bei Sprachwechsel neu rendern
      ['renderKunden','renderBaustellen','renderRapporte','renderKoederstellen','renderPestProtocols',
       'renderWerkstattplan','renderReifen','renderFahrzeuge','renderMitarbeiter','renderAufgaben',
       'renderAnrufprotokoll','renderMailView','renderPlanung','renderDayTimeline','renderAbos',
       'renderZeiten','renderModuleSettings','renderRolesLegend','renderNachkalkulation','renderRechnungen',
       'applyPriceSection','refreshAuthStatus','renderVerticalDisplay'].forEach(fn => { try { typeof window[fn] === 'function' && window[fn](); } catch (e) {} });
    });

    function navTo(view) {
      const item = document.querySelector(`.nav-item[data-view="${view}"]`);
      if (item) item.click();
    }

    // ============ MOBILE-DRAWER ============
    const appShell = document.querySelector('.app-shell');
    function openSidebar() {
      appShell.classList.add('nav-open');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      appShell.classList.remove('nav-open');
      document.body.style.overflow = '';
    }
    // Desktop: Liste ein-/ausklappen (mehr Platz). Mobile: Slide-in-Drawer.
    function toggleSidebar() {
      if (window.innerWidth <= 768) {
        appShell.classList.contains('nav-open') ? closeSidebar() : openSidebar();
      } else {
        const collapsed = appShell.classList.toggle('nav-collapsed');
        localStorage.setItem('cc-nav-collapsed', collapsed ? '1' : '0');
      }
    }
    // Gemerkten Einklapp-Zustand beim Laden anwenden (nur Desktop).
    if (localStorage.getItem('cc-nav-collapsed') === '1' && window.innerWidth > 768) {
      appShell.classList.add('nav-collapsed');
    }
    // ESC schließt den Drawer
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSidebar();
    });

    navItems.forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const target = item.dataset.view;
        navItems.forEach(n => n.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        document.querySelector(`.view[data-view="${target}"]`).classList.add('active');
        titleEl.textContent = topbarTitle(target);
        window.scrollTo(0, 0);
        closeSidebar();
        if (target === 'team') renderTeamGrid();
      });
    });

    // ============ MODULE / FEATURE-FLAGS (pro Mandant) ============
    const FEATURE_MODULES = [
      { key: 'offerten',        view: 'offerten',        label: 'Offerten',             desc: 'Angebote schreiben, PDF, Versionshistorie' },
      { key: 'anrufprotokoll',  view: 'anrufprotokoll',  label: 'Anrufprotokoll',       desc: 'Anrufe erfassen, Rückrufe, Aufgaben daraus' },
      { key: 'aufgaben',        view: 'aufgaben',        label: 'Aufgaben',             desc: 'To-dos ans Büro-Team verteilen' },
      { key: 'email',           view: 'email',           label: 'E-Mail-Postfach',      desc: 'Postfach anbinden (Modulstufe 2)' },
      { key: 'abos',            view: 'abos',            label: 'Abo-Verträge',         desc: 'Wiederkehrende Aufträge verwalten' },
      { key: 'berichte',        view: 'berichte',        label: 'Nachweise & Berichte', desc: 'Foto- und Unterschrift-Nachweise' },
      { key: 'zeiten',          view: 'zeiten',          label: 'Zeiterfassung',        desc: 'Arbeitszeiten, QR-Check-in' },
      { key: 'nachkalkulation', view: 'nachkalkulation', label: 'Nachkalkulation',      desc: 'Soll/Ist je Auftrag' },
      { key: 'rechnungen',      view: 'rechnungen',      label: 'Rechnungen',           desc: 'QR-Rechnungen erstellen' }
    ];
    const FEATURES_KEY = 'cc-features-v1';
    function loadFeatures() {
      // Eingeloggt → Module kommen aus dem Stripe-Abo (window._subscription).
      // Nicht eingeloggt (Demo) → lokale Schalter wie bisher.
      const sub = window._subscription;
      if (sub !== undefined) {
        const f = {};
        FEATURE_MODULES.forEach(m => { f[m.key] = sub.active ? sub.modules.includes(m.key) : false; });
        return f;
      }
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(FEATURES_KEY)) || {}; } catch {}
      const f = {};
      FEATURE_MODULES.forEach(m => { f[m.key] = saved[m.key] !== undefined ? !!saved[m.key] : true; });
      return f;
    }
    function saveFeatures(f) {
      localStorage.setItem(FEATURES_KEY, JSON.stringify(f));
      window.MosaDB?.push('company_features', f);
    }
    function applyFeatureFlags() {
      const f = loadFeatures();
      // Branchen-Steuerung: was diese Branche nicht braucht / zusätzlich mitbringt.
      const hidden = window.MosaVertical ? MosaVertical.hiddenViews() : [];
      const extras = window.MosaVertical ? MosaVertical.extraViews() : [];
      FEATURE_MODULES.forEach(m => {
        const item = document.querySelector(`.nav-item[data-view="${m.view}"]`);
        // Sichtbar nur wenn vom Abo freigeschaltet UND von der Branche nicht ausgeblendet.
        if (item) item.style.display = (f[m.key] && !hidden.includes(m.view)) ? '' : 'none';
      });
      // Kern-Module (z. B. Routenplanung), die NICHT übers Abo laufen, aber von einer Branche
      // ausgeblendet werden: zuerst alle je nach Branche möglichen zurücksetzen, dann die aktuelle Branche ausblenden.
      // (Sonst bleibt z. B. planung versteckt, wenn man von Werkstatt zu Schädling wechselt.)
      const featureViews = new Set(FEATURE_MODULES.map(m => m.view));
      const hideable = new Set();
      if (window.MosaVertical) Object.values(MosaVertical.PRESETS).forEach(p => (p.hideViews || []).forEach(v => hideable.add(v)));
      hideable.forEach(view => {
        if (featureViews.has(view)) return;   // Abo-Module regelt die Schleife oben
        const item = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (item) item.style.display = hidden.includes(view) ? 'none' : '';
      });
      // Branchen-eigene Module: nur in der passenden Branche zeigen, sonst aus.
      document.querySelectorAll('.nav-item[data-vertical-view]').forEach(item => {
        const view = item.getAttribute('data-view');
        item.style.display = extras.includes(view) ? '' : 'none';
      });
      // Leere Nav-Sektionen ausblenden (z. B. „Vertrieb" wenn Offerten aus)
      document.querySelectorAll('.nav-section').forEach(sec => {
        const items = [...sec.querySelectorAll('.nav-item')];
        sec.style.display = (items.length && items.every(i => i.style.display === 'none')) ? 'none' : '';
      });
      // Ist die aktive Ansicht jetzt deaktiviert? → zurück aufs Dashboard
      const active = document.querySelector('.nav-item.active[data-view]');
      if (active && active.style.display === 'none') {
        document.querySelector('.nav-item[data-view="dashboard"]')?.click();
      }
    }

    // Branchen-eigene Begriffe in der Seitenleiste (z. B. Werkstatt: Offerten→Kostenvoranschlag).
    // Standard-Labels werden einmalig erfasst, damit reinigung sauber zurücksetzt.
    let NAV_LABEL_DEFAULTS = null;
    function navLabelTextNode(item) {
      for (const n of item.childNodes) { if (n.nodeType === 3 && n.textContent.trim()) return n; }
      return null;
    }
    function applyVerticalNavLabels() {
      if (!NAV_LABEL_DEFAULTS) {
        NAV_LABEL_DEFAULTS = {};
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
          const tn = navLabelTextNode(item);
          if (tn) NAV_LABEL_DEFAULTS[item.getAttribute('data-view')] = tn.textContent.trim();
        });
      }
      const over = (window.MosaVertical && MosaVertical.preset().navLabels) || {};
      document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        const v = item.getAttribute('data-view');
        // Basistext aus der Übersetzung (Fallback = ursprünglicher DOM-Text), dann
        // branchenspezifische Überschreibung (navLabels) drüber.
        const base = (window.MosaI18n ? MosaI18n.t('nav.' + v, NAV_LABEL_DEFAULTS[v]) : NAV_LABEL_DEFAULTS[v]);
        const label = over[v] != null ? over[v] : base;
        if (label == null) return;
        const tn = navLabelTextNode(item);
        if (tn) tn.textContent = ' ' + label + '\n            ';
      });
      // Auch die Seiten-Überschrift (h1) der branchen-eigenen Views nachziehen,
      // damit z. B. „Baustellen" in der Garten-Branche als „Gartenprojekte" erscheint.
      if (!VIEW_TITLE_DEFAULTS) {
        VIEW_TITLE_DEFAULTS = {};
        BRANCH_VIEW_TITLES.forEach(v => {
          const el = document.querySelector(`.view[data-view="${v}"] .page-title`);
          if (el) VIEW_TITLE_DEFAULTS[v] = el.textContent;
        });
      }
      BRANCH_VIEW_TITLES.forEach(v => {
        const el = document.querySelector(`.view[data-view="${v}"] .page-title`);
        // Basis = Übersetzung (nav.<view>), deutscher DOM-Text als Fallback; Branche überschreibt.
        const base = (window.MosaI18n ? MosaI18n.t('nav.' + v, VIEW_TITLE_DEFAULTS[v]) : VIEW_TITLE_DEFAULTS[v]);
        if (el) el.textContent = (over[v] != null ? over[v] : base);
      });
      // Mitarbeiter-Seitenüberschrift + Topbar-Titel = Nav-Label der Branche
      // (reinigung bleibt „Mitarbeiter", werkstatt → „Mechaniker" usw.).
      const mitBase = (window.MosaI18n ? MosaI18n.t('nav.mitarbeiter', NAV_LABEL_DEFAULTS['mitarbeiter'] || 'Mitarbeiter') : (NAV_LABEL_DEFAULTS['mitarbeiter'] || 'Mitarbeiter'));
      const mitLabel = over['mitarbeiter'] != null ? over['mitarbeiter'] : mitBase;
      const mitTitle = document.querySelector('.view[data-view="mitarbeiter"] .page-title');
      if (mitTitle) mitTitle.textContent = mitLabel;
      if (typeof titles === 'object' && titles) titles.mitarbeiter = mitLabel;
      applyAccessGate();
    }

    // ============ ZUGANG / TESTPHASE ============
    // Nach der 14-taegigen Testphase ist ohne aktives Abo Schluss: die App wird von einer
    // Bezahl-Wand ueberdeckt. Waehrend der Testphase erscheint nur ein Hinweisband.
    function applyAccessGate() {
      const sub = window._subscription;
      if (sub === undefined) { removeAccessGate(); return; }   // nicht eingeloggt = Demo
      if (sub.locked) { showPaywall(); return; }
      removeAccessGate();
      if (sub.trial) showTrialBanner(sub.trialDaysLeft); else removeTrialBanner();
    }
    function removeAccessGate() {
      document.getElementById('paywallOverlay')?.remove();
      document.body.style.overflow = '';
    }
    function removeTrialBanner() { document.getElementById('trialBanner')?.remove(); }
    function showTrialBanner(daysLeft) {
      let bar = document.getElementById('trialBanner');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'trialBanner';
        bar.style.cssText = 'position:fixed; left:0; right:0; bottom:0; z-index:900; display:flex; gap:14px; align-items:center; justify-content:center; flex-wrap:wrap; padding:9px 16px; font-size:13px; background:var(--surface-2); color:var(--text); border-top:1px solid var(--border);';
        document.body.appendChild(bar);
      }
      // Alles nach der Zahl steckt in einem Schluessel, damit die Beugung je
      // Sprache stimmt (fr: jour gratuit / jours gratuits).
      const einheit = daysLeft === 1 ? tt('trial.day', 'Tag gratis.') : tt('trial.days', 'Tage gratis.');
      bar.innerHTML = '<span>' + tt('trial.left', 'Testphase — noch') + ' <strong>' + daysLeft + '</strong> ' + einheit + '</span>' +
        '<button type="button" id="trialBannerCta" style="padding:6px 14px; border:0; border-radius:8px; background:var(--accent); color:#fff; font-weight:600; cursor:pointer;">' + tt('trial.cta', 'Abo wählen') + '</button>';
      document.getElementById('trialBannerCta').onclick = () => {
        // Navigation laeuft ueber die Seitenleiste — also den Menuepunkt anklicken.
        document.querySelector('.nav-item[data-view="einstellungen"]')?.click();
        setTimeout(() => document.getElementById('moduleSettings')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      };
    }
    // Beschriftung des Abo-Knopfs: Preis kommt aus stripe-config.js (eine Quelle),
    // Text aus der Sprachdatei. Fest verdrahtet liefe beides auseinander.
    function paketPreisLabel() {
      const k = window.MOSAOS_STRIPE?.komplett;
      const preis = k?.gesamtChf ?? 99;
      return tt('paywall.allModules', 'Alle Module') + ' — CHF ' + preis + tt('common.perMonth', '/Monat');
    }
    function showPaywall() {
      document.getElementById('trialBanner')?.remove();
      if (document.getElementById('paywallOverlay')) return;
      const box = document.createElement('div');
      box.id = 'paywallOverlay';
      box.style.cssText = 'position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(8,10,16,0.86); backdrop-filter:blur(4px);';
      box.innerHTML =
        '<div style="max-width:440px; width:100%; padding:30px; border-radius:16px; background:var(--surface); border:1px solid var(--border); text-align:center;">' +
          '<h2 style="margin:0 0 10px; font-size:21px;">' + tt('paywall.title', 'Testphase abgelaufen') + '</h2>' +
          '<p style="margin:0 0 22px; font-size:14px; line-height:1.6; color:var(--text-subtle);">' +
            tt('paywall.desc', 'Deine 14 Tage sind vorbei. Deine Daten bleiben vollständig erhalten — schliesse ein Abo ab, um weiterzuarbeiten.') +
          '</p>' +
          '<button type="button" id="paywallSubscribe" style="width:100%; padding:12px; margin-bottom:10px; border:0; border-radius:10px; background:var(--accent); color:#fff; font-weight:600; font-size:14.5px; cursor:pointer;">' + paketPreisLabel() + '</button>' +
          '<button type="button" id="paywallLogout" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:10px; background:transparent; color:var(--text-subtle); font-size:13px; cursor:pointer;">' + tt('common.logout', 'Abmelden') + '</button>' +
        '</div>';
      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      document.getElementById('paywallSubscribe').onclick = () => window.MosaBilling?.startCheckout(['komplett']);
      document.getElementById('paywallLogout').onclick = () => { try { getSupabase()?.auth.signOut(); } catch {} location.reload(); };
    }
    const BRANCH_VIEW_TITLES = ['werkstattplan', 'fahrzeuge', 'reifen', 'koederstellen', 'protokolle', 'baustellen', 'rapporte'];
    let VIEW_TITLE_DEFAULTS = null;
    function renderModuleSettings() {
      const wrap = document.getElementById('moduleSettings');
      if (!wrap) return;
      // Eingeloggt → Abo-Verwaltung (Stripe). Demo → freie Schalter.
      if (window._subscription !== undefined && window.MosaBilling) {
        window.MosaBilling.renderSettings(wrap);
        return;
      }
      const f = loadFeatures();
      const canManage = hasPerm('edit_users');
      wrap.innerHTML = FEATURE_MODULES.map(m => `
        <label style="display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border:1px solid var(--border); border-radius:10px; cursor:${canManage ? 'pointer' : 'default'}; background:var(--surface);">
          <input type="checkbox" ${f[m.key] ? 'checked' : ''} ${canManage ? '' : 'disabled'} onchange="toggleFeature('${m.key}', this.checked)" style="margin-top:2px; width:16px; height:16px; accent-color:var(--accent);" />
          <span style="min-width:0;">
            <span style="display:block; font-weight:600; font-size:13.5px;">${tt('mod.' + m.key + '.label', tt('nav.' + m.view, m.label))}</span>
            <span style="display:block; font-size:12px; color:var(--text-subtle);">${tt('mod.' + m.key + '.desc', m.desc)}</span>
          </span>
        </label>`).join('');
    }
    function toggleFeature(key, on) {
      if (!requirePerm('edit_users', 'Module verwalten')) { renderModuleSettings(); return; }
      const f = loadFeatures();
      f[key] = on;
      saveFeatures(f);
      applyFeatureFlags();
      const mod = FEATURE_MODULES.find(m => m.key === key);
      toast(`${mod ? tt('mod.' + mod.key + '.label', tt('nav.' + mod.view, mod.label)) : tt('toastdyn.module','Modul')} ${on ? tt('toastdyn.activated','aktiviert') : tt('toastdyn.deactivated','deaktiviert')}`);
    }

    // ============ BRANCHE / GESCHÄFTSFELD (Preset-Engine) ============
    // Branche ist NACH dem Onboarding fix (Kunde soll nur die Module/Tools seiner Branche
    // bekommen, nicht in andere Branchen wechseln). In den Einstellungen nur read-only
    // anzeigen; ändern macht der Support direkt in company_settings.profile.vertical.
    function renderVerticalDisplay() {
      const el = document.getElementById('verticalDisplay');
      if (!el || !window.MosaVertical) return;
      el.textContent = MosaVertical.preset().label;
    }
    function populateVerticalSelect() {
      // Legacy-Name (frühere Select-Variante) → jetzt read-only Anzeige.
      renderVerticalDisplay();
    }
    function onVerticalChange(key) {
      if (!window.MosaVertical) return;
      if (!hasPerm('edit_users')) { toast('Keine Berechtigung, das Geschäftsfeld zu ändern', 'error'); populateVerticalSelect(); return; }
      MosaVertical.set(key);                 // speichert lokal + relabelt alle [data-term] live
      try { const co = loadCompany(); co.vertical = key; saveCompany(co); } catch (e) {}  // ins Firmenprofil → Sync (Mobile/andere Geräte)
      toast(`${tt('toastdyn.businessField','Geschäftsfeld')}: ${MosaVertical.preset().label}`);
    }
    // Branche aus dem (gesyncten) Firmenprofil übernehmen — beim Login/Start.
    function applyVerticalFromCompany() {
      if (!window.MosaVertical) return;
      try {
        const v = (loadCompany() || {}).vertical;
        if (v && MosaVertical.PRESETS[v] && v !== MosaVertical.get()) MosaVertical.set(v);
      } catch (e) {}
    }

    // Preis-Einstellungen: Reinigung = statische Original-Karten; andere Branchen = aus Preset gerendert.
    const CUSTOM_SERVICES_KEY = 'cc-custom-services-v1';
    function loadCustomServices() { try { const v = JSON.parse(localStorage.getItem(CUSTOM_SERVICES_KEY)); return Array.isArray(v) ? v : []; } catch { return []; } }
    function servicesForCurrentVertical() {
      const vert = window.MosaVertical?.get?.() || 'reinigung';
      return loadCustomServices().filter(s => s.vertical === vert);
    }
    // Die selbst angelegten Leistungen auch unten bei "Preise pro Leistung"
    // zeigen — mit aenderbarem Preis. Vorher standen sie nur als Merkzettel
    // oben, und die Karte unten blieb leer.
    // Jede eigene Leistung bekommt eine eigene Karte mit denselben
    // Einstellungen wie die Standardleistungen: Abrechnungsart, Preis,
    // Mindestbuchung und Anfahrtspauschale.
    // Eine Preiskarte bauen. Wird fuer eigene Leistungen (id) und fuer die
    // Preset-Leistungen der anderen Branchen (key) gleichermassen benutzt.
    function preisKarteHtml(sv, waehrung, setter, loeschbar) {
      const einheit = sv.unit === 'h' ? 'h' : (sv.unit === 'qm' ? 'qm' : 'flat');
      const ruf = (feld, wert) => `${setter}('${sv.id}','${feld}',${wert})`;
      return `
        <div class="price-card-head">
          <div class="price-card-icon" style="background: var(--surface-2); color: var(--text-muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          </div>
          <div style="flex:1; min-width:0;">
            <div class="price-card-title">${escapeHtml(sv.title)}</div>
            <div class="price-card-sub">${escapeHtml(sv.desc || tt('price.custom.t', 'Eigene Leistung'))}</div>
          </div>
          ${loeschbar ? `<button class="btn btn-ghost" title="${tt('common.delete','Löschen')}"
            style="color: var(--danger); padding: 4px 8px;"
            onclick="removeCustomService('${sv.id}')">×</button>` : ''}
        </div>
        <div class="price-card-body">
          <div class="price-row">
            <label>${tt('price.row.mode', 'Abrechnung nach')}</label>
            <div class="opt-row">
              <button type="button" class="opt-chip ${einheit==='h'?'on':''}" onclick="${ruf('unit',"'h'")}">${tt('price.mode.hour','pro Stunde')}</button>
              <button type="button" class="opt-chip ${einheit==='qm'?'on':''}" onclick="${ruf('unit',"'qm'")}">${tt('price.mode.sqm','pro m²')}</button>
              <button type="button" class="opt-chip ${einheit==='flat'?'on':''}" onclick="${ruf('unit',"'flat'")}">${tt('price.mode.flat','Pauschale')}</button>
            </div>
          </div>
          <div class="price-row">
            <label>${einheit==='h' ? tt('price.row.hourly','Stundensatz')
                   : einheit==='qm' ? tt('price.row.perSqm','Preis pro m²')
                   : tt('price.row.flat','Pauschalpreis')}</label>
            <div class="price-input-wrap">
              <input type="number" class="price-input" value="${sv.price}" step="0.5" min="0"
                onchange="${ruf('price','this.value')}" />
              <span class="price-suffix">${waehrung}${einheit==='h' ? ' / h' : einheit==='qm' ? ' / m²' : ''}</span>
            </div>
          </div>
          <div class="price-row">
            <label>${einheit==='h' ? tt('price.row.minHours','Mindestbuchung') : tt('price.row.minOrder','Mindestauftrag')}</label>
            <div class="price-input-wrap">
              <input type="number" class="price-input" value="${sv.minQty || 0}" step="0.5" min="0"
                onchange="${ruf('minQty','this.value')}" />
              <span class="price-suffix">${einheit==='h' ? 'h' : waehrung}</span>
            </div>
          </div>
          <div class="price-row">
            <label>${tt('price.row.fee','Anfahrt pauschal')}</label>
            <div class="price-input-wrap">
              <input type="number" class="price-input" value="${sv.fee || 0}" step="1" min="0"
                onchange="${ruf('fee','this.value')}" />
              <span class="price-suffix">${waehrung}</span>
            </div>
          </div>
        </div>`;
    }

    function renderCustomServiceCards() {
      // In die gerade sichtbare Spalte haengen, nicht fest ins Reinigungsraster
      const reinigung = MosaVertical?.get?.() === 'reinigung';
      const grid = document.getElementById(reinigung ? 'priceGridReinigung' : 'priceGridGeneric');
      const platzhalter = document.getElementById('customServiceCards');
      if (!grid || !platzhalter) return;
      const waehrung = (typeof coLocale === 'function' && typeof loadCompany === 'function')
        ? coLocale(loadCompany()).cur : 'CHF';

      // Karten aus dem vorigen Durchlauf entfernen
      ['priceGridReinigung','priceGridGeneric'].forEach(id =>
        document.getElementById(id)?.querySelectorAll('[data-customcard]').forEach(k => k.remove()));

      const svcs = servicesForCurrentVertical();
      const platzhalterKarte = reinigung ? platzhalter.closest('.price-card') : null;
      svcs.forEach(sv => {
        const karte = document.createElement('div');
        karte.className = 'price-card';
        karte.dataset.customcard = sv.id;
        karte.style = '--svc-color: var(--text-muted); --svc-color-soft: var(--surface-2);';
        karte.innerHTML = preisKarteHtml(sv, waehrung, 'setCustomServiceField', true);
        if (platzhalterKarte) grid.insertBefore(karte, platzhalterKarte); else grid.appendChild(karte);
      });

      if (!reinigung) {
        const zu = document.createElement('div');
        zu.className = 'price-card'; zu.dataset.customcard = '__add';
        zu.innerHTML = `<div class="price-card-body" style="text-align:center; padding:18px 0;">
          <button class="btn btn-secondary" style="width:100%;"
            onclick="document.getElementById('customServiceName')?.focus();
                     document.getElementById('customServiceName')?.scrollIntoView({behavior:'smooth', block:'center'});">
            + ${tt('price.custom.add', 'Service hinzufügen')}</button></div>`;
        grid.appendChild(zu);
      }

      platzhalter.innerHTML = `<div style="text-align:center; padding:14px 0 18px;">
        <button class="btn btn-secondary" style="width:100%;"
          onclick="document.getElementById('customServiceName')?.focus();
                   document.getElementById('customServiceName')?.scrollIntoView({behavior:'smooth', block:'center'});">
          + ${tt('price.custom.add', 'Service hinzufügen')}
        </button></div>`;
    }

    function setCustomServiceField(id, feld, wert) {
      const alle = loadCustomServices();
      const e = alle.find(x => x.id === id);
      if (!e) return;
      if (feld === 'unit') { e.unit = wert; }
      else {
        const z = Number(wert);
        if (!Number.isFinite(z) || z < 0) return;
        e[feld] = z;
      }
      localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(alle));
      try { window.MosaDB?.push('company_custom_services', alle); } catch {}
      renderCustomServices();
      toast('Gespeichert');
    }

    function setCustomServicePrice(id, wert) {
      const preis = Number(wert);
      if (!Number.isFinite(preis) || preis < 0) return;
      const alle = loadCustomServices();
      const eintrag = alle.find(x => x.id === id);
      if (!eintrag) return;
      eintrag.price = preis;
      localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(alle));
      try { window.MosaDB?.push('company_custom_services', alle); } catch {}
      renderCustomServices();
      toast('Preis gespeichert');
    }

    function renderCustomServices() {
      renderCustomServiceCards();
      const list = document.getElementById('customServicesList'); if (!list) return;
      const svcs = servicesForCurrentVertical();
      list.innerHTML = svcs.length ? svcs.map(s => `<span class="custom-service-chip"><strong>${escapeHtml(s.title)}</strong><span>${s.unit === 'h' ? 'CHF ' + s.price + ' / h' : 'CHF ' + s.price + ' pauschal'}</span><button title="Entfernen" onclick="removeCustomService('${s.id}')">×</button></span>`).join('') : '<span style="font-size:12px;color:var(--text-subtle);">Noch keine eigene Leistung angelegt.</span>';
    }
    function addCustomService() {
      if (!requirePerm('edit_prices', 'Eigene Leistungen')) return;
      const title = (document.getElementById('customServiceName')?.value || '').trim();
      const price = Number(document.getElementById('customServicePrice')?.value);
      const unit = document.getElementById('customServiceUnit')?.value === 'h' ? 'h' : 'flat';
      if (!title || !Number.isFinite(price) || price < 0) { toast('Bitte Name und einen gültigen Preis eingeben.', 'error'); return; }
      const all = loadCustomServices();
      all.push({ id: 'custom-' + Date.now(), vertical: window.MosaVertical?.get?.() || 'reinigung', title, desc: 'Eigene Leistung', price, unit, isCustom: true });
      localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(all));
      try { window.MosaDB?.push('company_custom_services', all); } catch {}
      document.getElementById('customServiceName').value = ''; document.getElementById('customServicePrice').value = '';
      renderCustomServices(); toast('✓ Eigene Leistung hinzugefügt');
    }
    function removeCustomService(id) {
      if (!requirePerm('edit_prices', 'Eigene Leistungen')) return;
      const all = loadCustomServices().filter(s => s.id !== id);
      localStorage.setItem(CUSTOM_SERVICES_KEY, JSON.stringify(all));
      try { window.MosaDB?.push('company_custom_services', all); } catch {}
      renderCustomServices();
    }
    function applyPriceSection() {
      const stat = document.getElementById('priceGridReinigung');
      const gen = document.getElementById('priceGridGeneric');
      if (!stat || !gen || !window.MosaVertical) return;
      if (MosaVertical.get() === 'reinigung') { stat.style.display = 'grid'; gen.style.display = 'none'; }
      else { stat.style.display = 'none'; gen.style.display = 'grid'; renderGenericPrices(); }
      renderCustomServices();
    }
    function renderGenericPrices() {
      const gen = document.getElementById('priceGridGeneric');
      if (!gen || !window.MosaVertical) return;
      const svcs = MosaVertical.preset().services || [];
      let prices = {}; try { prices = JSON.parse(localStorage.getItem('cc-prices') || '{}'); } catch {}
      const vert = MosaVertical.get();
      const canEdit = hasPerm('edit_prices');
      gen.innerHTML = svcs.map(s => {
        const def = { ...s, id: s.key, ...genericUeberschreibungen(s.key) };
        return `<div class="price-card" ${canEdit ? '' : 'data-locked="1"'}>`
             + preisKarteHtml(def, tt('price.cur', 'CHF'), 'setGenericServiceField', false)
             + `</div>`;
      }).join('');
      if (!canEdit) gen.querySelectorAll('input,button').forEach(e => e.disabled = true);
    }
    // Was der Betrieb an einer Preset-Leistung geaendert hat
    function genericUeberschreibungen(key) {
      const vert = MosaVertical.get();
      let p = {}; try { p = JSON.parse(localStorage.getItem('cc-prices') || '{}'); } catch {}
      const o = {};
      for (const [feld, endung] of [['unit','unit'], ['price','price'], ['minQty','min'], ['fee','fee']]) {
        const w = p[`${vert}_${key}_${endung}`];
        if (w != null) o[feld] = w;
      }
      return o;
    }
    function setGenericServiceField(key, feld, wert) {
      if (!requirePerm('edit_prices', 'Preise')) return;
      const endung = feld === 'minQty' ? 'min' : feld;
      let p = {}; try { p = JSON.parse(localStorage.getItem('cc-prices') || '{}'); } catch {}
      if (feld === 'unit') { p[`${MosaVertical.get()}_${key}_unit`] = wert; }
      else {
        const z = Number(wert);
        if (!Number.isFinite(z) || z < 0) return;
        p[`${MosaVertical.get()}_${key}_${endung}`] = z;
      }
      localStorage.setItem('cc-prices', JSON.stringify(p));
      try { window.MosaDB?.push('company_prices', p); } catch {}
      renderGenericPrices(); renderCustomServiceCards();
      toast('Gespeichert');
    }
    function onGenericPriceChange(input) {
      if (!hasPerm('edit_prices')) return;
      const pk = input.getAttribute('data-gprice');
      let prices = {}; try { prices = JSON.parse(localStorage.getItem('cc-prices') || '{}'); } catch {}
      prices[pk] = parseFloat(input.value) || 0;
      localStorage.setItem('cc-prices', JSON.stringify(prices));
      try { window.MosaDB?.push('company_prices', prices); } catch {}
    }
