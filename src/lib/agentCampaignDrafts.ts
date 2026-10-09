import type Database from "better-sqlite3";
import crypto from "node:crypto";

// Intentionally separate from campaigns, posts, deliveries and publishing jobs.
export function ensureAgentCampaignDraftTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_campaign_drafts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      title TEXT NOT NULL,
      brief TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status='DRAFT'),
      created_at TEXT NOT NULL,
      UNIQUE (business_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_agent_campaign_drafts_business
      ON agent_campaign_drafts(business_id, created_at DESC);
  `);
}

type Actor = { id: string; businessId: string };
type DraftRequest = { title: string; brief: string; idempotencyKey: string };
type Draft = { id: string; businessId: string; createdBy: string; idempotencyKey: string;
  title: string; brief: string; status: "DRAFT"; createdAt: string };
type Result = { kind: "created" | "duplicate"; draft: Draft } |
  { kind: "invalid" } | { kind: "conflict" } | { kind: "limit" };

export function validateAgentCampaignDraft(input: unknown): DraftRequest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== 3 || !keys.every(k => ["title", "brief", "idempotencyKey"].includes(k))) return null;
  const raw = input as Record<string, unknown>;
  const title = raw.title;
  const brief = raw.brief;
  const idempotencyKey = raw.idempotencyKey;
  if (typeof title !== "string" || title.trim() !== title || title.length < 4 || title.length > 160 ||
      typeof brief !== "string" || brief.trim() !== brief || brief.length < 12 || brief.length > 2000 ||
      typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{16,96}$/.test(idempotencyKey)) return null;
  if (/[\u0000-\u0009\u000b-\u001f\u007f]/.test(title + brief)) return null;
  return { title, brief, idempotencyKey };
}

function publicDraft(row: Record<string, string>): Draft {
  return { id: row.id, businessId: row.business_id, createdBy: row.created_by,
    idempotencyKey: row.idempotency_key, title: row.title, brief: row.brief,
    status: "DRAFT", createdAt: row.created_at };
}

export function createAgentCampaignDraft(
  db: Database.Database, actor: Actor, body: unknown,
  { uuid = crypto.randomUUID, now = () => new Date().toISOString() } = {},
): Result {
  if (!actor?.id || !actor?.businessId) return { kind: "invalid" };
  const payload = validateAgentCampaignDraft(body);
  if (!payload) return { kind: "invalid" };
  return db.transaction(() => {
    const prior = db.prepare(
      "SELECT * FROM agent_campaign_drafts WHERE business_id=? AND idempotency_key=?",
    ).get(actor.businessId, payload.idempotencyKey) as Record<string, string> | undefined;
    if (prior) {
      return prior.title === payload.title && prior.brief === payload.brief
        ? { kind: "duplicate" as const, draft: publicDraft(prior) }
        : { kind: "conflict" as const };
    }
    const rowCount = db.prepare(
      "SELECT COUNT(*) AS n FROM agent_campaign_drafts WHERE business_id=?",
    ).get(actor.businessId) as { n: number };
    if (rowCount.n >= 250) return { kind: "limit" as const };
    const id = uuid();
    const timestamp = now();
    db.prepare(`INSERT INTO agent_campaign_drafts
      (id,business_id,created_by,idempotency_key,title,brief,status,created_at)
      VALUES (?,?,?,?,?,?,'DRAFT',?)`
    ).run(id, actor.businessId, actor.id, payload.idempotencyKey, payload.title, payload.brief, timestamp);
    return { kind: "created" as const,
      draft: { id, businessId: actor.businessId, createdBy: actor.id,
        idempotencyKey: payload.idempotencyKey, title: payload.title, brief: payload.brief,
        status: "DRAFT" as const, createdAt: timestamp } };
  })();
}

export function listAgentCampaignDrafts(db: Database.Database, businessId: string): Draft[] {
  if (typeof businessId !== "string" || !businessId) return [];
  const rows = db.prepare(
    "SELECT * FROM agent_campaign_drafts WHERE business_id=? ORDER BY created_at DESC, id DESC LIMIT 100",
  ).all(businessId) as Record<string, string>[];
  return rows.map(publicDraft);
}
