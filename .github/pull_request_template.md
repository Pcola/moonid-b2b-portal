## 📋 Čo sa mení?

<!-- Popis zmien: čo, prečo, ako. Dodržuj jeden z týchto šablón: -->

### Typ zmeny

- [ ] 🐛 Bug fix (bez breaking zmien)
- [ ] ✨ Feature (nová funkcionalita)
- [ ] 📚 Documentation
- [ ] ♻️ Refactoring (bez zmeny funckionality)
- [ ] 🔒 Security / Compliance
- [ ] 🚀 Performance
- [ ] 📦 Dependencies / build

## 🎯 Súvisí s

<!-- Issue, PR, napr. -->
- Closes #<issue_number>
- Related to <PR_number>

## ✅ Testing & QA

- [ ] Zmeny sú pokryté unit testami (`npm run test`)
- [ ] Build prechádza bez warning (`npm run build`)
- [ ] Lint prechádza (`npm run lint`)
- [ ] TypeScript OK (`npm run typecheck`)
- [ ] Stavy/edge-casey sú testované
- [ ] Regresie nevznikli (ak možno, link na Playwright report)

## 🔒 Security & Impact

- [ ] Žiadne hardcoded secrets / API keys
- [ ] Vstupy sú validované (Zod)
- [ ] SQL je parametrizované (Prisma)
- [ ] Autorizácia: auth users majú správny scope
- [ ] Tenant izolácia: ak je multi-tenant, skontroluj `companyId` v queryách

## 📝 Dokumentácia

- [ ] README / doc updated (ak treba)
- [ ] API / server action komentáre doplnené (ak zložité)
- [ ] Database migration verifikovaná (ak je)

## 🔄 Deployment Notes

<!-- Niečo, čo treba vedieť pri deployi? Environment vars? Run steps? -->

- Deployi bez problémov: Yes / No / Requires manual step
- `npm run db:migrate` potrebný: Yes / No
- Environment variables: (vymenuj ich)

## 📸 Screenshot / Video (ak je UX zmena)

<!-- Drag & drop obrázok alebo video URL -->

---

### Checklist pre reviewer

- [ ] Kód je čitateľný a konzistentný
- [ ] Zmeny sú minimálne a zamerané
- [ ] Deps audit passed (`npm audit`)
- [ ] Žiadne console.log / debug statements
- [ ] Žiadne TypeScript `// @ts-ignore`
- [ ] Test coverage je primeraná
