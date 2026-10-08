import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { verifyPlatformRequest } from "./mockHubVerifier.mjs";

// This test creates an isolated SQLite database and loopback-only mock Hub.
// It cannot read or modify any customer or production Marketing data.
const temp = mkdtempSync(join(tmpdir(), "v79-marketing-entitlement-auth-"));
process.env.DATABASE_PATH = join(temp, "marketing.sqlite");
process.env.NODE_ENV = "test";
process.env.V79_ENTITLEMENT_RECHECK_ENABLED = "1";
process.env.V79_MARKETING_LAUNCH_SECRET = "marketing-staging-session-secret-123456789";
let service;
let origin;
let businessId = "staging-business-1";
let secondBusinessId = "staging-business-2";
let testUser;
let sessionToken;
let hubChecks = 0;
let revoked = false;
let offline = false;
let mock;
let marketingServer;
let db;

describe.sequential("Marketing authenticated Hub entitlement runtime", () => {
  beforeAll(async () => {
    const responses = [];
    mock = createServer(async (req, res) => {
      if (offline) { res.writeHead(503); return res.end("{}"); }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks).toString("utf8");
      const valid = verifyPlatformRequest({
        method: req.method,
        pathname: req.url,
        body,
        timestamp: req.headers["x-v79-timestamp"],
        signature: req.headers["x-v79-signature"],
        secret: process.env.V79_MARKETING_LAUNCH_SECRET
      });
      if (!valid || req.headers["x-v79-service-id"] !== "v79-marketing") {
        res.writeHead(401); return res.end("{}");
      }
      const payload = JSON.parse(body);
      hubChecks++;
      responses.push(payload);
      const allowed = !revoked && payload.product === "marketing" &&
        payload.organizationId === "staging-org-1" &&
        payload.scopedUserId === "scoped-1";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ allowed, validForSeconds: allowed ? 1 : 0 }));
    });
    await new Promise(resolve => mock.listen(0, "127.0.0.1", resolve));
    process.env.V79_HUB_INTERNAL_URL = "http://127.0.0.1:" + mock.address().port;

    const imported = await import("../src/lib/db.js");
    db = imported.db;
    imported.initDb();
    const now = new Date().toISOString();
    for (const business of [
      { id:businessId, org:"staging-org-1" },
      { id:secondBusinessId, org:"staging-org-2" }
    ]) {
      db.prepare("INSERT INTO businesses (id,name,slug,industry,hub_organization_id,created_at) VALUES (?,?,?,?,?,?)")
        .run(business.id, business.id, business.id, "ICT", business.org, now);
    }
    const userId = "test-hub-linked-user-1";
    db.prepare("INSERT INTO users (id,email,password_hash,name,role,business_id,hub_user_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(userId,"auth-staging@invalid.example","not-a-real-password","Staging User","BUSINESS_OWNER",businessId,"scoped-1",now);
    const { generateToken, authenticate, requireTenantAccess } = await import("../src/lib/auth.js");
    testUser = {id:userId,email:"auth-staging@invalid.example",name:"Staging User",role:"BUSINESS_OWNER",businessId};
    sessionToken = generateToken(testUser);
    const { default: express } = await import("express");
    const app = express();
    app.get("/api/protected", authenticate, requireTenantAccess, (req,res) => res.json({businessId:(req as any).user.businessId}));
    app.get("/api/tenants/:businessId", authenticate, requireTenantAccess, (req,res) => res.json({ok:true}));
    marketingServer = app.listen(0,"127.0.0.1");
    await new Promise(resolve => marketingServer.once("listening", resolve));
    origin = "http://127.0.0.1:" + marketingServer.address().port;
  }, 15000);
  afterAll(async () => {
    if(marketingServer) await new Promise(resolve=>marketingServer.close(resolve));
    if(mock) await new Promise(resolve=>mock.close(resolve));
    if(db) db.close();
    rmSync(temp,{recursive:true,force:true});
  });
  async function request(path="/api/protected", token=sessionToken) {
    return fetch(origin+path,{headers:{authorization:"Bearer "+token}});
  }
  it("permits a verified signed Hub session through actual authenticated route", async () => {
    const response=await request();
    expect(response.status).toBe(200);
    expect((await response.json()).businessId).toBe(businessId);
    expect(hubChecks).toBeGreaterThan(0);
  });
  it("denies a customer selecting another business",async()=>{
    expect((await request("/api/tenants/"+secondBusinessId)).status).toBe(403);
  });
  it("denies a JWT with revoked application membership",async()=>{
    db.prepare("UPDATE users SET hub_user_id=NULL WHERE id=?").run(testUser.id);
    expect((await request()).status).toBe(403);
    db.prepare("UPDATE users SET hub_user_id=? WHERE id=?").run("scoped-1",testUser.id);
  });
  it("enforces Hub cancellation after signed response lease expires",async()=>{
    await new Promise(resolve=>setTimeout(resolve,1100));
    revoked=true;
    const response=await request();
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("HUB_ENTITLEMENT_REVOKED");
  });
  it("does not allow an already-issued JWT during Hub outage",async()=>{
    revoked=false;
    offline=true;
    await new Promise(resolve=>setTimeout(resolve,1100));
    const response=await request();
    expect(response.status).toBe(403);
  });
  it("denies missing session token",async()=>{
    const response=await fetch(origin+"/api/protected");
    expect(response.status).toBe(401);
  });
});
