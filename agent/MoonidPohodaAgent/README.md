# Moonid Pohoda Agent

Tichý most medzi **portálom (Supabase)** a **Pohodou (mServer)** — beží **na notebooku s Pohodou** ako Windows služba.
**Fáza 1:** číta stav skladu z Pohody a posiela ho do portálu (read-only, nič v Pohode nemení).

Komunikuje len smerom VON: do Supabase ako rola `pohoda_agent` (cez RPC fasádu, bez prístupu k tabuľkám) a na lokálny mServer (`http://127.0.0.1:<port>`).

## Predpoklady
- Windows + Pohoda so **zapnutým mServerom**
- **.NET 8** — Runtime na beh, SDK na build: https://dotnet.microsoft.com/download/dotnet/8.0

## 1. Zapni mServer v Pohode
- *Pohoda → Nastavenie → Prístupová práva / mServer* (alebo *Databáza → mServer*): zapni, zapamätaj **port**, nastav **HTTP používateľa + heslo**.
- Over v prehliadači: `http://127.0.0.1:<port>/status` (malo by vrátiť XML stav).

## 2. Nastav heslo DB roly `pohoda_agent` (raz)
V Supabase SQL editore (alebo z dev stroja):
```sql
ALTER ROLE pohoda_agent PASSWORD 'silne-nahodne-heslo';
```
(Rolu a RPC vytvorí migrácia `20260820150000_security_objects`. Heslo poznáš len ty.)

## 3. Vytvor a vyplň `appsettings.local.json`
- `Supabase:ConnectionString` — Username `pohoda_agent` + heslo z kroku 2; host zo Supabase → **Connect → Session pooler**.
- `MServer:BaseUrl/Ico/User/Password` — z kroku 1.
- Začni rovnakou JSON štruktúrou ako v `appsettings.json`; lokálny súbor bezpečne prepíše zástupné hodnoty. Pri `dotnet run` ho ulož do priečinka projektu, pri Windows službe vedľa publikovaného `.exe`.
- **Reálne heslá necommituj**; `appsettings.local.json` chráni `.gitignore`.

## 4. Test (konzola)
```
dotnet run
```
Sleduj log. Ak `mServer: prečítaných 0 položiek`, **pošli mi surové XML** z logu (Debug) — doladím parsovanie na tvoje dáta.

## 5. Inštalácia ako Windows služba (keď beh sedí)
```
dotnet publish -c Release -o C:\MoonidAgent
sc.exe create MoonidPohodaAgent binPath= "C:\MoonidAgent\MoonidPohodaAgent.exe" start= auto
sc.exe failure MoonidPohodaAgent reset= 86400 actions= restart/5000/restart/5000/restart/5000
sc.exe start MoonidPohodaAgent
```
Služba sa spustí pri štarte Windows a sama sa reštartuje po páde. Funguje len keď je notebook zapnutý (po prebudení dobehne).
