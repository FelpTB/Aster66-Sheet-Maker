import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  /** SUPABASE_* , ANON_* e VITE_* ficam disponíveis em import.meta.env no cliente */
  envPrefix: ["VITE_", "SUPABASE_", "ANON_"],
});
