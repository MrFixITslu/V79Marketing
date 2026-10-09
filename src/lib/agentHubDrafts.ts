import type Database from "better-sqlite3";
import { createAgentCampaignDraft } from "./agentCampaignDrafts.js";

// This endpoint accepts only signed Hub requests. It never creates posts,
// deliveries or campaigns, and derives the Marketing tenant and local owner
// from persisted Hub linkage, never from a caller-supplied business ID.
export type HubAgentDraftRequest = {
  organizationId: string;
  actorHubUserId: string;
  proposalId: string;
  title: string;
  brief: string;
};

const ID_RE = /^[A-Za-z0-9._:@-]{8,180}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateHubAgentDraftRequest(body: unknown): HubAgentDraftRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 5 || !keys.every(k =>
      ["organizationId", "actorHubUserId", "proposalId", "title", "brief"].includes(k))) return null;
  const raw = body as Record<string, unknown>;
  if (typeof raw.organizationId !== "string" || !ID_RE.test(raw.organizationId) ||
      typeof raw.actorHubUserId !== "string" || !ID_RE.test(raw.actorHubUserId) ||
      typeof raw.proposalId !== "string" || !UUID_RE.test(raw.proposalId) ||
      typeof raw.title !== "string" || raw.title.trim() !== raw.title ||
      raw.title.length < 4 || raw.title.length > 160 ||
      typeof raw.brief !== "string" || raw.brief.trim() !== raw.brief ||
      raw.brief.length < 12 || raw.brief.length > 2000 ||
      /[\u0000-\u0009\u000b-\u001f\u007f]/.test(raw.title + raw.brief)) return null;
  return raw as HubAgentDraftRequest;
}

export function createHubAgentCampaignDraft(db: Database.Database, raw: unknown) {
  const input = validateHubAgentDraftRequest(raw);
  if (!input) return { kind: "invalid" as const };

  // Both mappings must already exist and belong to the same Hub organisation.
  // Never create a new user/workspace as a side effect of agent drafting.
  const identity = db.prepare(`
    SELECT b.id AS business_id, u.id AS user_id
      FROM businesses b
      JOIN users u ON u.business_id=b.id
     WHERE b.hub_organization_id=?
       AND u.hub_user_id=?
       AND u.role='BUSINESS_OWNER'
     LIMIT 1
  `).get(input.organizationId, input.actorHubUserId) as
    { business_id: string; user_id: string } | undefined;
  if (!identity) return { kind: "not_found" as const };
  const idempotencyKey = "hubproposal_" + input.proposalId.replaceAll("-", "").toLowerCase();
  return createAgentCampaignDraft(db, {
    id: identity.user_id,
    businessId: identity.business_id,
  }, {
    title: input.title,
    brief: input.brief,
    idempotencyKey,
  });
}
