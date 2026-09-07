// MosaOS — app-preise.js
//
// Preis-System: Preislisten je Branche, eigene Leistungen,
// Abrechnungsarten.
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

    // ============ Preis-System ============
    const defaultPrices = {
      'unterhalt-rate': 35, 'unterhalt-min': 1, 'unterhalt-fee': 0,
      'end-qm': 3.2, 'end-min': 250, 'end-fee': 25,
      'end-fenster': 35, 'end-backofen': 35, 'end-kuehlschrank': 25, 'end-balkon': 30, 'end-keller': 30,
      'fenster-rate': 40, 'fenster-leiter': 15, 'fenster-hubsteiger': 150, 'fenster-min': 2, 'fenster-fee': 20,
      'fenster-rahmen': 30, 'fenster-rolladen': 40, 'fenster-baenke': 20,
      'bau-qm': 2.8, 'bau-min': 400, 'bau-fee': 35,
      'bau-schutt': 120, 'bau-container': 250, 'bau-estrich': 90, 'bau-kleber': 90,
      'fassade-stator': 8.5, 'fassade-algen': 3.5, 'fassade-impraeg': 4.0, 'fassade-graffiti': 12,
      'fassade-hubsteiger': 180, 'fassade-geruest': 350, 'fassade-seil': 220, 'fassade-min': 800
    };

    function loadPrices() {
      const saved = JSON.parse(localStorage.getItem('cc-prices') || '{}');
      // Migration: altes Stundensatz-Modell (end-rate/bau-rate) → €/m².
      // end-min/bau-min wurden von „Stunden" auf „€ Mindestauftrag" umgewidmet.
      if (saved['end-rate'] !== undefined || saved['bau-rate'] !== undefined) {
        delete saved['end-rate']; delete saved['bau-rate'];
        delete saved['end-min'];  delete saved['bau-min'];
        localStorage.setItem('cc-prices', JSON.stringify(saved));
      }
      Object.entries(defaultPrices).forEach(([key, val]) => {
        const el = document.querySelector(`[data-price="${key}"]`);
        if (el) el.value = saved[key] !== undefined ? saved[key] : val;
      });
    }

    document.addEventListener('DOMContentLoaded', () => { try { renderPriceModes(); } catch {} });

    function getPrice(key) {
      const el = document.querySelector(`[data-price="${key}"]`);
      return el ? parseFloat(el.value) || 0 : (defaultPrices[key] || 0);
    }

    function addonPriceText(key, kind = 'flat') {
      const chip = document.querySelector(`#modal-newAuftrag [data-addon-price="${key}"]`);
      const value = wizardAddonUnitPrice(chip);
      const currency = coLocale(loadCompany()).cur;
      if (!value) return 'inklusive';
      if (kind === 'percent') return `+${value}%`;
      if (kind === 'qm') return `+${currency} ${value.toFixed(2)}/m²`;
      return `+${currency} ${value.toFixed(2)}`;
    }

    function wizardAddonUnitPrice(chip) {
      if (!chip) return 0;
      const own = parseFloat(chip.dataset.jobAddonPrice);
      return Number.isFinite(own) ? own : getPrice(chip.dataset.addonPrice);
    }

    function wizardAddonLabel(chip) {
      return (chip.querySelector('span:not(.addon-price)')?.textContent || chip.childNodes[0]?.textContent || chip.textContent || '').trim();
    }

    function setWizardAddonPrice(key, value) {
      const chip = document.querySelector(`#modal-newAuftrag [data-addon-price="${key}"].on`);
      if (!chip) return;
      const number = parseFloat(value);
      chip.dataset.jobAddonPrice = Number.isFinite(number) ? String(Math.max(0, number)) : '0';
      renderWizardAddonPrices();
      updatePriceSummary();
    }

    function renderWizardAddonEditor() {
      const editor = document.getElementById('wizAddonEditor');
      const rows = document.getElementById('wizAddonEditorRows');
      if (!editor || !rows) return;
      const chips = Array.from(document.querySelectorAll(`.svc-options[data-svc-opts="${wizService}"] [data-addon-price].on`));
      editor.hidden = chips.length === 0;
      rows.innerHTML = chips.map(chip => {
        const key = chip.dataset.addonPrice;
        const kind = chip.dataset.addonKind || 'flat';
        const suffix = kind === 'percent' ? '%' : (kind === 'qm' ? `${coLocale(loadCompany()).cur}/m²` : coLocale(loadCompany()).cur);
        return `<label class="wizard-addon-row"><span>${escapeHtml(wizardAddonLabel(chip))}</span><span class="wizard-addon-input"><input type="number" min="0" step="0.5" value="${wizardAddonUnitPrice(chip)}" oninput="setWizardAddonPrice('${safeAttr(key)}',this.value)"><em>${escapeHtml(suffix)}</em></span></label>`;
      }).join('');
    }

    function collectWizardAddons() {
      return Array.from(document.querySelectorAll(`#modal-newAuftrag [data-addon-price].on`)).map(chip => ({
        key: chip.dataset.addonPrice,
        label: wizardAddonLabel(chip),
        kind: chip.dataset.addonKind || 'flat',
        price: wizardAddonUnitPrice(chip)
      }));
    }

    function renderWizardAddonPrices() {
      document.querySelectorAll('#modal-newAuftrag [data-addon-price]').forEach(chip => {
        let price = chip.querySelector('.addon-price');
        if (!price) {
          price = document.createElement('span');
          price.className = 'addon-price';
          chip.appendChild(price);
        }
        price.textContent = addonPriceText(chip.dataset.addonPrice, chip.dataset.addonKind || 'flat');
      });
    }

    function selectedFixedAddons(selector) {
      return Array.from(document.querySelectorAll(selector + ' [data-addon-price].on'))
        .filter(chip => (chip.dataset.addonKind || 'flat') === 'flat')
        .reduce((sum, chip) => sum + wizardAddonUnitPrice(chip), 0);
    }

    // Abrechnungsart je Leistung: 'qm' oder 'std'. Wird neben den Preisen
    // gespeichert, damit ein Betrieb selbst entscheidet, ob er nach Flaeche
    // oder nach Zeit rechnet.
    function getPriceMode(dienst) {
      try {
        const d = JSON.parse(localStorage.getItem('cc-price-modes') || '{}');
        return d[dienst] || 'qm';
      } catch { return 'qm'; }
    }

    function setPriceMode(dienst, modus) {
      let d = {}; try { d = JSON.parse(localStorage.getItem('cc-price-modes') || '{}'); } catch {}
      d[dienst] = modus;
      localStorage.setItem('cc-price-modes', JSON.stringify(d));
      renderPriceModes();
      if (typeof toast === 'function') {
        toast(modus === 'std' ? 'Wird jetzt nach Stunden abgerechnet.'
                              : 'Wird jetzt nach Fläche abgerechnet.');
      }
    }

    // Zeigt je Leistung die passenden Felder und markiert den aktiven Knopf.
    function renderPriceModes() {
      document.querySelectorAll('[data-pricemode]').forEach(row => {
        const dienst = row.dataset.pricemode;
        const modus = getPriceMode(dienst);
        row.querySelectorAll('.opt-chip').forEach(c =>
          c.classList.toggle('on', c.dataset.mode === modus));
      });
      document.querySelectorAll('[data-modeonly]').forEach(el => {
        const [dienst, modus] = el.dataset.modeonly.split(':');
        el.style.display = (getPriceMode(dienst) === modus) ? '' : 'none';
      });
    }

    function onPriceChange() {
      // live save to localStorage — bestehende Keys (auch generische <branche>_<service>_price) bewahren.
      let data = {}; try { data = JSON.parse(localStorage.getItem('cc-prices') || '{}'); } catch {}
      document.querySelectorAll('[data-price]').forEach(el => {
        data[el.dataset.price] = parseFloat(el.value) || 0;
      });
      renderWizardAddonPrices();
      localStorage.setItem('cc-prices', JSON.stringify(data));
    }

    function savePrices() {
      if (!requirePerm('edit_prices', 'Preise')) return;
      onPriceChange();
      try { window.MosaDB?.push('company_prices', JSON.parse(localStorage.getItem('cc-prices')) || {}); } catch {}
      toast(`✓ ${tt('toastdyn.pricesSavedA','Preise gespeichert (von ')}${getUserName(currentUser)}${tt('toastdyn.pricesSavedB',') — gelten ab nächstem Auftrag')}`);
    }

    let priceOverrideActive = false;

    // Überträgt die in Schritt 2 eingegebenen Minuten als Stunden in das wizDuration-Feld
    // Startzeit vorbelegen: Steht die Voreinstellung noch (08:00) und ist zu
    // dieser Zeit kein Team frei — etwa weil an dem Tag schon ein Einsatz
    // liegt —, wird gleich der naechste freie Zeitpunkt eingesetzt. Vorher
    // stand dort stur 08:00, und man bekam nur die Meldung "nicht moeglich".
    // Eine vom Benutzer selbst gewaehlte Zeit bleibt unangetastet.
    let _wizStartBeruehrt = false;
    function _wizStartVorbelegen() {
      if (_wizStartBeruehrt) return;
      const ws = document.getElementById('wizStart');
      if (!ws || ws.value !== '08:00') return;
      const dv = document.getElementById('wizDate')?.value;
      const dk = dv || isoDate(planCurrentDate);
      const hours = parseFloat(document.getElementById('wizDuration')?.value) || 1.5;
      const dur = Math.round(hours * 60);
      const crew = Math.max(1, parseInt(document.getElementById('wizCrew')?.value) || 1);
      const team = document.getElementById('wizardTeamSelect')?.value || '';
      const jetzt = parseHM('08:00');
      // Ist 08:00 schon frei, bleibt alles wie es ist.
      let frei = availabilityAt(dk, jetzt, dur, crew);
      if (team) frei = frei.filter(r => r.team.id === team);
      if (frei.some(r => r.available)) return;
      const slot = nextFreeSlotSameDay(dk, jetzt, dur, crew, team);
      if (slot != null) ws.value = fmtMinHM(slot);
    }

    function _syncWizDuration() {
      if (isGenericVertical() || genericServiceDef(wizService)?.isCustom) return;   // generische/eigene Leistungen: Dauer manuell in Schritt 3
      if (!wizService || wizService === 'fassade') return;
      const p = calcPriceForService(true);
      if (!p?.mins) return;
      const durEl = document.getElementById('wizDuration');
      if (durEl) durEl.value = Math.round(p.mins / 60 * 4) / 4 || 0.25;
    }

    // Preis im Wizard-Schritt 3: Dauer (Stunden) × Stundensatz (+ Anfahrtspauschale)
    // B1 — bestehenden Kunden waehlen statt neu tippen.
    // Uebernimmt Adresse und Standardleistung und zeigt den Verlauf.
    let wizKundeId = null;

    function wizKundeListeZu() {
      const l = document.getElementById('wizCustomerList');
      if (l) l.style.display = 'none';
    }

    function wizKundeSuchen(text) {
      const liste = document.getElementById('wizCustomerList');
      if (!liste) return;
      const q = (text || '').toLowerCase().trim();
      const treffer = loadCustomers().filter(c =>
        !q || customerDisplayName(c).toLowerCase().includes(q)
           || (c.address || '').toLowerCase().includes(q)
           || (c.phone || '').toLowerCase().includes(q)
      ).slice(0, 8);
      if (!treffer.length) { wizKundeListeZu(); return; }
      liste.innerHTML = treffer.map(c => {
        const zeile = [c.address, c.phone].filter(Boolean).join(' · ');
        return `<button type="button" onclick="wizKundeWaehlen('${c.id}')">
          ${escapeHtml(customerDisplayName(c))}${zeile ? `<small>${escapeHtml(zeile)}</small>` : ''}
        </button>`;
      }).join('');
      liste.style.display = 'block';
    }

    function wizKundeWaehlen(id) {
      const c = loadCustomers().find(x => x.id === id);
      if (!c) return;
      wizKundeId = c.id;
      const feld = document.getElementById('wizCustomer');
      if (feld) feld.value = customerDisplayName(c);
      // Adresse nur fuellen, wenn der Nutzer noch nichts eigenes eingetippt hat
      const adr = document.getElementById('wizAddress');
      if (adr && !adr.value.trim() && c.address) adr.value = c.address;
      const name = document.getElementById('termName');
      if (name && !name.value.trim()) name.value = customerDisplayName(c);
      wizKundeListeZu();
      wizKundeVerlauf(c);
      if (typeof wizCalcPrice === 'function') wizCalcPrice();
    }

    // Was dieser Kunde bisher hatte — damit man nicht in der Kundenakte nachsehen muss
    function wizKundeVerlauf(c) {
      const box = document.getElementById('wizCustomerInfo');
      if (!box) return;
      const name = customerDisplayName(c).toLowerCase();
      const frueher = allePlanJobs()
        .filter(t => t.customerId === c.id
                  || (t.customer || '').toLowerCase() === name
                  || (c.address && (t.ort || '') === c.address))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      const teile = [];
      if (frueher.length) {
        const letzter = frueher[0];
        teile.push(`${frueher.length} ${frueher.length === 1
          ? tt('wiz.custOneOrder', 'früherer Auftrag') : tt('wiz.custOrders', 'frühere Aufträge')}`
          + (letzter.date ? ` · ${tt('wiz.custLast', 'zuletzt')} ${letzter.date}` : ''));
      }
      if (c.paymethod) teile.push(tt('wiz.custPay', 'Zahlung') + ': ' + c.paymethod);
      if (c.notes) teile.push(escapeHtml(c.notes));
      box.innerHTML = teile.join(' · ') || tt('wiz.custNew', 'Noch keine Aufträge für diesen Kunden.');
      box.style.display = 'block';
    }

    // B10 — alles auf den Viertelstundentakt.
    // step= bindet nur die Pfeiltasten; getippte Werte muessen gerundet werden.
    function auf15Runden(el) {
      if (!el) return;
      const vorher = el.value;
      if (el.type === 'time') {
        const [h, m] = (el.value || '').split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return;
        let ges = Math.round((h * 60 + m) / 15) * 15;
        ges = Math.min(ges, 23 * 60 + 45);
        el.value = String(Math.floor(ges / 60)).padStart(2, '0') + ':' + String(ges % 60).padStart(2, '0');
      } else {
        const z = parseFloat(el.value);
        if (!Number.isFinite(z)) return;
        const g = Math.round(z * 4) / 4;
        el.value = String(Math.max(g, parseFloat(el.min) || 0));
      }
      // Nur melden, wenn wirklich gerundet wurde — sonst ruft uns
      // unser eigenes change-Event endlos wieder auf.
      if (el.value !== vorher) el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Auch fuer Felder, die erst spaeter im DOM entstehen (Rapport, Arbeitsschein)
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement)) return;
      const gilt = el.type === 'time'
        || el.classList.contains('rw-hours') || el.classList.contains('wo-w-hours')
        || el.id === 'wizDuration';
      if (gilt) auf15Runden(el);
    }, true);

    function wizCalcPrice() {
      const hoursEl = document.getElementById('wizDuration');
      const out = document.getElementById('wizPriceCalc');
      const hint = document.getElementById('wizPriceHint');
      const currency = coLocale(loadCompany()).cur;
      // Generische Branchen: Stundensatz × Dauer ODER Pauschale × Anzahl.
      if (isGenericVertical() || genericServiceDef(wizService)?.isCustom) {
        if (priceOverrideActive) {
          const ov = parseFloat(document.getElementById('priceOverride')?.value) || 0;
          if (out) out.textContent = currency + ' ' + ov.toFixed(2);
          if (hint) hint.textContent = 'eigener Preis';
          return ov;
        }
        const def = genericServiceDef(wizService);
        const base = genericServicePrice(wizService);
        const mindest = Number(def?.minQty) || 0;
        const anfahrt = Number(def?.fee) || 0;
        let price, htxt;
        if (def && def.unit === 'h') {
          const roh = parseFloat(hoursEl?.value) || 0;
          const hours = Math.max(roh, mindest);      // Mindestbuchung
          price = Math.round((hours * base) * 20) / 20;
          htxt = `${String(hours).replace('.', ',')} Std × ${currency} ${base}`
               + (hours > roh ? ` (Mindestbuchung)` : '');
        } else if (def && def.unit === 'qm') {
          const qm = parseInt(document.getElementById('wizGenericQty')?.value) || 1;
          price = Math.round((base * qm) * 20) / 20;
          htxt = `${qm} m² × ${currency} ${base}`;
        } else {
          const qty = parseInt(document.getElementById('wizGenericQty')?.value) || 1;
          price = Math.round((base * qty) * 20) / 20;
          htxt = qty > 1 ? `${qty} × ${currency} ${base} pauschal` : `Pauschale ${currency} ${base}`;
        }
        // Mindestauftrag bei m² und Pauschale, danach die Anfahrt
        if (def && def.unit !== 'h' && mindest > 0 && price < mindest) {
          price = mindest;
          htxt += ` · Mindestauftrag ${currency} ${mindest}`;
        }
        if (anfahrt > 0) {
          price = Math.round((price + anfahrt) * 20) / 20;
          htxt += ` + ${currency} ${anfahrt} Anfahrt`;
        }
        if (out) out.textContent = currency + ' ' + price.toFixed(2);
        if (hint) hint.textContent = htxt;
        return price;
      }
      if (priceOverrideActive) {
        const ov = parseFloat(document.getElementById('priceOverride')?.value) || 0;
        if (out) out.textContent = currency + ' ' + ov.toFixed(2);
        if (hint) hint.textContent = 'eigener Preis';
        return ov;
      }
      const detailed = calcPriceForService();
      if (!detailed) return 0;
      const price = Math.round(detailed.total * 20) / 20;
      if (out) out.textContent = currency + ' ' + price.toFixed(2);
      if (hint) hint.textContent = detailed.rateStr + (detailed.fee ? ` + ${currency} ${detailed.fee} Anfahrt/Zusätze` : '');
      return price;
    }

    function calcPriceForService(fromDetails = false) {
      if (!wizService) return null;
      const currency = coLocale(loadCompany()).cur;

      let mins = 0;
      let rate = 0;
      let minHours = 0;
      let fee = 0;
      let breakdown = [];

      if (wizService === 'unterhalt') {
        // :nth-of-type(2) traf nie etwas — jedes Feld sitzt in einem eigenen
        // Container, ist dort also das erste seiner Art. Die eingegebene Dauer
        // wurde deshalb ignoriert und immer mit 90 Minuten gerechnet.
        const area = parseInt(document.querySelector('.svc-options[data-svc-opts="unterhalt"] input[type="number"]')?.value || 120);
        mins = fromDetails ? Math.max(30, Math.round(area * 0.75)) : Math.round((parseFloat(document.getElementById('wizDuration')?.value) || 1.5) * 60);
        rate = getPrice('unterhalt-rate');
        minHours = getPrice('unterhalt-min');
        fee = getPrice('unterhalt-fee');
      }

      else if (wizService === 'end') {
        const flaeche = parseInt(document.getElementById('endFlaeche')?.value || 65);
        const raeume = parseInt(document.getElementById('endRaeume')?.value || 2);
        const qmPrice = getPrice('end-qm');
        let addMins = 0;
        document.querySelectorAll('.add-task.on').forEach(t => addMins += parseInt(t.dataset.time || 0));
        const feeEnd = getPrice('end-fee');
        const minAuftrag = getPrice('end-min');
        const vorgeschlagen = grunddauer(flaeche, raeume) + addMins;
        const durMins = fromDetails ? vorgeschlagen : Math.round((parseFloat(document.getElementById('wizDuration')?.value) || vorgeschlagen / 60) * 60);
        // Der Betrieb entscheidet in den Einstellungen, ob nach Flaeche oder
        // nach Zeit abgerechnet wird. Die Dauer bleibt in beiden Faellen gleich.
        const nachStunden = getPriceMode('end') === 'std';
        const stundensatz = getPrice('end-rate');
        const base = nachStunden ? (durMins / 60) * stundensatz : flaeche * qmPrice;
        const usedMin = base < minAuftrag;
        return {
          total: Math.max(base, minAuftrag) + feeEnd + selectedFixedAddons('.svc-options[data-svc-opts="end"]'),
          mins: durMins,
          dur: `${Math.floor(durMins/60)}h ${durMins%60}min`,
          rateStr: nachStunden
            ? `${(durMins/60).toFixed(2).replace('.', ',')} Std × ${currency} ${stundensatz}`
            : `${qmPrice.toFixed(2)} ${currency}/m² × ${flaeche} m²`,
          fee: feeEnd,
          showFee: feeEnd > 0,
          minApplied: usedMin,
          minStr: usedMin ? `Mindestauftrag ${minAuftrag.toFixed(2)} ${currency}` : null,
          breakdown: []
        };
      }

      else if (wizService === 'fenster') {
        const count = parseInt(document.querySelector('.svc-options[data-svc-opts="fenster"] input[type="number"]')?.value || 24);
        mins = fromDetails ? Math.max(30, count * 5) : Math.round((parseFloat(document.getElementById('wizDuration')?.value) || 2) * 60);
        rate = getPrice('fenster-rate');
        // check if "mit Leiter" or "Hubsteiger" selected
        const leiterChips = document.querySelectorAll('.svc-options[data-svc-opts="fenster"] .opt-row:first-of-type .opt-chip.on');
        const leiterText = leiterChips[0]?.textContent || '';
        if (leiterText.includes('Leiter')) {
          const aufschlag = wizardAddonUnitPrice(leiterChips[0]);
          rate = rate * (1 + aufschlag / 100);
          breakdown.push(`+${aufschlag}% Leiter-Aufschlag`);
        }
        minHours = getPrice('fenster-min');
        fee = getPrice('fenster-fee');
        fee += selectedFixedAddons('.svc-options[data-svc-opts="fenster"]');
      }

      else if (wizService === 'bau') {
        const flaeche = parseInt(document.querySelector('.svc-options[data-svc-opts="bau"] input[type="number"]')?.value || 200);
        const cleaners = Math.max(1, parseInt(document.getElementById('wizCrew')?.value) || 1);
        const qmPrice = getPrice('bau-qm');
        const feeBau = getPrice('bau-fee');
        const minAuftrag = getPrice('bau-min');
        const nachStundenBau = getPriceMode('bau') === 'std';
        const satzBau = getPrice('bau-rate');
        const vorgeschlagen = Math.round(flaeche * ladeZeitfaktoren().bauProQm / Math.max(cleaners, 1));
        const durMins = fromDetails ? vorgeschlagen : Math.round((parseFloat(document.getElementById('wizDuration')?.value) || vorgeschlagen / 60) * 60);
        const base = nachStundenBau ? (durMins / 60) * satzBau : flaeche * qmPrice;
        const usedMin = base < minAuftrag;
        return {
          total: Math.max(base, minAuftrag) + feeBau + selectedFixedAddons('.svc-options[data-svc-opts="bau"]'),
          mins: durMins,
          dur: `${Math.floor(durMins/60)}h ${durMins%60}min`,
          rateStr: nachStundenBau
            ? `${(durMins/60).toFixed(2).replace('.', ',')} Std × ${currency} ${satzBau}`
            : `${qmPrice.toFixed(2)} ${currency}/m² × ${flaeche} m²`,
          fee: feeBau,
          showFee: feeBau > 0,
          minApplied: usedMin,
          minStr: usedMin ? `Mindestauftrag ${minAuftrag.toFixed(2)} ${currency}` : null,
          breakdown: cleaners > 1 ? [`${cleaners} ${VT('feldMitarbeiterPlural')}`] : []
        };
      }

      else if (wizService === 'fassade') {
        const flaeche = parseInt(document.querySelector('.svc-options[data-svc-opts="fassade"] input[type="number"]')?.value || 350);
        let qmPrice = 0;
        const verfahren = document.querySelectorAll('.svc-options[data-svc-opts="fassade"] .opt-row:first-of-type .opt-chip.on');
        verfahren.forEach(chip => {
          const t = chip.textContent;
          if (t.includes('Stator')) qmPrice += wizardAddonUnitPrice(chip);
          if (t.includes('Algen')) qmPrice += wizardAddonUnitPrice(chip);
          if (t.includes('Imprägn')) qmPrice += wizardAddonUnitPrice(chip);
          if (t.includes('Graffiti')) qmPrice += wizardAddonUnitPrice(chip);
        });
        const subtotal = qmPrice * flaeche;
        const minAuftrag = getPrice('fassade-min');
        const usedMin = subtotal < minAuftrag;
        return {
          total: Math.max(subtotal, minAuftrag) + selectedFixedAddons('.svc-options[data-svc-opts="fassade"]'),
          dur: '~' + Math.round(flaeche * 0.4) + ' min',
          rateStr: `${qmPrice.toFixed(2)} ${currency}/m² × ${flaeche} m²`,
          fee: 0,
          showFee: false,
          minApplied: usedMin,
          minStr: usedMin ? `${minAuftrag.toFixed(2)} ${currency}` : null
        };
      }

      const hours = mins / 60;
      const billedHours = Math.max(hours, minHours);
      const minApplied = hours < minHours;
      const subtotal = billedHours * rate + fee;

      return {
        total: subtotal,
        mins: mins,
        dur: `${Math.floor(mins/60)}h ${mins%60}min`,
        rateStr: `${rate.toFixed(2)} ${currency}/h × ${billedHours.toFixed(1)} h`,
        fee: fee,
        showFee: fee > 0,
        minApplied: minApplied,
        minStr: minApplied ? `${minHours} h Pauschale` : null,
        breakdown: breakdown
      };
    }

    function updatePriceSummary() {
      // Generische Branchen: Summe aus dem jeweiligen Firmenland, Reinigungs-Detailzeilen aus.
      if (isGenericVertical() || genericServiceDef(wizService)?.isCustom) {
        const price = wizCalcPrice();
        const def = genericServiceDef(wizService);
        const sumDur = document.getElementById('sumDur');
        const sumRate = document.getElementById('sumRate');
        const sumFeeRow = document.getElementById('sumFeeRow');
        const sumMinRow = document.getElementById('sumMinRow');
        const sumTotal = document.getElementById('sumTotal');
        if (sumDur) sumDur.textContent = (def && def.unit === 'h') ? `${parseFloat(document.getElementById('wizDuration')?.value) || 0} h` : '—';
        if (sumRate) sumRate.textContent = document.getElementById('wizPriceHint')?.textContent || '';
        if (sumFeeRow) sumFeeRow.style.display = 'none';
        if (sumMinRow) sumMinRow.style.display = 'none';
        const currency = coLocale(loadCompany()).cur;
        if (sumTotal) sumTotal.textContent = priceOverrideActive
          ? `${(parseFloat(document.getElementById('priceOverride').value) || 0).toFixed(2)} ${currency} (manuell)`
          : `${currency} ${price.toFixed(2)}`;
        return;
      }
      const p = calcPriceForService();
      if (!p) return;
      const currency = coLocale(loadCompany()).cur;
      const fmt = v => `${v.toFixed(2)} ${currency}`;
      const addonRow = document.getElementById('sumAddonRow');
      const addonText = Array.from(document.querySelectorAll(`.svc-options[data-svc-opts="${wizService}"] [data-addon-price].on`))
        .map(chip => `${wizardAddonLabel(chip)} ${addonPriceText(chip.dataset.addonPrice, chip.dataset.addonKind || 'flat')}`);
      if (addonRow) addonRow.style.display = addonText.length ? 'flex' : 'none';
      const addonValue = document.getElementById('sumAddons');
      if (addonValue) addonValue.textContent = addonText.join(' · ');
      document.getElementById('sumDur').textContent = p.dur;
      document.getElementById('sumRate').textContent = p.rateStr;
      document.getElementById('sumFeeRow').style.display = p.showFee ? 'flex' : 'none';
      document.getElementById('sumFee').textContent = p.fee ? fmt(p.fee) : '—';
      const minRow = document.getElementById('sumMinRow');
      if (p.minApplied) {
        minRow.style.display = 'flex';
        document.getElementById('sumMin').textContent = p.minStr;
      } else {
        minRow.style.display = 'none';
      }
      document.getElementById('sumTotal').textContent = priceOverrideActive
        ? fmt(parseFloat(document.getElementById('priceOverride').value) || 0) + ' (manuell)'
        : fmt(p.total);
    }

    function togglePriceOverride() {
      priceOverrideActive = !priceOverrideActive;
      const field = document.getElementById('priceOverrideField');
      field.style.display = priceOverrideActive ? 'flex' : 'none';
      if (priceOverrideActive) {
        const p = calcPriceForService();
        document.getElementById('priceOverride').value = p ? p.total.toFixed(2) : '';
      }
      updatePriceSummary();
    }

    function resetPriceOverride() {
      priceOverrideActive = false;
      document.getElementById('priceOverrideField').style.display = 'none';
      document.getElementById('priceOverride').value = '';
      updatePriceSummary();
      toast('Auto-Preis wiederhergestellt');
    }

    function updateOverrideDisplay() {
      updatePriceSummary();
    }

    // wire up: recalc price whenever step 3 is shown or options change
    document.addEventListener('input', (e) => {
      if (e.target.closest('.svc-options') || e.target.id === 'priceOverride') {
        if (wizCurrent === 3 || wizCurrent === 2) updatePriceSummary();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('opt-chip') || e.target.classList.contains('add-task')) {
        setTimeout(() => { renderWizardAddonEditor(); updatePriceSummary(); }, 10);
      }
    });

    // Override wizStep to recalc when entering step 3
    const _originalWizStep = wizStep;
    wizStep = function(dir) {
      _originalWizStep(dir);
      if (wizCurrent === 3) {
        priceOverrideActive = false;
        document.getElementById('priceOverrideField').style.display = 'none';
        document.getElementById('priceOverride').value = '';
        renderWizardAddonEditor();
        updatePriceSummary();
      }
    };

    function prepareWizardFinalLayout() {
      const page = document.querySelector('.wizard-page[data-page="3"]');
      if (!page || page.querySelector('.wizard-main-column')) return;
      const main = document.createElement('div');
      const side = document.createElement('aside');
      main.className = 'wizard-main-column';
      side.className = 'wizard-side-column';
      Array.from(page.children).forEach(child => {
        if (['priceSummary', 'wizAddonEditor', 'priceOverrideField'].includes(child.id)) side.appendChild(child);
        else main.appendChild(child);
      });
      const advanced = Array.from(main.querySelectorAll('.wizard-advanced-item'));
      if (advanced.length) {
        const details = document.createElement('details');
        details.className = 'wizard-advanced';
        details.innerHTML = '<summary><span><strong>Weitere Optionen</strong><small>Personalbedarf, Übergabe, Zahlart und Wiederholung</small></span><span class="wizard-advanced-chevron" aria-hidden="true">⌄</span></summary><div class="wizard-advanced-body"></div>';
        const body = details.querySelector('.wizard-advanced-body');
        advanced.forEach(item => body.appendChild(item));
        const teamHeading = main.querySelector('[data-wizard-section="team"]');
        main.insertBefore(details, teamHeading || null);
      }
      page.append(main, side);
    }

      prepareWizardFinalLayout();
      loadPrices();
      renderWizardAddonPrices();
