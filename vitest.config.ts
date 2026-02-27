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
        environment: "node"
    }
})
