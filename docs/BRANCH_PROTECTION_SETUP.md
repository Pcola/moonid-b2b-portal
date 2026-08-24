# Branch Protection Setup — GitHub Enterprise

> GitHub branch protection (na private repu) vyžaduje **GitHub Pro** alebo aby sa repo sprístupnilo. Tento dokument popisuje konfiguráciu, ktorá sa má aplikovať po upgrade.

## Prečo branch protection?

Enterprise release best practice:
- Ochrana proti `git push -f` a nechtaným zmazaniam
- Vynúť code review pred merge
- CI/CD gate — blokuj merge ak build/testy zlyhajú
- Audit trail (kto, kedy schválil PR)

## Konfigurácia pre `main` branch

Po upgrade na GitHub Pro alebo public repo, aplikuj tieto pravidlá:

### 1. Cez GitHub CLI (ak budete mať novšiu verziu s `gh repo rule`):
```bash
# Branch protection pravidlo pre main
gh api repos/Pcola/moonid-b2b-portal/branches/main/protection \
  -X PUT \
  -f required_status_checks:'{
    "strict": true,
    "contexts": ["ci/npm-typecheck", "ci/npm-lint", "ci/npm-build", "ci/npm-test", "ci/npm-audit"]
  }' \
  -f enforce_admins:true \
  -f required_pull_request_reviews:'{
    "required_approving_review_count": 1,
    "require_code_owner_reviews": false,
    "dismiss_stale_reviews": true
  }' \
  -f restrictions:null
```

### 2. Cez GitHub webové UI (dôrazne odporúčané):

Prejdi na **Settings → Branches → Add rule** (alebo **Branch protection rules** na starších repo):

1. **Branch name pattern:** `main`
2. **Protect matching branches** ✓
3. **Require status checks to pass before merging:**
   - ✓ `Require branches to be up to date before merging`
   - ✓ Status checks:
     - `ci/npm-typecheck`
     - `ci/npm-lint`
     - `ci/npm-build`
     - `ci/npm-test`
     - `ci/npm-audit`
4. **Require code reviews:** ✓
   - Required approving reviews: `1`
   - ✓ `Dismiss stale pull request approvals when new commits are pushed`
5. **Include administrators:** ✓ (rovnaké pravidlá platia aj pre admins)
6. **Restrict who can push to matching branches:** (voliteľné — seti iba tím, nikto)

### 3. Priame nastavenie v `.github/ruleset.yml` (GitHub Enterprise Cloud):

```yaml
name: main-branch-protection
description: Enforce branch protection on main
target: branch
rules:
  - type: creation
    prevention: block
    message: "Cannot create protected branch"

  - type: deletion
    prevention: block
    message: "Cannot delete protected branch"

  - type: force_push
    prevention: block

  - type: non_linear_history
    prevention: block

  - type: required_status_checks
    parameters:
      required_status_checks:
        - context: "ci/npm-typecheck"
        - context: "ci/npm-lint"
        - context: "ci/npm-build"
        - context: "ci/npm-test"
        - context: "ci/npm-audit"
      strict_required_status_checks_policy: true

  - type: required_reviews
    parameters:
      require_code_owner_review: false
      required_approving_review_count: 1
      dismiss_stale_reviews_on_push: true
      require_last_push_approval: false
```

## CI/CD Status Checks — nastavenie v `.github/workflows/ci.yml`

Pracovný postup musí mať správne `status_check_context` nazvy — tvoj `ci.yml` nastaví:

```yaml
name: ci

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    name: ci/npm-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run typecheck
        
  lint:
    runs-on: ubuntu-latest
    name: ci/npm-lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    name: ci/npm-build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run build

  test:
    runs-on: ubuntu-latest
    name: ci/npm-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run test

  audit:
    runs-on: ubuntu-latest
    name: ci/npm-audit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=high
```

## Admini, Dependabot, GitHub Actions

Po aplikácii branch protection si postav výnimky:
1. **GitHub Actions bot:** povoľ mu merge bez review (pre automatizované changelog/version bump commits)
2. **Dependabot:** pokiaľ máš automatické merge PR-ov, daj mu skupinu review.

## Roadmap

- [ ] Upgrade na GitHub Pro alebo sprístupniť repo
- [ ] Aplikuj branch protection rules
- [ ] Testuj s novou PR (malo by čakať na CI + review)
- [ ] Aplikuj na produkčné environment (staging → main)

## Dodatočne

Po branch protection je vhodné nastaviť aj:
- **CODEOWNERS** (`.github/CODEOWNERS`) — kto musia schváliť zmeny v citlivých súboroch
- **GitHub Secret Scanning + Dependabot alerts** (repo nastavenia)
- **Merge queue** (pre vysokú traffic; GitHub Enterprise Cloud)
