import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": "http://localhost:10000",
      "/news": "http://localhost:10000",
      "/blogs": "http://localhost:10000",
      "/ticker": "http://localhost:10000",
      "/ads": "http://localhost:10000",
      "/add-article": "http://localhost:10000",
      "/edit-article": "http://localhost:10000",
      "/delete-article": "http://localhost:10000",
      "/add-blog": "http://localhost:10000",
      "/edit-blog": "http://localhost:10000",
      "/delete-blog": "http://localhost:10000",
      "/set-ticker": "http://localhost:10000",
      "/save-ads": "http://localhost:10000",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
