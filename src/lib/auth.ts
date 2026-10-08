import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db.js";
import { createHubEntitlementChecker } from "./hubEntitlement.js";

const checkHubSubscription = process.env.V79_ENTITLEMENT_RECHECK_ENABLED === "1"
  ? createHubEntitlementChecker({
      baseUrl: String(process.env.V79_HUB_INTERNAL_URL || ""),
      secret: String(process.env.V79_MARKETING_LAUNCH_SECRET || ""),
    })
  : null;
const TOKEN_EXPIRY = "30m";
const ISSUER = "v79-marketing";
const AUDIENCE = "v79-marketing";

function jwtSecret() {
  const configured = String(process.env.JWT_SECRET || "").trim();
  if (configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "test") return "v79-marketing-test-secret-32-characters-minimum";
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    businessId: string;
  };
}

export function generateToken(user: { id: string; email: string; name: string; role: string; businessId: string }) {
  return jwt.sign(user, jwtSecret(), { expiresIn: TOKEN_EXPIRY, issuer: ISSUER, audience: AUDIENCE });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, jwtSecret(), { issuer: ISSUER, audience: AUDIENCE }) as {
      id: string;
      email: string;
      name: string;
      role: string;
      businessId: string;
    };
  } catch {
    return null;
  }
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    const cookie = (req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith("v79_marketing_session="));
    if (cookie) token = decodeURIComponent(cookie.slice("v79_marketing_session=".length));
  }

  if (!token) return res.status(401).json({ error: "Sign in through V79 Hub to use V79 Marketing.", code: "HUB_AUTH_REQUIRED" });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Your V79 Marketing session has expired.", code: "SESSION_EXPIRED" });

  try {
    const liveUser = db.prepare(
      "SELECT id,email,name,role,business_id,hub_user_id FROM users WHERE id=? AND business_id=?"
    ).get(decoded.id, decoded.businessId) as any;
    if (!liveUser) {
      return res.status(401).json({ error: "Your V79 Marketing access has been revoked.", code: "ACCESS_REVOKED" });
    }
    if (checkHubSubscription) {
      const business = db.prepare(
        "SELECT hub_organization_id FROM businesses WHERE id=?"
      ).get(liveUser.business_id) as any;
      if (business?.hub_organization_id) {
        const allowed = liveUser.hub_user_id && await checkHubSubscription({
          organizationId: business.hub_organization_id,
          scopedUserId: liveUser.hub_user_id,
        });
        if (!allowed) return res.status(403).json({
          error: "V79 Hub subscription is inactive or unavailable.",
          code: "HUB_ENTITLEMENT_REVOKED",
        });
      }
    }
    req.user = {
      id: liveUser.id,
      email: liveUser.email,
      name: liveUser.name,
      role: liveUser.role,
      businessId: liveUser.business_id,
    };
  } catch {
    return res.status(503).json({ error: "Marketing authentication service is unavailable." });
  }
  next();
}

export function requireTenantAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  const requestedBusinessId = req.params.businessId || req.params.id || req.query.businessId || req.body?.businessId;
  if (req.user.role === "PLATFORM_ADMIN") return next();
  if (requestedBusinessId && requestedBusinessId !== req.user.businessId) {
    return res.status(403).json({ error: "Access denied to another organisation's Marketing workspace." });
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient privileges." });
    }
    next();
  };
}

export type MarketingPermission =
  | "business.read"
  | "business.write"
  | "credits.read"
  | "content.read"
  | "content.write"
  | "social.read"
  | "social.write"
  | "ai.use"
  | "customers.read"
  | "customers.write"
  | "memory.read"
  | "memory.write";

const rolePermissions: Record<string, MarketingPermission[] | ["*"]> = {
  PLATFORM_ADMIN: ["*"],
  BUSINESS_OWNER: ["*"],
  MARKETING_MANAGER: [
    "business.read",
    "credits.read",
    "content.read",
    "content.write",
    "social.read",
    "social.write",
    "ai.use",
    "customers.read",
    "customers.write",
    "memory.read",
    "memory.write",
  ],
  MARKETING_STAFF: [
    "business.read",
    "credits.read",
    "content.read",
    "content.write",
    "social.read",
    "ai.use",
    "customers.read",
    "customers.write",
    "memory.read",
  ],
  MARKETING_VIEWER: [
    "business.read",
    "credits.read",
    "content.read",
    "social.read",
    "customers.read",
    "memory.read",
  ],
  CONTENT_CREATOR: [
    "business.read",
    "credits.read",
    "content.read",
    "content.write",
    "social.read",
    "ai.use",
    "memory.read",
  ],
};

export function hasMarketingPermission(role: string, permission: MarketingPermission) {
  const allowed = rolePermissions[role] || [];
  return allowed.includes("*" as never) || allowed.includes(permission as never);
}

export function requireMarketingPermission(permission: MarketingPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !hasMarketingPermission(req.user.role, permission)) {
      return res.status(403).json({ error: "Insufficient privileges." });
    }
    next();
  };
}
