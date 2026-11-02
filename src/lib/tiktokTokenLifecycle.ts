import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { decryptToken, encryptToken } from "./tokenVault.js";
import { refreshProviderAccess, type ProviderAccountRecord } from "./socialProviders.js";

type StoredAccount = {
  id: string;
  business_id: string;
  platform: string;
  connected: number;
  connected_by_user_id?: string | null;
  provider_account_id: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
  provider_metadata_json: string;
};

const RECONNECT = "TikTok authorization requires reconnection. Open Social Media Connections and connect TikTok again.";
const BUSY = "TikTok credential refresh is already in progress. Try again shortly.";

/**
 * One durable refresh reservation per social account, shared by the creator-info
 * route and all publishing workers. Never perform a second refresh with a token
 * whose previous refresh outcome is unknown (including process crashes/timeouts).
 */
export async function refreshStoredTikTokAccount(
  db: Database.Database, accountId: string, businessId: string, ownerUserId?: string
): Promise<ProviderAccountRecord> {
  const row = (ownerUserId
    ? db.prepare("SELECT * FROM social_accounts WHERE id=? AND business_id=? AND connected_by_user_id=? AND platform='tiktok' AND connected=1")
      .get(accountId, businessId, ownerUserId)
    : db.prepare("SELECT * FROM social_accounts WHERE id=? AND business_id=? AND platform='tiktok' AND connected=1")
      .get(accountId, businessId)) as StoredAccount | undefined;
  if (!row || !row.access_token_enc || !row.refresh_token_enc) throw new Error(RECONNECT);

  const attempt = db.prepare("SELECT state,started_at FROM tiktok_refresh_attempts WHERE account_id=?")
    .get(accountId) as {state: string; started_at: string} | undefined;
  if (attempt) {
    if (attempt.state === "inflight" && Date.now() - Date.parse(attempt.started_at) < 120000) {
      throw new Error(BUSY);
    }
    throw new Error(RECONNECT);
  }

  const accessExpiresAt = row.expires_at ? Date.parse(row.expires_at) : NaN;
  const refreshExpiresAt = row.refresh_expires_at ? Date.parse(row.refresh_expires_at) : NaN;
  if (!Number.isFinite(accessExpiresAt)) throw new Error(RECONNECT);
  const account: ProviderAccountRecord = {
    platform: "tiktok",
    providerAccountId: String(row.provider_account_id),
    accessToken: decryptToken(row.access_token_enc),
    refreshToken: decryptToken(row.refresh_token_enc),
    expiresAt: row.expires_at,
    refreshExpiresAt: row.refresh_expires_at,
    metadata: JSON.parse(row.provider_metadata_json || "{}"),
  };
  if (accessExpiresAt - Date.now() > 20 * 60 * 1000) return account;
  if (row.refresh_expires_at && (!Number.isFinite(refreshExpiresAt) || refreshExpiresAt <= Date.now())) {
    throw new Error(RECONNECT);
  }

  const attemptId = crypto.randomUUID();
  const reserved = db.prepare(
    "INSERT OR IGNORE INTO tiktok_refresh_attempts(account_id,attempt_id,state,started_at) VALUES(?,?,'inflight',?)"
  ).run(accountId, attemptId, new Date().toISOString());
  if (reserved.changes !== 1) throw new Error(BUSY);

  try {
    const updated = await refreshProviderAccess(account);
    if (!updated.refreshToken || updated.refreshToken === account.refreshToken ||
        !updated.expiresAt || !updated.refreshExpiresAt) throw new Error(RECONNECT);
    // Both credentials and both deadlines are one atomic write. A concurrent
    // OAuth reconnection cannot be overwritten by a slower refresh response.
    db.transaction(() => {
      const changed = db.prepare(
        "UPDATE social_accounts SET access_token_enc=?, refresh_token_enc=?, expires_at=?, refresh_expires_at=?, last_synced_at=? " +
        "WHERE id=? AND business_id=? AND platform='tiktok' AND connected=1 AND refresh_token_enc=?"
      ).run(
        encryptToken(updated.accessToken), encryptToken(updated.refreshToken),
        updated.expiresAt, updated.refreshExpiresAt, new Date().toISOString(),
        accountId, businessId, row.refresh_token_enc
      );
      if (changed.changes !== 1) throw new Error("TikTok connection changed during refresh.");
      const removed = db.prepare("DELETE FROM tiktok_refresh_attempts WHERE account_id=? AND attempt_id=? AND state='inflight'")
        .run(accountId, attemptId);
      if (removed.changes !== 1) throw new Error("TikTok refresh reservation changed.");
    })();
    return updated;
  } catch {
    // The API may have accepted and rotated the token even if its response was
    // lost. Persist the uncertainty rather than retrying the invalid old token.
    db.prepare("UPDATE tiktok_refresh_attempts SET state='reconnect_required' WHERE account_id=? AND attempt_id=?")
      .run(accountId, attemptId);
    throw new Error(RECONNECT);
  }
}
