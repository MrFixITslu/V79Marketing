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

function verifySignedHubRequest(
  args: { method: string; pathname: string; timestamp: string; signature: string; serviceId: string; body?: string },
  secret: string,
) {
  if (secret.length < 32 || args.serviceId !== SUMMARY_SERVICE_ID) return false;
  const millis = Number(args.timestamp);
  if (!Number.isFinite(millis) || Math.abs(Date.now() - millis) > MAX_SKEW_MS) return false;
  const expected = signPlatformRequest({
    method: args.method,
    pathname: args.pathname,
    timestamp: args.timestamp,
    body: args.body || "",
    secret,
  });
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(args.signature || "", "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyHubProvisionRequest(args: { method: string; pathname: string; timestamp: string; signature: string; serviceId: string; body?: string }) {
  const dedicated = clean(process.env.V79_HUB_PROVISION_SECRET);
  const developmentFallback = process.env.NODE_ENV === "production" ? "" : clean(process.env.V79_PLATFORM_SHARED_SECRET);
  return verifySignedHubRequest(args, dedicated || developmentFallback);
}

export function verifyHubPlatformRequest(args: { method: string; pathname: string; timestamp: string; signature: string; serviceId: string; body?: string }) {
  return verifySignedHubRequest(args, clean(process.env.V79_PLATFORM_SHARED_SECRET));
}

export function verifyHubSummaryRequest(args: { method: string; pathname: string; timestamp: string; signature: string; serviceId: string }) {
  return verifyHubPlatformRequest({ ...args, body: "" });
}

export type HubLaunchSession = {
  user: { id: string; email: string; name: string };
  organization: { id: string; name: string; slug: string };
  role: "owner" | "manager" | "staff" | "viewer";
  plan?: string;
  entitlement: { product: "marketing"; enabled: boolean };
};

// Hub is the sole authority for organisation names. A user-facing rename must
// be confirmed there before Marketing commits its own display-name mirror.
export async function renameHubOrganization(input: {
  organizationId: string;
  scopedUserId: string;
  name: string;
  expectedName: string;
}): Promise<{ name: string; propagation: Record<string, string> }> {
  const baseUrl = clean(process.env.V79_HUB_INTERNAL_URL);
  const secret = clean(process.env.V79_MARKETING_LAUNCH_SECRET);
  if (!baseUrl || secret.length < 32) {
    throw new Error("V79 Hub identity synchronisation is not configured.");
  }
  const pathname = "/api/platform/organization/name";
  const body = JSON.stringify(input);
  const timestamp = String(Date.now());
  const signature = signPlatformRequest({ method: "POST", pathname, timestamp, body, secret });
  const response = await fetch(new URL(pathname, baseUrl), {
    method: "POST",
    redirect: "error",
    headers: {
      "content-type": "application/json",
      "x-v79-service-id": LAUNCH_SERVICE_ID,
      "x-v79-timestamp": timestamp,
      "x-v79-signature": signature,
    },
    body,
    signal: AbortSignal.timeout(7000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      response.status === 409 ? (result?.error || "The business name changed in Hub. Refresh and try again.")
      : response.status === 403 ? "Only the Hub organisation owner can change the shared business name."
      : "Hub did not confirm the business name change. Nothing was renamed in Marketing."
    );
  }
  if (result?.success !== true || result?.organizationId !== input.organizationId ||
      typeof result?.name !== "string" || result.name.trim() !== input.name.trim().replace(/\s+/g, " ")) {
    throw new Error("Hub returned a mismatched business identity. The local name was not changed.");
  }
  return { name: result.name, propagation:
    result.propagation && typeof result.propagation === 'object' && !Array.isArray(result.propagation)
      ? result.propagation : {} };
}

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
