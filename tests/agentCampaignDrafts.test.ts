import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createAgentCampaignDraft, ensureAgentCampaignDraftTable,
  listAgentCampaignDrafts, validateAgentCampaignDraft } from "../src/lib/agentCampaignDrafts.js";

const actor = { id: "staff-A", businessId: "tenant-A" };
const payload = { title: "Review V79 beta campaign", brief: "Prepare a reviewable marketing campaign draft, with verified claims only.", idempotencyKey: "safe-campaign-review-001" };

function fixture() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec("CREATE TABLE businesses(id TEXT PRIMARY KEY); INSERT INTO businesses VALUES ('tenant-A'), ('tenant-B');");
  ensureAgentCampaignDraftTable(db);
  return db;
}

describe("Internal V79 Marketing campaign drafts", () => {
  it("accepts only bounded, three-field internal requests", () => {
    expect(validateAgentCampaignDraft(payload)).toEqual(payload);
    for (const extra of [{ publish: true }, { send: true }, { businessId: "tenant-B" },
      { scheduledFor: new Date().toISOString() }, { status: "SCHEDULED" }]) {
      expect(validateAgentCampaignDraft({ ...payload, ...extra })).toBeNull();
    }
    expect(validateAgentCampaignDraft({ ...payload, brief: "" })).toBeNull();
    expect(validateAgentCampaignDraft({ ...payload, idempotencyKey: "short" })).toBeNull();
    expect(validateAgentCampaignDraft({ ...payload, title: "a".repeat(161) })).toBeNull();
  });

  it("creates an internal DRAFT with no post, campaign or delivery tables", () => {
    const db = fixture();
    try {
      const result = createAgentCampaignDraft(db, actor, payload);
      expect(result.kind).toBe("created");
      if ("draft" in result) {
        expect(result.draft.status).toBe("DRAFT");
        expect(result.draft.businessId).toBe("tenant-A");
      }
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('posts','post_deliveries','campaigns')").all()).toEqual([]);
      expect(listAgentCampaignDrafts(db, actor.businessId)).toHaveLength(1);
      expect(listAgentCampaignDrafts(db, "tenant-B")).toHaveLength(0);
    } finally { db.close(); }
  });

  it("retries idempotently and rejects changed bodies with same key", () => {
    const db = fixture();
    try {
      expect(createAgentCampaignDraft(db, actor, payload).kind).toBe("created");
      expect(createAgentCampaignDraft(db, actor, payload).kind).toBe("duplicate");
      expect(createAgentCampaignDraft(db, actor, { ...payload, brief: "Different text, awaiting review by a human." }).kind).toBe("conflict");
      expect(listAgentCampaignDrafts(db, actor.businessId)).toHaveLength(1);
      expect(createAgentCampaignDraft(db, { id: "staff-B", businessId: "tenant-B" }, payload).kind).toBe("created");
      expect(listAgentCampaignDrafts(db, "tenant-B")).toHaveLength(1);
    } finally { db.close(); }
  });
});
