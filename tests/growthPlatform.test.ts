import { describe, it, expect, beforeEach } from 'vitest';
import { db, initDb } from '../src/lib/db';
import { CustomerInquiry, CustomerStatus, BusinessMemory } from '../src/types';

describe('V79 Marketing Hub — Growth Platform & Business Memory Test Suite', () => {
  beforeEach(() => {
    initDb();
  });

  it('1. Customer Pipeline: Should insert and retrieve customer inquiries correctly', () => {
    const testCustomerId = `test-cust-${Date.now()}`;
    const testInquiry: CustomerInquiry = {
      id: testCustomerId,
      businessId: 'bus-1',
      name: 'Marcus Thorne',
      phone: '+1 (758) 555-0199',
      email: 'marcus@example.com',
      channel: 'whatsapp',
      status: 'NEW_INQUIRY',
      notes: 'Testing WhatsApp inquiry pipeline',
      createdAt: new Date().toISOString(),
    };

    const stmt = db.prepare(`
      INSERT INTO customers (id, business_id, name, phone, email, channel, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      testInquiry.id,
      testInquiry.businessId,
      testInquiry.name,
      testInquiry.phone,
      testInquiry.email,
      testInquiry.channel,
      testInquiry.status,
      testInquiry.notes,
      testInquiry.createdAt
    );

    const fetched = db.prepare('SELECT * FROM customers WHERE id = ?').get(testCustomerId) as any;
    expect(fetched).toBeDefined();
    expect(fetched.name).toBe('Marcus Thorne');
    expect(fetched.channel).toBe('whatsapp');
    expect(fetched.status).toBe('NEW_INQUIRY');
  });

  it('2. Customer Status Workflow: Should update customer status to CUSTOMER', () => {
    const testCustomerId = `test-cust-${Date.now()}`;
    db.prepare(`
      INSERT INTO customers (id, business_id, name, phone, channel, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testCustomerId, 'bus-1', 'Sarah Connor', '+1 (758) 555-0200', 'facebook', 'NEW_INQUIRY', new Date().toISOString());

    db.prepare('UPDATE customers SET status = ? WHERE id = ?').run('CUSTOMER', testCustomerId);

    const fetched = db.prepare('SELECT status FROM customers WHERE id = ?').get(testCustomerId) as any;
    expect(fetched.status).toBe('CUSTOMER');
  });

  it('3. Business Memory System: Should store and query approved business facts', () => {
    const testMemory: BusinessMemory = {
      businessId: 'bus-1',
      approvedClaims: ['Slow-smoked over pimento wood for 6 hours', 'Waterfront Rodney Bay location'],
      usps: ['Original Saint Lucian recipe', 'Locally sourced ingredients'],
      faqs: [{ q: 'Do you offer vegan options?', a: 'Yes, grilled plantain skewers & vegan callaloo' }],
      preferredCtas: ['Reserve your table on WhatsApp', 'Call 758-450-0199'],
      brandVoice: 'Warm Caribbean hospitality',
      updatedAt: new Date().toISOString(),
    };

    db.prepare(`
      INSERT OR REPLACE INTO business_memories (business_id, approved_claims_json, usps_json, faqs_json, preferred_ctas_json, brand_voice, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      testMemory.businessId,
      JSON.stringify(testMemory.approvedClaims),
      JSON.stringify(testMemory.usps),
      JSON.stringify(testMemory.faqs),
      JSON.stringify(testMemory.preferredCtas),
      testMemory.brandVoice,
      testMemory.updatedAt
    );

    const fetched = db.prepare('SELECT * FROM business_memories WHERE business_id = ?').get('bus-1') as any;
    expect(fetched).toBeDefined();

    const claims = JSON.parse(fetched.approved_claims_json);
    expect(claims).toContain('Slow-smoked over pimento wood for 6 hours');
  });

  it('4. Growth Plan Tasks: Should insert and mark growth plan tasks as completed', () => {
    const taskId = `task-${Date.now()}`;
    db.prepare(`
      INSERT INTO growth_plans (id, business_id, week_number, title, category, description, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(taskId, 'bus-1', 1, 'Sync Opening Hours', 'Get Found', 'Ensure Google and FB hours match', 0);

    db.prepare('UPDATE growth_plans SET completed = 1 WHERE id = ?').run(taskId);

    const fetched = db.prepare('SELECT completed FROM growth_plans WHERE id = ?').get(taskId) as any;
    expect(fetched.completed).toBe(1);
  });

  it('5. Marketing Audit Diagnostics: Should log and resolve diagnostic issues', () => {
    const auditId = `audit-${Date.now()}`;
    db.prepare(`
      INSERT INTO marketing_audits (id, business_id, title, severity, category, issue_description, fix_recommendation, resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(auditId, 'bus-1', 'Posting Inactivity', 'HIGH', 'Consistency', 'No post in 11 days', 'Schedule 3 posts', 0);

    db.prepare('UPDATE marketing_audits SET resolved = 1 WHERE id = ?').run(auditId);

    const fetched = db.prepare('SELECT resolved FROM marketing_audits WHERE id = ?').get(auditId) as any;
    expect(fetched.resolved).toBe(1);
  });
});
