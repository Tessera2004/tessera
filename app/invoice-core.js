/* Payment validation and immutable invoice data, independent of the UI. */
(function (root) {
  'use strict';
  const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  function iban(value) {
    const v = String(value || '').replace(/\s/g, '').toUpperCase();
    const lengths = {CH:21,LI:21,DE:22,AT:20};
    if (!lengths[v.slice(0,2)] || v.length !== lengths[v.slice(0,2)] || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) throw Error('Bitte eine gültige Firmen-IBAN eintragen.');
    let remainder = 0;
    for (const char of v.slice(4) + v.slice(0,4)) {
      for (const digit of (/\d/.test(char) ? char : String(char.charCodeAt(0)-55))) remainder = (remainder*10+Number(digit))%97;
    }
    if (remainder !== 1) throw Error('Die Prüfziffer der IBAN ist ungültig.');
    return v;
  }
  function field(value, max, label, required=true) {
    const text = String(value || '').trim();
    if ((required && !text) || text.length>max || /[\r\n\x00-\x1f]/.test(text)) throw Error(label + ' fehlt oder ist ungültig.');
    return text;
  }
  function address(value) {
    const country=String(value.country || 'CH').toUpperCase();
    if(!/^[A-Z]{2}$/.test(country))throw Error('Land muss ein zweistelliger Ländercode sein.');
    const street = String(value.addr1 || '').trim().match(/^(.+?)\s+(\d+\S*)$/);
    const city = String(value.addr2 || '').trim().match(/^(\d{4,10})\s+(.+)$/);
    return ['S', field(value.name,70,'Name'), field(value.street || street?.[1] || value.addr1,70,'Strasse'),
      field(value.houseNumber || street?.[2],16,'Hausnummer',false),
      field(value.postalCode || city?.[1],16,'Postleitzahl'), field(value.city || city?.[2],35,'Ort'),
      country];
  }
  function swissPayload(company, debtor, amount, message) {
    const account=iban(company.iban);
    if (!/^(CH|LI)/.test(account)) throw Error('Swiss QR benötigt eine CH-/LI-IBAN.');
    if (+account.slice(4,9)>=30000 && +account.slice(4,9)<=31999) throw Error('QR-IBAN benötigt eine QR-Referenz. Bitte eine normale IBAN verwenden.');
    const total=Number(amount);
    if (!Number.isFinite(total) || total<=0 || total>999999999.99) throw Error('Ungültiger Rechnungsbetrag.');
    return ['SPC','0200','1',account,...address(company),...Array(7).fill(''),total.toFixed(2),'CHF',
      ...(debtor?.name ? address(debtor) : Array(7).fill('')),'NON','',field(message,140,'Mitteilung',false),'EPD'].join('\r\n');
  }
  function lines(job) {
    const net=money(job.price);
    if (!Number.isFinite(net) || net<0) throw Error('Ungültiger Auftragspreis.');
    const saved=job.pricing?.lines;
    if (Array.isArray(saved) && saved.length && saved.every(x=>Number.isFinite(x.amount)) && money(saved.reduce((s,x)=>s+x.amount,0))===net) return JSON.parse(JSON.stringify(saved));
    // Old jobs have no trustworthy quantity. Do not invent an hourly rate.
    return [{label:job.objekt || 'Vereinbarte Leistung',unit:'flat',quantity:1,rate:net,amount:net}];
  }
  root.MosaInvoice={iban,address,swissPayload,lines,money};
  if (typeof module!=='undefined') module.exports=root.MosaInvoice;
})(typeof window!=='undefined'?window:globalThis);
