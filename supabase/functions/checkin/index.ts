import { json, options, sha256, withCors } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

function parseToken(value: unknown) {
  const [id, secret] = String(value || '').split('.', 2);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !secret || secret.length < 30) throw new Error('INVALID_TOKEN');
  return { id, secret };
}

Deno.serve(withCors(async (req) => {
  const preflight = options(req); if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await req.json();
    const parsed = parseToken(body.token);
    const db = adminClient();
    const { data: grant, error: grantError } = await db.from('checkin_tokens').select('*').eq('id', parsed.id).single();
    if (grantError || !grant || grant.revoked_at || new Date(grant.expires_at) <= new Date()) return json({ error: 'TOKEN_EXPIRED' }, 401);
    if (grant.token_hash !== await sha256(parsed.secret)) return json({ error: 'INVALID_TOKEN' }, 401);

    if (body.action === 'start') {
      const employeeId = String(body.employeeId || '');
      if (!grant.employee_ids.includes(employeeId)) return json({ error: 'EMPLOYEE_NOT_ALLOWED' }, 403);
      const { data, error } = await db.from('timelog').insert({
        tenant_id: grant.tenant_id, checkin_token_id: grant.id, job_key: grant.job_key,
        job_label: grant.job_label, employee_id: employeeId,
        employee_name: String(body.employeeName || '').slice(0, 200), check_in: new Date().toISOString(),
      }).select('id,check_in').single();
      if (error) throw error;
      return json({ rowId: data.id, checkIn: data.check_in });
    }

    if (body.action === 'finish') {
      const rowId = String(body.rowId || '');
      const { data: row } = await db.from('timelog').select('id,tenant_id,check_in,check_out')
        .eq('id', rowId).eq('checkin_token_id', grant.id).eq('tenant_id', grant.tenant_id).maybeSingle();
      if (!row || row.check_out) return json({ error: 'INVALID_OR_CLOSED_TIMELOG' }, 409);
      const checkOut = new Date();
      const duration = Math.max(0, Math.round((checkOut.getTime() - new Date(row.check_in).getTime()) / 60000));
      let photoPath: string | null = null;
      if (body.photoBase64) {
        const photo = String(body.photoBase64);
        const match = photo.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) return json({ error: 'INVALID_PHOTO_FORMAT' }, 400);
        // Base64 ist rund 33 % grösser als das eigentliche Bild. Vor dem
        // Dekodieren begrenzen, damit keine übergrossen Nutzlasten verarbeitet werden.
        if (match[1].length > 7 * 1024 * 1024) return json({ error: 'PHOTO_TOO_LARGE' }, 413);
        const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
        if (bytes.byteLength > 5 * 1024 * 1024) return json({ error: 'PHOTO_TOO_LARGE' }, 413);
        const extension = match[0].startsWith('data:image/png') ? 'png' : 'jpg';
        photoPath = `${grant.tenant_id}/${row.id}.${extension}`;
        const { error: uploadError } = await db.storage.from('checkin-photos').upload(photoPath, bytes, {
          contentType: extension === 'png' ? 'image/png' : 'image/jpeg', upsert: false,
        });
        if (uploadError) throw uploadError;
      }
      const { error } = await db.from('timelog').update({
        check_out: checkOut.toISOString(), duration_m: duration, photo_url: photoPath, updated_at: checkOut.toISOString(),
      }).eq('id', row.id).is('check_out', null);
      if (error) throw error;
      return json({ checkOut: checkOut.toISOString(), durationM: duration, photoPath });
    }
    return json({ error: 'INVALID_ACTION' }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL';
    return json({ error: code }, ['INVALID_TOKEN', 'INVALID_ACTION', 'INVALID_PHOTO_FORMAT'].includes(code) ? 400 : 500);
  }
}));
