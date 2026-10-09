import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createHubAgentCampaignDraft, validateHubAgentDraftRequest } from "../src/lib/agentHubDrafts.js";
import { ensureAgentCampaignDraftTable } from "../src/lib/agentCampaignDrafts.js";
import { signPlatformRequest, verifyHubProvisionRequest } from "../src/lib/platform.js";

const proposalId = "12345678-1234-4123-8123-123456789abc";
const input = {
  organizationId: "synthetic-org-a",
  actorHubUserId: "synthetic-hub-owner-a",
  proposalId,
  title: "Review campaign launch",
  brief: "V79 INTERNAL PLANNING BRIEF\nNo publishing or scheduling is authorized.",
};

function database() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys=ON");
  db.exec(`
    CREATE TABLE businesses(id TEXT PRIMARY KEY,hub_organization_id TEXT UNIQUE);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT,hub_user_id TEXT,role TEXT);
    CREATE TABLE audit_logs(id TEXT PRIMARY KEY,business_id TEXT,user_id TEXT,user_name TEXT,action TEXT,details TEXT,ip_address TEXT,timestamp TEXT);
    INSERT INTO businesses VALUES ('biz-a','synthetic-org-a'),('biz-b','synthetic-org-b');
    INSERT INTO users VALUES
      ('owner-a','biz-a','synthetic-hub-owner-a','BUSINESS_OWNER'),
      ('staff-a','biz-a','synthetic-hub-staff-a','MARKETING_STAFF'),
      ('owner-b','biz-b','synthetic-hub-owner-b','BUSINESS_OWNER');
  `);
  ensureAgentCampaignDraftTable(db);
  return db;
}

describe("signed Hub supervised Marketing draft boundary", () => {
  it("rejects unknown fields and unsafe payloads, permits standard multiline notes", () => {
    expect(validateHubAgentDraftRequest(input)).toEqual(input);
    for (const extra of [
      { businessId: "biz-b" }, { recipient: "someone@example.invalid" },
      { scheduledFor: new Date().toISOString() }, { publish: true },
      { status: "PUBLISHED" }, { send: true }, { idempotencyKey: "manual-override" },
    ]) expect(validateHubAgentDraftRequest({ ...input, ...extra })).toBeNull();
    expect(validateHubAgentDraftRequest({ ...input, proposalId: "../wrong" })).toBeNull();
    expect(validateHubAgentDraftRequest({ ...input, brief: input.brief + "\r" })).toBeNull();
    expect(validateHubAgentDraftRequest({ ...input, brief: input.brief + "\u0000" })).toBeNull();
    expect(validateHubAgentDraftRequest({ ...input, brief: "x".repeat(2001) })).toBeNull();
  });

  it("creates only the internal draft for a Hub-linked owner, never product dispatch rows", () => {
    const db = database();
    try {
      const result = createHubAgentCampaignDraft(db, input);
      expect(result.kind).toBe("created");
      if (result.kind === "created") {
        expect(result.draft.businessId).toBe("biz-a");
        expect(result.draft.createdBy).toBe("owner-a");
        expect(result.draft.status).toBe("DRAFT");
      }
      expect(db.prepare("SELECT count(*) n FROM agent_campaign_drafts").get()).toEqual({ n: 1 });
      expect(db.prepare("SELECT count(*) n FROM audit_logs WHERE action=?").get("AGENT_INTERNAL_DRAFT_CREATED")).toEqual({ n: 1 });
      expect(createHubAgentCampaignDraft(db, input).kind).toBe("duplicate");
      expect(db.prepare("SELECT count(*) n FROM audit_logs WHERE action=?").get("AGENT_INTERNAL_DRAFT_CREATED")).toEqual({ n: 1 });
      expect(createHubAgentCampaignDraft(db, { ...input, brief: input.brief + "\nChanged" }).kind).toBe("conflict");
      const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('campaigns','posts','post_deliveries')").all();
      expect(rows).toHaveLength(0);
    } finally { db.close(); }
  });

  it("fails closed for a mismatched organisation, staff identity or unknown owner", () => {
    const db = database();
    try {
      expect(createHubAgentCampaignDraft(db, { ...input, organizationId: "synthetic-org-b" }).kind).toBe("not_found");
      expect(createHubAgentCampaignDraft(db, { ...input, actorHubUserId: "synthetic-hub-staff-a" }).kind).toBe("not_found");
      expect(createHubAgentCampaignDraft(db, { ...input, actorHubUserId: "synthetic-missing" }).kind).toBe("not_found");
      expect(db.prepare("SELECT count(*) n FROM agent_campaign_drafts").get()).toEqual({ n: 0 });
      expect(db.prepare("SELECT count(*) n FROM audit_logs").get()).toEqual({ n: 0 });
    } finally { db.close(); }
  });

  it("rejects a modified request body under an otherwise valid Hub signature", () => {
    const before = process.env.V79_HUB_PROVISION_SECRET;
    try {
      process.env.V79_HUB_PROVISION_SECRET = "synthetic_test_key_only_not_for_prod_1234567890";
      const timestamp = String(Date.now());
      const body = JSON.stringify(input);
      const args = {
        method: "POST", pathname: "/api/platform/agent-drafts",
        timestamp, serviceId: "v79-hub",
        signature: signPlatformRequest({
          method: "POST", pathname: "/api/platform/agent-drafts",
          timestamp, body, secret: process.env.V79_HUB_PROVISION_SECRET,
        }),
        body,
      };
      expect(verifyHubProvisionRequest(args)).toBe(true);
      expect(verifyHubProvisionRequest({ ...args, body: body + " " })).toBe(false);
      expect(verifyHubProvisionRequest({ ...args, pathname: "/api/posts" })).toBe(false);
      expect(verifyHubProvisionRequest({ ...args, serviceId: "v79-marketing" })).toBe(false);
      expect(verifyHubProvisionRequest({ ...args, timestamp: String(Date.now() - 600_000) })).toBe(false);
    } finally {
      if (before === undefined) delete process.env.V79_HUB_PROVISION_SECRET;
      else process.env.V79_HUB_PROVISION_SECRET = before;
    }
  });
});
