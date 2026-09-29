import {readFile} from "node:fs/promises";

const aiFunction=await readFile("supabase/functions/ai-orchestrator/index.ts","utf8");
const app=await readFile("src/App.tsx","utf8");
const roles=await readFile("src/lib/roles.ts","utf8");
const shell=await readFile("src/components/AppShell.tsx","utf8");
const enterpriseService=await readFile("src/services/enterprisePlatform.ts","utf8");

for(const token of ["Authorization","INTERNAL_ROLES","SUPABASE_PUBLISHABLE_KEYS","active internal tenant profile","analysisType"]){
  if(!aiFunction.includes(token))throw new Error("Missing AI runtime guard: "+token);
}

const enterpriseRoutes=["digital-twin","workforce-intelligence","intelligent-rostering","case-management","sop-workflows","financial-intelligence","audit-security","automated-reporting","integrations","api","marketplace","benchmarking"];
for(const route of enterpriseRoutes){
  const path="/platform/"+route;
  if(!app.includes(path))throw new Error("Missing enterprise route: "+path);
  if(!roles.includes(path))throw new Error("Missing enterprise role boundary: "+path);
  if(!shell.includes(path))throw new Error("Missing enterprise navigation entry: "+path);
}
for(const moduleName of enterpriseRoutes.map(x=>x==="api"?"api-platform":x)){
  if(!enterpriseService.includes('"'+moduleName+'"'))throw new Error("Missing enterprise module contract: "+moduleName);
}

console.log("Code-first security and enterprise coverage invariants passed.");
