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
  owner: 'Brian Knuchel',            // ← DEIN NAME als Inhaber (Pflicht bei Einzelunternehmen)
  street: 'Sandgrube 21',
  zip: '4614',
  city: 'Hägendorf',
  country: 'Schweiz',

  // ---------- Steuer (nur ausfüllen wenn MWST-pflichtig, also >100k CHF Jahresumsatz) ----------
  uid: '',                           // z.B. 'CHE-123.456.789' — leer = wird nicht angezeigt
  mwst: '',                          // z.B. 'CHE-123.456.789 MWST' — leer = wird nicht angezeigt

  // ---------- Kontakt ----------
  email: 'help.mosaos@gmail.com',
  emailPrivacy: 'help.mosaos@gmail.com',
  phone: '+41 76 526 59 75',

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
  document.addEventListener('DOMContentLoaded', () => {
    // Body-Klasse für Rechtsform — CSS/HTML können je nach Form anders rendern
    document.body.classList.add('lf-' + (cfg.legalForm || 'einzelunternehmen'));

    document.querySelectorAll('[data-cfg]').forEach((el) => {
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
          '<span>Wir verwenden nur technisch notwendige Cookies (Session &amp; Sprache) — kein Tracking, keine Werbung. ' +
          '<a href="datenschutz.html">Mehr erfahren</a></span>' +
          '<button type="button" id="mosaos-cookie-ok">Verstanden</button>';
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
