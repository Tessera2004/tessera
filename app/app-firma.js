// MosaOS — app-firma.js
//
// Firmeneinstellungen und QR-Rechnung, Adresssuche, Auftrag-Assistent.
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

    // ============ Firma & QR-Rechnung ============
    function companyInitial(name) { return (name || 'M').trim().slice(0, 1).toUpperCase() || 'M'; }
    function applyCompanyBranding(company = loadCompany()) {
      const root = document.documentElement;
      const color = /^#[0-9a-f]{6}$/i.test(company.brandColor || '') ? company.brandColor : '#E11D2A';
      root.style.setProperty('--brand-primary', color);
      root.style.setProperty('--brand-primary-hover', color);
      root.style.setProperty('--brand-primary-soft', `color-mix(in srgb, ${color} 12%, transparent)`);
      root.style.setProperty('--brand-primary-glow', `color-mix(in srgb, ${color} 35%, transparent)`);
      root.style.setProperty('--accent', color);
      root.style.setProperty('--accent-hover', color);
      const name = company.name || 'MosaOS';
      const brandName = document.getElementById('brandName'); if (brandName) brandName.textContent = name;
      const brandSub = document.getElementById('brandSub'); if (brandSub) brandSub.textContent = company.addr2 || '';
      const logo = document.getElementById('companyLogoImage');
      const mark = document.getElementById('brandMark');
      if (logo) { logo.hidden = !company.logo; logo.src = company.logo || ''; }
      if (mark) mark.title = name;
      const previewMark = document.querySelector('.brand-preview-mark'); if (previewMark) previewMark.textContent = companyInitial(name);
      const previewName = document.getElementById('brandPreviewName'); if (previewName) previewName.textContent = name;
    }
    // B5 — die Grundstimmung gehoert ins Erscheinungsbild, nicht in einen
    // versteckten Kopfzeilen-Knopf. Freie Hintergrundfarbe waere gefaehrlich
    // (unlesbarer Text), darum drei geprüfte Stimmungen.
    function setzeGrund(wert) {
      if (wert === 'dark') {
        localStorage.setItem('cc-skin', 'standard');
        localStorage.setItem('cc-theme', 'dark');
        document.documentElement.removeAttribute('data-skin');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (wert === 'buero') {
        localStorage.setItem('cc-skin', 'buero');
        applySkin('buero');
      } else {
        localStorage.setItem('cc-skin', 'standard');
        localStorage.setItem('cc-theme', 'light');
        document.documentElement.removeAttribute('data-skin');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      markiereGrund();
      applyCompanyBranding();   // Akzentfarbe ueberlebt den Wechsel
      toast(tt('set.groundSaved', 'Hintergrund gespeichert'));
    }

    function markiereGrund() {
      const skin = localStorage.getItem('cc-skin') || 'buero';
      const jetzt = skin === 'buero' ? 'buero'
                  : (localStorage.getItem('cc-theme') === 'dark' ? 'dark' : 'standard');
      document.querySelectorAll('#grundWahl .opt-chip').forEach(c =>
        c.classList.toggle('on', c.dataset.grund === jetzt));
    }

    function previewCompanyBranding() {
      const color = document.getElementById('coBrandColor')?.value || '#E11D2A';
      const label = document.getElementById('coBrandColorValue'); if (label) label.textContent = color.toUpperCase();
      applyCompanyBranding({ ...loadCompany(), brandColor: color, name: document.getElementById('coName')?.value || loadCompany().name });
    }
    function onCompanyLogoSelected(input) {
      const file = input?.files?.[0]; if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 750 * 1024) { toast('Bitte ein Bild bis maximal 750 KB auswählen.', 'error'); input.value = ''; return; }
      const reader = new FileReader();
      reader.onload = () => applyCompanyBranding({ ...loadCompany(), logo: reader.result, brandColor: document.getElementById('coBrandColor')?.value || loadCompany().brandColor });
      reader.readAsDataURL(file);
    }
    function saveCompanyBranding() {
      if (!requirePerm('edit_users', 'Erscheinungsbild')) return;
      const color = document.getElementById('coBrandColor')?.value || '#E11D2A';
      const logo = document.getElementById('companyLogoImage')?.src || '';
      const hasLogo = !document.getElementById('companyLogoImage')?.hidden && logo.startsWith('data:image/');
      const company = { ...loadCompany(), brandColor: color, logo: hasLogo ? logo : (loadCompany().logo || '') };
      saveCompany(company); applyCompanyBranding(company);
      toast('✓ Erscheinungsbild gespeichert');
    }
    function fillCompanyForm() {
      markiereGrund();
      renderHistorie();
      vorlagenFormularFuellen();
      zeitfaktorenFormularFuellen();
      const c = loadCompany();
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
      set('coName', c.name); set('coIban', c.iban); set('coAddr1', c.addr1);
      set('coAddr2', c.addr2); set('coMwst', c.mwst); set('coContact', c.contact);
      const cc = document.getElementById('coCountry'); if (cc) cc.value = (c.country || 'CH');
      const pf = document.getElementById('coMwstPflichtig');
      if (pf) pf.checked = (c.mwstPflichtig !== false);
      const hw = document.getElementById('coSteuerHinweis');
      if (hw) hw.value = c.steuerHinweis || STEUER_HINWEIS[(c.country || 'CH')] || STEUER_HINWEIS.CH;
      onMwstPflichtChange();
      const color = document.getElementById('coBrandColor'); if (color) color.value = c.brandColor || '#E11D2A';
      const colorLabel = document.getElementById('coBrandColorValue'); if (colorLabel) colorLabel.textContent = (c.brandColor || '#E11D2A').toUpperCase();
      applyCompanyBranding(c);
      onCompanyCountryChange();
    }
    // Hinweisfeld nur zeigen, wenn keine Steuerpflicht besteht.
    function onMwstPflichtChange() {
      const pf = document.getElementById('coMwstPflichtig');
      const feld = document.getElementById('coSteuerHinweisFeld');
      const nr = document.getElementById('coMwst');
      if (!pf || !feld) return;
      feld.style.display = pf.checked ? 'none' : '';
      // Ohne Steuerpflicht gibt es auch keine Steuernummer
      if (nr) nr.closest('.field').style.opacity = pf.checked ? '1' : '0.45';
    }

    // MWST-/USt-Label + Platzhalter an das gewählte Land anpassen.
    function onCompanyCountryChange() {
      const cc = document.getElementById('coCountry'); if (!cc) return;
      const L = LOCALE[cc.value] || LOCALE.CH;
      const lbl = document.getElementById('coMwstLabel'); if (lbl) lbl.textContent = L.vatIdLabel;
      const mw = document.getElementById('coMwst'); if (mw) mw.placeholder = L.vatIdEx;
      const hw = document.getElementById('coSteuerHinweis');
      const c = loadCompany();
      // Nur ersetzen, solange der Text nicht von Hand geändert wurde
      if (hw && (!c.steuerHinweis || hw.value === STEUER_HINWEIS[c.country || 'CH'])) {
        hw.value = STEUER_HINWEIS[cc.value] || STEUER_HINWEIS.CH;
      }
      // IBAN-Beispiel passend zum Land (sonst steht bei DE/AT ein Schweizer Format).
      const ibanEx = { CH: 'CH.. .... .... .... .... .', DE: 'DE.. .... .... .... .... ..', AT: 'AT.. .... .... .... ....' };
      const ib = document.getElementById('coIban'); if (ib) ib.placeholder = ibanEx[cc.value] || ibanEx.CH;
      // Auch die Preis-Eingaben müssen dieselbe Währung wie die Firma zeigen.
      document.querySelectorAll('.price-suffix').forEach(el => {
        const original = el.dataset.originalSuffix || el.textContent.trim();
        el.dataset.originalSuffix = original;
        el.textContent = original.replace(/€/g, L.cur);
      });
    }
    function saveCompanyForm() {
      const g = id => (document.getElementById(id)?.value || '').trim();
      const country = (document.getElementById('coCountry')?.value || 'CH');
      const pflichtig = !!document.getElementById('coMwstPflichtig')?.checked;
      const company = { ...loadCompany(), name: g('coName'), iban: g('coIban'), addr1: g('coAddr1'), addr2: g('coAddr2'),
        mwst: g('coMwst'), contact: g('coContact'), country,
        mwstPflichtig: pflichtig,
        steuerHinweis: pflichtig ? '' : (g('coSteuerHinweis') || STEUER_HINWEIS[country] || STEUER_HINWEIS.CH) };
      saveCompany(company); applyCompanyBranding(company);
      toast('✓ Firmen- & Zahlungsangaben gespeichert');
    }
    document.querySelector('.nav-item[data-view="einstellungen"]')?.addEventListener('click', () => {
      setTimeout(() => { fillCompanyForm(); renderModuleSettings(); populateVerticalSelect(); applyPriceSection(); refreshMfaStatus(); }, 50);
    });

    // Schweizer QR-Code-Payload (SPC, Version 0200) — kombinierte Adressen (K), Referenztyp NON
    function buildSwissQrPayload(c, debtor, amount, message) {
      const L = [];
      L.push('SPC', '0200', '1');
      L.push((c.iban || '').replace(/\s/g, ''));
      L.push('K', c.name || '', c.addr1 || '', c.addr2 || '', '', '', c.country || 'CH');
      L.push('', '', '', '', '', '');                       // Endkreditor (ungenutzt)
      L.push(Number(amount).toFixed(2), 'CHF');
      if (debtor && debtor.name) {
        L.push('K', debtor.name, debtor.addr1 || '', debtor.addr2 || '', '', '', 'CH');
      } else {
        L.push('', '', '', '', '', '', '');
      }
      L.push('NON', '', message || '');
      L.push('EPD');
      return L.join('\r\n');
    }

    // QR-Code als PNG-DataURL (qrcode-generator: Auto-Version bis 40, kein Längen-Limit)
    function qrDataUrl(text) {
      return new Promise((resolve, reject) => {
        if (typeof qrcode !== 'function') { reject(new Error('QR-Bibliothek nicht geladen')); return; }
        try {
          const qr = qrcode(0, 'M');      // 0 = Version automatisch, Fehlerkorrektur M (Swiss-QR-Vorgabe)
          qr.addData(text);
          qr.make();
          const count = qr.getModuleCount();
          const cell = 8, quiet = 4;
          const px = (count + quiet * 2) * cell;
          const cv = document.createElement('canvas');
          cv.width = px; cv.height = px;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, px, px);
          ctx.fillStyle = '#000000';
          for (let r = 0; r < count; r++)
            for (let c = 0; c < count; c++)
              if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
          resolve(cv.toDataURL('image/png'));
        } catch (e) { reject(e); }
      });
    }

    // Adresse "Strasse 1, 5000 Aarau" → { addr1, addr2 }
    function splitAddress(addr) {
      if (!addr) return { addr1: '', addr2: '' };
      const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) return { addr1: parts[0], addr2: parts.slice(1).join(', ') };
      return { addr1: addr, addr2: '' };
    }

    // Eine Rechnung (PDF mit QR-Einzahlschein) aus einem Job erzeugen
    function pdfArrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    }

    async function generateInvoiceForJob(job, dateKey, options = {}) {
      const pm = job.paymethod || 'rechnung';
      if (pm !== 'rechnung') {
        toast(pm === 'bar' ? 'Barzahlung — keine Rechnung nötig' : 'Twint — keine QR-Rechnung nötig', 'error');
        return null;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) { toast('PDF-Bibliothek lädt noch — kurz warten', 'error'); return null; }

      const c = loadCompany();
      const L = coLocale(c);
      const cust = job._customer;
      const debtorAddr = splitAddress(cust ? (cust.address || '') : (job.ort || ''));
      const debtor = { name: cust ? customerDisplayName(cust) : (job.objekt || 'Kunde'), addr1: debtorAddr.addr1, addr2: debtorAddr.addr2 };

      const netto = Number(job.price || 0);
      const mwst = netto * L.vat;
      const brutto = netto + mwst;
      const invNr = (dateKey.replace(/-/g, '') + '-' + String(job.id || '').slice(-4)).toUpperCase();
      const message = `Rechnung ${invNr} · ${job.objekt || ''}`.trim();

      let qrUrl = null;
      if (L.payment === 'qr') {
        try { qrUrl = await qrDataUrl(buildSwissQrPayload(c, debtor, brutto, message)); }
        catch (e) { toast('QR-Code konnte nicht erzeugt werden', 'error'); return null; }
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 20;
      let y = M;

      // Header Firma — mit eigenem Logo und eigener Markenfarbe
      const mf = hexZuRgb(c.brandColor) || [225, 29, 42];
      const tx = pdfLogo(doc, c, M, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(mf[0], mf[1], mf[2]);
      doc.text(c.name || 'Firma', tx, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(120);
      doc.text(`${c.addr1 || ''}, ${c.addr2 || ''}`, W - M, y - 2, { align: 'right' });
      if (c.contact) doc.text(c.contact, W - M, y + 2, { align: 'right' });
      if (c.mwst) doc.text(L.vatIdLabel + ' ' + c.mwst, W - M, y + 6, { align: 'right' });
      y += 14;
      doc.setDrawColor(mf[0], mf[1], mf[2]); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 10;

      // Titel + Empfänger
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20);
      doc.text('Rechnung', M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(120);
      doc.text('Nr. ' + invNr, W - M, y - 4, { align: 'right' });
      doc.text('Datum: ' + new Date(dateKey + 'T00:00:00').toLocaleDateString(L.dateLoc, { day: '2-digit', month: 'long', year: 'numeric' }), W - M, y, { align: 'right' });
      y += 12;
      doc.setFontSize(8.5); doc.setTextColor(120); doc.text('AN', M, y); y += 5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20); doc.text(debtor.name, M, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      if (debtor.addr1) { doc.text(debtor.addr1, M, y); y += 5; }
      if (debtor.addr2) { doc.text(debtor.addr2, M, y); y += 5; }
      y += 6;

      // B8 — eigener Text ueber der Position
      const eigenerText = ladeVorlagen().rechnungText;
      if (eigenerText) {
        doc.setFontSize(9.5); doc.setTextColor(80);
        const zeilen = doc.splitTextToSize(platzhalterFuellen(eigenerText, { kunde: debtor.name }), W - 2 * M);
        doc.text(zeilen, M, y);
        y += zeilen.length * 5 + 4;
        doc.setTextColor(20);
      }

      // Positionstabelle
      const hours = (job.duration || 0) / 60;
      const rate = hours > 0 ? netto / hours : 0;
      doc.setFontSize(8.5); doc.setTextColor(120);
      doc.text('LEISTUNG', M, y); doc.text('STD', W - M - 60, y, { align: 'right' });
      doc.text('À ' + L.cur, W - M - 32, y, { align: 'right' }); doc.text('BETRAG', W - M, y, { align: 'right' });
      y += 2; doc.setDrawColor(220); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 6;
      doc.setFontSize(10); doc.setTextColor(30);
      const svcLbl = (typeof svcShortLabels !== 'undefined' && svcShortLabels[job.svc]) || job.svc || 'Reinigung';
      doc.text(`${svcLbl} — ${job.objekt || ''}`.slice(0, 60), M, y);
      doc.text(hours.toFixed(2), W - M - 60, y, { align: 'right' });
      doc.text(rate.toFixed(2), W - M - 32, y, { align: 'right' });
      doc.text(netto.toFixed(2), W - M, y, { align: 'right' });
      y += 10;

      // Summen
      doc.setDrawColor(220); doc.line(W - M - 70, y, W - M, y); y += 6;
      doc.setFontSize(9.5); doc.setTextColor(80);
      doc.text('Netto', W - M - 40, y, { align: 'right' }); doc.setTextColor(20); doc.text(netto.toFixed(2) + ' ' + L.cur, W - M, y, { align: 'right' }); y += 6;
      if (L.mwstPflichtig) {
        doc.setTextColor(80); doc.text(L.vatLabel, W - M - 40, y, { align: 'right' });
        doc.setTextColor(20); doc.text(mwst.toFixed(2) + ' ' + L.cur, W - M, y, { align: 'right' }); y += 6;
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(mf[0], mf[1], mf[2]);
      doc.text('Total', W - M - 40, y, { align: 'right' }); doc.text(brutto.toFixed(2) + ' ' + L.cur, W - M, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
      const ibanPay = (c.iban || '').replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      // B8 — eigene Zahlungsbedingungen, sonst der Standardsatz
      const eigeneBed = ladeVorlagen().rechnungBedingungen;
      doc.text(eigeneBed
        ? doc.splitTextToSize(platzhalterFuellen(eigeneBed, {}), W - 2 * M)
        : (L.payment === 'qr'
            ? 'Zahlbar innert 30 Tagen mit beiliegendem QR-Einzahlschein.'
            : `Zahlbar innert 30 Tagen auf folgendes Konto: IBAN ${ibanPay}`), M, y + 8);
      // Ohne Steuerpflicht gehört der gesetzliche Hinweis auf den Beleg
      if (!L.mwstPflichtig) doc.text(L.steuerHinweis, M, y + 13);

      // ---- Zahlteil: CH = Swiss-QR-Einzahlschein, DE/AT = SEPA-Zahlblock ----
      if (L.payment === 'qr') drawQrSlip(doc, c, debtor, brutto, message, qrUrl, W, H);
      else drawSepaBlock(doc, c, debtor, brutto, message, L, W, H);

      const filename = `Rechnung_${invNr}.pdf`;
      const pdfBase64 = pdfArrayBufferToBase64(doc.output('arraybuffer'));
      if (options.download !== false) doc.save(filename);
      if (options.quiet !== true) toast(tt('toastdyn.invoiceCreated','✓ Rechnung erstellt') + ' — ' + invNr);
      return { doc, invNr, filename, pdfBase64 };
    }

    // Bar-/TWINT-Zahlungen erhalten einen einfachen, steuerlich konsistenten
    // Zahlungsbeleg. Er verwendet dieselben Firmen-, Kunden- und Preiswerte
    // wie die Rechnung, jedoch ohne Zahlungsaufforderung.
    function generateReceiptForJob(job, dateKey, options = {}) {
      const pm = job.paymethod || 'bar';
      if (!['bar', 'twint'].includes(pm)) { toast('Quittung nur für Bar oder TWINT', 'error'); return null; }
      if (!window.jspdf || !window.jspdf.jsPDF) { toast('PDF-Bibliothek lädt noch — kurz warten', 'error'); return null; }
      const c = loadCompany();
      const L = coLocale(c);
      const cust = job._customer;
      const name = cust ? customerDisplayName(cust) : (job.objekt || 'Kunde');
      const netto = Number(job.price || 0), mwst = netto * L.vat, brutto = netto + mwst;
      const receiptNr = ('Q-' + dateKey.replace(/-/g, '') + '-' + String(job.id || '').slice(-4)).toUpperCase();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth(), M = 20;
      const mf = hexZuRgb(c.brandColor) || [225, 29, 42];
      let y = M;
      const tx = pdfLogo(doc, c, M, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(mf[0], mf[1], mf[2]);
      doc.text(c.name || 'Firma', tx, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100);
      doc.text([c.addr1, c.addr2].filter(Boolean).join(', '), W - M, y, { align: 'right' });
      y += 16; doc.setDrawColor(mf[0], mf[1], mf[2]); doc.line(M, y, W - M, y); y += 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20); doc.text('Quittung', M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
      doc.text('Nr. ' + receiptNr, W - M, y - 4, { align: 'right' });
      doc.text('Datum: ' + new Date(dateKey + 'T00:00:00').toLocaleDateString(L.dateLoc), W - M, y, { align: 'right' });
      y += 16; doc.setTextColor(30); doc.setFontSize(10);
      doc.text(`Erhalten von: ${name}`, M, y); y += 8;
      const svcLbl = (typeof svcShortLabels !== 'undefined' && svcShortLabels[job.svc]) || job.svc || 'Leistung';
      doc.text(doc.splitTextToSize(`${svcLbl} — ${job.objekt || ''}`, W - 2 * M), M, y); y += 12;
      doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 8;
      doc.text('Netto', M, y); doc.text(netto.toFixed(2) + ' ' + L.cur, W - M, y, { align: 'right' }); y += 7;
      if (L.mwstPflichtig) { doc.text(L.vatLabel, M, y); doc.text(mwst.toFixed(2) + ' ' + L.cur, W - M, y, { align: 'right' }); y += 7; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(mf[0], mf[1], mf[2]);
      doc.text('Bezahlt', M, y); doc.text(brutto.toFixed(2) + ' ' + L.cur, W - M, y, { align: 'right' }); y += 9;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
      doc.text(`Zahlungsart: ${pm === 'twint' ? 'TWINT' : 'Bar'}`, M, y);
      if (!L.mwstPflichtig) doc.text(L.steuerHinweis, M, y + 7);
      const filename = `Quittung_${receiptNr}.pdf`;
      if (options.download !== false) doc.save(filename);
      if (options.quiet !== true) toast(tt('job.receiptCreated','✓ Quittung erstellt') + ' — ' + receiptNr);
      return { doc, receiptNr, filename, pdfBase64: pdfArrayBufferToBase64(doc.output('arraybuffer')) };
    }

    // Zeichnet Empfangsschein + Zahlteil am Seitenfuss
    function drawQrSlip(doc, c, debtor, amount, message, qrUrl, W, H) {
      const top = H - 105;            // QR-Bill-Zone = unterste 105 mm
      const sep = 62;                 // Empfangsschein-Breite
      doc.setDrawColor(150); doc.setLineWidth(0.2);
      doc.line(0, top, W, top);                 // obere Trennlinie (Schere)
      doc.line(sep, top, sep, H);               // vertikale Trennung
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text('✂ Vor der Einzahlung abzutrennen', W / 2, top - 2, { align: 'center' });

      const ibanFmt = (c.iban || '').replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      const payTo = `${c.name}\n${c.addr1}\n${c.addr2}`;
      const payBy = debtor.name ? `${debtor.name}\n${debtor.addr1 || ''}\n${debtor.addr2 || ''}` : '';

      // --- Empfangsschein (links) ---
      let x = 5, yy = top + 7;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20);
      doc.text('Empfangsschein', x, yy); yy += 7;
      doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text('Konto / Zahlbar an', x, yy); yy += 3;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(ibanFmt, x, yy); yy += 3.5;
      doc.text(doc.splitTextToSize(payTo, sep - 10), x, yy); yy += 13;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('Zahlbar durch', x, yy); yy += 3;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(doc.splitTextToSize(payBy || '—', sep - 10), x, yy);
      let yc = H - 25;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('Währung', x, yc); doc.text('Betrag', x + 18, yc); yc += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('CHF', x, yc); doc.text(Number(amount).toFixed(2), x + 18, yc);
      doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.text('Annahmestelle', W / 2 - 6, H - 8, { align: 'right' });

      // --- Zahlteil (rechts) ---
      let px = sep + 5, py = top + 7;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20);
      doc.text('Zahlteil', px, py);
      // QR (46x46 mm) mit Schweizerkreuz
      const qrSize = 46, qx = px, qy = py + 5;
      if (qrUrl) doc.addImage(qrUrl, 'PNG', qx, qy, qrSize, qrSize);
      const cx = qx + qrSize / 2, cy = qy + qrSize / 2;
      doc.setFillColor(0, 0, 0); doc.rect(cx - 3.5, cy - 3.5, 7, 7, 'F');
      doc.setFillColor(255, 255, 255); doc.rect(cx - 1, cy - 2.5, 2, 5, 'F'); doc.rect(cx - 2.5, cy - 1, 5, 2, 'F');
      // Betrag unter QR
      let by = qy + qrSize + 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(20);
      doc.text('Währung', px, by); doc.text('Betrag', px + 18, by); by += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('CHF', px, by); doc.text(Number(amount).toFixed(2), px + 18, by);
      // Angaben rechts neben QR
      let ix = qx + qrSize + 8, iy = py + 5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('Konto / Zahlbar an', ix, iy); iy += 3;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(ibanFmt, ix, iy); iy += 3.5;
      doc.text(doc.splitTextToSize(payTo, W - ix - 5), ix, iy); iy += 14;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('Zusätzliche Informationen', ix, iy); iy += 3;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(message || '', W - ix - 5), ix, iy); iy += 8;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('Zahlbar durch', ix, iy); iy += 3;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(doc.splitTextToSize(payBy || '—', W - ix - 5), ix, iy);
    }

    // SEPA-Zahlblock (DE/AT) — ersetzt den Schweizer QR-Einzahlschein. Einfacher Zahlungs-Infokasten.
    function drawSepaBlock(doc, c, debtor, amount, message, L, W, H) {
      const M = 20;
      const top = H - 60;
      doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(M, top, W - M, top);
      let y = top + 8;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20);
      doc.text('Zahlungsangaben (SEPA-Überweisung)', M, y); y += 7;
      const ibanFmt = (c.iban || '').replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      const row = (label, val) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(110); doc.text(label, M, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(20); doc.text(val || '—', M + 38, y); y += 5.5;
      };
      row('Empfänger', c.name || '');
      row('IBAN', ibanFmt);
      if (c.bic) row('BIC', c.bic);
      row('Betrag', amount.toFixed(2) + ' ' + L.cur);
      row('Verwendungszweck', message || '');
    }

    // ============ Adress-Autocomplete (echte Adressen via OpenStreetMap) ============
    function attachAddressAutocomplete(input) {
      if (!input || input._acAttached) return;
      input._acAttached = true;
      input.setAttribute('autocomplete', 'off');
      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,0.22);margin-top:4px;max-height:240px;overflow:auto;display:none;';
      document.body.appendChild(box);
      let timer = null, ctrl = null, items = [], active = -1;
      const hide = () => { box.style.display = 'none'; active = -1; };
      const place = () => {
        const r = input.getBoundingClientRect();
        box.style.left = (r.left + window.scrollX) + 'px';
        box.style.top = (r.bottom + window.scrollY) + 'px';
        box.style.width = r.width + 'px';
      };
      const fmt = (r) => {
        const a = r.address || {};
        const strasse = [a.road, a.house_number].filter(Boolean).join(' ');
        const ort = [a.postcode, a.city || a.town || a.village || a.municipality].filter(Boolean).join(' ');
        return [strasse, ort].filter(Boolean).join(', ') || r.display_name;
      };
      const choose = (i) => {
        const it = items[i]; if (!it) return;
        input.value = it.label; hide();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const render = () => {
        if (!items.length) { hide(); return; }
        box.innerHTML = items.map((it, i) =>
          `<div data-i="${i}" style="padding:9px 12px;font-size:13.5px;cursor:pointer;border-bottom:1px solid var(--border);${i === active ? 'background:var(--bg-subtle,#eef);' : ''}">📍 ${escapeHtml(it.label)}</div>`
        ).join('');
        place(); box.style.display = 'block';
        box.querySelectorAll('[data-i]').forEach((el) =>
          el.addEventListener('mousedown', (e) => { e.preventDefault(); choose(+el.dataset.i); }));
      };
      input.addEventListener('input', () => {
        const q = input.value.trim();
        clearTimeout(timer);
        if (q.length < 4) { hide(); return; }
        timer = setTimeout(async () => {
          try {
            if (ctrl) ctrl.abort(); ctrl = new AbortController();
            const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=ch&accept-language=de&q=' + encodeURIComponent(q);
            const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            const seen = new Set();
            items = data.map(r => ({ label: fmt(r) })).filter(v => { if (seen.has(v.label)) return false; seen.add(v.label); return true; });
            active = -1; render();
          } catch (e) { /* abgebrochen oder offline */ }
        }, 350);
      });
      input.addEventListener('keydown', (e) => {
        if (box.style.display === 'none') return;
        if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
        else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(active); }
        else if (e.key === 'Escape') { hide(); }
      });
      input.addEventListener('blur', () => setTimeout(hide, 150));
      window.addEventListener('scroll', () => { if (box.style.display !== 'none') place(); }, true);
    }
    ['custAddress', 'offAdresse', 'wizAddress'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) attachAddressAutocomplete(el);
    });

    let editingReportId = null;
    let repPhotos = [];
    function renderRepPhotoGrid() {
      const grid = document.getElementById('repPhotoGrid');
      if (!grid) return;
      grid.innerHTML = repPhotos.map((p, i) => `
        <div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background-image:url('${p}');background-size:cover;background-position:center;">
          <button type="button" onclick="removeRepPhoto(${i})" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
        </div>`).join('');
    }
    function removeRepPhoto(i) { repPhotos.splice(i, 1); renderRepPhotoGrid(); }
    function onReportPhotosSelected(ev) {
      const files = Array.from(ev.target.files || []);
      if (!files.length) return;
      Promise.all(files.map(f => ccResizeImage(f, 1000, 0.8).catch(() => null)))
        .then(results => {
          results.filter(Boolean).forEach(d => repPhotos.push(d));
          renderRepPhotoGrid();
        });
      ev.target.value = '';
    }
    function openReportEditor(id) {
      editingReportId = id || null;
      const r = id ? loadReports().find(x => x.id === id) : null;
      // Mitarbeiter-Vorschläge
      const dl = document.getElementById('repEmployeeList');
      if (dl) dl.innerHTML = EMPLOYEES.map(e => `<option value="${empName(e)}"></option>`).join('');
      document.getElementById('reportModalTitle').textContent = r ? tt('dyn.reportEdit', 'Bericht bearbeiten') : tt('dyn.reportNew', 'Bericht erfassen');
      document.getElementById('repObjekt').value = r?.objekt || '';
      document.getElementById('repEmployee').value = r?.employee || '';
      document.getElementById('repDate').value = r?.date || new Date().toISOString().slice(0, 10);
      document.getElementById('repTime').value = r?.time || '';
      document.getElementById('repStatus').value = r?.status || 'vollstaendig';
      document.getElementById('repNote').value = r?.note || '';
      document.getElementById('repDeleteBtn').style.display = r ? 'inline-flex' : 'none';
      repPhotos = r ? (r.photos || []).slice() : [];
      renderRepPhotoGrid();
      openModal('reportEditor');
    }
    function saveReport() {
      const objekt = document.getElementById('repObjekt').value.trim();
      if (!objekt) { toast(`${VT('objektKunde')} ${tt('toastdyn.required','erforderlich')}`, 'error'); return; }
      const data = {
        objekt,
        employee: document.getElementById('repEmployee').value.trim(),
        date: document.getElementById('repDate').value,
        time: document.getElementById('repTime').value.trim(),
        status: document.getElementById('repStatus').value,
        note: document.getElementById('repNote').value.trim(),
        photos: repPhotos.slice()
      };
      const reports = loadReports();
      if (editingReportId) {
        const idx = reports.findIndex(x => x.id === editingReportId);
        if (idx >= 0) reports[idx] = { ...reports[idx], ...data };
        toast('✓ Bericht aktualisiert');
      } else {
        reports.push({ id: 'r' + Date.now(), ...data });
        toast('✓ Bericht gespeichert');
      }
      try {
        saveReports(reports);
      } catch (err) {
        toast('Speicher voll — bitte weniger/kleinere Fotos', 'error');
        return;
      }
      closeModal('reportEditor');
      editingReportId = null;
      renderBerichte();
      if (typeof renderDashboard === 'function') renderDashboard();
    }
    function deleteReport() {
      if (!editingReportId) return;
      if (!confirm('Diesen Bericht wirklich löschen?')) return;
      saveReports(loadReports().filter(x => x.id !== editingReportId));
      window.MosaDB?.remove('reports', editingReportId);
      closeModal('reportEditor');
      editingReportId = null;
      renderBerichte();
      if (typeof renderDashboard === 'function') renderDashboard();
      toast('Bericht gelöscht');
    }
    let detailReportId = null;
    function openReportDetail(id) {
      const r = loadReports().find(x => x.id === id);
      if (!r) return;
      detailReportId = id;
      const st = REPORT_STATUS[r.status] || REPORT_STATUS.vollstaendig;
      document.getElementById('repDetailTitle').textContent = r.objekt || tt('dyn.report', 'Bericht');
      document.getElementById('repDetailMeta').innerHTML = [r.employee, reportDateLabel(r), r.time].filter(Boolean).map(escapeHtml).join(' · ') + ` · <span class="badge ${st.cls}"><span class="dot" style="background:${st.col}"></span>${st.label}</span>`;
      document.getElementById('repDetailNote').textContent = r.note || '';
      const photos = r.photos || [];
      const wrap = document.getElementById('repDetailPhotos');
      wrap.innerHTML = photos.length
        ? photos.map(p => `<a href="${p}" target="_blank" style="display:block;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid var(--border);background-image:url('${p}');background-size:cover;background-position:center;"></a>`).join('')
        : `<div style="grid-column:1/-1;color:var(--text-subtle);font-size:13px;">${tt('est.noPhotos','Keine Fotos hinterlegt.')}</div>`;
      // Erledigte Arbeiten (aus Abnahmeprotokoll)
      const tasksSect = document.getElementById('repDetailTasks');
      if (tasksSect) {
        if (r.tasks?.length) {
          tasksSect.style.display = '';
          tasksSect.querySelector('.repd-tasks-list').innerHTML = r.tasks.map(t =>
            `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;"><span style="color:var(--success);">✓</span> ${escapeHtml(t)}</div>`
          ).join('');
        } else { tasksSect.style.display = 'none'; }
      }
      // Unterschrift Kunde
      const sigSect = document.getElementById('repDetailSig');
      if (sigSect) {
        if (r.signatureImg) {
          sigSect.style.display = '';
          const img = sigSect.querySelector('img');
          if (img) img.src = r.signatureImg;
        } else { sigSect.style.display = 'none'; }
      }
      openModal('reportDetail');
    }
    function editReportFromDetail() {
      const id = detailReportId;
      closeModal('reportDetail');
      if (id) openReportEditor(id);
    }

    // ============ ESC schließt Modals ============
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
      }
    });

    // ============ Wizard ============
    let wizCurrent = 1;
    let wizService = null;

    const serviceLabels = {
      unterhalt: 'Unterhaltsreinigung',
      end: 'Endreinigung',
      fenster: 'Fensterreinigung',
      bau: 'Baureinigung',
      fassade: 'Fassadenreinigung'
    };

    // ── Branchen-Wizard-Helfer (Nicht-Reinigungs-Branchen) ──
    function isGenericVertical() { return !!(window.MosaVertical && MosaVertical.get() !== 'reinigung'); }
    function genericServiceDef(svc) {
      const standard = window.MosaVertical ? (MosaVertical.preset().services || []) : [];
      const treffer = standard.find(s => s.key === svc);
      if (treffer) return { ...treffer, ...genericUeberschreibungen(svc) };
      return servicesForCurrentVertical().find(s => s.id === svc) || null;
    }
    function serviceTitle(svc) { return serviceLabels[svc] || (genericServiceDef(svc)?.title) || svc || ''; }
    function genericServicePrice(svc) {
      const vert = MosaVertical.get();
      let prices = {}; try { prices = JSON.parse(localStorage.getItem('cc-prices') || '{}'); } catch {}
      const pk = `${vert}_${svc}_price`;
      if (prices[pk] != null) return prices[pk];
      const def = genericServiceDef(svc);
      return def ? def.price : 0;
    }
    // Service-Karten aus dem Preset rendern (gleiche Klassen wie Reinigung → selectService greift).
    function renderWizGenericServices(customOnly = false) {
      const grid = document.getElementById('wizGenericGrid');
      if (!grid || !window.MosaVertical) return;
      const own = servicesForCurrentVertical().map(s => ({ ...s, key: s.id }));
      const svcs = customOnly ? own : [...(MosaVertical.preset().services || []), ...own];
      grid.innerHTML = svcs.map(s => `
        <button type="button" class="svc-card" data-svc="${s.key}" onclick="selectService('${s.key}')">
          <div class="svc-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div class="svc-card-title">${escapeHtml(s.title)}</div>
          <div class="svc-card-desc">${escapeHtml(s.desc)}</div>
        </button>`).join('');
    }
    // Beim Öffnen des Wizards: Reinigung = Original-Raster, andere = generisches Raster.
    function setupWizardForVertical() {
      const cleanGrid = document.querySelector('.wizard-page[data-page="1"] .svc-grid:not(#wizGenericGrid)');
      const genGrid = document.getElementById('wizGenericGrid');
      const custom = servicesForCurrentVertical();
      wizService = null;
      // Jeder neue Auftrag startet sauber. Zusatzpreise gelten nur fuer den
      // aktuellen Auftrag und werden nie unbemerkt vom letzten uebernommen.
      document.querySelectorAll('#modal-newAuftrag .svc-options .opt-chip').forEach(chip => {
        chip.classList.remove('on');
        delete chip.dataset.jobAddonPrice;
      });
      document.querySelectorAll('#modal-newAuftrag [data-default-choice]').forEach(chip => chip.classList.add('on'));
      if (isGenericVertical()) {
        if (cleanGrid) cleanGrid.style.display = 'none';
        if (genGrid) { genGrid.style.display = ''; renderWizGenericServices(); }
      } else {
        if (cleanGrid) cleanGrid.style.display = '';
        if (genGrid) { genGrid.style.display = custom.length ? '' : 'none'; if (custom.length) renderWizGenericServices(true); }
      }
      renderWizExtraFields();
    }
    // Branchenspezifische Zusatzfelder (z. B. Werkstatt-Fahrzeug) im Wizard rendern.
    function renderWizExtraFields() {
      const wrap = document.getElementById('wizExtraFields');
      if (!wrap) return;
      const fields = window.MosaVertical ? (MosaVertical.preset().extraFields || []) : [];
      if (!fields.length) { wrap.innerHTML = ''; wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      wrap.innerHTML = fields.map(f => `
        <div class="field">
          <label>${escapeHtml(f.label)}</label>
          <input type="${f.type === 'date' ? 'date' : 'text'}" id="wizExtra_${f.key}" data-extra-key="${f.key}" placeholder="${escapeHtml(f.placeholder || '')}" />
        </div>`).join('');
    }
    // Eingegebene Zusatzfelder als lesbaren Text (für die Auftrags-Notiz).
    function collectWizExtraText() {
      const wrap = document.getElementById('wizExtraFields');
      if (!wrap) return '';
      const fields = window.MosaVertical ? (MosaVertical.preset().extraFields || []) : [];
      const parts = [];
      fields.forEach(f => {
        const el = document.getElementById('wizExtra_' + f.key);
        const v = (el?.value || '').trim();
        if (v) parts.push(`${f.label}: ${v}`);
      });
      return parts.join(' · ');
    }
    // Generisches Optionen-Panel je nach Einheit (Stunde vs. Pauschal) konfigurieren.
    function setupGenericOpts() {
      const def = genericServiceDef(wizService);
      const qtyWrap = document.getElementById('wizGenericQtyWrap');
      const hint = document.getElementById('wizGenericHint');
      if (!def) return;
      if (def.unit === 'h') {
        if (qtyWrap) qtyWrap.style.display = 'none';
        if (hint) hint.textContent = 'Abgerechnet nach Stunden — die Dauer legst du im nächsten Schritt fest.';
      } else {
        if (qtyWrap) qtyWrap.style.display = '';
        const q = document.getElementById('wizGenericQty'); if (q && !q.value) q.value = '1';
        if (hint) hint.textContent = 'Pauschalpreis pro Einheit — bei Bedarf Anzahl erhöhen.';
      }
    }

    function selectService(svc) {
      wizService = svc;
      document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('selected'));
      document.querySelector(`.svc-card[data-svc="${svc}"]`).classList.add('selected');
      document.getElementById('wizNext')?.focus();
    }

    function wizStep(dir) {
      const target = wizCurrent + dir;
      if (target < 1 || target > 3) {
        if (target > 3) submitAuftrag();
        return;
      }
      // when leaving step 1, require service selected
      if (wizCurrent === 1 && dir > 0 && !wizService) {
        toast(`${tt('toastdyn.selectFirstPre','Bitte zuerst eine ')}${VT('leistungsart')}${tt('toastdyn.selectFirstPost',' wählen')}`);
        return;
      }
      wizCurrent = target;

      // update steps
      document.querySelectorAll('.wstep').forEach(s => {
        const n = parseInt(s.dataset.step);
        s.classList.toggle('active', n === wizCurrent);
        s.classList.toggle('done', n < wizCurrent);
      });

      // show correct page
      document.querySelectorAll('.wizard-page').forEach(p => p.classList.remove('active'));
      document.querySelector(`.wizard-page[data-page="${wizCurrent}"]`).classList.add('active');
      const wizardBody = document.querySelector('#modal-newAuftrag .modal-body');
      if (wizardBody) wizardBody.scrollTop = 0;

      // show service-specific options on step 2
      if (wizCurrent === 2 && wizService) {
        document.querySelectorAll('.svc-options').forEach(o => o.style.display = 'none');
        if (isGenericVertical() || genericServiceDef(wizService)?.isCustom) {
          const gp = document.getElementById('wizGenericOpts');
          if (gp) gp.style.display = 'flex';
          setupGenericOpts();
          document.getElementById('wizSub').textContent = serviceTitle(wizService) + ' — ' + tt('wiz.subDetails', 'Details');
        } else {
          const opts = document.querySelector(`.svc-options[data-svc-opts="${wizService}"]`);
          if (opts) opts.style.display = 'flex';
          document.getElementById('wizSub').textContent = serviceLabels[wizService] + ' — ' + tt('wiz.subConfigure', 'Details konfigurieren');
          if (wizService === 'end') recalcStart();
        }
      }

      // titles per step
      if (wizCurrent === 1) document.getElementById('wizSub').textContent = tt('wiz.subStep1', 'Wähle die {x} aus').replace('{x}', VT('leistungsart'));
      if (wizCurrent === 3) {
        document.getElementById('wizSub').textContent = tt('wiz.subStep3', 'Termin, Adresse und Preis');
        // Step 2 → Step 3: Minuten aus Service-Optionen in Stunden-Feld übernehmen
        _syncWizDuration();
        if (wizService === 'end') applyHandoverSchedule();
        _wizStartVorbelegen();
        wizCalcPrice();
        wizCheckAvailability();
      }

      // buttons
      document.getElementById('wizBack').style.display = wizCurrent > 1 ? 'inline-flex' : 'none';
      document.getElementById('wizNext').textContent = wizCurrent === 3 ? 'Auftrag anlegen' : 'Weiter →';
    }

    function toggleOne(btn) {
      const row = btn.parentElement;
      row.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('on'));
      btn.classList.add('on');
    }

    function setAbgabe(btn, mode) {
      btn.parentElement.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('on'));
      btn.classList.add('on');
      document.getElementById('abgabe-mit').style.display = mode === 'mit' ? 'flex' : 'none';
      if (mode === 'mit') recalcStart();
    }

    // ============ Automatische Startzeit-Berechnung für Endreinigung ============
    function recalcStart() {
      const abgabe = document.getElementById('abgabeTime')?.value || '14:00';
      const flaeche = parseInt(document.getElementById('endFlaeche')?.value || '65');
      const raeume = parseInt(document.getElementById('endRaeume')?.value || '2');

      // Grunddauer aus den Faktoren der Firma (Einstellungen → Zeitberechnung)
      let mins = grunddauer(flaeche, raeume);

      // Zusatzleistungen
      document.querySelectorAll('.add-task.on').forEach(t => {
        mins += parseInt(t.dataset.time || '0');
      });

      // 30 Min Puffer vor Abgabe
      const buffer = 30;

      // Startzeit = Abgabe - Dauer - Puffer
      const [h, m] = abgabe.split(':').map(Number);
      const abgabeMins = h * 60 + m;
      // Nur planbare Viertelstunden vorschlagen; dabei immer genügend Puffer vor der Abgabe lassen.
      const startMins = Math.floor((abgabeMins - mins - buffer) / 15) * 15;

      const startH = Math.floor(((startMins % 1440) + 1440) % 1440 / 60);
      const startM = ((startMins % 60) + 60) % 60;

      const durH = Math.floor(mins / 60);
      const durM = mins % 60;

      const startStr = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`;
      const durStr = durH > 0 ? `${durH}h ${durM}min` : `${durM} min`;

      const startEl = document.getElementById('calcStart');
      const durEl = document.getElementById('calcDur');
      const bufEl = document.getElementById('calcBuffer');
      if (startEl) startEl.textContent = startStr;
      if (durEl) durEl.textContent = durStr;
      if (bufEl) bufEl.textContent = buffer + ' Min';
    }

    // Wohnungsabgaben sind harte Termine: Start, Dauer und Deadline werden in Schritt 3 übernommen.
    function applyHandoverSchedule() {
      const handoverWithUs = document.querySelector('[data-abgabe="mit"]')?.classList.contains('on');
      if (!handoverWithUs) return;
      recalcStart();
      const start = document.getElementById('calcStart')?.textContent;
      const deadline = document.getElementById('abgabeTime')?.value;
      const durText = document.getElementById('calcDur')?.textContent || '';
      const match = durText.match(/(\d+)h\s*(\d+)min|^(\d+)\s*min/);
      let mins = 0;
      if (match) mins = match[3] ? Number(match[3]) : Number(match[1]) * 60 + Number(match[2]);
      const duration = Math.max(.25, Math.ceil(mins / 15) * 15 / 60);
      if (start) document.getElementById('wizStart').value = start;
      if (deadline) document.getElementById('wizDeadline').value = deadline;
      if (mins) document.getElementById('wizDuration').value = duration;
    }
