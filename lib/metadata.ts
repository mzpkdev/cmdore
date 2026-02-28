import * as fs from "node:fs"
import * as path from "node:path"

export type Metadata = {
    name: string
    version: string
    description: string
}

export const findMetadata = (from: string = process.cwd()): Metadata => {
    let current = from

    while (true) {
        const candidate = path.join(current, "package.json")

        if (fs.existsSync(candidate)) {
            const raw = JSON.parse(fs.readFileSync(candidate, "utf-8"))
            return {
                name: raw.name ?? "",
                version: raw.version ?? "",
                description: raw.description ?? ""
            }
        }

        const parent = path.dirname(current)
        if (parent === current) {
            return { name: "", version: "", description: "" }
        }

        current = parent
    }
}
