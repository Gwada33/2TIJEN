import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  // Les tests SQL démarrent une base PostgreSQL en mémoire (PGlite) : lente quand la machine est chargée.
  test: { include: ["tests/**/*.test.ts"], hookTimeout: 60_000, testTimeout: 60_000 },
});
