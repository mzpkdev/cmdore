import * as path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
    resolve: {
        alias: {
            cmdore: path.resolve(__dirname, "lib/index.ts")
        },
        extensions: [".ts", ".js", ".json"]
    },
    test: {
        globals: true,
        environment: "node",
        // Type-level tests (*.test-d.ts) are compiled and their expectTypeOf
        // assertions enforced as part of the normal test run. A dedicated
        // tsconfig with skipLibCheck keeps the check scoped to project code.
        typecheck: {
            enabled: true,
            tsconfig: "./tsconfig.typecheck.json",
            include: ["**/*.test-d.ts"]
        }
    }
})
