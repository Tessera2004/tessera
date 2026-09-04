-- ============================================================
-- Verdacht: ID-Kollision zwischen zwei Mandanten
--
-- office_users.id ist "text primary key" — also ueber ALLE
-- Mandanten hinweg eindeutig. Die App vergibt aber feste IDs
-- wie u1, u2, u3. Legt Mandant A ein u1 an und Mandant B will
-- ebenfalls u1 schreiben, versucht der Upsert eine fremde Zeile
-- zu aendern. Die Sicherheitsregel lehnt das ab — mit genau der
-- Meldung "new row violates row-level security policy".
-- ============================================================

-- 1. Welche Buero-Benutzer gibt es, und wem gehoeren sie?
select id, tenant_id, firstname, lastname, email, role
from public.office_users
order by id, tenant_id;

-- Steht hier z. B. u1 nur einmal, aber mit der tenant_id des
-- ANDEREN Mandanten, ist der Verdacht bestaetigt.


-- 2. Dieselbe ID in mehreren Mandanten? (sollte leer sein)
select id, count(*) as anzahl, array_agg(tenant_id) as mandanten
from public.office_users
group by id
having count(*) > 1;


-- 3. Welche IDs gehoeren NICHT zu deinem Mandanten?
--    Deine tenant_id aus der vorigen Abfrage einsetzen.
-- select id, tenant_id, email
-- from public.office_users
-- where tenant_id <> 'bec6911e-c5f8-43b7-aa70-bbd9cc4428b2';


-- 4. Dasselbe Muster bei den anderen Tabellen pruefen
select 'employees' as tabelle, id, tenant_id from public.employees
union all
select 'teams',     id, tenant_id from public.teams
union all
select 'customers', id, tenant_id from public.customers
order by tabelle, id;
