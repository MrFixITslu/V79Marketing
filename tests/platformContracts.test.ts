import { describe, expect, it } from "vitest";
import { signPlatformRequest, verifyHubPlatformRequest, verifyHubSummaryRequest } from "../src/lib/platform.js";

describe("V79 Marketing platform contracts", () => {
  it("accepts a current signed Hub summary request", () => {
    process.env.V79_PLATFORM_SHARED_SECRET = "test-platform-shared-secret-that-is-at-least-32-chars";
    const pathname = "/api/platform/summary/v79org-test";
    const timestamp = String(Date.now());
    const signature = signPlatformRequest({
      method:"GET",
      pathname,
      timestamp,
      body:"",
      secret:process.env.V79_PLATFORM_SHARED_SECRET,
    });
    expect(verifyHubSummaryRequest({
      method:"GET",
      pathname,
      timestamp,
      signature,
      serviceId:"v79-hub",
    })).toBe(true);
  });

  it("rejects the wrong service identity and stale timestamps", () => {
    process.env.V79_PLATFORM_SHARED_SECRET = "test-platform-shared-secret-that-is-at-least-32-chars";
    const pathname = "/api/platform/summary/v79org-test";
    const timestamp = String(Date.now() - 10 * 60 * 1000);
    const signature = signPlatformRequest({
      method:"GET",
      pathname,
      timestamp,
      body:"",
      secret:process.env.V79_PLATFORM_SHARED_SECRET,
    });
    expect(verifyHubSummaryRequest({method:"GET",pathname,timestamp,signature,serviceId:"other"})).toBe(false);
    expect(verifyHubSummaryRequest({method:"GET",pathname,timestamp,signature,serviceId:"v79-hub"})).toBe(false);
  });

  it("binds signed Marketing provisioning requests to the exact JSON body", () => {
    process.env.V79_PLATFORM_SHARED_SECRET = "test-platform-shared-secret-that-is-at-least-32-chars";
    const pathname = "/api/platform/provision";
    const timestamp = String(Date.now());
    const body = JSON.stringify({ organization: { id: "org-a" }, user: { id: "user-a" }, role: "owner" });
    const signature = signPlatformRequest({
      method: "POST",
      pathname,
      timestamp,
      body,
      secret: process.env.V79_PLATFORM_SHARED_SECRET,
    });
    expect(verifyHubPlatformRequest({ method: "POST", pathname, timestamp, signature, serviceId: "v79-hub", body })).toBe(true);
    expect(verifyHubPlatformRequest({ method: "POST", pathname, timestamp, signature, serviceId: "v79-hub", body: body + " " })).toBe(false);
  });
});
