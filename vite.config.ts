import {defineConfig,loadEnv} from "vite";import react from "@vitejs/plugin-react";import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,"",".");
  return {
    plugins:[react(),tailwindcss()],
    base:env.VITE_BASE_PATH??"/",
    server:{host:"127.0.0.1",port:5173,strictPort:true},
    preview:{host:"127.0.0.1",port:4173,strictPort:true},
    build:{sourcemap:false}
  };
});
