import type { Role } from "@prisma/client";

export type InternalRole = Extract<Role, "STAFF" | "ADMIN">;

export const INTERNAL_ROLES: readonly InternalRole[] = ["STAFF", "ADMIN"];

export function isInternalRole(role: string): role is InternalRole {
  return role === "STAFF" || role === "ADMIN";
}

export function normalizeInternalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function internalTargetError(target: { role: string; companyId: string | null } | null): string | null {
  if (!target) return "Interné konto neexistuje.";
  if (!isInternalRole(target.role) || target.companyId !== null) {
    return "Konto nie je platným interným účtom a touto obrazovkou sa nedá meniť.";
  }
  return null;
}

type InternalTransition = {
  actorId: string;
  targetId: string;
  currentRole: Role;
  currentActive: boolean;
  nextRole: Role;
  nextActive: boolean;
  activeAdminCount: number;
};

/**
 * Centrálna politika pre zmeny interných účtov. Volajúci musí údaje načítať pod
 * databázovým zámkom, aby kontrola posledného admina nebola náchylná na race condition.
 */
export function internalTransitionError(t: InternalTransition): string | null {
  if (!isInternalRole(t.currentRole) || !isInternalRole(t.nextRole)) {
    return "Týmto formulárom možno spravovať iba interné kontá.";
  }

  if (t.actorId === t.targetId && t.currentActive && !t.nextActive) {
    return "Vlastné konto nemôžete deaktivovať.";
  }

  if (t.actorId === t.targetId && t.currentRole === "ADMIN" && t.nextRole !== "ADMIN") {
    return "Vlastnému kontu nemôžete odobrať rolu administrátora.";
  }

  const removesActiveAdmin =
    t.currentRole === "ADMIN"
    && t.currentActive
    && (t.nextRole !== "ADMIN" || !t.nextActive);

  if (removesActiveAdmin && t.activeAdminCount <= 1) {
    return "Musí zostať aspoň jeden aktívny administrátor.";
  }

  return null;
}
