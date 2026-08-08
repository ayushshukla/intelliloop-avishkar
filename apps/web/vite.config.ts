import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function e2ePort(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  if (!/^[1-9][0-9]{0,4}$/u.test(raw)) {
    throw new Error(`${key} must be a valid TCP port.`);
  }
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port > 65_535) {
    throw new Error(`${key} must be a valid TCP port.`);
  }
  return port;
}

const webPort = e2ePort("INTELLILOOP_E2E_WEB_PORT", 4173);
const apiPort = e2ePort("INTELLILOOP_E2E_API_PORT", 3100);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: false
      }
    }
  },
  preview: {
    host: "127.0.0.1",
    port: webPort,
    strictPort: true
  }
});
