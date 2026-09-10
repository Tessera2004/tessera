-- Die Pruefung auf logo_url war unbrauchbar.
--
-- '^https://[^\s]{5,500}$' wirkt harmlos, aber Postgres begrenzt bezifferte
-- Wiederholungen in POSIX-Ausdruecken auf 255. Der Ausdruck war damit
-- ungueltig, und jedes Schreiben auf die Spalte scheiterte mit
-- "invalid repetition count(s)" — auch ein voellig korrektes Logo.
--
-- Laenge gehoert ohnehin nicht in den Ausdruck, sondern daneben.
alter table public.zf_betriebe drop constraint if exists zf_betriebe_logo_url_check;

alter table public.zf_betriebe
  add constraint zf_betriebe_logo_url_check
  check (
    logo_url is null
    or (logo_url ~ '^https://\S+$' and char_length(logo_url) between 12 and 500)
  );
