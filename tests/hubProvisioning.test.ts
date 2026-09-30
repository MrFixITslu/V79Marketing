import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, initDb } from "../src/lib/db.js";
import { provisionHubIdentity } from "../src/lib/hubProvisioning.js";

const orgA = "hub-marketing-org-a-1234";
const orgB = "hub-marketing-org-b-1234";
const hubUserA = "hub-marketing-user-a-1234";
const hubUserB = "hub-marketing-user-b-1234";
const sharedEmail = "shared-marketing-owner@example.test";

function cleanup() {
  for (const businessId of [orgA, orgB]) {
    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(businessId);
    db.prepare("DELETE FROM users WHERE business_id=?").run(businessId);
    db.prepare("DELETE FROM businesses WHERE id=?").run(businessId);
  }
}

describe("Hub-managed Marketing workspace provisioning", () => {
  beforeAll(() => {
    initDb();
    cleanup();
  });

  afterAll(cleanup);

  it("creates separate Marketing businesses for the same owner email in separate Hub workspaces", () => {
    const a = provisionHubIdentity({
      organization: { id: orgA, name: "Marketing Business A", slug: "marketing-business-a" },
      user: { id: hubUserA, email: sharedEmail, name: "Shared Owner" },
      role: "owner",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });
    const b = provisionHubIdentity({
      organization: { id: orgB, name: "Marketing Business B", slug: "marketing-business-b" },
      user: { id: hubUserB, email: sharedEmail, name: "Shared Owner" },
      role: "owner",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });

    expect(a.businessId).toBe(orgA);
    expect(b.businessId).toBe(orgB);
    expect(a.userId).not.toBe(b.userId);

    const userA = db.prepare("SELECT business_id,hub_user_id,email FROM users WHERE id=?").get(a.userId) as any;
    const userB = db.prepare("SELECT business_id,hub_user_id,email FROM users WHERE id=?").get(b.userId) as any;
    expect(userA.business_id).toBe(orgA);
    expect(userB.business_id).toBe(orgB);
    expect(userA.hub_user_id).toBe(hubUserA);
    expect(userB.hub_user_id).toBe(hubUserB);
    expect(userA.email).toBe(sharedEmail);
    expect(userB.email).toBe(sharedEmail);

    const again = provisionHubIdentity({
      organization: { id: orgA, name: "Marketing Business A", slug: "marketing-business-a" },
      user: { id: hubUserA, email: sharedEmail, name: "Shared Owner" },
      role: "owner",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });
    expect(again.businessId).toBe(a.businessId);
    expect(again.userId).toBe(a.userId);
  });
});

describe("Hub-managed Marketing team provisioning", () => {
  it("maps manager, staff and viewer inside an owner-provisioned workspace", () => {
    const org = "hub-marketing-team-org-1234";
    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(org);
    db.prepare("DELETE FROM users WHERE business_id=?").run(org);
    db.prepare("DELETE FROM businesses WHERE id=?").run(org);

    provisionHubIdentity({
      organization: { id: org, name: "Marketing Team Business", slug: "marketing-team-business" },
      user: { id: "hub-marketing-owner-1234", email: "owner.marketing@example.test", name: "Owner" },
      role: "owner",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });

    const expected = {
      manager: "MARKETING_MANAGER",
      staff: "MARKETING_STAFF",
      viewer: "MARKETING_VIEWER",
    } as const;

    for (const role of ["manager", "staff", "viewer"] as const) {
      const member = provisionHubIdentity({
        organization: { id: org, name: "Marketing Team Business", slug: "marketing-team-business" },
        user: { id: `hub-marketing-${role}-1234`, email: `${role}.marketing@example.test`, name: role },
        role,
        plan: "hub",
        entitlement: { product: "marketing", enabled: true },
      });
      expect(member.businessId).toBe(org);
      expect(member.role).toBe(expected[role]);
      expect(["BUSINESS_OWNER", "PLATFORM_ADMIN"]).not.toContain(member.role);
    }

    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(org);
    db.prepare("DELETE FROM users WHERE business_id=?").run(org);
    db.prepare("DELETE FROM businesses WHERE id=?").run(org);
  });

  it("rejects team provisioning before the Hub owner creates the workspace", () => {
    const org = "hub-marketing-unowned-org-1234";
    db.prepare("DELETE FROM users WHERE business_id=?").run(org);
    db.prepare("DELETE FROM businesses WHERE id=?").run(org);

    expect(() => provisionHubIdentity({
      organization: { id: org, name: "Unowned Marketing", slug: "unowned-marketing" },
      user: { id: "hub-marketing-viewer-9999", email: "viewer.unowned@example.test", name: "Viewer" },
      role: "viewer",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    })).toThrow(/owner first/i);
  });
});
