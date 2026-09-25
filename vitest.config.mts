import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: {
      DATABASE_URL: "./.data/test.sqlite",
    },
    // §40.5 item 7: no coverage tool was configured, so gaps like the ones
    // this audit found manually (createNewTemplateVersion, the move/delete
    // mutations, listSessions filters, every Server Action) weren't
    // measurable — `npm run test:coverage` makes them visible going
    // forward. `src/app/**` is excluded: page/layout/route components are
    // exercised through the feature-layer mutations/queries they call, not
    // directly, and Playwright's e2e suite (not Vitest) is the intended
    // coverage for that rendering layer.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/app/**", "src/db/schema.ts", "src/components/ui/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
