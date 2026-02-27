import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

export type Metadata = {
    name: string
    version: string
    description: string
}

export function findMetadata(from: string = process.cwd()): Metadata {
    let current = from

    while (true) {
        const candidate = join(current, "package.json")

        if (existsSync(candidate)) {
            const raw = JSON.parse(readFileSync(candidate, "utf-8"))
            return {
                name: raw.name ?? "",
                version: raw.version ?? "",
                description: raw.description ?? ""
            }
        }

        const parent = dirname(current)
        if (parent === current) {
            return { name: "", version: "", description: "" }
        }

        current = parent
    }
}
