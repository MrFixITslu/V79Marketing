// A Hub launch may link an unlinked local account only inside its own business.
// Reassigning an email match across businesses would transfer a tenant's user.
export function assertHubBusinessLink(business: { hub_organization_id?: string | null } | null, organizationId: string) {
  if (business?.hub_organization_id && business.hub_organization_id !== organizationId) {
    throw new Error("Marketing business is linked to another Hub organization.");
  }
}

export function selectHubUserForBusiness<T extends { hub_user_id?: string | null; business_id: string }>(
  candidates: T[], hubUserId: string, businessId: string
): T | null {
  if (candidates.length > 1) throw new Error("Conflicting Marketing identities require review.");
  const user = candidates[0] || null;
  if (user && (user.business_id !== businessId ||
      (user.hub_user_id && user.hub_user_id !== hubUserId))) {
    throw new Error("Marketing identity belongs to another business or Hub user.");
  }
  return user;
}
