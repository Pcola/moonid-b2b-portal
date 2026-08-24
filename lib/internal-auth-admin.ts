import "server-only";

import { SITE_URL } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

type AccessLinkType = "invite" | "recovery";

export type InternalAccessLink = {
  authId: string;
  url: string;
  createdAuthUser: boolean;
};

function callbackUrl(tokenHash: string | undefined, type: AccessLinkType): string | null {
  if (!tokenHash) return null;
  // Fragment sa neposiela serveru ani link scanneru. Token spotrebuje až vedomý klik
  // používateľa na /potvrdit-pristup, nie automatický GET e-mailového prefetchera.
  return `${SITE_URL}/potvrdit-pristup#token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}

async function recoveryLink(email: string): Promise<InternalAccessLink> {
  const admin = createAdminClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=/nastav-heslo`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  const url = callbackUrl(data?.properties?.hashed_token, "recovery");
  if (error || !data?.user?.id || !url) {
    throw new Error("Supabase recovery link could not be generated");
  }
  return { authId: data.user.id, url, createdAuthUser: false };
}

/**
 * Vytvorí jednorazový invite link. Ak Auth identita už existuje (napr. orphan po
 * prerušenom onboardingu), bezpečne prejde na recovery bez stránkovaného listUsers lookupu.
 */
export async function createInternalInviteLink(email: string): Promise<InternalAccessLink> {
  const admin = createAdminClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=/nastav-heslo`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  const url = callbackUrl(data?.properties?.hashed_token, "invite");
  if (!error && data?.user?.id && url) {
    return { authId: data.user.id, url, createdAuthUser: true };
  }
  return recoveryLink(email);
}

export async function createInternalRecoveryLink(email: string): Promise<InternalAccessLink> {
  return recoveryLink(email);
}

const MANAGED_BAN_FLAG = "moonid_lifecycle_ban";
const MANAGED_BAN_HOURS = 876_000;
const MANAGED_BAN_TOLERANCE_MS = 5 * 60 * 1000;

type ManagedBanMarker = { version: 1; expectedUntil: string };

function managedBanUntil(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const marker = value as Partial<ManagedBanMarker>;
  if (marker.version !== 1 || typeof marker.expectedUntil !== "string") return null;
  const timestamp = new Date(marker.expectedUntil).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export class ExternalAuthBanError extends Error {
  constructor() {
    super("Supabase Auth user has an external security ban");
    this.name = "ExternalAuthBanError";
  }
}

function isCurrentlyBanned(bannedUntil?: string): boolean {
  if (!bannedUntil) return false;
  const until = new Date(bannedUntil).getTime();
  return Number.isFinite(until) && until > Date.now();
}

/**
 * Idempotentne zosynchronizuje ban. V app_metadata drží iba ownership marker (nie rolu
 * ani autorizáciu), aby reaktivácia nikdy nezrušila nezávislý fraud/security ban.
 */
export async function setInternalAuthBlocked(
  authId: string,
  blocked: boolean,
): Promise<{ managedBan: boolean; externalBan: boolean }> {
  const admin = createAdminClient();
  const current = await admin.auth.admin.getUserById(authId);
  if (current.error || !current.data.user) throw new Error("Supabase Auth user could not be loaded");
  const metadata = { ...(current.data.user.app_metadata ?? {}) };
  const banned = isCurrentlyBanned(current.data.user.banned_until);
  const markerUntil = managedBanUntil(metadata[MANAGED_BAN_FLAG]);
  const providerUntil = current.data.user.banned_until
    ? new Date(current.data.user.banned_until).getTime()
    : Number.NaN;
  const managedBanMatches = markerUntil !== null
    && Number.isFinite(providerUntil)
    && Math.abs(providerUntil - markerUntil) <= MANAGED_BAN_TOLERANCE_MS;

  if (blocked) {
    if (banned) return { managedBan: managedBanMatches, externalBan: !managedBanMatches };
    const expectedUntil = new Date(Date.now() + MANAGED_BAN_HOURS * 60 * 60 * 1000).toISOString();
    metadata[MANAGED_BAN_FLAG] = { version: 1, expectedUntil } satisfies ManagedBanMarker;
    const changed = await admin.auth.admin.updateUserById(authId, {
      ban_duration: `${MANAGED_BAN_HOURS}h`,
      app_metadata: metadata,
    });
    if (changed.error) throw new Error("Supabase Auth user block could not be changed");
    return { managedBan: true, externalBan: false };
  }

  // Marker sám nestačí: manuálne predĺžený/pozmenený provider ban má iný čas
  // expirácie a portál ho preto nikdy automaticky nezruší.
  if (banned && !managedBanMatches) throw new ExternalAuthBanError();
  if (markerUntil !== null) {
    delete metadata[MANAGED_BAN_FLAG];
    const changed = await admin.auth.admin.updateUserById(authId, {
      ban_duration: "none",
      app_metadata: metadata,
    });
    if (changed.error) throw new Error("Supabase Auth user block could not be changed");
  }
  return { managedBan: false, externalBan: false };
}

export class InternalMfaResetError extends Error {
  constructor(public readonly removedCount: number) {
    super("Supabase MFA factor could not be removed");
    this.name = "InternalMfaResetError";
  }
}

/** Odstráni všetky MFA faktory. Zmazanie verified faktora v Supabase ukončí relácie usera. */
export async function resetInternalAuthMfa(authId: string): Promise<number> {
  const admin = createAdminClient();
  const listed = await admin.auth.admin.mfa.listFactors({ userId: authId });
  if (listed.error) throw new Error("Supabase MFA factors could not be loaded");
  const factors = listed.data?.factors ?? [];
  let removedCount = 0;
  for (const factor of factors) {
    const removed = await admin.auth.admin.mfa.deleteFactor({ userId: authId, id: factor.id });
    if (removed.error) throw new InternalMfaResetError(removedCount);
    removedCount += 1;
  }
  return removedCount;
}
