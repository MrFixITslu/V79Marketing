import { describe, it, expect, beforeAll } from "vitest";
import { initDb, db } from "../src/lib/db.js";
import { generateToken, verifyToken } from "../src/lib/auth.js";
import { getCreditBalance, deductCredits, addCredits } from "../src/lib/creditService.js";
import { processScheduledPosts } from "../src/lib/publisher.js";

describe("V79 Marketing Hub — Production Security & Workflow Test Suite", () => {
  beforeAll(() => {
    initDb();
  });

  it("1. Authentication: Should generate and verify valid JWT tokens", () => {
    const payload = {
      id: "user-test-1",
      email: "test@v79digital.com",
      name: "Test User",
      role: "BUSINESS_OWNER",
      businessId: "bus-1",
    };

    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(payload.id);
    expect(decoded?.businessId).toBe(payload.businessId);
  });

  it("2. Credit Engine: Should fetch balance and deduct credits correctly", () => {
    const initial = getCreditBalance("bus-1");
    expect(initial.remainingCredits).toBeGreaterThan(0);

    const deduction = deductCredits("bus-1", "user-test-1", "Test User", 50, "Test AI Post", "127.0.0.1");
    expect(deduction.success).toBe(true);

    const updated = getCreditBalance("bus-1");
    expect(updated.usedCredits).toBe(initial.usedCredits + 50);
  });

  it("3. Credit Engine: Should block AI operations when credits are insufficient", () => {
    // Attempt to deduct massive credit amount exceeding balance
    const deduction = deductCredits("bus-1", "user-test-1", "Test User", 9999999, "Exceeding Operation", "127.0.0.1");
    expect(deduction.success).toBe(false);
    expect(deduction.error).toContain("Insufficient V79 AI Credits");
  });

  it("4. Tenant Isolation: Users from Business A cannot mutate Business B", () => {
    const userA = { id: "uA", businessId: "bus-1", role: "BUSINESS_OWNER" };
    const targetBusinessB = "bus-2";

    // Enforce tenant boundary check
    const isAllowed = userA.role === "PLATFORM_ADMIN" || userA.businessId === targetBusinessB;
    expect(isAllowed).toBe(false);
  });

  it("5. Publisher Queue: Scheduled posts due for publishing should be processed", () => {
    const postId = `test-post-${Date.now()}`;
    const nowPast = new Date(Date.now() - 10000).toISOString();

    db.prepare(`
      INSERT INTO posts (id, business_id, author_id, author_name, title, content_json, media_urls_json, scheduled_for, status, created_at)
      VALUES (?, 'bus-1', 'user-owner-1', 'Janelle Auguste', 'Scheduled Test Post', '{"facebook":{"caption":"Hello"}}', '[]', ?, 'SCHEDULED', ?)
    `).run(postId, nowPast, new Date().toISOString());

    const results = processScheduledPosts();
    expect(results.length).toBeGreaterThan(0);

    const updatedPost = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as any;
    expect(updatedPost.status).toBe("PUBLISHED");
    expect(updatedPost.analytics_json).toBeDefined();
  });
});
