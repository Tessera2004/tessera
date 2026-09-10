-- Verwaltungs-Token fuer den Demo-Betrieb.
--
-- Ohne Token laesst sich der Reiter "Termine" nicht oeffnen — auch nicht im
-- Verkaufsgespraech. Das ist genau die Ansicht, die den Betrieb interessiert:
-- Er will nicht sehen, wie ein Gast bucht, sondern was danach bei ihm ankommt.
--
-- Gespeichert wird nur der Hash. Das Token selbst steht in der Uebergabe an
-- Brian; geht es verloren, mit scripts/zeitfenster-kunde.py ein neues erzeugen.
update public.zf_betriebe
   set verwaltung_token_hash = 'd7c89247d63053bf47c60b9df63375b58e137e576a582849b5b2f3e617e5398b'
 where slug = 'demo';
