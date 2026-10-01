import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, initDb } from "../src/lib/db.js";
import { deprovisionHubTeamIdentity, provisionHubIdentity } from "../src/lib/hubProvisioning.js";
import { authenticate, generateToken } from "../src/lib/auth.js";

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


describe("Hub-managed Marketing team revocation", () => {
  const org = "hub-marketing-revoke-org-1234";
  const ownerHubId = "hub-marketing-revoke-owner-1234";
  const memberHubId = "hub-marketing-revoke-member-1234";

  beforeAll(() => {
    initDb();
    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(org);
    db.prepare("DELETE FROM users WHERE business_id=?").run(org);
    db.prepare("DELETE FROM businesses WHERE id=?").run(org);

    provisionHubIdentity({
      organization: { id: org, name: "Marketing Revoke Business", slug: "marketing-revoke-business" },
      user: { id: ownerHubId, email: "revoke.owner@example.test", name: "Owner" },
      role: "owner",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });
  });

  afterAll(() => {
    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(org);
    db.prepare("DELETE FROM users WHERE business_id=?").run(org);
    db.prepare("DELETE FROM businesses WHERE id=?").run(org);
  });

  it("refreshes the live role and invalidates an old token immediately after removal", () => {
    const member = provisionHubIdentity({
      organization: { id: org, name: "Marketing Revoke Business", slug: "marketing-revoke-business" },
      user: { id: memberHubId, email: "revoke.member@example.test", name: "Member" },
      role: "manager",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });

    const token = generateToken({
      id: member.userId,
      email: "revoke.member@example.test",
      name: "Member",
      role: "MARKETING_MANAGER",
      businessId: org,
    });

    db.prepare("UPDATE users SET role='MARKETING_VIEWER' WHERE id=? AND business_id=?").run(member.userId, org);

    const firstReq:any = { headers: { authorization: `Bearer ${token}` } };
    let firstStatus = 0;
    let firstPayload:any;
    let firstNext = false;
    const firstRes:any = {
      status(code:number) { firstStatus = code; return this; },
      json(payload:any) { firstPayload = payload; return this; },
    };
    authenticate(firstReq, firstRes, () => { firstNext = true; });
    expect(firstNext).toBe(true);
    expect(firstStatus).toBe(0);
    expect(firstReq.user.role).toBe("MARKETING_VIEWER");

    const removed = deprovisionHubTeamIdentity(org, memberHubId);
    expect(removed.alreadyAbsent).toBe(false);

    const revokedReq:any = { headers: { authorization: `Bearer ${token}` } };
    let revokedStatus = 0;
    let revokedPayload:any;
    const revokedRes:any = {
      status(code:number) { revokedStatus = code; return this; },
      json(payload:any) { revokedPayload = payload; return this; },
    };
    authenticate(revokedReq, revokedRes, () => { throw new Error("revoked token must not authenticate"); });
    expect(revokedStatus).toBe(401);
    expect(revokedPayload.code).toBe("ACCESS_REVOKED");

    const repeated = deprovisionHubTeamIdentity(org, memberHubId);
    expect(repeated.alreadyAbsent).toBe(true);
  });

  it("protects the owner and isolates wrong-workspace revocation", () => {
    expect(() => deprovisionHubTeamIdentity(org, ownerHubId)).toThrow(/owner\/admin/i);

    const otherOrg = "hub-marketing-revoke-other-1234";
    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(otherOrg);
    db.prepare("DELETE FROM users WHERE business_id=?").run(otherOrg);
    db.prepare("DELETE FROM businesses WHERE id=?").run(otherOrg);
    provisionHubIdentity({
      organization: { id: otherOrg, name: "Other Marketing Business", slug: "other-marketing-business" },
      user: { id: "hub-marketing-other-owner-1234", email: "other.owner@example.test", name: "Other Owner" },
      role: "owner",
      plan: "hub",
      entitlement: { product: "marketing", enabled: true },
    });
    const wrong = deprovisionHubTeamIdentity(otherOrg, memberHubId);
    expect(wrong.alreadyAbsent).toBe(true);
    db.prepare("DELETE FROM credit_balances WHERE business_id=?").run(otherOrg);
    db.prepare("DELETE FROM users WHERE business_id=?").run(otherOrg);
    db.prepare("DELETE FROM businesses WHERE id=?").run(otherOrg);
  });
});
