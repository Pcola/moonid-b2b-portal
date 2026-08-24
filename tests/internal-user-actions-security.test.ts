import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const actions = readFileSync(resolve(process.cwd(), "app/staff/pristupy/actions.ts"), "utf8");
const authAdmin = readFileSync(resolve(process.cwd(), "lib/internal-auth-admin.ts"), "utf8");
const lifecycleLock = readFileSync(resolve(process.cwd(), "lib/user-lifecycle-lock.ts"), "utf8");
const customerInvite = readFileSync(resolve(process.cwd(), "lib/invite.ts"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260824170000_internal_identity_lifecycle/migration.sql"), "utf8");

const actionNames = [
  "inviteInternalUser",
  "resendInternalUserAccess",
  "setInternalUserRole",
  "setInternalUserActive",
  "resetInternalUserMfa",
];

describe("statické security gate pre správu interných účtov", () => {
  it("každá verejná server action vyžaduje ADMIN + MFA gate", () => {
    const source = ts.createSourceFile("actions.ts", actions, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const exported = source.statements.filter(ts.isFunctionDeclaration).filter((node) =>
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
    );
    expect(exported.map((node) => node.name?.text)).toEqual(actionNames);
    for (const action of exported) {
      expect(action.body?.getText(source), action.name?.text).toContain("await requireAdmin()");
    }
  });

  it("kritické DB zmeny používajú required audit a race-safe advisory lock", () => {
    expect(lifecycleLock).toContain("pg_advisory_xact_lock");
    expect(actions).toContain("writeAuditRequired");
    expect(actions).toContain("internalTransitionError");
    expect(actions).toContain("requireFreshAdmin");
    expect(actions).toMatch(/role: "ADMIN", active: true, companyId: null/);
    expect(migration).toContain("user_last_active_admin");
    expect(migration).toContain("user_last_active_customer_admin");
    expect(migration).toContain("user_identity_lifecycle_lock");
    expect(migration).toContain("user_no_truncate");
    expect(migration).toContain("transaction_isolation");
  });

  it("Auth helper je server-only a neponúka heslo, listUsers ani hard delete", () => {
    expect(authAdmin).toMatch(/^import "server-only";/);
    expect(authAdmin).not.toMatch(/\.listUsers\s*\(/);
    expect(authAdmin).not.toMatch(/password\s*:/);
    expect(authAdmin).not.toMatch(/\.deleteUser\s*\(/);
  });

  it("customer provisioning nemení internú identitu a nepoužíva stránkovaný Auth lookup", () => {
    expect(customerInvite).toContain("isInternalRole(user.role)");
    expect(customerInvite).toContain("withUserLifecycleLock");
    expect(customerInvite).not.toMatch(/\.listUsers\s*\(/);
    expect(migration).toContain("user_identity_class_immutable");
    expect(migration).toContain("user_auth_id_immutable");
    expect(migration).toContain("User_email_lower_key");
  });

  it("prístupový bearer token sa vkladá iba do URL fragmentu", () => {
    expect(authAdmin).toContain("/potvrdit-pristup#token_hash=");
    expect(authAdmin).not.toContain("/potvrdit-pristup?token_hash=");
  });
});
