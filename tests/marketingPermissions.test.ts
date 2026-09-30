import { describe, expect, it } from "vitest";
import { hasMarketingPermission } from "../src/lib/auth.js";
import { marketingRoleForHubRole } from "../src/lib/hubProvisioning.js";

describe("Marketing Hub team RBAC", () => {
  it("maps Hub roles without granting owner or platform admin", () => {
    expect(marketingRoleForHubRole("manager")).toBe("MARKETING_MANAGER");
    expect(marketingRoleForHubRole("staff")).toBe("MARKETING_STAFF");
    expect(marketingRoleForHubRole("viewer")).toBe("MARKETING_VIEWER");
    for (const role of ["manager", "staff", "viewer"] as const) {
      expect(["BUSINESS_OWNER", "PLATFORM_ADMIN"]).not.toContain(marketingRoleForHubRole(role));
    }
  });

  it("keeps viewer read-only", () => {
    expect(hasMarketingPermission("MARKETING_VIEWER", "business.read")).toBe(true);
    expect(hasMarketingPermission("MARKETING_VIEWER", "content.read")).toBe(true);
    expect(hasMarketingPermission("MARKETING_VIEWER", "customers.read")).toBe(true);
    expect(hasMarketingPermission("MARKETING_VIEWER", "content.write")).toBe(false);
    expect(hasMarketingPermission("MARKETING_VIEWER", "customers.write")).toBe(false);
    expect(hasMarketingPermission("MARKETING_VIEWER", "ai.use")).toBe(false);
    expect(hasMarketingPermission("MARKETING_VIEWER", "memory.write")).toBe(false);
  });

  it("lets staff work without owner settings access", () => {
    expect(hasMarketingPermission("MARKETING_STAFF", "content.write")).toBe(true);
    expect(hasMarketingPermission("MARKETING_STAFF", "customers.write")).toBe(true);
    expect(hasMarketingPermission("MARKETING_STAFF", "ai.use")).toBe(true);
    expect(hasMarketingPermission("MARKETING_STAFF", "business.write")).toBe(false);
    expect(hasMarketingPermission("MARKETING_STAFF", "social.write")).toBe(false);
    expect(hasMarketingPermission("MARKETING_STAFF", "memory.write")).toBe(false);
  });

  it("lets managers manage marketing operations but not business-owner settings", () => {
    expect(hasMarketingPermission("MARKETING_MANAGER", "content.write")).toBe(true);
    expect(hasMarketingPermission("MARKETING_MANAGER", "customers.write")).toBe(true);
    expect(hasMarketingPermission("MARKETING_MANAGER", "social.write")).toBe(true);
    expect(hasMarketingPermission("MARKETING_MANAGER", "memory.write")).toBe(true);
    expect(hasMarketingPermission("MARKETING_MANAGER", "business.write")).toBe(false);
  });

  it("keeps the business owner unrestricted inside the tenant", () => {
    expect(hasMarketingPermission("BUSINESS_OWNER", "business.write")).toBe(true);
    expect(hasMarketingPermission("BUSINESS_OWNER", "social.write")).toBe(true);
    expect(hasMarketingPermission("BUSINESS_OWNER", "memory.write")).toBe(true);
  });
});
