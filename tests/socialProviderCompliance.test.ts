import { afterEach, describe, expect, it, vi } from "vitest";
import { db, initDb } from "../src/lib/db.js";
import { revokeProviderAuthorization, type ProviderAccountRecord } from "../src/lib/socialProviders.js";

describe("Social provider legal compliance", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps provider consent version and timestamp columns in the durable schema", () => {
    initDb();
    const accountColumns = db.prepare("PRAGMA table_info(social_accounts)").all() as any[];
    const stateColumns = db.prepare("PRAGMA table_info(social_oauth_states)").all() as any[];

    expect(accountColumns.map(column => column.name)).toContain("legal_version");
    expect(accountColumns.map(column => column.name)).toContain("legal_consented_at");
    expect(stateColumns.map(column => column.name)).toContain("legal_version");
    expect(stateColumns.map(column => column.name)).toContain("consented_at");
  });

  it("revokes YouTube authorization with the refresh token before local deletion", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://oauth2.googleapis.com/revoke");
      expect(init?.method).toBe("POST");
      expect(String(init?.body)).toContain("token=refresh-token-value");
      return new Response("", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const account: ProviderAccountRecord = {
      platform: "youtube",
      providerAccountId: "channel-1",
      accessToken: "access-token-value",
      refreshToken: "refresh-token-value",
      metadata: {},
    };

    await expect(revokeProviderAuthorization(account)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call a revocation endpoint for providers without a supported revoke contract", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const account: ProviderAccountRecord = {
      platform: "linkedin",
      providerAccountId: "org-1",
      accessToken: "access-token-value",
      metadata: {},
    };

    await expect(revokeProviderAuthorization(account)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
