import type Database from 'better-sqlite3';

export type CampaignOutcome = {
  campaignId: string;
  attributedEnquiries: number;
  customerStatuses: number;
};

/**
 * Add-only migration. Historic enquiries remain unattributed.
 * Attribution is a human-entered association, not proof of an ad impression/click.
 */
export function ensureCustomerCampaignAttribution(db: Database.Database): void {
  const cols = db.pragma('table_info(customers)') as Array<{name:string}>;
  if (!cols.some(c=>c.name === 'campaign_id')) {
    db.exec('ALTER TABLE customers ADD COLUMN campaign_id TEXT');
  }
  if (!cols.some(c=>c.name === 'attribution_method')) {
    db.exec('ALTER TABLE customers ADD COLUMN attribution_method TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_campaign_business ON customers(business_id, campaign_id) WHERE campaign_id IS NOT NULL');
}

export function resolveCustomerCampaignId(
  db: Database.Database,
  businessId: string,
  campaignId?: string | null
): string | null {
  if (campaignId == null || campaignId === '') return null;
  if (!businessId || typeof campaignId !== 'string' || !/^campaign-[a-zA-Z0-9-]{1,150}$/.test(campaignId)) {
    throw new Error('Invalid campaign association.');
  }
  const saved = db.prepare('SELECT id FROM campaigns WHERE id=? AND business_id=?')
    .get(campaignId, businessId) as {id:string} | undefined;
  if (!saved) throw new Error('Campaign does not belong to this business.');
  return saved.id;
}

/** Aggregate actual CRM records only, per tenant. Manual attribution is not a conversion claim. */
export function listCampaignOutcomes(db: Database.Database, businessId: string): CampaignOutcome[] {
  return (db.prepare(`
    SELECT ca.id AS campaignId,
      COUNT(cu.id) AS attributedEnquiries,
      COALESCE(SUM(CASE WHEN cu.status IN ('CUSTOMER','REPEAT_CUSTOMER') THEN 1 ELSE 0 END),0) AS customerStatuses
    FROM campaigns ca
    LEFT JOIN customers cu ON cu.campaign_id = ca.id
      AND cu.business_id = ca.business_id
      AND cu.attribution_method = 'manual'
    WHERE ca.business_id = ?
    GROUP BY ca.id
    ORDER BY ca.created_at DESC
  `).all(businessId) as Array<{campaignId:string;attributedEnquiries:number;customerStatuses:number}>)
    .map(row => ({
      campaignId:row.campaignId,
      attributedEnquiries:Number(row.attributedEnquiries),
      customerStatuses:Number(row.customerStatuses),
    }));
}
