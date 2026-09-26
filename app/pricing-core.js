/* Shared, DOM-free calculation. Amounts are net; quantities in h are person-hours. */
(function (root) {
  'use strict';
  const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  function number(value) {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n < 0) throw new Error('Menge und Preis müssen gültige, nicht negative Zahlen sein.');
    return n;
  }
  function calculate(input) {
    const unit = input.unit || 'flat';
    const quantity = number(input.quantity), rate = number(input.rate);
    const qty = unit === 'h' ? Math.max(quantity, number(input.minQty)) : quantity;
    const lines = [{ label: input.label || 'Leistung', unit, quantity: qty, rate, amount: money(qty * rate) }];
    let base = lines[0].amount;
    for (const extra of input.addons || []) {
      const value = number(extra.price);
      const amount = money(extra.kind === 'percent' ? base * value / 100 : extra.kind === 'qm' ? quantity * value : value);
      lines.push({ label: extra.label || extra.key || 'Zusatz', unit: extra.kind === 'percent' ? '%' : extra.kind === 'qm' ? 'qm' : 'flat',
        quantity: extra.kind === 'percent' ? value : extra.kind === 'qm' ? quantity : 1,
        rate: extra.kind === 'percent' ? base / 100 : value, amount });
    }
    const minimum = number(input.minTotal);
    if (base < minimum) lines.push({label:'Mindestauftrag – Ausgleich',unit:'flat',quantity:1,rate:money(minimum-base),amount:money(minimum-base)});
    const fee = number(input.fee);
    if (fee) lines.push({label:'Anfahrt',unit:'flat',quantity:1,rate:fee,amount:fee});
    let total = money(lines.reduce((sum, line) => sum + line.amount, 0));
    const manual = input.override !== undefined && input.override !== null;
    if (manual) {
      const difference = money(number(input.override) - total);
      lines.push({label:'Vereinbarte Preisanpassung',unit:'flat',quantity:1,rate:difference,amount:difference});
      total = money(number(input.override));
    }
    return {version:1,unit,quantity,rate,lines,total,manual,minApplied:qty>quantity || base<minimum,fee};
  }
  root.MosaPricing = {calculate,money};
  if (typeof module !== 'undefined') module.exports = root.MosaPricing;
})(typeof window !== 'undefined' ? window : globalThis);
