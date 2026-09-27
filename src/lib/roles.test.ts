import {describe,it,expect} from "vitest";
import {ROLES,canAccess,canAccessPath,navigationAccess} from "./roles";

describe("role access matrix",()=>{
  it("defines a complete label/access role set",()=>expect(Object.keys(navigationAccess).length).toBeGreaterThan(1));
  it("denies unknown or empty roles",()=>{expect(canAccess(undefined,["guard"])).toBe(false);expect(canAccess("unknown" as never,["guard"])).toBe(false)});
  it("keeps client users out of workforce administration",()=>expect(canAccessPath("client_user","/workforce")).toBe(false));
  it("allows guards to use field operations but not client administration",()=>{expect(canAccessPath("guard","/patrols")).toBe(true);expect(canAccessPath("guard","/clients")).toBe(false)});
  it("covers every declared role on the overview route",()=>ROLES.forEach(role=>expect(canAccessPath(role,"/")).toBe(true)));
});