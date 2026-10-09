import { describe, it, expect } from "vitest";
import { readMarketingView, marketingNavigationPath } from "../src/lib/viewNavigation";

describe("Marketing refresh-safe view routing", () => {
  it("restores internal drafts on refresh", () => {
    const p = marketingNavigationPath("https://marketing.v79sl.com/?utm_campaign=alpha#top", "agent-drafts");
    expect(p).toBe("/?utm_campaign=alpha&view=agent-drafts#top");
    expect(readMarketingView(new URL(p, "https://marketing.v79sl.com").search)).toBe("agent-drafts");
  });
  it("preserves attribution and returns home cleanly", () => {
    const p = marketingNavigationPath("https://marketing.v79sl.com/?view=agent-drafts&utm_source=v79", "dashboard");
    expect(p).toBe("/?utm_source=v79");
  });
  it("rejects unexpected route names", () => {
    expect(readMarketingView("?view=not-authorized")).toBe("dashboard");
    expect(readMarketingView("?view=admin-portal%0A")).toBe("dashboard");
  });
});
