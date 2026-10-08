// Fail closed whenever an identity or business claims a Hub link but its mapping is incomplete.
export function hubManagedMapping(organizationId?: string | null, scopedUserId?: string | null) {
  const org = String(organizationId || "").trim();
  const user = String(scopedUserId || "").trim();
  return { managed: Boolean(org || user), valid: Boolean(org && user) };
}
