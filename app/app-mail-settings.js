// MosaOS — Einstellungen fuer den serverseitigen Mail-Assistenten.
// Provider-Tokens und Mailinhalte werden hier niemals lokal gespeichert.

    const MAIL_KNOWLEDGE_CATEGORIES = {
      company:'Firma', service:'Leistung', area:'Einsatzgebiet', availability:'Verfügbarkeit',
      price_rule:'Preisregel', payment:'Zahlung', policy:'Richtlinie', signature:'Signatur', other:'Sonstiges'
    };
    let mailKnowledgeRows = [];
    let mailSettingsMayAdmin = false;

    async function mailSettingsContext() {
      const sb = getSupabase();
      const session = sb ? (await sb.auth.getSession()).data.session : null;
      if (!sb || !session || !window._tenantId) throw new Error('Bitte zuerst anmelden.');
      const { data: mayAdmin, error } = await sb.rpc('current_user_has_mail_permission', { p_permission:'mail.admin' });
      if (error) throw new Error('Berechtigung konnte nicht geprüft werden.');
      return { sb, session, tenantId:window._tenantId, mayAdmin:mayAdmin === true };
    }

    function mailSettingsStatus(text, error = false) {
      const el = document.getElementById('mailAgentSettingsStatus');
      if (!el) return;
      el.textContent = text;
      el.style.color = error ? 'var(--danger)' : 'var(--text-subtle)';
    }

    function renderMailKnowledge() {
      const wrap = document.getElementById('mailKnowledgeList');
      if (!wrap) return;
      if (!mailKnowledgeRows.length) {
        wrap.innerHTML = '<div class="mail-knowledge-empty">Noch kein freigegebenes Firmenwissen. Ohne verlässliche Angaben stellt der Assistent Rückfragen statt etwas zu erfinden.</div>';
        return;
      }
      wrap.innerHTML = mailKnowledgeRows.map(row => `
        <div class="mail-knowledge-row">
          <div><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(MAIL_KNOWLEDGE_CATEGORIES[row.category] || row.category)} · ${row.approved ? 'freigegeben' : 'noch nicht freigegeben'} · Quelle: ${escapeHtml(row.source)}</small><p>${escapeHtml(row.content)}</p></div>
          ${mailSettingsMayAdmin ? `<button class="btn btn-ghost" onclick="deleteMailKnowledge('${safeAttr(row.id)}')">Löschen</button>` : ''}
        </div>`).join('');
    }

    async function renderMailAgentSettings() {
      const card = document.getElementById('settings-mail-agent');
      if (!card) return;
      mailSettingsStatus('Lade sichere Einstellungen …');
      try {
        const ctx = await mailSettingsContext();
        mailSettingsMayAdmin = ctx.mayAdmin;
        const [{ data: settings, error: settingsError }, { data: knowledge, error: knowledgeError }] = await Promise.all([
          ctx.sb.from('mail_agent_settings').select('enabled,mode,tone,signature,retention_days,monthly_token_limit').eq('tenant_id', ctx.tenantId).maybeSingle(),
          ctx.sb.from('mail_agent_knowledge').select('id,category,title,content,source,approved,updated_at').eq('tenant_id', ctx.tenantId).order('updated_at', { ascending:false }),
        ]);
        if (settingsError || knowledgeError) throw settingsError || knowledgeError;
        document.getElementById('mailAgentEnabled').checked = settings?.enabled === true;
        document.getElementById('mailAgentTone').value = settings?.tone || 'freundlich, professionell und klar';
        document.getElementById('mailAgentSignature').value = settings?.signature || '';
        document.getElementById('mailAgentRetention').value = String(settings?.retention_days || 30);
        mailKnowledgeRows = knowledge || [];
        card.querySelectorAll('input,textarea,select,button[data-mail-admin]').forEach(el => { el.disabled = !mailSettingsMayAdmin; });
        document.getElementById('mailKnowledgeForm').style.display = mailSettingsMayAdmin ? '' : 'none';
        renderMailKnowledge();
        mailSettingsStatus(mailSettingsMayAdmin
          ? (settings?.enabled ? 'Aktiv: Neue Mails werden im 30-Minuten-Lauf geprüft; versendet wird nie automatisch.' : 'Noch ausgeschaltet. Erst nach Einrichtung und bewusster Aktivierung beginnt der Abruf.')
          : 'Nur Mail-Administratoren dürfen Regeln und Wissen verändern.');
      } catch (e) {
        mailSettingsMayAdmin = false;
        mailKnowledgeRows = [];
        renderMailKnowledge();
        mailSettingsStatus('Mail-Assistent-Einstellungen sind noch nicht verfügbar: ' + e.message, true);
      }
    }

    async function saveMailAgentSettings() {
      try {
        const ctx = await mailSettingsContext();
        if (!ctx.mayAdmin) throw new Error('Keine Berechtigung.');
        const enabled = document.getElementById('mailAgentEnabled').checked;
        if (enabled) {
          const status = await mailFunction('mail-account-status');
          if (!(status.accounts || []).some(account => account.status === 'active')) {
            throw new Error('Vor dem Aktivieren zuerst ein aktives Gmail-Postfach verbinden.');
          }
        }
        const tone = document.getElementById('mailAgentTone').value.trim();
        const signature = document.getElementById('mailAgentSignature').value.trim();
        const retentionDays = Number(document.getElementById('mailAgentRetention').value);
        if (!tone || tone.length > 500 || signature.length > 3000 || !Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) {
          throw new Error('Bitte Ton, Signatur und Aufbewahrungsdauer prüfen.');
        }
        const { error } = await ctx.sb.from('mail_agent_settings').upsert({
          tenant_id:ctx.tenantId, enabled, mode:'draft_only', language:'de-CH', tone, signature,
          retention_days:retentionDays, updated_by:ctx.session.user.id,
        }, { onConflict:'tenant_id' });
        if (error) throw error;
        toast('✓ Mail-Assistent-Einstellungen gespeichert');
        await renderMailAgentSettings();
      } catch (e) { toast(e.message || 'Einstellungen konnten nicht gespeichert werden.', 'error'); }
    }

    async function addMailKnowledge() {
      try {
        const ctx = await mailSettingsContext();
        if (!ctx.mayAdmin) throw new Error('Keine Berechtigung.');
        const category = document.getElementById('mailKnowledgeCategory').value;
        const title = document.getElementById('mailKnowledgeTitle').value.trim();
        const content = document.getElementById('mailKnowledgeContent').value.trim();
        const source = document.getElementById('mailKnowledgeSource').value.trim();
        const approved = document.getElementById('mailKnowledgeApproved').checked;
        if (!title || title.length > 200 || !content || content.length > 10000 || !source || source.length > 500) {
          throw new Error('Titel, Inhalt und nachvollziehbare Quelle sind erforderlich.');
        }
        const { error } = await ctx.sb.from('mail_agent_knowledge').insert({
          tenant_id:ctx.tenantId, category, title, content, source, approved,
          created_by:ctx.session.user.id, updated_by:ctx.session.user.id,
        });
        if (error) throw error;
        document.getElementById('mailKnowledgeTitle').value = '';
        document.getElementById('mailKnowledgeContent').value = '';
        document.getElementById('mailKnowledgeSource').value = '';
        document.getElementById('mailKnowledgeApproved').checked = false;
        toast(approved ? '✓ Wissen freigegeben' : '✓ Wissen als Entwurf gespeichert');
        await renderMailAgentSettings();
      } catch (e) { toast(e.message || 'Wissen konnte nicht gespeichert werden.', 'error'); }
    }

    async function deleteMailKnowledge(id) {
      if (!confirm('Diesen Wissenseintrag löschen? Künftige Entwürfe dürfen ihn danach nicht mehr verwenden.')) return;
      try {
        const ctx = await mailSettingsContext();
        if (!ctx.mayAdmin) throw new Error('Keine Berechtigung.');
        const { error } = await ctx.sb.from('mail_agent_knowledge').delete().eq('id', id).eq('tenant_id', ctx.tenantId);
        if (error) throw error;
        toast('Wissenseintrag gelöscht');
        await renderMailAgentSettings();
      } catch (e) { toast(e.message || 'Eintrag konnte nicht gelöscht werden.', 'error'); }
    }

    document.querySelector('.nav-item[data-view="einstellungen"]')?.addEventListener('click', () => {
      setTimeout(renderMailAgentSettings, 80);
    });
