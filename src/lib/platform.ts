import crypto from "node:crypto";

const SUMMARY_SERVICE_ID = "v79-hub";
const LAUNCH_SERVICE_ID = "v79-marketing";
const MAX_SKEW_MS = 5 * 60 * 1000;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^['"]|['"]$/g, "") : "";
}

function bodyHash(body: string) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

export function signPlatformRequest(args: { method: string; pathname: string; timestamp: string; body?: string; secret: string }) {
  const canonical = [args.method.toUpperCase(), args.pathname, args.timestamp, bodyHash(args.body || "")].join("\n");
  return crypto.createHmac("sha256", args.secret).update(canonical).digest("hex");
}

export function verifyHubSummaryRequest(args: { method: string; pathname: string; timestamp: string; signature: string; serviceId: string }) {
  const secret = clean(process.env.V79_PLATFORM_SHARED_SECRET);
  if (secret.length < 32 || args.serviceId !== SUMMARY_SERVICE_ID) return false;
  const millis = Number(args.timestamp);
  if (!Number.isFinite(millis) || Math.abs(Date.now() - millis) > MAX_SKEW_MS) return false;
  const expected = signPlatformRequest({ method: args.method, pathname: args.pathname, timestamp: args.timestamp, body: "", secret });
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(args.signature || "", "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type HubLaunchSession = {
  user: { id: string; email: string; name: string };
  organization: { id: string; name: string; slug: string };
  role: "owner" | "admin" | "member";
  plan?: string;
  entitlement: { product: "marketing"; enabled: boolean };
};

export async function consumeHubLaunchTicket(ticket: string): Promise<HubLaunchSession> {
  const baseUrl = clean(process.env.V79_HUB_INTERNAL_URL);
  const secret = clean(process.env.V79_MARKETING_LAUNCH_SECRET);
  if (!baseUrl) throw new Error("V79_HUB_INTERNAL_URL is not configured.");
  if (secret.length < 32) throw new Error("V79_MARKETING_LAUNCH_SECRET must be at least 32 characters.");

  const pathname = "/api/platform/session/consume";
  const body = JSON.stringify({ ticket, product: "marketing" });
  const timestamp = String(Date.now());
  const signature = signPlatformRequest({ method: "POST", pathname, timestamp, body, secret });

  const response = await fetch(new URL(pathname, baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-v79-service-id": LAUNCH_SERVICE_ID,
      "x-v79-timestamp": timestamp,
      "x-v79-signature": signature,
    },
    body,
    signal: AbortSignal.timeout(5000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `V79 Hub returned HTTP ${response.status}`);
  if (!payload?.entitlement?.enabled) throw new Error("Your V79 subscription does not include V79 Marketing.");
  return payload as HubLaunchSession;
}
