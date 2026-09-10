import { userClient } from './supabase.ts';

export async function hasMailPermission(req: Request, permission: 'mail.read' | 'mail.review' | 'mail.send' | 'mail.admin') {
  const { data, error } = await userClient(req).rpc('current_user_has_mail_permission', {
    p_permission: permission,
  });
  if (error) throw new Error('MAIL_PERMISSION_CHECK_FAILED');
  return data === true;
}
