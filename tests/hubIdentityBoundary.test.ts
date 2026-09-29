import { describe, expect, it } from "vitest";
import { assertHubBusinessLink, selectHubUserForBusiness } from "../src/lib/hubIdentityBoundary.js";

describe("Hub identity business boundary", () => {
  it("accepts an existing Hub user only in the same business", () => {
    const user = { id: "u-a", hub_user_id: "hub-a", business_id: "business-a" };
    expect(selectHubUserForBusiness([user], "hub-a", "business-a")).toBe(user);
    expect(() => selectHubUserForBusiness([user], "hub-a", "business-b")).toThrow(/another business/);
    expect(() => selectHubUserForBusiness([user], "hub-b", "business-a")).toThrow(/another business/);
  });

  it("links an unlinked email only inside its existing business", () => {
    const legacy = { id: "legacy", hub_user_id: null, business_id: "business-a" };
    expect(selectHubUserForBusiness([legacy], "hub-a", "business-a")).toBe(legacy);
    expect(() => selectHubUserForBusiness([legacy], "hub-b", "business-b")).toThrow(/another business/);
    expect(() => selectHubUserForBusiness([legacy, { ...legacy, id: "other" }], "hub-a", "business-a")).toThrow(/Conflicting/);
  });

  it("will not transfer a business already linked to another Hub organization", () => {
    expect(() => assertHubBusinessLink({ hub_organization_id: "business-a" }, "business-b")).toThrow(/another Hub/);
    expect(() => assertHubBusinessLink({ hub_organization_id: "business-a" }, "business-a")).not.toThrow();
  });
});
