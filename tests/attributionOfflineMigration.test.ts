import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureCustomerCampaignAttribution, listCampaignOutcomes, resolveCustomerCampaignId } from '../src/lib/campaignAttribution';

const hashFile = (file: string) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function createLegacyFixture(file: string): void {
  const db = new Database(file);
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE businesses(id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE campaigns(
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(business_id) REFERENCES businesses(id)
      );
      CREATE TABLE customers(
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        last_contacted_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(business_id) REFERENCES businesses(id)
      );
      INSERT INTO businesses VALUES('tenant-a','Tenant A'),('tenant-b','Tenant B');
      INSERT INTO campaigns VALUES
        ('campaign-a','tenant-a','2026-10-01T00:00:00Z'),
        ('campaign-b','tenant-b','2026-10-01T00:00:00Z');
    `);
    const insert = db.prepare(`
      INSERT INTO customers (id,business_id,name,phone,email,channel,status,notes,last_contacted_at,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `);
    const seed = db.transaction(() => {
      for (let i = 0; i < 120; i++) {
        const tenant = i % 2 ? 'tenant-b' : 'tenant-a';
        insert.run(
          'legacy-' + i, tenant, 'Synthetic Customer ' + i,
          '1758555' + String(i).padStart(4,'0'), 'synthetic-' + i + '@example.invalid',
          i % 3 ? 'website' : 'whatsapp', i % 5 ? 'NEW_INQUIRY' : 'CUSTOMER',
          'Known legacy note #' + i, null, '2026-10-01T00:00:00Z'
        );
      }
    });
    seed();
  } finally { db.close(); }
}

describe('Offline customer campaign migration rehearsal with file-backed SQLite', () => {
  it('preserves every legacy row, schema and foreign-key invariant, and supports offline restore', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v79-marketing-attribution-rehearsal-'));
    const source = path.join(dir, 'legacy-original.sqlite');
    const rehearsal = path.join(dir, 'isolated-migration.sqlite');
    const restored = path.join(dir, 'restored-original.sqlite');
    try {
      createLegacyFixture(source);
      const beforeHash = hashFile(source);
      fs.copyFileSync(source, rehearsal);

      const db = new Database(rehearsal);
      try {
        db.pragma('foreign_keys = ON');
        const legacyRows = db.prepare(`
          SELECT id,business_id,name,phone,email,channel,status,notes,last_contacted_at,created_at
          FROM customers ORDER BY id
        `).all();
        const originalCount = (db.prepare('SELECT COUNT(*) AS n FROM customers').get() as {n:number}).n;

        ensureCustomerCampaignAttribution(db);
        ensureCustomerCampaignAttribution(db); // safe repeat startup

        expect(db.pragma('integrity_check')).toEqual([{integrity_check:'ok'}]);
        expect(db.pragma('foreign_key_check')).toEqual([]);
        expect(db.prepare(`
          SELECT id,business_id,name,phone,email,channel,status,notes,last_contacted_at,created_at
          FROM customers ORDER BY id
        `).all()).toEqual(legacyRows);
        expect((db.prepare('SELECT COUNT(*) AS n FROM customers').get() as {n:number}).n).toBe(originalCount);
        expect((db.prepare('SELECT COUNT(*) AS n FROM customers WHERE campaign_id IS NOT NULL OR attribution_method IS NOT NULL').get() as {n:number}).n).toBe(0);

        const a = resolveCustomerCampaignId(db, 'tenant-a', 'campaign-a');
        expect(a).toBe('campaign-a');
        expect(() => resolveCustomerCampaignId(db,'tenant-a','campaign-b')).toThrow(/does not belong/);
        db.prepare("UPDATE customers SET campaign_id=?,attribution_method='manual' WHERE id='legacy-0' AND business_id=?").run(a,'tenant-a');
        expect(listCampaignOutcomes(db,'tenant-a')).toEqual([{campaignId:'campaign-a',attributedEnquiries:1,customerStatuses:1}]);
        expect(listCampaignOutcomes(db,'tenant-b')).toEqual([{campaignId:'campaign-b',attributedEnquiries:0,customerStatuses:0}]);
      } finally {db.close();}

      // Reopen like another production boot: migration must remain idempotent.
      const reopen = new Database(rehearsal);
      try {
        ensureCustomerCampaignAttribution(reopen);
        expect(reopen.pragma('integrity_check')).toEqual([{integrity_check:'ok'}]);
        expect(listCampaignOutcomes(reopen,'tenant-a')[0].attributedEnquiries).toBe(1);
      } finally {reopen.close();}

      // The untouched pre-migration snapshot is the only recovery source.
      expect(hashFile(source)).toBe(beforeHash);
      fs.copyFileSync(source, restored);
      expect(hashFile(restored)).toBe(beforeHash);
      const recovery = new Database(restored, {readonly:true, fileMustExist:true});
      try {
        const names=(recovery.pragma('table_info(customers)') as Array<{name:string}>).map(x=>x.name);
        expect(names).not.toContain('campaign_id');
        expect((recovery.prepare('SELECT COUNT(*) AS n FROM customers').get() as {n:number}).n).toBe(120);
        expect(recovery.pragma('integrity_check')).toEqual([{integrity_check:'ok'}]);
      } finally {recovery.close();}
    } finally { fs.rmSync(dir,{recursive:true,force:true}); }
  });
});
