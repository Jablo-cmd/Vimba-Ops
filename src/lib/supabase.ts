import {createClient} from "@supabase/supabase-js";
const url=typeof import.meta.env.VITE_SUPABASE_URL==="string"?import.meta.env.VITE_SUPABASE_URL.trim():"";
const key=typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY==="string"?import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim():"";
function isAllowedSupabaseUrl(value:string){try{const parsed=new URL(value);return parsed.protocol==="https:"&&parsed.hostname.endsWith(".supabase.co")}catch{return false}}
export const supabase=url&&key&&isAllowedSupabaseUrl(url)?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function requireSupabase(){if(!supabase)throw new Error("Vimba Ops is not configured.");return supabase;}
