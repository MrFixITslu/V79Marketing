import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "v79-super-secret-production-key-2026";
const TOKEN_EXPIRY = "24h";

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
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: string;
      businessId: string;
    };
  } catch (err) {
    return null;
  }
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc: any, cookie) => {
      const [key, val] = cookie.trim().split("=");
      acc[key] = val;
      return acc;
    }, {});
    token = cookies.v79_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Missing token." });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }

  req.user = decoded;
  next();
}

export function requireTenantAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const requestedBusinessId = req.params.businessId || req.query.businessId || req.body?.businessId;

  // Platform Admins can inspect any tenant
  if (req.user.role === "PLATFORM_ADMIN") {
    return next();
  }

  // If specific business ID requested, verify match with user's assigned businessId
  if (requestedBusinessId && requestedBusinessId !== req.user.businessId) {
    return res.status(403).json({ error: "Forbidden: Access denied to tenant resources." });
  }

  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient privileges." });
    }
    next();
  };
}
