-- Purpose-bound, one-time password setup state. Supabase's hosted implicit flow
-- exposes only an ambiguous `otp` AMR, therefore app authorization is persisted
-- and bound to the exact Auth subject + session before a password can be changed.
CREATE TYPE "PasswordSetupPurpose" AS ENUM ('INVITE', 'RECOVERY');
CREATE TYPE "PasswordSetupGrantStatus" AS ENUM (
  'PENDING', 'VERIFIED', 'PROCESSING', 'CONSUMED', 'FAILED', 'REVOKED'
);

CREATE TABLE "PasswordSetupGrant" (
  "id" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "userId" TEXT NOT NULL,
  "authId" TEXT NOT NULL,
  "purpose" "PasswordSetupPurpose" NOT NULL,
  "status" "PasswordSetupGrantStatus" NOT NULL DEFAULT 'PENDING',
  "sessionId" TEXT,
  "verifiedUntil" TIMESTAMP(3),
  "attemptId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PasswordSetupGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordSetupGrant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PasswordSetupGrant_expiry_check" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "PasswordSetupGrant_verified_window_check" CHECK (
    "verifiedUntil" IS NULL OR "verifiedUntil" <= "expiresAt"
  )
);

CREATE UNIQUE INDEX "PasswordSetupGrant_tokenHash_key" ON "PasswordSetupGrant"("tokenHash");
CREATE INDEX "PasswordSetupGrant_authId_status_idx" ON "PasswordSetupGrant"("authId", "status");
CREATE INDEX "PasswordSetupGrant_sessionId_status_idx" ON "PasswordSetupGrant"("sessionId", "status");
CREATE INDEX "PasswordSetupGrant_expiresAt_idx" ON "PasswordSetupGrant"("expiresAt");

ALTER TABLE "PasswordSetupGrant" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PasswordSetupGrant" FROM PUBLIC;

