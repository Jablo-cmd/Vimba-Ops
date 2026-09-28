import {describe,expect,it} from "vitest";
import {derivePlatformSignals,moduleReadiness,PLATFORM_MODULES,type PlatformSnapshot} from "./enterprisePlatform";

const snapshot=():PlatformSnapshot=>({
  metrics:{sites:3,guards:5,onDuty:2,openIncidents:2,unresolvedAlerts:0,complianceExceptions:1},
  sites:[{id:"s1"},{id:"s2"},{id:"s3"}],
  employees:[{id:"e1",employment_status:"active"},{id:"e2",employment_status:"active"}],
  attendance:[{id:"a1",status:"late"},{id:"a2",status:"on_duty"}],
  incidents:[{id:"i1",status:"open"},{id:"i2",status:"escalated"}],
  compliance:[{id:"c1",status:"expired"}],
  shifts:[{id:"sh1",status:"published",required_staff:2},{id:"sh2",status:"open",required_staff:1}],
  patrols:[{id:"p1"}],
});

describe("enterprise platform",()=>{
  it("derives bounded operational signals",()=>{
    const s=derivePlatformSignals(snapshot());
    expect(s.openIncidents).toBe(2);
    expect(s.complianceExceptions).toBe(1);
    expect(s.attendanceExceptions).toBe(1);
    expect(s.patrolRoutes).toBe(1);
    expect(s.operationalPressure).toBe(55);
    expect(s.unstaffedSites).toBe(3);
  });
  it("exposes every enterprise module",()=>{
    expect(Object.keys(PLATFORM_MODULES)).toHaveLength(12);
    expect(moduleReadiness("digital-twin",snapshot()).level).toBe("live-code");
    expect(moduleReadiness("case-management",snapshot()).level).toBe("contract-ready");
  });
});
