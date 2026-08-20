# Staging demo data

Tieto skripty patria iba do samostatného Supabase projektu `moonid-b2b-staging`
(`booeaeyyyitlmuxixjfy`). Nie sú Prisma migráciou a nikdy sa nespúšťajú pri produkčnom deployi.

## Obsah seedu

- 4 cenové úrovne a 11 kategórií,
- 18 publikovaných produktov s prefixom `TEST-`,
- 68 manuálnych cien pre cenové úrovne A/B1/B2/B3,
- 1 testovacia firma, 2 miesta dodania a 2 faktúry,
- 2 žiadosti o prístup a 2 kontaktné dopyty,
- 2 modely dávkovačov, kompatibilné náplne a 2 osadenia.

`seed-demo-data.sql` je transakčný a idempotentný. Pred zápisom kontroluje existenciu roly
`moonid_app_staging`; databáza bez tejto staging poistky skript odmietne.

`cleanup-demo-data.sql` odstráni iba demo záznamy v `TEST-`/`stg_` namespace. Cenové úrovne
a kategórie ponechá, pretože sú základnými číselníkmi portálu.

Testovacie Supabase Auth účty sa týmto seedom nevytvárajú. Tie sa spravujú oddelene cez
`scripts/auth/seed-auth.ts`, aby žiadne heslo nebolo uložené v repozitári ani v SQL.
