// Background delivery must use its own entitlement check: Express login
// middleware is not invoked by scheduled publishing or event worker ticks.
export async function allowScheduledPostPublication({
  businessId, authorId, lookup, check,
}: {
  businessId: string;
  authorId: string;
  lookup: (businessId: string, authorId: string) => {
    organizationId?: string | null; hubUserId?: string | null;
  } | undefined;
  check: (identity: { organizationId: string; scopedUserId: string }) => Promise<boolean>;
}): Promise<boolean> {
  if (!businessId || !authorId) return false;
  try {
    const identity = lookup(businessId, authorId);
    const organizationId = String(identity?.organizationId || "").trim();
    const scopedUserId = String(identity?.hubUserId || "").trim();
    if (!organizationId || !scopedUserId) return false;
    return await check({ organizationId, scopedUserId }) === true;
  } catch { return false; }
}
