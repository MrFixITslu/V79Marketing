import type { ViewType } from "../App";

const allowed = new Set<ViewType>([
  "landing","dashboard","customers","one-idea-campaign","ai_brain","ai-assistant","ai-image",
  "reviews","competitors","brand_kit","profile-builder","public_storefront","calendar",
  "campaigns","agent-drafts","social-channels","analytics","billing","admin-portal","admin",
]);

export function readMarketingView(search: string): ViewType {
  const requested = new URLSearchParams(search).get("view") as ViewType | null;
  return requested && allowed.has(requested) ? requested : "dashboard";
}

export function marketingNavigationPath(href: string, view: ViewType): string {
  const url = new URL(href);
  if (view === "dashboard" || !allowed.has(view)) url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  return url.pathname + url.search + url.hash;
}
