import { describe, it, expect } from "vitest";
import { hubManagedMapping } from "./hubManagedLink.js";
describe("Marketing Hub link integrity", () => {
  it("permits complete linked identities", () => expect(hubManagedMapping("org-a","user-a")).toEqual({managed:true,valid:true}));
  it("rejects orphaned organization mappings", () => expect(hubManagedMapping("org-a",null)).toEqual({managed:true,valid:false}));
  it("rejects orphaned user mappings", () => expect(hubManagedMapping(null,"user-a")).toEqual({managed:true,valid:false}));
  it("recognizes legacy unlinked identity separately", () => expect(hubManagedMapping(null,null)).toEqual({managed:false,valid:false}));
});
