import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptToken, decryptToken } from "../src/lib/tokenVault.js";
import { refreshStoredTikTokAccount } from "../src/lib/tiktokTokenLifecycle.js";

const accountId = "tiktok-account-a";
const businessId = "business-a";
let db: Database.Database;

function createFixture(accessSeconds = 60, refreshSeconds = 180 * 86400) {
  db = new Database(":memory:");
  db.exec("CREATE TABLE social_accounts (id TEXT PRIMARY KEY,business_id TEXT,platform TEXT,connected INTEGER,connected_by_user_id TEXT,provider_account_id TEXT,access_token_enc TEXT,refresh_token_enc TEXT,expires_at TEXT,refresh_expires_at TEXT,provider_metadata_json TEXT,last_synced_at TEXT)");
  db.exec("CREATE TABLE tiktok_refresh_attempts (account_id TEXT PRIMARY KEY,attempt_id TEXT,state TEXT,started_at TEXT)");
  db.prepare("INSERT INTO social_accounts VALUES(?,?,?,1,?,?,?,?,?,?,?,?)").run(
    accountId, businessId, "tiktok", "owner-a", "user-open-id",
    encryptToken("access-old"), encryptToken("refresh-old"),
    new Date(Date.now() + accessSeconds * 1000).toISOString(),
    new Date(Date.now() + refreshSeconds * 1000).toISOString(), "{}", new Date().toISOString()
  );
}
function row() {
  return db.prepare("SELECT * FROM social_accounts WHERE id=?").get(accountId) as any;
}
function okTokenResponse() {
  return new Response(JSON.stringify({
    access_token: "access-new", refresh_token: "refresh-new",
    expires_in: 7200, refresh_expires_in: 180 * 86400,
    open_id: "user-open-id", token_type: "Bearer",
  }), {status: 200, headers: {"content-type": "application/json"}});
}

beforeEach(() => {
  vi.stubEnv("SOCIAL_TOKEN_ENCRYPTION_KEY", "synthetic-dev-only-encryption-material-at-least-32");
  vi.stubEnv("TIKTOK_CLIENT_KEY", "synthetic-client");
  vi.stubEnv("TIKTOK_CLIENT_SECRET", "synthetic-secret");
});
afterEach(() => {
  db?.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TikTok December 2026 OAuth rotation", () => {
  it("serialises concurrent workers and atomically replaces both encrypted credentials and lifetimes", async () => {
    createFixture();
    let release!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => { release = resolve; });
    const fetchMock = vi.fn(async (_url: any, options: RequestInit) => {
      expect(options.method).toBe("POST");
      expect(String(options.body)).toContain("refresh_token=refresh-old");
      return pending;
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = refreshStoredTikTokAccount(db, accountId, businessId, "owner-a");
    await expect(refreshStoredTikTokAccount(db, accountId, businessId, "owner-a")).rejects.toThrow(/already in progress/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release(okTokenResponse());
    const updated = await first;
    expect(updated.refreshToken).toBe("refresh-new");
    expect(updated.refreshExpiresAt).toBeTruthy();
    expect(decryptToken(row().access_token_enc)).toBe("access-new");
    expect(decryptToken(row().refresh_token_enc)).toBe("refresh-new");
    expect(Date.parse(row().expires_at)).toBeGreaterThan(Date.now() + 7000 * 1000);
    expect(Date.parse(row().refresh_expires_at)).toBeGreaterThan(Date.now() + 170 * 86400000);
    expect(db.prepare("SELECT COUNT(*) AS n FROM tiktok_refresh_attempts").get()).toEqual({n: 0});
    await refreshStoredTikTokAccount(db, accountId, businessId, "owner-a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a token whose provider response may have rotated it", async () => {
    createFixture();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      access_token:"access-new", expires_in:7200, refresh_expires_in:15552000,
      open_id:"user-open-id"
    }), {status:200}));
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshStoredTikTokAccount(db, accountId, businessId)).rejects.toThrow(/reconnection/);
    expect((db.prepare("SELECT state FROM tiktok_refresh_attempts").get() as any).state).toBe("reconnect_required");
    await expect(refreshStoredTikTokAccount(db, accountId, businessId)).rejects.toThrow(/reconnection/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decryptToken(row().refresh_token_enc)).toBe("refresh-old");
  });

  it("blocks stale interrupted refresh reservations instead of silently reusing old tokens", async () => {
    createFixture();
    db.prepare("INSERT INTO tiktok_refresh_attempts VALUES(?,?,'inflight',?)")
      .run(accountId, "previous-attempt", new Date(Date.now() - 5 * 60000).toISOString());
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshStoredTikTokAccount(db, accountId, businessId)).rejects.toThrow(/reconnection/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recognises refresh expiry and another user's ownership without a provider request", async () => {
    createFixture(60, -1);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(refreshStoredTikTokAccount(db, accountId, businessId, "owner-b")).rejects.toThrow(/reconnection/);
    await expect(refreshStoredTikTokAccount(db, accountId, businessId, "owner-a")).rejects.toThrow(/reconnection/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports explicit reauthorization to recover from an uncertain previous refresh", async () => {
    createFixture();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network connection lost after send"); }));
    await expect(refreshStoredTikTokAccount(db, accountId, businessId)).rejects.toThrow(/reconnection/);
    db.prepare("UPDATE social_accounts SET access_token_enc=?,refresh_token_enc=?,expires_at=?,refresh_expires_at=? WHERE id=?")
      .run(encryptToken("reauthorized-access"), encryptToken("reauthorized-refresh"),
        new Date(Date.now()+7200000).toISOString(), new Date(Date.now()+180*86400000).toISOString(), accountId);
    db.prepare("DELETE FROM tiktok_refresh_attempts WHERE account_id=?").run(accountId);
    const account = await refreshStoredTikTokAccount(db, accountId, businessId, "owner-a");
    expect(account.accessToken).toBe("reauthorized-access");
    expect(account.refreshToken).toBe("reauthorized-refresh");
  });
});
