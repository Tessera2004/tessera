/* Newsletter-Anmeldung im Footer.
   Die Adresse wird gespeichert und bekommt eine Bestaetigungsmail; erst der
   Klick darin zaehlt als Einwilligung. Siehe supabase/functions/newsletter-*. */
(function () {
  const form = document.getElementById('newsForm');
  if (!form) return;
  const feld = document.getElementById('newsEmail');
  const notiz = document.getElementById('newsNote');

  const t = (key, fallback) => {
    const i18n = window.MOSAOS_I18N;
    const wert = i18n && i18n.t ? i18n.t(key) : null;
    return wert && wert !== key ? wert : fallback;
  };

  const melde = (text, status) => {
    notiz.textContent = text;
    if (status) notiz.setAttribute('data-status', status);
    else notiz.removeAttribute('data-status');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (feld.value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      melde(t('news.invalid', 'Bitte eine gültige E-Mail-Adresse eingeben.'), 'fehler');
      feld.focus();
      return;
    }

    const knopf = form.querySelector('button[type="submit"]');
    knopf.disabled = true;
    melde(t('news.sending', 'Einen Moment …'), null);

    try {
      const cfg = window.MOSAOS_CONFIG || {};
      const res = await fetch(cfg.functionsUrl + '/newsletter-subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: cfg.publicApiKey,
          authorization: 'Bearer ' + cfg.publicApiKey,
        },
        body: JSON.stringify({
          email,
          consent: true,
          website: form.website.value,
          source: location.pathname,
        }),
      });

      if (res.status === 429) {
        melde(t('news.rate', 'Zu viele Versuche. Bitte später nochmals.'), 'fehler');
      } else if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      } else {
        // Bewusst dieselbe Antwort, ob die Adresse neu ist oder schon
        // eingetragen war: Das Formular soll nicht verraten, wer auf der
        // Liste steht.
        form.reset();
        melde(t('news.done', 'Fast geschafft — bitte bestätigen Sie den Link in der E-Mail.'), 'ok');
      }
    } catch (err) {
      melde(t('news.error', 'Das hat nicht geklappt. Bitte später nochmals versuchen.'), 'fehler');
    } finally {
      knopf.disabled = false;
    }
  });
})();
