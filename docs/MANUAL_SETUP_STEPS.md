# Manuálne kroky (dashboardy) — návody krok za krokom

Toto sú veci, ktoré musíš spraviť ty v konzolách (nemám tam prístup). Zoradené podľa hodnoty.
Projektové hodnoty pre teba:
- **Vercel projekt:** `moonid-b2b-portal` (team `lukasslobodnik7-7499s-projects`)
- **Produkčná doména:** `https://moonid-b2b-portal.vercel.app`
- **Supabase projekt (ref):** `gckvseqlaxydsbutsjhm` · URL `https://gckvseqlaxydsbutsjhm.supabase.co`

---

## 1) Sentry — monitoring chýb *(najvyššia priorita, ~15 min)*
Bez tohto je monitoring slepý — `reportError()` (audit/email/rate-limit zlyhania) nikam nehlási.

**A. Vytvor Sentry projekt**
1. Choď na https://sentry.io → prihlás sa / vytvor účet (free tier stačí).
2. **Create Project** → platforma **Next.js** → názov napr. `moonid-portal` → **Create**.
3. Pri onboardingu (alebo Settings → Projects → moonid-portal → **Client Keys (DSN)**) skopíruj **DSN** —
   vyzerá ako `https://abc123@o456.ingest.de.sentry.io/789`. *(región DE = EÚ, pekne k Supabase Frankfurt.)*

**B. Pridaj DSN do Vercel**
4. Vercel → projekt `moonid-b2b-portal` → **Settings → Environment Variables**.
5. **Add New**:
   - Key: `NEXT_PUBLIC_SENTRY_DSN`
   - Value: *(vlož DSN z kroku 3)*
   - Environments: zaškrtni **Production** (pokojne aj Preview + Development).
   - **Save**.

**C. Nasaď a over**
6. Env premenné sa NEaplikujú na starý build → treba **redeploy**: Vercel → **Deployments** → pri
   najnovšom klikni „…" → **Redeploy** (alebo pushni hocijaký commit).
7. Po nasadení choď do Sentry → **Issues**. Keď nastane akákoľvek chyba, objaví sa tu. Test: v Sentry
   projekte je „Send a test event" / alebo počkaj na reálny traffic. Ak vidíš prostredie `production`, funguje.

---

## 2) Supabase — politika hesiel *(~5 min)*
**POZOR:** „Leaked password protection" (HaveIBeenPwned) je **len na Pro pláne** — na Free sa
NEDÁ zapnúť (pri pokuse: *„Failed to update auth configuration … available on Pro Plans and up"*).
Advisor to bude ďalej hlásiť ako WARN — **vedome to akceptujeme ako Pro-only reziduál**, nie je to
launch-bloker. Namiesto toho zapneme to, čo na Free funguje (a pokrýva väčšinu rizika):

1. Supabase → **Authentication** → **Attack Protection** → pri „Prevent use of leaked passwords"
   klikni **Configure in email provider** (otvorí Email provider).
2. **Prevent use of leaked passwords** nechaj **OFF** (Free ho neuloží a blokuje uloženie ostatného).
3. **Minimum password length** = **8** (funguje na Free, server-side hranica).
4. **Password requirements** = **„Lowercase, uppercase letters, digits and symbols (recommended)"**.
5. **Save**.

Výsledok: vynútené heslo min. 8 znakov + veľké/malé/číslica/symbol. Leaked-password check zapnúť
až po prípadnom prechode na Pro (napr. kvôli pauzovaniu DB / väčšiemu trafficu).

---

## 3) Supabase — Auth URL konfigurácia *(len over, ~3 min)*
Prihlásenie funguje → toto je skoro isto OK, len sa uisti pre invite/reset odkazy.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL** = `https://moonid-b2b-portal.vercel.app`
3. **Redirect URLs** musia obsahovať: `https://moonid-b2b-portal.vercel.app/auth/callback`
   *(keď raz pridáš vlastnú doménu moonid.sk, doplň sem aj jej `/auth/callback`.)*
4. **Save**.

---

## 4) Resend — overenie domény *(pre reálne e-maily, ~1 h + DNS propagácia)*
Bez overenej domény e-maily z `web@moonid.sk` neprídu / padnú do spamu. Na otcov test **netreba**
(pozvánkový odkaz vidíš priamo v portáli), ale pre reálny pilot áno (potvrdenia objednávok).

1. Resend → https://resend.com → **Domains** → **Add Domain** → `moonid.sk` → región EU.
2. Resend ti ukáže **DNS záznamy** (SPF `TXT`, DKIM `CNAME`/`TXT`, príp. DMARC `TXT`).
3. Choď k správcovi DNS domény moonid.sk (registrátor / DNS provider) a **pridaj tie záznamy presne**.
4. Späť v Resend klikni **Verify** (propagácia môže trvať minúty–hodiny).
5. Keď je doména „Verified", `RESEND_FROM="Moonid <web@moonid.sk>"` bude reálne odosielať.
   *(Over, že `RESEND_API_KEY` + `RESEND_FROM` sú vo Vercel env — appka beží, tak asi áno.)*

---

## 5) Uptime monitor *(voliteľné, ~15 min)*
Aby si sa o výpadku dozvedel hneď, nie od zákazníka.

1. https://uptimerobot.com → free účet.
2. **+ Add New Monitor**:
   - Type: **HTTP(s)**
   - Friendly name: `Moonid portál`
   - URL: `https://moonid-b2b-portal.vercel.app/api/health`
   - Monitoring interval: **5 min**
3. **Alert Contacts**: pridaj svoj e-mail (aby ti prišiel mail pri výpadku).
4. **Create Monitor**. `/api/health` vracia 200 + pingne DB, takže odhalí aj výpadok DB.

---

## Poradie, ktoré odporúčam
1. **Sentry DSN** (#1) — najväčšia hodnota, hneď.
2. **Leaked-password + min. dĺžka** (#2) — 5 min.
3. **Over Auth URLs** (#3) — 3 min.
4. **Uptime monitor** (#5) — keď máš chvíľu.
5. **Resend doména** (#4) — až keď ideš z testovacej firmy na reálny pilot s ostrými e-mailmi.
