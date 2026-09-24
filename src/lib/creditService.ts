import crypto from "node:crypto";
import { db } from "./db.js";

export const CREDIT_COSTS = {
  aiPost: 25,
  aiImage: 100,
  campaign30Day: 300,
  aiVideo: 500,
  reviewResponse: 15,
  competitorAudit: 50,
};

export function allowanceForPlan(plan: string | null | undefined) {
  switch (String(plan || "").toUpperCase()) {
    case "ADVANTAGE": return 30000;
    case "BUSINESS": return 10000;
    default: return 0;
  }
}

function nextResetDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function planForBusiness(businessId: string) {
  const row = db.prepare("SELECT plan FROM businesses WHERE id=?").get(businessId) as any;
  return String(row?.plan || "");
}

export function getCreditBalance(businessId: string) {
  const allowance = allowanceForPlan(planForBusiness(businessId));
  let row = db.prepare("SELECT * FROM credit_balances WHERE business_id = ?").get(businessId) as any;

  if (!row) {
    const resetDate = nextResetDate();
    db.prepare(`
      INSERT INTO credit_balances (business_id, monthly_allowance, purchased_credits, bonus_credits, used_credits, reset_date)
      VALUES (?, ?, 0, 0, 0, ?)
    `).run(businessId, allowance, resetDate);
    row = db.prepare("SELECT * FROM credit_balances WHERE business_id = ?").get(businessId) as any;
  }

  const resetDue = !row.reset_date || new Date(row.reset_date).getTime() <= Date.now();
  if (resetDue) {
    db.prepare(`
      UPDATE credit_balances
      SET monthly_allowance=?, used_credits=0, bonus_credits=0, reset_date=?
      WHERE business_id=?
    `).run(allowance, nextResetDate(), businessId);
  } else if (Number(row.monthly_allowance) !== allowance) {
    db.prepare("UPDATE credit_balances SET monthly_allowance=? WHERE business_id=?").run(allowance, businessId);
  }

  row = db.prepare("SELECT * FROM credit_balances WHERE business_id = ?").get(businessId) as any;
  const remainingCredits = Math.max(0, Number(row.monthly_allowance) + Number(row.purchased_credits) + Number(row.bonus_credits) - Number(row.used_credits));
  return {
    businessId: row.business_id,
    monthlyAllowance: Number(row.monthly_allowance),
    purchasedCredits: Number(row.purchased_credits),
    bonusCredits: Number(row.bonus_credits),
    usedCredits: Number(row.used_credits),
    resetDate: row.reset_date,
    remainingCredits,
  };
}

export function deductCredits(
  businessId: string,
  userId: string,
  userName: string,
  amount: number,
  actionReason: string,
  ipAddress: string = "unknown"
): { success: boolean; remainingCredits: number; error?: string } {
  const current = getCreditBalance(businessId);

  if (current.remainingCredits < amount) {
    return {
      success: false,
      remainingCredits: current.remainingCredits,
      error: `Monthly V79 AI allowance reached. Required: ${amount}, Available: ${current.remainingCredits}. Manage your plan in V79 Hub.`,
    };
  }

  const newUsed = current.usedCredits + amount;
  db.prepare("UPDATE credit_balances SET used_credits = ? WHERE business_id = ?").run(newUsed, businessId);

  db.prepare(`
    INSERT INTO audit_logs (id, business_id, user_id, user_name, action, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `al-${crypto.randomUUID()}`,
    businessId,
    userId,
    userName,
    "AI_CREDIT_DEDUCTED",
    `Deducted ${amount} credits for: ${actionReason}`,
    ipAddress,
    new Date().toISOString()
  );

  return { success: true, remainingCredits: current.remainingCredits - amount };
}

// Reserved for a future verified Hub billing/add-on workflow.
// This function is not exposed as a customer purchase endpoint.
export function addCredits(businessId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Credit amount must be positive.");
  db.prepare("UPDATE credit_balances SET purchased_credits = purchased_credits + ? WHERE business_id = ?").run(Math.floor(amount), businessId);
  return getCreditBalance(businessId);
}
