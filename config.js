/* ============================================================
   TESSERA · Firmendaten
   ------------------------------------------------------------
   Hier trägst du deine Firmenangaben EINMAL ein.
   Sie werden automatisch in Impressum, AGB, Datenschutz, Footer
   und Anfrage-Mail eingesetzt. Du musst die HTML-Dateien nicht
   mehr einzeln bearbeiten.
   ============================================================ */
window.TESSERA_CONFIG = {
  // ---------- Rechtsform ----------
  // 'einzelunternehmen' oder 'gmbh' — bestimmt was im Impressum angezeigt wird
  legalForm: 'einzelunternehmen',

  // ---------- Geschäft ----------
  brand: 'Tessera',                  // Produktname / Geschäftsbezeichnung
  owner: 'Brian Knuchel',            // ← DEIN NAME als Inhaber (Pflicht bei Einzelunternehmen)
  street: 'Sandgrube 21',
  zip: '4614',
  city: 'Hägendorf',
  country: 'Schweiz',

  // ---------- Steuer (nur ausfüllen wenn MWST-pflichtig, also >100k CHF Jahresumsatz) ----------
  uid: '',                           // z.B. 'CHE-123.456.789' — leer = wird nicht angezeigt
  mwst: '',                          // z.B. 'CHE-123.456.789 MWST' — leer = wird nicht angezeigt

  // ---------- Kontakt ----------
  email: 'help.tessera@gmail.com',
  emailPrivacy: 'help.tessera@gmail.com',
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
  const cfg = window.TESSERA_CONFIG;
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
  });
})();
