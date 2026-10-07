import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PasswordSetupPurpose, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const LINK_TTL_MS = 60 * 60 * 1000;
const VERIFIED_TTL_MS = 15 * 60 * 1000;
const CLOCK_SKEW_SEC = 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NONCE_RE = /^[A-Za-z0-9_-]{43}$/;

type ClaimsIdentity = { authId: string; sessionId: string };
type VerifiedGrant = {
  id: string;
  userId: string;
  companyId: string | null;
  authId: string;
};

export type ClaimedPasswordSetupGrant = VerifiedGrant & { attemptId: string };

function identityFromClaims(claims: unknown): ClaimsIdentity | null {
  if (!claims || typeof claims !== "object") return null;
  const authId = (claims as { sub?: unknown }).sub;
  const sessionId = (claims as { session_id?: unknown }).session_id;
  if (typeof authId !== "string" || !UUID_RE.test(authId)) return null;
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) return null;
  return { authId, sessionId };
}

function recentImplicitGrantTimestamp(claims: unknown, nowSec: number): number | null {
  if (!claims || typeof claims !== "object") return null;
  const amr = (claims as { amr?: unknown }).amr;
  if (!Array.isArray(amr) || amr.length !== 1) return null;
  const entry = amr[0];
  if (!entry || typeof entry !== "object") return null;
  const method = (entry as { method?: unknown }).method;
  const timestamp = (entry as { timestamp?: unknown }).timestamp;
  if (method !== "otp" && method !== "recovery") return null;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
  if (timestamp > nowSec + CLOCK_SKEW_SEC) return null;
  if (nowSec - timestamp > VERIFIED_TTL_MS / 1000) return null;
  return timestamp;
}

function canonicalNonce(rawNonce: unknown): string | null {
  if (typeof rawNonce !== "string" || !NONCE_RE.test(rawNonce)) return null;
  const bytes = Buffer.from(rawNonce, "base64url");
  if (bytes.length !== 32 || bytes.toString("base64url") !== rawNonce) return null;
  return rawNonce;
}

function tokenHash(rawNonce: string): string {
  return createHash("sha256").update(rawNonce, "utf8").digest("hex");
}

function activeUser(user: { active: boolean; authId: string; company: { active: boolean } | null }): boolean {
  return user.active && user.company?.active !== false;
}

