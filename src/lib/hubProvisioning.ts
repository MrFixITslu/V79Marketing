import { db } from "./db.js";
import { assertHubBusinessLink, selectHubUserForBusiness } from "./hubIdentityBoundary.js";
import type { HubLaunchSession } from "./platform.js";

function uniqueSlug(base: string, organizationId: string) {
  const seed = (base || "business").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "business";
  const existing = db.prepare("SELECT id FROM businesses WHERE slug=? AND id<>?").get(seed, organizationId);
  if (!existing) return seed;
  return `${seed}-${organizationId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase()}`;
}

const hubRoleMap: Record<HubLaunchSession["role"], string> = {
  owner: "BUSINESS_OWNER",
  manager: "MARKETING_MANAGER",
  staff: "MARKETING_STAFF",
  viewer: "MARKETING_VIEWER",
};

export function marketingRoleForHubRole(role: HubLaunchSession["role"]) {
  return hubRoleMap[role];
}

export function provisionHubIdentity(session: HubLaunchSession) {
  const businessId = session.organization.id;
  let localBusinessId = businessId;
  const userId = `hub:${session.user.id}`;
  const now = new Date().toISOString();
  const role = marketingRoleForHubRole(session.role);
  const plan = String(session.plan || "HUB").toUpperCase();
  const slug = uniqueSlug(session.organization.slug, businessId);

  const tx = db.transaction(() => {
    const business = db.prepare("SELECT id,hub_organization_id FROM businesses WHERE hub_organization_id=? OR id=?")
      .get(session.organization.id, businessId) as any;
    assertHubBusinessLink(business, businessId);
    localBusinessId = business?.id || businessId;

    if (!business && session.role !== "owner") {
      throw new Error("Marketing workspace must be provisioned by the Hub owner first.");
    }

    if (!business) {
      db.prepare(`
        INSERT INTO businesses
          (id,name,slug,industry,description,location,plan,hub_organization_id,created_at)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(
        businessId,
        session.organization.name,
        slug,
        "General",
        `${session.organization.name} marketing workspace`,
        "Caribbean",
        plan,
        session.organization.id,
        now,
      );
    } else {
      db.prepare("UPDATE businesses SET name=?,slug=?,plan=?,hub_organization_id=? WHERE id=?")
        .run(session.organization.name, slug, plan, session.organization.id, business.id);
    }

    let candidates = db.prepare("SELECT id,hub_user_id,business_id FROM users WHERE hub_user_id=? LIMIT 2")
      .all(session.user.id) as any[];
    if (candidates.length === 0) {
      candidates = db.prepare(
        "SELECT id,hub_user_id,business_id FROM users WHERE LOWER(email)=LOWER(?) AND business_id=? AND hub_user_id IS NULL LIMIT 2"
      ).all(session.user.email.toLowerCase(), localBusinessId) as any[];
    }
    const existingUser = selectHubUserForBusiness(candidates, session.user.id, localBusinessId);

    if (!existingUser) {
      db.prepare(`
        INSERT INTO users
          (id,email,password_hash,name,role,email_verified,two_factor_enabled,business_id,hub_user_id,created_at)
        VALUES (?,?,?,?,?,1,0,?,?,?)
      `).run(
        userId,
        session.user.email.toLowerCase(),
        "hub-managed",
        session.user.name,
        role,
        localBusinessId,
        session.user.id,
        now,
      );
    } else {
      db.prepare("UPDATE users SET email=?,name=?,role=?,business_id=?,hub_user_id=? WHERE id=?")
        .run(
          session.user.email.toLowerCase(),
          session.user.name,
          role,
          localBusinessId,
          session.user.id,
          existingUser.id,
        );
    }

    db.prepare(`
      INSERT INTO credit_balances
        (business_id,monthly_allowance,purchased_credits,bonus_credits,used_credits,reset_date)
      VALUES (?,10000,0,0,0,?)
      ON CONFLICT(business_id) DO NOTHING
    `).run(localBusinessId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
  });

  tx();
  const localUser = db.prepare("SELECT * FROM users WHERE hub_user_id=?").get(session.user.id) as any;
  return { businessId: localBusinessId, userId: localUser.id, role: localUser.role };
}
