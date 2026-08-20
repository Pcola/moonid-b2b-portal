# Produkčná databázová rola — bezpečný prechod

Tento runbook oddeľuje vlastníka/migrátora databázy od webového runtime. Aktuálny produkčný
`DATABASE_URL` používa rolu `postgres` s `BYPASSRLS`, `CREATEROLE` a `CREATEDB`; kým sa credential
nevymení a kontrola nižšie neprejde, ide o release blocker.

Autoritatívny základ:

- PostgreSQL uvádza, že `SUPERUSER` a `BYPASSRLS` vždy obchádzajú RLS a vlastník tabuľky ho
  štandardne obchádza tiež: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Supabase odporúča pre externé služby samostatných používateľov namiesto hesla roly `postgres`:
  https://supabase.com/docs/guides/database/postgres/roles
- Pre serverless traffic Supabase odporúča transaction pooler; pri Prisma treba vypnúť prepared
  statements podľa jeho connection-string pokynov:
  https://supabase.com/docs/guides/database/connecting-to-postgres

## Predpoklady

1. Overený point-in-time recovery/backup a vyskúšaný restore.
2. Samostatné staging prostredie s aktuálnymi migráciami.
3. Vlastník/migrátor zostáva iba v zabezpečenom CI secret store; nesmie byť vo Vercel runtime env.
4. Vygenerované minimálne 32-bajtové náhodné heslo v password manageri.

## Oddelený migračný workflow

Vercel build nesmie spúšťať `prisma migrate deploy` a Vercel runtime nesmie obsahovať
`DIRECT_URL` ani owner heslo. Migrácie sa spúšťajú manuálne cez
`.github/workflows/database-migrate.yml` v GitHub environment `staging` alebo `production`.

Po dokončení bootstrapu musí mať každý GitHub environment dva odlišné secrets:

- `MIGRATOR_DATABASE_URL` — priame pripojenie owner/migrator roly, dostupné iba migračnému jobu;
- `RUNTIME_DATABASE_URL` — pooler URL pre `moonid_app_staging` alebo `moonid_app_prod`.

Workflow vyžaduje ručné napísanie názvu prostredia a serializuje migrácie. Operácia `bootstrap`
je povolená iba pre prázdny staging: s `MIGRATOR_DATABASE_URL` aplikuje Prisma migrácie aj
`database/runtime-role.sql`. Po vytvorení runtime LOGIN sa používa výhradne operácia `migrate`,
ktorá navyše vyžaduje odlišný `RUNTIME_DATABASE_URL` a overí `npm run security:db-role`.
GitHub environment `production` musí mať povinné schválenie oprávnenou osobou pred
sprístupnením secrets.

## Staging postup

1. V GitHub environment `staging` nastav iba owner URL ako `MIGRATOR_DATABASE_URL`.
2. Spusť migračný workflow s `environment=staging`, `operation=bootstrap` a
   `confirmation=staging`; workflow aplikuje migrácie aj `database/runtime-role.sql`.
3. V Supabase SQL editore vytvor samostatný LOGIN bez elevated atribútov a priraď skupinu:

   ```sql
   CREATE ROLE moonid_app_staging
     LOGIN PASSWORD '<HODNOTA_Z_PASSWORD_MANAGERA>'
     NOCREATEDB NOCREATEROLE INHERIT
     IN ROLE moonid_runtime;
   ```

   Supabase managed `postgres` nie je skutočný superuser, preto PostgreSQL odmieta explicitné
   zmeny atribútov `SUPERUSER`, `REPLICATION` a `BYPASSRLS`. Nová rola ich má predvolene vypnuté;
   `npm run security:db-role` tento stav následne kontroluje fail-closed.

4. Zostav staging `DATABASE_URL` pre túto rolu. Heslo percent-encode. `DIRECT_URL`/owner URL
   ulož iba ako `MIGRATOR_DATABASE_URL` v GitHub environment a nikdy ho nedávaj Vercel runtime.
5. S novým `DATABASE_URL` spusť `npm run security:db-role`; výsledok musí mať `ok: true`.
6. Spusť smoke test prihlásenia, katalógu, košíka, vytvorenia objednávky, staff zmeny stavu,
   dopytu a retenčnej úlohy. Potom spusti integračné testy proti samostatnej test DB, nie stagingu.

## Produkčný cutover

1. Ohlás krátke change window; pozastav deploye a odosielanie objednávok.
2. Urob/over restore point a spusť `prisma migrate deploy` cez migrator credential.
3. Migrácia vytvorí audit triggery a Pohoda RPC/granty reprodukovateľne. Následne spusť
   `database/runtime-role.sql` ako vlastník a over granty, triggery a funkcie.
4. Vytvor `moonid_app_prod` rovnakým spôsobom ako staging login a zmeň iba Vercel runtime
   `DATABASE_URL`. Redeployni.
5. Spusť `npm run security:db-role` v produkčnom runtime kontexte a read-only smoke testy.
6. Sleduj 5xx, DB permission errors, latency, objednávky, audit insert a Pohoda queue minimálne
   30 minút. Až potom ukonči change window.
7. Rotuj pôvodné heslo `postgres`, odstráň ho zo všetkých runtime/preview env a over access logy.

Rollback znamená vrátiť predchádzajúci deployment/credential iba počas incidentu; elevated
credential nesmie zostať ako trvalý runtime stav. Každý rollback audituj a stanov okamžitý nový
termín cutoveru.

## Zostávajúca hranica

Policy `moonid_runtime_access` je zámerne viazaná iba na runtime rolu, ale povoľuje jej všetky
riadky, ktoré dovoľujú objektové granty. Tým sa odstráni owner/BYPASSRLS/DDL riziko a Supabase
`anon`/`authenticated` ostávajú default-deny. Nie je to však databázová tenantová izolácia.

High-assurance fáza 2 musí zaviesť transakčný, serverom nastavený `company_id` context a politiky
pre každú tenant tabuľku, vrátane negatívnych testov s poolerom. Kým táto fáza nie je hotová,
tenant izolácia naďalej stojí na povinných `companyId` filtroch a IDOR testoch aplikačnej vrstvy.
