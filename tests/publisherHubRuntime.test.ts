import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const directory=mkdtempSync(join(tmpdir(),"v79-worker-gate-"));
process.env.NODE_ENV="test";
process.env.DATABASE_PATH=join(directory,"staging.sqlite");
process.env.JWT_SECRET="temporary-marketing-worker-jwt-32chars";
process.env.V79_MARKETING_LAUNCH_SECRET="temporary-marketing-worker-hmac-32chars";
process.env.V79_ENTITLEMENT_RECHECK_ENABLED="1";
process.env.V79_ENABLE_SIMULATED_PUBLISHER="1";
let hub:any,db:any,processScheduledPosts:any;
let permitted=false, calls=0, origin="";
const biz="worker-staging-org", author="worker-staging-author";
const first="worker-staging-post-a", second="worker-staging-post-b";
describe.sequential("scheduled social publishing requires current Hub entitlement",()=>{
  beforeAll(async()=>{
    hub=createServer(async(req,res)=>{
      const chunks=[];
      for await(const part of req)chunks.push(part);
      const body=Buffer.concat(chunks).toString("utf8");
      const timestamp=String(req.headers["x-v79-timestamp"]||"");
      const expected=createHmac("sha256",process.env.V79_MARKETING_LAUNCH_SECRET!)
        .update(["POST",req.url,timestamp,createHash("sha256").update(body).digest("hex")].join("\n")).digest("hex");
      const a=Buffer.from(expected,"hex"),b=Buffer.from(String(req.headers["x-v79-signature"]||""),"hex");
      if(a.length!==b.length || !timingSafeEqual(a,b)){
        res.writeHead(401);return res.end("{}");
      }
      calls++;
      const request=JSON.parse(body);
      const allowed=permitted && request.product==="marketing" &&
        request.organizationId==="staging-hub-org" && request.scopedUserId==="staging-hub-user";
      res.writeHead(200,{"content-type":"application/json"});
      res.end(JSON.stringify({allowed,validForSeconds:allowed?1:0}));
    });
    await new Promise(resolve=>hub.listen(0,"127.0.0.1",resolve));
    process.env.V79_HUB_INTERNAL_URL="http://127.0.0.1:"+hub.address().port;
    const module=await import("../src/lib/db.js");
    db=module.db;
    module.initDb();
    const now=new Date().toISOString();
    db.prepare("INSERT INTO businesses (id,name,slug,industry,hub_organization_id,created_at) VALUES (?,?,?,?,?,?)")
      .run(biz,biz,biz,"ICT","staging-hub-org",now);
    db.prepare("INSERT INTO users (id,email,password_hash,name,role,business_id,hub_user_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(author,"staging-operator@example.test","placeholder","Staging Worker","BUSINESS_OWNER",biz,"staging-hub-user",now);
    const insert=(id:string)=>db.prepare("INSERT INTO posts (id,business_id,author_id,author_name,title,content_json,media_urls_json,scheduled_for,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id,biz,author,"Staging Worker","Synthetic publish",JSON.stringify({facebook:{caption:"Synthetic only"}}),"[]",new Date(Date.now()-60000).toISOString(),"SCHEDULED",now);
    insert(first);
    processScheduledPosts=(await import("../src/lib/publisher.js")).processScheduledPosts;
  },15000);
  afterAll(async()=>{if(hub)await new Promise(resolve=>hub.close(resolve));if(db)db.close();rmSync(directory,{recursive:true,force:true});});
  it("does not publish or create delivery when Hub says subscription paused",async()=>{
    const results=await processScheduledPosts();
    expect(results.some((r:any)=>r.postId===first&&r.status==="QUEUED")).toBe(true);
    expect(db.prepare("SELECT status FROM posts WHERE id=?").get(first).status).toBe("SCHEDULED");
    expect(db.prepare("SELECT count(*) AS n FROM post_deliveries WHERE post_id=?").get(first).n).toBe(0);
    expect(calls).toBeGreaterThan(0);
  });
  it("resumes only when the exact Hub user and organisation are entitled",async()=>{
    permitted=true;
    const results=await processScheduledPosts();
    expect(results.some((r:any)=>r.postId===first&&r.status==="PUBLISHED")).toBe(true);
    expect(db.prepare("SELECT status FROM posts WHERE id=?").get(first).status).toBe("PUBLISHED");
  });
  it("refuses another pending post after entitlement is revoked",async()=>{
    const now=new Date().toISOString();
    db.prepare("INSERT INTO posts (id,business_id,author_id,author_name,title,content_json,media_urls_json,scheduled_for,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(second,biz,author,"Staging Worker","Synthetic second",JSON.stringify({facebook:{caption:"Synthetic only"}}),"[]",new Date(Date.now()-60000).toISOString(),"SCHEDULED",now);
    permitted=false;
    await new Promise(resolve=>setTimeout(resolve,1100));
    const results=await processScheduledPosts();
    expect(results.some((r:any)=>r.postId===second&&r.status==="QUEUED")).toBe(true);
    expect(db.prepare("SELECT status FROM posts WHERE id=?").get(second).status).toBe("SCHEDULED");
    expect(db.prepare("SELECT count(*) AS n FROM post_deliveries WHERE post_id=?").get(second).n).toBe(0);
  });
});
