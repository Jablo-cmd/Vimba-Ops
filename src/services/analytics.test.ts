import {describe,expect,it} from "vitest";
import type {OperationalAnalytics} from "./analytics";

describe("operational analytics contract",()=>{
  it("defines numeric operational measures",()=>{
    const row:OperationalAnalytics={
      tenant_id:"t1",tenant_name:"Vimba Ops",active_sites:2,active_employees:10,on_duty_today:6,
      open_incidents:1,compliance_exceptions:2,attendance_exceptions:1,patrols_completed_24h:4
    };
    expect(row.active_sites+row.active_employees).toBe(12);
    expect(row.patrols_completed_24h).toBeGreaterThanOrEqual(0);
  });
});
