import {describe,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {ensureCustomerCampaignAttribution,resolveCustomerCampaignId,listCampaignOutcomes} from '../src/lib/campaignAttribution';

function fixture() {
  const db=new Database(':memory:');
  db.exec(`
    CREATE TABLE businesses(id TEXT PRIMARY KEY);
    CREATE TABLE campaigns(id TEXT PRIMARY KEY,business_id TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE customers(id TEXT PRIMARY KEY,business_id TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);
    INSERT INTO businesses VALUES('own'),('other');
    INSERT INTO campaigns VALUES('campaign-own','own','2026-10-27'),('campaign-other','other','2026-10-27');
    INSERT INTO customers VALUES('old','own','CUSTOMER','2026-10-27');
  `);
  return db;
}
describe('Privacy-safe campaign enquiry attribution',()=>{
 it('adds only optional fields, preserves legacy customers and survives repeat migration',()=>{
   const db=fixture();try{
     ensureCustomerCampaignAttribution(db);ensureCustomerCampaignAttribution(db);
     const legacy=db.prepare("SELECT campaign_id,attribution_method FROM customers WHERE id='old'").get() as any;
     expect(legacy).toEqual({campaign_id:null,attribution_method:null});
   }finally{db.close();}
 });
 it('denies foreign campaigns, missing campaigns and invalid IDs',()=>{
   const db=fixture();try{
     expect(resolveCustomerCampaignId(db,'own','campaign-own')).toBe('campaign-own');
     expect(()=>resolveCustomerCampaignId(db,'own','campaign-other')).toThrow(/does not belong/);
     expect(()=>resolveCustomerCampaignId(db,'own','campaign-missing')).toThrow(/does not belong/);
     expect(()=>resolveCustomerCampaignId(db,'own','bad\u0000')).toThrow(/Invalid/);
     expect(resolveCustomerCampaignId(db,'own',null)).toBeNull();
   }finally{db.close();}
 });
 it('only counts actual manually attributed records and existing customer statuses',()=>{
   const db=fixture();try{
     ensureCustomerCampaignAttribution(db);
     db.exec(`
       INSERT INTO customers(id,business_id,status,created_at,campaign_id,attribution_method) VALUES
       ('manual-enquiry','own','NEW_INQUIRY','2026-10-27','campaign-own','manual'),
       ('manual-client','own','CUSTOMER','2026-10-27','campaign-own','manual'),
       ('manually-another-tenant','other','REPEAT_CUSTOMER','2026-10-27','campaign-other','manual'),
       ('not-proven','own','CUSTOMER','2026-10-27','campaign-own',NULL);
     `);
     expect(listCampaignOutcomes(db,'own')).toEqual([{campaignId:'campaign-own',attributedEnquiries:2,customerStatuses:1}]);
     expect(listCampaignOutcomes(db,'other')).toEqual([{campaignId:'campaign-other',attributedEnquiries:1,customerStatuses:1}]);
     db.prepare("UPDATE customers SET status='CUSTOMER' WHERE id='manual-enquiry'").run();
     expect(listCampaignOutcomes(db,'own')[0].customerStatuses).toBe(2);
   }finally{db.close();}
 });
});