async function lockUserGrant(tx: Prisma.TransactionClient, authId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`moonid:password-setup:${authId}`}, 0))`;
}

async function revokeOpenGrants(
  tx: Prisma.TransactionClient,
  authId: string,
): Promise<void> {
  await tx.passwordSetupGrant.updateMany({
    where: { authId, status: { in: ["PENDING", "VERIFIED"] } },
    data: { status: "REVOKED" },
  });
}

/** Creates an opaque 256-bit email capability; only its SHA-256 digest is persisted. */
export async function issuePasswordSetupGrant(input: {
  userId: string;
  authId: string;
  purpose: PasswordSetupPurpose;
}): Promise<{ id: string; nonce: string; expiresAt: Date }> {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  const grant = await prisma.$transaction(async (tx) => {
    await lockUserGrant(tx, input.authId);
    await revokeOpenGrants(tx, input.authId);
    return tx.passwordSetupGrant.create({
      data: {
        tokenHash: tokenHash(nonce),
        userId: input.userId,
        authId: input.authId,
        purpose: input.purpose,
        expiresAt,
      },
      select: { id: true },
    });
  });
  return { id: grant.id, nonce, expiresAt };
}

export async function failUndeliveredPasswordSetupGrant(id: string): Promise<void> {
  await prisma.passwordSetupGrant.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

/** Activates a hosted implicit recovery link and binds it to the exact Auth session. */
export async function activateImplicitPasswordSetupGrant(
  rawNonce: unknown,
  claims: unknown,
): Promise<boolean> {
  const nonce = canonicalNonce(rawNonce);
  const identity = identityFromClaims(claims);
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const amrTimestamp = recentImplicitGrantTimestamp(claims, nowSec);
  if (!nonce || !identity || amrTimestamp === null) return false;

  const grant = await prisma.passwordSetupGrant.findUnique({
    where: { tokenHash: tokenHash(nonce) },
    include: { user: { select: { authId: true, active: true, company: { select: { active: true } } } } },
  });
  if (!grant || grant.authId !== identity.authId || grant.user.authId !== identity.authId) return false;
  if (grant.purpose !== "RECOVERY" || !activeUser(grant.user) || grant.expiresAt <= now) return false;
  if (amrTimestamp < Math.floor(grant.createdAt.getTime() / 1000) - CLOCK_SKEW_SEC) return false;

  if (
    grant.status === "VERIFIED"
    && grant.sessionId === identity.sessionId
    && grant.verifiedUntil
    && grant.verifiedUntil > now
  ) {
    return true;
  }
  if (grant.status !== "PENDING") return false;

  const verifiedUntil = new Date(Math.min(now.getTime() + VERIFIED_TTL_MS, grant.expiresAt.getTime()));
  const activated = await prisma.passwordSetupGrant.updateMany({
    where: {
      id: grant.id,
      authId: identity.authId,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    data: {
      status: "VERIFIED",
      sessionId: identity.sessionId,
      verifiedUntil,
    },
  });
  return activated.count === 1;
}

/** Persists a scanner-safe token-hash invite/recovery verification as the same DB grant type. */
export async function activateNativePasswordSetupGrant(input: {
  authId: string;
  sessionId: string;
  purpose: PasswordSetupPurpose;
}): Promise<boolean> {
  if (!UUID_RE.test(input.authId) || !UUID_RE.test(input.sessionId)) return false;
  const user = await prisma.user.findUnique({
    where: { authId: input.authId },
    select: { id: true, authId: true, active: true, company: { select: { active: true } } },
  });
  if (!user || !activeUser(user)) return false;

  const now = new Date();
  const verifiedUntil = new Date(now.getTime() + VERIFIED_TTL_MS);
  const nonce = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    await lockUserGrant(tx, input.authId);
    await revokeOpenGrants(tx, input.authId);
    await tx.passwordSetupGrant.create({
      data: {
        tokenHash: tokenHash(nonce),
        userId: user.id,
        authId: input.authId,
        purpose: input.purpose,
        status: "VERIFIED",
        sessionId: input.sessionId,
        verifiedUntil,
        expiresAt: verifiedUntil,
      },
    });
  });
  return true;
}

export async function findVerifiedPasswordSetupGrant(claims: unknown): Promise<VerifiedGrant | null> {
  const identity = identityFromClaims(claims);
  if (!identity) return null;
  const now = new Date();
  const grant = await prisma.passwordSetupGrant.findFirst({
    where: {
      authId: identity.authId,
      sessionId: identity.sessionId,
      status: "VERIFIED",
      expiresAt: { gt: now },
      verifiedUntil: { gt: now },
    },
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { id: true, companyId: true, authId: true, active: true, company: { select: { active: true } } } } },
  });
  if (!grant || grant.user.authId !== identity.authId || !activeUser(grant.user)) return null;
  return { id: grant.id, userId: grant.user.id, companyId: grant.user.companyId, authId: identity.authId };
}

/** Atomic single-winner claim. Only the returned caller may invoke Supabase updateUser. */
export async function claimPasswordSetupGrant(claims: unknown): Promise<ClaimedPasswordSetupGrant | null> {
  const identity = identityFromClaims(claims);
  if (!identity) return null;
  const attemptId = randomUUID();
  const rows = await prisma.$queryRaw<VerifiedGrant[]>`
    UPDATE "PasswordSetupGrant" AS grant
       SET "status" = 'PROCESSING'::"PasswordSetupGrantStatus",
           "attemptId" = ${attemptId},
           "updatedAt" = now()
      FROM "User" AS app_user
      LEFT JOIN "Company" AS company ON company."id" = app_user."companyId"
     WHERE grant."userId" = app_user."id"
       AND grant."authId" = ${identity.authId}
       AND grant."sessionId" = ${identity.sessionId}
       AND grant."status" = 'VERIFIED'::"PasswordSetupGrantStatus"
       AND grant."expiresAt" > now()
       AND grant."verifiedUntil" > now()
       AND app_user."authId" = ${identity.authId}
       AND app_user."active" = true
       AND (app_user."companyId" IS NULL OR company."active" = true)
    RETURNING grant."id", grant."userId", app_user."companyId", grant."authId"`;
  const row = rows[0];
  return row ? { ...row, attemptId } : null;
}

/** PROCESSING is never reopened: an unknown provider outcome must require a fresh link. */
export async function finishPasswordSetupGrant(
  grant: ClaimedPasswordSetupGrant,
  success: boolean,
): Promise<boolean> {
  const result = await prisma.passwordSetupGrant.updateMany({
    where: { id: grant.id, attemptId: grant.attemptId, status: "PROCESSING" },
    data: { status: success ? "CONSUMED" : "FAILED" },
  });
  return result.count === 1;
}
