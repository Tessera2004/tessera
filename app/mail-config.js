/* ============================================================
   MosaOS — E-Mail-Provider Konfiguration
   ============================================================
   Das ist die EINZIGE Datei, die du anpassen musst, um echte
   Postfächer zu verbinden. Alle Keys/URLs kommen hierher.

   GMAIL
   ─────
   1. https://console.cloud.google.com/
   2. APIs & Services → Credentials → + CREATE → OAuth 2.0 Client ID
   3. Typ: Webanwendung
   4. Authorized JavaScript origins: https://<deine-domain>.netlify.app
   5. clientId unten eintragen (Format: xxxx.apps.googleusercontent.com)
   6. Gmail API aktivieren (APIs & Services → Library → Gmail API → Enable)

   OUTLOOK / MICROSOFT 365
   ────────────────────────
   1. https://portal.azure.com/
   2. Azure Active Directory → App registrations → New registration
   3. Name: MosaOS Mail, Supported account types: Multitenant (oder Single)
   4. Redirect URI: Single-page application (SPA) → https://<deine-domain>.netlify.app
   5. API permissions: Microsoft Graph → Mail.Read, offline_access (Delegated)
   6. Application (Client) ID unten eintragen

   iCLOUD MAIL & GENERISCHES IMAP
   ────────────────────────────────
   Läuft über eine Supabase Edge Function als Proxy (Browser ↔ IMAP direkt nicht möglich).
   1. In Supabase: supabase functions deploy imap-fetch
   2. Resultierende URL unten eintragen
   iCloud-Passwort: appleid.apple.com → Anmelden & Sicherheit → App-Passwörter generieren
   ============================================================ */

window.MOSAOS_MAIL = {

  gmail: {
    clientId: '',
    // Scope: https://www.googleapis.com/auth/gmail.readonly
    // Redirect: window.location.origin (automatisch)
  },

  outlook: {
    clientId: '',
    tenantId: 'common',   // 'common' = alle MS-Accounts; oder konkrete Tenant-ID
    // Scope: https://graph.microsoft.com/Mail.Read offline_access
    // Redirect: window.location.origin (automatisch)
  },

  imap: {
    proxyUrl: '',
    // Format: https://<project-ref>.supabase.co/functions/v1/imap-fetch
    // iCloud:  host=imap.mail.me.com, port=993
    // Andere:  host=imap.example.com, port=993 (oder 143 ohne SSL)
  }

};
