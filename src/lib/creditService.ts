import { db } from "./db.js";

export const CREDIT_COSTS = {
  aiPost: 25,
  aiImage: 100,
  campaign30Day: 300,
  aiVideo: 500,
  reviewResponse: 15,
  competitorAudit: 50,
};

export function getCreditBalance(businessId: string) {
  const row = db.prepare("SELECT * FROM credit_balances WHERE business_id = ?").get(businessId) as any;
  if (!row) {
    // Default initialization if record missing
    db.prepare(`
      INSERT INTO credit_balances (business_id, monthly_allowance, purchased_credits, bonus_credits, used_credits, reset_date)
      VALUES (?, 200000, 0, 0, 0, ?)
    `).run(businessId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    return {
      businessId,
      monthlyAllowance: 200000,
      purchasedCredits: 0,
      bonusCredits: 0,
      usedCredits: 0,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remainingCredits: 200000,
    };
  }

  const remainingCredits = Math.max(0, row.monthly_allowance + row.purchased_credits + row.bonus_credits - row.used_credits);
  return {
    businessId: row.business_id,
    monthlyAllowance: row.monthly_allowance,
    purchasedCredits: row.purchased_credits,
    bonusCredits: row.bonus_credits,
    usedCredits: row.used_credits,
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
  ipAddress: string = "127.0.0.1"
): { success: boolean; remainingCredits: number; error?: string } {
  const current = getCreditBalance(businessId);

  if (current.remainingCredits < amount) {
    return {
      success: false,
      remainingCredits: current.remainingCredits,
      error: `Insufficient V79 AI Credits. Required: ${amount}, Available: ${current.remainingCredits}. Top up credits to proceed.`,
    };
  }

  const newUsed = current.usedCredits + amount;
  db.prepare("UPDATE credit_balances SET used_credits = ? WHERE business_id = ?").run(newUsed, businessId);

  const auditId = `al-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO audit_logs (id, business_id, user_id, user_name, action, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditId,
    businessId,
    userId,
    userName,
    "AI_CREDIT_DEDUCTED",
    `Deducted ${amount} credits for: ${actionReason}`,
    ipAddress,
    new Date().toISOString()
  );

  return {
    success: true,
    remainingCredits: current.remainingCredits - amount,
  };
}

export function addCredits(businessId: string, amount: number) {
  db.prepare("UPDATE credit_balances SET purchased_credits = purchased_credits + ? WHERE business_id = ?").run(
    amount,
    businessId
  );
  return getCreditBalance(businessId);
}
