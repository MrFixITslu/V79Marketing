import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

  req.user = decoded;
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
