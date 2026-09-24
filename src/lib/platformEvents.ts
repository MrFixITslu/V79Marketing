import crypto from "node:crypto";
import { db } from "./db.js";
import { signPlatformRequest } from "./platform.js";

const EVENT_PATH = "/api/platform/events";
let timer: NodeJS.Timeout | null = null;
let pumping = false;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^['"]|['"]$/g, "") : "";
}

function configured() {
  return Boolean(clean(process.env.V79_HUB_EVENT_URL)) && clean(process.env.V79_HUB_EVENT_SECRET).length >= 32;
}

export function queueMarketingEvent(args: {
  businessId: string;
  type: string;
  subjectId?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
}) {
  const business = db.prepare("SELECT hub_organization_id FROM businesses WHERE id=?").get(args.businessId) as any;
  const organizationRef = business?.hub_organization_id;
  if (!organizationRef) return null;

  const id = `marketing:${args.type}:${crypto.randomUUID()}`;
  const occurredAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO platform_event_outbox
      (id,business_id,event_type,subject_id,correlation_id,occurred_at,payload_json,status,attempts,next_attempt_at,created_at)
    VALUES (?,?,?,?,?,?,?,'pending',0,?,?)
  `).run(
    id,
    args.businessId,
    args.type,
    args.subjectId || null,
    args.correlationId || null,
    occurredAt,
    JSON.stringify(args.payload || {}),
    occurredAt,
    occurredAt
  );
  void pumpPlatformEvents();
  return id;
}

function retryAt(attempts: number) {
  const seconds = Math.min(1800, Math.max(15, 15 * Math.pow(2, Math.min(attempts, 7))));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function pumpPlatformEvents() {
  if (pumping || !configured()) return;
  pumping = true;
  try {
    const rows = db.prepare(`
      SELECT o.*, b.hub_organization_id
      FROM platform_event_outbox o
      JOIN businesses b ON b.id=o.business_id
      WHERE o.status='pending' AND o.next_attempt_at <= ?
      ORDER BY o.created_at ASC LIMIT 20
    `).all(new Date().toISOString()) as any[];

    for (const row of rows) {
      const body = JSON.stringify({
        id: row.id,
        type: row.event_type,
        version: 1,
        occurredAt: row.occurred_at,
        organizationRef: row.hub_organization_id,
        subjectId: row.subject_id || undefined,
        correlationId: row.correlation_id || undefined,
        payload: JSON.parse(row.payload_json || "{}"),
      });
      const timestamp = String(Date.now());
      const secret = clean(process.env.V79_HUB_EVENT_SECRET);
      const signature = signPlatformRequest({ method: "POST", pathname: EVENT_PATH, timestamp, body, secret });
      try {
        const response = await fetch(clean(process.env.V79_HUB_EVENT_URL), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-v79-service-id": "marketing",
            "x-v79-timestamp": timestamp,
            "x-v79-signature": signature,
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          db.prepare("UPDATE platform_event_outbox SET status='sent',sent_at=?,last_error=NULL WHERE id=?")
            .run(new Date().toISOString(), row.id);
          continue;
        }
        const retryable = response.status === 409 || response.status === 429 || response.status >= 500;
        const error = `Hub returned HTTP ${response.status}`;
        if (!retryable) {
          db.prepare("UPDATE platform_event_outbox SET status='failed',attempts=attempts+1,last_error=? WHERE id=?").run(error,row.id);
        } else {
          db.prepare("UPDATE platform_event_outbox SET attempts=attempts+1,next_attempt_at=?,last_error=? WHERE id=?")
            .run(retryAt(row.attempts + 1), error, row.id);
        }
      } catch (error:any) {
        db.prepare("UPDATE platform_event_outbox SET attempts=attempts+1,next_attempt_at=?,last_error=? WHERE id=?")
          .run(retryAt(row.attempts + 1), error?.message || "Hub event delivery failed", row.id);
      }
    }
  } finally {
    pumping = false;
  }
}

export function startPlatformEventPump(intervalMs = 30000) {
  if (timer) return;
  timer = setInterval(() => void pumpPlatformEvents(), intervalMs);
  timer.unref?.();
  void pumpPlatformEvents();
}

export function stopPlatformEventPump() {
  if (timer) clearInterval(timer);
  timer = null;
}
