import { describe,expect,it,vi } from "vitest";
import { allowScheduledPostPublication } from "./publisherEntitlement.js";
describe("Scheduled publisher Hub entitlement",()=>{
  const valid={organizationId:"org-a",hubUserId:"scoped-a"};
  const args={businessId:"biz-a",authorId:"author-a",lookup:()=>valid};
  it("permits a verified author",async()=>{
    const check=vi.fn().mockResolvedValue(true);
    expect(await allowScheduledPostPublication({...args,check})).toBe(true);
    expect(check).toHaveBeenCalledWith({organizationId:"org-a",scopedUserId:"scoped-a"});
  });
  it("rejects paused plans",async()=>{
    expect(await allowScheduledPostPublication({...args,check:async()=>false})).toBe(false);
  });
  it("rejects unlinked author and unrelated tenant",async()=>{
    expect(await allowScheduledPostPublication({...args,lookup:()=>({organizationId:null,hubUserId:null}),check:async()=>true})).toBe(false);
    expect(await allowScheduledPostPublication({...args,lookup:()=>({organizationId:"org-a",hubUserId:null}),check:async()=>true})).toBe(false);
  });
  it("denies Hub outage and missing business IDs",async()=>{
    expect(await allowScheduledPostPublication({...args,check:async()=>{throw Error("offline")}})).toBe(false);
    expect(await allowScheduledPostPublication({...args,businessId:"",check:async()=>true})).toBe(false);
  });
});
