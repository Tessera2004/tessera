/* ============================================================
   MOSAOS · Firmendaten
   ------------------------------------------------------------
   Hier trägst du deine Firmenangaben EINMAL ein.
   Sie werden automatisch in Impressum, AGB, Datenschutz, Footer
   und Anfrage-Mail eingesetzt. Du musst die HTML-Dateien nicht
   mehr einzeln bearbeiten.
   ============================================================ */
window.MOSAOS_CONFIG = {
  // ---------- Rechtsform ----------
  // 'einzelunternehmen' oder 'gmbh' — bestimmt was im Impressum angezeigt wird
  legalForm: 'einzelunternehmen',

  // ---------- Geschäft ----------
  brand: 'MosaOS',                  // Produktname / Geschäftsbezeichnung
  // Vertragspartner in AGB und «Über uns». MUSS zur Rechtsform passen —
  // fehlte dieser Schlüssel, stand dort faelschlich "MosaOS GmbH".
  legalName: 'MosaOS (Einzelunternehmen, Inhaber Brian Knuchel)',
  owner: 'Brian Knuchel',            // ← DEIN NAME als Inhaber (Pflicht bei Einzelunternehmen)
  street: 'Sandgrube 21',
  zip: '4614',
  city: 'Hägendorf',
  country: 'Schweiz',

  // ---------- Steuer (nur ausfüllen wenn MWST-pflichtig, also >100k CHF Jahresumsatz) ----------
  uid: '',                           // z.B. 'CHE-123.456.789' — leer = wird nicht angezeigt
  mwst: '',                          // z.B. 'CHE-123.456.789 MWST' — leer = wird nicht angezeigt

  // ---------- Kontakt ----------
  // info@mosaos.ch leitet per Cloudflare Email Routing an info.mosaos@gmail.com weiter.
  email: 'info@mosaos.ch',
  emailPrivacy: 'info@mosaos.ch',
  phone: '+41 76 526 59 75',
  // Ein Projekt, keine Umschaltung — siehe app/supabase-client.js
  functionsUrl: 'https://kxhsroiholjnyisaystr.supabase.co/functions/v1',
  publicApiKey: 'sb_publishable_eoasP900q_btzYLvvnTUQQ_L839WJH7',

  // ---------- Social ----------
  social: {
    linkedin: '#',
    instagram: '#',
    twitter: '#',
    github: '#',
  },

  // ---------- Footer ----------
  founded: 2026,
};

/* Auto-Einsetzen aller [data-cfg="..."] Elemente */
(function () {
  const cfg = window.MOSAOS_CONFIG;
  const get = (path) => path.split('.').reduce((acc, k) => (acc ? acc[k] : null), cfg);

  /* Füllt alle [data-cfg]-Elemente innerhalb von root (Standard: document).
     Als Funktion ausgelagert, damit i18n nach einem innerHTML-Update (data-i18n)
     die data-cfg-Spans erneut befüllen kann. */
  function fillCfg(root) {
    (root || document).querySelectorAll('[data-cfg]').forEach((el) => {
      const val = get(el.dataset.cfg);
      if (val == null || val === '') {
        // Leere Steuer-Felder ausblenden (Container mit data-cfg-hide-if-empty)
        if (el.dataset.cfgHideIfEmpty !== undefined) {
          const container = el.closest('[data-cfg-row]') || el;
          container.style.display = 'none';
        }
        return;
      }
      if (el.tagName === 'A' && el.dataset.cfg.startsWith('social.')) {
        el.href = val;
      } else if (el.tagName === 'A' && (el.dataset.cfg === 'email' || el.dataset.cfg === 'emailPrivacy')) {
        el.href = 'mailto:' + val;
        el.textContent = val;
      } else if (el.tagName === 'A' && el.dataset.cfg === 'phone') {
        el.href = 'tel:' + val.replace(/\s/g, '');
        el.textContent = val;
      } else {
        el.textContent = val;
      }
    });
  }

  // Nach außen verfügbar, damit i18n.js nach innerHTML-Updates erneut befüllen kann.
  window.MOSAOS_CONFIG_FILL = fillCfg;

  document.addEventListener('DOMContentLoaded', () => {
    // Body-Klasse für Rechtsform — CSS/HTML können je nach Form anders rendern
    document.body.classList.add('lf-' + (cfg.legalForm || 'einzelunternehmen'));

    fillCfg(document);

    // Sektionen nur für eine Rechtsform anzeigen
    document.querySelectorAll('[data-cfg-only]').forEach((el) => {
      const allowed = el.dataset.cfgOnly.split(',').map((s) => s.trim());
      if (!allowed.includes(cfg.legalForm)) el.style.display = 'none';
    });

    // ---------- Cookie-/Info-Banner (DSG-Transparenz) ----------
    // Wir setzen nur technisch notwendige Cookies (Session, Spracheinstellung),
    // daher reicht ein transparenter Hinweis ohne Consent-Auswahl.
    try {
      if (!localStorage.getItem('mosaos_cookie_ok')) {
        const bar = document.createElement('div');
        bar.id = 'mosaos-cookie';
        bar.setAttribute('role', 'note');
        bar.innerHTML =
          '<span><span data-i18n="cookie.text"></span> ' +
          '<a href="datenschutz.html" data-i18n="cookie.more"></a></span>' +
          '<button type="button" id="mosaos-cookie-ok" data-i18n="cookie.ok"></button>';
        // config.js wird vor i18n.js geladen: zunächst füllen und nach jedem
        // Sprachwechsel erneut übersetzen.
        const fillTexts = () => {
          const i18n = window.MOSAOS_I18N;
          if (!i18n || !i18n.t) return;
          bar.querySelectorAll('[data-i18n]').forEach((el) => {
            el.textContent = i18n.t(el.dataset.i18n);
          });
        };
        fillTexts();
        document.addEventListener('mosa-lang-changed', fillTexts);
        const s = bar.style;
        s.position = 'fixed'; s.left = '16px'; s.right = '16px'; s.bottom = '16px';
        s.maxWidth = '640px'; s.margin = '0 auto'; s.zIndex = '9999';
        s.display = 'flex'; s.gap = '16px'; s.alignItems = 'center'; s.justifyContent = 'space-between';
        s.background = '#16181d'; s.color = '#f4f4f5';
        s.padding = '14px 18px'; s.borderRadius = '14px';
        s.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
        s.font = '14px/1.4 Inter, system-ui, sans-serif';
        bar.querySelector('a').style.color = '#fca5a5';
        const btn = bar.querySelector('#mosaos-cookie-ok');
        const bs = btn.style;
        bs.flex = '0 0 auto'; bs.cursor = 'pointer'; bs.border = 'none';
        bs.background = '#E11D2A'; bs.color = '#fff';
        bs.padding = '8px 16px'; bs.borderRadius = '10px'; bs.fontWeight = '600';
        btn.addEventListener('click', () => {
          localStorage.setItem('mosaos_cookie_ok', '1');
          bar.remove();
        });
        document.body.appendChild(bar);
      }
    } catch (e) { /* localStorage evtl. blockiert — Banner einfach überspringen */ }
  });
})();
