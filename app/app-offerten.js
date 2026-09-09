// MosaOS — app-offerten.js
//
// Offerten: Editor, eigene Textvorlagen, PDF-Ausgabe.
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

    // ============ OFFERTEN-SYSTEM ============
    let currentOffert = null; // null = neu, sonst ID
    let currentOffertImages = []; // array of dataURLs
    let currentOffertService = 'unterhalt';
    let currentOffertHistory = [];

    const svcShortLabels = {
      unterhalt: 'Unterhaltsreinigung',
      end: 'Endreinigung',
      fenster: 'Fensterreinigung',
      bau: 'Baureinigung',
      fassade: 'Fassadenreinigung'
    };

    // B7 — Kunde waehlen statt tippen, und den Preis aus der Preisliste holen.
    let offKundeId = null;
    let offPreisBeruehrt = false;   // von Hand geaenderte Preise nie ueberschreiben

    function offKundeListeZu() {
      const l = document.getElementById('offKundenListe');
      if (l) l.style.display = 'none';
    }

    function offKundeSuchen(text) {
      const liste = document.getElementById('offKundenListe');
      if (!liste) return;
      const q = (text || '').toLowerCase().trim();
      const treffer = loadCustomers().filter(c =>
        !q || customerDisplayName(c).toLowerCase().includes(q)
           || (c.address || '').toLowerCase().includes(q)
      ).slice(0, 8);
      if (!treffer.length) { offKundeListeZu(); return; }
      liste.innerHTML = treffer.map(c => `<button type="button" onclick="offKundeWaehlen('${c.id}')">
        ${escapeHtml(customerDisplayName(c))}${c.address ? `<small>${escapeHtml(c.address)}</small>` : ''}
      </button>`).join('');
      liste.style.display = 'block';
    }

    function offKundeWaehlen(id) {
      const c = loadCustomers().find(x => x.id === id);
      if (!c) return;
      offKundeId = c.id;
      const k = document.getElementById('offKunde'); if (k) k.value = customerDisplayName(c);
      const a = document.getElementById('offAdresse');
      if (a && !a.value.trim() && c.address) a.value = c.address;
      offKundeListeZu();
      offPreisAusPreisliste();
      renderOffertTemplate();
    }

    // Preis aus derselben Preisliste, die auch der Auftrag-Assistent nutzt
    function offPreisAusPreisliste(erzwingen = false) {
      const feld = document.getElementById('offPreis');
      const hinweis = document.getElementById('offPreisHinweis');
      const label = document.getElementById('offMengeLabel');
      if (!feld) return;
      let def = genericServiceDef(currentOffertService);
      if (!def && !isGenericVertical()) {
        def = {
          unterhalt: { unit: 'h', price: getPrice('unterhalt-rate'), minQty: 0, fee: 0 },
          end: { unit: 'qm', price: getPrice('end-qm'), minQty: 0, fee: 0 },
          fenster: { unit: 'h', price: getPrice('fenster-rate'), minQty: getPrice('fenster-min'), fee: 0 },
          bau: { unit: 'qm', price: getPrice('bau-qm'), minQty: 0, fee: 0 },
          fassade: { unit: 'qm', price: getPrice('fassade-stator'), minQty: getPrice('fassade-min'), fee: 0 }
        }[currentOffertService];
      }
      const waehrung = coLocale(loadCompany()).cur;
      if (!def) {
        if (hinweis) hinweis.textContent = tt('off.noPrice', 'Für diese Leistung ist kein Preis hinterlegt.');
        if (label) label.textContent = tt('off.qty', 'Menge');
        return;
      }
      const einheit = def.unit === 'h' ? 'h' : (def.unit === 'qm' ? 'qm' : 'flat');
      if (label) label.textContent = einheit === 'h' ? tt('off.hours', 'Stunden')
                                   : einheit === 'qm' ? tt('off.sqm', 'Fläche in m²')
                                   : tt('off.qty', 'Menge');
      const grund = Number(def.price) || 0;
      const mindest = Number(def.minQty) || 0;
      const anfahrt = Number(def.fee) || 0;
      let menge = parseFloat(document.getElementById('offMenge')?.value) || 1;
      let preis, text;
      if (einheit === 'h') {
        const echte = Math.max(menge, mindest);
        preis = echte * grund;
        text = `${echte} × ${waehrung} ${grund}` + (echte > menge ? ` (${tt('price.row.minHours','Mindestbuchung')})` : '');
      } else if (einheit === 'qm') {
        preis = menge * grund;
        text = `${menge} m² × ${waehrung} ${grund}`;
      } else {
        preis = menge * grund;
        text = menge > 1 ? `${menge} × ${waehrung} ${grund}` : `${waehrung} ${grund}`;
      }
      if (einheit !== 'h' && mindest > 0 && preis < mindest) {
        preis = mindest;
        text += ` · ${tt('price.row.minOrder','Mindestauftrag')} ${waehrung} ${mindest}`;
      }
      if (anfahrt > 0) { preis += anfahrt; text += ` + ${waehrung} ${anfahrt} ${tt('price.row.fee','Anfahrt')}`; }
      preis = Math.round(preis * 20) / 20;
      if (hinweis) hinweis.textContent = text;
      // Einen von Hand gesetzten Preis nur auf ausdruecklichen Wunsch ersetzen
      if (!offPreisBeruehrt || erzwingen) {
        feld.value = preis;
        offPreisBeruehrt = false;
        renderOffertTemplate();
      }
    }

    // Logo oben links ins PDF, gibt die x-Position fuer den Text zurueck
    function pdfLogo(doc, co, x, y) {
      if (!co.logo) return x;
      try {
        const mime = /^data:image\/(png|jpe?g);/i.exec(co.logo);
        if (!mime) throw new Error('unsupported logo');
        const size = doc.getImageProperties(co.logo);
        if (!(size.width > 0 && size.height > 0)) throw new Error('invalid logo');
        const scale = Math.min(22 / size.width, 18 / size.height);
        const width = size.width * scale, height = size.height * scale;
        doc.addImage(co.logo, /^jpe?g$/i.test(mime[1]) ? 'JPEG' : 'PNG', x, y - 4, width, height, undefined, 'FAST');
        return x + width + 5;
      } catch {
        toast(tt('pdf.logoSkipped', 'Das Logo konnte nicht ins PDF übernommen werden. Bitte ein PNG- oder JPG-Logo hochladen.'), 'error');
        return x;
      }
    }

    // C1 — die Dauer kam bisher aus fest eingebauten Faktoren:
    // Flaeche x 1.8 min + Zimmer x 15 min, bei der Baureinigung x 1.2.
    // Jeder Betrieb rechnet anders, also gehoeren sie in die Einstellungen.
    const ZEITFAKTOREN_KEY = 'cc-zeitfaktoren-v1';
    const ZEITFAKTOREN_STANDARD = { proQm: 1.8, proRaum: 15, bauProQm: 1.2 };

    function ladeZeitfaktoren() {
      try {
        const v = JSON.parse(localStorage.getItem(ZEITFAKTOREN_KEY));
        return { ...ZEITFAKTOREN_STANDARD, ...(v && typeof v === 'object' ? v : {}) };
      } catch { return { ...ZEITFAKTOREN_STANDARD }; }
    }

    function speichereZeitfaktoren(f) {
      localStorage.setItem(ZEITFAKTOREN_KEY, JSON.stringify(f));
      window.MosaDB?.push('company_time_factors', f);
    }

    // Die Grunddauer eines Einsatzes aus Flaeche und Zimmerzahl
    function grunddauer(flaeche, raeume) {
      const f = ladeZeitfaktoren();
      return Math.round((flaeche || 0) * f.proQm + (raeume || 0) * f.proRaum);
    }

    function hexZuRgb(hex) {
      if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null;
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    function formatDateDE(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}.${m}.${y}`;
    }

    function todayISO() {
      return new Date().toISOString().slice(0, 10);
    }

    function validUntilISO(daysAhead = 30) {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      return d.toISOString().slice(0, 10);
    }

    function buildTemplate(svc, data) {
      const kunde = data.kunde?.trim() || '[Kundenname]';
      const adresse = data.adresse?.trim() || '[Adresse]';
      const currency = coLocale(loadCompany()).cur;
      const preis = data.preis ? `${parseFloat(data.preis).toFixed(2)} ${currency}` : '[Preis]';
      const datum = formatDateDE(data.datum || todayISO());
      const gueltig = formatDateDE(validUntilISO(30));
      const co = loadCompany();
      const coSig = `${co.name || 'MosaOS'}\n${[co.addr1, co.addr2].filter(Boolean).join(', ')}`;

      const templates = {
        unterhalt: `Guten Tag ${kunde}

vielen Dank für Ihre Anfrage zur regelmäßigen Reinigung Ihres Objektes.
Hiermit unterbreiten wir Ihnen folgendes Angebot für eine professionelle Unterhaltsreinigung.

Leistungsumfang
• Reinigung sämtlicher Böden, Sanitäranlagen und Arbeitsflächen
• Mülleimer leeren, Eingangsbereich pflegen
• Spiegel und Glasflächen polieren
• Wöchentlicher Qualitätsbericht mit Foto-Dokumentation

Objekt: ${adresse}
Stundensatz: ${currency} ${getPrice('unterhalt-rate').toFixed(2)} / h
Pauschalpreis pro Einsatz: ${preis}

Das Angebot ist gültig bis ${gueltig}.
Wir freuen uns auf Ihre Rückmeldung.

Mit freundlichen Grüßen
${coSig}`,

        end: `Guten Tag ${kunde}

gerne unterbreiten wir Ihnen ein Angebot für die Endreinigung Ihrer Wohnung.

Leistungsumfang
• Komplette Wohnungsreinigung inkl. aller Räume
• Küche inkl. Geräte (Backofen, Kühlschrank, Spüle)
• Sanitärbereich entkalken und desinfizieren
• Fenster innen, Heizkörper, Türrahmen
• Abgabebereite Ausführung

Adresse: ${adresse}
Preis pro m²: ${currency} ${getPrice('end-qm').toFixed(2)}
Pauschalpreis: ${preis}

Das Angebot ist gültig bis ${gueltig}.
Wir garantieren eine abnahmefähige Wohnung — andernfalls Nachreinigung kostenfrei.

Mit freundlichen Grüßen
${coSig}`,

        fenster: `Guten Tag ${kunde}

vielen Dank für Ihr Interesse an unserer Fensterreinigung.

Leistungsumfang
• Reinigung sämtlicher Fenster innen und außen
• Rahmen, Fensterbänke und Beschläge inkl.
• Streifenfrei dank Osmose-Wassertechnik
• Auf Wunsch mit Leiter oder Hubsteiger

Objekt: ${adresse}
Stundensatz: ${currency} ${getPrice('fenster-rate').toFixed(2)} / h
Voraussichtlicher Gesamtpreis: ${preis}
Mindestbuchung: ${getPrice('fenster-min')} Stunden

Das Angebot ist gültig bis ${gueltig}.

Mit freundlichen Grüßen
${coSig}`,

        bau: `Guten Tag ${kunde}

gerne übernehmen wir die Baureinigung Ihres Projektes.

Leistungsumfang
• Entfernung von Bau- und Schleifstaub
• Reinigung sämtlicher Bodenbeläge
• Klebereste und Folien entfernen
• Fenster, Rahmen und Sanitärobjekte reinigen
• Übergabefertige Schlussreinigung

Objekt: ${adresse}
Preis pro m²: ${currency} ${getPrice('bau-qm').toFixed(2)}
Pauschalpreis: ${preis}

Das Angebot ist gültig bis ${gueltig}.
Wir koordinieren uns gerne direkt mit den Gewerken vor Ort.

Mit freundlichen Grüßen
${coSig}`,

        fassade: `Guten Tag ${kunde}

für die Reinigung Ihrer Fassade unterbreiten wir Ihnen folgendes Angebot.

Leistungsumfang
• Schonende Fassadenreinigung mit geeignetem Verfahren (${currency} ${getPrice('fassade-stator').toFixed(2)} / m²)
• Optional: Algen- und Moosentfernung
• Optional: Imprägnierung für Langzeitschutz
• Zugangstechnik nach Aufwand und örtlichen Gegebenheiten

Objekt: ${adresse}
Mindestauftragswert: ${currency} ${getPrice('fassade-min').toFixed(2)}
Gesamtpreis: ${preis}

Das Angebot ist gültig bis ${gueltig}.
Vor Beginn führen wir eine Probefläche aus.

Mit freundlichen Grüßen
${coSig}`
      };

      // Generische Branchen: neutrales Angebot aus dem Preset (keine Reinigungs-Texte).
      if (isGenericVertical()) {
        const def = genericServiceDef(svc);
        const title = serviceTitle(svc);
        const preisCHF = data.preis ? `${parseFloat(data.preis).toFixed(2)} ${currency}` : '[Preis]';
        const priceLine = (def && def.unit === 'h')
          ? `Stundensatz: ${currency} ${genericServicePrice(svc).toFixed(2)} / h`
          : `Pauschalpreis: ${currency} ${genericServicePrice(svc).toFixed(2)}`;
        return `Guten Tag ${kunde}

vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot für „${title}".

Leistung: ${title}
${def?.desc ? '• ' + def.desc + '\n' : ''}${VT('adresseObjekt')}: ${adresse}
${priceLine}
Voraussichtlicher Gesamtpreis: ${preisCHF}

Das Angebot ist gültig bis ${gueltig}.
Wir freuen uns auf Ihre Rückmeldung.

Mit freundlichen Grüßen
${coSig}`;
      }

      // B7/B8 — eigene Vorlagen: eine hinterlegte Einleitung ersetzt den
      // Standardanfang, ein hinterlegter Schluss den Standardschluss.
      return eigeneVorlageAnwenden(templates[svc] || templates.unterhalt, data);
    }

    // ============ Eigene Text-Vorlagen (Offerte und Rechnung) ============
    const VORLAGEN_KEY = 'cc-vorlagen-v1';

    function ladeVorlagen() {
      try { return JSON.parse(localStorage.getItem(VORLAGEN_KEY)) || {}; } catch { return {}; }
    }

    function speichereVorlagen(v) {
      localStorage.setItem(VORLAGEN_KEY, JSON.stringify(v));
      window.MosaDB?.push('company_templates', v);
    }

    // Platzhalter, die in einer eigenen Vorlage stehen duerfen
    function platzhalterFuellen(text, data) {
      const co = loadCompany();
      const ersetzungen = {
        '{kunde}': data?.kunde || '',
        '{adresse}': data?.adresse || '',
        '{preis}': data?.preis ? `${parseFloat(data.preis).toFixed(2)} ${coLocale(co).cur}` : '',
        '{datum}': formatDateDE(data?.datum || todayISO()),
        '{gueltig}': formatDateDE(validUntilISO(30)),
        '{firma}': co.name || '',
        '{leistung}': serviceTitle(currentOffertService) || ''
      };
      return Object.entries(ersetzungen)
        .reduce((t, [k, v]) => t.split(k).join(v), String(text || ''));
    }

    function eigeneVorlageAnwenden(standard, data) {
      const v = ladeVorlagen();
      if (!v.offerteEinleitung && !v.offerteSchluss) return standard;
      let text = String(standard);
      if (v.offerteEinleitung) {
        // Der erste Absatz nach der Anrede ist die Einleitung — ganz ersetzen,
        // nicht nur die erste Zeile davon.
        const zeilen = text.split('\n');
        const anrede = zeilen[0];
        let i = 1;
        while (i < zeilen.length && !zeilen[i].trim()) i++;   // Leerzeilen ueberspringen
        while (i < zeilen.length && zeilen[i].trim()) i++;    // den Absatz selbst
        text = anrede + '\n\n' + platzhalterFuellen(v.offerteEinleitung, data)
             + '\n' + zeilen.slice(i).join('\n');
      }
      if (v.offerteSchluss) {
        // Ab 'Mit freundlichen Grüßen' den eigenen Schluss setzen
        const i = text.lastIndexOf('Mit freundlichen');
        if (i > 0) text = text.slice(0, i) + platzhalterFuellen(v.offerteSchluss, data);
        else text += '\n\n' + platzhalterFuellen(v.offerteSchluss, data);
      }
      return text;
    }

    function renderOffertTemplate() {
      // nur neu rendern wenn Text noch leer ist oder explizit angefordert
      const ta = document.getElementById('offText');
      if (!ta || ta.dataset.manuallyEdited === 'true') return;
      const data = {
        kunde: document.getElementById('offKunde')?.value,
        adresse: document.getElementById('offAdresse')?.value,
        preis: document.getElementById('offPreis')?.value,
        datum: document.getElementById('offDatum')?.value
      };
      ta.value = buildTemplate(currentOffertService, data);
    }

    function regenerateOffertText() {
      const ta = document.getElementById('offText');
      ta.dataset.manuallyEdited = 'false';
      renderOffertTemplate();
      toast('Text aus Vorlage neu erzeugt');
    }

    function selectOffertService(btn, svc) {
      currentOffertService = svc;
      btn.parentElement.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('on'));
      btn.classList.add('on');
      const pill = document.getElementById('offSvcPill');
      pill.className = 'svc-pill svc-' + svc;
      pill.textContent = svcShortLabels[svc] || serviceTitle(svc);
      // Text neu generieren (wenn nicht manuell bearbeitet)
      document.getElementById('offText').dataset.manuallyEdited = 'false';
      offPreisAusPreisliste();   // andere Leistung, anderer Preis
      renderOffertTemplate();
    }

    // Offerten-Service-Chips: Reinigung = statische Chips, andere Branchen = aus Preset.
    const OFFERT_CHIPS_STATIC = document.getElementById('offSvcChips')?.innerHTML || '';
    function setupOffertChips() {
      const row = document.getElementById('offSvcChips');
      if (!row) return 'unterhalt';
      if (isGenericVertical()) {
        const svcs = MosaVertical.preset().services || [];
        row.innerHTML = svcs.map((s, i) =>
          `<button type="button" class="opt-chip${i === 0 ? ' on' : ''}" data-off-svc="${s.key}" onclick="selectOffertService(this,'${s.key}')">${escapeHtml(s.title)}</button>`).join('');
        return svcs[0]?.key || 'unterhalt';
      }
      row.innerHTML = OFFERT_CHIPS_STATIC;   // Reinigungs-Original wiederherstellen
      return 'unterhalt';
    }

    let currentOffertOriginal = null; // Snapshot zum Vergleich (Änderungs-Erkennung)

    function openOffertEditor(id = null) {
      const priceLabel = document.getElementById('offPreisLabel');
      if (priceLabel) priceLabel.textContent = `Gesamtpreis (${coLocale(loadCompany()).cur})`;
      offKundeId = null;
      offPreisBeruehrt = !!id;   // bestehende Offerte: gespeicherten Preis behalten
      offKundeListeZu();
      currentOffert = id;
      currentOffertImages = [];
      currentOffertHistory = [];
      currentOffertOriginal = null;

      const firstSvc = setupOffertChips();   // Chips je Branche aufbauen
      const offerts = JSON.parse(localStorage.getItem('cc-offerts') || '[]');
      if (id) {
        const off = offerts.find(o => o.id === id);
        if (off) {
          offKundeId = off.customerId || (loadCustomers().find(c => customerDisplayName(c).trim().toLowerCase() === (off.kunde || '').trim().toLowerCase()) || {}).id || null;
          currentOffertService = off.service;
          document.querySelectorAll('#offSvcChips .opt-chip').forEach(c => c.classList.toggle('on', c.dataset.offSvc === off.service));
          currentOffertImages = (off.images || []).slice();
          currentOffertHistory = (off.history || []).slice();
          document.getElementById('offKunde').value = off.kunde || '';
          document.getElementById('offAdresse').value = off.adresse || '';
          document.getElementById('offPreis').value = off.preis || '';
          document.getElementById('offDatum').value = off.datum || todayISO();
          document.getElementById('offText').value = off.text || '';
          document.getElementById('offText').dataset.manuallyEdited = 'true';
          document.getElementById('offModalTitle').textContent = tt('dyn.offEdit', 'Offerte bearbeiten');
          document.getElementById('offModalSub').textContent = tt('dyn.offSubEdit', 'Beim Speichern fragen wir nach dem Grund der Änderung');
          document.getElementById('offDeleteBtn').style.display = 'inline-flex';
          // Snapshot für Änderungserkennung
          currentOffertOriginal = {
            service: off.service,
            kunde: off.kunde || '',
            adresse: off.adresse || '',
            preis: String(off.preis ?? ''),
            datum: off.datum || '',
            text: off.text || '',
            imagesCount: (off.images || []).length
          };
          renderOffertHistory();
        }
      } else {
        // neue Offerte
        document.getElementById('offKunde').value = '';
        document.getElementById('offAdresse').value = '';
        document.getElementById('offPreis').value = '';
        document.getElementById('offDatum').value = todayISO();
        document.getElementById('offText').value = '';
        document.getElementById('offText').dataset.manuallyEdited = 'false';
        document.getElementById('offModalTitle').textContent = tt('dyn.offNew', 'Neue Offerte');
        document.getElementById('offModalSub').textContent = tt('dyn.offSubNew', 'Vorgefertigter Text — nur Kundendaten ergänzen');
        document.getElementById('offDeleteBtn').style.display = 'none';
        document.getElementById('offHistory').style.display = 'none';
        // set initial service pill (erste Leistung der Branche)
        const firstChip = document.querySelector(`[data-off-svc="${firstSvc}"]`);
        if (firstChip) selectOffertService(firstChip, firstSvc);
      }

      // Service-Pill setzen
      const pill = document.getElementById('offSvcPill');
      pill.className = 'svc-pill svc-' + currentOffertService;
      pill.textContent = svcShortLabels[currentOffertService] || serviceTitle(currentOffertService);
      document.querySelectorAll('[data-off-svc]').forEach(c => {
        c.classList.toggle('on', c.dataset.offSvc === currentOffertService);
      });

      renderOffertImages();
      renderOffertTemplate();
      openModal('offert');
    }

    function handleOffertImages(e) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          currentOffertImages.push({ src: ev.target.result, name: file.name });
          renderOffertImages();
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }

    function removeOffertImage(idx) {
      currentOffertImages.splice(idx, 1);
      renderOffertImages();
    }

    function renderOffertImages() {
      const grid = document.getElementById('offImageGrid');
      const empty = document.getElementById('offNoImages');
      if (currentOffertImages.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
      }
      grid.style.display = 'grid';
      empty.style.display = 'none';
      grid.innerHTML = currentOffertImages.map((img, i) => `
        <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
          <img src="${img.src}" alt="${img.name}" style="width: 100%; height: 100%; object-fit: cover;" />
          <button onclick="removeOffertImage(${i})" style="position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); border: none; cursor: pointer; font-size: 14px;">×</button>
        </div>
      `).join('');
    }

    function renderOffertHistory() {
      const wrap = document.getElementById('offHistory');
      const list = document.getElementById('offHistoryList');
      if (!currentOffertHistory || currentOffertHistory.length === 0) {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = 'block';
      list.innerHTML = currentOffertHistory.map(h => `
        <div style="font-size: 12px; padding: 8px 12px; background: var(--surface-2); border-radius: 6px; border-left: 3px solid var(--accent);">
          <div style="color: var(--text-subtle); margin-bottom: 2px;">${formatDateDE(h.date)} · ${h.time || ''}</div>
          <div style="color: var(--text);">${h.reason}</div>
          ${h.by ? `<div class="history-author">— von ${h.by}</div>` : ''}
        </div>
      `).join('');
    }

    function collectOffertForm() {
      const customerName = document.getElementById('offKunde').value.trim();
      const matchedCustomer = offKundeId || (loadCustomers().find(c =>
        customerDisplayName(c).trim().toLowerCase() === customerName.toLowerCase()) || {}).id;
      return {
        id: currentOffert || ('off-' + Date.now()),
        service: currentOffertService,
        customerId: matchedCustomer || undefined,
        kunde: customerName,
        adresse: document.getElementById('offAdresse').value.trim(),
        preis: document.getElementById('offPreis').value,
        datum: document.getElementById('offDatum').value || todayISO(),
        text: document.getElementById('offText').value.trim(),
        images: currentOffertImages,
        history: (currentOffertHistory || []).slice(),
        status: 'Entwurf',
        updated: new Date().toISOString()
      };
    }

    function offertHasChanges(data) {
      if (!currentOffertOriginal) return false;
      const o = currentOffertOriginal;
      return (
        o.service !== data.service ||
        o.kunde !== data.kunde ||
        o.adresse !== data.adresse ||
        o.preis !== String(data.preis ?? '') ||
        o.datum !== data.datum ||
        o.text !== data.text ||
        o.imagesCount !== (data.images?.length || 0)
      );
    }

    function setRevReason(txt) {
      const input = document.getElementById('revReasonInput');
      input.value = txt;
      input.focus();
      document.getElementById('revReasonError').style.display = 'none';
    }

    function persistOffert(data, reason) {
      if (!requirePerm('edit_offerts', 'Offerten')) return;
      const authorName = currentUser ? getUserName(currentUser) : 'Unbekannt';
      const authorProfile = currentUser ? { id:currentUser.id || null, name:authorName, email:currentUser.email || window._authEmail || '', role:currentUser.role || '' } : { id:null, name:authorName, email:window._authEmail || '', role:'' };
      if (reason) {
        const now = new Date();
        data.history.push({
          date: now.toISOString().slice(0, 10),
          time: now.toTimeString().slice(0, 5),
          reason: reason,
          by: authorName
        });
      }
      const offerts = JSON.parse(localStorage.getItem('cc-offerts') || '[]');
      const idx = offerts.findIndex(o => o.id === data.id);
      if (idx >= 0) {
        data.lastUpdatedBy = authorName;
        data.updatedBy = authorProfile;
        data.updatedAt = new Date().toISOString();
        offerts[idx] = data;
        toast('✓ Offerte aktualisiert');
      } else {
        data.createdBy = authorName;
        data.lastUpdatedBy = authorName;
        data.createdByProfile = authorProfile;
        data.updatedBy = authorProfile;
        data.createdAt = data.createdAt || new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        offerts.unshift(data);
        toast('✓ Offerte gespeichert');
      }
      localStorage.setItem('cc-offerts', JSON.stringify(offerts));
      if (typeof protokolliere === 'function') protokolliere(idx >= 0 ? 'geaendert' : 'angelegt', 'offerts', data.number || data.kunde || 'Offerte');
      closeModal('offert');
      renderOffertList();
    }

    // ============ PDF-Export Offerte ============
    function downloadOffertePDF() {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        toast('PDF-Bibliothek lädt noch — kurz warten', 'error');
        return;
      }
      const data = collectOffertForm();
      if (!data.kunde) { toast('Bitte Kundenname angeben', 'error'); return; }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 18;
      const co = loadCompany();
      const L = coLocale(co);
      const markenFarbe = hexZuRgb(co.brandColor) || [225, 29, 42];
      const datum = data.datum || new Date().toISOString().slice(0,10);
      const datumDE = new Date(datum).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' });
      const offNr = (data.id || '').slice(-6).toUpperCase();
      const svcLbl = (typeof svcShortLabels !== 'undefined' && svcShortLabels[data.service]) || data.service || 'Reinigung';
      let y = 0;

      function pageHeader(firstPage) {
        doc.setFillColor(248, 248, 249);
        doc.rect(0, 0, W, firstPage ? 39 : 24, 'F');
        doc.setFillColor(markenFarbe[0], markenFarbe[1], markenFarbe[2]);
        doc.rect(0, 0, 4, firstPage ? 39 : 24, 'F');
        const logoY = firstPage ? 16 : 13;
        const textX = pdfLogo(doc, co, M, logoY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(firstPage ? 16 : 12);
        doc.setTextColor(28, 31, 36);
        doc.text(co.name || 'Firma', textX, logoY);
        if (firstPage) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.3);
          doc.setTextColor(105, 110, 118);
          const companyLine = [co.addr1, co.addr2, co.contact].filter(Boolean).join('  |  ');
          if (companyLine) doc.text(companyLine, textX, logoY + 5);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(markenFarbe[0], markenFarbe[1], markenFarbe[2]);
          doc.text('ANGEBOT', W - M, 13, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 84, 91);
          doc.text(`Nr. ${offNr || 'ENTWURF'}`, W - M, 19, { align: 'right' });
          doc.text(datumDE, W - M, 24, { align: 'right' });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(110);
          doc.text(`Offerte ${offNr || 'ENTWURF'}  |  ${data.kunde}`, W - M, logoY, { align: 'right' });
        }
        y = firstPage ? 50 : 34;
      }

      function ensureSpace(mm) {
        if (y + mm <= H - 22) return;
        doc.addPage();
        pageHeader(false);
      }

      function sectionLabel(label) {
        ensureSpace(11);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(markenFarbe[0], markenFarbe[1], markenFarbe[2]);
        doc.text(String(label).toUpperCase(), M, y);
        y += 6;
      }

      function bodyText(text, options = {}) {
        const indent = options.indent || 0;
        const width = W - 2 * M - indent;
        doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
        doc.setFontSize(options.size || 9.6);
        doc.setTextColor(options.muted ? 96 : 38, options.muted ? 100 : 41, options.muted ? 108 : 47);
        const wrapped = doc.splitTextToSize(String(text), width);
        ensureSpace(wrapped.length * 4.8 + 1);
        doc.text(wrapped, M + indent, y);
        y += wrapped.length * 4.8 + (options.after ?? 2.4);
      }

      pageHeader(true);

      // Empfänger und Angebotsgegenstand klar voneinander trennen.
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(115);
      doc.text('EMPFÄNGER', M, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(26, 29, 34);
      doc.text(data.kunde, M, y + 6);
      if (data.adresse) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.3);
        doc.setTextColor(82, 86, 94);
        doc.text(doc.splitTextToSize(data.adresse, 75), M, y + 12);
      }

      doc.setFillColor(248, 248, 249);
      doc.roundedRect(W - M - 72, y - 4, 72, 25, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(112);
      doc.text('ANGEBOTENE LEISTUNG', W - M - 68, y + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 33, 38);
      doc.text(doc.splitTextToSize(svcLbl, 64), W - M - 68, y + 9);
      y += 31;

      // Editor-Inhalt professionell setzen: Metadaten und Preiszeilen erscheinen
      // bereits in eigenen Bereichen und werden deshalb nicht doppelt gedruckt.
      sectionLabel('Leistungsbeschreibung');
      const rawLines = String(data.text || 'Leistungsbeschreibung folgt nach Besichtigung.').split(/\r?\n/);
      const duplicateLine = /^(Objekt|Adresse|Leistung|Stundensatz|Preis pro|Pauschalpreis|Gesamtpreis|Voraussichtlicher Gesamtpreis|Mindestbuchung|Mindestauftragswert)\s*:/i;
      let signoffReached = false;
      rawLines.forEach((raw, index) => {
        const line = raw.trim();
        if (/^Mit freundlichen Gr/i.test(line)) { signoffReached = true; return; }
        if (signoffReached || duplicateLine.test(line)) return;
        if (!line) { y += index ? 1.4 : 0; return; }
        if (/^Leistungsumfang:?$/i.test(line)) {
          bodyText('Im Preis enthalten', { bold: true, size: 9.8, after: 2 });
          return;
        }
        if (/^[•\-] ?/.test(line)) {
          ensureSpace(7);
          doc.setFillColor(markenFarbe[0], markenFarbe[1], markenFarbe[2]);
          doc.circle(M + 1.2, y - 1.1, 0.8, 'F');
          bodyText(line.replace(/^[•\-] ?\s*/, ''), { indent: 5, after: 1.4 });
          return;
        }
        if (/^Das Angebot ist gültig/i.test(line)) return;
        bodyText(line, { after: 2.5 });
      });
      y += 4;

      // Preisübersicht als ruhige, klar lesbare Zusammenfassung.
      ensureSpace(48);
      sectionLabel('Preisübersicht');
      const preis = parseFloat(data.preis || 0);
      const mwst = preis * L.vat;
      const brutto = preis + mwst;
      const priceHeight = L.mwstPflichtig ? 35 : 31;
      doc.setFillColor(248, 248, 249);
      doc.roundedRect(M, y, W - 2 * M, priceHeight, 2, 2, 'F');
      doc.setFontSize(9.3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(76, 80, 87);
      doc.text('Leistung netto', M + 6, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 32, 37);
      doc.text(preis > 0 ? `${preis.toFixed(2)} ${L.cur}` : 'Nach Vereinbarung', W - M - 6, y + 8, { align: 'right' });
      if (L.mwstPflichtig) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(76, 80, 87);
        doc.text(L.vatLabel, M + 6, y + 15);
        doc.setTextColor(29, 32, 37);
        doc.text(`${mwst.toFixed(2)} ${L.cur}`, W - M - 6, y + 15, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(L.steuerHinweis, M + 6, y + 15);
      }
      doc.setDrawColor(markenFarbe[0], markenFarbe[1], markenFarbe[2]);
      doc.setLineWidth(0.35);
      doc.line(M + 6, y + 20, W - M - 6, y + 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(markenFarbe[0], markenFarbe[1], markenFarbe[2]);
      doc.text(L.mwstPflichtig ? 'Gesamt inkl. MWST' : 'Gesamt', M + 6, y + 28);
      doc.text(preis > 0 ? `${brutto.toFixed(2)} ${L.cur}` : 'Nach Vereinbarung', W - M - 6, y + 28, { align: 'right' });
      y += priceHeight + 8;

      ensureSpace(47);
      doc.setFillColor(253, 248, 248);
      doc.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 82, 89);
      const validity = 'Gültig 30 Tage ab Offertdatum. Zusatzleistungen erfolgen nur nach vorgängiger Absprache.';
      doc.text(doc.splitTextToSize(validity, W - 2 * M - 12), M + 6, y + 7);
      y += 29;

      doc.setDrawColor(150, 153, 160);
      doc.setLineWidth(0.25);
      doc.line(M, y, M + 70, y);
      doc.line(W - M - 70, y, W - M, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(105);
      doc.text('Ort, Datum / Unterschrift Auftraggeber', M, y + 5);
      doc.text('Unterschrift Auftragnehmer', W - M, y + 5, { align: 'right' });

      // Einheitlicher Seitenfuss auf jeder Seite.
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setDrawColor(226, 227, 230);
        doc.setLineWidth(0.2);
        doc.line(M, H - 14, W - M, H - 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        const legal = [co.name, co.mwst ? `MWST ${co.mwst}` : '', co.contact].filter(Boolean).join('  |  ');
        doc.text(legal || co.name || '', M, H - 9);
        doc.text(`Seite ${page} / ${pageCount}`, W - M, H - 9, { align: 'right' });
      }

      // Save
      const safeKunde = (data.kunde || 'kunde').replace(/[^a-zA-Z0-9_-]+/g, '_');
      doc.save(`Offerte_${offNr || 'NEU'}_${safeKunde}.pdf`);
      toast('✓ PDF heruntergeladen');
    }

    /* ============================================================
       Branchen-Belege als PDF (Rapport, HACCP-Protokoll,
       Werkstattauftrag, Reifen-Einlagerung)
       — gemeinsame Helfer + ein Export je Beleg. Gleiches Layout
       wie die Offerte (Firmen-Header, Brand-Rot, Unterschriftsleiste).
       ============================================================ */
    function newBelegDoc() {
      if (!window.jspdf || !window.jspdf.jsPDF) { toast('PDF-Bibliothek lädt noch — kurz warten', 'error'); return null; }
      return new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    }
    // Firmen-Header + Dokumenttitel; liefert Layout {doc,W,H,M,y}. meta = rechts ausgerichtete Zeilen.
    function belegHeader(doc, title, meta) {
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 20; let y = M;
      const co = loadCompany();
      const mf = hexZuRgb(co.brandColor) || [225, 29, 42];
      const tx = pdfLogo(doc, co, M, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(mf[0], mf[1], mf[2]);
      doc.text(co.name || 'Firma', tx, y);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
      if (co.addr1) doc.text([co.addr1, co.addr2].filter(Boolean).join(', '), tx, y + 5);
      doc.setFontSize(8.5);
      if (co.contact) doc.text(co.contact, W - M, y, { align: 'right' });
      const L = coLocale(co);
      if (co.mwst) doc.text(L.vatIdLabel + ' ' + co.mwst, W - M, y + 4, { align: 'right' });
      y += 18;
      doc.setDrawColor(mf[0], mf[1], mf[2]); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 10;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20);
      doc.text(title, M, y);
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
      (meta || []).forEach((line, i) => doc.text(line, W - M, y - 4 + i * 5, { align: 'right' }));
      y += 12;
      return { doc, W, H, M, y, L };
    }
    // Empfänger-Block ("AN  …").
    function belegRecipient(lay, name, sub) {
      const { doc, M } = lay; let y = lay.y;
      doc.setFontSize(8.5); doc.setTextColor(120); doc.text('OBJEKT / KUNDE', M, y); y += 4;
      doc.setFontSize(11); doc.setTextColor(20); doc.setFont('helvetica', 'bold');
      doc.text(name || '—', M, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      if (sub) { doc.text(sub, M, y); y += 5; }
      lay.y = y + 6;
    }
    // Feld-Raster (Label/Wert-Paare, zweispaltig).
    function belegFields(lay, pairs) {
      const { doc, W, M } = lay; let y = lay.y;
      const colW = (W - 2 * M) / 2;
      pairs.filter(p => p[1]).forEach((p, i) => {
        if (y > lay.H - 45) { doc.addPage(); y = M; }
        const x = M + (i % 2) * colW;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140);
        doc.text(String(p[0]).toUpperCase(), x, y);
        doc.setFontSize(10.5); doc.setTextColor(30);
        doc.text(doc.splitTextToSize(String(p[1]), colW - 4), x, y + 5);
        if (i % 2 === 1) y += 13;
      });
      if (pairs.filter(p => p[1]).length % 2 === 1) y += 13;
      lay.y = y + 2;
    }
    // Mehrzeiliger Textblock mit Überschrift.
    function belegText(lay, title, text) {
      if (!text) return;
      const { doc, W, M } = lay; let y = lay.y;
      if (y > lay.H - 40) { doc.addPage(); y = M; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120);
      doc.text(title.toUpperCase(), M, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40);
      doc.splitTextToSize(text, W - 2 * M).forEach(l => {
        if (y > lay.H - 35) { doc.addPage(); y = M; }
        doc.text(l, M, y); y += 5;
      });
      lay.y = y + 4;
    }
    // Positions-Tabelle (Arbeiten/Material/Teile). items = [{label, qty, suffix, price}]. Liefert Zwischensumme.
    function belegPositions(lay, title, items) {
      if (!items || !items.length) return 0;
      const { doc, W, M } = lay; let y = lay.y;
      if (y > lay.H - 50) { doc.addPage(); y = M; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(90);
      doc.text(title, M, y); y += 5;
      const xQty = W - M - 60, xPrice = W - M - 30, xTotal = W - M;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150);
      doc.text('Menge', xQty, y, { align: 'right' });
      doc.text('Einzel', xPrice, y, { align: 'right' });
      doc.text('Total', xTotal, y, { align: 'right' });
      y += 1.5; doc.setDrawColor(225); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); y += 4.5;
      doc.setFontSize(9.5); doc.setTextColor(40);
      let sum = 0;
      items.forEach(it => {
        if (y > lay.H - 45) { doc.addPage(); y = M; }
        const tot = (Number(it.qty) || 0) * (Number(it.price) || 0);
        sum += tot;
        const label = doc.splitTextToSize(it.label || '—', xQty - M - 6);
        doc.text(label[0] || '—', M, y);
        doc.text(`${it.qty != null ? it.qty : 0}${it.suffix || ''}`, xQty, y, { align: 'right' });
        doc.text((Number(it.price) || 0).toFixed(2), xPrice, y, { align: 'right' });
        doc.text(tot.toFixed(2), xTotal, y, { align: 'right' });
        y += 5.5;
      });
      lay.y = y + 3;
      return sum;
    }
    // Summen-Box (netto / MWST 8.1% / brutto). withMwst=false → nur Total.
    function belegTotal(lay, netto, withMwst) {
      const bmf = hexZuRgb(loadCompany().brandColor) || [225, 29, 42];
      const { doc, W, M } = lay;
      const L = lay.L || LOCALE.CH;
      let y = lay.y;
      const boxH = withMwst ? 30 : 14;
      if (y > lay.H - boxH - 30) { doc.addPage(); y = M; }
      doc.setDrawColor(220); doc.setLineWidth(0.3); doc.rect(M, y, W - 2 * M, boxH);
      if (withMwst) {
        const mwst = netto * L.vat, brutto = netto + mwst;
        doc.setFontSize(9.5); doc.setTextColor(80); doc.setFont('helvetica', 'normal');
        doc.text('Total netto', M + 4, y + 7);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
        doc.text(netto.toFixed(2) + ' ' + L.cur, W - M - 4, y + 7, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
        doc.text(L.vatLabel, M + 4, y + 14);
        doc.setTextColor(20); doc.text(mwst.toFixed(2) + ' ' + L.cur, W - M - 4, y + 14, { align: 'right' });
        doc.setDrawColor(bmf[0], bmf[1], bmf[2]); doc.setLineWidth(0.4); doc.line(M + 4, y + 18, W - M - 4, y + 18);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(bmf[0], bmf[1], bmf[2]);
        doc.text('Gesamt brutto', M + 4, y + 25);
        doc.text(brutto.toFixed(2) + ' ' + L.cur, W - M - 4, y + 25, { align: 'right' });
      } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(bmf[0], bmf[1], bmf[2]);
        doc.text('Total', M + 4, y + 9.5);
        doc.text(netto.toFixed(2) + ' ' + L.cur, W - M - 4, y + 9.5, { align: 'right' });
        if (!L.mwstPflichtig) {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
          doc.text(L.steuerHinweis, M + 4, y + boxH + 5);
        }
      }
      lay.y = y + boxH + 8;
    }
    // Unterschriftsleiste am Seitenende.
    function belegSignature(lay, leftLabel, rightLabel) {
      const { doc, W, H, M } = lay;
      let y = Math.max(lay.y + 14, H - 28);
      doc.setDrawColor(150); doc.setLineWidth(0.3);
      doc.line(M, y, M + 70, y);
      doc.line(W - M - 70, y, W - M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(120);
      doc.text(leftLabel || 'Datum / Unterschrift Kunde', M, y + 4);
      doc.text(rightLabel || (loadCompany().name || ''), W - M, y + 4, { align: 'right' });
    }
    function belegNr(id) { return (id || '').slice(-6).toUpperCase() || '—'; }
    function safeName(s) { return (s || 'beleg').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40); }

    // ── Arbeitsrapport (Handwerk / Garten) ──
    function downloadRapportPDF(id) {
      id = id || editingRapId;
      const r = loadRapporte().find(x => x.id === id);
      if (!r) { toast('Rapport zuerst speichern', 'error'); return; }
      const doc = newBelegDoc(); if (!doc) return;
      const lay = belegHeader(doc, 'Arbeitsrapport', [`Nr. ${belegNr(r.id)}`, `Datum: ${formatDateDE(r.date) || '—'}`]);
      belegRecipient(lay, r.siteTitle || r.objektName, r.objektName && r.siteTitle !== r.objektName ? r.objektName : '');
      belegFields(lay, [[MosaVertical.t('feldMitarbeiter'), r.monteur]]);
      const works = (r.works || []).map(w => ({ label: w.title, qty: w.hours, suffix: ' h', price: w.rate }));
      const mat = (r.material || []).map(m => ({ label: m.name, qty: m.qty, suffix: '×', price: m.price }));
      const sumW = belegPositions(lay, 'Arbeiten (Regie)', works);
      const sumM = belegPositions(lay, 'Material', mat);
      belegText(lay, 'Bemerkungen', r.note);
      belegTotal(lay, sumW + sumM, false);
      belegSignature(lay, 'Datum / Unterschrift Kunde');
      doc.save(`Rapport_${belegNr(r.id)}_${safeName(r.siteTitle || r.objektName)}.pdf`);
      toast('✓ Rapport-PDF heruntergeladen');
    }

    // ── Kontroll-/Behandlungsprotokoll (Schädlingsbekämpfung, HACCP-Nachweis) ──
    function downloadPestProtocolPDF(id) {
      id = id || editingPestId;
      const p = loadPestProtocols().find(x => x.id === id);
      if (!p) { toast('Protokoll zuerst speichern', 'error'); return; }
      const doc = newBelegDoc(); if (!doc) return;
      const lay = belegHeader(doc, 'Kontroll- / Behandlungsprotokoll', [`Nr. ${belegNr(p.id)}`, `Datum: ${formatDateDE(p.date) || '—'}`]);
      belegRecipient(lay, pestCustomerName(p.customerId, p.objektName));
      belegFields(lay, [
        ['Techniker', p.technician],
        ['Befallsart', p.pestType],
        ['Maßnahme', p.measure],
        ['Mittel / Wirkstoff', p.agent],
        ['Menge / Dosierung', p.amount],
        ['Nachkontrolle am', formatDateDE(p.recheck)]
      ]);
      belegText(lay, 'Befund', p.findings);
      belegText(lay, 'Bemerkungen', p.note);
      // Köderstellen-Status dieses Objekts (HACCP-Monitoring-Nachweis).
      const baits = (typeof loadBaits === 'function' ? loadBaits() : []).filter(b => p.customerId && b.customerId === p.customerId);
      if (baits.length) {
        const { doc: d, W, M } = lay; let y = lay.y;
        if (y > lay.H - 50) { d.addPage(); y = M; }
        d.setFont('helvetica', 'bold'); d.setFontSize(9); d.setTextColor(90);
        d.text('Köderstellen-Kontrolle', M, y); y += 5;
        d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(40);
        baits.forEach(b => {
          if (y > lay.H - 35) { d.addPage(); y = M; }
          const st = (typeof BAIT_STATUS !== 'undefined' && BAIT_STATUS[b.status]) ? BAIT_STATUS[b.status].label : (b.status || '—');
          const line = `Nr. ${b.number || '—'}${b.location ? ' · ' + b.location : ''} — ${st}${b.lastCheck ? ' (geprüft ' + formatDateDE(b.lastCheck) + ')' : ''}`;
          d.splitTextToSize(line, W - 2 * M).forEach(l => { d.text(l, M, y); y += 4.6; });
        });
        lay.y = y + 4;
      }
      belegSignature(lay, 'Datum / Unterschrift Kunde', p.technician ? 'Techniker: ' + p.technician : '');
      doc.save(`Protokoll_${belegNr(p.id)}_${safeName(pestCustomerName(p.customerId, p.objektName))}.pdf`);
      toast('✓ Protokoll-PDF heruntergeladen');
    }

    // ── Werkstattauftrag / Reparaturrechnung (Auto-Werkstatt) ──
    function downloadWorkOrderPDF(id) {
      id = id || editingWorkOrderId;
      const o = loadWorkOrders().find(x => x.id === id);
      if (!o) { toast('Auftrag zuerst speichern', 'error'); return; }
      const doc = newBelegDoc(); if (!doc) return;
      const datum = o.created ? o.created.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const lay = belegHeader(doc, 'Reparaturauftrag', [`Nr. ${belegNr(o.id)}`, `Datum: ${formatDateDE(datum) || '—'}`]);
      belegRecipient(lay, o.owner || workOrderLabel(o), [o.plate, o.model].filter(Boolean).join(' · '));
      belegFields(lay, [['Mechaniker', o.mechanic], ['Auftragsannahme', formatDateDE(datum)]]);
      belegText(lay, 'Auftrag / Beanstandung', o.complaint);
      const works = (o.works || []).map(w => ({ label: w.title, qty: w.hours, suffix: ' h', price: w.rate }));
      const parts = (o.parts || []).map(pt => ({ label: pt.name, qty: pt.qty, suffix: '×', price: pt.price }));
      const sumW = belegPositions(lay, 'Arbeiten', works);
      const sumP = belegPositions(lay, 'Teile / Material', parts);
      belegText(lay, 'Bemerkungen', o.note);
      belegTotal(lay, sumW + sumP, coLocale(loadCompany()).mwstPflichtig);
      belegSignature(lay, 'Datum / Unterschrift Kunde');
      doc.save(`Auftrag_${belegNr(o.id)}_${safeName(o.plate || o.owner)}.pdf`);
      toast('✓ Auftrags-PDF heruntergeladen');
    }

    // ── Einlagerungsbeleg (Reifenhotel, Auto-Werkstatt) ──
    function downloadTireReceiptPDF(id) {
      id = id || editingTireId;
      const t = loadTires().find(x => x.id === id);
      if (!t) { toast('Einlagerung zuerst speichern', 'error'); return; }
      const doc = newBelegDoc(); if (!doc) return;
      const lay = belegHeader(doc, 'Einlagerungsbeleg', [`Nr. ${belegNr(t.id)}`, `Reifenhotel`]);
      belegRecipient(lay, t.owner || t.plate || 'Einlagerung', t.plate && t.owner ? t.plate : '');
      const season = (typeof TIRE_SEASONS !== 'undefined' && TIRE_SEASONS[t.season]) ? TIRE_SEASONS[t.season].label : (t.season || '—');
      const rim = { alu: 'Alufelgen', stahl: 'Stahlfelgen', ohne: 'ohne Felgen' }[t.rim] || t.rim || '';
      belegFields(lay, [
        ['Saison', season],
        ['Anzahl', t.qty ? t.qty + ' Reifen' : ''],
        ['Felgen', rim],
        ['Dimension', t.dim],
        ['Profil', t.tread ? t.tread + ' mm' : ''],
        ['Lagerplatz', t.location],
        ['Eingelagert seit', formatDateDE(t.since)]
      ]);
      belegText(lay, 'Bemerkungen', t.note);
      belegSignature(lay, 'Datum / Unterschrift Kunde', 'Eingelagert durch ' + (loadCompany().name || ''));
      doc.save(`Einlagerung_${belegNr(t.id)}_${safeName(t.owner || t.plate)}.pdf`);
      toast('✓ Beleg-PDF heruntergeladen');
    }

    function saveOffert() {
      const data = collectOffertForm();
      if (!data.kunde) { toast('Bitte Kundenname angeben'); return; }
      if (!data.preis) { toast('Bitte Preis angeben'); return; }

      // Bei Bearbeitung mit Änderungen → Revisions-Popup
      if (currentOffert && offertHasChanges(data)) {
        pendingOffertData = data;
        document.getElementById('revReasonInput').value = '';
        document.getElementById('revReasonError').style.display = 'none';
        openModal('revisionReason');
        setTimeout(() => document.getElementById('revReasonInput').focus(), 80);
        return;
      }

      // Neue Offerte oder Bearbeitung ohne Änderung → direkt speichern
      persistOffert(data, null);
    }

    let pendingOffertData = null;

    function confirmRevisionAndSave() {
      const reason = document.getElementById('revReasonInput').value.trim();
      if (!reason) {
        document.getElementById('revReasonError').style.display = 'block';
        document.getElementById('revReasonInput').focus();
        return;
      }
      if (!pendingOffertData) { closeModal('revisionReason'); return; }
      const data = pendingOffertData;
      pendingOffertData = null;
      closeModal('revisionReason');
      persistOffert(data, reason);
    }

    function deleteOffert() {
      if (!currentOffert) return;
      if (!requirePerm('delete_offerts', 'Offerten löschen')) return;
      if (!confirm('Diese Offerte wirklich löschen?')) return;
      const offerts = JSON.parse(localStorage.getItem('cc-offerts') || '[]');
      const filtered = offerts.filter(o => o.id !== currentOffert);
      localStorage.setItem('cc-offerts', JSON.stringify(filtered));
      closeModal('offert');
      renderOffertList();
      toast('Offerte gelöscht');
    }

    function renderOffertList() {
      const list = document.getElementById('offertList');
      const empty = document.getElementById('offertEmpty');
      const badge = document.getElementById('offNavBadge');
      const summary = document.getElementById('offertSummary');
      if (!list) return;

      const offerts = JSON.parse(localStorage.getItem('cc-offerts') || '[]');
      const locale = coLocale(loadCompany());
      badge.textContent = offerts.length;
      badge.style.display = offerts.length > 0 ? 'inline-flex' : 'none';

      if (offerts.length === 0) {
        list.style.display = 'none';
        if (summary) summary.style.display = 'none';
        empty.style.display = 'block';
        return;
      }

      list.style.display = 'flex';
      if (summary) {
        const total = offerts.reduce((sum, o) => sum + (Number(o.preis) || 0), 0);
        const entwürfe = offerts.filter(o => !o.status || String(o.status).toLowerCase() === 'entwurf').length;
        summary.style.display = 'flex';
        summary.innerHTML = `<span><strong>${offerts.length}</strong> Offerte${offerts.length === 1 ? '' : 'n'}</span><span><strong>${entwürfe}</strong> Entwurf${entwürfe === 1 ? '' : 'e'}</span><span><strong>${total.toFixed(2)} ${escapeHtml(locale.cur)}</strong> Gesamtwert</span>`;
      }
      empty.style.display = 'none';

      list.innerHTML = offerts.map(o => {
        const preis = o.preis ? parseFloat(o.preis).toFixed(2) + ' ' + locale.cur : '—';
        const hasImages = o.images && o.images.length > 0;
        const hasHistory = o.history && o.history.length > 0;
        return `
          <button type="button" class="document-row" onclick="openOffertEditor('${safeAttr(o.id)}')">
            <span class="svc-pill svc-${safeAttr(o.service)}">${escapeHtml(svcShortLabels[o.service] || o.service)}</span>
            <span class="document-row-main">
              <strong>${escapeHtml(o.kunde || 'Ohne Name')}</strong>
              <span class="document-row-meta">
                ${escapeHtml(o.adresse || '')} ${o.datum ? '· ' + escapeHtml(formatDateDE(o.datum)) : ''}
                ${hasImages ? '· ' + o.images.length + ' Bild' + (o.images.length > 1 ? 'er' : '') : ''}
                ${hasHistory ? ' · ' + o.history.length + ' Revision' + (o.history.length > 1 ? 'en' : '') : ''}
              </span>
            </span>
            <strong class="document-row-amount">${escapeHtml(preis)}</strong>
            <span class="badge badge-muted">${escapeHtml(o.status || 'Entwurf')}</span>
            <span class="document-row-arrow" aria-hidden="true">→</span>
          </button>
        `;
      }).join('');
    }

    // Wenn Text manuell bearbeitet wird, nicht mehr automatisch neu generieren
    document.getElementById('offText')?.addEventListener('input', e => {
      e.target.dataset.manuallyEdited = 'true';
    });

    // Initial rendern
    renderOffertList();

    // ---- Wiederkehrende Aufträge (Serien) ----
    const REPEAT_LABELS_DE = { weekly: 'wöchentlich', biweekly: 'alle 2 Wochen', monthly: 'monatlich' };
    function repeatLabel(k) { return tt('repeat.' + k, REPEAT_LABELS_DE[k] || k); }
    function nextRepeatDate(baseDate, mode, i) {
      const d = new Date(baseDate);
      if (mode === 'weekly') d.setDate(d.getDate() + 7 * i);
      else if (mode === 'biweekly') d.setDate(d.getDate() + 14 * i);
      else if (mode === 'monthly') d.setMonth(d.getMonth() + i);
      return d;
    }
    function wizToggleRepeat() {
      const mode = document.getElementById('wizRepeat').value;
      document.getElementById('wizRepeatCountWrap').style.display = mode === 'none' ? 'none' : 'block';
      if (mode !== 'none') wizUpdateRepeatHint();
    }
    function wizUpdateRepeatHint() {
      const mode = document.getElementById('wizRepeat').value;
      if (mode === 'none') return;
      const hint = document.getElementById('wizRepeatHint');
      const count = Math.max(1, Math.min(52, parseInt(document.getElementById('wizRepeatCount').value) || 1));
      const dv = document.getElementById('wizDate').value;
      const base = dv ? new Date(dv + 'T00:00:00') : new Date(planCurrentDate);
      const last = nextRepeatDate(base, mode, count - 1);
      hint.textContent = tt('date.until','Bis') + ' ' + last.toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // Bestes Team für eine Serie wählen (wenig Konflikte, wenig Last, viele Mitglieder)
    function pickBestTeamForSeries(dateKeys, start, duration) {
      const candidates = PLAN_TEAMS.filter(t => EMPLOYEES.some(e => e.teamId === t.id));
      if (!candidates.length) return null;
      const s = parseHM(start), e = s + (duration || 0);
      const all = loadPlanJobs();
      let best = null, bestScore = Infinity;
      candidates.forEach(t => {
        let conflicts = 0, load = 0;
        dateKeys.forEach(dk => {
          const dayJobs = (all[dk] || []).filter(j => j.team === t.id);
          load += dayJobs.length;
          dayJobs.forEach(j => {
            const js = parseHM(j.start), je = js + (j.duration || 0);
            if (js < e && je > s) conflicts++;   // zeitliche Überschneidung
          });
        });
        const members = EMPLOYEES.filter(emp => emp.teamId === t.id).length;
        const score = conflicts * 1000 + load * 10 - members;
        if (score < bestScore) { bestScore = score; best = t; }
      });
      return best ? best.id : null;
    }

    // ---- Serien-Verwaltung: finden / patchen / löschen / gruppieren ----
    function findSeriesJobs(seriesId, fromDateKey) {
      const all = loadPlanJobs();
      const res = [];
      Object.keys(all).forEach(dk => {
        if (fromDateKey && dk < fromDateKey) return;       // ISO-Datum: String-Vergleich ok
        (all[dk] || []).forEach(j => { if (j.seriesId === seriesId) res.push({ dateKey: dk, jobId: j.id }); });
      });
      return res;
    }
    function patchSeries(seriesId, fromDateKey, patch) {
      const all = loadPlanJobs();
      let changed = false;
      Object.entries(all).forEach(([dateKey, jobs]) => {
        if (fromDateKey && dateKey < fromDateKey) return;
        (jobs || []).forEach((job, i) => {
          if (job.seriesId === seriesId) { jobs[i] = { ...job, ...patch }; changed = true; }
        });
      });
      if (changed) return savePlanJobsAll(all);
      return Promise.resolve(false);
    }
    function deleteSeries(seriesId, fromDateKey) {
      findSeriesJobs(seriesId, fromDateKey).forEach(({ dateKey, jobId }) => deletePlanJob(dateKey, jobId));
    }
    function getAllSeries() {
      const all = loadPlanJobs();
      const map = {};
      Object.keys(all).forEach(dk => {
        (all[dk] || []).forEach(j => {
          if (!j.seriesId) return;
          if (!map[j.seriesId]) map[j.seriesId] = { seriesId: j.seriesId, objekt: j.objekt, ort: j.ort, customerId: j.customerId, customer: j.customer, recurring: j.recurring, team: j.team, price: j.price, start: j.start, dates: [] };
          map[j.seriesId].dates.push(dk);
        });
      });
      return Object.values(map).map(s => { s.dates.sort(); return s; });
    }

    // ---- Live-Verfügbarkeit fürs Telefon-Booking ----
    function fmtMinHM(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    // Für Einsätze vor Ort rechnen wir mindestens 15 Minuten Übergang zwischen zwei Aufträgen.
    // Die genaue Fahrzeit kann später aus der echten Routenberechnung ergänzt werden.
    const PLANNING_TRANSITION_MIN = 15;
    function freeEmployeesAt(dateKey, startMin, durMin, teamId = '') {
      const end = startMin + durMin;
      const jobs = getJobsForDate(new Date(dateKey + 'T00:00:00')).filter(istDefinitiverFeldeinsatz);
      // Wichtig: Nicht das Stammteam verwenden. Die Tages-Crew kann Mitarbeitende
      // für genau diesen Tag in ein anderes Team verschieben.
      return EMPLOYEES.filter(emp => (!teamId || empDayTeam(emp.id, dateKey) === teamId) && !empIsAbsent(emp.id, dateKey))
        .filter(emp => !jobs.some(j => {
          if (!(j.assigned || []).includes(emp.id)) return false;
          const js = parseHM(j.start) - PLANNING_TRANSITION_MIN;
          const je = parseHM(j.start) + (j.duration || 0) + PLANNING_TRANSITION_MIN;
          return js < end && je > startMin;
        }));
    }
    // Welche Teams haben an dem Tag im Zeitfenster genug freie Mitarbeitende?
    function availabilityAt(dateKey, startMin, durMin, neededCrew) {
      neededCrew = Math.max(1, neededCrew || 1);
      const out = [];
      PLAN_TEAMS.forEach(t => {
        const members = teamMembersOnDay(t.id, dateKey);
        if (members.length === 0) return;
        const freeEmployees = freeEmployeesAt(dateKey, startMin, durMin, t.id);
        out.push({ team: t, total: members.length, freeCount: freeEmployees.length, freeEmployees, available: freeEmployees.length >= neededCrew });
      });
      return out;
    }
    function nextFreeSlotSameDay(dateKey, startMin, durMin, neededCrew, teamId = '', latestEndMin = null) {
      const latestStart = Math.min(21 * 60 - durMin, latestEndMin != null ? latestEndMin - durMin : 21 * 60 - durMin);
      for (let t = startMin; t <= latestStart; t += 15) {
        let available = availabilityAt(dateKey, t, durMin, neededCrew);
        if (teamId) available = available.filter(r => r.team.id === teamId);
        if (available.some(r => r.available)) return t;
      }
      return null;
    }
    function latestFreeSlotBefore(dateKey, deadlineMin, durMin, neededCrew, teamId = '') {
      for (let t = deadlineMin - durMin; t >= 6 * 60; t -= 15) {
        let available = availabilityAt(dateKey, t, durMin, neededCrew);
        if (teamId) available = available.filter(r => r.team.id === teamId);
        if (available.some(r => r.available)) return t;
      }
      return null;
    }
    function nextFreeDays(fromDateKey, startMin, durMin, neededCrew, count, teamId = '') {
      count = count || 3;
      const res = [];
      const d = new Date(fromDateKey + 'T00:00:00');
      d.setDate(d.getDate() + 1);     // erst ab dem Folgetag suchen
      for (let i = 0; i < 28 && res.length < count; i++) {
        const dk = isoDate(d);
        let free = availabilityAt(dk, startMin, durMin, neededCrew).filter(r => r.available);
        if (teamId) free = free.filter(r => r.team.id === teamId);
        if (free.length) res.push({ dateKey: dk, teams: free.map(r => r.team.name) });
        d.setDate(d.getDate() + 1);
      }
      return res;
    }
    function wizCheckAvailability() {
      const box = document.getElementById('wizAvail');
      if (!box) return;
      if ((document.getElementById('wizJobStatus')?.value || 'provisorisch') === 'provisorisch') {
        box.innerHTML = `<div class="wiz-avail-box"><div class="wiz-avail-sub">${escapeHtml(tt('job.provisionalAvailability','Provisorisch: Der Termin wird vorgemerkt, blockiert aber noch kein Team.'))}</div></div>`;
        return;
      }
      const dv = document.getElementById('wizDate')?.value;
      const dk = dv || isoDate(planCurrentDate);
      const startHHMM = document.getElementById('wizStart')?.value || '08:00';
      const hours = parseFloat(document.getElementById('wizDuration')?.value) || 1.5;
      const dur = Math.round(hours * 60);
      const startMin = parseHM(startHHMM);
      const neededCrew = Math.max(1, parseInt(document.getElementById('wizCrew')?.value) || 1);
      const deadlineHHMM = document.getElementById('wizDeadline')?.value || '';
      const deadlineMin = deadlineHHMM ? parseHM(deadlineHHMM) : null;

      const teamsWithMembers = PLAN_TEAMS.filter(t => EMPLOYEES.some(e => e.teamId === t.id));
      if (teamsWithMembers.length === 0) {
        const future = dk > isoDate(new Date());
        box.innerHTML = `<div class="wiz-avail-box ${future ? '' : 'bad'}"><div class="wiz-avail-head">${future ? 'Termin kann unbesetzt vorgemerkt werden' : 'Für heute ist ein Team erforderlich'}</div><div class="wiz-avail-sub">${future ? 'Du kannst speichern und das Team später in der Routenplanung zuweisen.' : 'Lege zuerst ein Team mit mindestens einer Person an.'}</div></div>`;
        return;
      }
      const selTeam = document.getElementById('wizardTeamSelect')?.value || '';
      let av = availabilityAt(dk, startMin, dur, neededCrew);
      if (selTeam) av = av.filter(r => r.team.id === selTeam);
      const freeTeams = av.filter(r => r.available);
      const dayLbl = new Date(dk + 'T00:00:00').toLocaleDateString(dateLocale(), { weekday: 'long', day: '2-digit', month: '2-digit' });
      const endsBeforeDeadline = deadlineMin == null || startMin + dur <= deadlineMin;

      if (freeTeams.length && endsBeforeDeadline) {
        const names = freeTeams.map(r => `${r.team.name}: ${r.freeEmployees.slice(0, neededCrew).map(e => empShort(e)).join(', ')}`).join(' · ');
        const deadlineNote = deadlineHHMM ? ` · fertig bis ${deadlineHHMM} Uhr` : '';
        box.innerHTML = `<div class="wiz-avail-box ok"><div class="wiz-avail-head">✓ ${dayLbl}, ${startHHMM} Uhr — frei${deadlineNote}</div><div class="wiz-avail-sub">Verfügbar: ${escapeHtml(names)}</div></div>`;
        return;
      }
      // belegt → Alternativen anbieten
      const sameDay = deadlineMin != null
        ? latestFreeSlotBefore(dk, deadlineMin, dur, neededCrew, selTeam)
        : nextFreeSlotSameDay(dk, startMin, dur, neededCrew, selTeam);
      const days = deadlineMin != null ? [] : nextFreeDays(dk, startMin, dur, neededCrew, 3, selTeam);
      let chips = '';
      if (sameDay != null && sameDay !== startMin) {
        const label = deadlineMin != null ? `${dayLbl} ${fmtMinHM(sameDay)}–${fmtMinHM(sameDay + dur)} (vor Abgabe)` : `${dayLbl} ab ${fmtMinHM(sameDay)}`;
        chips += `<button type="button" class="wiz-slot-chip" onclick="wizApplySlot('${dk}','${fmtMinHM(sameDay)}')">${label}</button>`;
      }
      days.forEach(d => {
        const dl = new Date(d.dateKey + 'T00:00:00').toLocaleDateString(dateLocale(), { weekday: 'short', day: '2-digit', month: '2-digit' });
        chips += `<button type="button" class="wiz-slot-chip" onclick="wizApplySlot('${d.dateKey}','${startHHMM}')">${dl}, ${startHHMM}</button>`;
      });
      const reason = !endsBeforeDeadline ? `Der Einsatz würde nach dem Abgabetermin um ${deadlineHHMM} Uhr enden.` : `${selTeam ? 'Dieses Team ist' : 'Kein Team ist'} zu dieser Zeit mit ${neededCrew} ${neededCrew === 1 ? 'Person' : 'Personen'} frei.`;
      box.innerHTML = `<div class="wiz-avail-box bad"><div class="wiz-avail-head">${dayLbl}, ${startHHMM} Uhr — nicht möglich</div>` +
        `<div class="wiz-avail-sub">${reason} ${chips ? 'Passender Vorschlag:' : ''}</div>` +
        `<div class="wiz-slot-chips">${chips || '<span class="wiz-avail-sub">Kein passender freier Slot gefunden.</span>'}</div></div>`;
    }
    function wizApplySlot(dateKey, startHHMM) {
      const wd = document.getElementById('wizDate'); if (wd) wd.value = dateKey;
      const ws = document.getElementById('wizStart'); if (ws) ws.value = startHHMM;
      wizCheckAvailability();
    }
    // Eingaben live an den Check koppeln
    ['wizDate', 'wizStart', 'wizDuration', 'wizDeadline', 'wizCrew', 'wizardTeamSelect', 'wizJobStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('change', wizCheckAvailability); el.addEventListener('input', wizCheckAvailability); }
    });

    // Beim Oeffnen eines neuen Auftrags die Kundenwahl leeren
    function wizKundeZuruecksetzen() {
      wizKundeId = null;
      const f = document.getElementById('wizCustomer'); if (f) f.value = '';
      const i = document.getElementById('wizCustomerInfo'); if (i) { i.style.display = 'none'; i.innerHTML = ''; }
      wizKundeListeZu();
    }

    function submitAuftrag() {
      const name = (document.getElementById('termName')?.value || '').trim();
      const addr = (document.getElementById('wizAddress')?.value || '').trim();
      const objekt = name || addr || serviceTitle(wizService) || 'Neuer Auftrag';
      const dateInput = document.getElementById('wizDate');
      const dateKey = (dateInput && dateInput.value) ? dateInput.value : isoDate(planCurrentDate);
      const start = (document.getElementById('wizStart')?.value) || '08:00';
      const hours = parseFloat(document.getElementById('wizDuration')?.value) || 1.5;
      const duration = Math.round(hours * 60); // Stunden → Minuten
      const team = document.getElementById('wizardTeamSelect')?.value || null;
      const requestedCrew = Math.max(1, parseInt(document.getElementById('wizCrew')?.value) || 1);
      const note = (document.getElementById('wizNote')?.value || '').trim();
      const deadline = document.getElementById('wizDeadline')?.value || null;
      const extraText = collectWizExtraText();   // branchenspezifische Felder → Büro-Notiz
      const finalPrice = wizCalcPrice();
      const status = document.getElementById('wizJobStatus')?.value || 'provisorisch';
      const paymethod = document.getElementById('wizPaymethod')?.value || 'rechnung';
      const actor = (typeof currentUser !== 'undefined' && currentUser) ? {
        id: currentUser.id || null,
        name: typeof getUserName === 'function' ? getUserName(currentUser) : getCurrentUserName(),
        email: currentUser.email || window._authEmail || '',
        role: currentUser.role || ''
      } : { id:null, name:getCurrentUserName(), email:window._authEmail || '', role:'' };

      // Wiederholung: aus einem Termin eine Serie machen
      const repeat = document.getElementById('wizRepeat')?.value || 'none';
      const count = repeat === 'none' ? 1 : Math.max(1, Math.min(52, parseInt(document.getElementById('wizRepeatCount')?.value) || 1));
      const seriesId = repeat !== 'none' ? ('serie-' + Date.now()) : null;
      const baseDate = new Date(dateKey + 'T00:00:00');

      // Alle Serien-Tage vorab sammeln
      const dateKeys = [];
      for (let i = 0; i < count; i++) dateKeys.push(isoDate(nextRepeatDate(baseDate, repeat, i)));

      // Für Reinigung: pro Kalendertag ein echtes freies Team und die konkret
      // freien Personen wählen. Tages-Crews können sich täglich ändern, deshalb
      // darf eine Serie nie ein einziges Team für alle Termine festschreiben.
      let assignTeam = team || null;
      let autoTeamName = null;
      let assignedByDate = {};
      let teamByDate = {};
      const isCleaning = window.MosaVertical?.get?.() === 'reinigung';
      if (isCleaning && status === 'definitiv') {
        const deadlineMins = deadline ? parseHM(deadline) : null;
        if (deadlineMins != null && parseHM(start) + duration > deadlineMins) {
          toast(`Der Einsatz endet nach der Abgabe um ${deadline}. Wähle einen früheren Vorschlag.`, 'error');
          return;
        }
        for (const dk of dateKeys) {
          const options = availabilityAt(dk, parseHM(start), duration, requestedCrew)
            .filter(r => r.available)
            // Bei gleich vielen freien Personen den im Assistenten gewählten
            // Teamwunsch bevorzugen, aber für andere Tage nicht erzwingen.
            .sort((a, b) => (b.freeCount - a.freeCount)
              || ((b.team.id === team) ? 1 : 0) - ((a.team.id === team) ? 1 : 0)
              || a.team.name.localeCompare(b.team.name));
          const option = options[0];
          if (!option && dk > isoDate(new Date())) {
            teamByDate[dk] = null;
            assignedByDate[dk] = [];
            continue;
          }
          if (!option) {
            // Die Meldung nennt den Tag und sagt, was zu tun ist. Vorher stand
            // hier immer "Die Serie", auch bei einem einzelnen Termin — und es
            // blieb offen, woran es lag.
            const tag = new Date(dk + 'T00:00:00').toLocaleDateString('de-CH',
              { weekday: 'long', day: '2-digit', month: '2-digit' });
            const wieViele = requestedCrew === 1 ? 'eine Person' : `${requestedCrew} Personen`;
            toast(`Am ${tag} ist kein Team mit ${wieViele} frei. `
                + `Wähle einen anderen Tag, eine andere Zeit oder weniger Personen.`, 'error');
            return;
          }
          teamByDate[dk] = option.team.id;
          assignedByDate[dk] = option.freeEmployees.slice(0, requestedCrew).map(e => e.id);
        }
        assignTeam = teamByDate[dateKey];
        autoTeamName = (PLAN_TEAMS.find(t => t.id === assignTeam) || {}).name || null;
      }

      // Auto-Zuweisung für andere Branchen: bei einer Serie ohne Team ein festes Team wählen.
      if (status === 'definitiv' && !isCleaning && !assignTeam && repeat !== 'none') {
        assignTeam = pickBestTeamForSeries(dateKeys, start, duration);
        if (assignTeam) autoTeamName = (PLAN_TEAMS.find(t => t.id === assignTeam) || {}).name || null;
      }

      // Echte Einsätze anlegen → erscheinen im Routenplaner an jedem Serien-Tag
      dateKeys.forEach((dk, i) => {
        addPlanJob(dk, {
          id: 'j' + Date.now() + '-' + i,
          objekt,
          ort: addr,
          createdAt: new Date().toISOString().slice(0, 16),   // fuer den Verlauf
          createdBy: actor,
          updatedAt: new Date().toISOString(),
          updatedBy: actor,
          customerId: wizKundeId || undefined,   // B1: Verknuepfung zur Kundenakte
          customer: (document.getElementById('wizCustomer')?.value || '').trim() || undefined,
          start,
          duration,
          team: status === 'provisorisch' ? null : (isCleaning ? (teamByDate[dk] || null) : (assignTeam || null)),
          svc: wizService || 'unterhalt',
          price: finalPrice,
          addons: (typeof collectWizardAddons === 'function') ? collectWizardAddons() : [],
          crew: isCleaning ? requestedCrew : 1,
          assigned: status === 'provisorisch' ? [] : (isCleaning ? assignedByDate[dk] : undefined),
          paymethod,
          status,
          deadline: deadline,
          noteCrew: note,
          noteOffice: extraText,
          recurring: repeat !== 'none' ? repeat : undefined,
          seriesId: seriesId || undefined
        });
      });

      protokolliere('angelegt', 'plan_jobs',
        objekt + (dateKeys.length > 1 ? ` (${dateKeys.length}×)` : ''));

      closeModal('newAuftrag');
      // Planer auf das (erste) Auftragsdatum stellen und anzeigen
      planSetDate(dateKey);
      navTo('planung');
      const dLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString(dateLocale(), { weekday: 'short', day: '2-digit', month: '2-digit' });
      if (repeat === 'none') {
        toast(`✓ ${tt('toastdyn.orderWord','Auftrag')} „${objekt}" ${tt('toastdyn.created','angelegt')} — ${tt('toastdyn.inPlannerOn','im Planer am')} ${dLabel}`);
      } else {
        const teamSuffix = autoTeamName ? ` · ${autoTeamName} ${tt('toastdyn.assigned','zugewiesen')}` : '';
        toast(`✓ ${tt('date.series','Serie')} „${objekt}" ${tt('toastdyn.created','angelegt')} — ${count} ${tt('date.appointments','Termine')} (${repeatLabel(repeat)}), ${tt('toastdyn.from','ab')} ${dLabel}${teamSuffix}`);
      }

      // Wizard zurücksetzen
      setTimeout(() => {
        wizCurrent = 1;
        wizService = null;
        const repeatSel = document.getElementById('wizRepeat');
        if (repeatSel) { repeatSel.value = 'none'; document.getElementById('wizRepeatCountWrap').style.display = 'none'; }
        document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.wstep').forEach(s => { s.classList.remove('done'); s.classList.toggle('active', s.dataset.step === '1'); });
        document.querySelectorAll('.wizard-page').forEach(p => p.classList.remove('active'));
        document.querySelector('.wizard-page[data-page="1"]').classList.add('active');
        document.getElementById('wizBack').style.display = 'none';
        document.getElementById('wizNext').textContent = 'Weiter →';
        ['termName', 'wizAddress', 'wizNote', 'wizDeadline'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const wd = document.getElementById('wizDate'); if (wd) wd.value = '';
      }, 400);
    }
