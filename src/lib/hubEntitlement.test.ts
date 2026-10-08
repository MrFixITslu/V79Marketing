import { describe, it, expect, vi } from "vitest";
import { createHubEntitlementChecker } from "./hubEntitlement.js";
import { createHash, createHmac } from "node:crypto";
describe("Marketing Hub entitlement revalidation",()=>{
  const secret="v79-marketing-test-secret-for-connector";
  const person={organizationId:"customer-org",scopedUserId:"scoped-user"};
  it("signs the marketing service identity and enforces a 30-second max cache",async()=>{
    let clock=1_800_000_000_000;
    const transport=vi.fn(async (_url:any,opts:any)=>{
      const timestamp=opts.headers["x-v79-timestamp"];
      const hash=createHash("sha256").update(opts.body).digest("hex");
      const expected=createHmac("sha256",secret).update(["POST","/api/platform/entitlement/check",timestamp,hash].join("\n")).digest("hex");
      expect(opts.headers["x-v79-signature"]).toBe(expected);
      expect(opts.headers["x-v79-service-id"]).toBe("v79-marketing");
      return {ok:true,json:async()=>({allowed:true,validForSeconds:90})} as Response;
    });
    const check=createHubEntitlementChecker({baseUrl:"http://hub.internal:3040",secret,now:()=>clock,transport:transport as any});
    expect(await check(person)).toBe(true);
    clock+=29_000;expect(await check(person)).toBe(true);
    expect(transport).toHaveBeenCalledTimes(1);
    clock+=1_000;expect(await check(person)).toBe(true);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("denies failed and unavailable Hub",async()=>{
    const transport=vi.fn(async()=>{throw new Error("offline")});
    const check=createHubEntitlementChecker({baseUrl:"http://hub.internal:3040",secret,transport:transport as any});
    expect(await check(person)).toBe(false);
    expect(await check({...person,scopedUserId:""})).toBe(false);
  });
});
